import { api } from './config'
import type { RealTimeMetrics, KPIMetric } from '@/types/analytics'

type ApiEnvelope<T> = { success?: boolean; data: T }

function unwrap<T>(payload: T | ApiEnvelope<T>): T {
  const maybe = payload as ApiEnvelope<T>
  return (maybe && typeof maybe === 'object' && 'data' in maybe)
    ? (maybe.data as T)
    : (payload as T)
}

function buildTimeParams(range: '24h' | '7d' | '30d' | '90d') {
  const now = new Date()
  let startDate: Date
  switch (range) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
    case '90d':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
      break
    case '7d':
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  }
  return {
    startDate: startDate.toISOString(),
    endDate: now.toISOString(),
    granularity: range === '24h' ? 'hour' : 'day'
  }
}

export const analyticsApi = {
  timeParams: buildTimeParams,

  async getRealTimeMetrics(range: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<RealTimeMetrics | undefined> {
    const params = buildTimeParams(range)
    const { data } = await api.get('/analytics/real-time-metrics', { params })
    return unwrap<RealTimeMetrics | undefined>(data)
  },

  async getKpiMetrics(range: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<KPIMetric[] | undefined> {
    const params = buildTimeParams(range)
    const { data } = await api.get('/analytics/kpi-metrics', { params })
    const unwrapped = unwrap<KPIMetric[] | undefined>(data)
    return Array.isArray(unwrapped) ? unwrapped : []
  },

  async getDemandForecast(days = 30): Promise<any> {
    const { data } = await api.get('/analytics/demand-forecast', { params: { period: 'day', duration: days } })
    const unwrapped = unwrap<any>(data)
    if (!unwrapped) return { predictions: [] }
    if (!Array.isArray(unwrapped.predictions)) return { ...unwrapped, predictions: [] }
    return unwrapped
  },

  async getCapacityPrediction(range: '24h' | '7d' | '30d' | '90d' = '7d'): Promise<any> {
    const params = buildTimeParams(range)
    const { data } = await api.get('/analytics/capacity-prediction', { params })
    const unwrapped = unwrap<any>(data)
    if (!unwrapped || typeof unwrapped !== 'object') return { currentCapacity: 0, predictedDemand: 0, utilizationRate: 0 }
    const cc = typeof (unwrapped as any).currentCapacity === 'number' ? (unwrapped as any).currentCapacity : 0
    const pd = typeof (unwrapped as any).predictedDemand === 'number' ? (unwrapped as any).predictedDemand : 0
    const ur = typeof (unwrapped as any).utilizationRate === 'number' ? (unwrapped as any).utilizationRate : 0
    return { currentCapacity: cc, predictedDemand: pd, utilizationRate: ur, _raw: (unwrapped as any)._raw ?? null }
  },

  async getChurnPrediction(customerId?: string): Promise<any[]> {
    const { data } = await api.get('/analytics/churn-prediction', { params: customerId ? { customerId } : undefined })
    return unwrap<any[]>(data) || []
  }

  ,async getRevenueAttribution(range: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const params = buildTimeParams(range)
    const { data } = await api.get('/analytics/revenue-attribution', { params })
    return unwrap<any>(data)
  }

  ,async getCostAnalytics(range: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const params = buildTimeParams(range)
    const { data } = await api.get('/analytics/cost-analytics', { params })
    return unwrap<any>(data)
  }

  ,async getROIAnalytics(range: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const params = buildTimeParams(range)
    const { data } = await api.get('/analytics/roi-analytics', { params })
    return unwrap<any>(data)
  }

  ,async getChannelAnalytics(range: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const params = buildTimeParams(range)
    const { data } = await api.get('/analytics/channel-analytics', { params })
    return unwrap<any>(data)
  }

  ,async getAgentPerformance(agentId?: string, range: '24h' | '7d' | '30d' | '90d' = '30d'): Promise<any> {
    const params = { ...buildTimeParams(range), ...(agentId ? { agentId } : {}) }
    const { data } = await api.get('/analytics/agent-performance', { params })
    return unwrap<any>(data)
  }

  ,async listReportTemplates(): Promise<any[]> {
    const { data } = await api.get('/analytics/report-templates')
    return unwrap<any[]>(data)
  }

  ,async createReportTemplate(input: { name: string; category?: string; definition: Record<string, unknown> }): Promise<any> {
    const { data } = await api.post('/analytics/report-templates', input)
    return unwrap<any>(data)
  }

  ,async requestExport(input: { type: 'dashboard' | 'metric' | 'survey'; sourceId?: string; templateId?: string; format: 'pdf' | 'csv' | 'excel' | 'json'; parameters?: Record<string, unknown> }): Promise<any> {
    const { data } = await api.post('/analytics/exports', input)
    return unwrap<any>(data)
  }

  ,async listExports(): Promise<any[]> {
    const { data } = await api.get('/analytics/exports')
    return unwrap<any[]>(data)
  }

  // Executive summary
  ,async getExecutiveSummary(): Promise<{ summary: string }> {
    const { data } = await api.get('/analytics/executive-summary')
    const unwrapped = unwrap<any>(data)
    return { summary: unwrapped?.summary || '' }
  }

  // Schedules
  ,async listSchedules(): Promise<any[]> {
    const { data } = await api.get('/analytics/schedules')
    return unwrap<any[]>(data)
  }

  ,async createSchedule(input: { name?: string; description?: string; type: 'dashboard' | 'metric' | 'survey' | 'custom'; source: string; schedule?: { frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly'; time: string; timezone: string; dayOfWeek?: number; dayOfMonth?: number }; recipients?: { type: 'email' | 'webhook' | 'slack' | 'teams'; address: string; name?: string }[]; format?: 'pdf' | 'excel' | 'csv' | 'json'; filters?: Record<string, unknown> }): Promise<any> {
    const { data } = await api.post('/analytics/schedules', input)
    return unwrap<any>(data)
  }

  // Dashboards
  ,async listDashboards(): Promise<any[]> {
    const { data } = await api.get('/analytics/dashboards')
    return unwrap<any[]>(data)
  }

  ,async createDashboard(input: { name: string; description?: string; layout: any; widgets: any[]; filters?: any[]; isPublic?: boolean }): Promise<any> {
    const { data } = await api.post('/analytics/dashboards', input)
    return unwrap<any>(data)
  }
}

export type { RealTimeMetrics, KPIMetric }


