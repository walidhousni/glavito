// Shared TypeScript interfaces for conversations feature

export interface Customer {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  avatar?: string;
}

export interface Channel {
  id: string;
  name: string;
  type: 'whatsapp' | 'instagram' | 'email' | 'web' | 'voice' | 'video';
}

export interface Message {
  id: string;
  content: string;
  senderType: 'customer' | 'agent' | 'system';
  messageType: 'text' | 'image' | 'file' | 'template' | 'voice' | 'video' | 'audio' | 'internal_note';
  createdAt: string;
  attachments?: Attachment[];
  templateId?: string;
  templateParams?: Record<string, string>;
  reactions?: Array<{
    emoji: string;
    userId: string;
    timestamp?: string;
  }>;
  audioUrl?: string;
  audioDuration?: number;
  isInternalNote?: boolean;
}

export interface Attachment {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
}

export interface AIInsights {
  sentiment?: 'positive' | 'neutral' | 'negative';
  urgency?: 'low' | 'medium' | 'high';
  estimatedResolutionTime?: string;
  suggestedActions?: string[];
  // Legacy fields for backward compatibility
  sentimentScore?: number;
  urgencyLevel?: 'low' | 'medium' | 'high';
}

export interface Agent {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface Conversation {
  id: string;
  customerId?: string; // Optional for backward compatibility
  customer: Customer;
  channel: Channel;
  subject?: string;
  status: 'active' | 'waiting' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedAgentId?: string;
  assignedAgent?: Agent;
  ticketId?: string;
  tags: string[];
  lastMessage: Message | null;
  messages?: Message[];
  messageCount?: number; // Optional, can be derived from messages.length
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
  aiInsights: AIInsights;
  metadata?: Record<string, any>;
}

export interface ConversationFilters {
  status?: string;
  priority?: string;
  channel?: string;
  assignedTo?: string;
  teamId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ConversationSummary {
  total: number;
  active: number;
  waiting: number;
  closed: number;
  unassigned: number;
}

export interface UnifiedInboxQuery extends ConversationFilters {
  page?: number;
  limit?: number;
}

export interface UnifiedInboxResponse {
  conversations: Conversation[];
  pagination: PaginationInfo;
  filters: ConversationFilters;
  summary: ConversationSummary;
}

export interface SendMessagePayload {
  content: string;
  messageType: 'text' | 'image' | 'file' | 'template' | 'voice' | 'video';
  templateId?: string;
  templateParams?: Record<string, string>;
  attachments?: File[];
}

export interface SendMessageResponse {
  messageId: string;
  conversationId: string;
  timestamp: string;
  message?: Message;
}

export interface CreateConversationPayload {
  customerId: string;
  channelId: string;
  subject?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedAgentId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface UpdateConversationPayload {
  status?: 'active' | 'waiting' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  assignedAgentId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Error types
export interface ConversationError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Socket event types
export interface SocketEvents {
  'conversation:new': Conversation;
  'conversation:updated': Conversation;
  'message:new': { conversationId: string; message: Message };
  'message:updated': { conversationId: string; message: Message };
  'typing:start': { conversationId: string; userId: string; userType: 'customer' | 'agent' };
  'typing:stop': { conversationId: string; userId: string; userType: 'customer' | 'agent' };
}

// UI State types
export interface ConversationUIState {
  selectedConversationId?: string;
  loading: boolean;
  error?: string;
  sendingMessage: boolean;
  searchQuery: string;
  filters: ConversationFilters;
}

// Knowledge Base types for AI suggestions
export interface KnowledgeBaseSuggestion {
  articles: Array<{
    id: string;
    title: string;
    snippet: string;
    relevanceScore?: number;
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    relevanceScore?: number;
  }>;
}