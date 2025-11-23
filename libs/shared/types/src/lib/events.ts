// Advanced Event-Driven Architecture Types
// Domain Events for Advanced Ticket Management System

export interface DomainEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  eventData: Record<string, any>;
  metadata: EventMetadata;
  timestamp: Date;
  version: string;
  tenantId: string;
  causationId?: string; // ID of the command that caused this event
  correlationId?: string; // ID to group related events
}

export interface EventMetadata {
  userId?: string;
  ip?: string;
  userAgent?: string;
  source: string; // service name that generated the event
  traceId?: string;
  spanId?: string;
  sessionId?: string;
  requestId?: string;
}

// Conversation Events
export interface ConversationEvent extends DomainEvent {
  aggregateType: 'conversation';
}

export interface MessageReceivedEvent extends ConversationEvent {
  eventType: 'conversation.message.received';
  eventData: {
    conversationId: string;
    messageId: string;
    senderId: string;
    senderType: 'customer' | 'agent' | 'system';
    content: string;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
    channel: 'whatsapp' | 'instagram' | 'email' | 'web' | 'voice' | 'video';
    channelMessageId?: string;
    attachments?: Array<{
      id: string;
      type: string;
      url: string;
      filename?: string;
      size?: number;
    }>;
    replyToMessageId?: string;
    isForwarded?: boolean;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
  };
}

export interface MessageSentEvent extends ConversationEvent {
  eventType: 'conversation.message.sent';
  eventData: {
    conversationId: string;
    messageId: string;
    agentId: string;
    content: string;
    messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template';
    channel: 'whatsapp' | 'instagram' | 'email' | 'web' | 'voice' | 'video';
    deliveryStatus: 'sent' | 'delivered' | 'read' | 'failed';
    templateId?: string;
    templateParams?: Record<string, string>;
  };
}

export interface ConversationStartedEvent extends ConversationEvent {
  eventType: 'conversation.started';
  eventData: {
    conversationId: string;
    customerId: string;
    channel: string;
    initiatedBy: 'customer' | 'agent';
    context?: Record<string, any>;
  };
}

export interface ConversationAssignedEvent extends ConversationEvent {
  eventType: 'conversation.assigned';
  eventData: {
    conversationId: string;
    agentId: string;
    assignedBy: string;
    previousAgentId?: string;
    reason?: string;
  };
}

export interface ConversationClosedEvent extends ConversationEvent {
  eventType: 'conversation.closed';
  eventData: {
    conversationId: string;
    closedBy: string;
    reason: string;
    resolution?: string;
    satisfactionRating?: number;
    tags?: string[];
  };
}

// Ticket Events
export interface TicketEvent extends DomainEvent {
  aggregateType: 'ticket';
}

export interface TicketCreatedEvent extends TicketEvent {
  eventType: 'ticket.created';
  eventData: {
    ticketId: string;
    customerId: string;
    subject: string;
    description: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'pending' | 'resolved' | 'closed';
    channel: string;
    source: 'customer' | 'agent' | 'system';
    tags?: string[];
    customFields?: Record<string, any>;
  };
}

export interface TicketStatusChangedEvent extends TicketEvent {
  eventType: 'ticket.status.changed';
  eventData: {
    ticketId: string;
    oldStatus: string;
    newStatus: string;
    changedBy: string;
    reason?: string;
    comment?: string;
  };
}

export interface TicketAssignedEvent extends TicketEvent {
  eventType: 'ticket.assigned';
  eventData: {
    ticketId: string;
    agentId: string;
    teamId?: string;
    assignedBy: string;
    previousAgentId?: string;
    assignmentType: 'manual' | 'automatic' | 'escalation';
  };
}

export interface TicketPriorityChangedEvent extends TicketEvent {
  eventType: 'ticket.priority.changed';
  eventData: {
    ticketId: string;
    oldPriority: string;
    newPriority: string;
    changedBy: string;
    reason?: string;
  };
}

export interface TicketResolvedEvent extends TicketEvent {
  eventType: 'ticket.resolved';
  eventData: {
    ticketId: string;
    resolvedBy: string;
    resolution: string;
    resolutionTime: number; // in minutes
    firstContactResolution: boolean;
    tags?: string[];
  };
}

export interface TicketReopenedEvent extends TicketEvent {
  eventType: 'ticket.reopened';
  eventData: {
    ticketId: string;
    reopenedBy: string;
    reason: string;
    previousResolution?: string;
  };
}

export interface TicketEscalatedEvent extends TicketEvent {
  eventType: 'ticket.escalated';
  eventData: {
    ticketId: string;
    escalatedBy: string;
    escalatedTo: string;
    escalationLevel: number;
    reason: string;
    slaBreached?: boolean;
  };
}

export interface TicketTriagedEvent extends TicketEvent {
  eventType: 'ticket.triaged';
  eventData: {
    ticketId: string;
    intent: string;
    category: string;
    priority: string;
    urgencyLevel: string;
    language: string;
    confidence: number;
    entities: Array<{ type: string; value: string; confidence: number }>;
  };
}

export interface TicketAutoAssignedEvent extends TicketEvent {
  eventType: 'ticket.auto_assigned';
  eventData: {
    ticketId: string;
    assignedAgentId: string;
    confidence: number;
    intent: string;
    category: string;
    reasoning?: string;
  };
}

// Customer Events
export interface CustomerEvent extends DomainEvent {
  aggregateType: 'customer';
}

export interface CustomerCreatedEvent extends CustomerEvent {
  eventType: 'customer.created';
  eventData: {
    customerId: string;
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
    company?: string;
    source: string;
    channel: string;
  };
}

export interface CustomerUpdatedEvent extends CustomerEvent {
  eventType: 'customer.updated';
  eventData: {
    customerId: string;
    changes: Record<string, { old: any; new: any }>;
    updatedBy: string;
  };
}

export interface CustomerMergedEvent extends CustomerEvent {
  eventType: 'customer.merged';
  eventData: {
    primaryCustomerId: string;
    mergedCustomerIds: string[];
    mergedBy: string;
    mergeReason: string;
  };
}

// AI Analysis Events
export interface AIAnalysisEvent extends DomainEvent {
  aggregateType: 'ai-analysis';
}

export interface MessageAnalyzedEvent extends AIAnalysisEvent {
  eventType: 'ai.message.analyzed';
  eventData: {
    messageId: string;
    conversationId: string;
    analysis: {
      intent: {
        primary: string;
        confidence: number;
        alternatives?: Array<{ intent: string; confidence: number }>;
      };
      sentiment: {
        score: number; // -1 to 1
        label: 'negative' | 'neutral' | 'positive';
        confidence: number;
      };
      emotions: Array<{
        emotion: string;
        confidence: number;
      }>;
      entities: Array<{
        type: string;
        value: string;
        confidence: number;
        start: number;
        end: number;
      }>;
      language: {
        code: string;
        confidence: number;
      };
      urgency: {
        score: number; // 0 to 1
        level: 'low' | 'medium' | 'high' | 'critical';
      };
      category: {
        primary: string;
        confidence: number;
        subcategory?: string;
      };
      suggestedResponses?: Array<{
        response: string;
        confidence: number;
        type: 'template' | 'generated';
      }>;
      knowledgeBaseSuggestions?: Array<{
        articleId: string;
        title: string;
        relevanceScore: number;
      }>;
    };
  };
}

export interface CustomerSentimentAnalyzedEvent extends AIAnalysisEvent {
  eventType: 'ai.customer.sentiment.analyzed';
  eventData: {
    customerId: string;
    conversationId: string;
    overallSentiment: {
      score: number;
      trend: 'improving' | 'stable' | 'declining';
      riskLevel: 'low' | 'medium' | 'high';
    };
    churnRisk: {
      score: number; // 0 to 1
      factors: string[];
      recommendations: string[];
    };
  };
}

// Workflow Events
export interface WorkflowEvent extends DomainEvent {
  aggregateType: 'workflow';
}

export interface WorkflowTriggeredEvent extends WorkflowEvent {
  eventType: 'workflow.triggered';
  eventData: {
    workflowId: string;
    workflowName: string;
    triggerType: 'event' | 'schedule' | 'manual';
    triggerData: Record<string, any>;
    executionId: string;
  };
}

export interface WorkflowCompletedEvent extends WorkflowEvent {
  eventType: 'workflow.completed';
  eventData: {
    workflowId: string;
    executionId: string;
    status: 'success' | 'failed' | 'cancelled';
    duration: number; // in milliseconds
    output?: Record<string, any>;
    error?: string;
  };
}

// SLA Events
export interface SLAEvent extends DomainEvent {
  aggregateType: 'sla';
}

export interface SLABreachedEvent extends SLAEvent {
  eventType: 'sla.breached';
  eventData: {
    ticketId: string;
    slaType: 'first_response' | 'resolution';
    targetTime: number; // in minutes
    actualTime: number; // in minutes
    breachSeverity: 'minor' | 'major' | 'critical';
  };
}

export interface SLAWarningEvent extends SLAEvent {
  eventType: 'sla.warning';
  eventData: {
    ticketId: string;
    slaType: 'first_response' | 'resolution';
    targetTime: number;
    remainingTime: number;
    warningThreshold: number; // percentage
  };
}

// Analytics Events
export interface AnalyticsEvent extends DomainEvent {
  aggregateType: 'analytics';
}

export interface MetricCalculatedEvent extends AnalyticsEvent {
  eventType: 'analytics.metric.calculated';
  eventData: {
    metricName: string;
    metricType: 'counter' | 'gauge' | 'histogram' | 'summary';
    value: number;
    dimensions: Record<string, string>;
    calculatedAt: Date;
  };
}

// Integration Events
export interface IntegrationEvent extends DomainEvent {
  aggregateType: 'integration';
}

export interface ExternalSystemSyncEvent extends IntegrationEvent {
  eventType: 'integration.sync.completed';
  eventData: {
    systemName: string;
    syncType: 'full' | 'incremental';
    recordsProcessed: number;
    recordsCreated: number;
    recordsUpdated: number;
    recordsSkipped: number;
    errors: Array<{
      recordId: string;
      error: string;
    }>;
    duration: number;
  };
}

// Marketing Events
export interface MarketingEvent extends DomainEvent {
  aggregateType: 'marketing';
}

export interface MarketingCampaignCreatedEvent extends MarketingEvent {
  eventType: 'marketing.campaign.created';
  eventData: {
    campaignId: string;
  };
}

export interface MarketingCampaignUpdatedEvent extends MarketingEvent {
  eventType: 'marketing.campaign.updated';
  eventData: {
    campaignId: string;
    changes: string[];
  };
}

export interface MarketingCampaignLaunchedEvent extends MarketingEvent {
  eventType: 'marketing.campaign.launched';
  eventData: {
    campaignId: string;
    deliveries: number;
  };
}

export interface MarketingDeliveryEvent extends MarketingEvent {
  eventType: 'marketing.delivery.sent' | 'marketing.delivery.failed' | 'marketing.delivery.opened' | 'marketing.delivery.clicked';
  eventData: {
    deliveryId: string;
    campaignId: string;
    variantId?: string;
    customerId: string;
    channel: string;
    error?: string;
  };
}

// Event Stream Processing Types
export interface StreamProcessor {
  process(event: DomainEvent): Promise<DomainEvent[]>;
}

export interface EventAggregator {
  aggregate(events: DomainEvent[]): Promise<any>;
}

export interface EventHandler {
  handle(event: DomainEvent): Promise<void>;
}

export interface EventSubscription {
  id: string;
  topics: string[];
  handler: EventHandler;
  isActive: boolean;
}

// Event Store Types
export interface EventStoreRecord {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  aggregateVersion: number;
  eventData: any;
  metadata: EventMetadata;
  timestamp: Date;
  causationId?: string;
  correlationId?: string;
}

export interface EventSnapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  data: any;
  timestamp: Date;
}

// Kafka Configuration Types
export interface KafkaTopicConfig {
  name: string;
  partitions: number;
  replicationFactor: number;
  configs?: Record<string, string>;
}

export interface KafkaStreamConfig {
  inputTopic: string;
  outputTopic: string;
  processor: StreamProcessor;
  parallelism?: number;
}

// Event Bus Interface
export interface EventBus {
  publish(event: DomainEvent): Promise<void>;
  publishBatch(events: DomainEvent[]): Promise<void>;
  subscribe(subscription: EventSubscription): Promise<void>;
  unsubscribe(subscriptionId: string): Promise<void>;
  createStream(config: KafkaStreamConfig): Promise<void>;
}