export * from './lib/types.js';
export * from './lib/portal-types.js';
export * from './lib/data-import-types.js';
export * from './lib/analytics-types.js';
export * from './lib/template-types.js';
export * from './lib/api-types.js';
export * from './lib/events.js';
export * from './lib/segment-types.js';
export * from './lib/conversation-types.js';
export * from './lib/white-label-types.js';
export * from './lib/feature-flags.js';
export * from './lib/onboarding-types.js';
export type { ValidationResult } from './lib/types.js';
export { ChannelType } from './lib/types.js';
export type {
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  IngestMessageDto,
  MergeConversationsDto,
  AssignConversationDto,
  ConversationFilterDto,
  ConversationListResponseDto,
  ConversationDetailResponseDto,
  PaginatedResponse
} from './lib/conversation-types.js';
export type {
  ChannelAdapter,
  ChannelMessage,
  OutgoingMessage,
  MessageDeliveryResult,
  WebhookPayload,
  MediaFile,
  ChannelCapabilities,
  EmailMessage,
  EmailAttachment,
  InstagramMessage,
  WhatsAppMessage,
  WhatsAppAttachment,
  LocationData,
  ContactData,
  ProcessedMessage,
  ConversationThread,
  ConversationContext
} from './lib/conversation-types.js';
export type {
  DomainEvent,
  EventBus,
  EventSubscription,
  EventHandler,
  KafkaTopicConfig,
  KafkaStreamConfig,
  EventStoreRecord,
  EventSnapshot,
  StreamProcessor,
  MessageReceivedEvent,
  MessageSentEvent,
  ConversationStartedEvent,
  ConversationAssignedEvent,
  MessageAnalyzedEvent,
  CustomerSentimentAnalyzedEvent,
  ConversationEvent,
  TicketCreatedEvent,
  TicketResolvedEvent,
  TicketStatusChangedEvent,
  MetricCalculatedEvent
} from './lib/events.js';
export type { ApiResponse } from './lib/types.js';
export type { InstagramAttachment } from './lib/conversation-types.js';