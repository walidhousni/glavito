import { create } from 'zustand';
import { crmApi, type DealItem, type LeadItem, type PipelineItem, type SegmentItem } from '@/lib/api/crm-client';

interface CrmState {
  isLoading: boolean;
  leads: LeadItem[];
  deals: DealItem[];
  pipelines: PipelineItem[];
  segments: (SegmentItem & { averageValue?: number; monthlyGrowth?: number })[];
  // Analytics
  pipelineAnalytics?: {
    stages: Array<{ stage: string; count: number; totalValue: number }>;
    weightedPipeline: number;
    winRate: number;
    avgCycleDays: number;
    trendByWeek: Array<{ weekStart: string; count: number; value: number }>;
  };
  salesForecast?: {
    periodDays: number;
    totalPredicted: number;
    predictions: Array<{ date: string; predictedRevenue: number; confidence: number }>;
  };
  // Custom fields & objects
  customFields?: Array<any>;
  customObjectTypes?: Array<any>;
  customObjectRecords?: Record<string, any[]>; // keyed by typeId
  error?: string;
  fetchInitial: () => Promise<void>;
  refreshLeads: (q?: string) => Promise<void>;
  createLead: (payload: Record<string, unknown>) => Promise<void>;
  moveDeal: (id: string, stage: DealItem['stage']) => Promise<void>;
  createDeal: (payload: Record<string, unknown>) => Promise<void>;
  rescoreLead: (id: string) => Promise<void>;
  refreshSegments: () => Promise<void>;
  createSegment: (payload: Record<string, unknown>) => Promise<void>;
  updateSegment: (id: string, payload: Record<string, unknown>) => Promise<void>;
  previewSegment: (id: string) => Promise<{ sampleCount: number; totalMatched: number; sampleCustomerIds: string[] }>;
  recalcSegment: (id: string) => Promise<{ updated: number }>;
  fetchPipelineAnalytics: () => Promise<void>;
  fetchSalesForecast: (days?: number) => Promise<void>;
  // Admin Custom fields & objects
  fetchCustomFields: (entity?: string) => Promise<void>;
  createCustomField: (payload: Record<string, unknown>) => Promise<void>;
  updateCustomField: (id: string, payload: Record<string, unknown>) => Promise<void>;
  deleteCustomField: (id: string) => Promise<void>;
  fetchCustomObjectTypes: () => Promise<void>;
  createCustomObjectType: (payload: Record<string, unknown>) => Promise<void>;
  updateCustomObjectType: (id: string, payload: Record<string, unknown>) => Promise<void>;
  deleteCustomObjectType: (id: string) => Promise<void>;
  fetchCustomObjectRecords: (typeId: string) => Promise<void>;
  createCustomObjectRecord: (typeId: string, payload: { values?: Record<string, unknown>; references?: Record<string, unknown> }) => Promise<void>;
  updateCustomObjectRecord: (id: string, payload: { values?: Record<string, unknown>; references?: Record<string, unknown> }) => Promise<void>;
  deleteCustomObjectRecord: (id: string, typeId?: string) => Promise<void>;
}

export const useCrmStore = create<CrmState>((set, get) => ({
  isLoading: false,
  leads: [],
  deals: [],
  pipelines: [],
  segments: [],
  customFields: undefined,
  customObjectTypes: undefined,
  customObjectRecords: {},
  error: undefined,
  fetchInitial: async () => {
    set({ isLoading: true, error: undefined });
    try {
      const [leads, deals, pipelines] = await Promise.all([
        crmApi.listLeads(),
        crmApi.listDeals(),
        crmApi.listPipelines(),
      ]);

      // Try to load segments separately to avoid failing the entire initial load
      let segments: SegmentItem[] = [];
      let metrics: Array<{ segmentId: string; customerCount?: number; averageValue?: number; monthlyGrowth?: number }> = [];
      try {
        [segments, metrics] = await Promise.all([
          crmApi.listSegments(),
          crmApi.segmentMetrics(),
        ]);
      } catch (segmentError) {
        console.warn('Failed to load segments:', segmentError);
      }

      const idToMetrics = new Map<string, { customerCount?: number; averageValue?: number; monthlyGrowth?: number }>(metrics.map(m => [m.segmentId, m]));
      const segmentsWithMetrics = segments.map(s => ({
        ...s,
        averageValue: idToMetrics.get(s.id)?.averageValue,
        monthlyGrowth: idToMetrics.get(s.id)?.monthlyGrowth,
      }));
      set({ leads, deals, pipelines, segments: segmentsWithMetrics, isLoading: false });
    } catch (e: unknown) {
      set({ isLoading: false, error: e instanceof Error ? e.message : 'Failed to load CRM data' });
    }
  },
  refreshLeads: async (q?: string) => {
    try {
      const leads = await crmApi.listLeads(q);
      set({ leads });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to load leads' });
    }
  },
  createLead: async (payload: Record<string, unknown>) => {
    try {
      const created = await crmApi.createLead(payload);
      set({ leads: [created, ...get().leads] });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to create lead' });
      throw e;
    }
  },
  moveDeal: async (id: string, stage: DealItem['stage']) => {
    try {
      // optimistic update
      const prev = get().deals;
      set({ deals: prev.map((d) => (d.id === id ? { ...d, stage } : d)) });
      const updated = await crmApi.moveDealStage(id, stage);
      set({ deals: get().deals.map((d) => (d.id === id ? updated : d)) });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to move deal' });
    }
  },
  createDeal: async (payload: Record<string, unknown>) => {
    try {
      const created = await crmApi.createDeal(payload);
      set({ deals: [created, ...get().deals] });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to create deal' });
      throw e;
    }
  },
  rescoreLead: async (id: string) => {
    try {
      const updated = await crmApi.rescoreLead(id);
      set({ leads: get().leads.map((l) => (l.id === id ? (updated as LeadItem) : l)) });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to rescore lead' });
    }
  },
  refreshSegments: async () => {
    try {
      const [segments, metrics] = await Promise.all([
        crmApi.listSegments() as Promise<SegmentItem[]>,
        crmApi.segmentMetrics() as Promise<Array<{ segmentId: string; customerCount?: number; averageValue?: number; monthlyGrowth?: number }>>,
      ]);
      const idToMetrics = new Map<string, { customerCount?: number; averageValue?: number; monthlyGrowth?: number }>(metrics.map(m => [m.segmentId, m]));
      set({
        segments: segments.map(s => ({
          ...s,
          averageValue: idToMetrics.get(s.id)?.averageValue,
          monthlyGrowth: idToMetrics.get(s.id)?.monthlyGrowth,
        })),
        error: undefined
      });
    } catch (e: unknown) {
      console.error('Failed to refresh segments:', e);
      set({ error: e instanceof Error ? e.message : 'Failed to load segments' });
      throw e;
    }
  },
  createSegment: async (payload: Record<string, unknown>) => {
    try {
      const created = await crmApi.createSegment(payload);
      // Optimistic: show immediately
      set({ segments: [{ ...created }, ...get().segments] });
      // Then refresh to enrich with metrics
      await get().refreshSegments();
    } catch (e: unknown) {
      console.error('Failed to create segment:', e);
      set({ error: e instanceof Error ? e.message : 'Failed to create segment' });
      throw e;
    }
  },
  updateSegment: async (id: string, payload: Record<string, unknown>) => {
    try {
      const updated = await crmApi.updateSegment(id, payload);
      // Optimistic: update in place (preserve computed metrics if any)
      set({ segments: get().segments.map((s) => (s.id === id ? { ...s, ...updated } : s)) });
      await get().refreshSegments();
    } catch (e: unknown) {
      console.error('Failed to update segment:', e);
      set({ error: e instanceof Error ? e.message : 'Failed to update segment' });
      throw e;
    }
  },
  previewSegment: async (id: string) => {
    return crmApi.previewSegment(id);
  },
  recalcSegment: async (id: string) => {
    const out = await crmApi.recalcSegment(id);
    await get().refreshSegments();
    return out;
  },
  fetchPipelineAnalytics: async () => {
    try {
      const data = await crmApi.getPipelineAnalytics();
      set({ pipelineAnalytics: data });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to load pipeline analytics' });
    }
  },
  fetchSalesForecast: async (days?: number) => {
    try {
      const data = await crmApi.getSalesForecast(days ?? 30);
      // Ensure predictions is always an array
      set({ 
        salesForecast: {
          ...data,
          predictions: Array.isArray(data?.predictions) ? data.predictions : [],
          totalPredicted: data?.totalPredicted || 0,
          periodDays: data?.periodDays || 30
        }
      });
    } catch (e: unknown) {
      console.error('Failed to fetch sales forecast:', e);
      set({ error: e instanceof Error ? e.message : 'Failed to load sales forecast' });
    }
  }
  ,
  // --- Custom fields & objects (admin) ---
  fetchCustomFields: async (entity?: string) => {
    try {
      const items = await crmApi.listCustomFields(entity);
      set({ customFields: Array.isArray(items) ? items : [] });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to load custom fields' });
    }
  },
  createCustomField: async (payload: Record<string, unknown>) => {
    await crmApi.createCustomField(payload);
    await get().fetchCustomFields(payload?.['entity'] as string | undefined);
  },
  updateCustomField: async (id: string, payload: Record<string, unknown>) => {
    await crmApi.updateCustomField(id, payload);
    await get().fetchCustomFields(payload?.['entity'] as string | undefined);
  },
  deleteCustomField: async (id: string) => {
    await crmApi.deleteCustomField(id);
    await get().fetchCustomFields();
  },
  fetchCustomObjectTypes: async () => {
    try {
      const types = await crmApi.listCustomObjectTypes();
      set({ customObjectTypes: Array.isArray(types) ? types : [] });
    } catch (e: unknown) {
      set({ error: e instanceof Error ? e.message : 'Failed to load custom object types' });
    }
  },
  createCustomObjectType: async (payload: Record<string, unknown>) => {
    await crmApi.createCustomObjectType(payload);
    await get().fetchCustomObjectTypes();
  },
  updateCustomObjectType: async (id: string, payload: Record<string, unknown>) => {
    await crmApi.updateCustomObjectType(id, payload);
    await get().fetchCustomObjectTypes();
  },
  deleteCustomObjectType: async (id: string) => {
    await crmApi.deleteCustomObjectType(id);
    await get().fetchCustomObjectTypes();
  },
  fetchCustomObjectRecords: async (typeId: string) => {
    const items = await crmApi.listCustomObjectRecords(typeId);
    set((s) => ({ customObjectRecords: { ...(s.customObjectRecords || {}), [typeId]: Array.isArray(items) ? items : [] } }));
  },
  createCustomObjectRecord: async (typeId: string, payload: { values?: Record<string, unknown>; references?: Record<string, unknown> }) => {
    await crmApi.createCustomObjectRecord(typeId, payload);
    await get().fetchCustomObjectRecords(typeId);
  },
  updateCustomObjectRecord: async (id: string, payload: { values?: Record<string, unknown>; references?: Record<string, unknown> }) => {
    await crmApi.updateCustomObjectRecord(id, payload);
  },
  deleteCustomObjectRecord: async (id: string, typeId?: string) => {
    await crmApi.deleteCustomObjectRecord(id);
    if (typeId) await get().fetchCustomObjectRecords(typeId);
  }
}));


