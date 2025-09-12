'use client'
import { useEffect, useState } from 'react'
import api from '@/lib/api/config'
import { callsApi } from '@/lib/api/calls-client'
import { useTranslations } from 'next-intl'
import { AnalyticsDashboard } from '@/components/analytics/analytics-dashboard'
import { SatisfactionAnalytics } from '@/components/analytics/satisfaction-analytics'
import { useAuthStore } from '@/lib/store/auth-store'
import { useAnalyticsStore } from '@/lib/store/analytics-store'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BarChart3, 
  Phone, 
  PhoneCall, 
  PhoneOff, 
  Clock, 
  Activity,
  TrendingUp,
  Heart
} from 'lucide-react'

// Note: metadata cannot be exported from a client component page

interface AnalyticsPageProps {
  params: {
    locale: string
  }
}

export default function AnalyticsPage(_props: AnalyticsPageProps) {
  const t = useTranslations('analytics')
  const tenantId = useAuthStore(s => s.user?.tenantId) || 'me'
  const { revenueAttribution, fetchAll, isLoading } = useAnalyticsStore()
  const [analytics, setAnalytics] = useState<null | Awaited<ReturnType<typeof callsApi.analyticsMe>>>(null)
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    let mounted = true
    fetchAll().catch(() => { /* ignore */ })
    callsApi.analyticsMe().then((res) => {
      if (mounted) setAnalytics(res)
    }).catch(() => { /* ignore */ })
    api.get('/health/summary').then((r) => { if (mounted) setHealth(r.data) }).catch(() => { /* ignore */ })
    return () => { mounted = false }
  }, [fetchAll])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-900">
      <div className="container mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg mb-4">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
            {t('ui.title', { default: 'Analytics Dashboard' })}
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            {t('ui.subtitle', { default: 'Comprehensive insights and performance metrics for your support operations' })}
          </p>
        </div>

        {/* Main Analytics Dashboard */}
        <div className="space-y-8">
          <AnalyticsDashboard tenantId={tenantId} />
        </div>

        {/* Additional Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white">
              <Activity className="h-4 w-4 mr-2" />
              {t('ui.tabs.overview', { default: 'Overview' })}
            </TabsTrigger>
            <TabsTrigger value="calls" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white">
              <Phone className="h-4 w-4 mr-2" />
              {t('ui.tabs.calls', { default: 'Calls Analytics' })}
            </TabsTrigger>
            <TabsTrigger value="satisfaction" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white">
              <Heart className="h-4 w-4 mr-2" />
              {t('ui.tabs.satisfaction', { default: 'Satisfaction' })}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="analytics-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    {t('revenue.title', { default: 'Revenue Analytics' })}
                  </CardTitle>
                  <CardDescription>
                    {t('revenue.subtitle', { default: 'Track revenue attribution across channels' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!revenueAttribution ? (
                    <div className="text-center py-8 text-slate-500">
                      {isLoading ? t('common.loading', { default: 'Loading...' }) : t('noData', { default: 'No data available' })}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {revenueAttribution?.byChannel && Array.isArray(revenueAttribution.byChannel) ? (
                        <div className="space-y-3">
                          {revenueAttribution.byChannel.map((row: { channel: string; revenue: number; percentage: number; tickets: number; averageValue: number }) => (
                            <div key={row.channel} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="capitalize">{row.channel}</Badge>
                                <span className="text-sm text-slate-600 dark:text-slate-400">{row.tickets} tickets</span>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold text-green-600">${row.revenue.toFixed ? row.revenue.toFixed(2) : row.revenue}</div>
                                <div className="text-xs text-slate-500">{row.percentage.toFixed(1)}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-slate-500">{t('noData', { default: 'No revenue data available' })}</div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="analytics-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-purple-600" />
                    {t('observability.title', { default: 'System Health' })}
                  </CardTitle>
                  <CardDescription>
                    {t('observability.healthSummary', { default: 'Current system status and performance metrics' })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Healthy
                      </Badge>
                    </div>
                    <div className="text-xs bg-slate-100 dark:bg-slate-800 p-3 rounded-lg font-mono overflow-auto max-h-32">
                      {health ? JSON.stringify(health, null, 2) : 'No health data available'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="calls" className="space-y-6">
            {!analytics ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <div className="text-slate-500">{t('common.loading', { default: 'Loading call analytics...' })}</div>
              </div>
            ) : (
              <div className="space-y-6">
                {(() => {
                  const totals = analytics?.totals ?? { totalCalls: 0, activeCalls: 0, endedCalls: 0, totalDurationSec: 0 }
                  const breakdownByType = analytics?.breakdown?.byType ?? {}
                  const breakdownByDirection = analytics?.breakdown?.byDirection ?? {}
                  const quality24h = analytics?.quality24h ?? { avgRttMs: 0, avgJitterMs: 0, avgBitrateUp: 0, avgBitrateDown: 0, avgPacketLossUp: 0, avgPacketLossDown: 0 }
                  const last7Days = analytics?.last7Days ?? []
                  
                  return (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <StatCard 
                          label={t('calls.totalCalls', { default: 'Total Calls' })} 
                          value={totals.totalCalls} 
                          icon={Phone}
                          color="blue"
                        />
                        <StatCard 
                          label={t('calls.activeCalls', { default: 'Active' })} 
                          value={totals.activeCalls} 
                          icon={PhoneCall}
                          color="green"
                        />
                        <StatCard 
                          label={t('calls.endedCalls', { default: 'Ended' })} 
                          value={totals.endedCalls} 
                          icon={PhoneOff}
                          color="purple"
                        />
                        <StatCard 
                          label={t('calls.totalMinutes', { default: 'Total Minutes' })} 
                          value={Math.round((totals.totalDurationSec || 0) / 60)} 
                          icon={Clock}
                          color="orange"
                        />
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <BreakdownCard 
                          title={t('calls.byType', { default: 'By Type' })} 
                          data={breakdownByType} 
                          noDataLabel={t('calls.noData', { default: 'No data' })}
                          color="blue"
                        />
                        <BreakdownCard 
                          title={t('calls.byDirection', { default: 'By Direction' })} 
                          data={breakdownByDirection} 
                          noDataLabel={t('calls.noData', { default: 'No data' })}
                          color="green"
                        />
                      </div>
                      
                      <QualityCard 
                        data={quality24h} 
                        title={t('calls.quality24h', { default: 'Quality (24h)' })}
                      />
                      
                      <TrendCard 
                        data={last7Days} 
                        title={t('calls.trend7d', { default: 'Last 7 days (minutes)' })} 
                        noDataLabel={t('calls.noData', { default: 'No data' })}
                      />
                    </>
                  )
                })()}
              </div>
            )}
          </TabsContent>

          <TabsContent value="satisfaction" className="space-y-6">
            <SatisfactionAnalytics />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon: Icon, color = 'blue' }: { 
  label: string; 
  value: number; 
  icon?: React.ComponentType<{ className?: string }>; 
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink';
}) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    purple: 'from-purple-500 to-purple-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    pink: 'from-pink-500 to-pink-600'
  }

  return (
    <Card className="analytics-card group hover:shadow-xl transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg`}>
            {Icon && <Icon className="h-6 w-6 text-white" />}
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{value.toLocaleString()}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">{label}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownCard({ title, data, noDataLabel, color = 'blue' }: { 
  title: string; 
  data: Record<string, number>; 
  noDataLabel: string;
  color?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  const entries = Object.entries(data || {});
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 border-blue-200',
    green: 'from-green-50 to-green-100 border-green-200',
    purple: 'from-purple-50 to-purple-100 border-purple-200',
    orange: 'from-orange-50 to-orange-100 border-orange-200'
  }

  return (
    <Card className="analytics-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {entries.length === 0 ? (
            <div className="text-center py-8 text-slate-500">{noDataLabel}</div>
          ) : (
            entries.map(([k, v], index) => (
              <div key={k} className={`flex items-center justify-between p-3 rounded-lg bg-gradient-to-r ${colorClasses[color]} border`}>
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-400"></div>
                  <span className="font-medium capitalize">{k}</span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">{v.toLocaleString()}</div>
                  <div className="text-xs text-slate-600">
                    {entries.reduce((sum, [, val]) => sum + val, 0) > 0 
                      ? `${((v / entries.reduce((sum, [, val]) => sum + val, 0)) * 100).toFixed(1)}%`
                      : '0%'
                    }
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}

function QualityCard({ data, title }: { 
  data: { avgRttMs: number; avgJitterMs: number; avgBitrateUp: number; avgBitrateDown: number; avgPacketLossUp: number; avgPacketLossDown: number }; 
  title: string 
}) {
  return (
    <Card className="analytics-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>Network quality metrics for the last 24 hours</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <QualityItem label="RTT (ms)" value={data.avgRttMs} unit="ms" />
          <QualityItem label="Jitter (ms)" value={data.avgJitterMs} unit="ms" />
          <QualityItem label="Upload (kbps)" value={Math.round((data.avgBitrateUp || 0) / 1000)} unit="kbps" />
          <QualityItem label="Download (kbps)" value={Math.round((data.avgBitrateDown || 0) / 1000)} unit="kbps" />
          <QualityItem label="Loss Up (%)" value={+(data.avgPacketLossUp || 0).toFixed(2)} unit="%" />
          <QualityItem label="Loss Down (%)" value={+(data.avgPacketLossDown || 0).toFixed(2)} unit="%" />
        </div>
      </CardContent>
    </Card>
  )
}

function QualityItem({ label, value, unit }: { label: string; value: number; unit: string }) {
  const getStatusColor = (label: string, value: number) => {
    if (label.includes('Loss') && value > 5) return 'text-red-600'
    if (label.includes('RTT') && value > 200) return 'text-orange-600'
    if (label.includes('Jitter') && value > 50) return 'text-orange-600'
    return 'text-green-600'
  }

  return (
    <div className="text-center p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
      <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">{label}</div>
      <div className={`text-2xl font-bold ${getStatusColor(label, value)}`}>
        {value}{unit}
      </div>
    </div>
  )
}

function TrendCard({ data, title, noDataLabel }: { 
  data: { date: string; durationSec: number }[]; 
  title: string; 
  noDataLabel: string 
}) {
  return (
    <Card className="analytics-card">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        <CardDescription>Daily call duration trends over the past week</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.length === 0 ? (
            <div className="text-center py-8 text-slate-500">{noDataLabel}</div>
          ) : (
            data.map((d, index) => {
              const minutes = Math.round((d.durationSec || 0) / 60)
              const maxMinutes = Math.max(...data.map(item => Math.round((item.durationSec || 0) / 60)))
              const percentage = maxMinutes > 0 ? (minutes / maxMinutes) * 100 : 0
              
              return (
                <div key={d.date} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{new Date(d.date).toLocaleDateString()}</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{minutes}m</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </CardContent>
    </Card>
  )
}