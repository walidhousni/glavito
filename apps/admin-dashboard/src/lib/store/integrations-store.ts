import { create } from 'zustand';
import { integrationsApi, IntegrationStatusItem, IntegrationDocs, IntegrationFieldMapping, UpsertMappingPayload } from '../api/integrations';

interface IntegrationsState {
  statuses: IntegrationStatusItem[];
  isLoading: boolean;
  error: string | null;
  fetchStatuses: () => Promise<void>;
  upsertStatus: (payload: { type: IntegrationStatusItem['integrationType']; status?: IntegrationStatusItem['status']; configuration?: Record<string, any>; }) => Promise<void>;
  connectors: Array<{ id: string; provider: string; status: string; lastSyncAt?: string; lastError?: string; config: Record<string, any> }>;
  fetchConnectors: () => Promise<void>;
  upsertConnector: (payload: { provider: string; status?: string; config?: Record<string, any> }) => Promise<void>;
  disableConnector: (provider: string) => Promise<void>;
  manualSync: (provider: string, entity: string) => Promise<{ ok: boolean; logId?: string }>;

  // Docs
  docsByProvider: Record<string, IntegrationDocs | undefined>;
  fetchDocs: (provider: string) => Promise<IntegrationDocs>;

  // OAuth
  getAuthorizeUrl: (provider: string, redirectUri: string, state?: string) => Promise<string>;
  oauthCallback: (provider: string, payload: { code?: string; state?: string; redirectUri: string }) => Promise<{ ok: boolean }>;

  // Field mappings
  mappingsByProvider: Record<string, IntegrationFieldMapping[]>;
  fetchMappings: (provider: string) => Promise<void>;
  upsertMapping: (provider: string, payload: UpsertMappingPayload) => Promise<void>;
  deleteMapping: (provider: string, id: string) => Promise<void>;
}

export const useIntegrationsStore = create<IntegrationsState>((set, get) => ({
  statuses: [],
  isLoading: false,
  error: null,
  connectors: [],
  docsByProvider: {},
  mappingsByProvider: {},

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
      const updated = await integrationsApi.upsertConnector(payload);
      set((state) => ({
        connectors: [updated, ...state.connectors.filter(c => c.provider !== (updated as any)?.provider)],
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
      const updated = await integrationsApi.disableConnector(provider);
      set((state) => ({
        connectors: state.connectors.map(c => c.provider === provider ? updated : c),
        isLoading: false,
      }));
    } catch (e: any) {
      set({ error: e?.message || 'Failed to disable connector', isLoading: false });
      throw e;
    }
  },

  manualSync: async (provider, entity) => {
    set({ isLoading: true, error: null });
    try {
      const res = await integrationsApi.manualSync(provider, entity);
      set({ isLoading: false });
      return res;
    } catch (e: any) {
      set({ error: e?.message || 'Manual sync failed', isLoading: false });
      throw e;
    }
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
      return await integrationsApi.getAuthorizeUrl(provider, redirectUri, state);
    } catch (e: any) {
      set({ error: e?.message || 'Failed to get authorize URL' });
      throw e;
    }
  },
  oauthCallback: async (provider, payload) => {
    try {
      return await integrationsApi.oauthCallback(provider, payload);
    } catch (e: any) {
      set({ error: e?.message || 'OAuth callback failed' });
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
}));


