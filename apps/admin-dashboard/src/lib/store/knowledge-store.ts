import { create } from 'zustand';
import { knowledgeApi, type KBSearchResult } from '@/lib/api/knowledge-client';

interface KnowledgeState {
  q: string;
  semantic: boolean;
  searchLoading: boolean;
  result: KBSearchResult;
  authorItems: { id: string; title: string; tags: string[]; isPublished: boolean; updatedAt: string }[];
  authorLoading: boolean;
  analytics: { totals: { totalViews: number; totalHelpful: number }; helpfulRate: number; trending: Array<{ id: string; title: string; views: number; helpful: number }> } | null;
  outdated: Array<{ id: string; title: string; lastReviewedAt?: string; updatedAt: string }>; 
  maintLoading: boolean;
  error?: string;

  setQuery: (q: string) => void;
  setSemantic: (v: boolean) => void;
  search: () => Promise<void>;
  loadAuthoring: () => Promise<void>;
  publishToggle: (id: string, to: boolean) => Promise<void>;
  loadAnalytics: (days?: number) => Promise<void>;
  loadOutdated: (params?: { thresholdDays?: number; minHelpfulRate?: number; minViews?: number }) => Promise<void>;
  markReviewed: (id: string) => Promise<void>;
}

export const useKnowledgeStore = create<KnowledgeState>((set, get) => ({
  q: '',
  semantic: false,
  searchLoading: false,
  result: { articles: [], faqs: [] },
  authorItems: [],
  authorLoading: false,
  analytics: null,
  outdated: [],
  maintLoading: false,
  error: undefined,

  setQuery: (q) => set({ q }),
  setSemantic: (v) => set({ semantic: v }),

  search: async () => {
    const { q, semantic } = get();
    set({ searchLoading: true, error: undefined });
    try {
      const res = await knowledgeApi.search(q, 10, { semantic });
      set({
        result: {
          articles: Array.isArray(res.articles) ? res.articles : [],
          faqs: Array.isArray(res.faqs) ? res.faqs : [],
        },
        searchLoading: false,
      });
    } catch (err) {
      set({ result: { articles: [], faqs: [] }, searchLoading: false, error: (err as Error)?.message || 'Search failed' });
    }
  },

  loadAuthoring: async () => {
    const { q } = get();
    set({ authorLoading: true, error: undefined });
    try {
      const res = await knowledgeApi.listArticles({ q, page: 1, pageSize: 10 });
      set({ authorItems: Array.isArray(res.items) ? res.items : [], authorLoading: false });
    } catch (err) {
      set({ authorItems: [], authorLoading: false, error: (err as Error)?.message || 'Failed to load authoring list' });
    }
  },

  publishToggle: async (id, to) => {
    try {
      await knowledgeApi.publishArticle(id, to);
      set((state) => ({ authorItems: state.authorItems.map(it => it.id === id ? { ...it, isPublished: to } : it) }));
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to publish' });
    }
  },

  loadAnalytics: async (days = 30) => {
    try {
      const a = await knowledgeApi.analyticsOverview(days);
      set({
        analytics: a ? {
          totals: {
            totalViews: a?.totals?.totalViews ?? 0,
            totalHelpful: a?.totals?.totalHelpful ?? 0,
          },
          helpfulRate: a?.helpfulRate ?? 0,
          trending: Array.isArray(a?.trending) ? a.trending : [],
        } : null,
      });
    } catch (err) {
      set({ analytics: null, error: (err as Error)?.message || 'Failed to load analytics' });
    }
  },

  loadOutdated: async (params) => {
    set({ maintLoading: true, error: undefined });
    try {
      const items = await knowledgeApi.maintenanceOutdated(params);
      set({ outdated: Array.isArray(items) ? items : [], maintLoading: false });
    } catch (err) {
      set({ outdated: [], maintLoading: false, error: (err as Error)?.message || 'Failed to load maintenance list' });
    }
  },

  markReviewed: async (id) => {
    try {
      await knowledgeApi.maintenanceMarkReviewed(id);
      set((state) => ({ outdated: state.outdated.filter(x => x.id !== id) }));
    } catch (err) {
      set({ error: (err as Error)?.message || 'Failed to mark reviewed' });
    }
  },
}));


