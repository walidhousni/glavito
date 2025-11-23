import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';

/**
 * AI Decision Node Executor
 * 
 * Uses AIIntelligenceService to analyze content and make intelligent routing decisions.
 * Supports multiple analysis types: intent, sentiment, urgency, entities, etc.
 * 
 * Output paths are determined by AI analysis results:
 * - urgent_negative: High urgency + negative sentiment
 * - urgent: High urgency
 * - positive: Positive sentiment
 * - negative: Negative sentiment
 * - neutral: Neutral/default case
 */
@Injectable()
export class AIDecisionNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(AIDecisionNodeExecutor.name);

  constructor(
    @Optional() @Inject('AI_INTELLIGENCE_SERVICE') private readonly ai?: any
  ) {}

  canHandle(nodeKind: string): boolean {
    return nodeKind === 'ai_decision' || nodeKind === 'ai_analysis' || nodeKind === 'ai_route';
  }

  async execute(node: any, context: FlowExecutionContext): Promise<any> {
    if (!this.ai) {
      this.logger.warn('AI service not available, using fallback routing');
      return { outputPath: 'default', aiAvailable: false };
    }

    const config = node.config || {};
    
    // Determine content to analyze
    const content = this.getContent(config, context);
    if (!content) {
      this.logger.warn('No content provided for AI analysis');
      return { outputPath: 'default', error: 'No content' };
    }

    // Determine analysis types
    const analysisTypes = config.analysisTypes || [
      'intent_classification',
      'sentiment_analysis',
      'urgency_detection'
    ];

    try {
      // Call AI service
      const result = await this.ai.analyzeContent({
        content,
        context: {
          tenantId: context.tenantId,
          customerId: context.customerId,
          conversationId: context.conversationId,
          ticketId: context.ticketId,
          channelType: config.channelType,
          previousMessages: context.variables['previousMessages'],
        },
        analysisTypes,
      });

      // Determine output path based on analysis
      const outputPath = this.determineOutputPath(result, config);

      // Store analysis in context for downstream nodes
      // Store analysis in context for downstream nodes
        context.variables['aiAnalysis'] = result;
      context.variables['aiConfidence'] = result.confidence;

      this.logger.log(`AI Decision: ${outputPath} (confidence: ${result.confidence})`);

      return {
        outputPath,
        analysis: result.results,
        confidence: result.confidence,
        intent: result.results.intentClassification?.primaryIntent,
        sentiment: result.results.sentimentAnalysis?.sentiment,
        urgency: result.results.urgencyDetection?.urgencyLevel,
        entities: result.results.entityExtraction?.entities,
      };
    } catch (error: any) {
      this.logger.error(`AI analysis failed: ${error.message}`, error.stack);
      return {
        outputPath: 'error',
        error: error.message,
        fallback: true,
      };
    }
  }

  /**
   * Get content to analyze from config or context
   */
  private getContent(config: any, context: FlowExecutionContext): string {
    // Priority: explicit content > variable reference > context variables
    if (config.content) {
      return this.replaceVariables(config.content, context.variables);
    }

    if (config.contentVariable && context.variables[config.contentVariable]) {
      return String(context.variables[config.contentVariable]);
    }

    // Fallback to common context variables
    return context.variables['messageContent'] || 
           context.variables['ticketDescription'] || 
           context.variables['content'] || 
           '';
  }

  /**
   * Determine output path based on AI analysis results
   */
  private determineOutputPath(result: any, config: any): string {
    const results = result.results;
    
    // Custom routing rules if provided
    if (config.routingRules) {
      const customPath = this.applyCustomRules(config.routingRules, results);
      if (customPath) return customPath;
    }

    // Default intelligent routing
    const sentiment = results.sentimentAnalysis?.sentiment;
    const urgency = results.urgencyDetection?.urgencyLevel;
    const intent = results.intentClassification?.primaryIntent;

    // Critical: Urgent + Negative
    if (urgency === 'critical' || urgency === 'high') {
      if (sentiment === 'negative') {
        return 'urgent_negative';
      }
      return 'urgent';
    }

    // Sentiment-based routing
    if (sentiment === 'negative') {
      return 'negative';
    }
    
    if (sentiment === 'positive') {
      return 'positive';
    }

    // Intent-based routing
    if (intent) {
      const intentLower = intent.toLowerCase();
      if (intentLower.includes('complaint') || intentLower.includes('issue')) {
        return 'complaint';
      }
      if (intentLower.includes('question') || intentLower.includes('inquiry')) {
        return 'question';
      }
      if (intentLower.includes('request')) {
        return 'request';
      }
    }

    // Default
    return config.defaultOutput || 'neutral';
  }

  /**
   * Apply custom routing rules
   */
  private applyCustomRules(rules: any[], results: any): string | null {
    for (const rule of rules) {
      if (this.evaluateRule(rule, results)) {
        return rule.outputPath;
      }
    }
    return null;
  }

  /**
   * Evaluate a single rule
   */
  private evaluateRule(rule: any, results: any): boolean {
    const { condition, value } = rule;

    switch (condition) {
      case 'sentiment_equals':
        return results.sentimentAnalysis?.sentiment === value;
      
      case 'sentiment_score_gt':
        return (results.sentimentAnalysis?.score || 0) > parseFloat(value);
      
      case 'sentiment_score_lt':
        return (results.sentimentAnalysis?.score || 0) < parseFloat(value);
      
      case 'urgency_equals':
        return results.urgencyDetection?.urgencyLevel === value;
      
      case 'urgency_score_gt':
        return (results.urgencyDetection?.urgencyScore || 0) > parseFloat(value);
      
      case 'intent_contains':
        return results.intentClassification?.primaryIntent?.toLowerCase().includes(value.toLowerCase());
      
      case 'confidence_gt':
        return (results.intentClassification?.confidence || 0) > parseFloat(value);
      
      default:
        return false;
    }
  }

  /**
   * Replace variables in template
   */
  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    return result;
  }
}

