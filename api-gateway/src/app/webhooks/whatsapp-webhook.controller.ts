import { Controller, Get, Post, Query, Body, Headers, HttpCode, HttpStatus, Logger, Optional } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '@glavito/shared-database';
import { ConfigService } from '@nestjs/config';
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation';
import { WhatsAppAdapter } from '@glavito/shared-conversation';
import { ChannelType, WebhookPayload } from '@glavito/shared-types';
import { Counter, Histogram, register } from 'prom-client';
import { PublicChatLinkService } from './public-chat-link.service';
import { WorkflowService } from '@glavito/shared-workflow'
import { PublicChatSessionStore } from '../knowledge/public-chat.store';
import { MediaAnalysisService } from '../ai/media-analysis.service';
import { TranscriptionService } from '../calls/transcription.service';
import { WalletService } from '../wallet/wallet.service';
import { calculateRefund } from '../wallet/pricing.config';

@ApiTags('webhooks-whatsapp')
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orchestrator: EnhancedConversationOrchestratorService,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly config: ConfigService,
    private readonly publicChatLinks: PublicChatLinkService,
    private readonly publicChatStore: PublicChatSessionStore,
    private readonly transcription: TranscriptionService,
    private readonly mediaAnalysis: MediaAnalysisService,
    private readonly workflowService: WorkflowService,
    @Optional() private readonly walletService?: WalletService,
  ) {}

  // Meta verification handshake
  @Get()
  @ApiOperation({ summary: 'WhatsApp webhook verification' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Verification successful' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const result = this.whatsappAdapter.verifyWebhook(mode, verifyToken, challenge);
    // metrics: verification attempts
    getOrCreateCounter('webhook_whatsapp_verifications_total', 'Total WhatsApp verification attempts', ['result']).inc({ result: result ? 'ok' : 'fail' });
    if (!result) {
      return { error: 'Verification failed' };
    }
    return result;
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle WhatsApp webhook events' })
  async handle(
    @Body() body: unknown,
    @Headers() headers: Record<string, string>,
  ) {
    try {
      if (!this.verifySignatureIfPresent(headers, body)) {
        this.logger.warn('Invalid WhatsApp webhook signature');
        getOrCreateCounter('webhook_whatsapp_incoming_total', 'Total WhatsApp incoming webhooks', ['status']).inc({ status: 'invalid_signature' });
        return { success: false, error: 'invalid_signature' };
      }
      const tenantId = await this.resolveTenantIdFromPayload(body);
      if (!tenantId) {
        this.logger.warn('Unable to resolve tenantId for WhatsApp webhook');
        getOrCreateCounter('webhook_whatsapp_incoming_total', 'Total WhatsApp incoming webhooks', ['status']).inc({ status: 'tenant_not_found' });
        return { success: false, error: 'tenant_not_found' };
      }

      const payload = { source: ChannelType.WHATSAPP, data: body, headers, timestamp: Date.now() } as unknown as WebhookPayload;

      // WhatsApp status updates (delivered/read/failed) → update delivery logs and message metadata
      try {
        type WAStatus = { id?: string; status?: string; timestamp?: string | number; recipient_id?: string; errors?: Array<{ code?: string; title?: string; details?: string }> };
        type WAStatusWrapper = { entry?: Array<{ changes?: Array<{ value?: { statuses?: WAStatus[] } }> }> };
        const w = body as WAStatusWrapper;
        const statuses = w?.entry?.[0]?.changes?.[0]?.value?.statuses || [];
        for (const s of statuses) {
          const msgId = s?.id;
          const st = (s?.status || '').toLowerCase();
          const ts = s?.timestamp ? new Date(Number(s.timestamp) * 1000) : new Date();
          if (!msgId) continue;
          try {
            // Campaign deliveries update by messageId
            if (st === 'delivered') {
              await (this.prisma as any)['campaignDelivery'].updateMany({ where: { messageId: msgId }, data: { status: 'delivered', deliveredAt: ts } });
            } else if (st === 'read') {
              await (this.prisma as any)['campaignDelivery'].updateMany({ where: { messageId: msgId }, data: { status: 'opened', openedAt: ts } });
            } else if (st === 'failed' || st === 'undeliverable') {
              const errMsg = (s?.errors && s.errors[0]?.title) || 'failed';
              await (this.prisma as any)['campaignDelivery'].updateMany({ where: { messageId: msgId }, data: { status: 'failed', errorMessage: errMsg } });
            }
            // Advanced message metadata by channelMessageId
            if (st === 'delivered') {
              await (this.prisma as any)['messageAdvanced'].updateMany({ where: { channel: 'whatsapp', channelMessageId: msgId }, data: { metadata: { status: 'delivered', deliveredAt: ts } } });
            } else if (st === 'read') {
              await (this.prisma as any)['messageAdvanced'].updateMany({ where: { channel: 'whatsapp', channelMessageId: msgId }, data: { metadata: { status: 'read', readAt: ts } } });
            } else if (st === 'failed' || st === 'undeliverable') {
              await (this.prisma as any)['messageAdvanced'].updateMany({ where: { channel: 'whatsapp', channelMessageId: msgId }, data: { metadata: { status: 'failed', error: (s?.errors && s.errors[0]) || null } } });
              
              // Record refund for failed message (best-effort)
              try {
                if (this.walletService && tenantId) {
                  // Find the original usage transaction for this message
                  const message = await (this.prisma as any)['messageAdvanced'].findFirst({
                    where: { channel: 'whatsapp', channelMessageId: msgId },
                    select: { id: true, messageType: true },
                  });
                  
                  if (message) {
                    // Find usage transaction for this message
                    const usageTx = await (this.prisma as any)['channelWalletTransaction'].findFirst({
                      where: {
                        tenantId,
                        type: 'usage',
                        metadata: { path: ['messageId'], equals: message.id },
                      },
                      include: { wallet: { select: { channelType: true } } },
                    });
                    
                    if (usageTx) {
                      const originalCost = Math.abs(Number(usageTx.amount));
                      const refund = calculateRefund('whatsapp', originalCost);
                      
                      if (refund > 0) {
                        await this.walletService.purchaseCredits(
                          tenantId,
                          usageTx.wallet.channelType,
                          refund,
                          `Refund for failed message ${msgId}`,
                        );
                      }
                    }
                  }
                }
              } catch (err) {
                this.logger.debug(`Failed to record refund for failed WhatsApp message: ${(err as Error).message}`);
              }
            }
          } catch { /* ignore per-status failure */ }
        }
      } catch { /* ignore statuses block */ }

      // Try to link incoming WA sender to an existing public chat session if phone was pre-linked
      try {
        type WAData = { entry?: Array<{ changes?: Array<{ value?: { messages?: Array<{ from?: string }> } }> }> };
        const wa = body as WAData
        // Basic content extraction for mirror
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawMsg: any = wa?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
        const from = rawMsg?.from
        let content: string | undefined = rawMsg?.text?.body
        if (!content && rawMsg?.image?.caption) content = rawMsg.image.caption
        if (!content && rawMsg?.video?.caption) content = rawMsg.video.caption
        if (!content && rawMsg?.document?.filename) content = `[Document: ${rawMsg.document.filename || 'file'}]`
        if (!content && rawMsg?.audio) content = '[Audio]'
        if (!content) content = '[WhatsApp] Message received'
        const sessionId = from ? this.publicChatLinks.findSessionByWhatsApp(from) : null
        if (sessionId) {
          // Optionally: attach sessionId to payload metadata for downstream use
          (payload as unknown as { publicSessionId?: string }).publicSessionId = sessionId
          // Also mirror inbound into public chat store for widget
          this.publicChatStore.appendMessage(sessionId, 'assistant', content, Date.now())
        }
        // STOP/UNSUBSCRIBE opt-out handling
        try {
          const lower = (rawMsg?.text?.body || '').trim().toLowerCase()
          if (lower === 'stop' || lower === 'unsubscribe' || lower === 'opt out' || lower === 'optout') {
            if (from && tenantId) {
              const customers = await (this.prisma as any)['customer'].findMany({ where: { tenantId, phone: from } })
              for (const c of customers || []) {
                const cf = ((c as any).customFields || {}) as Record<string, any>
                const marketing = { ...(cf.marketingPreferences || {}), whatsappOptOut: true }
                await (this.prisma as any)['customer'].update({ where: { id: (c as any).id }, data: { customFields: { ...cf, marketingPreferences: marketing } } })
              }
            }
          }
        } catch { /* ignore opt-out errors */ }
      } catch {/* ignore linking errors */}
      const start = Date.now();
      const res = await this.orchestrator.processWebhook(payload, tenantId);
      // Background: transcribe audio if present
      try {
        const wa: any = body as any
        const rawMsg = wa?.entry?.[0]?.changes?.[0]?.value?.messages?.[0]
        const hasAudio = rawMsg?.type === 'audio' && rawMsg?.audio?.id
        const hasImage = rawMsg?.type === 'image' && rawMsg?.image?.id
        const hasDocument = rawMsg?.type === 'document' && rawMsg?.document?.id
        if (hasAudio) {
          const convId = (res as any)?.data?.conversationId
          void this.transcription.transcribeFromUrl(`https://graph.facebook.com/v18.0/${rawMsg.audio.id}`)
            .then(async (out) => {
              if (!out?.text) return
              try {
                await (this.prisma as any)['messageAdvanced'].updateMany({
                  where: { conversationId: convId, channelMessageId: rawMsg.id },
                  data: { metadata: { transcription: out.text, transcriptionLanguage: out.language } }
                })
              } catch {/* noop */}
            })
            .catch(() => { /* ignore transcription error */ })
        }
        if (hasImage) {
          const convId = (res as any)?.data?.conversationId
          void this.mediaAnalysis.analyzeImageFromUrl(`https://graph.facebook.com/v18.0/${rawMsg.image.id}`)
            .then(async (out) => {
              if (!out?.description) return
              try {
                await (this.prisma as any)['messageAdvanced'].updateMany({
                  where: { conversationId: convId, channelMessageId: rawMsg.id },
                  data: { metadata: { imageDescription: out.description } }
                })
              } catch {/* noop */}
            }).catch(() => { /* ignore */ })
        }
        if (hasDocument) {
          const filename = rawMsg?.document?.filename || 'file.pdf'
          if (filename.toLowerCase().endsWith('.pdf')) {
            const convId = (res as any)?.data?.conversationId
            void this.mediaAnalysis.analyzePdfFromUrl(`https://graph.facebook.com/v18.0/${rawMsg.document.id}`)
              .then(async (out) => {
                if (!out?.summary) return
                try {
                  await (this.prisma as any)['messageAdvanced'].updateMany({
                    where: { conversationId: convId, channelMessageId: rawMsg.id },
                    data: { metadata: { pdfSummary: out.summary, pdfPages: out.pages } }
                  })
                } catch {/* noop */}
              }).catch(() => { /* ignore */ })
          }
        }
      } catch {/* noop */}
      // Fire-and-forget workflow trigger for multichannel chatbot flows
      try {
        // Best-effort: trigger workflows for conversation.message.received
        const msg = (res as any)?.data
        void this.workflowService.executeWorkflowByTrigger('event', {
          eventType: 'conversation.message.received',
          tenantId,
          conversationId: msg?.conversationId,
          messageId: msg?.id,
          customerId: msg?.senderId,
          messageType: msg?.messageType,
          content: msg?.content,
          channel: 'whatsapp',
          timestamp: new Date()
        } as any).catch(() => { /* ignore workflow trigger error */ })
      } catch { /* noop */ }
      getOrCreateHistogram('webhook_whatsapp_process_latency_ms', 'WhatsApp webhook process latency (ms)', ['status'], [10,20,50,100,200,500,1000,2000]).observe({ status: res?.success ? 'ok' : 'error' }, Date.now() - start);
      getOrCreateCounter('webhook_whatsapp_incoming_total', 'Total WhatsApp incoming webhooks', ['status']).inc({ status: res?.success ? 'ok' : 'error' });
      return res;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'unknown_error';
      this.logger.error('WhatsApp webhook processing failed', err as Error);
      getOrCreateCounter('webhook_whatsapp_incoming_total', 'Total WhatsApp incoming webhooks', ['status']).inc({ status: 'exception' });
      return { success: false, error: message };
    }
  }

  private async resolveTenantIdFromPayload(body: unknown): Promise<string | null> {
    try {
      type WhatsAppMeta = { entry?: Array<{ changes?: Array<{ value?: { metadata?: { phone_number_id?: string } } }> }> };
      const data = body as WhatsAppMeta;
      const phoneNumberId = data.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
      if (!phoneNumberId) return null;

      // Try advanced channel mapping first
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const prismaAny = this.prisma as unknown as { [key: string]: any };
      const advanced = await prismaAny['channelAdvanced']?.findFirst?.({
        where: { type: 'whatsapp', isActive: true },
      }).catch(() => null);
      if (advanced && advanced.tenantId) return advanced.tenantId as string;

      // Fallback to basic channel config scan
      const channels = await this.prisma['channel'].findMany({
        where: { type: 'whatsapp', isActive: true },
        select: { tenantId: true, config: true },
      });
      for (const ch of channels) {
        const cfg = (ch as unknown as { config?: Record<string, unknown> }).config || {};
        if (cfg.phoneNumberId === phoneNumberId || cfg.whatsappPhoneNumberId === phoneNumberId) {
          return ch.tenantId as string;
        }
      }
      // As a last resort in dev: if exactly one active WhatsApp channel exists, assume its tenant
      const onlyActive = await this.prisma['channel'].findMany({ where: { type: 'whatsapp', isActive: true }, select: { tenantId: true } });
      if (Array.isArray(onlyActive) && onlyActive.length === 1) {
        return (onlyActive[0] as { tenantId: string }).tenantId;
      }
      return null;
    } catch {
      return null;
    }
  }

  private verifySignatureIfPresent(headers: Record<string, string>, body: unknown): boolean {
    try {
      const signature = headers['x-hub-signature-256'] || (headers as Record<string, unknown>)['X-Hub-Signature-256'] as string | undefined;
      const appSecret = this.config.get<string>('FACEBOOK_APP_SECRET') || this.config.get<string>('WHATSAPP_APP_SECRET');
      if (!signature || !appSecret) return true; // no signature to verify or secret not configured

      const computed = this.computeHmac(appSecret, body);
      return signature === `sha256=${computed}`;
    } catch {
      return true; // do not block on verification errors in dev
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


