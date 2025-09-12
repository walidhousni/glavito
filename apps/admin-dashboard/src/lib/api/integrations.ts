import api from './config';

export interface IntegrationStatusItem {
  id: string;
  tenantId: string;
  integrationType: 'whatsapp' | 'instagram' | 'email' | 'stripe' | 'n8n' | 'ai';
  status: 'pending' | 'connected' | 'error' | 'disabled';
  configuration: Record<string, any>;
  lastSyncAt?: string;
  errorMessage?: string;
  healthCheckData?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationDocs {
  name: string;
  description: string;
  setup: string[];
  env: string[];
  scopes?: string[];
}

export interface IntegrationFieldMapping {
  id: string;
  tenantId: string;
  provider: string;
  sourceEntity: string;
  targetEntity?: string | null;
  mappings: Record<string, any>;
  direction: 'inbound' | 'outbound' | 'both';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMappingPayload {
  id?: string;
  sourceEntity: string;
  targetEntity?: string | null;
  mappings: Record<string, any>;
  direction?: 'inbound' | 'outbound' | 'both';
  isActive?: boolean;
}

export const integrationsApi = {
  async listStatuses(): Promise<IntegrationStatusItem[]> {
    const { data } = await api.get('/integrations/status');
    const payload = (data as any);
    return Array.isArray(payload) ? payload as IntegrationStatusItem[] : (Array.isArray(payload?.data) ? payload.data as IntegrationStatusItem[] : []);
  },
  async upsertStatus(payload: { type: IntegrationStatusItem['integrationType']; status?: IntegrationStatusItem['status']; configuration?: Record<string, any>; }): Promise<IntegrationStatusItem> {
    const { data } = await api.post('/integrations/status', payload);
    return ((data as any)?.data ?? data) as IntegrationStatusItem;
  },
  async listConnectors(): Promise<Array<{ id: string; tenantId: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, any> }>> {
    const { data } = await api.get('/integrations/connectors');
    const payload = (data as any);
    return Array.isArray(payload) ? payload as any[] : (Array.isArray(payload?.data) ? payload.data as any[] : []);
  },
  async upsertConnector(payload: { provider: string; status?: string; config?: Record<string, any> }) {
    const { data } = await api.post('/integrations/connectors', payload);
    return ((data as any)?.data ?? data) as any;
  },
  async disableConnector(provider: string) {
    const { data } = await api.patch(`/integrations/connectors/${provider}/disable`);
    return ((data as any)?.data ?? data) as any;
  },
  async manualSync(provider: string, entity: string) {
    const { data } = await api.post(`/integrations/connectors/${provider}/sync`, { entity });
    return ((data as any)?.data ?? data) as any;
  },

  // OAuth authorize URL
  async getAuthorizeUrl(provider: string, redirectUri: string, state?: string): Promise<string> {
    const { data } = await api.get(`/integrations/oauth/authorize/${provider}`, {
      params: { redirectUri, state },
    });
    return (typeof data === 'string') ? data : ((data as any)?.data ?? '');
  },

  // OAuth callback
  async oauthCallback(provider: string, payload: { code?: string; state?: string; redirectUri: string }): Promise<{ ok: boolean }> {
    const { data } = await api.post(`/integrations/oauth/callback/${provider}`, payload);
    return ((data as any)?.data ?? data) as { ok: boolean };
  },

  // Connector docs
  async getConnectorDocs(provider: string): Promise<IntegrationDocs> {
    const { data } = await api.get(`/integrations/docs/${provider}`);
    return ((data as any)?.data ?? data) as IntegrationDocs;
  },

  // Field mappings CRUD
  async listMappings(provider: string): Promise<IntegrationFieldMapping[]> {
    const { data } = await api.get(`/integrations/connectors/${provider}/mappings`);
    const payload = (data as any)?.data ?? data;
    return Array.isArray(payload) ? payload as IntegrationFieldMapping[] : [];
  },

  async upsertMapping(provider: string, body: UpsertMappingPayload): Promise<IntegrationFieldMapping> {
    const { data } = await api.post(`/integrations/connectors/${provider}/mappings`, body);
    return ((data as any)?.data ?? data) as IntegrationFieldMapping;
  },

  async deleteMapping(provider: string, id: string): Promise<{ ok: boolean }> {
    const { data } = await api.patch(`/integrations/connectors/${provider}/mappings/${id}/delete`);
    return ((data as any)?.data ?? data) as { ok: boolean };
  },
};


