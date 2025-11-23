'use client'

import React, { useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { StatGrid } from '@/components/analytics/core'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { LineChart, BarChart, PieChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
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
        <Card className="analytics-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {t('analytics.qualityMetrics', { fallback: 'Call Quality Metrics (24h)' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold">{Math.round(callAnalytics.quality24h?.avgRttMs || 0)}ms</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.rtt', { fallback: 'RTT' })}</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold">{Math.round(callAnalytics.quality24h?.avgJitterMs || 0)}ms</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.jitter', { fallback: 'Jitter' })}</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold">{Math.round((callAnalytics.quality24h?.avgBitrateUp || 0) / 1000)}kbps</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.bitrateUp', { fallback: 'Bitrate ↑' })}</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold">{Math.round((callAnalytics.quality24h?.avgBitrateDown || 0) / 1000)}kbps</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.bitrateDown', { fallback: 'Bitrate ↓' })}</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold">{(callAnalytics.quality24h?.avgPacketLossUp || 0).toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.packetLossUp', { fallback: 'Loss ↑' })}</div>
              </div>
              <div className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/30">
                <div className="text-2xl font-bold">{(callAnalytics.quality24h?.avgPacketLossDown || 0).toFixed(2)}%</div>
                <div className="text-xs text-muted-foreground mt-1">{t('analytics.packetLossDown', { fallback: 'Loss ↓' })}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

