'use client'

import React, { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { StatGrid } from '@/components/analytics/core'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { LineChart, BarChart, PieChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { motion } from 'framer-motion'
import { 
  Phone, 
  Clock, 
  Activity,
  Target,
  Waves,
  Signal
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CallsView() {
  const t = useTranslations('calls')
  const { 
    fetchCalls,
    callAnalytics,
    callTrends,
    isLoadingCalls
  } = useAnalyticsStore()

  useEffect(() => {
    fetchCalls()
  }, [fetchCalls])

  const callMetrics = callAnalytics && callAnalytics.totals ? [
    {
      title: t('analytics.totalCalls', { fallback: 'Total Calls' }),
      value: callAnalytics.totals?.totalCalls || 0,
      icon: Phone,
      color: 'blue' as const,
      loading: isLoadingCalls
    },
    {
      title: t('analytics.activeCalls', { fallback: 'Active Calls' }),
      value: callAnalytics.totals?.activeCalls || 0,
      icon: Activity,
      color: 'green' as const,
      loading: isLoadingCalls
    },
    {
      title: t('analytics.avgDuration', { fallback: 'Avg Duration' }),
      value: (callAnalytics.totals?.totalCalls || 0) > 0 
        ? Math.round((callAnalytics.totals?.totalDurationSec || 0) / (callAnalytics.totals?.totalCalls || 1) / 60) 
        : 0,
      suffix: 'm',
      icon: Clock,
      color: 'purple' as const,
      loading: isLoadingCalls
    },
    {
      title: t('analytics.callQuality', { fallback: 'Call Quality' }),
      value: callAnalytics.quality24h?.avgRttMs !== undefined 
        ? `${callAnalytics.quality24h.avgRttMs < 200 ? 'Excellent' : 'Good'}`
        : 'N/A',
      icon: Target,
      color: 'green' as const,
      loading: isLoadingCalls
    }
  ] : []

  const callTrendsData = callTrends ? callTrends.map(trend => ({
    x: new Date(trend.date),
    y: trend.totalCalls
  })) : []

  return (
    <div className="space-y-6">
      <StatGrid metrics={callMetrics} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={t('analytics.trends', { fallback: 'Call Volume Trends' })}
          description={t('analytics.trendsDesc', { fallback: 'Daily call volume over time' })}
          loading={isLoadingCalls}
        >
          {callTrendsData.length > 0 ? (
            <LineChart
              data={callTrendsData}
              color={chartColors.blue}
              height={300}
              formatY={(y) => `${y} calls`}
            />
          ) : (
            <EmptyState
              icon={Phone}
              title={t('analytics.noCalls', { fallback: 'No call data' })}
              description={t('analytics.noCallsDesc', { fallback: 'Call analytics will be available soon' })}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t('analytics.breakdown', { fallback: 'Call Type Breakdown' })}
          description={t('analytics.breakdownDesc', { fallback: 'Distribution by call type' })}
          loading={isLoadingCalls}
        >
          {callAnalytics?.breakdown?.byType ? (
            <PieChart
              data={Object.entries(callAnalytics.breakdown.byType).map(([key, value]) => ({
                x: key.charAt(0).toUpperCase() + key.slice(1),
                y: value as number
              }))}
              colors={chartColors.primary}
              height={300}
              innerRadius={60}
            />
          ) : (
            <EmptyState
              icon={Phone}
              title={t('analytics.noBreakdown', { fallback: 'No breakdown data' })}
              description={t('analytics.noBreakdownDesc', { fallback: 'Call breakdown will be calculated soon' })}
            />
          )}
        </ChartCard>
      </div>

      {callAnalytics?.quality24h && (
        <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl transition-all">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30">
                <Target className="h-5 w-5 text-white" />
              </div>
              {t('analytics.qualityMetrics', { fallback: 'Call Quality Metrics (24h)' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <motion.div 
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800/50 shadow-sm"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{Math.round(callAnalytics.quality24h?.avgRttMs || 0)}ms</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.rtt', { fallback: 'RTT' })}</div>
              </motion.div>
              <motion.div 
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-200 dark:border-purple-800/50 shadow-sm"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(callAnalytics.quality24h?.avgJitterMs || 0)}ms</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.jitter', { fallback: 'Jitter' })}</div>
              </motion.div>
              <motion.div 
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-200 dark:border-green-800/50 shadow-sm"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round((callAnalytics.quality24h?.avgBitrateUp || 0) / 1000)}kbps</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.bitrateUp', { fallback: 'Bitrate ↑' })}</div>
              </motion.div>
              <motion.div 
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-200 dark:border-emerald-800/50 shadow-sm"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{Math.round((callAnalytics.quality24h?.avgBitrateDown || 0) / 1000)}kbps</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.bitrateDown', { fallback: 'Bitrate ↓' })}</div>
              </motion.div>
              <motion.div 
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-200 dark:border-orange-800/50 shadow-sm"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{(callAnalytics.quality24h?.avgPacketLossUp || 0).toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.packetLossUp', { fallback: 'Loss ↑' })}</div>
              </motion.div>
              <motion.div 
                className="flex flex-col items-center justify-center p-4 rounded-xl bg-gradient-to-br from-red-500/10 to-red-500/5 border border-red-200 dark:border-red-800/50 shadow-sm"
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{(callAnalytics.quality24h?.avgPacketLossDown || 0).toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.packetLossDown', { fallback: 'Loss ↓' })}</div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

