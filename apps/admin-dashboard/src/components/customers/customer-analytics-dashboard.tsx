'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  FaChartBar,
  FaChartLine,
  FaArrowUp,
  FaArrowDown,
  FaUsers,
  FaRunning,
  FaBullseye,
  FaCalendarAlt,
  FaFilter,
  FaDownload,
  FaExclamationTriangle,
  FaCheckCircle,
  FaClock,
  FaGlobe,
  FaComment,
  FaEnvelope,
  FaPhone,
  FaCrown,
  FaStar,
  FaEye,
  FaDollarSign
} from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { cn } from '@/lib/utils';
import { customersApi } from '@/lib/api/customers-client';

// Enhanced Metric Card Component
function ModernMetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  color = 'blue',
  loading = false,
  subtitle
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'emerald' | 'amber' | 'indigo';
  loading?: boolean;
  subtitle?: string;
}) {

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="text-right space-y-1.5">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <Skeleton className="h-3 w-28" />
        </CardContent>
      </Card>
    );
  }

  const getTrendBadge = () => {
    if (trend === 'up') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
          <FaArrowUp className="h-2.5 w-2.5" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      );
    }
    if (trend === 'down') {
      return (
        <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400 border border-red-200 dark:border-red-800">
          <FaArrowDown className="h-2.5 w-2.5" />
          <span className="text-xs font-medium">{change}</span>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 border border-border">
        <div className="h-2 w-2 rounded-full bg-muted-foreground/50" />
        <span className="text-xs font-medium text-muted-foreground">{change}</span>
      </div>
    );
  };

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    pink: 'text-pink-600 dark:text-pink-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    indigo: 'text-indigo-600 dark:text-indigo-400'
  };

  const iconBgClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/50',
    green: 'bg-green-50 dark:bg-green-950/50',
    purple: 'bg-purple-50 dark:bg-purple-950/50',
    orange: 'bg-orange-50 dark:bg-orange-950/50',
    red: 'bg-red-50 dark:bg-red-950/50',
    pink: 'bg-pink-50 dark:bg-pink-950/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/50',
    amber: 'bg-amber-50 dark:bg-amber-950/50',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/50'
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-lg ${iconBgClasses[color]}`}>
            <Icon className={`h-4 w-4 ${iconColorClasses[color]}`} />
          </div>
          <div className="text-right">
            <div className="text-xl font-semibold text-foreground">
              {value}
            </div>
            <div className="text-xs text-muted-foreground">{title}</div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          {getTrendBadge()}
          {subtitle && (
            <span className="text-xs text-muted-foreground">
              {subtitle}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Enhanced Chart Card Component
function ModernChartCard({
  title,
  description,
  icon: Icon,
  color = 'blue',
  children,
  loading = false
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'pink' | 'emerald' | 'amber' | 'indigo';
  children: React.ReactNode;
  loading?: boolean;
}) {

  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  const iconColorClasses = {
    blue: 'text-blue-600 dark:text-blue-400',
    green: 'text-green-600 dark:text-green-400',
    purple: 'text-purple-600 dark:text-purple-400',
    orange: 'text-orange-600 dark:text-orange-400',
    red: 'text-red-600 dark:text-red-400',
    pink: 'text-pink-600 dark:text-pink-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    indigo: 'text-indigo-600 dark:text-indigo-400'
  };

  const iconBgClasses = {
    blue: 'bg-blue-50 dark:bg-blue-950/50',
    green: 'bg-green-50 dark:bg-green-950/50',
    purple: 'bg-purple-50 dark:bg-purple-950/50',
    orange: 'bg-orange-50 dark:bg-orange-950/50',
    red: 'bg-red-50 dark:bg-red-950/50',
    pink: 'bg-pink-50 dark:bg-pink-950/50',
    emerald: 'bg-emerald-50 dark:bg-emerald-950/50',
    amber: 'bg-amber-50 dark:bg-amber-950/50',
    indigo: 'bg-indigo-50 dark:bg-indigo-950/50'
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${iconBgClasses[color]}`}>
            <Icon className={`h-4 w-4 ${iconColorClasses[color]}`} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {children}
      </CardContent>
    </Card>
  );
}

export function CustomerAnalyticsDashboard() {
  const t = useTranslations('customers');
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedMetric, setSelectedMetric] = useState('all');
  const [dashboard, setDashboard] = useState<Record<string, unknown> | null>(null);
  const [behavioral, setBehavioral] = useState<Record<string, unknown> | null>(null);
  const [predictive, setPredictive] = useState<Record<string, unknown> | null>(null);
  const [trends, setTrends] = useState<{ csatTrend: Array<{ label: string; value: number }>; clvTrend: Array<{ label: string; value: number }> } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const [db, beh, pred, tr] = await Promise.all([
          customersApi.getAnalyticsDashboard({ timeframe }).catch(() => null),
          customersApi.getBehavioralAnalytics({ timeframe }).catch(() => null),
          customersApi.getPredictiveInsights().catch(() => null),
          customersApi.getTrends({ timeframe }).catch(() => null)
        ]);
        if (!cancelled) {
          setDashboard(db);
          setBehavioral(beh);
          setPredictive(pred);
          setTrends(tr);
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

    const behavioralData = (behavioral || {}) as Record<string, unknown>;
    const dashboardData = (dashboard || {}) as Record<string, unknown>;
    const predictiveData = (predictive || {}) as Record<string, unknown>;

    const preferred = ((behavioralData as any)?.interactionPatterns?.preferredChannels || []) as Array<{ channel: string; percentage: number; trend?: number }>;
    const preferredWithColors = preferred.length ? preferred.map((p, i) => ({ ...p, trend: p.trend ?? 0, color: ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-pink-500'][i % 4] })) : defaultPreferred;

    const cohortDefault = [
      { cohort: 'Jan', retention: [100, 85, 72, 65, 58, 52], color: 'bg-blue-500' },
      { cohort: 'Feb', retention: [100, 88, 75, 68, 61, 55], color: 'bg-green-500' },
    ];

    return {
      behavioralInsights: {
        preferredChannels: preferredWithColors,
        peakHours: (((behavioralData as any)?.interactionPatterns?.peakHours || []) as Array<{ hour: number; interactions: number }>).map((h) => ({ hour: String(h.hour).padStart(2, '0') + ' ' + 'AM', interactions: h.interactions, percentage: Math.round((h.interactions || 0) / 8) }))
          .slice(0, 4),
        responsePreferences: ((behavioralData as any)?.interactionPatterns?.responseTimePreferences) || { immediate: 35, within1Hour: 40, within24Hours: 20, flexible: 5 }
      },
      engagementMetrics: {
        averageSessionDuration: ((dashboardData as any)?.overview?.avgSessionDuration) ?? 8.5,
        pagesPerSession: ((dashboardData as any)?.overview?.pagesPerSession) ?? 4.2,
        bounceRate: ((dashboardData as any)?.overview?.bounceRate) ?? 25.3,
        returnVisitorRate: ((dashboardData as any)?.overview?.returnVisitorRate) ?? 68.7,
        emailOpenRate: ((dashboardData as any)?.overview?.emailOpenRate) ?? 24.5,
        clickThroughRate: ((dashboardData as any)?.overview?.clickThroughRate) ?? 3.8
      },
      conversionFunnel: ((((dashboardData as any)?.trends?.funnel) || [
        { stage: t('analytics.funnelStages.awareness'), count: 1000, percentage: 100, color: 'bg-blue-500' },
        { stage: t('analytics.funnelStages.interest'), count: 450, percentage: 45, color: 'bg-green-500' },
        { stage: t('analytics.funnelStages.consideration'), count: 280, percentage: 28, color: 'bg-yellow-500' },
        { stage: t('analytics.funnelStages.purchase'), count: 180, percentage: 18, color: 'bg-orange-500' },
        { stage: t('analytics.funnelStages.retention'), count: 120, percentage: 12, color: 'bg-purple-500' }
      ]) as Array<{ stage?: string; count?: number; percentage?: number }>).map((s, i: number) => ({
        stage: s.stage || ['Awareness', 'Interest', 'Consideration', 'Purchase', 'Retention'][i] || 'Stage',
        count: s.count ?? 0,
        percentage: s.percentage ?? Math.max(5, 100 - i * 20),
        color: ['bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-orange-500', 'bg-purple-500'][i % 5]
      })),
      cohortAnalysis: ((((dashboardData as any)?.trends?.cohorts) || cohortDefault) as Array<{ cohort: string; retention: number[]; color: string }>),
      csatTrend: (trends?.csatTrend || []),
      clvTrend: (trends?.clvTrend || []),
      predictiveInsights: {
        churnPrediction: {
          highRisk: ((predictiveData as any)?.churnPrediction?.highRisk) ?? ((predictiveData as any)?.churnPrediction?.highRiskCustomers) ?? 85,
          mediumRisk: ((predictiveData as any)?.churnPrediction?.mediumRisk) ?? ((predictiveData as any)?.churnPrediction?.mediumRiskCustomers) ?? 120,
          lowRisk: ((predictiveData as any)?.churnPrediction?.lowRisk) ?? ((predictiveData as any)?.churnPrediction?.lowRiskCustomers) ?? 1045,
          predictedRate: ((predictiveData as any)?.churnPrediction?.predictedRate) ?? ((predictiveData as any)?.churnPrediction?.predictedChurnRate) ?? 6.8
        },
        lifetimeValueForecast: {
          nextQuarter: ((predictiveData as any)?.lifetimeValueForecast?.nextQuarter) ?? 2150000,
          nextYear: ((predictiveData as any)?.lifetimeValueForecast?.nextYear) ?? 8600000,
          growth: ((predictiveData as any)?.lifetimeValueForecast?.growth) ?? 15.2
        },
        upsellOpportunities: ((((predictiveData as any)?.upsellOpportunities) || [
          { segment: t('analytics.segments.vipCustomers'), potential: 450000, probability: 75, customers: 45 },
          { segment: t('analytics.segments.engagedUsers'), potential: 280000, probability: 65, customers: 120 }
        ]) as Array<{ segment: string; potential: number; probability: number; customers: number }>)
      }
    };
  }, [behavioral, dashboard, predictive, t, trends?.csatTrend, trends?.clvTrend]);

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
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaChartBar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            <h2 className="text-2xl font-semibold">Customer Analytics</h2>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]">
                  Deep insights into customer behavior and engagement patterns
                </p>
          </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2">
              <Select value={timeframe} onValueChange={(v) => setTimeframe(v as '7d' | '30d' | '90d' | '1y')}>
              <SelectTrigger className="h-8 w-36 text-xs border-0 shadow-sm">
                <FaCalendarAlt className="h-3 w-3 mr-1.5 text-muted-foreground" />
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
              <SelectTrigger className="h-8 w-40 text-xs border-0 shadow-sm">
                <FaFilter className="h-3 w-3 mr-1.5 text-muted-foreground" />
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
              <Button 
              variant="ghost" 
                size="sm" 
                disabled={loading} 
                onClick={async () => {
                  try {
                    setLoading(true)
                    const [db, beh, pred] = await Promise.all([
                      customersApi.getAnalyticsDashboard({ timeframe }).catch(() => null),
                      customersApi.getBehavioralAnalytics({ timeframe }).catch(() => null),
                      customersApi.getPredictiveInsights().catch(() => null)
                    ])
                    setDashboard(db); setBehavioral(beh); setPredictive(pred)
                  } finally { setLoading(false) }
                }} 
              className="h-8 w-8 p-0"
              >
              <MdRefresh className={cn("h-4 w-4", loading && "animate-spin")} />
              </Button>
            <Button variant="outline" size="sm" className="h-8 text-xs border-0 shadow-sm">
              <FaDownload className="h-3 w-3 mr-1.5" />
                {t('analytics.export')}
              </Button>
          </div>
        </div>
      </div>

      {/* Enhanced Behavioral Insights */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Channel Preferences */}
        <ModernChartCard
          title={t('analytics.channelPreferences')}
          description="Customer communication preferences"
          icon={FaChartBar}
          color="blue"
          loading={loading}
        >
          <div className="space-y-3">
            {analyticsData.behavioralInsights.preferredChannels.map((channel, index) => (
              <div key={channel.channel} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-muted/50">
                      {channel.channel.toLowerCase().includes('email') && <FaEnvelope className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />}
                      {channel.channel.toLowerCase().includes('whatsapp') && <FaComment className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />}
                      {channel.channel.toLowerCase().includes('phone') && <FaPhone className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />}
                      {!channel.channel.toLowerCase().includes('email') && !channel.channel.toLowerCase().includes('whatsapp') && !channel.channel.toLowerCase().includes('phone') && <FaGlobe className="h-3.5 w-3.5 text-muted-foreground" />}
                    </div>
                    <span className="text-sm font-medium text-foreground">{channel.channel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-semibold text-foreground">{channel.percentage}%</span>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted/50 border border-border">
                      {channel.trend > 0 ? (
                        <FaArrowUp className="h-2.5 w-2.5 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <FaArrowDown className="h-2.5 w-2.5 text-red-600 dark:text-red-400" />
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
          </div>
        </ModernChartCard>

        {/* Peak Hours */}
        <ModernChartCard
          title={t('analytics.peakHours')}
          description="When customers are most active"
          icon={FaClock}
          color="amber"
          loading={loading}
        >
          <div className="space-y-2.5">
            {analyticsData.behavioralInsights.peakHours.length > 0 ?
              analyticsData.behavioralInsights.peakHours.map((hour: { hour: string; interactions: number; percentage: number }, index: number) => (
                <div key={hour.hour} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50/50 dark:bg-amber-950/30 border border-amber-200/50 dark:border-amber-800/50">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 bg-amber-500 dark:bg-amber-600 rounded-lg flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">{hour.hour}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="text-xs font-medium text-foreground">Activity</div>
                        <div className="text-xs text-muted-foreground">{hour.percentage}%</div>
                      </div>
                      <Progress value={hour.percentage} className="h-1.5" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-foreground">{hour.interactions}</div>
                    <div className="text-xs text-muted-foreground">interactions</div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-8">
                  <div className="w-10 h-10 bg-amber-50 dark:bg-amber-950/50 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <FaClock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">No Peak Hour Data</h3>
                  <p className="text-xs text-muted-foreground mb-1">Peak hour analytics will appear here as customer interactions increase.</p>
                  <p className="text-xs text-muted-foreground">This helps optimize support team scheduling.</p>
                </div>
              )
            }
          </div>
        </ModernChartCard>
      </div>

      {/* Engagement Metrics */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
            <FaRunning className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('analytics.engagementMetrics')}</h3>
            <p className="text-xs text-muted-foreground">Key engagement performance indicators</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ModernMetricCard
            title={t('analytics.avgSessionDuration')}
            value={`${analyticsData.engagementMetrics.averageSessionDuration}m`}
            change="+12.5%"
            trend="up"
            icon={FaClock}
            color="emerald"
            subtitle={t('analytics.fromLastMonth', { value: '+12.5%' })}
          />

          <ModernMetricCard
            title={t('analytics.pagesPerSession')}
            value={analyticsData.engagementMetrics.pagesPerSession.toString()}
            change="+8.3%"
            trend="up"
            icon={FaEye}
            color="blue"
            subtitle={t('analytics.fromLastMonth', { value: '+8.3%' })}
          />

          <ModernMetricCard
            title={t('analytics.bounceRate')}
            value={formatPercentage(analyticsData.engagementMetrics.bounceRate)}
            change="-2.1%"
            trend="down"
            icon={FaArrowDown}
            color="emerald"
            subtitle={t('analytics.fromLastMonth', { value: '-2.1%' })}
          />

          <ModernMetricCard
            title={t('analytics.returnVisitorRate')}
            value={formatPercentage(analyticsData.engagementMetrics.returnVisitorRate)}
            change="+5.7%"
            trend="up"
            icon={FaUsers}
            color="purple"
            subtitle={t('analytics.fromLastMonth', { value: '+5.7%' })}
          />

          <ModernMetricCard
            title={t('analytics.emailOpenRate')}
            value={formatPercentage(analyticsData.engagementMetrics.emailOpenRate)}
            change="-1.2%"
            trend="down"
            icon={FaEnvelope}
            color="amber"
            subtitle={t('analytics.fromLastMonth', { value: '-1.2%' })}
          />

          <ModernMetricCard
            title={t('analytics.clickThroughRate')}
            value={formatPercentage(analyticsData.engagementMetrics.clickThroughRate)}
            change="+0.5%"
            trend="up"
            icon={FaBullseye}
            color="indigo"
            subtitle={t('analytics.fromLastMonth', { value: '+0.5%' })}
          />
        </div>
      </div>

      {/* Conversion & Retention */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Conversion Funnel */}
        <ModernChartCard
          title={t('analytics.conversionFunnel')}
          description="Customer journey stages"
          icon={FaBullseye}
          color="purple"
          loading={loading}
        >
          <div className="space-y-4">
            {analyticsData.conversionFunnel && analyticsData.conversionFunnel.length > 0 ?
              analyticsData.conversionFunnel.map((stage: { stage: string; count: number; percentage: number }, index: number) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-purple-500 dark:bg-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold">
                        {index + 1}
                      </div>
                      <span className="text-sm font-medium text-foreground">{stage.stage}</span>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-foreground">{stage.count.toLocaleString()}</div>
                      <div className="text-xs text-muted-foreground">{stage.percentage}%</div>
                    </div>
                  </div>
                  <div className="relative">
                    <Progress value={stage.percentage} className="h-2" />
                    {index < analyticsData.conversionFunnel.length - 1 && (
                      <div className="absolute -bottom-5 left-0 text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                        {t('analytics.conversionRate', { rate: Math.round((analyticsData.conversionFunnel[index + 1].count / stage.count) * 100) })}
                      </div>
                    )}
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-purple-50 dark:bg-purple-950/50 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <FaBullseye className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">No Conversion Data</h3>
                  <p className="text-xs text-muted-foreground mb-1">Conversion funnel data will appear here as customers progress through your sales stages.</p>
                  <p className="text-xs text-muted-foreground">Track visitor to customer conversion rates.</p>
                </div>
              )
            }
          </div>
        </ModernChartCard>

        {/* Cohort Analysis */}
        <ModernChartCard
          title={t('analytics.cohortAnalysis')}
          description={t('analytics.retentionRatesByMonth')}
          icon={FaUsers}
          color="indigo"
          loading={loading}
        >
          <div className="space-y-4">
            {analyticsData.cohortAnalysis && analyticsData.cohortAnalysis.length > 0 ?
              analyticsData.cohortAnalysis.map((cohort: { cohort: string; retention: number[]; color: string }) => (
                <div key={cohort.cohort} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-indigo-500 dark:bg-indigo-600 rounded-lg flex items-center justify-center text-white text-xs font-semibold">
                        {cohort.cohort.slice(0, 3)}
                      </div>
                      <span className="text-sm font-medium text-foreground">{cohort.cohort}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-foreground">
                        {t('analytics.retained', { rate: cohort.retention[cohort.retention.length - 1] })}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {cohort.retention.map((rate: number, index: number) => (
                      <div
                        key={index}
                        className="flex-1 h-6 bg-muted rounded-lg relative overflow-hidden group hover:opacity-90 transition-opacity duration-200"
                      >
                        <div
                          className={cn("h-full transition-all duration-500", cohort.color)}
                          style={{ width: `${rate}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center text-[10px] font-semibold text-white drop-shadow-sm">
                          {rate}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="text-center py-10">
                  <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg flex items-center justify-center mb-3 mx-auto">
                    <FaUsers className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">No Cohort Data</h3>
                  <p className="text-xs text-muted-foreground mb-1">Customer retention cohort analysis will appear here as you acquire more customers.</p>
                  <p className="text-xs text-muted-foreground">Track how well you retain customers over time.</p>
                </div>
              )
            }
          </div>
        </ModernChartCard>
      </div>

      {/* Predictive Insights */}
      <div className="space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-pink-50 dark:bg-pink-950/50">
            <FaChartLine className="h-4 w-4 text-pink-600 dark:text-pink-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{t('analytics.predictiveInsights')}</h3>
            <p className="text-xs text-muted-foreground">AI-powered forecasting and predictions</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {/* Churn Prediction */}
          <ModernChartCard
            title={t('analytics.churnPrediction')}
            description="Customer churn risk analysis"
            icon={FaExclamationTriangle}
            color="red"
            loading={loading}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-50/50 dark:bg-red-950/30 border border-red-200/50 dark:border-red-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-red-100 dark:bg-red-900/30 rounded">
                    <FaExclamationTriangle className="h-3 w-3 text-red-600 dark:text-red-400" />
                  </div>
                  <span className="text-xs font-medium text-red-800 dark:text-red-300">{t('analytics.highRisk')}</span>
                </div>
                <span className="text-sm font-semibold text-red-900 dark:text-red-200">{analyticsData.predictiveInsights.churnPrediction.highRisk}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-orange-50/50 dark:bg-orange-950/30 border border-orange-200/50 dark:border-orange-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-orange-100 dark:bg-orange-900/30 rounded">
                    <FaClock className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                  </div>
                  <span className="text-xs font-medium text-orange-800 dark:text-orange-300">{t('analytics.mediumRisk')}</span>
                </div>
                <span className="text-sm font-semibold text-orange-900 dark:text-orange-200">{analyticsData.predictiveInsights.churnPrediction.mediumRisk}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/30 border border-emerald-200/50 dark:border-emerald-800/50">
                <div className="flex items-center gap-2">
                  <div className="p-1 bg-emerald-100 dark:bg-emerald-900/30 rounded">
                    <FaCheckCircle className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">{t('analytics.lowRisk')}</span>
                </div>
                <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">{analyticsData.predictiveInsights.churnPrediction.lowRisk}</span>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-1">{t('analytics.predictedChurnRate')}</div>
                <div className="text-base font-semibold text-orange-600 dark:text-orange-400">
                  {analyticsData.predictiveInsights.churnPrediction.predictedRate}%
                </div>
              </div>
            </div>
          </ModernChartCard>

          {/* Lifetime Value Forecast */}
          <ModernChartCard
            title={t('analytics.lifetimeValueForecast')}
            description="Revenue projections and growth forecasts"
            icon={FaArrowUp}
            color="blue"
            loading={loading}
          >
            <div className="space-y-2.5">
              <div className="p-2.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <FaCalendarAlt className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <div className="text-xs font-medium text-blue-600 dark:text-blue-400">{t('analytics.nextQuarter')}</div>
                </div>
                <div className="text-base font-semibold text-blue-900 dark:text-blue-200">
                  {formatCurrency(analyticsData.predictiveInsights.lifetimeValueForecast.nextQuarter)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-200/50 dark:border-indigo-800/50">
                <div className="flex items-center gap-2 mb-1">
                  <FaStar className="h-3 w-3 text-indigo-600 dark:text-indigo-400" />
                  <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{t('analytics.nextYear')}</div>
                </div>
                <div className="text-base font-semibold text-indigo-900 dark:text-indigo-200">
                  {formatCurrency(analyticsData.predictiveInsights.lifetimeValueForecast.nextYear)}
                </div>
              </div>
              <div className="pt-2 border-t border-border/50">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                  <FaArrowUp className="h-3 w-3" />
                  <span className="text-xs font-medium">
                    {t('analytics.growth', { rate: `+${analyticsData.predictiveInsights.lifetimeValueForecast.growth}%` })}
                  </span>
                </div>
              </div>
            </div>
          </ModernChartCard>

          {/* Upsell Opportunities */}
          <ModernChartCard
            title={t('analytics.upsellOpportunities')}
            description="Revenue growth opportunities"
            icon={FaCrown}
            color="purple"
            loading={loading}
          >
            <div className="space-y-2.5">
              {analyticsData.predictiveInsights.upsellOpportunities.map((opportunity) => (
                <div key={opportunity.segment} className="p-2.5 rounded-lg bg-purple-50/50 dark:bg-purple-950/30 border border-purple-200/50 dark:border-purple-800/50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="p-1 bg-purple-100 dark:bg-purple-900/30 rounded">
                      <FaCrown className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="text-xs font-semibold text-purple-900 dark:text-purple-200">{opportunity.segment}</div>
                  </div>
                  <div className="text-xs text-purple-600 dark:text-purple-400 mb-1.5">
                    {t('analytics.customersCount', { count: opportunity.customers })}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-200">
                      {formatCurrency(opportunity.potential)}
                    </span>
                    <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 text-xs border-0">
                      {t('analytics.likely', { probability: opportunity.probability })}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </ModernChartCard>
        </div>
      </div>

      {/* CSAT and CLV Trends */}
      <div className="grid gap-4 md:grid-cols-2">
        <ModernChartCard
          title={t('analytics.csatTrend', { fallback: 'CSAT Trend' })}
          description={t('analytics.csatTrendDesc', { fallback: 'Average satisfaction over time' })}
          icon={FaCheckCircle}
          color="emerald"
          loading={loading}
        >
          <div className="space-y-3">
            {(analyticsData.csatTrend || []).length ? (
              (analyticsData.csatTrend as Array<{ label: string; value: number }>).map((pt, i) => (
                <div key={`csat-${pt.label}-${i}`} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-muted-foreground">{pt.label}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-2 bg-emerald-500" style={{ width: `${Math.max(0, Math.min(100, pt.value))}%` }} />
                    </div>
                  </div>
                  <div className="w-12 text-right text-xs font-medium">{pt.value}%</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">{t('analytics.noCsatData', { fallback: 'No CSAT data yet' })}</div>
            )}
          </div>
        </ModernChartCard>

        <ModernChartCard
          title={t('analytics.clvTrend', { fallback: 'CLV Trend' })}
          description={t('analytics.clvTrendDesc', { fallback: 'Revenue proxy over time' })}
          icon={FaDollarSign}
          color="amber"
          loading={loading}
        >
          <div className="space-y-3">
            {(analyticsData.clvTrend || []).length ? (
              (analyticsData.clvTrend as Array<{ label: string; value: number }>).map((pt, i) => (
                <div key={`clv-${pt.label}-${i}`} className="flex items-center gap-3">
                  <div className="w-16 text-xs text-muted-foreground">{pt.label}</div>
                  <div className="flex-1">
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-2 bg-amber-500" style={{ width: `${Math.min(100, Math.round(pt.value))}%` }} />
                    </div>
                  </div>
                  <div className="w-20 text-right text-xs font-medium">{formatCurrency(pt.value)}</div>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground">{t('analytics.noClvData', { fallback: 'No CLV data yet' })}</div>
            )}
          </div>
        </ModernChartCard>
      </div>
    </div>
  );
}