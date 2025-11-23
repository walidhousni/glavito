'use client'

import React from 'react'
import { useTranslations } from 'next-intl'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { ChartCard } from '@/components/analytics/core'
import { EmptyState } from '@/components/analytics/core'
import { AreaChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { 
  Zap,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PredictiveView() {
  const t = useTranslations('analytics')
  const { 
    forecast,
    isLoading
  } = useAnalyticsStore()

  const forecastData = forecast?.predictions ? forecast.predictions.map((pred: { date: string; ticketVolume?: number }) => ({
    x: new Date(pred.date),
    y: pred.ticketVolume || 0
  })) : []

  return (
    <div className="space-y-6">
      <ChartCard
        title={t('predictive.demandForecast', { fallback: 'Demand Forecast' })}
        description={t('predictive.demandForecastDesc', { fallback: 'Predicted ticket volume for next 30 days' })}
        loading={isLoading}
      >
        {forecastData.length > 0 ? (
          <AreaChart
            data={forecastData}
            color={chartColors.purple}
            height={350}
            formatY={(y) => `${Math.round(y)} tickets`}
          />
        ) : (
          <EmptyState
            icon={Zap}
            title={t('empty.noForecast', { fallback: 'No forecast data' })}
            description={t('empty.noForecastDesc', { fallback: 'Predictions will be generated soon' })}
          />
        )}
      </ChartCard>

      <Card className="analytics-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('predictive.capacityPlanning', { fallback: 'Capacity Planning' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{t('predictive.currentUtilization', { fallback: 'Current Utilization' })}</span>
              <span className="text-sm font-bold">78%</span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-progress-fill" style={{ width: '78%' }} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                <div className="text-xs text-muted-foreground">{t('predictive.recommended', { fallback: 'Recommended' })}</div>
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">+2</div>
                <div className="text-xs text-muted-foreground mt-1">{t('predictive.additionalAgentsNeeded', { fallback: 'Additional agents needed' })}</div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
                <div className="text-xs text-muted-foreground">{t('predictive.peakHours', { fallback: 'Peak Hours' })}</div>
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">2-6PM</div>
                <div className="text-xs text-muted-foreground mt-1">{t('predictive.highestDemandPeriod', { fallback: 'Highest demand period' })}</div>
              </div>
              <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                <div className="text-xs text-muted-foreground">{t('predictive.efficiency', { fallback: 'Efficiency' })}</div>
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1">92%</div>
                <div className="text-xs text-muted-foreground mt-1">{t('predictive.teamProductivityScore', { fallback: 'Team productivity score' })}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

