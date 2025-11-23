import { Injectable, Logger, Optional, Inject, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation';
import type { DomainEvent, EventSubscription } from '@glavito/shared-types';
import { ActionRegistryService } from './action-registry.service';

export interface AutopilotRequest {
  tenantId: string;
  conversationId: string;
  ticketId?: string;
  messageId?: string;
  content: string;
  previousMessages?: string[];
  channelType?: string;
  mode: 'draft' | 'auto';
  minConfidence?: number;
}

@Injectable()
export class AutopilotProcessorService implements OnModuleInit {
  private readonly logger = new Logger(AutopilotProcessorService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly actions: ActionRegistryService,
    @Optional() @Inject('AI_INTELLIGENCE_SERVICE') private readonly ai?: { generateAutoReply: (p: { content: string; previousMessages?: string[]; context?: { tenantId?: string; conversationId?: string; channelType?: string } }) => Promise<{ intent?: string; answer: string; confidence: number; messageType?: 'text' | 'template'; templateId?: string; templateParams?: Record<string, string>; actions?: Array<{ type: string; payload?: Record<string, unknown>; summary?: string }>; language?: string }> },
    @Optional() @Inject(EnhancedConversationOrchestratorService)
    private readonly orchestrator?: EnhancedConversationOrchestratorService,
    @Optional() @Inject('ADVANCED_EVENT_BUS') private readonly eventBus?: { subscribe: (sub: EventSubscription) => Promise<void> },
  ) {}

  async onModuleInit() {
    try {
      if (!this.eventBus) return;
      const sub: EventSubscription = {
        id: 'autopilot-processor',
        topics: ['ticket-events'],
        handler: { handle: async (event: DomainEvent) => this.handleEvent(event) },
        isActive: true,
      } as any;
      await this.eventBus.subscribe(sub);
      this.logger.log('AutopilotProcessor subscribed to ticket-events');
    } catch (e) {
      this.logger.warn(`AutopilotProcessor subscribe skipped: ${(e as any)?.message || e}`);
    }
  }

  private async handleEvent(event: DomainEvent): Promise<void> {
    try {
      if (event.eventType !== 'conversation.autopilot.request') return;
      const tenantId = event.tenantId as string;
      const data = (event.eventData || {}) as Record<string, unknown>;
      const req: AutopilotRequest = {
        tenantId,
        conversationId: String(data['conversationId'] || ''),
        ticketId: (data['ticketId'] as string) || undefined,
        messageId: (data['messageId'] as string) || undefined,
        content: String(data['content'] || ''),
        previousMessages: Array.isArray(data['previousMessages']) ? (data['previousMessages'] as string[]) : [],
        channelType: (data['channelType'] as string) || undefined,
        mode: (String(data['mode'] || 'draft') as 'draft'|'auto'),
        minConfidence: typeof data['minConfidence'] === 'number' ? (data['minConfidence'] as number) : undefined,
      };
      if (!req.tenantId || !req.conversationId || !req.content) return;
      if (this.ai) {
        await this.process(req);
      }
    } catch (err) {
      this.logger.warn(`Autopilot event handling failed: ${(err as any)?.message || err}`);
    }
  }

  async process(request: AutopilotRequest): Promise<{ decision: 'draft_created' | 'sent' | 'skipped'; reason?: string; responseText?: string; confidence?: number }> {
    try {
      if (!this.ai) {
        await this.recordRun(request, 'error', undefined, undefined, 'ai_unavailable');
        return { decision: 'skipped', reason: 'ai_unavailable' };
      }
      const minConfidence = typeof request.minConfidence === 'number' ? request.minConfidence : 0.7;

      const result = await this.ai.generateAutoReply({
        content: request.content,
        previousMessages: request.previousMessages || [],
        context: {
          tenantId: request.tenantId,
          conversationId: request.conversationId,
          channelType: request.channelType,
        },
      });

      const confidence = Number(result.confidence || 0);
      if (confidence < minConfidence) {
        await this.recordRun(request, 'skipped_low_confidence', undefined, confidence, undefined);
        return { decision: 'skipped', reason: 'low_confidence', confidence };
      }

      // Optionally execute actions (best-effort)
      let followupText = '';
      try {
        if (Array.isArray(result.actions) && result.actions.length) {
          const outputs = await this.actions.execute(request.tenantId, result.actions as any);
          const summaries = outputs.map(o => o.summary).filter(Boolean) as string[];
          if (summaries.length) followupText = `\n\n${summaries.join('\n')}`;
        }
      } catch { /* noop */ }

      const responseText = `${result.answer || ''}${followupText ? `\n\n${followupText}` : ''}`.trim();

      if (request.mode === 'draft') {
        // Store draft as a message with metadata.draft=true (no outbound send)
        await this.db.message.create({
          data: {
            conversationId: request.conversationId,
            senderId: 'bot',
            senderType: 'agent',
            content: responseText,
            messageType: (result.messageType as string) || 'text',
            metadata: { draft: true, confidence, intent: result.intent, templateId: result.templateId, templateParams: result.templateParams },
          } as any,
        });
        await this.recordRun(request, 'draft', undefined, confidence, undefined);
        return { decision: 'draft_created', responseText, confidence };
      }

      // Auto: send via orchestrator if available
      if (!this.orchestrator) {
        await this.recordRun(request, 'skipped_no_orchestrator', undefined, confidence, undefined);
        return { decision: 'skipped', reason: 'no_orchestrator', confidence };
      }

      const sendRes = await this.orchestrator.sendMessage(
        request.conversationId,
        {
          content: responseText,
          messageType: (result.messageType as any) || 'text',
          templateId: result.templateId,
          templateParams: result.templateParams,
          metadata: { idempotencyKey: request.messageId ? `auto:${request.messageId}` : undefined },
        } as any,
        request.tenantId,
        'bot',
      );

      const chanMsgId = (sendRes?.data as any)?.channelMessageId as string | undefined;
      await this.recordRun(request, 'sent', chanMsgId, confidence, undefined);
      return { decision: 'sent', responseText, confidence };
    } catch (err) {
      const message = (err as any)?.message || String(err);
      this.logger.error(`Autopilot processing failed: ${message}`);
      try { await this.recordRun(request, 'error', undefined, undefined, message); } catch { /* noop */ }
      return { decision: 'skipped', reason: 'error' };
    }
  }

  private async recordRun(
    request: AutopilotRequest,
    decision: 'draft' | 'sent' | 'skipped_low_confidence' | 'skipped_no_orchestrator' | 'error',
    responseMessageId?: string,
    confidence?: number,
    error?: string,
  ) {
    try {
      await (this.db as any).autopilotRun.create({
        data: {
          tenantId: request.tenantId,
          conversationId: request.conversationId,
          messageId: request.messageId || null,
          mode: request.mode,
          decision,
          confidence: typeof confidence === 'number' ? confidence : null,
          responseMessageId: responseMessageId || null,
          error: error || null,
        },
      });
      // Log to conversation timeline best-effort
      try {
        await (this.db as any).conversationEventLog.create({
          data: {
            conversationId: request.conversationId,
            eventType: decision.startsWith('skipped') ? 'autopilot.skipped' : (decision === 'draft' ? 'autopilot.draft' : decision === 'sent' ? 'autopilot.sent' : 'autopilot.error'),
            eventData: {
              mode: request.mode,
              confidence,
              responseMessageId,
              reason: error || undefined,
            },
            triggeredByType: 'system'
          }
        });
      } catch { /* non-fatal */ }
    } catch { /* non-fatal */ }
  }
}


