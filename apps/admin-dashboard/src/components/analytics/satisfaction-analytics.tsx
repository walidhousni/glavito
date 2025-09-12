'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { 
  Star, 
  TrendingUp, 
  Mail, 
  MessageSquare, 
  Users, 
  BarChart3,
  Calendar,
  Download,
  Heart
} from 'lucide-react';

interface SatisfactionAnalytics {
  totalSent: number;
  totalResponded: number;
  responseRate: number;
  averageRating: number;
  ratingDistribution: Record<string, number>;
  channelBreakdown: Record<string, number>;
  surveys: Array<{
    id: string;
    rating: number;
    comment?: string;
    channel: string;
    surveyType: string;
    sentAt?: string;
    respondedAt?: string;
    createdAt: string;
  }>;
}

export function SatisfactionAnalytics() {
  const t = useTranslations('analytics.satisfaction');
  const [analytics, setAnalytics] = React.useState<SatisfactionAnalytics | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [timeRange, setTimeRange] = React.useState('30d');

  React.useEffect(() => {
    const loadAnalytics = async () => {
      try {
        const endDate = new Date();
        const startDate = new Date();
        
        switch (timeRange) {
          case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(endDate.getDate() - 90);
            break;
          default:
            startDate.setDate(endDate.getDate() - 30);
        }

        const params = new URLSearchParams({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        const resp = await fetch(`/api/analytics/customer-satisfaction?${params}`)
        const payload = await resp.json()
        // Support both {success,data} and raw payload
        const data = (payload && typeof payload === 'object' && 'data' in payload) ? payload.data : payload
        // Map from backend shape to local expectations
        const ratingDistribution: Record<string, number> = data?.ratingDistribution || {}
        const channelBreakdown: Record<string, number> = {}
        if (Array.isArray(data?.byChannel)) {
          for (const c of data.byChannel) channelBreakdown[c.channel] = c.responseCount || 0
        }
        const surveys = Array.isArray(data?.recentSurveys) ? data.recentSurveys : []
        setAnalytics({
          totalSent: (data?._meta?.sentCount as number) || 0,
          totalResponded: (data?.overall?.totalResponses as number) || 0,
          responseRate: (data?.overall?.responseRate as number) || 0,
          averageRating: (data?.overall?.averageScore as number) || 0,
          ratingDistribution,
          channelBreakdown,
          surveys
        })
      } catch (error) {
        console.error('Failed to load satisfaction analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [timeRange]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="analytics-card animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"></div>
                <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Heart className="h-8 w-8 text-slate-400" />
        </div>
        <div className="text-slate-500 dark:text-slate-400">{t('error', { default: 'Failed to load satisfaction analytics' })}</div>
      </div>
    );
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 3.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRatingBgColor = (rating: number) => {
    if (rating >= 4.5) return 'bg-green-50 border-green-200';
    if (rating >= 3.5) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl shadow-lg mb-4">
          <Heart className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          {t('title', { default: 'Customer Satisfaction' })}
        </h2>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          {t('subtitle', { default: 'Track and analyze customer feedback across all channels' })}
        </p>
        
        <div className="flex items-center justify-center gap-3">
          <div className="flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl p-1 border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            {['7d', '30d', '90d'].map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setTimeRange(range)}
                className={`rounded-lg ${
                  timeRange === range 
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg' 
                    : 'hover:bg-slate-100 dark:hover:bg-slate-700'
                }`}
              >
                {range === '7d' && t('timeRanges.7d', { default: '7 days' })}
                {range === '30d' && t('timeRanges.30d', { default: '30 days' })}
                {range === '90d' && t('timeRanges.90d', { default: '90 days' })}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="rounded-lg bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <Download className="h-4 w-4 mr-2" />
            {t('export', { default: 'Export' })}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="analytics-card group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                <Mail className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.totalSent.toLocaleString()}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{t('metrics.surveysSent', { default: 'Surveys Sent' })}</div>
              </div>
            </div>
            <div className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded-full inline-block">
              {analytics.totalSent > 0 ? t('metrics.activeCampaign', { default: 'Active campaign' }) : t('metrics.noSurveys', { default: 'No surveys sent' })}
            </div>
          </CardContent>
        </Card>

        <Card className="analytics-card group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.responseRate.toFixed(1)}%</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{t('metrics.responseRate', { default: 'Response Rate' })}</div>
              </div>
            </div>
            <div className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded-full inline-block">
              {analytics.totalResponded} {t('metrics.of', { default: 'of' })} {analytics.totalSent} {t('metrics.responded', { default: 'responded' })}
            </div>
          </CardContent>
        </Card>

        <Card className={`analytics-card group hover:shadow-xl transition-all duration-300 border-2 ${getRatingBgColor(analytics.averageRating)}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-gradient-to-br ${analytics.averageRating >= 4.5 ? 'from-yellow-500 to-yellow-600' : analytics.averageRating >= 3.5 ? 'from-orange-500 to-orange-600' : 'from-red-500 to-red-600'} shadow-lg`}>
                <Star className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className={`text-3xl font-bold ${getRatingColor(analytics.averageRating)}`}>
                  {analytics.averageRating.toFixed(1)}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{t('metrics.averageRating', { default: 'Average Rating' })}</div>
              </div>
            </div>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-4 w-4 ${
                    star <= Math.round(analytics.averageRating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-slate-300'
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="analytics-card group hover:shadow-xl transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold text-slate-900 dark:text-white">{analytics.totalResponded.toLocaleString()}</div>
                <div className="text-sm text-slate-600 dark:text-slate-400">{t('metrics.totalResponses', { default: 'Total Responses' })}</div>
              </div>
            </div>
            <div className="text-xs text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 px-2 py-1 rounded-full inline-block">
              {t('metrics.valuableFeedback', { default: 'Valuable feedback collected' })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rating Distribution */}
        <Card className="analytics-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              {t('charts.ratingDistribution', { default: 'Rating Distribution' })}
            </CardTitle>
            <CardDescription>
              {t('charts.ratingDistributionDesc', { default: 'Customer satisfaction ratings breakdown' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = analytics.ratingDistribution[rating] || 0;
                const percentage = analytics.totalResponded > 0 ? (count / analytics.totalResponded) * 100 : 0;
                
                return (
                  <div key={rating} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{rating}</span>
                        <Star className="h-4 w-4 text-yellow-400 fill-current" />
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {count} ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          rating >= 4 ? 'bg-gradient-to-r from-green-500 to-green-600' : 
                          rating >= 3 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' : 
                          'bg-gradient-to-r from-red-500 to-red-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Channel Breakdown */}
        <Card className="analytics-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <MessageSquare className="h-5 w-5 text-green-600" />
              {t('charts.channelPerformance', { default: 'Channel Performance' })}
            </CardTitle>
            <CardDescription>
              {t('charts.channelPerformanceDesc', { default: 'Survey distribution across communication channels' })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(analytics.channelBreakdown).map(([channel, count]) => {
                const percentage = analytics.totalSent > 0 ? (count / analytics.totalSent) * 100 : 0;
                
                return (
                  <div key={channel} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {channel === 'email' && <Mail className="h-4 w-4 text-blue-600" />}
                        {channel === 'whatsapp' && <MessageSquare className="h-4 w-4 text-green-600" />}
                        <span className="text-sm font-medium capitalize">{channel}</span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {count} ({percentage.toFixed(0)}%)
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          channel === 'email' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 
                          'bg-gradient-to-r from-green-500 to-green-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Surveys */}
      <Card className="analytics-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Calendar className="h-5 w-5 text-purple-600" />
            {t('recentFeedback.title', { default: 'Recent Feedback' })}
          </CardTitle>
          <CardDescription>
            {t('recentFeedback.subtitle', { default: 'Latest customer satisfaction responses and comments' })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.surveys.slice(0, 10).map((survey) => (
              <div key={survey.id} className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/60 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= survey.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-slate-300'
                      }`}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  {survey.comment && (
                    <div className="text-sm text-slate-700 dark:text-slate-300 mb-2 line-clamp-2">
                      &ldquo;{survey.comment}&rdquo;
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <Badge variant="outline" className="text-xs bg-white dark:bg-slate-700">
                      {survey.channel === 'email' && <Mail className="h-3 w-3 mr-1" />}
                      {survey.channel === 'whatsapp' && <MessageSquare className="h-3 w-3 mr-1" />}
                      {survey.channel}
                    </Badge>
                    <span>•</span>
                    <span>{new Date(survey.respondedAt || survey.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className={`text-lg font-bold ${getRatingColor(survey.rating)}`}>
                  {survey.rating}/5
                </div>
              </div>
            ))}
            
            {analytics.surveys.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-8 w-8 text-slate-400" />
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  {t('recentFeedback.noResponses', { default: 'No survey responses yet' })}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}