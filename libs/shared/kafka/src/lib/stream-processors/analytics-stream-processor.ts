import { Injectable, Logger } from '@nestjs/common';
import type {
  DomainEvent,
  StreamProcessor,
  MessageReceivedEvent,
  TicketCreatedEvent,
  TicketResolvedEvent,
  TicketStatusChangedEvent,
  MetricCalculatedEvent,
  MessageAnalyzedEvent
} from '@glavito/shared-types';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AnalyticsStreamProcessor implements StreamProcessor {
  private readonly logger = new Logger(AnalyticsStreamProcessor.name);

  async process(event: DomainEvent): Promise<DomainEvent[]> {
    const outputEvents: DomainEvent[] = [];

    try {
      switch (event.eventType) {
        case 'conversation.message.received':
          outputEvents.push(...await this.processMessageReceived(event as MessageReceivedEvent));
          break;
        
        case 'ticket.created':
          outputEvents.push(...await this.processTicketCreated(event as TicketCreatedEvent));
          break;
        
        case 'ticket.resolved':
          outputEvents.push(...await this.processTicketResolved(event as TicketResolvedEvent));
          break;
        
        case 'ticket.status.changed':
          outputEvents.push(...await this.processTicketStatusChanged(event as TicketStatusChangedEvent));
          break;
        
        case 'ai.message.analyzed':
          outputEvents.push(...await this.processMessageAnalyzed(event as MessageAnalyzedEvent));
          break;
        
        default:
          // For other events, we might still want to track basic metrics
          outputEvents.push(...await this.processGenericEvent(event));
      }
    } catch (error) {
      this.logger.error(`Error processing event ${event.eventType}:`, error);
      // Don't throw - we don't want to break the stream
    }

    return outputEvents;
  }

  private async processMessageReceived(event: MessageReceivedEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const { eventData, tenantId, timestamp } = event;

    // Message volume metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'messages_received_total',
      metricType: 'counter',
      value: 1,
      dimensions: {
        channel: eventData.channel,
        message_type: eventData.messageType,
        sender_type: eventData.senderType
      }
    }));

    // Channel-specific metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'channel_activity',
      metricType: 'counter',
      value: 1,
      dimensions: {
        channel: eventData.channel,
        activity_type: 'message_received'
      }
    }));

    // Message type distribution
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'message_type_distribution',
      metricType: 'counter',
      value: 1,
      dimensions: {
        message_type: eventData.messageType,
        channel: eventData.channel
      }
    }));

    return events;
  }

  private async processTicketCreated(event: TicketCreatedEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const { eventData, tenantId, timestamp } = event;

    // Ticket creation metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'tickets_created_total',
      metricType: 'counter',
      value: 1,
      dimensions: {
        priority: eventData.priority,
        channel: eventData.channel,
        source: eventData.source
      }
    }));

    // Priority distribution
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'ticket_priority_distribution',
      metricType: 'counter',
      value: 1,
      dimensions: {
        priority: eventData.priority
      }
    }));

    // Channel effectiveness
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'channel_ticket_volume',
      metricType: 'counter',
      value: 1,
      dimensions: {
        channel: eventData.channel
      }
    }));

    return events;
  }

  private async processTicketResolved(event: TicketResolvedEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const { eventData, tenantId, timestamp } = event;

    // Resolution metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'tickets_resolved_total',
      metricType: 'counter',
      value: 1,
      dimensions: {
        first_contact_resolution: eventData.firstContactResolution.toString()
      }
    }));

    // Resolution time metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'ticket_resolution_time',
      metricType: 'histogram',
      value: eventData.resolutionTime,
      dimensions: {
        resolved_by: eventData.resolvedBy
      }
    }));

    // First contact resolution rate
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'first_contact_resolution_rate',
      metricType: 'gauge',
      value: eventData.firstContactResolution ? 1 : 0,
      dimensions: {}
    }));

    return events;
  }

  private async processTicketStatusChanged(event: TicketStatusChangedEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const { eventData, tenantId, timestamp } = event;

    // Status transition metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'ticket_status_transitions',
      metricType: 'counter',
      value: 1,
      dimensions: {
        from_status: eventData.oldStatus,
        to_status: eventData.newStatus,
        changed_by: eventData.changedBy
      }
    }));

    // Current status distribution
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'ticket_status_distribution',
      metricType: 'gauge',
      value: 1,
      dimensions: {
        status: eventData.newStatus
      }
    }));

    return events;
  }

  private async processMessageAnalyzed(event: MessageAnalyzedEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const { eventData, tenantId, timestamp } = event;

    // Sentiment metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'message_sentiment_score',
      metricType: 'histogram',
      value: eventData.analysis.sentiment.score,
      dimensions: {
        sentiment_label: eventData.analysis.sentiment.label
      }
    }));

    // Intent classification metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'message_intent_classification',
      metricType: 'counter',
      value: 1,
      dimensions: {
        intent: eventData.analysis.intent.primary,
        confidence_bucket: this.getConfidenceBucket(eventData.analysis.intent.confidence)
      }
    }));

    // Urgency metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'message_urgency_score',
      metricType: 'histogram',
      value: eventData.analysis.urgency.score,
      dimensions: {
        urgency_level: eventData.analysis.urgency.level
      }
    }));

    // Language detection metrics
    events.push(this.createMetricEvent({
      tenantId,
      timestamp,
      metricName: 'message_language_distribution',
      metricType: 'counter',
      value: 1,
      dimensions: {
        language: eventData.analysis.language.code
      }
    }));

    // Emotion analysis metrics
    for (const emotion of eventData.analysis.emotions) {
      events.push(this.createMetricEvent({
        tenantId,
        timestamp,
        metricName: 'message_emotion_detection',
        metricType: 'histogram',
        value: emotion.confidence,
        dimensions: {
          emotion: emotion.emotion
        }
      }));
    }

    return events;
  }

  private async processGenericEvent(event: DomainEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];

    // Generic event counter
    events.push(this.createMetricEvent({
      tenantId: event.tenantId,
      timestamp: event.timestamp,
      metricName: 'events_processed_total',
      metricType: 'counter',
      value: 1,
      dimensions: {
        event_type: event.eventType,
        aggregate_type: event.aggregateType,
        source: event.metadata.source
      }
    }));

    return events;
  }

  private createMetricEvent(params: {
    tenantId: string;
    timestamp: Date;
    metricName: string;
    metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
    value: number;
    dimensions: Record<string, string>;
  }): MetricCalculatedEvent {
    return {
      eventId: uuidv4(),
      eventType: 'analytics.metric.calculated',
      aggregateId: `metric-${params.metricName}`,
      aggregateType: 'analytics',
      tenantId: params.tenantId,
      timestamp: params.timestamp,
      version: '1.0',
      eventData: {
        metricName: params.metricName,
        metricType: params.metricType,
        value: params.value,
        dimensions: params.dimensions,
        calculatedAt: params.timestamp
      },
      metadata: {
        source: 'analytics-stream-processor',
        traceId: uuidv4()
      }
    };
  }

  private getConfidenceBucket(confidence: number): string {
    if (confidence >= 0.9) return 'high';
    if (confidence >= 0.7) return 'medium';
    if (confidence >= 0.5) return 'low';
    return 'very-low';
  }
}