import { create } from 'zustand';
import { whiteLabelApi, type BrandAsset, type BrandAssetType } from '@/lib/api/white-label-client';

interface WhiteLabelState {
  assets: BrandAsset[];
  loading: boolean;
  error: string | null;
  loadAssets: () => Promise<void>;
  uploadAsset: (file: File, type: BrandAssetType) => Promise<BrandAsset | null>;
  removeAsset: (id: string) => Promise<void>;
  templates: Array<{ id: string; type: string; name: string; subject?: string; content: string; variables: Array<{ key: string; type?: string; required?: boolean; description?: string }>; isActive: boolean; version: number; createdAt: string; updatedAt: string }>;
  loadTemplates: (type?: string) => Promise<void>;
  upsertTemplate: (tpl: { type: string; name: string; subject?: string; content: string; variables?: Array<{ key: string; type?: string; required?: boolean; description?: string }>; isActive?: boolean }) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  previewTemplate: (content: string, variables: Record<string, unknown>) => Promise<{ content: string; engine: 'handlebars' | 'fallback'; success: boolean }>;
  testSendTemplate: (id: string, payload: { to: string; variables?: Record<string, unknown> }) => Promise<{ success: boolean }>;
  // Feature toggles
  toggles: Array<{ id: string; featureKey: string; isEnabled: boolean; configuration?: any; restrictions?: any; updatedAt: string }>;
  loadToggles: () => Promise<void>;
  upsertToggle: (toggle: { featureKey: string; isEnabled?: boolean; configuration?: Record<string, unknown>; restrictions?: any }) => Promise<void>;
  deleteToggle: (featureKey: string) => Promise<void>;
  // SMTP
  smtp: { host: string; port: number; user: string; from?: string; secure?: boolean } | null;
  loadSmtp: () => Promise<void>;
  saveSmtp: (payload: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) => Promise<void>;
  testSmtp: (payload: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) => Promise<{ ok: boolean; error?: string }>;
  // Deliveries
  deliveries: Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; openedAt?: string; openCount: number; clickCount: number; createdAt: string }>;
  loadDeliveries: (takeOrParams?: number | { take?: number; status?: string; q?: string }) => Promise<void>;
}

export const useWhiteLabelStore = create<WhiteLabelState>((set, get) => ({
  assets: [],
  loading: false,
  error: null,
  templates: [],
  toggles: [],
  smtp: null,
  deliveries: [],

  loadAssets: async () => {
    set({ loading: true, error: null });
    try {
      const assets = await whiteLabelApi.listAssets();
      set({ assets, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load assets', loading: false });
    }
  },

  uploadAsset: async (file, type) => {
    set({ loading: true, error: null });
    try {
      const asset = await whiteLabelApi.uploadAsset(file, type);
      set({ assets: [asset, ...get().assets], loading: false });
      return asset;
    } catch (e: any) {
      set({ error: e?.message || 'Upload failed', loading: false });
      return null;
    }
  },

  removeAsset: async (id: string) => {
    set({ loading: true, error: null });
    try {
      await whiteLabelApi.deleteAsset(id);
      set({ assets: get().assets.filter((a) => a.id !== id), loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Delete failed', loading: false });
    }
  },

  loadTemplates: async (type?: string) => {
    set({ loading: true, error: null });
    try {
      const templates = await whiteLabelApi.listTemplates(type);
      set({ templates, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load templates', loading: false });
    }
  },
  upsertTemplate: async (tpl) => {
    set({ error: null });
    await whiteLabelApi.upsertTemplate(tpl);
    await get().loadTemplates(tpl.type);
  },
  deleteTemplate: async (id: string) => {
    set({ error: null });
    await whiteLabelApi.deleteTemplate(id);
    await get().loadTemplates();
  },
  previewTemplate: async (content, variables) => {
    return whiteLabelApi.previewTemplate(content, variables);
  },
  testSendTemplate: async (id, payload) => {
    return whiteLabelApi.testSendTemplate(id, payload);
  },
  loadDeliveries: async (takeOrParams?: number | { take?: number; status?: string; q?: string }) => {
    const params = typeof takeOrParams === 'number' ? { take: takeOrParams } : (takeOrParams || {});
    const deliveries = await whiteLabelApi.listDeliveries(params);
    set({ deliveries });
  },
  loadToggles: async () => {
    set({ loading: true, error: null });
    try {
      const toggles = await whiteLabelApi.listToggles();
      set({ toggles, loading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load toggles', loading: false });
    }
  },
  upsertToggle: async (toggle) => {
    set({ error: null });
    await whiteLabelApi.upsertToggle(toggle);
    await get().loadToggles();
  },
  deleteToggle: async (featureKey) => {
    set({ error: null });
    await whiteLabelApi.deleteToggle(featureKey);
    await get().loadToggles();
  },
  loadSmtp: async () => {
    set({ error: null });
    const smtp = await whiteLabelApi.getSmtp();
    set({ smtp });
  },
  saveSmtp: async (payload) => {
    set({ error: null });
    const res = await whiteLabelApi.updateSmtp(payload);
    set({ smtp: res.smtp || null });
  },
  testSmtp: async (payload) => {
    return whiteLabelApi.testSmtp(payload);
  },
}));


