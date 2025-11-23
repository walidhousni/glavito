'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Activity,
  BarChart3,
  DollarSign,
  Target
} from 'lucide-react'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { useTranslations } from 'next-intl'
import { StatGrid, ChartCard, EmptyState, type StatGridMetric } from '@/components/analytics/core'
import { BarChart, AreaChart, PieChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { motion } from 'framer-motion'

interface AnalyticsDashboardProps {
  tenantId: string
}

type TimeRange = '24h' | '7d' | '30d' | '90d'

const timeRanges: { value: TimeRange; label: string }[] = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' }
]

export function AnalyticsDashboard({ tenantId }: AnalyticsDashboardProps) {
  const t = useTranslations('analytics')
  const [activeTab, setActiveTab] = useState('overview')
  
  const { 
    timeRange, 
    setTimeRange, 
    realTime, 
    kpis,
    forecast,
    capacity,
    churn,
    revenueAttribution,
    costAnalytics,
    roiAnalytics,
    channelAnalytics,
    isLoading,
    error,
    refetch
  } = useAnalyticsStore()

  const handleTimeRangeChange = (range: TimeRange) => {
    setTimeRange(range)
    refetch()
  }

  // Transform real-time metrics
  const realTimeMetricsArray: StatGridMetric[] = realTime ? [
    {
      title: t('ui.realtime.activeTickets', { fallback: 'Active Tickets' }),
      value: realTime.activeTickets || 0,
      icon: Activity,
      color: 'blue',
      loading: isLoading
    },
    {
      title: t('ui.realtime.activeAgents', { fallback: 'Active Agents' }),
      value: realTime.activeAgents || 0,
      icon: Users,
      color: 'green',
      loading: isLoading
    },
    {
      title: t('ui.realtime.avgResponseTime', { fallback: 'Avg Response' }),
      value: Math.round(realTime.averageResponseTime || 0),
      suffix: 'm',
      icon: Clock,
      color: 'purple',
      loading: isLoading
    },
    {
      title: t('ui.realtime.customerSatisfaction', { fallback: 'CSAT' }),
      value: `${Math.round((realTime.customerSatisfactionScore || 0) * 100)}%`,
      icon: CheckCircle,
      color: 'green',
      loading: isLoading
    }
  ] : []

  // Transform KPI metrics
  const kpiData = kpis ? kpis.slice(0, 6).map(kpi => ({
    x: kpi.name.substring(0, 15),
    y: kpi.value || 0
  })) : []

  // Transform forecast data
  const forecastData = forecast?.predictions ? forecast.predictions.map((pred: { date: string; ticketVolume?: number }) => ({
    x: new Date(pred.date),
    y: pred.ticketVolume || 0
  })) : []

  // Transform channel data
  const channelData = channelAnalytics?.channels ? Object.entries(channelAnalytics.channels).map(([key, value]) => ({
    x: key.charAt(0).toUpperCase() + key.slice(1),
    y: (value as { ticketVolume?: number }).ticketVolume || 0
  })) : []

  // Transform churn data
  const churnItems = churn && Array.isArray(churn) ? churn.slice(0, 5) : []

  if (isLoading && !realTime) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="chart-loading-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
          <p className="text-red-500">{t('ui.loadingFailed', { fallback: 'Failed to load analytics' })}</p>
          <Button onClick={refetch}>{t('ui.retry', { fallback: 'Retry' })}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold gradient-text">{t('ui.title', { fallback: 'Analytics Dashboard' })}</h1>
          <p className="text-muted-foreground mt-1">{t('ui.subtitle', { fallback: 'Comprehensive insights' })}</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          {timeRanges.map((range) => (
            <Button
              key={range.value}
              variant={timeRange === range.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleTimeRangeChange(range.value)}
              className={timeRange === range.value ? 'time-range-btn-active' : 'time-range-btn'}
            >
              {range.label}
            </Button>
          ))}
        </div>
      </motion.div>

      {/* Real-Time Metrics */}
      <StatGrid metrics={realTimeMetricsArray} columns={4} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/50 backdrop-blur-md border border-border/50">
          <TabsTrigger value="overview">
            <Activity className="h-4 w-4 mr-2" />
            {t('ui.tabs.overview', { fallback: 'Overview' })}
          </TabsTrigger>
          <TabsTrigger value="performance">
            <TrendingUp className="h-4 w-4 mr-2" />
            {t('ui.tabs.performance', { fallback: 'Performance' })}
          </TabsTrigger>
          <TabsTrigger value="predictive">
            <Target className="h-4 w-4 mr-2" />
            {t('ui.tabs.predictive', { fallback: 'Predictive' })}
          </TabsTrigger>
          <TabsTrigger value="financial">
            <DollarSign className="h-4 w-4 mr-2" />
            {t('ui.tabs.financial', { fallback: 'Financial' })}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Channel Distribution */}
            <ChartCard
              title={t('ui.charts.channelDistribution', { fallback: 'Channel Distribution' })}
              description={t('ui.charts.channelDistributionDesc', { fallback: 'Tickets by channel' })}
              loading={isLoading}
              icon={<BarChart3 className="h-5 w-5 text-blue-500" />}
            >
              {channelData.length > 0 ? (
                <PieChart
                  data={channelData}
                  colors={chartColors.primary}
                  height={300}
                />
              ) : (
                <EmptyState
                  icon={Activity}
                  title={t('ui.noData', { fallback: 'No data' })}
                  description={t('ui.charts.channelDistributionDesc', { fallback: 'Data will appear here' })}
                />
              )}
            </ChartCard>

            {/* KPI Metrics */}
            <ChartCard
              title={t('ui.kpi.title', { fallback: 'Key Performance Metrics' })}
              description={t('ui.kpi.subtitle', { fallback: 'Top KPIs' })}
              loading={isLoading}
              icon={<Target className="h-5 w-5 text-purple-500" />}
            >
              {kpiData.length > 0 ? (
                <BarChart
                  data={kpiData}
                  color={chartColors.purple}
                  height={300}
                />
              ) : (
                <EmptyState
                  icon={Target}
                  title={t('ui.noData', { fallback: 'No KPIs' })}
                  description="KPI metrics will appear here"
                />
              )}
            </ChartCard>
          </div>

          {/* SLA Compliance */}
          <Card className="analytics-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                {t('ui.charts.slaCompliance', { fallback: 'SLA Compliance' })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Response Time SLA</span>
                    <span className="text-sm font-bold">95%</span>
                  </div>
                  <Progress value={95} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Resolution Time SLA</span>
                    <span className="text-sm font-bold">92%</span>
                  </div>
                  <Progress value={92} className="h-2" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Overall Compliance</span>
                    <span className="text-sm font-bold">94%</span>
                  </div>
                  <Progress value={94} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-6">
          <ChartCard
            title={t('ui.performance.topChannels', { fallback: 'Top Channels' })}
            description={t('ui.performance.topChannelsDesc', { fallback: 'Highest volume channels' })}
            loading={isLoading}
          >
            {channelData.length > 0 ? (
              <BarChart
                data={channelData}
                color={chartColors.green}
                height={350}
                horizontal
              />
            ) : (
              <EmptyState
                icon={BarChart3}
                title="No channel data"
                description="Channel performance will appear here"
              />
            )}
          </ChartCard>
        </TabsContent>

        {/* Predictive Tab */}
        <TabsContent value="predictive" className="space-y-6">
          <ChartCard
            title={t('ui.predictive.demandForecast', { fallback: 'Demand Forecast' })}
            description={t('ui.predictive.demandForecastDesc', { fallback: 'Predicted ticket volume' })}
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
                icon={TrendingUp}
                title={t('ui.predictive.noForecast', { fallback: 'No forecast data' })}
                description="Predictions will appear here"
              />
            )}
          </ChartCard>

          {/* Capacity Analysis */}
          {capacity && (
            <Card className="analytics-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {t('ui.predictive.capacityAnalysis', { fallback: 'Capacity Analysis' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Utilization Rate</span>
                    <span className="text-sm font-bold">{capacity.utilizationRate || 0}%</span>
                  </div>
                  <Progress value={capacity.utilizationRate || 0} className="h-3" />
                  {capacity.utilizationRate && capacity.utilizationRate > 85 && (
                    <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                      <AlertTriangle className="h-4 w-4" />
                      {t('ui.predictive.highUtilization', { fallback: 'High utilization detected' })}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Churn Risk */}
          {churnItems.length > 0 && (
            <Card className="analytics-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  {t('ui.predictive.churnRiskAnalysis', { fallback: 'Churn Risk Analysis' })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {churnItems.map((item: { customerId: string; riskScore: number; daysUntilChurn?: number }, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                      <div>
                        <div className="font-medium">{t('ui.predictive.customer', { id: item.customerId })}</div>
                        {item.daysUntilChurn && (
                          <div className="text-xs text-muted-foreground">
                            {item.daysUntilChurn} {t('ui.predictive.days', { fallback: 'days' })}
                          </div>
                        )}
                      </div>
                      <Badge variant={item.riskScore > 0.7 ? 'destructive' : item.riskScore > 0.4 ? 'default' : 'secondary'}>
                        {item.riskScore > 0.7 ? 'High' : item.riskScore > 0.4 ? 'Medium' : 'Low'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Financial Tab */}
        <TabsContent value="financial" className="space-y-6">
          {/* Revenue Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="agent-metric-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Revenue</p>
                    <h3 className="text-2xl font-bold mt-1">${revenueAttribution?.totalRevenue || 0}</h3>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="agent-metric-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Costs</p>
                    <h3 className="text-2xl font-bold mt-1">${costAnalytics?.totalCost || 0}</h3>
                  </div>
                  <TrendingDown className="h-8 w-8 text-orange-500" />
                </div>
              </CardContent>
            </Card>

            <Card className="agent-metric-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">ROI</p>
                    <h3 className="text-2xl font-bold mt-1">{roiAnalytics?.overallROI || 0}%</h3>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue by Channel */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard
              title={t('ui.financial.revenueByChannel', { fallback: 'Revenue by Channel' })}
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
                  title="No revenue data"
                  description="Revenue breakdown will appear here"
                />
              )}
            </ChartCard>

            <ChartCard
              title={t('ui.financial.costBreakdown', { fallback: 'Cost Breakdown' })}
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
                  icon={AlertTriangle}
                  title="No cost data"
                  description="Cost breakdown will appear here"
                />
              )}
            </ChartCard>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
