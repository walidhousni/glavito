import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';
import { PrismaService } from '@glavito/shared-database';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

/**
 * Analytics Tracker Node Executor
 * 
 * Tracks custom events and metrics in the analytics system.
 * Integrates with EventStore and publishes to Kafka for real-time analytics.
 * 
 * Use cases:
 * - Track workflow milestones
 * - Custom business events
 * - Conversion tracking
 * - User behavior analytics
 */ 
@Injectable()
export class AnalyticsTrackerNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(AnalyticsTrackerNodeExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: {
      publishWorkflowEvent: (event: {
        eventType: string;
        tenantId: string;
        customerId?: string;
        ticketId?: string;
        data: unknown;
        metadata: unknown;
        timestamp: Date;
      }) => Promise<void>;
    }
  ) {}

  canHandle(nodeKind: string): boolean {
    return nodeKind === 'track_event' || nodeKind === 'analytics_event' || nodeKind === 'log_metric';
  }

  async execute(node: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const config = (node['config'] || {}) as Record<string, unknown>;

    // Determine event type
    const eventType = (config['eventType'] as string) || 'workflow.custom_event';
    
    // Build event payload
    const payload = this.buildPayload(config, context);

    try {
      // Store in EventStore (using proper schema)
      const eventId = randomUUID();
      const timestamp = new Date();
      
      const contextExt = context as unknown as Record<string, unknown>;
      
      const event = await this.prisma['eventStore'].create({
        data: {
          eventId,
          eventType,
          eventVersion: '1.0',
          aggregateId: this.getAggregateId(context, config),
          aggregateType: this.getAggregateType(context, config),
          aggregateVersion: 1,
          eventData: payload as any,
          metadata: {
            flowRunId: contextExt['runId'],
            nodeKey: node['key'],
            userId: context.userId,
            tenantId: context.tenantId,
            workflowNodeType: node['kind'],
            timestamp: timestamp.toISOString(),
          } as any,
          timestamp,
        },
      });

      this.logger.log(`Analytics event tracked: ${eventType} (${eventId})`);

      // Publish to Kafka for real-time processing
      if (this.eventPublisher?.publishWorkflowEvent) {
        try {
          await this.eventPublisher.publishWorkflowEvent({
            eventType,
            tenantId: context.tenantId,
            customerId: context.customerId,
            ticketId: context.ticketId,
            data: payload,
            metadata: event.metadata,
            timestamp,
          });
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          this.logger.warn(`Failed to publish to Kafka: ${errorMessage}`);
        }
      }

      // Store event ID in context for reference
      context.variables['lastEventId'] = eventId;
      context.variables['lastEventType'] = eventType;

      return {
        eventId,
        eventType,
        tracked: true,
        published: !!this.eventPublisher,
        timestamp,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Analytics tracking failed: ${errorMessage}`, errorStack);
      return {
        tracked: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Build event payload from config and context
   */
  private buildPayload(config: Record<string, unknown>, context: FlowExecutionContext): Record<string, unknown> {
    const contextExt = context as unknown as Record<string, unknown>;
    const payload: Record<string, unknown> = {
      flowId: contextExt['flowId'],
      flowVersionId: contextExt['flowVersionId'],
      flowRunId: contextExt['runId'],
      nodeKey: config['nodeKey'],
      tenantId: context.tenantId,
      customerId: context.customerId,
      ticketId: context.ticketId,
      conversationId: context.conversationId,
      userId: context.userId,
    };

    // Add custom data
    if (config['data']) {
      payload['customData'] = this.replaceVariables(config['data'], context.variables);
    }

    // Add metrics if specified
    const configMetrics = config['metrics'];
    if (configMetrics && typeof configMetrics === 'object') {
      const metrics: Record<string, unknown> = {};
      for (const [key, valueExpr] of Object.entries(configMetrics)) {
        metrics[key] = this.evaluateExpression(String(valueExpr), context.variables);
      }
      payload['metrics'] = metrics;
    }

    // Add context variables if specified
    const includeVars = config['includeVariables'];
    if (includeVars) {
      const varsToInclude = Array.isArray(includeVars) 
        ? includeVars as string[]
        : Object.keys(context.variables);
      
      const variables: Record<string, unknown> = {};
      for (const varName of varsToInclude) {
        if (context.variables[varName] !== undefined) {
          variables[varName] = context.variables[varName];
        }
      }
      payload['variables'] = variables;
    }

    // Add properties from config
    const configProps = config['properties'];
    if (configProps) {
      payload['properties'] = this.replaceVariables(configProps, context.variables);
    }

    return payload;
  }

  /**
   * Get aggregate ID for event
   */
  private getAggregateId(context: FlowExecutionContext, config: Record<string, unknown>): string {
    const aggregateId = config['aggregateId'];
    if (aggregateId) {
      return String(aggregateId);
    }

    // Default: use ticket, customer, or conversation ID
    return context.ticketId || context.customerId || context.conversationId || 'unknown';
  }

  /**
   * Get aggregate type for event
   */
  private getAggregateType(context: FlowExecutionContext, config: Record<string, unknown>): string {
    const aggregateType = config['aggregateType'];
    if (aggregateType) {
      return String(aggregateType);
    }

    // Default: infer from context
    if (context.ticketId) return 'ticket';
    if (context.conversationId) return 'conversation';
    if (context.customerId) return 'customer';
    return 'workflow';
  }

  /**
   * Replace variables in object/array recursively
   */
  private replaceVariables(obj: unknown, variables: Record<string, unknown>): unknown {
    if (typeof obj === 'string') {
      let result = obj;
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
        result = result.replace(regex, String(value ?? ''));
      }
      return result;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.replaceVariables(item, variables));
    }

    if (obj && typeof obj === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        result[key] = this.replaceVariables(value, variables);
      }
      return result;
    }

    return obj;
  }

  /**
   * Evaluate simple expressions
   */
  private evaluateExpression(expr: string, variables: Record<string, unknown>): unknown {
    // Simple variable reference
    if (expr.startsWith('{{') && expr.endsWith('}}')) {
      const varName = expr.slice(2, -2).trim();
      return variables[varName];
    }

    // Simple arithmetic (e.g., "{{count}} + 1")
    const arithmeticMatch = expr.match(/{{(\w+)}}\s*([+\-*/])\s*(\d+)/);
    if (arithmeticMatch) {
      const [, varName, operator, operand] = arithmeticMatch;
      const value = Number(variables[varName]) || 0;
      const op = Number(operand);

      switch (operator) {
        case '+': return value + op;
        case '-': return value - op;
        case '*': return value * op;
        case '/': return value / op;
        default: return value;
      }
    }

    // Return as-is if not a recognized expression
    return expr;
  }
}

