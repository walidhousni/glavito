  import { create } from 'zustand'
import { analyticsApi } from '@/lib/api/analytics-client'
import { callsApi } from '@/lib/api/calls-client'
import type { RealTimeMetricsUI, KPIMetricUI } from '@glavito/shared-types'

type Range = '24h' | '7d' | '30d' | '90d'
export type AnalyticsType = 'overview' | 'conversations' | 'sales' | 'conversion' | 'campaign' | 'performance' | 'calls' | 'financial' | 'predictive' | 'satisfaction' | 'reports' | 'dashboards'

interface AnalyticsState {
  // State
  timeRange: Range
  analyticsType: AnalyticsType
  realTime?: RealTimeMetricsUI
  kpis?: KPIMetricUI[]
  forecast?: any
  capacity?: any
  churn?: any[]
  revenueAttribution?: any
  costAnalytics?: any
  roiAnalytics?: any
  channelAnalytics?: any
  agentPerformance?: any
  callAnalytics?: any
  callQuality?: any
  callTrends?: any[]
  isLoading: boolean
  isLoadingCalls: boolean
  error: string | null
  reportTemplates?: any[]
  exportJobs?: any[]
  schedules?: any[]
  executiveSummary?: string
  dashboards?: any[]

  // Actions
  setTimeRange: (range: Range) => void
  setAnalyticsType: (type: AnalyticsType) => void
  fetchAll: () => Promise<void>
  refetch: () => Promise<void>
  fetchAgent: (agentId: string) => Promise<void>
  fetchChannel: () => Promise<void>
  fetchCalls: () => Promise<void>
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
  analyticsType: 'overview',
  isLoading: false,
  isLoadingCalls: false,
  error: null,
  reportTemplates: [],
  exportJobs: [],
  schedules: [],
  dashboards: [],
  executiveSummary: '',

  setTimeRange: (range) => set({ timeRange: range }),
  setAnalyticsType: (type) => set({ analyticsType: type }),

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
      
      // Transform channel analytics to match expected format
      const transformedChannel = channel?.channels ? {
        channels: channel.channels.reduce((acc: Record<string, any>, ch: any) => {
          acc[ch.channelId || ch.channelName || 'unknown'] = {
            ticketVolume: ch.totalTickets || ch.totalInteractions || 0,
            ...ch
          }
          return acc
        }, {})
      } : channel
      
      // Transform agent performance to array format
      const transformedAgent = Array.isArray(agent) ? agent : ((agent as any)?.metrics ? [agent] : [])
      
      set({ 
        realTime: realTime || undefined, 
        kpis: Array.isArray(kpis) ? kpis : [], 
        forecast: forecast || undefined, 
        capacity: capacity || undefined, 
        churn: Array.isArray(churn) ? churn : [], 
        revenueAttribution: revAttr || undefined, 
        costAnalytics: costs || undefined, 
        roiAnalytics: roi || undefined, 
        channelAnalytics: transformedChannel || undefined, 
        agentPerformance: transformedAgent, 
        isLoading: false 
      })
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

  fetchCalls: async () => {
    set({ isLoadingCalls: true })
    try {
      const [callAnalytics, callQuality, callTrends] = await Promise.all([
        callsApi.analyticsMe().catch(() => null),
        callsApi.quality24h().catch(() => null),
        callsApi.trends(7).catch(() => []),
      ])
      set({ 
        callAnalytics: callAnalytics || undefined, 
        callQuality: callQuality || undefined, 
        callTrends: Array.isArray(callTrends) ? callTrends : [], 
        isLoadingCalls: false 
      })
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Failed to load call analytics', isLoadingCalls: false })
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


