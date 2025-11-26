'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { StatGrid } from '@/components/analytics/core'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { LineChart, BarChart, PieChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { motion } from 'framer-motion'
import { 
  Activity,
  Users, 
  MessageSquare, 
  Clock, 
  CheckCircle2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function OverviewView() {
  const t = useTranslations('analytics')
  const { 
    realTime, 
    kpis,
    channelAnalytics,
    isLoading
  } = useAnalyticsStore()

  const overviewMetrics = realTime ? [
    {
      title: t('metrics.activeTickets', { fallback: 'Active Tickets' }),
      value: realTime.activeTickets || 0,
      change: '+5%',
      trend: 'up' as const,
      icon: Activity,
      color: 'blue' as const,
      loading: isLoading
    },
    {
      title: t('metrics.activeAgents', { fallback: 'Active Agents' }),
      value: realTime.activeAgents || 0,
      change: '+2',
      trend: 'up' as const,
      icon: Users,
      color: 'green' as const,
      loading: isLoading
    },
    {
      title: t('metrics.avgResponseTime', { fallback: 'Avg Response Time' }),
      value: Math.round(realTime.averageResponseTime || 0),
      suffix: 'm',
      change: '-12%',
      trend: 'down' as const,
      icon: Clock,
      color: 'purple' as const,
      loading: isLoading
    },
    {
      title: t('metrics.satisfaction', { fallback: 'Satisfaction' }),
      value: `${Math.round(realTime.customerSatisfactionScore * 100) || 0}%`,
      change: '+3%',
      trend: 'up' as const,
      icon: CheckCircle2,
      color: 'green' as const,
      loading: isLoading
    }
  ] : []

  const channelData = channelAnalytics?.channels ? Object.entries(channelAnalytics.channels).map(([key, value]) => ({
    x: key.charAt(0).toUpperCase() + key.slice(1),
    y: (value as { ticketVolume?: number }).ticketVolume || 0
  })) : []

  const kpiData = kpis ? kpis.slice(0, 6).map(kpi => ({
    x: kpi.name.substring(0, 15),
    y: parseFloat(String(kpi.value)) || 0
  })) : []

  return (
    <div className="space-y-6">
      <StatGrid metrics={overviewMetrics} columns={4} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={t('charts.channelDistribution', { fallback: 'Channel Distribution' })}
          description={t('charts.channelDistributionDesc', { fallback: 'Ticket volume by channel' })}
          loading={isLoading}
        >
          {channelData.length > 0 ? (
            <PieChart 
              data={channelData}
              colors={chartColors.primary}
              height={300}
            />
          ) : (
            <EmptyState
              icon={MessageSquare}
              title={t('empty.noData', { fallback: 'No data available' })}
              description={t('empty.noDataDesc', { fallback: 'Data will appear here once available' })}
            />
          )}
        </ChartCard>

        <ChartCard
          title={t('charts.keyMetrics', { fallback: 'Key Performance Metrics' })}
          description={t('charts.keyMetricsDesc', { fallback: 'Top KPIs for current period' })}
          loading={isLoading}
        >
          {kpiData.length > 0 ? (
            <BarChart
              data={kpiData}
              color={chartColors.blue}
              height={300}
            />
          ) : (
            <EmptyState
              icon={Activity}
              title={t('empty.noMetrics', { fallback: 'No metrics available' })}
              description={t('empty.noMetricsDesc', { fallback: 'KPIs will be calculated soon' })}
            />
          )}
        </ChartCard>
      </div>

      <Card className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-border/50 shadow-lg hover:shadow-xl transition-all">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30">
              <CheckCircle2 className="h-5 w-5 text-white" />
            </div>
            {t('sla.compliance', { fallback: 'SLA Compliance' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div 
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-200 dark:border-green-800/50 shadow-sm"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <div className="text-4xl font-bold text-green-600 dark:text-green-400">95%</div>
              <div className="text-sm text-muted-foreground mt-2">{t('sla.responseTime', { fallback: 'Response Time' })}</div>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-200 dark:border-blue-800/50 shadow-sm"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">92%</div>
              <div className="text-sm text-muted-foreground mt-2">{t('sla.resolutionTime', { fallback: 'Resolution Time' })}</div>
            </motion.div>
            <motion.div 
              className="flex flex-col items-center justify-center p-6 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-200 dark:border-purple-800/50 shadow-sm"
              whileHover={{ scale: 1.05, y: -2 }}
            >
              <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">98%</div>
              <div className="text-sm text-muted-foreground mt-2">{t('sla.overall', { fallback: 'Overall' })}</div>
            </motion.div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

