'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { BarChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { BarChart3 } from 'lucide-react'

export function ConversationsView() {
  const t = useTranslations('analytics')
  const { 
    channelAnalytics,
    isLoading
  } = useAnalyticsStore()

  const channelData = channelAnalytics?.channels ? Object.entries(channelAnalytics.channels).map(([key, value]) => ({
    x: key.charAt(0).toUpperCase() + key.slice(1),
    y: (value as { ticketVolume?: number }).ticketVolume || 0
  })) : []

  return (
    <div className="space-y-6">
      <ChartCard
        title={t('charts.channelPerformance', { fallback: 'Channel Performance' })}
        description={t('charts.channelPerformanceDesc', { fallback: 'Ticket volume and response time by channel' })}
        loading={isLoading}
      >
        {channelData.length > 0 ? (
          <BarChart
            data={channelData}
            color={chartColors.purple}
            height={350}
            horizontal
          />
        ) : (
          <EmptyState
            icon={BarChart3}
            title={t('empty.noPerformance', { fallback: 'No performance data' })}
            description={t('empty.noPerformanceDesc', { fallback: 'Performance metrics will be available soon' })}
          />
        )}
      </ChartCard>
    </div>
  )
}

