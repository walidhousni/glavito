'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { StatGrid } from '@/components/analytics/core'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { PieChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { 
  DollarSign,
  TrendingUp, 
  Target,
  AlertCircle
} from 'lucide-react'

export function FinancialView() {
  const t = useTranslations('analytics')
  const { 
    revenueAttribution,
    costAnalytics,
    isLoading
  } = useAnalyticsStore()

  const revenueMetrics = revenueAttribution ? [
    {
      title: t('revenue.total', { fallback: 'Total Revenue' }),
      value: revenueAttribution.totalRevenue || 0,
      prefix: '$',
      change: revenueAttribution.revenueChange || '+0%',
      trend: 'up' as const,
      icon: DollarSign,
      color: 'green' as const,
      loading: isLoading
    },
    {
      title: t('revenue.costs', { fallback: 'Total Costs' }),
      value: costAnalytics?.totalCost || 0,
      prefix: '$',
      icon: TrendingUp,
      color: 'orange' as const,
      loading: isLoading
    },
    {
      title: t('revenue.roi', { fallback: 'ROI' }),
      value: `${revenueAttribution.roi || 0}%`,
      change: '+12%',
      trend: 'up' as const,
      icon: Target,
      color: 'purple' as const,
      loading: isLoading
    }
  ] : []

  return (
    <div className="space-y-6">
      <StatGrid metrics={revenueMetrics} columns={3} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={t('financial.revenueByChannel', { fallback: 'Revenue by Channel' })}
          description={t('financial.revenueByChannelDesc', { fallback: 'Revenue attribution by channel' })}
          loading={isLoading}
        >
          {revenueAttribution?.byChannel ? (
            <PieChart
              data={Object.entries(revenueAttribution.byChannel).map(([key, value]) => ({
                x: key.charAt(0).toUpperCase() + key.slice(1),
                y: (value as { revenue?: number }).revenue || 0
              }))}
              colors={chartColors.primary}
              height={300}
            />
          ) : (
            <EmptyState
              icon={DollarSign}
              title={t('empty.noRevenue', { fallback: 'No revenue data' })}
              description={t('empty.noRevenueDesc', { fallback: 'Revenue metrics will be available soon' })}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t('financial.costBreakdown', { fallback: 'Cost Breakdown' })}
          description={t('financial.costBreakdownDesc', { fallback: 'Operational costs by category' })}
          loading={isLoading}
        >
          {costAnalytics?.breakdown ? (
            <PieChart
              data={Object.entries(costAnalytics.breakdown).map(([key, value]) => ({
                x: key.charAt(0).toUpperCase() + key.slice(1),
                y: value as number
              }))}
              colors={[chartColors.orange, chartColors.red, chartColors.pink]}
              height={300}
              innerRadius={60}
            />
          ) : (
            <EmptyState
              icon={AlertCircle}
              title={t('empty.noCosts', { fallback: 'No cost data' })}
              description={t('empty.noCostsDesc', { fallback: 'Cost analytics will be calculated soon' })}
            />
          )}
        </ChartCard>
      </div>
    </div>
  )
}

