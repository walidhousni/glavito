'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { BarChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { Users } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PerformanceView() {
  const t = useTranslations('analytics')
  const { 
    channelAnalytics,
    agentPerformance,
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
            icon={Users}
            title={t('empty.noPerformance', { fallback: 'No performance data' })}
            description={t('empty.noPerformanceDesc', { fallback: 'Performance metrics will be available soon' })}
          />
        )}
      </ChartCard>

      {agentPerformance && agentPerformance.length > 0 && (
        <Card className="analytics-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {t('agents.topPerformers', { fallback: 'Top Performing Agents' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>{t('agents.agent', { fallback: 'Agent' })}</th>
                    <th>{t('agents.ticketsResolved', { fallback: 'Tickets Resolved' })}</th>
                    <th>{t('agents.avgResponseTime', { fallback: 'Avg Response Time' })}</th>
                    <th>{t('agents.satisfaction', { fallback: 'Satisfaction' })}</th>
                    <th>{t('agents.productivity', { fallback: 'Productivity' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {agentPerformance.slice(0, 10).map((agent: { agentName?: string; ticketsResolved?: number; avgResponseTime?: number; satisfaction?: number; productivity?: number }, idx: number) => {
                    const agentData = agent
                    return (
                      <tr key={idx}>
                        <td className="font-medium">{agentData.agentName || 'Agent ' + (idx + 1)}</td>
                        <td>{agentData.ticketsResolved || 0}</td>
                        <td>{agentData.avgResponseTime || 0}m</td>
                        <td>{agentData.satisfaction || 0}%</td>
                        <td>
                          <span className={(agentData.productivity ?? 0) >= 90 ? 'quality-excellent px-2 py-1 rounded-full text-xs' : 'quality-good px-2 py-1 rounded-full text-xs'}>
                            {agentData.productivity || 0}%
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

