import { Injectable } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';

/**
 * AI Guardrail Executor
 * Enforces confidence threshold and channel allowlist based on node config.
 * Returns outputPath 'allowed' or 'blocked'.
 */
@Injectable()
export class AIGuardrailNodeExecutor implements NodeExecutor {
  canHandle(kind: string): boolean {
    return kind === 'ai_guardrail';
  }
  async execute(node: any, context: FlowExecutionContext): Promise<any> {
    const cfg = node.config || {};
    const minConfidence = typeof cfg.minConfidence === 'number' ? cfg.minConfidence : 0;
    const allowedChannels = Array.isArray(cfg.allowedChannels) ? (cfg.allowedChannels as string[]) : [];
    const profanityFilter = Boolean(cfg.profanityFilter);
    const confidence = Number(context.variables['aiConfidence'] || 0);
    const channel = String(context.variables['channelType'] || cfg.channelType || '').toLowerCase();
    // Confidence check
    if (confidence < minConfidence) {
      return { outputPath: 'blocked', reason: 'low_confidence', confidence };
    }
    // Channel allowlist check
    if (allowedChannels.length && channel && !allowedChannels.includes(channel)) {
      return { outputPath: 'blocked', reason: 'channel_not_allowed', channel };
    }
    // Simple profanity guard (very basic)
    if (profanityFilter) {
      const text = String(context.variables['aiDraft'] || context.variables['messageContent'] || '');
      if (/[^\w](?:fuck|shit|bitch|asshole)[^\w]/i.test(` ${text} `)) {
        return { outputPath: 'blocked', reason: 'profanity_detected' };
      }
    }
    return { outputPath: 'allowed' };
  }
}


