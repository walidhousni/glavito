'use client'

import { useState, useEffect, useCallback } from 'react'
import { DemandForecast, CapacityPrediction, ChurnPrediction } from '@/types/analytics'
import { analyticsApi } from '@/lib/api/analytics-client'
import api from '@/lib/api/config'
import type { RealTimeMetricsUI, KPIMetricUI } from '@glavito/shared-types'

// API base and auth handled by analyticsApi

interface UseAnalyticsOptions {
  autoRefresh?: boolean
  refreshInterval?: number
}

interface UseAnalyticsReturn {
  realTimeMetrics?: RealTimeMetricsUI
  kpiMetrics?: KPIMetricUI[]
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
  const [realTimeMetrics, setRealTimeMetrics] = useState<RealTimeMetricsUI>()
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetricUI[]>()
  const [demandForecast, setDemandForecast] = useState<DemandForecast>()
  const [capacityPrediction, setCapacityPrediction] = useState<CapacityPrediction>()
  const [churnPrediction, setChurnPrediction] = useState<ChurnPrediction[]>()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { autoRefresh = true, refreshInterval = 30000 } = options

  // Removed timeParams - not needed

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const range = (['24h','7d','30d','90d'].includes(timeRange) ? timeRange : '7d') as '24h' | '7d' | '30d' | '90d'

      // Real-time metrics
      const realTime = await analyticsApi.getRealTimeMetrics(range)
      setRealTimeMetrics(realTime)

      // KPI metrics
      const kpis = await analyticsApi.getKpiMetrics(range)
      setKpiMetrics(kpis)

      // Demand forecast
      const forecast = await analyticsApi.getDemandForecast(30)
      setDemandForecast(forecast)

      // Capacity prediction
      const capacity = await analyticsApi.getCapacityPrediction(range)
      setCapacityPrediction(capacity)

      // Churn prediction
      const churn = await analyticsApi.getChurnPrediction()
      setChurnPrediction(Array.isArray(churn) ? churn : [])

    } catch (err) {
      console.error('Failed to fetch analytics data:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [tenantId, timeRange])

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
  const [metrics, setMetrics] = useState<KPIMetricUI[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchKPIMetrics = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const range = (timeRange && ['24h','7d','30d','90d'].includes(timeRange)) ? (timeRange as '24h' | '7d' | '30d' | '90d') : '7d'
        const result = await analyticsApi.getKpiMetrics(range)
        setMetrics(Array.isArray(result) ? result : [])
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