import api from './config';

export interface UnifiedInboxQuery {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  channel?: string;
  assignedTo?: string;
  teamId?: string;
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

  async escalate(conversationId: string, payload: { reason?: string; priority?: string; assignAgentId?: string; tags?: string[] } = {}) {
    try {
      const { data } = await api.post(`/v1/conversations/advanced/${conversationId}/escalate`, payload)
      const wrapped = data as any
      return (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped
    } catch {
      const { data } = await api.post(`/conversations/${conversationId}/escalate`, payload)
      const wrapped = data as any
      return (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped
    }
  }

  async getUnifiedInbox(params: UnifiedInboxQuery = {}) {
    try {
      const { data } = await api.get(`/v1/conversations/advanced/unified-inbox`, { params });
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to fetch unified inbox:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load conversations',
        data: null
      };
    }
  }

  async assign(conversationId: string, payload: { agentId?: string; teamId?: string; reason?: string }) {
    try {
      const { data } = await api.post(`/v1/conversations/advanced/${conversationId}/assign`, payload);
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch {
      const { data } = await api.post(`${this.basePath}/${conversationId}/assign`, payload);
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    }
  }

  async listTeams(includeMembers = false) {
    try {
      const { data } = await api.get('/teams', { params: { includeMembers } });
      const wrapped = data as any
      return (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped
    } catch (e) {
      return [] as any[]
    }
  }

  async getTeamMembers(teamId: string) {
    try {
      const { data } = await api.get(`/teams/${teamId}/members`)
      const wrapped = data as any
      return (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped
    } catch {
      return []
    }
  }

  async sendMessage(
    conversationId: string,
    payload: {
      content: string;
      messageType: string;
      templateId?: string;
      templateParams?: Record<string, string>;
      attachments?: any[];
      metadata?: Record<string, any>;
      replyToMessageId?: string;
      isInternalNote?: boolean;
    }
  ) {
    // Prefer advanced endpoint if present; fallback to generic messages
    try {
      const { data } = await api.post(`/v1/conversations/advanced/${conversationId}/messages`, payload);
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch {
      const { data } = await api.post(`/messages`, { conversationId, ...payload });
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    }
  }

  async getRealtimeAnalytics(timeRange: '1h' | '24h' | '7d' = '24h') {
    const { data } = await api.get('/v1/conversations/advanced/analytics/real-time', { params: { timeRange } })
    return (data as any)?.data ?? data
  }

  async markRead(conversationId: string, read = true) {
    const { data } = await api.post(`/v1/conversations/advanced/${conversationId}/read`, { read })
    return (data as any)?.data ?? data
  }

  async markBulk(ids: string[], read = true) {
    const { data } = await api.post(`/v1/conversations/advanced/mark-bulk`, { ids, read })
    return (data as any)?.data ?? data
  }

  async updateStatus(conversationId: string, status: 'active' | 'waiting' | 'closed' | 'archived', reason?: string) {
    const { data } = await api.post(`/v1/conversations/advanced/${conversationId}/status`, { status, reason })
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

  async getConversation(conversationId: string) {
    try {
      const { data } = await api.get(`/v1/conversations/advanced/${conversationId}`);
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to fetch conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load conversation',
        data: null
      };
    }
  }

  async updateConversation(conversationId: string, payload: { status?: string; priority?: string; tags?: string[] }) {
    try {
      const { data } = await api.patch(`/v1/conversations/advanced/${conversationId}`, payload);
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to update conversation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update conversation',
        data: null
      };
    }
  }

  async addReaction(messageId: string, emoji: string) {
    try {
      const { data } = await api.post(`/v1/messages/${messageId}/reactions`, { emoji });
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to add reaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add reaction',
        data: null
      };
    }
  }

  async removeReaction(messageId: string, emoji: string) {
    try {
      const { data } = await api.delete(`/v1/messages/${messageId}/reactions`, { data: { emoji } });
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to remove reaction:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove reaction',
        data: null
      };
    }
  }

  async createInternalNote(conversationId: string, payload: { content: string; mentions?: string[]; isPinned?: boolean }) {
    try {
      const { data } = await api.post(`/v1/conversations/${conversationId}/notes`, payload);
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to create internal note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create internal note',
        data: null
      };
    }
  }

  async getInternalNotes(conversationId: string, pinnedOnly = false) {
    try {
      const { data } = await api.get(`/v1/conversations/${conversationId}/notes`, { params: { pinnedOnly } });
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to fetch internal notes:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch internal notes',
        data: null
      };
    }
  }

  async initiateCall(conversationId: string, payload: { recipientId: string; callType: 'audio' | 'video' }) {
    try {
      const { data } = await api.post(`/v1/conversations/${conversationId}/calls`, payload);
      const wrapped = data as any;
      const inner = (wrapped && typeof wrapped === 'object') ? (wrapped.data ?? wrapped) : wrapped;
      if (inner && typeof inner.success === 'boolean' && 'data' in inner) {
        return inner;
      }
      return { success: true, data: inner } as { success: boolean; data: any };
    } catch (error) {
      console.error('Failed to initiate call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to initiate call',
        data: null
      };
    }
  }


}

export const conversationsApi = new ConversationsApiClient('/conversations');


