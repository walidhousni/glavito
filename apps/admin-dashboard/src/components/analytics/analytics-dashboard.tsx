'use client'

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts'
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  Activity,
} from 'lucide-react'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { RealTimeMetrics, KPIMetric, DemandForecast as TDemandForecast, CapacityPrediction as TCapacityPrediction, ChurnPrediction as TChurnPrediction } from '@/types/analytics'
import { useTranslations } from 'next-intl'
type DemandForecast = TDemandForecast
type CapacityPrediction = TCapacityPrediction
type ChurnPredictionItem = TChurnPrediction

interface AnalyticsDashboardProps {
  tenantId: string
}

export function AnalyticsDashboard({ tenantId }: AnalyticsDashboardProps) {
  const t = useTranslations('analytics')
  const [timeRange, setTimeRange] = useState('7d')
  const [activeTab, setActiveTab] = useState('overview')
  
  const store = useAnalyticsStore()
  const realTimeMetrics = store.realTime
  const kpiMetrics = store.kpis
  const demandForecast = store.forecast
  const capacityPrediction = store.capacity
  const churnPrediction = store.churn as any
  const isLoading = store.isLoading
  const error = store.error
  const refetch = store.refetch
  const templates = store.reportTemplates
  const exportJobs = store.exportJobs

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range)
    store.setTimeRange(range as any)
    refetch()
  }

  const handleExport = async () => {
    await store.requestExport({ type: 'dashboard', format: 'pdf' } as any).catch(() => undefined)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500 mb-4">{t('ui.loadingFailed')}</p>
          <Button onClick={refetch}>{t('ui.retry')}</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t('ui.title')}</h1>
          <p className="text-muted-foreground">{t('ui.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={() => store.loadTemplates()}>{t('common.viewAll')}</Button>
          <Button variant="outline" size="sm" onClick={() => store.loadExports()}>{t('customers.exportData')}</Button>
          <Button variant="default" size="sm" onClick={handleExport}>{t('ai.buttons.export')}</Button>
          <Button
            variant={timeRange === '24h' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeRangeChange('24h')}
          >
            {t('ui.time.24h')}
          </Button>
          <Button
            variant={timeRange === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeRangeChange('7d')}
          >
            {t('ui.time.7d')}
          </Button>
          <Button
            variant={timeRange === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeRangeChange('30d')}
          >
            {t('ui.time.30d')}
          </Button>
          <Button
            variant={timeRange === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTimeRangeChange('90d')}
          >
            {t('ui.time.90d')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">{t('ui.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="performance">{t('ui.tabs.performance')}</TabsTrigger>
          <TabsTrigger value="predictive">{t('ui.tabs.predictive')}</TabsTrigger>
          <TabsTrigger value="financial">{t('ui.tabs.financial')}</TabsTrigger>
          <TabsTrigger value="custom">{t('ui.tabs.custom')}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <OverviewTab 
            realTimeMetrics={realTimeMetrics} 
            kpiMetrics={kpiMetrics}
          />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab 
            realTimeMetrics={realTimeMetrics}
            kpiMetrics={kpiMetrics}
          />
        </TabsContent>

        <TabsContent value="predictive" className="space-y-4">
          <PredictiveTab 
            demandForecast={demandForecast}
            capacityPrediction={capacityPrediction}
            churnPrediction={churnPrediction}
          />
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <FinancialTab />
        </TabsContent>

        <TabsContent value="custom" className="space-y-4">
          <CustomReportsTab templates={templates || []} exports={exportJobs || []} onRefreshTemplates={() => store.loadTemplates()} onRefreshExports={() => store.loadExports()} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function OverviewTab({ realTimeMetrics, kpiMetrics }: { 
  realTimeMetrics?: RealTimeMetrics
  kpiMetrics?: KPIMetric[]
}) {
  const t = useTranslations('analytics')
  // Note: KPIs are displayed directly below; helper omitted to avoid unused warnings
  const safeKpis = Array.isArray(kpiMetrics) ? kpiMetrics : []

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  const formatValue = (value: number, unit: string) => {
    if (unit === '%') return `${value.toFixed(1)}%`
    if (unit === 'minutes') return `${value.toFixed(0)}m`
    if (unit === 'rating') return value.toFixed(1)
    return value.toString()
  }

  return (
    <div className="space-y-6">
      {/* Real-time Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ui.realtime.activeTickets')}</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics?.activeTickets || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('ui.realtime.queue')}: {realTimeMetrics?.queueLength || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ui.realtime.activeAgents')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{realTimeMetrics?.activeAgents || 0}</div>
            <p className="text-xs text-muted-foreground">
              {t('ui.realtime.onlineNow')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ui.realtime.avgResponseTime')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((realTimeMetrics?.averageResponseTime || 0) / 60)}m
            </div>
            <p className="text-xs text-muted-foreground">
              {t('ui.realtime.last24h')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('ui.realtime.customerSatisfaction')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(realTimeMetrics?.customerSatisfactionScore || 0).toFixed(1)}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('ui.realtime.outOf5')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPI Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {safeKpis.map((kpi) => (
          <Card key={kpi.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.name}</CardTitle>
              {getTrendIcon(kpi.trend)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatValue(kpi.value, kpi.unit)}
              </div>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <span>
                  {t('ui.kpi.fromLastPeriod', { value: `${kpi.changePercentage && kpi.changePercentage > 0 ? '+' : ''}${kpi.changePercentage?.toFixed(1)}` })}
                </span>
                {kpi.target && (
                  <Badge variant={kpi.value >= kpi.target ? 'default' : 'secondary'}>
                    {t('ui.kpi.target', { value: formatValue(kpi.target, kpi.unit) })}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Channel Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.charts.channelDistribution')}</CardTitle>
            <CardDescription>{t('ui.charts.channelDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={realTimeMetrics?.channelDistribution || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(((percent ?? 0) * 100).toFixed(1))}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {realTimeMetrics?.channelDistribution?.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(${index * 45}, 70%, 50%)`} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.charts.priorityDistribution')}</CardTitle>
            <CardDescription>{t('ui.charts.priorityDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={realTimeMetrics?.priorityDistribution || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="priority" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* SLA Compliance */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.charts.slaCompliance')}</CardTitle>
          <CardDescription>{t('ui.charts.slaComplianceDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span>{t('ui.charts.complianceRate')}</span>
              <span className="font-medium">
                {(100 - (realTimeMetrics?.slaBreachRate || 0)).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={100 - (realTimeMetrics?.slaBreachRate || 0)} 
              className="w-full"
            />
            {(realTimeMetrics?.slaBreachRate || 0) > 10 && (
              <div className="flex items-center space-x-2 text-sm text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <span>{t('ui.charts.slaAboveThreshold')}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PerformanceTab({ realTimeMetrics, kpiMetrics }: {
  realTimeMetrics?: RealTimeMetrics
  kpiMetrics?: KPIMetric[]
}) {
  const t = useTranslations('analytics')
  const store = useAnalyticsStore()
  const { channelAnalytics, agentPerformance, isLoading, fetchAgent, fetchChannel } = store
  const channels = channelAnalytics?.channels || []
  const topChannels = useMemo(() => channels.slice(0, 5).map((c: any) => ({ id: c.channelId, name: c.channelName, tickets: c.totalTickets, rtime: c.averageResponseTime })), [channels])
  const leaderboard = Array.isArray(agentPerformance?.agents) ? agentPerformance.agents : []
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.performance.topChannels')}</CardTitle>
            <CardDescription>{t('ui.performance.topChannelsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {topChannels.length ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topChannels}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tickets" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-sm text-muted-foreground">{isLoading ? t('ui.loading') : t('ui.noData')}</div>
            )}
            {!!topChannels.length && (
              <div className="mt-4 text-right">
                <Button size="sm" variant="outline" onClick={() => { setSelectedChannel(topChannels[0].id); fetchChannel().catch(() => undefined) }}>{t('ui.performance.viewDetails')}</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('ui.performance.agentLeaderboard')}</CardTitle>
            <CardDescription>{t('ui.performance.agentLeaderboardDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboard.length ? (
              <div className="space-y-2 text-sm">
                {leaderboard.slice(0, 5).map((row: any, idx: number) => (
                  <div key={row.agentId || idx} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">#{idx + 1}</Badge>
                      <span>{row.agentName || row.agentId}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span>{t('ui.performance.resolved')}: {row.metrics?.ticketsHandled ?? 0}</span>
                      <span>{t('ui.performance.csat')}: {(row.metrics?.customerSatisfaction ?? 0).toFixed(1)}</span>
                      <Button size="sm" variant="outline" onClick={() => { setSelectedAgent(row.agentId); fetchAgent(row.agentId).catch(() => undefined) }}>{t('ui.performance.viewDetails')}</Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">{isLoading ? t('ui.loading') : t('ui.noData')}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Agent Drill-down */}
      {selectedAgent && (
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.performance.agentDetails')}</CardTitle>
            <CardDescription>{t('ui.performance.agentDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-6 text-sm">
              <div><span className="text-muted-foreground">{t('ui.performance.agent')}:</span> {agentPerformance?.agentName || selectedAgent}</div>
              <div><span className="text-muted-foreground">{t('ui.performance.ticketsHandled')}:</span> {agentPerformance?.metrics?.ticketsHandled ?? 0}</div>
              <div><span className="text-muted-foreground">{t('ui.performance.avgResp')}:</span> {Math.round((agentPerformance?.metrics?.averageResponseTime ?? 0) / 60)}m</div>
              <div><span className="text-muted-foreground">{t('ui.performance.avgRes')}:</span> {Math.round((agentPerformance?.metrics?.averageResolutionTime ?? 0) / 60)}m</div>
              <div><span className="text-muted-foreground">FCR:</span> {((agentPerformance?.metrics?.firstContactResolution ?? 0)).toFixed(1)}%</div>
              <div><span className="text-muted-foreground">CSAT:</span> {(agentPerformance?.metrics?.customerSatisfaction ?? 0).toFixed(1)}</div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div>
                <div className="text-sm font-medium mb-2">{t('ui.performance.trendPerformance')}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={agentPerformance?.trends?.performance || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v:any)=> new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(v)=> new Date(v as any).toLocaleDateString()} />
                    <Line type="monotone" dataKey="value" stroke="#3b82f6" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t('ui.performance.trendSatisfaction')}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={agentPerformance?.trends?.satisfaction || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v:any)=> new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(v)=> new Date(v as any).toLocaleDateString()} />
                    <Area type="monotone" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 text-right">
              <Button size="sm" onClick={() => setSelectedAgent(null)}>{t('common.close')}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Channel Drill-down */}
      {selectedChannel && (
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.performance.channelDetails')}</CardTitle>
            <CardDescription>{t('ui.performance.channelDetailsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            {(() => {
              const ch = channels.find((c: any) => c.channelId === selectedChannel)
              if (!ch) return <div className="text-sm text-muted-foreground">{t('ui.noData')}</div>
              return (
                <div className="flex flex-wrap gap-6 text-sm">
                  <div><span className="text-muted-foreground">{t('ui.performance.channel')}:</span> {ch.channelName}</div>
                  <div><span className="text-muted-foreground">{t('ui.performance.tickets')}:</span> {ch.totalTickets}</div>
                  <div><span className="text-muted-foreground">{t('ui.performance.avgResp')}:</span> {Math.round((ch.averageResponseTime ?? 0) / 60)}m</div>
                  <div><span className="text-muted-foreground">{t('ui.performance.avgRes')}:</span> {Math.round((ch.averageResolutionTime ?? 0) / 60)}m</div>
                </div>
              )
            })()}
            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div>
                <div className="text-sm font-medium mb-2">{t('ui.performance.trendVolume')}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={(channels.find((c:any)=> c.channelId===selectedChannel)?.trends?.volume) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v:any)=> new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(v)=> new Date(v as any).toLocaleDateString()} />
                    <Line type="monotone" dataKey="value" stroke="#f59e0b" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">{t('ui.performance.trendPerformance')}</div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={(channels.find((c:any)=> c.channelId===selectedChannel)?.trends?.performance) || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tickFormatter={(v:any)=> new Date(v).toLocaleDateString()} />
                    <YAxis />
                    <Tooltip labelFormatter={(v)=> new Date(v as any).toLocaleDateString()} />
                    <Area type="monotone" dataKey="value" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="mt-4 text-right">
              <Button size="sm" onClick={() => setSelectedChannel(null)}>{t('common.close')}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function PredictiveTab({ demandForecast, capacityPrediction, churnPrediction }: {
  demandForecast?: DemandForecast
  capacityPrediction?: CapacityPrediction
  churnPrediction?: ChurnPredictionItem[]
}) {
  const t = useTranslations('analytics')
  return (
    <div className="space-y-6">
      {/* Demand Forecast */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.predictive.demandForecast')}</CardTitle>
          <CardDescription>{t('ui.predictive.demandForecastDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {demandForecast?.predictions ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={demandForecast.predictions}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <YAxis />
                <Tooltip 
                  labelFormatter={(value) => new Date(value).toLocaleDateString()}
                />
                <Area 
                  type="monotone" 
                  dataKey="predictedTickets" 
                  stroke="#8884d8" 
                  fill="#8884d8" 
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('ui.predictive.noForecast')}</div>
          )}
        </CardContent>
      </Card>

      {/* Capacity Prediction */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.predictive.capacityAnalysis')}</CardTitle>
          <CardDescription>{t('ui.predictive.capacityAnalysisDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {capacityPrediction ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-2xl font-bold">{capacityPrediction?.currentCapacity ?? 0}</div>
                  <div className="text-sm text-muted-foreground">{t('ui.predictive.currentCapacity')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{Math.round(capacityPrediction?.predictedDemand ?? 0)}</div>
                  <div className="text-sm text-muted-foreground">{t('ui.predictive.predictedDemand')}</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{((capacityPrediction?.utilizationRate ?? 0).toFixed(1))}%</div>
                  <div className="text-sm text-muted-foreground">{t('ui.predictive.utilizationRate')}</div>
                </div>
              </div>
              <Progress value={capacityPrediction?.utilizationRate ?? 0} className="w-full" />
              {(capacityPrediction?.utilizationRate ?? 0) > 80 && (
                <div className="flex items-center space-x-2 text-sm text-amber-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{t('ui.predictive.highUtilization')}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('ui.predictive.noCapacity')}</div>
          )}
        </CardContent>
      </Card>

      {/* Churn Prediction */}
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.predictive.churnRiskAnalysis')}</CardTitle>
          <CardDescription>{t('ui.predictive.churnRiskAnalysisDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          {churnPrediction && churnPrediction.length > 0 ? (
            <div className="space-y-4">
              {churnPrediction.slice(0, 5).map((prediction) => (
                <div key={prediction.customerId} className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{t('ui.predictive.customer', { id: prediction.customerId })}</div>
                    <div className="text-sm text-muted-foreground">
                      {t('ui.predictive.riskLevel')} <Badge variant={
                        prediction.riskLevel === 'critical' ? 'destructive' :
                        prediction.riskLevel === 'high' ? 'secondary' :
                        'outline'
                      }>
                        {prediction.riskLevel}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{(prediction.churnProbability * 100).toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">
                      {prediction.timeToChurn} {t('ui.predictive.days')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">{t('ui.predictive.noChurn')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function FinancialTab() {
  const t = useTranslations('analytics')
  const { revenueAttribution, costAnalytics, roiAnalytics, isLoading } = useAnalyticsStore()
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.financial.revenue')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roiAnalytics?.revenue?.total ? `$${(roiAnalytics.revenue.total as number).toFixed(2)}` : (isLoading ? '…' : '$0')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.financial.costs')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{costAnalytics?.totalCosts ? `$${(costAnalytics.totalCosts as number).toFixed(2)}` : (isLoading ? '…' : '$0')}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.financial.roi')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{roiAnalytics?.roi?.overall !== undefined ? `${((roiAnalytics.roi.overall as number) * 100).toFixed(1)}%` : (isLoading ? '…' : '0%')}</div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('ui.financial.revenueByChannel')}</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueAttribution?.byChannel?.length ? (
            <div className="space-y-2 text-sm">
              {revenueAttribution.byChannel.map((row: any) => (
                <div key={row.channel} className="flex items-center justify-between">
                  <div>{row.channel}</div>
                  <div className="font-medium">${'{'}row.revenue?.toFixed ? row.revenue.toFixed(2) : row.revenue || 0{'}'}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{isLoading ? t('ui.loading') : t('ui.noData')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function CustomReportsTab({ templates, exports, onRefreshTemplates, onRefreshExports }: { templates: any[]; exports: any[]; onRefreshTemplates: () => void; onRefreshExports: () => void }) {
  const t = useTranslations('analytics')
  const store = useAnalyticsStore()
  const schedules = store.schedules || []
  const dashboards = store.dashboards || []
  const executive = store.executiveSummary || ''

  const [builderOpen, setBuilderOpen] = React.useState(false)
  const [builderName, setBuilderName] = React.useState('New Dashboard')
  const [widgets, setWidgets] = React.useState<Array<{ id: string; type: 'metric' | 'chart' | 'table' | 'text'; title: string; config?: Record<string, any> }>>([])
  const onAddWidget = (type: 'metric' | 'chart' | 'table' | 'text') => {
    const initial: Record<string, any> = type === 'chart' ? { chartType: 'line' } : type === 'metric' ? { metricName: 'total_tickets' } : type === 'table' ? { query: '' } : { text: 'Notes' }
    setWidgets((w) => [...w, { id: `${Date.now()}-${Math.random().toString(36).slice(2,8)}`, type, title: `${type} widget`, config: initial }])
  }
  const onDeleteWidget = (id: string) => setWidgets((w) => w.filter((x) => x.id !== id))
  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
  }
  const onDrop = (e: React.DragEvent, targetId: string) => {
    const draggedId = e.dataTransfer.getData('text/plain')
    if (!draggedId || draggedId === targetId) return
    setWidgets((list) => {
      const from = list.findIndex((x) => x.id === draggedId)
      const to = list.findIndex((x) => x.id === targetId)
      if (from < 0 || to < 0) return list
      const copy = [...list]
      const [item] = copy.splice(from, 1)
      copy.splice(to, 0, item)
      return copy
    })
  }
  const onSaveDashboard = async () => {
    await store.createDashboard({
      name: builderName,
      description: '',
      layout: { type: 'grid', columns: 12, rowHeight: 30, margin: [10,10], padding: [10,10] },
      widgets: widgets.map((w, idx) => ({ id: w.id, type: w.type, title: w.title, position: { x: 0, y: idx }, size: { width: 6, height: 3 }, configuration: (w.config || {}), dataSource: w.type === 'table' ? { type: 'historical', query: w.config?.query || '', parameters: {} } : { type: 'historical', query: '', parameters: {} }, refreshInterval: 60 })),
      isPublic: false
    }).catch(()=>undefined)
    setBuilderOpen(false)
    setWidgets([])
    setBuilderName('New Dashboard')
  }

  React.useEffect(() => {
    store.loadSchedules().catch(() => undefined)
    store.loadDashboards().catch(() => undefined)
    store.loadExecutiveSummary().catch(() => undefined)
  }, [])
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t('ui.customReports.title')}</h3>
          <p className="text-muted-foreground">{t('ui.customReports.desc')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onRefreshTemplates}>{t('common.viewAll')}</Button>
          <Button variant="outline" size="sm" onClick={onRefreshExports}>{t('customers.exportData')}</Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.customReports.templates')}</CardTitle>
            <CardDescription>{t('ui.customReports.templatesDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {(templates || []).length ? (
                templates.slice(0, 6).map((tpl: any) => (
                  <div key={tpl.id} className="flex items-center justify-between">
                    <div className="truncate">
                      <div className="font-medium truncate">{tpl.name}</div>
                      {tpl.category && <div className="text-muted-foreground truncate">{tpl.category}</div>}
                    </div>
                    <Badge variant="outline">{new Date(tpl.updatedAt).toLocaleDateString()}</Badge>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">{t('ui.noData')}</div>
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('ui.customReports.exports')}</CardTitle>
            <CardDescription>{t('ui.customReports.exportsDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {(exports || []).length ? (
                exports.slice(0, 6).map((job: any) => (
                  <div key={job.id} className="flex items-center justify-between">
                    <div className="truncate">
                      <div className="font-medium truncate">{job.type} · {job.format}</div>
                      <div className="text-muted-foreground truncate">{job.status}{job.fileUrl ? ` · ${job.fileUrl}` : ''}</div>
                    </div>
                    <Badge variant={job.status === 'completed' ? 'default' : job.status === 'failed' ? 'destructive' : 'secondary'}>
                      {job.status}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-muted-foreground">{t('ui.noData')}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schedules</CardTitle>
            <CardDescription>Automated report deliveries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {schedules.length ? schedules.slice(0,6).map((s:any)=> (
                <div key={s.id} className="flex items-center justify-between">
                  <div className="truncate">
                    <div className="font-medium truncate">{s.reportId || s.id}</div>
                    <div className="text-muted-foreground truncate">{s.status || 'active'}</div>
                  </div>
                  <Badge variant="outline">{new Date(s.nextExecution || Date.now()).toLocaleDateString()}</Badge>
                </div>
              )) : <div className="text-muted-foreground">{t('ui.noData')}</div>}
            </div>
            <div className="mt-3 text-right">
              <Button size="sm" onClick={() => store.createSchedule({ type: 'dashboard', source: 'main', schedule: { frequency: 'weekly', time: '09:00', timezone: 'UTC', dayOfWeek: 1 }, format: 'pdf' }).catch(()=>undefined)}>Quick schedule</Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Dashboards</CardTitle>
            <CardDescription>Custom analytics dashboards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              {dashboards.length ? dashboards.slice(0,6).map((d:any)=> (
                <div key={d.id} className="flex items-center justify-between">
                  <div className="truncate">
                    <div className="font-medium truncate">{d.name}</div>
                    <div className="text-muted-foreground truncate">{d.isPublic ? 'Public' : 'Private'}</div>
                  </div>
                  <Badge variant="outline">{new Date(d.updatedAt || Date.now()).toLocaleDateString()}</Badge>
                </div>
              )) : <div className="text-muted-foreground">{t('ui.noData')}</div>}
            </div>
            <div className="mt-3 text-right">
              <Button size="sm" onClick={() => setBuilderOpen(true)}>New dashboard</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Executive Summary</CardTitle>
          <CardDescription>Auto-generated past 30 days highlight</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{executive || t('ui.noData')}</div>
        </CardContent>
      </Card>

      {/* Dashboard Builder Dialog */}
      <Dialog open={builderOpen} onOpenChange={setBuilderOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Dashboard</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm block mb-1">Name</label>
              <Input value={builderName} onChange={(e)=> setBuilderName(e.target.value)} placeholder="Dashboard name" />
            </div>
            <Separator />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={()=> onAddWidget('metric')}>Add Metric</Button>
              <Button variant="outline" size="sm" onClick={()=> onAddWidget('chart')}>Add Chart</Button>
              <Button variant="outline" size="sm" onClick={()=> onAddWidget('table')}>Add Table</Button>
              <Button variant="outline" size="sm" onClick={()=> onAddWidget('text')}>Add Text</Button>
            </div>
            <div className="space-y-2">
              {widgets.length === 0 && (
                <div className="text-sm text-muted-foreground">No widgets yet. Use the buttons above to add.</div>
              )}
              {widgets.map((w, idx) => (
                <div key={w.id} draggable onDragStart={(e)=> onDragStart(e, w.id)} onDragOver={(e)=> e.preventDefault()} onDrop={(e)=> onDrop(e, w.id)} className="p-3 rounded-md border bg-white dark:bg-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1">
                      <Badge variant="outline">{w.type}</Badge>
                      <Input value={w.title} onChange={(e)=> setWidgets((list)=> list.map((x)=> x.id===w.id ? { ...x, title: e.target.value } : x))} />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="ghost" onClick={()=> setWidgets((list)=> { if (idx===0) return list; const copy=[...list]; const [it]=copy.splice(idx,1); copy.splice(idx-1,0,it); return copy })}>Up</Button>
                      <Button size="sm" variant="ghost" onClick={()=> setWidgets((list)=> { if (idx===list.length-1) return list; const copy=[...list]; const [it]=copy.splice(idx,1); copy.splice(idx+1,0,it); return copy })}>Down</Button>
                      <Button size="sm" variant="ghost" onClick={()=> onDeleteWidget(w.id)}>Remove</Button>
                    </div>
                  </div>
                  {/* Type-specific configuration */}
                  {w.type === 'metric' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs block mb-1">Metric</label>
                        <Input value={w.config?.metricName || ''} onChange={(e)=> setWidgets((list)=> list.map((x)=> x.id===w.id ? { ...x, config: { ...(x.config||{}), metricName: e.target.value } } : x))} placeholder="e.g. total_tickets" />
                      </div>
                      <div>
                        <label className="text-xs block mb-1">Refresh (sec)</label>
                        <Input type="number" min={0} defaultValue={60} onChange={()=>{}} />
                      </div>
                    </div>
                  )}
                  {w.type === 'chart' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs block mb-1">Chart Type</label>
                        <Select value={w.config?.chartType || 'line'} onValueChange={(val)=> setWidgets((list)=> list.map((x)=> x.id===w.id ? { ...x, config: { ...(x.config||{}), chartType: val } } : x))}>
                          <SelectTrigger className="w-full"><SelectValue placeholder="Select type" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="line">Line</SelectItem>
                            <SelectItem value="bar">Bar</SelectItem>
                            <SelectItem value="area">Area</SelectItem>
                            <SelectItem value="pie">Pie</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-xs block mb-1">Query</label>
                        <Input value={w.config?.query || ''} onChange={(e)=> setWidgets((list)=> list.map((x)=> x.id===w.id ? { ...x, config: { ...(x.config||{}), query: e.target.value } } : x))} placeholder="SELECT date, value FROM metrics" />
                      </div>
                    </div>
                  )}
                  {w.type === 'table' && (
                    <div>
                      <label className="text-xs block mb-1">Query</label>
                      <Input value={w.config?.query || ''} onChange={(e)=> setWidgets((list)=> list.map((x)=> x.id===w.id ? { ...x, config: { ...(x.config||{}), query: e.target.value } } : x))} placeholder="SELECT * FROM tickets LIMIT 50" />
                    </div>
                  )}
                  {w.type === 'text' && (
                    <div>
                      <label className="text-xs block mb-1">Text</label>
                      <Input value={w.config?.text || ''} onChange={(e)=> setWidgets((list)=> list.map((x)=> x.id===w.id ? { ...x, config: { ...(x.config||{}), text: e.target.value } } : x))} placeholder="Notes or markdown" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=> setBuilderOpen(false)}>Cancel</Button>
            <Button onClick={onSaveDashboard}>Save Dashboard</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
