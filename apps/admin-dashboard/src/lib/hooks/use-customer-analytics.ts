'use client'

import { useCallback, useEffect, useState } from 'react'
import { customersApi } from '@/lib/api/customers-client'

export interface CustomerHealthScore {
  score: number
  factors: {
    ticketVolume: number
    responseTime: number
    satisfaction: number
    engagement: number
    churnRisk: number
  }
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
  recommendations: string[]
}

export function useCustomerHealth(customerId?: string) {
  const [data, setData] = useState<CustomerHealthScore | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIt = useCallback(async () => {
    if (!customerId) return
    try {
      setLoading(true)
      setError(null)
      const res = await customersApi.getHealth(customerId)
      if (res) setData(res as CustomerHealthScore)
    } catch (e: any) {
      setError(e?.message || 'Failed to load health score')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { fetchIt() }, [fetchIt])

  return { data, loading, error, refetch: fetchIt }
}

export function useCustomerLifetimeValue(customerId?: string) {
  const [data, setData] = useState<{
    totalValue: number
    predictedValue: number
    averageOrderValue: number
    purchaseFrequency: number
    customerLifespan: number
    profitMargin: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIt = useCallback(async () => {
    if (!customerId) return
    try {
      setLoading(true)
      setError(null)
      const res = await customersApi.getLifetimeValue(customerId)
      if (res) setData(res)
    } catch (e: any) {
      setError(e?.message || 'Failed to load lifetime value')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { fetchIt() }, [fetchIt])

  return { data, loading, error, refetch: fetchIt }
}

export function useCustomerInsights(customerId?: string) {
  const [data, setData] = useState<{
    keyInsights: string[]
    riskFactors: string[]
    opportunities: string[]
    nextBestActions: string[]
    sentimentAnalysis?: { overall: 'positive' | 'negative' | 'neutral'; score: number; trend: 'improving' | 'stable' | 'declining' }
    behavioralAnalysis?: { recentActivity: Array<{ type: string; count: number }>; channelPreference: Array<{ channel: string; percentage: number }> }
    explanation?: string
    confidence?: number
  } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchIt = useCallback(async () => {
    if (!customerId) return
    try {
      setLoading(true)
      setError(null)
      const res = await customersApi.getInsights(customerId)
      setData(res)
    } catch (e: any) {
      setError(e?.message || 'Failed to load insights')
    } finally {
      setLoading(false)
    }
  }, [customerId])

  useEffect(() => { fetchIt() }, [fetchIt])

  return { data, loading, error, refetch: fetchIt }
}


