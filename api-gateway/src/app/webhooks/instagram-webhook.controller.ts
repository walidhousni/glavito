import { Controller, Get, Post, Query, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@glavito/shared-database';
import { ConfigService } from '@nestjs/config';
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation';
import { InstagramAdapter } from '@glavito/shared-conversation';
import { WorkflowService } from '@glavito/shared-workflow'
import { ChannelType, WebhookPayload } from '@glavito/shared-types';
import { Counter, Histogram, register } from 'prom-client';
import { TranscriptionService } from '../calls/transcription.service';
import { MediaAnalysisService } from '../ai/media-analysis.service';

@ApiTags('webhooks-instagram')
@Controller('webhooks/instagram')
export class InstagramWebhookController {
  private readonly logger = new Logger(InstagramWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: EnhancedConversationOrchestratorService,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly config: ConfigService,
    private readonly workflowService: WorkflowService,
    private readonly transcription: TranscriptionService,
    private readonly mediaAnalysis: MediaAnalysisService,
  ) {}

  // Meta verification handshake
  @Get()
  @ApiOperation({ summary: 'Instagram webhook verification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Verification successful' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const result = this.instagramAdapter.verifyWebhook(mode, verifyToken, challenge);
    getOrCreateCounter('webhook_instagram_verifications_total', 'Total Instagram verification attempts', ['result']).inc({ result: result ? 'ok' : 'fail' });
    if (!result) {
      return { error: 'Verification failed' };
    }
    return result;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Instagram webhook events' })
  async handle(
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      if (!this.verifySignatureIfPresent(headers, body)) {
        this.logger.warn('Invalid Instagram webhook signature');
        getOrCreateCounter('webhook_instagram_incoming_total', 'Total Instagram incoming webhooks', ['status']).inc({ status: 'invalid_signature' });
        return { success: false, error: 'invalid_signature' };
      }
      const tenantId = await this.resolveTenantIdFromPayload();
      if (!tenantId) {
        this.logger.warn('Unable to resolve tenantId for Instagram webhook');
        getOrCreateCounter('webhook_instagram_incoming_total', 'Total Instagram incoming webhooks', ['status']).inc({ status: 'tenant_not_found' });
        return { success: false, error: 'tenant_not_found' };
      }

      const signature = headers['x-hub-signature-256'] || (headers as any)['X-Hub-Signature-256'];
      const payload: WebhookPayload = {
        source: ChannelType.INSTAGRAM,
        data: body,
        signature,
        timestamp: new Date(),
      };
      const start = Date.now();
      const res = await this.orchestrator.processWebhook(payload, tenantId);
      // Background: best-effort audio transcription and image/PDF analysis for IG DMs
      try {
        const ig: any = body as any
        const msg = ig?.messaging?.[0]?.message
        const attach = msg?.attachments?.[0]
        const isAudio = !!attach && attach.type === 'audio'
        const isImage = !!attach && attach.type === 'image'
        const isFile = !!attach && (attach.type === 'file' || attach.type === 'document')
        if (isAudio) {
          const mediaUrl = msg.attachments[0]?.payload?.url
          if (mediaUrl) {
            const convId = (res as any)?.data?.conversationId
            void this.transcription.transcribeFromUrl(mediaUrl)
              .then(async (out) => {
                if (!out?.text) return
                try {
                  await (this.prisma as any)['messageAdvanced'].updateMany({
                    where: { conversationId: convId, channelMessageId: msg?.mid },
                    data: { metadata: { transcription: out.text, transcriptionLanguage: out.language } }
                  })
                } catch {/* noop */}
              })
              .catch(() => {})
          }
        }
        if (isImage) {
          const mediaUrl = msg.attachments[0]?.payload?.url
          const convId = (res as any)?.data?.conversationId
          if (mediaUrl) {
            void this.mediaAnalysis.analyzeImageFromUrl(mediaUrl).then(async (out) => {
              if (!out?.description) return
              try {
                await (this.prisma as any)['messageAdvanced'].updateMany({
                  where: { conversationId: convId, channelMessageId: msg?.mid },
                  data: { metadata: { imageDescription: out.description } }
                })
              } catch {/* noop */}
            }).catch(() => { /* ignore */ })
          }
        }
        if (isFile) {
          const mediaUrl = msg.attachments[0]?.payload?.url
          const name = msg.attachments[0]?.payload?.name || 'file.pdf'
          const convId = (res as any)?.data?.conversationId
          if (mediaUrl && name.toLowerCase().endsWith('.pdf')) {
            void this.mediaAnalysis.analyzePdfFromUrl(mediaUrl).then(async (out) => {
              if (!out?.summary) return
              try {
                await (this.prisma as any)['messageAdvanced'].updateMany({
                  where: { conversationId: convId, channelMessageId: msg?.mid },
                  data: { metadata: { pdfSummary: out.summary, pdfPages: out.pages } }
                })
              } catch {/* noop */}
            }).catch(() => { /* ignore */ })
          }
        }
      } catch {/* noop */}
      // Fire-and-forget workflow trigger for multichannel chatbot flows
      try {
        const msg = (res as any)?.data
        void this.workflowService.executeWorkflowByTrigger('event', {
          eventType: 'conversation.message.received',
          tenantId,
          conversationId: msg?.conversationId,
          messageId: msg?.id,
          customerId: msg?.senderId,
          messageType: msg?.messageType,
          content: msg?.content,
          channel: 'instagram',
          timestamp: new Date()
        } as any).catch(() => {})
      } catch { /* noop */ }
      getOrCreateHistogram('webhook_instagram_process_latency_ms', 'Instagram webhook process latency (ms)', ['status'], [10,20,50,100,200,500,1000,2000]).observe({ status: res?.success ? 'ok' : 'error' }, Date.now() - start);
      getOrCreateCounter('webhook_instagram_incoming_total', 'Total Instagram incoming webhooks', ['status']).inc({ status: res?.success ? 'ok' : 'error' });
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      this.logger.error('Instagram webhook processing failed', err as Error);
      getOrCreateCounter('webhook_instagram_incoming_total', 'Total Instagram incoming webhooks', ['status']).inc({ status: 'exception' });
      return { success: false, error: message };
    }
  }

  private async resolveTenantIdFromPayload(): Promise<string | null> {
    try {
      // No reliable page id in simplified adapter; fall back to first active IG channel
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaAny = this.prisma as unknown as { [key: string]: any };
      const advanced = await prismaAny['channelAdvanced']?.findFirst?.({
        where: { type: 'instagram', isActive: true },
      }).catch(() => null);
      if (advanced && advanced.tenantId) return advanced.tenantId as string;

      const channel = await prismaAny['channel'].findFirst({
        where: { type: 'instagram', isActive: true },
        select: { tenantId: true },
      });
      return channel?.tenantId || null;
    } catch {
      return null;
    }
  }

  private verifySignatureIfPresent(headers: Record<string, string>, body: unknown): boolean {
    try {
      const signature = headers['x-hub-signature-256'] || (headers as Record<string, unknown>)['X-Hub-Signature-256'] as string | undefined;
      const appSecret = this.config.get<string>('INSTAGRAM_APP_SECRET') || this.config.get<string>('FACEBOOK_APP_SECRET');
      if (!signature || !appSecret) return true;

      const computed = this.computeHmac(appSecret, body);
      return signature === `sha256=${computed}`;
    } catch {
      return true;
    }
  }

  private computeHmac(secret: string, body: unknown): string {
    const crypto = require('crypto') as typeof import('crypto');
    const payload = typeof body === 'string' ? body : JSON.stringify(body);
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

}

type LabelKey = string;
function getOrCreateCounter<L extends LabelKey>(name: string, help: string, labelNames: readonly L[]): Counter<L> {
  const existing = register.getSingleMetric(name) as unknown as Counter<L> | undefined;
  if (existing) return existing;
  return new Counter<L>({ name, help, labelNames });
}

function getOrCreateHistogram<L extends LabelKey>(name: string, help: string, labelNames: readonly L[], buckets: number[]): Histogram<L> {
  const existing = register.getSingleMetric(name) as unknown as Histogram<L> | undefined;
  if (existing) return existing;
  return new Histogram<L>({ name, help, labelNames, buckets });
}


