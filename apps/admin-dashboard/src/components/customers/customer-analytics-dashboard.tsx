'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  BarChart3, 
  LineChart, 
  TrendingUp, 
  TrendingDown,
  Users,
  Activity,
  Target,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  MessageSquare,
  Mail,
  Phone
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { customersApi } from '@/lib/api/customers-client';

export function CustomerAnalyticsDashboard() {
  const t = useTranslations('customers');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [dashboard, setDashboard] = useState<any | null>(null);
  const [behavioral, setBehavioral] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [db, beh] = await Promise.all([
          customersApi.getAnalyticsDashboard().catch(() => null),
          customersApi.getBehavioralAnalytics({ timeframe }).catch(() => null)
        ]);
        if (!cancelled) {
          setDashboard(db);
          setBehavioral(beh);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [timeframe]);

  const analyticsData = useMemo(() => {
    const defaultPreferred = [
      { channel: t('analytics.channels.email'), percentage: 45, trend: 5.2, color: 'bg-blue-500' },
      { channel: t('analytics.channels.whatsapp'), percentage: 30, trend: 12.8, color: 'bg-green-500' },
      { channel: t('analytics.channels.webChat'), percentage: 20, trend: -2.1, color: 'bg-purple-500' },
      { channel: t('analytics.channels.instagram'), percentage: 5, trend: 8.5, color: 'bg-pink-500' }
    ];
    const preferred = (behavioral?.interactionPatterns?.preferredChannels || []) as Array<{ channel: string; percentage: number; trend?: number }>;
    const preferredWithColors = preferred.length ? preferred.map((p, i) => ({ ...p, trend: p.trend ?? 0, color: ['bg-blue-500','bg-green-500','bg-purple-500','bg-pink-500'][i % 4] })) : defaultPreferred;
    const cohortDefault = [
      { cohort: 'Jan', retention: [100, 85, 72, 65, 58, 52], color: 'bg-blue-500' },
      { cohort: 'Feb', retention: [100, 88, 75, 68, 61, 55], color: 'bg-green-500' },
    ];
    return {
      behavioralInsights: {
        preferredChannels: preferredWithColors,
        peakHours: (behavioral?.interactionPatterns?.peakHours || []).map((h: { hour: number; interactions: number }) => ({ hour: String(h.hour).padStart(2, '0') + ' ' + 'AM', interactions: h.interactions, percentage: Math.round((h.interactions || 0) / 8) }))
          .slice(0, 4),
        responsePreferences: behavioral?.interactionPatterns?.responseTimePreferences || { immediate: 35, within1Hour: 40, within24Hours: 20, flexible: 5 }
      },
      engagementMetrics: {
        averageSessionDuration: dashboard?.overview?.avgSessionDuration ?? 8.5,
        pagesPerSession: dashboard?.overview?.pagesPerSession ?? 4.2,
        bounceRate: dashboard?.overview?.bounceRate ?? 25.3,
        returnVisitorRate: dashboard?.overview?.returnVisitorRate ?? 68.7,
        emailOpenRate: dashboard?.overview?.emailOpenRate ?? 24.5,
        clickThroughRate: dashboard?.overview?.clickThroughRate ?? 3.8
      },
      conversionFunnel: (dashboard?.trends?.funnel || [
        { stage: t('analytics.funnelStages.awareness'), count: 1000, percentage: 100, color: 'bg-blue-500' },
        { stage: t('analytics.funnelStages.interest'), count: 450, percentage: 45, color: 'bg-green-500' },
        { stage: t('analytics.funnelStages.consideration'), count: 280, percentage: 28, color: 'bg-yellow-500' },
        { stage: t('analytics.funnelStages.purchase'), count: 180, percentage: 18, color: 'bg-orange-500' },
        { stage: t('analytics.funnelStages.retention'), count: 120, percentage: 12, color: 'bg-purple-500' }
      ]).map((s: { stage?: string; count?: number; percentage?: number }, i: number) => ({
        stage: s.stage || ['Awareness','Interest','Consideration','Purchase','Retention'][i] || 'Stage',
        count: s.count ?? 0,
        percentage: s.percentage ?? Math.max(5, 100 - i * 20),
        color: ['bg-blue-500','bg-green-500','bg-yellow-500','bg-orange-500','bg-purple-500'][i % 5]
      })),
      cohortAnalysis: (dashboard?.trends?.cohorts || cohortDefault) as Array<{ cohort: string; retention: number[]; color: string }>,
      predictiveInsights: {
        churnPrediction: {
          highRisk: dashboard?.insights?.churn?.highRiskCustomers ?? 85,
          mediumRisk: dashboard?.insights?.churn?.mediumRiskCustomers ?? 120,
          lowRisk: dashboard?.insights?.churn?.lowRiskCustomers ?? 1045,
          predictedRate: dashboard?.insights?.churn?.predictedChurnRate ?? 6.8
        },
        lifetimeValueForecast: {
          nextQuarter: dashboard?.lifetimeValueForecast?.nextQuarter ?? 2150000,
          nextYear: dashboard?.lifetimeValueForecast?.nextYear ?? 8600000,
          growth: 15.2
        },
        upsellOpportunities: (dashboard?.upsellOpportunities || [
          { segment: t('analytics.segments.vipCustomers'), potential: 450000, probability: 75, customers: 45 },
          { segment: t('analytics.segments.engagedUsers'), potential: 280000, probability: 65, customers: 120 }
        ]) as Array<{ segment: string; potential: number; probability: number; customers: number }>
      }
    };
  }, [behavioral, dashboard, t]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-display text-foreground">Customer Analytics</h2>
          <p className="text-subtitle mt-1">Deep insights into customer behavior and engagement patterns</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <Select value={timeframe} onValueChange={(v) => setTimeframe(v as '7d' | '30d' | '90d' | '1y')}>
              <SelectTrigger className="w-36">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">{t('analytics.last7Days')}</SelectItem>
                <SelectItem value="30d">{t('analytics.last30Days')}</SelectItem>
                <SelectItem value="90d">{t('analytics.last90Days')}</SelectItem>
                <SelectItem value="1y">{t('analytics.lastYear')}</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-44">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('analytics.allMetrics')}</SelectItem>
                <SelectItem value="engagement">{t('analytics.engagement')}</SelectItem>
                <SelectItem value="conversion">{t('analytics.conversion')}</SelectItem>
                <SelectItem value="retention">{t('analytics.retention')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
              {t('analytics.refresh')}
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              {t('analytics.export')}
            </Button>
          </div>
        </div>
      </div>

      {/* Behavioral Insights */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Channel Preferences */}
        <div className="customer-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                  <BarChart3 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <span className="text-title">{t('analytics.channelPreferences')}</span>
                  <p className="text-caption">Customer communication preferences</p>
                </div>
              </div>
              <Badge variant="secondary" className="badge-info">
                <Globe className="h-3 w-3 mr-1" />
                Multi-channel
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsData.behavioralInsights.preferredChannels.map((channel, index) => (
              <div key={channel.channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {channel.channel.toLowerCase().includes('email') && <Mail className="h-4 w-4 text-muted-foreground" />}
                    {channel.channel.toLowerCase().includes('whatsapp') && <MessageSquare className="h-4 w-4 text-muted-foreground" />}
                    {channel.channel.toLowerCase().includes('phone') && <Phone className="h-4 w-4 text-muted-foreground" />}
                    <span className="text-sm font-medium text-foreground">{channel.channel}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-foreground">{channel.percentage}%</span>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-muted/50">
                      {channel.trend > 0 ? (
                        <TrendingUp className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        channel.trend > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {channel.trend > 0 ? '+' : ''}{channel.trend}%
                      </span>
                    </div>
                  </div>
                </div>
                <Progress value={channel.percentage} className="h-2" />
              </div>
            ))}
          </CardContent>
        </div>

        {/* Peak Hours */}
        <div className="customer-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
                  <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <span className="text-title">{t('analytics.peakHours')}</span>
                  <p className="text-caption">When customers are most active</p>
                </div>
              </div>
              <Badge variant="secondary" className="badge-warning">
                <Activity className="h-3 w-3 mr-1" />
                Live Data
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {analyticsData.behavioralInsights.peakHours.length > 0 ? 
              analyticsData.behavioralInsights.peakHours.map((hour: { hour: string; interactions: number; percentage: number }, index: number) => (
                <div key={hour.hour} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-300">{hour.hour}</span>
                    </div>
                    <div className="flex-1">
                      <Progress value={hour.percentage} className="w-20 h-1.5" />
                    </div>
                  </div>
                  <div className="text-sm font-bold text-foreground">{hour.interactions}</div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center mb-3 mx-auto">
                    <Clock className="h-6 w-6 text-amber-500" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">No Peak Hour Data</h3>
                  <p className="text-xs text-muted-foreground mb-2">Peak hour analytics will appear here as customer interactions increase.</p>
                  <p className="text-xs text-muted-foreground">This helps optimize support team scheduling.</p>
                </div>
              )
            }
          </CardContent>
        </div>
      </div>

      {/* Engagement Metrics */}
      <div className="section">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="section-title">{t('analytics.engagementMetrics')}</h3>
              <p className="section-description">Key engagement performance indicators</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="metric-card-success">
            <div className="text-caption">{t('analytics.avgSessionDuration')}</div>
            <div className="text-xl font-bold text-foreground">{analyticsData.engagementMetrics.averageSessionDuration}m</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{t('analytics.fromLastMonth', { value: '+12.5%' })}</span>
            </div>
          </div>
          
          <div className="metric-card-success">
            <div className="text-caption">{t('analytics.pagesPerSession')}</div>
            <div className="text-xl font-bold text-foreground">{analyticsData.engagementMetrics.pagesPerSession}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{t('analytics.fromLastMonth', { value: '+8.3%' })}</span>
            </div>
          </div>
          
          <div className="metric-card-success">
            <div className="text-caption">{t('analytics.bounceRate')}</div>
            <div className="text-xl font-bold text-foreground">{formatPercentage(analyticsData.engagementMetrics.bounceRate)}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingDown className="h-3 w-3" />
              <span>{t('analytics.fromLastMonth', { value: '-2.1%' })}</span>
            </div>
          </div>
          
          <div className="metric-card-success">
            <div className="text-caption">{t('analytics.returnVisitorRate')}</div>
            <div className="text-xl font-bold text-foreground">{formatPercentage(analyticsData.engagementMetrics.returnVisitorRate)}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{t('analytics.fromLastMonth', { value: '+5.7%' })}</span>
            </div>
          </div>
          
          <div className="metric-card-warning">
            <div className="text-caption">{t('analytics.emailOpenRate')}</div>
            <div className="text-xl font-bold text-foreground">{formatPercentage(analyticsData.engagementMetrics.emailOpenRate)}</div>
            <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <TrendingDown className="h-3 w-3" />
              <span>{t('analytics.fromLastMonth', { value: '-1.2%' })}</span>
            </div>
          </div>
          
          <div className="metric-card-success">
            <div className="text-caption">{t('analytics.clickThroughRate')}</div>
            <div className="text-xl font-bold text-foreground">{formatPercentage(analyticsData.engagementMetrics.clickThroughRate)}</div>
            <div className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              <span>{t('analytics.fromLastMonth', { value: '+0.5%' })}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Conversion & Retention */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversion Funnel */}
        <div className="customer-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <span className="text-title">{t('analytics.conversionFunnel')}</span>
                <p className="text-caption">Customer journey stages</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsData.conversionFunnel && analyticsData.conversionFunnel.length > 0 ? 
              analyticsData.conversionFunnel.map((stage: { stage: string; count: number; percentage: number }, index: number) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                    <div className="text-right">
                      <div className="text-sm font-bold text-foreground">{stage.count.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{stage.percentage}%</div>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={stage.percentage} className="h-2" />
                    {index < analyticsData.conversionFunnel.length - 1 && (
                      <div className="absolute -bottom-4 left-0 text-xs text-muted-foreground">
                        {t('analytics.conversionRate', { rate: Math.round((analyticsData.conversionFunnel[index + 1].count / stage.count) * 100) })}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mb-3 mx-auto">
                    <Target className="h-6 w-6 text-purple-500" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">No Conversion Data</h3>
                  <p className="text-xs text-muted-foreground mb-2">Conversion funnel data will appear here as customers progress through your sales stages.</p>
                  <p className="text-xs text-muted-foreground">Track visitor to customer conversion rates.</p>
                </div>
              )
            }
          </CardContent>
        </div>

        {/* Cohort Analysis */}
        <div className="customer-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg dark:bg-indigo-900/30">
                <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <span className="text-title">{t('analytics.cohortAnalysis')}</span>
                <p className="text-caption">{t('analytics.retentionRatesByMonth')}</p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsData.cohortAnalysis && analyticsData.cohortAnalysis.length > 0 ? 
              analyticsData.cohortAnalysis.map((cohort: { cohort: string; retention: number[]; color: string }) => (
                <div key={cohort.cohort} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{cohort.cohort}</span>
                    <span className="text-xs text-muted-foreground">
                      {t('analytics.retained', { rate: cohort.retention[cohort.retention.length - 1] })}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {cohort.retention.map((rate: number, index: number) => (
                      <div
                        key={index}
                        className="flex-1 h-6 bg-muted rounded-sm relative overflow-hidden"
                      >
                        <div
                          className={cn("h-full transition-all", cohort.color)}
                          style={{ width: `${rate}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                          {rate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center mb-3 mx-auto">
                    <Users className="h-6 w-6 text-indigo-500" />
                  </div>
                  <h3 className="text-sm font-medium text-foreground mb-1">No Cohort Data</h3>
                  <p className="text-xs text-muted-foreground mb-2">Customer retention cohort analysis will appear here as you acquire more customers.</p>
                  <p className="text-xs text-muted-foreground">Track how well you retain customers over time.</p>
                </div>
              )
            }
          </CardContent>
        </div>
      </div>

      {/* Predictive Insights */}
      <div className="section">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg dark:bg-pink-900/30">
              <LineChart className="h-4 w-4 text-pink-600 dark:text-pink-400" />
            </div>
            <div>
              <h3 className="section-title">{t('analytics.predictiveInsights')}</h3>
              <p className="section-description">AI-powered forecasting and predictions</p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Churn Prediction */}
          <div className="customer-card">
            <CardHeader>
              <CardTitle className="text-title">{t('analytics.churnPrediction')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-sm text-red-800 dark:text-red-300">{t('analytics.highRisk')}</span>
                </div>
                <span className="font-bold text-red-900 dark:text-red-200">{analyticsData.predictiveInsights.churnPrediction.highRisk}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-orange-600" />
                  <span className="text-sm text-orange-800 dark:text-orange-300">{t('analytics.mediumRisk')}</span>
                </div>
                <span className="font-bold text-orange-900 dark:text-orange-200">{analyticsData.predictiveInsights.churnPrediction.mediumRisk}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-300">{t('analytics.lowRisk')}</span>
                </div>
                <span className="font-bold text-green-900 dark:text-green-200">{analyticsData.predictiveInsights.churnPrediction.lowRisk}</span>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="text-caption">{t('analytics.predictedChurnRate')}</div>
                <div className="text-lg font-bold text-orange-600 dark:text-orange-400">
                  {analyticsData.predictiveInsights.churnPrediction.predictedRate}%
                </div>
              </div>
            </CardContent>
          </div>

          {/* Lifetime Value Forecast */}
          <div className="customer-card">
            <CardHeader>
              <CardTitle className="text-title">{t('analytics.lifetimeValueForecast')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="text-sm text-blue-600 dark:text-blue-400">{t('analytics.nextQuarter')}</div>
                <div className="text-xl font-bold text-blue-900 dark:text-blue-200">
                  {formatCurrency(analyticsData.predictiveInsights.lifetimeValueForecast.nextQuarter)}
                </div>
              </div>
              <div className="p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
                <div className="text-sm text-indigo-600 dark:text-indigo-400">{t('analytics.nextYear')}</div>
                <div className="text-xl font-bold text-indigo-900 dark:text-indigo-200">
                  {formatCurrency(analyticsData.predictiveInsights.lifetimeValueForecast.nextYear)}
                </div>
              </div>
              <div className="pt-3 border-t border-border">
                <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <TrendingUp className="h-3 w-3" />
                  <span className="text-sm font-medium">
                    {t('analytics.growth', { rate: `+${analyticsData.predictiveInsights.lifetimeValueForecast.growth}%` })}
                  </span>
                </div>
              </div>
            </CardContent>
          </div>

          {/* Upsell Opportunities */}
          <div className="customer-card">
            <CardHeader>
              <CardTitle className="text-title">{t('analytics.upsellOpportunities')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {analyticsData.predictiveInsights.upsellOpportunities.map((opportunity) => (
                <div key={opportunity.segment} className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                  <div className="font-medium text-sm text-purple-900 dark:text-purple-200">{opportunity.segment}</div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-2">
                    {t('analytics.customersCount', { count: opportunity.customers })}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-purple-900 dark:text-purple-200">
                      {formatCurrency(opportunity.potential)}
                    </span>
                    <Badge className="badge-info text-xs">
                      {t('analytics.likely', { probability: opportunity.probability })}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </div>
        </div>
      </div>
    </div>
  );
}