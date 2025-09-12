import api from './config';

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  secret?: string | null;
  events: string[];
  headers: Record<string, string>;
  isActive: boolean;
  retryPolicy?: { maxRetries?: number; retryDelay?: number; backoffMultiplier?: number };
  createdAt: string;
  updatedAt: string;
}

export interface CreateWebhookEndpointDto {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  headers?: Record<string, string>;
  retryPolicy?: { maxRetries?: number; retryDelay?: number; backoffMultiplier?: number };
}

export const webhooksApi = {
  async listEndpoints(): Promise<WebhookEndpoint[]> {
    const { data } = await api.get('/webhooks/endpoints');
    const payload = (data && typeof data === 'object' && 'data' in data) ? (data as any).data : data;
    return Array.isArray(payload) ? (payload as WebhookEndpoint[]) : [];
  },

  async createEndpoint(payload: CreateWebhookEndpointDto): Promise<WebhookEndpoint> {
    const { data } = await api.post('/webhooks/endpoints', payload);
    const body = (data && typeof data === 'object' && 'data' in data) ? (data as any).data : data;
    return body as WebhookEndpoint;
  },

  async deleteEndpoint(id: string): Promise<{ success: boolean }> {
    const { data } = await api.delete(`/webhooks/endpoints/${id}`);
    return data as { success: boolean };
  },

  async sendTestEvent(eventType: string, tenantId: string, extraData: Record<string, unknown> = {}) {
    const payload = {
      eventType,
      tenantId,
      timestamp: new Date().toISOString(),
      data: {
        test: true,
        source: 'admin-ui',
        ...extraData,
      },
    };
    const { data } = await api.post('/webhooks/outgoing', payload);
    return data;
  },

  async listDeliveries(endpointId: string, limit = 50): Promise<Array<{ id: string; status: string; eventType: string; responseStatus?: number | null; timestamp: string; completedAt?: string | null; errorMessage?: string | null }>> {
    const { data } = await api.get(`/webhooks/endpoints/${endpointId}/deliveries`, { params: { limit } });
    const payload = (data && typeof data === 'object' && 'data' in data) ? (data as any).data : data;
    return Array.isArray(payload) ? payload : [];
  }
};


