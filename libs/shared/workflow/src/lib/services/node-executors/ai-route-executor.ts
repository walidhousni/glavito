import { Injectable } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';

/**
 * AI Route Executor
 * Routes based on analysis stored in context (from ai_decision or ai_agent).
 * Uses config.intentMap or falls back to sentiment/urgency/intent.
 */
@Injectable()
export class AIRouteNodeExecutor implements NodeExecutor {
  canHandle(kind: string): boolean {
    return kind === 'ai_route';
  }
  async execute(node: any, context: FlowExecutionContext): Promise<any> {
    const cfg = node.config || {};
    const analysis = context.variables['aiAnalysis'];
    const intent = analysis?.results?.intentClassification?.primaryIntent || context.variables['aiIntent'];
    const sentiment = analysis?.results?.sentimentAnalysis?.sentiment;
    const urgency = analysis?.results?.urgencyDetection?.urgencyLevel;
    // Intent map
    if (cfg.intentMap && typeof cfg.intentMap === 'object' && intent) {
      const key = String(intent).toLowerCase();
      const mapped = cfg.intentMap[key];
      if (mapped) return { outputPath: String(mapped), used: 'intentMap' };
    }
    // Heuristics
    if (urgency === 'critical' || urgency === 'high') {
      if (sentiment === 'negative') return { outputPath: 'urgent_negative', used: 'heuristic' };
      return { outputPath: 'urgent', used: 'heuristic' };
    }
    if (sentiment === 'negative') return { outputPath: 'negative', used: 'heuristic' };
    if (sentiment === 'positive') return { outputPath: 'positive', used: 'heuristic' };
    return { outputPath: cfg.defaultOutput || 'neutral', used: 'default' };
  }
}


