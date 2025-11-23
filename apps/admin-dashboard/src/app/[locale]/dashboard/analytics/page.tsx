'use client'

import React, { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAnalyticsStore, type AnalyticsType } from '@/lib/store/analytics-store'
import { AnalyticsTypeSelector } from '@/components/analytics/analytics-type-selector'
import { Button } from '@/components/ui/button'
import { BarChart3 } from 'lucide-react'
import { motion } from 'framer-motion'
import {
  OverviewView,
  ConversationsView,
  SalesView,
  ConversionView,
  CampaignView,
  PerformanceView,
  CallsView,
  FinancialView,
  PredictiveView,
  SatisfactionView,
  ReportsView,
  DashboardsView,
} from '@/components/analytics/views'

type TimeRange = '24h' | '7d' | '30d' | '90d'

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' }
]

const viewMap: Record<AnalyticsType, React.ComponentType> = {
  overview: OverviewView,
  conversations: ConversationsView,
  sales: SalesView,
  conversion: ConversionView,
  campaign: CampaignView,
  performance: PerformanceView,
  calls: CallsView,
  financial: FinancialView,
  predictive: PredictiveView,
  satisfaction: SatisfactionView,
  reports: ReportsView,
  dashboards: DashboardsView,
}

export default function AnalyticsPage() {
  const searchParams = useSearchParams()
  const { 
    timeRange, 
    setTimeRange, 
    analyticsType,
    setAnalyticsType,
    fetchAll, 
    fetchCalls,
  } = useAnalyticsStore()

  // Get type from URL query param or use store default
  const currentType = (searchParams.get('type') as AnalyticsType) || analyticsType || 'overview'

  // Sync store with URL
  useEffect(() => {
    if (currentType !== analyticsType) {
      setAnalyticsType(currentType)
    }
  }, [currentType, analyticsType, setAnalyticsType])

  useEffect(() => {
    fetchAll()
    if (currentType === 'calls') {
    fetchCalls()
    }
  }, [fetchAll, fetchCalls, currentType])

  useEffect(() => {
    fetchAll()
  }, [timeRange, fetchAll])

  const CurrentView = viewMap[currentType] || OverviewView

  return (
    <div className="min-h-screen gradient-bg-primary p-6 space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div className="flex items-center gap-4">
            <BarChart3 className="h-8 w-8" />
          <AnalyticsTypeSelector />
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range.value)}
              className={timeRange === range.value ? 'time-range-btn-active' : 'time-range-btn'}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Analytics Content */}
      <motion.div
        key={currentType}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <CurrentView />
      </motion.div>
    </div>
  )
}
