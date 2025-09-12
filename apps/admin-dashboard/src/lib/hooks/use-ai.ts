'use client'

import { useEffect } from 'react'
import { useAIStore } from '@/lib/store/ai-store'

export function useAI(range?: '24h' | '7d' | '30d' | '90d') {
  const { timeRange, insights, recent, isLoading, error, setTimeRange, fetchAll, refetch } = useAIStore()

  useEffect(() => {
    if (range && range !== timeRange) setTimeRange(range)
    fetchAll()
  }, [range, timeRange, setTimeRange, fetchAll])

  return { timeRange, insights, recent, isLoading, error, setTimeRange, refetch }
}


