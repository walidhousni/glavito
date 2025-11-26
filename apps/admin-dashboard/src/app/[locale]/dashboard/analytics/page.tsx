'use client'

import React, { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAnalyticsStore, type AnalyticsType } from '@/lib/store/analytics-store'
import { AnalyticsTypeSelector } from '@/components/analytics/analytics-type-selector'
import { Button } from '@/components/ui/button'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Gradient Background Blobs */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 dark:from-blue-600/10 dark:via-purple-600/10 dark:to-pink-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-emerald-500/20 via-cyan-500/20 to-blue-500/20 dark:from-emerald-600/10 dark:via-cyan-600/10 dark:to-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="p-6 space-y-6 relative">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between flex-wrap gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 dark:from-blue-600 dark:to-purple-700 shadow-lg shadow-blue-500/30 dark:shadow-blue-600/20">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Analytics Dashboard</h1>
              <p className="text-sm text-muted-foreground">Track and analyze your business metrics</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-2 hover:border-primary/50 transition-colors"
              onClick={() => fetchAll()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-10 px-4 rounded-xl border-2 hover:border-primary/50 transition-colors"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </motion.div>

        {/* Type Selector and Time Range */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex items-center justify-between flex-wrap gap-4 p-4 rounded-2xl bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 shadow-sm"
        >
          <AnalyticsTypeSelector />

          {/* Time Range Selector */}
          <div className="flex items-center gap-2">
            {timeRanges.map((range) => (
              <Button
                key={range.value}
                variant={timeRange === range.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange(range.value)}
                className={`h-10 px-4 rounded-xl transition-all ${
                  timeRange === range.value
                    ? 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg shadow-blue-500/30'
                    : 'border-2 hover:border-primary/50'
                }`}
              >
                {range.label}
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Analytics Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentType}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <CurrentView />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
