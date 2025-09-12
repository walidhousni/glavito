// Multi-Channel Conversation Management Types
// Complete DTOs and interfaces for advanced conversation orchestration


export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'location' | 'contact' | 'sticker' | 'template' | 'interactive';
export type SenderType = 'customer' | 'agent' | 'system' | 'bot';
export type ConversationStatus = 'active' | 'waiting' | 'closed' | 'archived';
export type ConversationPriority = 'low' | 'medium' | 'high' | 'critical';

// Base Message Interface
export interface BaseMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: SenderType;
  content: string;
  messageType: MessageType;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Channel-specific message interfaces
export interface WhatsAppMessage extends BaseMessage {
  channel: 'whatsapp';
  whatsappData: {
    messageId: string;
    phoneNumber: string;
    profileName?: string;
    isForwarded?: boolean;
    forwardingScore?: number;
    isFrequentlyForwarded?: boolean;
    replyToMessageId?: string;
    contextInfo?: {
      quotedMessage?: any;
      mentionedJid?: string[];
    };
    // For WhatsApp Interactive/Flow responses
    flowResponse?: any;
  };
  attachments?: WhatsAppAttachment[];
  location?: LocationData;
  contact?: ContactData;
}

export interface InstagramMessage extends BaseMessage {
  channel: 'instagram';
  instagramData: {
    messageId: string;
    igId: string;
    username?: string;
    isStoryReply?: boolean;
    storyId?: string;
    mediaType?: 'image' | 'video' | 'story';
    mediaUrl?: string;
  };
  attachments?: InstagramAttachment[];
}

export interface EmailMessage extends BaseMessage {
  channel: 'email';
  emailData: {
    messageId: string;
    from: string;
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    inReplyTo?: string;
    references?: string[];
    threadId?: string;
    headers?: Record<string, string>;
  };
  attachments?: EmailAttachment[];
}

export interface WebMessage extends BaseMessage {
  channel: 'web';
  webData: {
    sessionId: string;
    userAgent?: string;
    ipAddress?: string;
    referrer?: string;
    pageUrl?: string;
    widgetId?: string;
  };
  attachments?: WebAttachment[];
}

export interface VoiceMessage extends BaseMessage {
  channel: 'voice';
  voiceData: {
    callId: string;
    phoneNumber: string;
    duration?: number;
    recordingUrl?: string;
    transcription?: string;
    callDirection: 'inbound' | 'outbound';
    callStatus: 'answered' | 'missed' | 'busy' | 'failed';
  };
}

export interface VideoMessage extends BaseMessage {
  channel: 'video';
  videoData: {
    callId: string;
    meetingId?: string;
    duration?: number;
    recordingUrl?: string;
    participantCount?: number;
    screenShareUsed?: boolean;
  };
}

// Union type for all channel messages
export type ChannelMessage = 
  | WhatsAppMessage 
  | InstagramMessage 
  | EmailMessage 
  | WebMessage 
  | VoiceMessage 
  | VideoMessage;

// Attachment interfaces
export interface BaseAttachment {
  id: string;
  type: string;
  url: string;
  filename?: string;
  size?: number;
  mimeType?: string;
}

export interface WhatsAppAttachment extends BaseAttachment {
  whatsappMediaId?: string;
  caption?: string;
}

export interface InstagramAttachment extends BaseAttachment {
  instagramMediaId?: string;
  caption?: string;
  permalink?: string;
}

export interface EmailAttachment extends BaseAttachment {
  contentId?: string;
  isInline?: boolean;
  contentDisposition?: string;
}

export interface WebAttachment extends BaseAttachment {
  uploadSessionId?: string;
}

// Location and Contact data
export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string;
  name?: string;
  url?: string;
}

export interface ContactData {
  name: {
    formattedName: string;
    firstName?: string;
    lastName?: string;
    middleName?: string;
  };
  phones?: Array<{
    phone: string;
    type?: string;
    waId?: string;
  }>;
  emails?: Array<{
    email: string;
    type?: string;
  }>;
  urls?: Array<{
    url: string;
    type?: string;
  }>;
  addresses?: Array<{
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    type?: string;
  }>;
  org?: {
    company?: string;
    department?: string;
    title?: string;
  };
  birthday?: string;
}

// Conversation interfaces
export interface ConversationThread {
  id: string;
  tenantId: string;
  customerId: string;
  channelId: string;
  subject?: string;
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedAgentId?: string;
  teamId?: string;
  tags: string[];
  metadata: ConversationMetadata;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt?: Date;
  closedAt?: Date;
  closedBy?: string;
  closeReason?: string;
}

export interface ConversationMetadata {
  // Channel-specific data
  channelData?: Record<string, any>;
  
  // Customer context
  customerContext?: {
    isVip?: boolean;
    preferredLanguage?: string;
    timezone?: string;
    communicationPreference?: ChannelType[];
  };
  
  // Conversation metrics
  metrics?: {
    messageCount: number;
    agentResponseCount: number;
    customerResponseCount: number;
    averageResponseTime?: number;
    firstResponseTime?: number;
    resolutionTime?: number;
  };
  
  // AI insights
  aiInsights?: {
    sentimentScore?: number;
    sentimentTrend?: 'improving' | 'stable' | 'declining';
    urgencyLevel?: 'low' | 'medium' | 'high' | 'critical';
    intentClassification?: string;
    topicCategories?: string[];
    languageDetected?: string;
    translationRequired?: boolean;
    escalationRisk?: number;
    satisfactionPrediction?: number;
    churnRisk?: number;
  };
  
  // Business context
  businessContext?: {
    relatedTicketIds?: string[];
    relatedOrderIds?: string[];
    accountValue?: number;
    supportTier?: string;
    contractType?: string;
  };
  
  // Workflow context
  workflowContext?: {
    automationRulesApplied?: string[];
    workflowExecutions?: Array<{
      workflowId: string;
      executionId: string;
      status: string;
      executedAt: Date;
    }>;
  };
}

// Message processing interfaces
export interface ProcessedMessage extends BaseMessage {
  normalizedContent: string;
  threadingContext?: ThreadingContext;
  processingMetadata: ProcessingMetadata;
}

export interface ThreadingContext {
  parentMessageId?: string;
  threadId?: string;
  isThreadStart?: boolean;
  threadDepth?: number;
  relatedMessageIds?: string[];
}

export interface ProcessingMetadata {
  processedAt: Date;
  processingVersion: string;
  channelAdapter: string;
  normalizationApplied: string[];
  validationResults: ValidationResult[];
  enrichmentData?: Record<string, any>;
}

// Import shared types from types.ts
import type { ValidationResult, ChannelConfig, WorkflowConfig, ChannelType } from './types.js';

// Conversation context interfaces
export interface ConversationContext {
  conversationId: string;
  customerId: string;
  
  // Customer profile
  customerProfile: CustomerProfile;
  
  // Conversation history
  conversationHistory: ConversationHistoryData;
  
  // Channel context
  channelContext: ChannelContext;
  
  // Business context
  businessContext: BusinessContext;
  
  // AI context
  aiContext?: AIContext;
  
  // Agent context
  agentContext?: AgentContext;
}

export interface CustomerProfile {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  preferredLanguage?: string;
  timezone?: string;
  vipStatus?: boolean;
  tags: string[];
  customFields: Record<string, any>;
  
  // Communication preferences
  communicationPreferences: {
    preferredChannels: ChannelType[];
    doNotDisturb?: {
      enabled: boolean;
      schedule?: Array<{
        day: string;
        startTime: string;
        endTime: string;
      }>;
    };
    notificationSettings?: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
  
  // Behavioral data
  behaviorProfile: {
    averageResponseTime?: number;
    typicalActiveHours?: string[];
    communicationStyle?: 'formal' | 'casual' | 'technical';
    preferredAgentType?: string;
    escalationTendency?: 'low' | 'medium' | 'high';
  };
}

export interface ConversationHistoryData {
  totalConversations: number;
  totalMessages: number;
  averageResolutionTime?: number;
  satisfactionRatings: number[];
  averageSatisfactionRating?: number;
  lastInteractionDate?: Date;
  frequentIssues: string[];
  preferredAgents: string[];
  escalationHistory: Array<{
    date: Date;
    reason: string;
    outcome: string;
  }>;
}

export interface ChannelContext {
  channel: ChannelType;
  channelName: string;
  channelConfig: Record<string, any>;
  channelCapabilities: ChannelCapabilities;
  channelSpecificData: Record<string, any>;
}

export interface ChannelCapabilities {
  supportsAttachments: boolean;
  supportedAttachmentTypes: string[];
  supportsLocation: boolean;
  supportsContacts: boolean;
  supportsTemplates: boolean;
  supportsRichMedia: boolean;
  supportsVoice: boolean;
  supportsVideo: boolean;
  maxMessageLength?: number;
  maxAttachmentSize?: number;
  rateLimits?: {
    messagesPerMinute?: number;
    messagesPerHour?: number;
    messagesPerDay?: number;
  };
}

export interface BusinessContext {
  accountId?: string;
  accountValue?: number;
  contractType?: string;
  supportTier?: 'basic' | 'premium' | 'enterprise';
  
  // Related entities
  relatedTickets: Array<{
    id: string;
    subject: string;
    status: string;
    createdAt: Date;
  }>;
  
  relatedOrders: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: Date;
  }>;
  
  // Purchase history
  purchaseHistory: Array<{
    productId: string;
    productName: string;
    amount: number;
    purchaseDate: Date;
  }>;
  
  // Support history
  supportHistory: {
    totalTickets: number;
    resolvedTickets: number;
    averageResolutionTime?: number;
    commonIssueTypes: string[];
  };
}

export interface AIContext {
  // Current analysis
  currentAnalysis?: {
    intent: string;
    intentConfidence: number;
    sentiment: number;
    urgency: number;
    category: string;
    subcategory?: string;
    detectedLanguage: string;
    translationRequired: boolean;
  };
  
  // Predictions
  predictions?: {
    resolutionTime: number;
    satisfactionScore: number;
    escalationProbability: number;
    churnRisk: number;
  };
  
  // Suggestions
  suggestions?: {
    suggestedResponses: Array<{
      text: string;
      confidence: number;
      type: 'template' | 'generated' | 'knowledge_base';
    }>;
    
    suggestedActions: Array<{
      action: string;
      reason: string;
      confidence: number;
    }>;
    
    knowledgeBaseSuggestions: Array<{
      articleId: string;
      title: string;
      relevanceScore: number;
      snippet: string;
    }>;
    
    expertSuggestions: Array<{
      agentId: string;
      agentName: string;
      expertise: string[];
      availabilityScore: number;
    }>;
  };
  
  // Historical insights
  historicalInsights?: {
    similarConversations: Array<{
      conversationId: string;
      similarity: number;
      outcome: string;
      resolutionTime: number;
    }>;
    
    customerInsights: {
      communicationPattern: string;
      satisfactionTrend: string;
      issueFrequency: Record<string, number>;
    };
  };
}

export interface AgentContext {
  agentId?: string;
  agentName?: string;
  agentSkills: string[];
  agentLanguages: string[];
  currentWorkload: number;
  maxConcurrentConversations: number;
  averageResponseTime?: number;
  satisfactionRating?: number;
  
  // Assignment context
  assignmentContext?: {
    assignedAt: Date;
    assignedBy: string;
    assignmentReason: string;
    isAutoAssigned: boolean;
  };
  
  // Performance context
  performanceContext?: {
    conversationsHandled: number;
    averageResolutionTime: number;
    customerSatisfactionScore: number;
    escalationRate: number;
  };
}

// Event interfaces for conversation orchestration
// ConversationEvent is imported from events.ts

export type ConversationEventType = 
  | 'message_received'
  | 'message_sent'
  | 'conversation_started'
  | 'conversation_assigned'
  | 'conversation_transferred'
  | 'conversation_closed'
  | 'conversation_reopened'
  | 'agent_typing'
  | 'customer_typing'
  | 'agent_joined'
  | 'agent_left'
  | 'status_changed'
  | 'priority_changed'
  | 'tags_updated'
  | 'note_added'
  | 'escalation_triggered'
  | 'ai_analysis_completed'
  | 'workflow_executed';

// Channel adapter interfaces
export interface ChannelAdapter {
  channelType: ChannelType;
  
  // Message handling
  receiveMessage(webhook: WebhookPayload): Promise<ChannelMessage>;
  sendMessage(conversationId: string, message: OutgoingMessage): Promise<MessageDeliveryResult>;
  
  // Media handling
  downloadMedia(mediaId: string): Promise<MediaFile>;
  uploadMedia(file: MediaFile): Promise<string>;
  
  // Channel capabilities
  getSupportedFeatures(): ChannelCapabilities;
  validateMessage(message: OutgoingMessage): ValidationResult[];
  
  // Channel-specific operations
  markAsRead?(conversationId: string, messageId: string): Promise<void>;
  sendTypingIndicator?(conversationId: string): Promise<void>;
  sendPresenceUpdate?(status: 'online' | 'offline' | 'away'): Promise<void>;
}

export interface WebhookPayload {
  source: ChannelType;
  data: any;
  signature?: string;
  timestamp: Date;
}

export interface OutgoingMessage {
  content: string;
  messageType: MessageType;
  recipientId: string;
  attachments?: BaseAttachment[];
  templateId?: string;
  templateParams?: Record<string, string>;
  replyToMessageId?: string;
  metadata?: Record<string, any>;
}

export interface MessageDeliveryResult {
  messageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  error?: string;
  channelMessageId?: string;
}

export interface MediaFile {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
  url?: string;
}

// DTOs for API endpoints
export interface CreateConversationDto {
  customerId: string;
  channelId: string;
  subject?: string;
  priority?: ConversationPriority;
  assignedAgentId?: string;
  teamId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateConversationDto {
  subject?: string;
  status?: ConversationStatus;
  priority?: ConversationPriority;
  assignedAgentId?: string;
  teamId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface SendMessageDto {
  content: string;
  messageType: MessageType;
  attachments?: BaseAttachment[];
  templateId?: string;
  templateParams?: Record<string, string>;
  replyToMessageId?: string;
  metadata?: Record<string, any>;
}

export interface IngestMessageDto {
  channelMessage: ChannelMessage;
  tenantId: string;
}

export interface MergeConversationsDto {
  conversationIds: string[];
  primaryConversationId?: string;
  mergeReason?: string;
}

export interface AssignConversationDto {
  agentId?: string;
  teamId?: string;
  assignmentReason?: string;
  priority?: ConversationPriority;
}

export interface ConversationFilterDto {
  status?: ConversationStatus[];
  priority?: ConversationPriority[];
  channelType?: ChannelType[];
  assignedAgentId?: string;
  teamId?: string;
  tags?: string[];
  customerId?: string;
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ConversationListResponseDto {
  conversations: ConversationThread[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  filters: ConversationFilterDto;
}

export interface ConversationDetailResponseDto {
  conversation: ConversationThread;
  messages: ProcessedMessage[];
  context: ConversationContext;
  participants: Array<{
    id: string;
    name: string;
    type: 'customer' | 'agent';
    avatar?: string;
  }>;
}

// ApiResponse is imported from types.ts

export interface PaginatedResponse<T = any> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// Configuration interfaces
export interface ConversationOrchestratorConfig {
  channels: ChannelConfig[];
  aiConfig: AIConfig;
  workflowConfig: WorkflowConfig;
  notificationConfig: NotificationConfig;
  performanceConfig: PerformanceConfig;
}

// ChannelConfig is imported from types.ts

export interface AIConfig {
  enabled: boolean;
  providers: Array<{
    name: string;
    type: 'openai' | 'anthropic' | 'azure' | 'custom';
    config: Record<string, any>;
  }>;
  features: {
    intentClassification: boolean;
    sentimentAnalysis: boolean;
    languageDetection: boolean;
    translation: boolean;
    responseGeneration: boolean;
    knowledgeBaseSuggestions: boolean;
  };
}

// WorkflowConfig is imported from types.ts

export interface NotificationConfig {
  channels: Array<{
    type: 'email' | 'sms' | 'push' | 'webhook';
    config: Record<string, any>;
  }>;
  rules: Array<{
    event: ConversationEventType;
    recipients: string[];
    template: string;
    delay?: number;
  }>;
}

export interface PerformanceConfig {
  caching: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  batching: {
    enabled: boolean;
    batchSize: number;
    flushInterval: number;
  };
  monitoring: {
    metricsEnabled: boolean;
    tracingEnabled: boolean;
    loggingLevel: 'debug' | 'info' | 'warn' | 'error';
  };
}