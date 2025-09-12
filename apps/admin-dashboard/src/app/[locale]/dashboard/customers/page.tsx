'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Search, 
  Filter, 
  Users, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Target,
  Star,
  Zap,
  Shield,
  Award,
  Activity,
  BarChart3,
  Plus,
  CheckCircle,
} from 'lucide-react';
import { CustomerSegmentCard } from '@/components/customers/customer-segment-card';
import { CustomerHealthScore } from '@/components/customers/customer-health-score';
import { CustomerAnalyticsDashboard } from '@/components/customers/customer-analytics-dashboard';
import { Customer360Profile } from '@/components/customers/customer-360-profile';
import { cn } from '@/lib/utils';
import { useCustomerHealth, useCustomerInsights } from '@/lib/hooks/use-customer-analytics';
import { customersApi, type CustomerListItem } from '@/lib/api/customers-client';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/lib/store/auth-store';

export default function CustomersPage() {
  const t = useTranslations('customers');
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const { data: healthData, loading: healthLoading, refetch: refetchHealth } = useCustomerHealth(selectedCustomer || undefined);
  const { data: insightsData, loading: insightsLoading, refetch: refetchInsights } = useCustomerInsights(selectedCustomer || undefined);
  const params = useSearchParams();
  const [showCreate, setShowCreate] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    phone: '',
  });
  const [createErrors, setCreateErrors] = useState<Record<string, string>>({});

  const analyticsData = useMemo(() => {
    const total = customers.length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomersThisMonth = customers.filter(c => new Date(c.createdAt) >= startOfMonth).length;

    const segments = [
      {
        id: 'new-customer',
        name: t('segments.newCustomers', { fallback: 'New Customers' }),
        description: t('segments.newCustomersDesc', { fallback: 'Recently acquired customers' }),
        customerCount: newCustomersThisMonth,
        averageValue: 0,
        growthRate: 0,
        color: 'bg-blue-100 text-blue-800',
        icon: Star
      },
    ];

    const topCustomers = customers.slice(0, 3).map((c) => ({
      id: c.id,
      name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || (c.company ?? c.email ?? c.id),
      email: c.email ?? '',
      avatar: null as unknown as string | null,
      lifetimeValue: 0,
      healthScore: 0,
      riskLevel: 'low',
      lastInteraction: c.updatedAt,
      segments: [] as string[],
    }));

    return {
      overview: {
        totalCustomers: total,
        activeCustomers: total,
        newCustomersThisMonth,
        churnRate: 0,
        averageLifetimeValue: 0,
        customerSatisfactionScore: 0,
      },
      segments,
      topCustomers,
    };
  }, [customers, t]);

  const refetchCustomers = async () => {
    setLoading(true);
    try {
      const list = await customersApi.list(searchQuery || undefined);
      setCustomers(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await customersApi.list(searchQuery || undefined);
        if (!mounted) return;
        setCustomers(list);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [searchQuery]);

  useEffect(() => {
    const fromNav = params.get('customerId');
    if (fromNav) {
      setSelectedCustomer(fromNav);
      setActiveTab('customers');
    }
  }, [params]);

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // const formatDate = (dateString: string) => {
  //   return new Date(dateString).toLocaleDateString('en-US', {
  //     month: 'short',
  //     day: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   });
  // };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-6 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <div className="skeleton h-8 w-48 rounded mb-2" />
            <div className="skeleton h-4 w-64 rounded" />
          </div>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="dashboard-card">
              <CardHeader className="pb-3">
                <div className="skeleton h-4 w-24 rounded" />
              </CardHeader>
              <CardContent>
                <div className="skeleton h-8 w-16 rounded mb-2" />
                <div className="skeleton h-3 w-32 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6 space-y-8">
      {/* Clean Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-display text-foreground">
            {t('title')}
          </h1>
          <p className="text-subtitle">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Button variant="outline">
            <BarChart3 className="h-4 w-4 mr-2" />
            {t('exportReport')}
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4 mr-2" />
            {t('addCustomer')}
          </Button>
          {selectedCustomer && (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await customersApi.rescoreHealth(selectedCustomer);
                  await refetchCustomers();
                  await refetchHealth();
                } catch {
                  void 0;
                }
              }}
            >
              {t('rescoreHealth', { fallback: 'Rescore Health' })}
            </Button>
          )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-subtitle">{t('stats.totalCustomers')}</CardTitle>
            <div className="p-2 bg-primary/10 rounded-lg">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analyticsData.overview.totalCustomers.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 badge-success">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">+{analyticsData.overview.newCustomersThisMonth}</span>
              </div>
              <span className="text-caption">{t('stats.thisMonth')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-subtitle">{t('stats.activeCustomers')}</CardTitle>
            <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30">
              <Activity className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analyticsData.overview.activeCustomers.toLocaleString()}
            </div>
            <div className="mt-2">
              <span className="text-caption">
                {analyticsData.overview.totalCustomers > 0 ? (
                  `${Math.round((analyticsData.overview.activeCustomers / analyticsData.overview.totalCustomers) * 100)}% ${t('stats.ofTotal')}`
                ) : (
                  t('stats.ofTotal')
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-subtitle">{t('stats.avgLifetimeValue')}</CardTitle>
            <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
              <DollarSign className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(analyticsData.overview.averageLifetimeValue)}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 badge-success">
                <TrendingUp className="h-3 w-3" />
                <span className="text-xs font-medium">+12.5%</span>
              </div>
              <span className="text-caption">{t('stats.fromLastMonth')}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="metric-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-subtitle">{t('stats.churnRate')}</CardTitle>
            <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/30">
              <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {analyticsData.overview.churnRate}%
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex items-center gap-1 badge-success">
                <TrendingDown className="h-3 w-3" />
                <span className="text-xs font-medium">-0.8%</span>
              </div>
              <span className="text-caption">{t('stats.fromLastMonth')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Card className="customer-card">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b px-6 py-4">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview">
                <Target className="h-4 w-4 mr-2" />
                {t('tabs.overview')}
              </TabsTrigger>
              <TabsTrigger value="segments">
                <Users className="h-4 w-4 mr-2" />
                {t('tabs.segments')}
              </TabsTrigger>
              <TabsTrigger value="analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                {t('tabs.analytics')}
              </TabsTrigger>
              <TabsTrigger value="customers">
                <Users className="h-4 w-4 mr-2" />
                {t('tabs.customers')}
              </TabsTrigger>
              <TabsTrigger value="insights">
                <Zap className="h-4 w-4 mr-2" />
                {t('tabs.insights')}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6 space-y-6">
            {/* Customer Segments Overview */}
            <div className="section">
              <div className="section-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="section-title">{t('segments.title')}</h3>
                    <p className="section-description">{t('segments.description')}</p>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {analyticsData.segments.map((segment) => (
                  <CustomerSegmentCard
                    key={segment.id}
                    segment={segment}
                    onClick={() => setSelectedSegment(segment.id)}
                  />
                ))}
              </div>
            </div>

          {/* Top Customers */}
          <div className="section">
            <div className="section-header">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
                  <Award className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="section-title">{t('topCustomers.title')}</h3>
              </div>
            </div>
            <div className="space-y-3">
              {analyticsData.topCustomers.map((customer) => (
                <div
                  key={customer.id}
                  className="customer-card p-4 cursor-pointer"
                  onClick={() => setSelectedCustomer(customer.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={customer.avatar ?? undefined} />
                        <AvatarFallback className="text-sm font-medium">
                          {customer.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="text-title">{customer.name}</h4>
                        <p className="text-subtitle">{customer.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {customer.segments.map((segmentId) => {
                            const segment = analyticsData.segments.find(s => s.id === segmentId);
                            return segment ? (
                              <Badge key={segmentId} variant="secondary" className="text-xs">
                                {segment.name}
                              </Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-title">{formatCurrency(customer.lifetimeValue)}</div>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-caption">{t('healthScore')}:</span>
                        <span className={cn("text-sm font-medium", getHealthScoreColor(customer.healthScore))}>
                          {customer.healthScore}
                        </span>
                      </div>
                      <Badge className={getRiskLevelColor(customer.riskLevel)}>
                        {t(`riskLevel.${customer.riskLevel}`)}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="segments" className="p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {analyticsData.segments.map((segment) => (
              <CustomerSegmentCard
                key={segment.id}
                segment={segment}
                onClick={() => setSelectedSegment(segment.id)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <CustomerAnalyticsDashboard />
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          {selectedCustomer && healthData && (
            <CustomerHealthScore
              customerId={selectedCustomer}
              healthScore={healthData}
              onRefresh={refetchHealth}
              loading={healthLoading}
            />
          )}

          {selectedCustomer && insightsData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="h-5 w-5" />
                  <span>{t('keyInsights', { fallback: 'Key Insights' })}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {insightsData.sentimentAnalysis && (
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="text-sm text-muted-foreground">
                      {t('sentiment', { fallback: 'Sentiment' })}: <span className="font-medium">{insightsData.sentimentAnalysis.overall}</span> • {t('score', { fallback: 'Score' })}: {(insightsData.sentimentAnalysis.score * 100).toFixed(0)}% • {t('trend', { fallback: 'Trend' })}: {insightsData.sentimentAnalysis.trend}
                    </div>
                    {typeof insightsData.confidence === 'number' && (
                      <div className="text-xs text-muted-foreground">{t('confidence', { fallback: 'Confidence' })}: {Math.round((insightsData.confidence || 0) * 100)}%</div>
                    )}
                  </div>
                )}
                <div className="space-y-2">
                  {(insightsData.keyInsights || []).map((item, i) => (
                    <div key={`insight-${i}`} className="flex items-start space-x-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-blue-800">{item}</p>
                    </div>
                  ))}
                </div>
                {insightsData.behavioralAnalysis && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium mb-2">{t('recentActivity', { fallback: 'Recent Activity' })}</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {insightsData.behavioralAnalysis.recentActivity.map((a, idx) => (
                          <div key={`act-${idx}`}>{a.type}: {a.count}</div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium mb-2">{t('channelPreference', { fallback: 'Channel Preference' })}</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {insightsData.behavioralAnalysis.channelPreference.map((c, idx) => (
                          <div key={`ch-${idx}`}>{c.channel}: {c.percentage}%</div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('opportunities', { fallback: 'Opportunities' })}</h4>
                    <div className="space-y-2">
                      {(insightsData.opportunities || []).map((item, i) => (
                        <div key={`opp-${i}`} className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-green-800">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">{t('nextBestActions', { fallback: 'Next Best Actions' })}</h4>
                    <div className="space-y-2">
                      {(insightsData.nextBestActions || []).map((item, i) => (
                        <div key={`nba-${i}`} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start space-x-3">
                            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <p className="text-sm text-blue-800">{item}</p>
                          </div>
                          <Button size="sm" variant="outline">{t('execute', { fallback: 'Execute' })}</Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button size="sm" variant="secondary" onClick={refetchInsights} disabled={insightsLoading}>
                    {insightsLoading ? t('loading', { fallback: 'Loading...' }) : t('refresh', { fallback: 'Refresh' })}
                  </Button>
                </div>
                {insightsData.explanation && (
                  <div className="text-xs text-muted-foreground">{insightsData.explanation}</div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Search and Filters */}
          <div className="customer-card p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('searchCustomers')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder={t('selectSegment')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allSegments')}</SelectItem>
                  {analyticsData.segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                {t('filters')}
              </Button>
            </div>
          </div>

          {/* Customer List */}
          <div className="space-y-3">
            {analyticsData.topCustomers.map((customer) => (
              <div key={customer.id} className="customer-card p-4 cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={customer.avatar ?? undefined} />
                      <AvatarFallback className="text-sm font-medium">
                        {customer.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-title">{customer.name}</h4>
                      <p className="text-subtitle">{customer.email}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {customer.segments.map((segmentId) => {
                          const segment = analyticsData.segments.find(s => s.id === segmentId);
                          return segment ? (
                            <Badge key={segmentId} variant="secondary" className="text-xs">
                              {segment.name}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-2">
                    <div>
                      <div className="text-caption">{t('lifetimeValue')}</div>
                      <div className="text-title">{formatCurrency(customer.lifetimeValue)}</div>
                    </div>
                    <div>
                      <div className="text-caption">{t('healthScore')}</div>
                      <div className="flex items-center gap-2 justify-end">
                        <Progress value={customer.healthScore} className="w-16 h-2" />
                        <span className={cn("text-sm font-medium", getHealthScoreColor(customer.healthScore))}>
                          {customer.healthScore}
                        </span>
                      </div>
                    </div>
                    <Badge className={getRiskLevelColor(customer.riskLevel)}>
                      {t(`riskLevel.${customer.riskLevel}`)}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="insights" className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="section">
              <div className="section-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30">
                    <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <h3 className="section-title">{t('insights.opportunities')}</h3>
                </div>
              </div>
              <div className="space-y-4">
                <div className="metric-card-success p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <h4 className="text-title">{t('insights.vipGrowth')}</h4>
                  </div>
                  <p className="text-body mb-3">{t('insights.vipGrowthDesc')}</p>
                  <Button size="sm">
                    {t('insights.expandProgram')}
                  </Button>
                </div>
                
                <div className="metric-card-info p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star className="h-4 w-4" />
                    <h4 className="text-title">{t('insights.newCustomerSuccess')}</h4>
                  </div>
                  <p className="text-body mb-3">{t('insights.newCustomerSuccessDesc')}</p>
                  <Button size="sm" variant="outline">
                    {t('insights.optimizeOnboarding')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="section">
              <div className="section-header">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg dark:bg-red-900/30">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="section-title">{t('insights.risks')}</h3>
                </div>
              </div>
              <div className="space-y-4">
                <div className="metric-card-danger p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingDown className="h-4 w-4" />
                    <h4 className="text-title">{t('insights.atRiskIncrease')}</h4>
                  </div>
                  <p className="text-body mb-3">{t('insights.atRiskIncreaseDesc')}</p>
                  <Button size="sm" variant="destructive">
                    {t('insights.implementRetention')}
                  </Button>
                </div>
                
                <div className="metric-card-warning p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="h-4 w-4" />
                    <h4 className="text-title">{t('insights.supportVolumeRising')}</h4>
                  </div>
                  <p className="text-body mb-3">{t('insights.supportVolumeRisingDesc')}</p>
                  <Button size="sm" variant="outline">
                    {t('insights.reviewProcesses')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>
        </Tabs>
      </Card>

      {/* Customer 360 Profile Dialog */}
      {selectedCustomer && (
        <Customer360Profile
          customerId={selectedCustomer}
          open={!!selectedCustomer}
          onOpenChange={(open) => !open && setSelectedCustomer(null)}
        />
      )}

      {/* Create Customer Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('createDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('createDialog.description')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName">{t('createDialog.firstName')}</Label>
                <Input id="firstName" value={createForm.firstName} onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))} />
                {createErrors.firstName && <p className="text-xs text-red-600 mt-1">{createErrors.firstName}</p>}
              </div>
              <div>
                <Label htmlFor="lastName">{t('createDialog.lastName')}</Label>
                <Input id="lastName" value={createForm.lastName} onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))} />
                {createErrors.lastName && <p className="text-xs text-red-600 mt-1">{createErrors.lastName}</p>}
              </div>
            </div>
            <div>
              <Label htmlFor="email">{t('createDialog.email')}</Label>
              <Input id="email" type="email" value={createForm.email} onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))} />
              {createErrors.email && <p className="text-xs text-red-600 mt-1">{createErrors.email}</p>}
            </div>
            <div>
              <Label htmlFor="company">{t('createDialog.company')}</Label>
              <Input id="company" value={createForm.company} onChange={(e) => setCreateForm(prev => ({ ...prev, company: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">{t('createDialog.phone')}</Label>
              <Input id="phone" value={createForm.phone} onChange={(e) => setCreateForm(prev => ({ ...prev, phone: e.target.value }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)} disabled={createLoading}>
              {t('createDialog.cancel')}
            </Button>
            <Button
              onClick={async () => {
                const errs: Record<string, string> = {};
                if (!createForm.firstName.trim()) errs.firstName = t('createDialog.required');
                if (!createForm.lastName.trim()) errs.lastName = t('createDialog.required');
                if (!createForm.email.trim()) errs.email = t('createDialog.required');
                setCreateErrors(errs);
                if (Object.keys(errs).length) return;
                setCreateLoading(true);
                try {
                  await customersApi.create({
                    firstName: createForm.firstName,
                    lastName: createForm.lastName,
                    email: createForm.email,
                    company: createForm.company || undefined,
                    phone: createForm.phone || undefined,
                    tenantId: (user as { tenantId?: string } | null | undefined)?.tenantId,
                  });
                  setShowCreate(false);
                  setCreateForm({ firstName: '', lastName: '', email: '', company: '', phone: '' });
                  await refetchCustomers();
                } finally {
                  setCreateLoading(false);
                }
              }}
              disabled={createLoading}
            >
              {createLoading ? t('createDialog.creating') : t('createDialog.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}