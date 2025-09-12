import { create } from 'zustand'
import { analyticsApi } from '@/lib/api/analytics-client'
import type { RealTimeMetrics, KPIMetric } from '@/types/analytics'

type Range = '24h' | '7d' | '30d' | '90d'

interface AnalyticsState {
  // State
  timeRange: Range
  realTime?: RealTimeMetrics
  kpis?: KPIMetric[]
  forecast?: any
  capacity?: any
  churn?: any[]
  revenueAttribution?: any
  costAnalytics?: any
  roiAnalytics?: any
  channelAnalytics?: any
  agentPerformance?: any
  isLoading: boolean
  error: string | null
  reportTemplates?: any[]
  exportJobs?: any[]
  schedules?: any[]
  executiveSummary?: string
  dashboards?: any[]

  // Actions
  setTimeRange: (range: Range) => void
  fetchAll: () => Promise<void>
  refetch: () => Promise<void>
  fetchAgent: (agentId: string) => Promise<void>
  fetchChannel: () => Promise<void>
  loadTemplates: () => Promise<void>
  requestExport: (input: { type: 'dashboard' | 'metric' | 'survey'; sourceId?: string; templateId?: string; format: 'pdf' | 'csv' | 'excel' | 'json'; parameters?: Record<string, unknown> }) => Promise<void>
  loadExports: () => Promise<void>
  loadSchedules: () => Promise<void>
  createSchedule: (input: Parameters<typeof analyticsApi.createSchedule>[0]) => Promise<void>
  loadDashboards: () => Promise<void>
  createDashboard: (input: Parameters<typeof analyticsApi.createDashboard>[0]) => Promise<void>
  loadExecutiveSummary: () => Promise<void>
}

export const useAnalyticsStore = create<AnalyticsState>((set, get) => ({
  timeRange: '7d',
  isLoading: false,
  error: null,
  reportTemplates: [],
  exportJobs: [],
  schedules: [],
  dashboards: [],
  executiveSummary: '',

  setTimeRange: (range) => set({ timeRange: range }),

  fetchAll: async () => {
    const range = get().timeRange
    set({ isLoading: true, error: null })
    try {
      const [realTime, kpis, forecast, capacity, churn, revAttr, costs, roi, channel, agent] = await Promise.all([
        analyticsApi.getRealTimeMetrics(range),
        analyticsApi.getKpiMetrics(range),
        analyticsApi.getDemandForecast(30),
        analyticsApi.getCapacityPrediction(range),
        analyticsApi.getChurnPrediction(),
        analyticsApi.getRevenueAttribution(range),
        analyticsApi.getCostAnalytics(range),
        analyticsApi.getROIAnalytics(range),
        analyticsApi.getChannelAnalytics(range),
        analyticsApi.getAgentPerformance(undefined, range),
      ])
      set({ realTime, kpis, forecast, capacity, churn, revenueAttribution: revAttr, costAnalytics: costs, roiAnalytics: roi, channelAnalytics: channel, agentPerformance: agent, isLoading: false })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load analytics', isLoading: false })
    }
  },

  refetch: async () => {
    await get().fetchAll()
  },

  fetchAgent: async (agentId: string) => {
    const range = get().timeRange
    try {
      const perf = await analyticsApi.getAgentPerformance(agentId, range)
      set({ agentPerformance: perf })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load agent performance' })
    }
  },

  fetchChannel: async () => {
    const range = get().timeRange
    try {
      const channel = await analyticsApi.getChannelAnalytics(range)
      set({ channelAnalytics: channel })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load channel analytics' })
    }
  },

  loadTemplates: async () => {
    try {
      const items = await analyticsApi.listReportTemplates()
      set({ reportTemplates: items })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load report templates' })
    }
  },

  requestExport: async (input) => {
    try {
      await analyticsApi.requestExport(input as any)
      const jobs = await analyticsApi.listExports()
      set({ exportJobs: jobs })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to request export' })
    }
  },

  loadExports: async () => {
    try {
      const jobs = await analyticsApi.listExports()
      set({ exportJobs: jobs })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load exports' })
    }
  },

  loadSchedules: async () => {
    try {
      const items = await analyticsApi.listSchedules()
      set({ schedules: items })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load schedules' })
    }
  },

  createSchedule: async (input) => {
    try {
      await analyticsApi.createSchedule(input)
      const items = await analyticsApi.listSchedules()
      set({ schedules: items })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create schedule' })
    }
  },

  loadDashboards: async () => {
    try {
      const items = await analyticsApi.listDashboards()
      set({ dashboards: items })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load dashboards' })
    }
  },

  createDashboard: async (input) => {
    try {
      await analyticsApi.createDashboard(input)
      const items = await analyticsApi.listDashboards()
      set({ dashboards: items })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to create dashboard' })
    }
  },

  loadExecutiveSummary: async () => {
    try {
      const s = await analyticsApi.getExecutiveSummary()
      set({ executiveSummary: s.summary })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load executive summary' })
    }
  }
}))


