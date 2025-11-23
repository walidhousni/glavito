import { createApiClient } from './api';

export type InboxItem = {
  id: string;
  subject: string;
  status: string;
  priority?: string;
  customer: { id: string; name?: string; email?: string | null; phone?: string | null };
  channel: { id: string; type: string; name?: string };
  lastMessage?: { id: string; content: string; senderType: string; messageType: string; createdAt: string; preview?: string } | null;
  messageCount: number;
  unreadCount: number;
  updatedAt: string;
  lastMessageAt?: string;
  aiInsights?: { sentiment: string; urgencyLevel: string; estimatedResolutionTime: number };
  ticketId?: string | null;
};

export async function fetchUnifiedInbox(params: {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  channel?: string;
  assignedTo?: string;
  search?: string;
} = {}) {
  const api = createApiClient();
  const res = await api.get('/v1/conversations/advanced/unified-inbox', { params });
  return (res.data?.data || { conversations: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, summary: {} }) as {
    conversations: InboxItem[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    summary: any;
  };
}

export async function fetchConversationDetails(conversationId: string): Promise<{
  conversation: any;
  messages: Array<{ id: string; content: string; createdAt: string; senderType: 'agent' | 'customer' | 'system' | 'bot'; messageType: string; attachments?: Array<{ id: string; type: string; url: string; filename?: string; mimeType?: string; size?: number }> }>;
  context?: any;
}> {
  const api = createApiClient();
  const res = await api.get(`/v1/conversations/advanced/${conversationId}/context`);
  return (res.data?.data || {}) as any;
}

export async function sendConversationMessage(conversationId: string, payload: { content: string; messageType?: 'text' | 'image' | 'video' | 'audio' | 'document' }): Promise<any> {
  const api = createApiClient();
  const res = await api.post(`/v1/conversations/advanced/${conversationId}/messages`, {
    content: payload.content,
    messageType: payload.messageType || 'text',
  });
  return res.data?.data || {};
}


