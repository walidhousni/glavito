import api from './config';

export interface UnifiedInboxQuery {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  channel?: string;
  assignedTo?: string;
  search?: string;
}

export class ConversationsApiClient {
  constructor(private basePath = '/conversations') {}

  async list(params: {
    tenantId?: string;
    ticketId?: string;
    customerId?: string;
    status?: string;
    channelType?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const { data } = await api.get(this.basePath, { params });
    return data;
  }

  async get(id: string) {
    const { data } = await api.get(`${this.basePath}/${id}`);
    return data;
  }

  async getContextAdvanced(id: string) {
    const { data } = await api.get(`/v1/conversations/advanced/${id}/context`)
    return (data as any)?.data ?? data
  }

  async create(payload: { customerId: string; channelId: string; subject?: string; priority?: 'low'|'medium'|'high'|'critical'; assignedAgentId?: string; tags?: string[]; metadata?: Record<string, any> }) {
    try {
      const { data } = await api.post(`/v1/conversations/advanced/create`, payload);
      return (data as any)?.data ?? data;
    } catch {
      const { data } = await api.post(`/v1/conversations/advanced/create`, payload);
      return (data as any)?.data ?? data;
    }
  }

  async getMessages(conversationId: string) {
    try {
      const ctx = await this.getContextAdvanced(conversationId)
      if (ctx && Array.isArray((ctx as any).messages)) return (ctx as any).messages
    } catch (e) {
      // ignore and fallback to basic messages endpoint
    }
    const { data } = await api.get(`${this.basePath}/${conversationId}/messages`);
    return data;
  }

  async getUnifiedInbox(params: UnifiedInboxQuery = {}) {
    try {
      const { data } = await api.get(`/v1/conversations/advanced/unified-inbox`, { params });
      return data;
    } catch (error) {
      console.error('Failed to fetch unified inbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        data: null
      };
    }
  }

  async sendMessage(conversationId: string, payload: { content: string; messageType: string; templateId?: string; templateParams?: Record<string, string>; attachments?: any[] }) {
    // Prefer advanced endpoint if present; fallback to generic messages
    try {
      const { data } = await api.post(`/v1/conversations/advanced/${conversationId}/messages`, payload);
      return data;
    } catch {
      const { data } = await api.post(`/messages`, { conversationId, ...payload });
      return data;
    }
  }

  async getRealtimeAnalytics(timeRange: '1h' | '24h' | '7d' = '24h') {
    const { data } = await api.get('/v1/conversations/advanced/analytics/real-time', { params: { timeRange } })
    return (data as any)?.data ?? data
  }

  async uploadAttachment(file: File, folder = 'conversation') {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post(`/files/upload`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      params: { folder },
    });
    return data as { url: string; key: string; size: number; mimeType: string };
  }
}

export const conversationsApi = new ConversationsApiClient('/conversations');


