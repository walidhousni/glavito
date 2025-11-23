import { create } from 'zustand';
import { integrationsApi, IntegrationStatusItem, IntegrationDocs, IntegrationFieldMapping, UpsertMappingPayload, IntegrationCatalogResponse } from '../api/integrations';

interface HealthStatus {
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
}

interface IntegrationLog {
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
}

interface SyncProgress {
  provider: string;
  entity: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  totalRecords?: number;
  processedRecords?: number;
  error?: string;
  startedAt: Date;
  estimatedTimeRemaining?: number;
}

interface OAuthState {
  provider: string;
  state: string;
  redirectUri: string;
  status: 'idle' | 'authorizing' | 'connecting' | 'success' | 'error';
  error?: string;
}

interface IntegrationsState {
  statuses: IntegrationStatusItem[];
  isLoading: boolean;
  error: string | null;
  fetchStatuses: () => Promise<void>;
  upsertStatus: (payload: { type: IntegrationStatusItem['integrationType']; status?: IntegrationStatusItem['status']; configuration?: Record<string, unknown>; }) => Promise<void>;
  connectors: Array<{ id: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, unknown> }>;
  fetchConnectors: () => Promise<void>;
  upsertConnector: (payload: { provider: string; status?: string; config?: Record<string, unknown> }) => Promise<void>;
  disableConnector: (provider: string) => Promise<void>;
  refreshConnector: (provider: string) => Promise<void>;
  manualSync: (provider: string, entity: string) => Promise<{ ok: boolean; logId?: string; stats?: any }>;

  // Health & Monitoring
  healthStatuses: HealthStatus[];
  fetchHealthStatuses: () => Promise<void>;
  getIntegrationHealth: (integrationId: string) => Promise<void>;
  
  // Logs
  logs: IntegrationLog[];
  logsLoading: boolean;
  fetchLogs: (params?: { integrationId?: string; action?: string; status?: string; limit?: number; offset?: number }) => Promise<void>;
  
  // Sync Progress
  syncProgress: Record<string, SyncProgress>;
  setSyncProgress: (provider: string, progress: SyncProgress | null) => void;
  clearSyncProgress: (provider: string) => void;
  
  // OAuth State
  oauthState: OAuthState | null;
  setOAuthState: (state: OAuthState | null) => void;
  clearOAuthState: () => void;

  // Docs
  docsByProvider: Record<string, IntegrationDocs | undefined>;
  fetchDocs: (provider: string) => Promise<IntegrationDocs>;

  // OAuth
  getAuthorizeUrl: (provider: string, redirectUri: string, state?: string) => Promise<{ url: string; state: string }>;
  oauthCallback: (provider: string, payload: { code?: string; state?: string; redirectUri: string; error?: string; error_description?: string }) => Promise<{ ok: boolean; provider?: string; message?: string; error?: string; error_description?: string }>;

  // Field mappings
  mappingsByProvider: Record<string, IntegrationFieldMapping[]>;
  fetchMappings: (provider: string) => Promise<void>;
  upsertMapping: (provider: string, payload: UpsertMappingPayload) => Promise<void>;
  deleteMapping: (provider: string, id: string) => Promise<void>;

  // Catalog
  catalog: IntegrationCatalogResponse | null;
  fetchCatalog: () => Promise<void>;
  
  // Test Connection
  testConnection: (provider: string) => Promise<{ success: boolean; status: string; latency?: number; error?: string }>;
  
  // Sync History
  syncHistory: Record<string, any[]>;
  fetchSyncHistory: (provider: string, limit?: number, offset?: number) => Promise<void>;
}

export const useIntegrationsStore = create<IntegrationsState>((set, get) => ({
  statuses: [],
  isLoading: false,
  error: null,
  connectors: [],
  docsByProvider: {},
  mappingsByProvider: {},
  catalog: null,
  healthStatuses: [],
  logs: [],
  logsLoading: false,
  syncProgress: {},
  oauthState: null,
  syncHistory: {},

  fetchStatuses: async () => {
    set({ isLoading: true, error: null });
    try {
      const statuses = await integrationsApi.listStatuses();
      set({ statuses, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load integrations', isLoading: false });
    }
  },

  upsertStatus: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await integrationsApi.upsertStatus(payload);
      set((state) => ({
        statuses: [
          updated,
          ...state.statuses.filter(s => !(s.integrationType === updated.integrationType)),
        ],
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Failed to update integration', isLoading: false });
      throw e;
    }
  },

  fetchConnectors: async () => {
    set({ isLoading: true, error: null });
    try {
      const list = await integrationsApi.listConnectors();
      set({ connectors: Array.isArray(list) ? list : [], isLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load connectors', isLoading: false });
    }
  },

  upsertConnector: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = (await integrationsApi.upsertConnector(payload)) as { id: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, unknown> };
      set((state) => ({
        connectors: [updated, ...state.connectors.filter(c => c.provider !== updated.provider)],
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Failed to update connector', isLoading: false });
      throw e;
    }
  },

  disableConnector: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      const updated = (await integrationsApi.disableConnector(provider)) as { id: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, unknown> };
      set((state) => ({
        connectors: state.connectors.map(c => c.provider === provider ? updated : c),
        isLoading: false,
      }));
      // Also update status list if this provider is a channel type surfaced in statuses
      try {
        const statuses = get().statuses;
        set({
          statuses: statuses.map(s => s.integrationType === provider ? { ...s, status: 'disabled' } as any : s)
        });
      } catch { /* noop */ }
    } catch (e: any) {
      set({ error: e?.message || 'Failed to disable connector', isLoading: false });
      throw e;
    }
  },

  refreshConnector: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      const updated = (await integrationsApi.refreshConnector(provider)) as { id: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, unknown> };
      set((state) => ({
        connectors: state.connectors.map(c => c.provider === provider ? updated : c),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Failed to refresh connector', isLoading: false });
      throw e;
    }
  },

  manualSync: async (provider, entity) => {
    set({ isLoading: true, error: null });
    const syncKey = `${provider}:${entity}`;
    set((state) => ({
      syncProgress: {
        ...state.syncProgress,
        [syncKey]: {
          provider,
          entity,
          status: 'running',
          progress: 0,
          startedAt: new Date(),
        },
      },
    }));
    
    try {
      const res = (await integrationsApi.manualSync(provider, entity)) as { ok: boolean; logId?: string; stats?: any };
      set((state) => ({
        syncProgress: {
          ...state.syncProgress,
          [syncKey]: {
            provider,
            entity,
            status: res.ok ? 'completed' : 'failed',
            progress: 100,
            totalRecords: res.stats?.totalRecords,
            processedRecords: res.stats?.imported || res.stats?.updated || 0,
            error: res.ok ? undefined : 'Sync failed',
            startedAt: state.syncProgress[syncKey]?.startedAt || new Date(),
          },
        },
        isLoading: false,
      }));
      
      // Clear progress after 3 seconds
      setTimeout(() => {
        set((state) => {
          const newProgress = { ...state.syncProgress };
          delete newProgress[syncKey];
          return { syncProgress: newProgress };
        });
      }, 3000);
      
      return res;
    } catch (e: any) {
      set((state) => ({
        syncProgress: {
          ...state.syncProgress,
          [syncKey]: {
            provider,
            entity,
            status: 'failed',
            progress: 0,
            error: e?.message || 'Sync failed',
            startedAt: state.syncProgress[syncKey]?.startedAt || new Date(),
          },
        },
        error: e?.message || 'Manual sync failed',
        isLoading: false,
      }));
      throw e;
    }
  },

  // Health & Monitoring
  fetchHealthStatuses: async () => {
    set({ isLoading: true, error: null });
    try {
      const healthStatuses = await integrationsApi.getHealthStatus();
      set({ healthStatuses, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load health statuses', isLoading: false });
    }
  },

  getIntegrationHealth: async (integrationId) => {
    try {
      const health = await integrationsApi.getIntegrationHealth(integrationId);
      set((state) => ({
        healthStatuses: state.healthStatuses.map(h => 
          h.integrationId === integrationId 
            ? { ...h, status: health.status, lastCheck: health.timestamp, lastError: health.error } 
            : h
        ),
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Failed to get integration health' });
      throw e;
    }
  },

  // Logs
  fetchLogs: async (params) => {
    set({ logsLoading: true, error: null });
    try {
      const logs = await integrationsApi.getIntegrationLogs(params);
      set({ logs, logsLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load logs', logsLoading: false });
    }
  },

  // Sync Progress
  setSyncProgress: (provider, progress) => {
    if (!progress) {
      set((state) => {
        const newProgress = { ...state.syncProgress };
        delete newProgress[provider];
        return { syncProgress: newProgress };
      });
    } else {
      set((state) => ({
        syncProgress: {
          ...state.syncProgress,
          [provider]: progress,
        },
      }));
    }
  },

  clearSyncProgress: (provider) => {
    set((state) => {
      const newProgress = { ...state.syncProgress };
      delete newProgress[provider];
      return { syncProgress: newProgress };
    });
  },

  // OAuth State
  setOAuthState: (state) => {
    set({ oauthState: state });
  },

  clearOAuthState: () => {
    set({ oauthState: null });
  },

  // Docs
  fetchDocs: async (provider) => {
    try {
      const docs = await integrationsApi.getConnectorDocs(provider);
      set((state) => ({ docsByProvider: { ...state.docsByProvider, [provider]: docs } }));
      return docs;
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load connector docs' });
      throw e;
    }
  },

  // OAuth
  getAuthorizeUrl: async (provider, redirectUri, state) => {
    try {
      const result = await integrationsApi.getAuthorizeUrl(provider, redirectUri, state);
      set({ oauthState: { provider, state: result.state, redirectUri, status: 'authorizing' } });
      return result;
    } catch (e: any) {
      set({ error: e?.message || 'Failed to get authorize URL', oauthState: null });
      throw e;
    }
  },
  
  oauthCallback: async (provider, payload) => {
    set({ oauthState: { ...get().oauthState!, status: 'connecting' } });
    try {
      const result = await integrationsApi.oauthCallback(provider, payload);
      if (result.ok) {
        set({ oauthState: { ...get().oauthState!, status: 'success' } });
        // Refresh connectors after successful connection
        await get().fetchConnectors();
        await get().fetchHealthStatuses();
      } else {
        set({ 
          oauthState: { 
            ...get().oauthState!, 
            status: 'error', 
            error: result.error_description || result.error || 'Connection failed' 
          } 
        });
      }
      return result;
    } catch (e: any) {
      set({ 
        error: e?.message || 'OAuth callback failed',
        oauthState: { ...get().oauthState!, status: 'error', error: e?.message || 'OAuth callback failed' }
      });
      throw e;
    }
  },

  // Field mappings
  fetchMappings: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      const mappings = await integrationsApi.listMappings(provider);
      set((state) => ({ mappingsByProvider: { ...state.mappingsByProvider, [provider]: mappings }, isLoading: false }));
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load field mappings', isLoading: false });
    }
  },
  upsertMapping: async (provider, payload) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await integrationsApi.upsertMapping(provider, payload);
      set((state) => {
        const list = state.mappingsByProvider[provider] || [];
        const newList = [updated, ...list.filter(m => m.id !== updated.id)];
        return { mappingsByProvider: { ...state.mappingsByProvider, [provider]: newList }, isLoading: false };
      });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to save mapping', isLoading: false });
      throw e;
    }
  },
  deleteMapping: async (provider, id) => {
    set({ isLoading: true, error: null });
    try {
      await integrationsApi.deleteMapping(provider, id);
      set((state) => {
        const list = state.mappingsByProvider[provider] || [];
        const newList = list.filter(m => m.id !== id);
        return { mappingsByProvider: { ...state.mappingsByProvider, [provider]: newList }, isLoading: false };
      });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to delete mapping', isLoading: false });
      throw e;
    }
  },

  fetchCatalog: async () => {
    set({ isLoading: true, error: null });
    try {
      const catalog = await integrationsApi.catalog();
      set({ catalog, isLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load catalog', isLoading: false });
    }
  },

  // Test Connection
  testConnection: async (provider) => {
    set({ isLoading: true, error: null });
    try {
      const result = await integrationsApi.testConnection(provider);
      set({ isLoading: false });
      // Refresh health statuses after test
      await get().fetchHealthStatuses();
      return result;
    } catch (e: any) {
      set({ error: e?.message || 'Connection test failed', isLoading: false });
      throw e;
    }
  },

  // Sync History
  fetchSyncHistory: async (provider, limit, offset) => {
    set({ isLoading: true, error: null });
    try {
      const history = await integrationsApi.getSyncHistory(provider, limit, offset);
      set((state) => ({
        syncHistory: {
          ...state.syncHistory,
          [provider]: history,
        },
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load sync history', isLoading: false });
    }
  },
}));


