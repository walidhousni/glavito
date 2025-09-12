import { create } from 'zustand';
import { marketplaceApi, type MarketplaceItem } from '@/lib/api/marketplace-client';

interface MarketplaceFilters {
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

  setFilters: (updates: Partial<MarketplaceFilters>) => void;
  load: () => Promise<void>;
  install: (slug: string, configuration?: Record<string, unknown>) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,
  filters: { page: 1, limit: 30, sort: 'updated' },
  installLoading: {},

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
    } finally {
      set((s) => ({ installLoading: { ...s.installLoading, [slug]: false } }));
    }
  },
}));


