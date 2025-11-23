import { create } from 'zustand';
import { marketplaceApi, type MarketplaceItem } from '@/lib/api/marketplace-client';

export interface MarketplaceFilters {
  search?: string;
  category?: string;
  tag?: string;
  type?: string;
  premium?: boolean;
  sort?: string;
  page?: number;
  limit?: number;
}

interface MarketplaceState {
  items: MarketplaceItem[];
  isLoading: boolean;
  error: string | null;
  filters: MarketplaceFilters;
  installLoading: Record<string, boolean>;
  installed: any[];
  installedLoading: boolean;

  setFilters: (updates: Partial<MarketplaceFilters>) => void;
  load: () => Promise<void>;
  install: (slug: string, configuration?: Record<string, unknown>) => Promise<void>;
  seedDemo: () => Promise<void>;
  loadInstalled: () => Promise<void>;
  updateInstallation: (id: string, updates: { status?: 'installed' | 'enabled' | 'disabled'; configuration?: Record<string, unknown> }) => Promise<void>;
  uninstall: (id: string) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  filters: { page: 1, limit: 30, sort: 'updated' },
  installLoading: {},
  installed: [],
  installedLoading: false,

  setFilters: (updates) => set((state) => ({ filters: { ...state.filters, ...updates } })),

  load: async () => {
    const { filters } = get();
    set({ isLoading: true, error: null });
    try {
      const list = await marketplaceApi.list(filters);
      set({ items: Array.isArray(list) ? list : [], isLoading: false });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load marketplace', isLoading: false, items: [] });
    }
  },

  install: async (slug, configuration) => {
    set((s) => ({ installLoading: { ...s.installLoading, [slug]: true } }));
    try {
      await marketplaceApi.install(slug, configuration);
      // refresh installed list best-effort
      void get().loadInstalled();
    } finally {
      set((s) => ({ installLoading: { ...s.installLoading, [slug]: false } }));
    }
  },

  seedDemo: async () => {
    await marketplaceApi.seedDemo();
    // reload marketplace & installed after seeding
    await get().load();
    await get().loadInstalled();
  },

  loadInstalled: async () => {
    set({ installedLoading: true });
    try {
      const list = await marketplaceApi.listInstalled();
      set({ installed: Array.isArray(list) ? list : [], installedLoading: false });
    } catch {
      set({ installed: [], installedLoading: false });
    }
  },

  updateInstallation: async (id, updates) => {
    await marketplaceApi.updateInstallation(id, updates);
    await get().loadInstalled();
  },

  uninstall: async (id) => {
    await marketplaceApi.uninstall(id);
    await get().loadInstalled();
  },
}));


