'use client'

import { useState, useEffect, useCallback } from 'react'
import { RealTimeMetrics, KPIMetric, DemandForecast, CapacityPrediction, ChurnPrediction } from '@/types/analytics'
import { api } from '@/lib/api/config'

function getPublicApiBase(): string {
  // Ensure we point to the API prefix consistently
  const base = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL) || 'http://localhost:3001/api'
  return base.endsWith('/api') ? base : `${base.replace(/\/$/, '')}/api`
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {}
  const stored = window.localStorage.getItem('auth-storage')
  if (!stored) return {}
  try {
    const parsed = JSON.parse(stored)
    const token = parsed?.state?.tokens?.accessToken
    return token ? { Authorization: `Bearer ${token}` } : {}
  } catch (_e) {
    // ignore JSON parse errors in SSR/prerender contexts
    return {}
  }
}

interface UseAnalyticsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseAnalyticsReturn {
  realTimeMetrics?: RealTimeMetrics
  kpiMetrics?: KPIMetric[]
  demandForecast?: DemandForecast
  capacityPrediction?: CapacityPrediction
  churnPrediction?: ChurnPrediction[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export function useAnalytics(
  tenantId: string, 
  timeRange = '7d',
  options: UseAnalyticsOptions = {}
): UseAnalyticsReturn {
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetrics>()
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetric[]>()
  const [demandForecast, setDemandForecast] = useState<DemandForecast>()
  const [capacityPrediction, setCapacityPrediction] = useState<CapacityPrediction>()
  const [churnPrediction, setChurnPrediction] = useState<ChurnPrediction[]>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { autoRefresh = true, refreshInterval = 30000 } = options

  const getTimeRangeParams = useCallback((range: string) => {
    const now = new Date()
    let startDate: Date
    
    switch (range) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
        break
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      case '90d':
        startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    }

    return {
      startDate: startDate.toISOString(),
      endDate: now.toISOString(),
      granularity: range === '24h' ? 'hour' : range === '7d' ? 'day' : 'day'
    }
  }, [])

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const timeParams = getTimeRangeParams(timeRange)

      // Real-time metrics
      const realTimeResp = await api.get('/analytics/real-time-metrics', { params: timeParams })
      setRealTimeMetrics(realTimeResp.data?.data)

      // KPI metrics
      const kpiResp = await api.get('/analytics/kpi-metrics', { params: timeParams })
      setKpiMetrics(Array.isArray(kpiResp.data?.data) ? kpiResp.data.data : [])

      // Demand forecast
      const forecastResp = await api.get('/analytics/demand-forecast', { params: { period: 'day', duration: 30 } })
      setDemandForecast(forecastResp.data?.data)

      // Capacity prediction
      const capacityResp = await api.get('/analytics/capacity-prediction', { params: timeParams })
      setCapacityPrediction(capacityResp.data?.data)

      // Churn prediction
      const churnResp = await api.get('/analytics/churn-prediction')
      setChurnPrediction(Array.isArray(churnResp.data?.data) ? churnResp.data.data : [])

    } catch (err) {
      console.error('Failed to fetch analytics data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, timeRange, getTimeRangeParams])

  const refetch = useCallback(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  useEffect(() => {
    fetchAnalyticsData()
  }, [fetchAnalyticsData])

  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAnalyticsData()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, fetchAnalyticsData])

  return {
    realTimeMetrics,
    kpiMetrics,
    demandForecast,
    capacityPrediction,
    churnPrediction,
    isLoading,
    error,
    refetch
  }
}

// Hook for specific analytics endpoints
export function useKPIMetrics(tenantId: string, kpiIds: string[], timeRange?: string) {
  const [metrics, setMetrics] = useState<KPIMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKPIMetrics = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const params: Record<string, string> = { kpiIds: kpiIds.join(',') }

        if (timeRange) {
          const now = new Date()
          let startDate: Date
          switch (timeRange) {
            case '24h':
              startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
              break
            case '7d':
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
              break
            case '30d':
              startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
              break
            default:
              startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          }
          params.startDate = startDate.toISOString()
          params.endDate = now.toISOString()
        }

        const { data } = await api.get('/analytics/kpi-metrics', { params })
        setMetrics(Array.isArray(data?.data) ? data.data : [])
      } catch (err) {
        console.error('Failed to fetch KPI metrics:', err)
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    if (tenantId && kpiIds.length > 0) {
      fetchKPIMetrics()
    }
  }, [tenantId, kpiIds, timeRange])

  return { metrics, isLoading, error }
}

export function useCustomReports(tenantId: string) {
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchReports = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const { data } = await api.get('/analytics/custom-reports')
      setReports(data?.data ?? [])
    } catch (err) {
      console.error('Failed to fetch custom reports:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [tenantId])

  const createReport = useCallback(async (reportDefinition: any) => {
    try {
      const { data } = await api.post('/analytics/custom-reports', reportDefinition)
      await fetchReports()
      return data?.data
    } catch (err) {
      console.error('Failed to create custom report:', err)
      throw err
    }
  }, [tenantId, fetchReports])

  const executeReport = useCallback(async (reportId: string, parameters?: Record<string, any>) => {
    try {
      const { data } = await api.post(`/analytics/custom-reports/${reportId}/execute`, { parameters })
      return data?.data
    } catch (err) {
      console.error('Failed to execute custom report:', err)
      throw err
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) {
      fetchReports()
    }
  }, [tenantId, fetchReports])

  return {
    reports,
    isLoading,
    error,
    createReport,
    executeReport,
    refetch: fetchReports
  }
}

export function useDashboards(tenantId: string, userId?: string) {
  const [dashboards, setDashboards] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboards = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params: Record<string, string> = {}
      if (userId) params.userId = userId
      const { data } = await api.get('/analytics/dashboards', { params })
      setDashboards(data?.data ?? [])
    } catch (err) {
      console.error('Failed to fetch dashboards:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, userId])

  const createDashboard = useCallback(async (dashboardDefinition: any) => {
    try {
      const { data } = await api.post('/analytics/dashboards', dashboardDefinition)
      await fetchDashboards()
      return data?.data
    } catch (err) {
      console.error('Failed to create dashboard:', err)
      throw err
    }
  }, [tenantId, fetchDashboards])

  useEffect(() => {
    if (tenantId) {
      fetchDashboards()
    }
  }, [tenantId, fetchDashboards])

  return {
    dashboards,
    isLoading,
    error,
    createDashboard,
    refetch: fetchDashboards
  }
}