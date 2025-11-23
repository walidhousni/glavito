import { Inject, Injectable, Logger, Optional } from '@nestjs/common';
import { AIIntelligenceService } from '@glavito/shared-ai';
import type { CustomerTool, OrderTool, ProductTool, OrderItem } from '@glavito/shared-ai';
import { ORDER_TOOL_TOKEN, PRODUCT_TOOL_TOKEN, CUSTOMER_TOOL_TOKEN } from './tools/tokens';
import { DatabaseService } from '@glavito/shared-database';
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation';

export interface RouteIntentParams {
  content: string;
  context: {
    tenantId: string;
    customerId?: string;
    conversationId?: string;
    channelType?: string;
    previousMessages?: string[];
  };
}

@Injectable()
export class AIOrchestratorService {
  private readonly logger = new Logger(AIOrchestratorService.name);

  constructor(
    private readonly ai: AIIntelligenceService,
    private readonly db: DatabaseService,
    @Optional() private readonly conv?: EnhancedConversationOrchestratorService,
    @Optional() @Inject(ORDER_TOOL_TOKEN) private readonly orderTool?: OrderTool,
    @Optional() @Inject(PRODUCT_TOOL_TOKEN) private readonly productTool?: ProductTool,
    @Optional() @Inject(CUSTOMER_TOOL_TOKEN) private readonly customerTool?: CustomerTool,
  ) {}

  /** Analyze content and execute tool calls according to the detected intent. */
  async routeIntent(params: RouteIntentParams): Promise<{
    intent: string;
    confidence: number;
    actions: Array<{ tool: string; method: string; args: any; result?: any; error?: string }>;
    messages: string[];
  }> {
    const { content, context } = params;
    const actions: Array<{ tool: string; method: string; args: any; result?: any; error?: string }> = [];
    const messages: string[] = [];

    // 1) Classify intent + extract entities
    const analysis = await this.ai.analyzeContent({
      content,
      context,
      analysisTypes: ['intent_classification', 'entity_extraction'] as any,
    });

    const intent = analysis.results.intentClassification?.primaryIntent || 'unknown';
    const confidence = analysis.results.intentClassification?.confidence || 0;
    const entities = analysis.results.entityExtraction?.entities || [];

    // Guardrails: tenant AI settings
    const settings = await this.fetchAISettings(context.tenantId);
    const mode = (settings?.autopilotMode || settings?.mode || 'draft') as 'off'|'draft'|'auto';
    const minConfidence = Number(settings?.minConfidence ?? 0.7);
    const allowedChannels: string[] = Array.isArray(settings?.allowedChannels) ? settings.allowedChannels : [];
    const channelAllowed = !context.channelType || allowedChannels.length === 0 || allowedChannels.includes(context.channelType);
    const canExecute = mode === 'auto' && confidence >= minConfidence && channelAllowed;
    if (!canExecute) {
      messages.push(`Guardrails: actions not executed (mode=${mode}, confidence=${confidence.toFixed(2)}, min=${minConfidence}, channelAllowed=${channelAllowed})`);
    }

    // 2) Map common intents -> tool calls
    const normalized = intent.toLowerCase().replace(/\s+/g, '_');
    try {
      switch (normalized) {
        case 'create_order':
        case 'order_create': {
          if (!this.orderTool) { messages.push('Order tool unavailable'); break; }
          const items = this.extractOrderItems(entities) || [];
          if (!items.length) {
            messages.push('No items detected for order creation. Please specify SKU and quantity.');
            break;
          }
          const args = { tenantId: context.tenantId, customerId: context.customerId!, items };
          if (canExecute) {
          try {
            const result = await this.orderTool.createOrder(args);
            actions.push({ tool: 'OrderTool', method: 'createOrder', args, result });
            messages.push(`Order ${result.orderId} created with status ${result.status}.`);
          } catch (e) {
            actions.push({ tool: 'OrderTool', method: 'createOrder', args, error: String((e as Error)?.message || e) });
            }
          } else {
            actions.push({ tool: 'OrderTool', method: 'createOrder', args });
          }
          break;
        }
        case 'order_status':
        case 'track_order': {
          if (!this.orderTool) { messages.push('Order tool unavailable'); break; }
          const { orderId, trackingNumber } = this.extractOrderTracking(entities);
          let args: any = { tenantId: context.tenantId };
          if (orderId) args.orderId = orderId; else if (trackingNumber) args.trackingNumber = trackingNumber;
          if (!args.orderId && !args.trackingNumber) {
            // fallback to last order
            if (this.customerTool && context.customerId) {
              const orders = await this.customerTool.recentOrders({ tenantId: context.tenantId, customerId: context.customerId, limit: 1 });
              if (orders?.[0]?.orderId) args.orderId = orders[0].orderId;
            }
          }
          if (!args.orderId && !args.trackingNumber) { messages.push('No order identifier found to track.'); break; }
          if (canExecute) {
          try {
            const result = await this.orderTool.trackOrder(args);
            actions.push({ tool: 'OrderTool', method: 'trackOrder', args, result });
            messages.push(`Tracking status: ${result.status}`);
          } catch (e) {
            actions.push({ tool: 'OrderTool', method: 'trackOrder', args, error: String((e as Error)?.message || e) });
            }
          } else {
            actions.push({ tool: 'OrderTool', method: 'trackOrder', args });
          }
          break;
        }
        case 'product_info':
        case 'check_availability':
        case 'product_lookup': {
          if (!this.productTool) { messages.push('Product tool unavailable'); break; }
          const sku = this.extractSku(entities) || this.extractTextHint(content);
          if (!sku) { messages.push('No product identifier found.'); break; }
          const args = { tenantId: context.tenantId, sku };
          if (canExecute) {
          try {
              const result = await this.productTool.getProductInfo(args);
              actions.push({ tool: 'ProductTool', method: 'getProductInfo', args, result });
            if (!result) messages.push('Product not found.');
          } catch (e) {
              actions.push({ tool: 'ProductTool', method: 'getProductInfo', args, error: String((e as Error)?.message || e) });
            }
          } else {
            actions.push({ tool: 'ProductTool', method: 'getProductInfo', args });
          }
          break;
        }
        case 'customer_lookup':
        case 'identify_customer': {
          if (!this.customerTool) { messages.push('Customer tool unavailable'); break; }
          const email = this.extractEmail(entities);
          const phone = this.extractPhone(entities);
          if (!email && !phone) { messages.push('No phone or email detected.'); break; }
          const args = { tenantId: context.tenantId, email: email || undefined, phone: phone || undefined };
          if (canExecute) {
          try {
              const result = await this.customerTool.lookupByPhoneEmail(args);
              actions.push({ tool: 'CustomerTool', method: 'lookupByPhoneEmail', args, result });
          } catch (e) {
              actions.push({ tool: 'CustomerTool', method: 'lookupByPhoneEmail', args, error: String((e as Error)?.message || e) });
            }
          } else {
            actions.push({ tool: 'CustomerTool', method: 'lookupByPhoneEmail', args });
          }
          break;
        }
        default: {
          messages.push('No matching tool route for detected intent.');
        }
      }
    } catch (err) {
      this.logger.warn(`routeIntent error: ${String((err as Error)?.message || err)}`);
    }

    // Best-effort: log intent execution for analytics
    try {
      await (this.db as any)['aiIntentExecutionLog']?.create?.({
        data: {
          tenantId: context.tenantId,
          customerId: context.customerId,
          conversationId: context.conversationId,
          intent,
          confidence,
          actions,
          messages,
          createdAt: new Date(),
        }
      });
    } catch { /* noop */ }

    return { intent, confidence, actions, messages };
  }

  /** Generate and optionally auto-send a reply based on tenant guardrails and rate limits. */
  async autopilotReply(params: {
    tenantId: string;
    conversationId: string;
    content: string;
    channelType?: string;
    agentUserId?: string;
  }): Promise<{ decision: 'sent' | 'draft' | 'skipped_low_confidence' | 'skipped_rate_limit' | 'skipped_channel' | 'error'; answer?: string; messageId?: string; confidence?: number }> {
    const { tenantId, conversationId, content, channelType, agentUserId } = params;
    const settings = await this.fetchAISettings(tenantId);
    const mode = (settings?.mode || settings?.autopilotMode || 'draft') as 'off'|'draft'|'auto';
    const minConfidence = Number(settings?.minConfidence ?? 0.7);
    const maxAuto = Number(settings?.maxAutoRepliesPerHour ?? 10);
    const allowedChannels: string[] = Array.isArray(settings?.allowedChannels) ? settings.allowedChannels : [];
    const channelAllowed = !channelType || allowedChannels.length === 0 || allowedChannels.includes(channelType);
    if (!channelAllowed) {
      await this.recordAutopilotRun({ tenantId, conversationId, decision: 'skipped_channel' });
      return { decision: 'skipped_channel' };
    }
    // Rate limit check (last 60 mins, decision=sent)
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const sentCount = await (this.db as any).autopilotRun?.count?.({ where: { tenantId, decision: 'sent', createdAt: { gte: since } } }).catch(() => 0);
    if (mode === 'auto' && sentCount >= maxAuto) {
      await this.recordAutopilotRun({ tenantId, conversationId, decision: 'skipped_rate_limit' });
      return { decision: 'skipped_rate_limit' };
    }
    // Generate suggested answer
    const gen = await this.ai.generateAutoReply({ content, context: { tenantId, conversationId, channelType } });
    const answer = gen.answer || content;
    const confidence = Number(gen.confidence || 0.5);
    const canSend = mode === 'auto' && confidence >= minConfidence && !!this.conv;
    if (!canSend) {
      await this.recordAutopilotRun({ tenantId, conversationId, decision: confidence >= minConfidence ? 'draft' : 'skipped_low_confidence' });
      return { decision: confidence >= minConfidence ? 'draft' : 'skipped_low_confidence', answer, confidence };
    }
    try {
      const dto: any = {
        content: answer,
        messageType: gen.messageType || 'text',
        templateId: gen.templateId,
        templateParams: gen.templateParams,
      };
      const result = await (this.conv as any).sendMessage(conversationId, dto, tenantId, agentUserId || 'autopilot');
      const messageId = (result?.data as any)?.messageId || undefined;
      await this.recordAutopilotRun({ tenantId, conversationId, decision: 'sent', messageId, confidence });
      return { decision: 'sent', messageId, answer, confidence };
    } catch (error) {
      await this.recordAutopilotRun({ tenantId, conversationId, decision: 'error' });
      return { decision: 'error', answer, confidence };
    }
  }

  private async recordAutopilotRun(params: { tenantId: string; conversationId: string; decision: string; messageId?: string; confidence?: number }) {
    try {
      await (this.db as any).autopilotRun?.create?.({
        data: {
          tenantId: params.tenantId,
          conversationId: params.conversationId,
          messageId: params.messageId,
          decision: params.decision,
          confidence: params.confidence,
          mode: 'auto',
          createdAt: new Date()
        }
      });
      // Also log to event store for analytics
      await (this.db as any).eventStore?.create?.({
        data: {
          eventId: `autopilot_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          eventType: 'ai.autopilot.decision',
          eventVersion: '1',
          aggregateId: params.conversationId,
          aggregateType: 'Conversation',
          aggregateVersion: 1,
          eventData: {
            decision: params.decision,
            messageId: params.messageId,
            confidence: params.confidence
          },
          metadata: { tenantId: params.tenantId },
          timestamp: new Date(),
        }
      });
    } catch { /* noop */ }
  }

  private async fetchAISettings(tenantId: string): Promise<any | null> {
    try {
      return await (this.db as any).aISettings?.findUnique?.({ where: { tenantId } });
    } catch {
      return null;
    }
  }

  private extractOrderItems(entities: Array<{ type: string; value: string }>): OrderItem[] | null {
    // Look for patterns like sku:ABC qty:2 price:10
    const items: OrderItem[] = [];
    for (const e of entities) {
      if ((e.type || '').toLowerCase().includes('product') || (e.type || '').toLowerCase().includes('sku')) {
        const sku = (e.value || '').trim();
        if (!sku) continue;
        items.push({ sku, quantity: 1, unitPrice: 0, currency: 'USD' });
      }
    }
    return items.length ? items : null;
  }

  private extractOrderTracking(entities: Array<{ type: string; value: string }>): { orderId?: string; trackingNumber?: string } {
    const out: { orderId?: string; trackingNumber?: string } = {};
    for (const e of entities) {
      const t = (e.type || '').toLowerCase();
      if (t.includes('order') && !out.orderId) out.orderId = e.value;
      if ((t.includes('tracking') || t.includes('awb')) && !out.trackingNumber) out.trackingNumber = e.value;
    }
    return out;
  }

  private extractSku(entities: Array<{ type: string; value: string }>): string | null {
    for (const e of entities) {
      const t = (e.type || '').toLowerCase();
      if (t.includes('sku') || t.includes('product')) return (e.value || '').trim();
    }
    return null;
  }

  private extractEmail(entities: Array<{ type: string; value: string }>): string | null {
    for (const e of entities) {
      if ((e.type || '').toLowerCase().includes('email')) return (e.value || '').trim();
    }
    return null;
  }

  private extractPhone(entities: Array<{ type: string; value: string }>): string | null {
    for (const e of entities) {
      if ((e.type || '').toLowerCase().includes('phone')) return (e.value || '').replace(/\D/g, '');
    }
    return null;
  }

  private extractTextHint(text: string): string | null {
    const m = /\b([A-Z0-9_-]{3,})\b/.exec(text || '');
    return m ? m[1] : null;
  }
}


