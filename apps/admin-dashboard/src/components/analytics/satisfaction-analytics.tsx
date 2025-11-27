'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useTranslations } from 'next-intl'
import { analyticsApi } from '@/lib/api/analytics-client'
import { 
  Star, 
  TrendingUp, 
  Mail, 
  MessageSquare, 
  Users,
  Download,
  Heart
} from 'lucide-react'
import { StatGrid, ChartCard, EmptyState, type StatGridMetric } from '@/components/analytics/core'
import { LineChart, BarChart, PieChart } from '@/components/analytics/charts'
import { chartColors } from '@/lib/chart-theme'
import { motion } from 'framer-motion'

interface SatisfactionAnalytics {
  totalSent: number
  totalResponded: number
  responseRate: number
  averageRating: number
  ratingDistribution: Record<string, number>
  channelBreakdown: Record<string, number>
  channelAverages?: Array<{ channel: string; averageScore: number; responseCount: number }>
  channelTrends?: Array<{ channel: string; points: Array<{ date: string; value: number }> }>
  surveys: Array<{
    id: string
    rating: number
    comment?: string
    channel: string
    surveyType: string
    sentAt?: string
    respondedAt?: string
    createdAt: string
  }>
}

export function SatisfactionAnalytics() {
  const t = useTranslations('crm.satisfaction')
  const [analytics, setAnalytics] = React.useState<SatisfactionAnalytics | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [timeRange, setTimeRange] = React.useState<'7d' | '30d' | '90d'>('30d')

  React.useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const data = await (analyticsApi as any).getCustomerSatisfaction(timeRange).catch(() => ({} as Record<string, unknown>))
        const overall = (data?.overall || {}) as { totalResponses?: number; responseRate?: number; averageScore?: number }
        const byChannelArr = Array.isArray(data?.byChannel) ? data.byChannel : []
        const channelBreakdown: Record<string, number> = {}
        for (const c of byChannelArr) channelBreakdown[String(c.channel || 'unknown')] = Number(c.responseCount || 0)
        const ratingDistribution = (data?.ratingDistribution || {}) as Record<string, number>
        const channelAverages = Array.isArray(data?.byChannel) ? data.byChannel.map((c: { channel?: string; averageScore?: number; responseCount?: number }) => ({ channel: String(c.channel || 'unknown'), averageScore: Number(c.averageScore || 0), responseCount: Number(c.responseCount || 0) })) : []
        const channelTrends = Array.isArray(data?.byChannel) ? data.byChannel.map((c: { channel?: string; trendSeries?: Array<{ date: string; value: number }> }) => ({ channel: String(c.channel || 'unknown'), points: Array.isArray(c.trendSeries) ? c.trendSeries.map((p: { date: string; value: number }) => ({ date: new Date(p.date).toISOString(), value: Number(p.value || 0) })) : [] })) : []
        const metaData = (data?._meta || {}) as { sentCount?: number }
        setAnalytics({
          totalSent: Number(metaData?.sentCount || 0),
          totalResponded: Number(overall?.totalResponses || 0),
          responseRate: Number(overall?.responseRate || 0),
          averageRating: Number(overall?.averageScore || 0),
          ratingDistribution,
          channelBreakdown,
          channelAverages,
          channelTrends,
          surveys: Array.isArray(data?.recentSurveys) ? data.recentSurveys.map((r: { id: string; rating?: number; comment?: string; channel: string; surveyType: string; sentAt?: string; respondedAt?: string; createdAt: string }) => ({ id: r.id, rating: Number(r.rating || 0), comment: r.comment, channel: r.channel, surveyType: r.surveyType, sentAt: r.sentAt, respondedAt: r.respondedAt, createdAt: r.createdAt })) : []
        })
      } catch (error) {
        console.error('Failed to load satisfaction analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    loadAnalytics()
  }, [timeRange])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="chart-loading-spinner"></div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <EmptyState
        icon={Star}
        title={t('noData', { fallback: 'No satisfaction data' })}
        description={t('noDataDesc', { fallback: 'Satisfaction surveys will appear here once collected' })}
      />
    )
  }

  // Transform metrics
  const metrics: StatGridMetric[] = [
    {
      title: t('totalSent', { fallback: 'Surveys Sent' }),
      value: analytics.totalSent,
      icon: Mail,
      color: 'blue',
      loading
    },
    {
      title: t('totalResponded', { fallback: 'Responses' }),
      value: analytics.totalResponded,
      icon: MessageSquare,
      color: 'green',
      loading
    },
    {
      title: t('responseRate', { fallback: 'Response Rate' }),
      value: `${Math.round(analytics.responseRate)}%`,
      icon: Users,
      color: 'purple',
      loading
    },
    {
      title: t('averageRating', { fallback: 'Average Rating' }),
      value: analytics.averageRating.toFixed(1),
      suffix: '/5',
      icon: Star,
      color: 'orange',
      loading
    }
  ]

  // Transform rating distribution for bar chart
  const ratingData = Object.entries(analytics.ratingDistribution).map(([rating, count]) => ({
    x: `${rating} ⭐`,
    y: count as number
  }))

  // Transform channel breakdown for pie chart
  const channelData = Object.entries(analytics.channelBreakdown).map(([channel, count]) => ({
    x: channel.charAt(0).toUpperCase() + channel.slice(1),
    y: count as number
  }))

  // Transform channel averages for bar chart
  const channelAveragesData = analytics.channelAverages ? analytics.channelAverages.map(c => ({
    x: c.channel.charAt(0).toUpperCase() + c.channel.slice(1),
    y: c.averageScore
  })) : []

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between flex-wrap gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-3">
            <Heart className="h-8 w-8" />
            {t('title', { fallback: 'Customer Satisfaction' })}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t('subtitle', { fallback: 'Survey responses and CSAT metrics' })}
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <Button
              key={range}
              variant={timeRange === range ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange(range)}
              className={timeRange === range ? 'time-range-btn-active' : 'time-range-btn'}
            >
              {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
            </Button>
          ))}
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <StatGrid metrics={metrics} columns={4} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <ChartCard
          title={t('ratingDistribution', { fallback: 'Rating Distribution' })}
          description={t('ratingDistributionDesc', { fallback: 'Breakdown by star rating' })}
          loading={loading}
          icon={<Star className="h-5 w-5 text-orange-500" />}
        >
          {ratingData.length > 0 ? (
            <BarChart
              data={ratingData}
              color={chartColors.orange}
              height={300}
            />
          ) : (
            <EmptyState
              icon={Star}
              title="No ratings"
              description="Rating distribution will appear here"
            />
          )}
        </ChartCard>

        {/* Channel Breakdown */}
        <ChartCard
          title={t('channelBreakdown', { fallback: 'Responses by Channel' })}
          description={t('channelBreakdownDesc', { fallback: 'Distribution across channels' })}
          loading={loading}
          icon={<MessageSquare className="h-5 w-5 text-blue-500" />}
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
              title="No channel data"
              description="Channel breakdown will appear here"
            />
          )}
        </ChartCard>

        {/* Channel Averages */}
        <ChartCard
          title={t('channelAverages', { fallback: 'Average Score by Channel' })}
          description={t('channelAveragesDesc', { fallback: 'Satisfaction scores per channel' })}
          loading={loading}
          icon={<TrendingUp className="h-5 w-5 text-green-500" />}
        >
          {channelAveragesData.length > 0 ? (
            <BarChart
              data={channelAveragesData}
              color={chartColors.green}
              height={300}
              horizontal
              formatY={(y) => `${y.toFixed(1)}/5`}
            />
          ) : (
            <EmptyState
              icon={TrendingUp}
              title="No averages"
              description="Channel averages will appear here"
            />
          )}
        </ChartCard>

        {/* Trend Over Time */}
        {analytics.channelTrends && analytics.channelTrends.length > 0 && analytics.channelTrends[0].points.length > 0 && (
          <ChartCard
            title={t('trendOverTime', { fallback: 'Satisfaction Trend' })}
            description={t('trendOverTimeDesc', { fallback: 'Score trends over time' })}
            loading={loading}
            icon={<TrendingUp className="h-5 w-5 text-purple-500" />}
          >
            <LineChart
              data={analytics.channelTrends[0].points.map(p => ({
                x: new Date(p.date),
                y: p.value
              }))}
              color={chartColors.purple}
              height={300}
              formatY={(y) => `${y.toFixed(1)}/5`}
            />
          </ChartCard>
        )}
      </div>

      {/* Recent Surveys */}
      {analytics.surveys.length > 0 && (
        <Card className="analytics-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              {t('recentSurveys', { fallback: 'Recent Surveys' })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.surveys.slice(0, 10).map((survey) => (
                <div key={survey.id} className="flex items-start justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">{survey.channel}</Badge>
                      <Badge variant="secondary">{survey.surveyType}</Badge>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < survey.rating ? 'fill-orange-500 text-orange-500' : 'text-slate-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    {survey.comment && (
                      <p className="text-sm text-muted-foreground">{survey.comment}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(survey.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
