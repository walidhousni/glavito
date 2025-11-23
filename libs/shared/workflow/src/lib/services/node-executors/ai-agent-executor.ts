import { Injectable, Logger, Optional, Inject } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';
/**
 * AI Agent Executor
 * Generates a draft/auto reply using the shared AI service.
 * Stores output in context.variables for downstream nodes (e.g., send_message).
 */
@Injectable()
export class AIAgentNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(AIAgentNodeExecutor.name);
  constructor(
    @Optional() @Inject('AI_INTELLIGENCE_SERVICE') private readonly ai?: {
      generateAutoReply: (p: { content: string; previousMessages?: string[]; context?: { tenantId?: string; conversationId?: string; channelType?: string } }) => Promise<{ intent?: string; answer: string; confidence: number; messageType?: 'text' | 'template'; templateId?: string; templateParams?: Record<string, string> }>;
    }
  ) {}
  canHandle(kind: string): boolean {
    return kind === 'ai_agent';
  }
  async execute(node: any, context: FlowExecutionContext): Promise<any> {
    const cfg = node.config || {};
    if (!this.ai) {
      this.logger.warn('AI service unavailable; skipping ai_agent');
      context.variables['aiAgentAvailable'] = false;
      return { outputPath: 'default', skipped: true };
    }
    const content = String(cfg.content || context.variables['messageContent'] || context.variables['content'] || '');
    const previousMessages = Array.isArray(context.variables['previousMessages']) ? (context.variables['previousMessages'] as string[]) : [];
    const res = await this.ai.generateAutoReply({
      content,
      previousMessages,
      context: {
        tenantId: context.tenantId,
        conversationId: context.conversationId,
        channelType: cfg.channelType,
      }
    });
    context.variables['aiDraft'] = res.answer;
    context.variables['aiConfidence'] = res.confidence;
    context.variables['aiIntent'] = res.intent;
    context.variables['aiMessageType'] = res.messageType || 'text';
    context.variables['aiTemplateId'] = res.templateId;
    context.variables['aiTemplateParams'] = res.templateParams;
    const minConfidence = typeof cfg.minConfidence === 'number' ? cfg.minConfidence : 0;
    const pass = res.confidence >= minConfidence;
    return { outputPath: pass ? 'ok' : 'low_confidence', reply: res.answer, confidence: res.confidence };
  }
}


