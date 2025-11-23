import api from './config';

export interface IntegrationStatusItem {
  id: string;
  tenantId: string;
  integrationType: 'whatsapp' | 'instagram' | 'email' | 'stripe' | 'n8n' | 'ai';
  status: 'pending' | 'connected' | 'error' | 'disabled';
  configuration: Record<string, unknown>;
  lastSyncAt?: string;
  errorMessage?: string;
  healthCheckData?: Record<string, unknown>;
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

export interface IntegrationCatalogItem {
  provider: string;
  name: string;
  category: 'communication' | 'ecommerce' | 'shipping' | 'marketing' | 'productivity' | 'crm' | 'automation';
  description: string;
  badges: string[];
  capabilities: string[];
  icon?: string;
}

export interface IntegrationCatalogResponse {
  metrics: { prebuilt: number; avgSetupMinutes: number; uptime: number; support: string };
  items: IntegrationCatalogItem[];
  categories: Array<{ key: IntegrationCatalogItem['category']; label: string }>;
}

export interface IntegrationFieldMapping {
  id: string;
  tenantId: string;
  provider: string;
  sourceEntity: string;
  targetEntity?: string | null;
  mappings: Record<string, unknown>;
  direction: 'inbound' | 'outbound' | 'both';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertMappingPayload {
  id?: string;
  sourceEntity: string;
  targetEntity?: string | null;
  mappings: Record<string, unknown>;
  direction?: 'inbound' | 'outbound' | 'both';
  isActive?: boolean;
}

export const integrationsApi = {
  async catalog(): Promise<IntegrationCatalogResponse> {
    const { data } = await api.get('/integrations/catalog');
    const payload = (data as unknown) as { data?: unknown } | IntegrationCatalogResponse;
    return ((payload as { data?: unknown })?.data ?? payload) as IntegrationCatalogResponse;
  },
  async listStatuses(): Promise<IntegrationStatusItem[]> {
    const { data } = await api.get('/integrations/status');
    const payload = data as unknown;
    return Array.isArray(payload) ? (payload as IntegrationStatusItem[]) : (Array.isArray((payload as { data?: unknown[] })?.data) ? ((payload as { data: unknown[] }).data as IntegrationStatusItem[]) : []);
  },
  async upsertStatus(payload: { type: IntegrationStatusItem['integrationType']; status?: IntegrationStatusItem['status']; configuration?: Record<string, unknown>; }): Promise<IntegrationStatusItem> {
    const { data } = await api.post('/integrations/status', payload);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as IntegrationStatusItem;
  },
  async listConnectors(): Promise<Array<{ id: string; tenantId: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, unknown> }>> {
    const { data } = await api.get('/integrations/connectors');
    const payload = data as unknown;
    return Array.isArray(payload) ? (payload as Array<{ id: string; tenantId: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, unknown> }>) : (Array.isArray((payload as { data?: unknown[] })?.data) ? ((payload as { data: unknown[] }).data as Array<{ id: string; tenantId: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, unknown> }>) : []);
  },
  async upsertConnector(payload: { provider: string; status?: string; config?: Record<string, unknown> }) {
    const { data } = await api.post('/integrations/connectors', payload);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
  },
  async disableConnector(provider: string) {
    const { data } = await api.patch(`/integrations/connectors/${provider}/disable`);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
  },
  async refreshConnector(provider: string) {
    const { data } = await api.patch(`/integrations/connectors/${provider}/refresh`);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
  },
  async manualSync(provider: string, entity: string) {
    const { data } = await api.post(`/integrations/connectors/${provider}/sync`, { entity });
    return (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
  },

  // Channel setups
  async setupWhatsApp(config: Record<string, unknown>) {
    const { data } = await api.post('/integrations/setup/whatsapp', config);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { message: string };
  },
  async setupInstagram(config: Record<string, unknown>) {
    const { data } = await api.post('/integrations/setup/instagram', config);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { message: string };
  },
  async setupEmail(config: Record<string, unknown>) {
    const { data } = await api.post('/integrations/setup/email', config);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { message: string };
  },


  // Connector docs
  async getConnectorDocs(provider: string): Promise<IntegrationDocs> {
    const { data } = await api.get(`/integrations/docs/${provider}`);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as IntegrationDocs;
  },
  async setConnectorRules(provider: string, rules: Record<string, unknown>): Promise<{ id: string; provider: string; status: string; config: Record<string, unknown> }> {
    const { data } = await api.post(`/integrations/connectors/${provider}/rules`, rules);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { id: string; provider: string; status: string; config: Record<string, unknown> };
  },

  // Field mappings CRUD
  async listMappings(provider: string): Promise<IntegrationFieldMapping[]> {
    const { data } = await api.get(`/integrations/connectors/${provider}/mappings`);
    const payload = (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
    return Array.isArray(payload) ? (payload as IntegrationFieldMapping[]) : [];
  },

  async upsertMapping(provider: string, body: UpsertMappingPayload): Promise<IntegrationFieldMapping> {
    const { data } = await api.post(`/integrations/connectors/${provider}/mappings`, body);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as IntegrationFieldMapping;
  },

  async deleteMapping(provider: string, id: string): Promise<{ ok: boolean }> {
    const { data } = await api.patch(`/integrations/connectors/${provider}/mappings/${id}/delete`);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { ok: boolean };
  },

  // Additional helper methods
  async getSyncHistory(provider: string, limit?: number, offset?: number): Promise<any[]> {
    const { data } = await api.get(`/integrations/sync-history/${provider}`, {
      params: { limit, offset },
    });
    const payload = (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
    return Array.isArray(payload) ? payload : [];
  },

  async testConnection(provider: string): Promise<{ success: boolean; status: string; latency?: number; error?: string; timestamp?: Date }> {
    const { data } = await api.post(`/integrations/connectors/${provider}/test`);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { success: boolean; status: string; latency?: number; error?: string; timestamp?: Date };
  },

  // Health & Monitoring
  async getHealthStatus(): Promise<Array<{
    id: string;
    integrationId: string;
    tenantId: string;
    status: 'healthy' | 'degraded' | 'down' | 'maintenance';
    lastCheck: Date;
    lastError?: string;
    lastErrorAt?: Date;
    errorCount: number;
    successRate: number;
    avgSyncTime?: number;
    integration?: {
      id: string;
      provider: string;
      status: string;
    };
  }>> {
    const { data } = await api.get('/integrations/health');
    const payload = (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
    return Array.isArray(payload) ? payload : [];
  },

  async getIntegrationHealth(integrationId: string): Promise<{
    status: 'healthy' | 'degraded' | 'down' | 'maintenance';
    latency?: number;
    error?: string;
    timestamp: Date;
  }> {
    const { data } = await api.get(`/integrations/health/${integrationId}`);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as {
      status: 'healthy' | 'degraded' | 'down' | 'maintenance';
      latency?: number;
      error?: string;
      timestamp: Date;
    };
  },

  async getIntegrationLogs(params?: {
    integrationId?: string;
    action?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    id: string;
    integrationId: string;
    tenantId: string;
    action: string;
    status: 'success' | 'error' | 'warning' | 'info';
    direction?: 'inbound' | 'outbound';
    duration?: number;
    recordsProcessed?: number;
    recordsFailed?: number;
    errorMessage?: string;
    userId?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
  }>> {
    const { data } = await api.get('/integrations/logs', { params });
    const payload = (((data as unknown) as { data?: unknown })?.data ?? data) as unknown;
    return Array.isArray(payload) ? payload : [];
  },

  // OAuth authorize URL (updated to return object with url and state)
  async getAuthorizeUrl(provider: string, redirectUri: string, state?: string): Promise<{ url: string; state: string }> {
    const { data } = await api.get(`/integrations/oauth/authorize/${provider}`, {
      params: { redirectUri, state },
    });
    const payload = data as unknown;
    if (typeof payload === 'object' && payload !== null && 'url' in payload) {
      return payload as { url: string; state: string };
    }
    return { url: (payload as string) || '', state: state || '' };
  },

  // OAuth callback (updated to handle error responses)
  async oauthCallback(provider: string, payload: { code?: string; state?: string; redirectUri: string; error?: string; error_description?: string }): Promise<{ ok: boolean; provider?: string; message?: string; error?: string; error_description?: string }> {
    const { data } = await api.post(`/integrations/oauth/callback/${provider}`, payload);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { ok: boolean; provider?: string; message?: string; error?: string; error_description?: string };
  },

  // Bidirectional Sync - Inbound Webhooks
  async handleInboundWebhook(provider: string, payload: any, headers?: Record<string, string>, tenantId?: string): Promise<{ success: boolean; processed: number; errors: number; message: string }> {
    const { data } = await api.post(`/integrations/webhooks/inbound/${provider}`, payload, {
      headers: headers || {},
      params: tenantId ? { tenantId } : {},
    });
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { success: boolean; processed: number; errors: number; message: string };
  },

  // Bidirectional Sync - Outbound Sync
  async syncOutbound(provider: string, entity: string, entityId: string, action: 'create' | 'update' | 'delete'): Promise<{ success: boolean; crmId?: string; action: string; entity: string; entityId: string }> {
    const { data } = await api.post(`/integrations/sync/outbound/${provider}`, { entity, entityId, action });
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { success: boolean; crmId?: string; action: string; entity: string; entityId: string };
  },

  // Sync Queue Management
  async getSyncQueue(): Promise<{ failed: number; items: Array<{ id: string; provider: string; entity: string; direction: string; errorMessage?: string; completedAt: Date }> }> {
    const { data } = await api.get('/integrations/sync/queue');
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { failed: number; items: Array<{ id: string; provider: string; entity: string; direction: string; errorMessage?: string; completedAt: Date }> };
  },

  async retrySyncItem(logId: string): Promise<{ success: boolean; result?: any }> {
    const { data } = await api.post(`/integrations/sync/queue/${logId}/retry`);
    return (((data as unknown) as { data?: unknown })?.data ?? data) as { success: boolean; result?: any };
  },
};


