import { create } from 'zustand';
import { tenantsApi, type DashboardConfig } from '@/lib/api/tenants-client';

interface DashboardState {
  config: DashboardConfig | null;
  jsonText: string;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;

  load: () => Promise<void>;
  setJsonText: (text: string) => void;
  resetJsonToLoaded: () => void;
  save: () => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  config: null,
  jsonText: '',
  isLoading: false,
  isSaving: false,
  error: null,

  load: async () => {
    set({ isLoading: true, error: null });
    try {
      const cfg = await tenantsApi.getMyDashboard();
      set({ config: cfg, jsonText: JSON.stringify(cfg, null, 2), isLoading: false });
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to load dashboard config', isLoading: false });
    }
  },

  setJsonText: (text: string) => set({ jsonText: text }),

  resetJsonToLoaded: () => {
    const { config } = get();
    set({ jsonText: JSON.stringify(config ?? { layout: 'grid', widgets: [] }, null, 2) });
  },

  save: async () => {
    const { jsonText } = get();
    set({ isSaving: true, error: null });
    try {
      const parsed = JSON.parse(jsonText || '{}') as DashboardConfig;
      await tenantsApi.updateMyDashboard(parsed);
      set({ config: parsed, isSaving: false });
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to save dashboard config', isSaving: false });
      throw err;
    }
  },
}));


