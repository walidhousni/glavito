'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { customersApi } from '@/lib/api/customers-client';
import { analyticsApi } from '@/lib/api/analytics-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Star,
  Shield,
  Award,
  CheckCircle,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Clock,
  Sparkles,
  MessageSquare,
  UserPlus,
} from 'lucide-react';
import { 
  FaBullseye, 
  FaUsers, 
  FaChartLine, 
  FaBolt,
  FaArrowUp,
  FaArrowDown,
  FaDownload,
  FaExclamationTriangle,
  FaDollarSign,
  FaRunning
} from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { CustomerSegmentCard } from '@/components/customers/customer-segment-card';
import { CustomerHealthScore } from '@/components/customers/customer-health-score';
import { CustomerAnalyticsDashboard } from '@/components/customers/customer-analytics-dashboard';
import { Customer360Profile } from '@/components/customers/customer-360-profile';
import { CreateCustomerDialog } from '@/components/customers/create-customer-dialog';
import { useCustomerHealth, useCustomerInsights } from '@/lib/hooks/use-customer-analytics';
import type { CustomerListItem } from '@/lib/api/customers-client';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/lib/store/auth-store';

// Modern Metric Card Component
function MetricCard({
  title,
  value,
  change,
  trend,
  icon: Icon,
  loading = false,
  subtitle
}: {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  subtitle?: string;
}) {
  if (loading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-6 w-6 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-24 mb-2" />
          <Skeleton className="h-3 w-16" />
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
        <span className="text-xs font-medium text-muted-foreground">{change}</span>
      </div>
    );
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <CardDescription className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0">
            {title}
          </CardDescription>
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
            <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
        <div className="mb-2">
          <CardTitle className="text-2xl font-semibold text-foreground mb-0">
          {value}
        </CardTitle>
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

// Modern Customer Card Component
function CustomerCard({
  customer,
  onClick,
  onAction,
  variant = 'default',
  t
}: {
  customer: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    lifetimeValue: number;
    healthScore: number;
    riskLevel: string;
    lastInteraction: string;
    segments: string[];
  };
  onClick: () => void;
  onAction: (action: string) => void;
  variant?: 'default' | 'compact';
  t: (key: string, params?: any) => string;
}) {
  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600 dark:text-emerald-400';
    if (score >= 60) return 'text-blue-600 dark:text-blue-400';
    if (score >= 40) return 'text-amber-600 dark:text-amber-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case 'low':
        return (
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400">
            <img src="https://img.icons8.com/?id=61020&format=png&size=16" alt="shield" className="h-3.5 w-3.5 mr-1" />
            {t('lowRisk')}
          </Badge>
        );
      case 'medium':
        return (
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-400">
            <img src="https://img.icons8.com/?id=64383&format=png&size=16" alt="warning" className="h-3.5 w-3.5 mr-1" />
            {t('mediumRisk')}
          </Badge>
        );
      case 'high':
        return (
          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/20 dark:text-orange-400">
            <img src="https://img.icons8.com/?id=64383&format=png&size=16" alt="warning" className="h-3.5 w-3.5 mr-1" />
            {t('highRisk')}
          </Badge>
        );
      case 'critical':
        return (
          <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/20 dark:text-red-400">
            <img src="https://img.icons8.com/?id=64383&format=png&size=16" alt="warning" className="h-3.5 w-3.5 mr-1" />
            {t('criticalRisk')}
          </Badge>
        );
      default:
        return <Badge variant="secondary">{level}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const isCompact = variant === 'compact';

  return (
    <Card
      className={`group cursor-pointer transition-all duration-200 bg-card/50 backdrop-blur-sm border-border/50 hover:border-border ${
        isCompact
          ? 'hover:shadow-md hover:-translate-y-[1px]'
          : 'hover:shadow-lg hover:scale-[1.02]'
      }`}
      onClick={onClick}
    >
      <CardContent className={isCompact ? 'p-4' : 'p-6'}>
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Avatar className={`${isCompact ? 'h-10 w-10' : 'h-12 w-12'} ring-2 ring-primary/10`}>
              <AvatarImage src={customer.avatar ?? undefined} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                {customer.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-1 flex-1 min-w-0">
              <h4 className={`${isCompact ? 'text-sm' : ''} font-semibold leading-none truncate`}>{customer.name}</h4>
              <p className={`${isCompact ? 'text-xs' : 'text-sm'} text-muted-foreground truncate`}>{customer.email}</p>
              {customer.segments.length > 0 && (
                <div className={`flex gap-1 flex-wrap ${isCompact ? 'mt-1' : ''}`}>
                  {customer.segments.slice(0, 2).map((segmentId) => (
                    <Badge key={segmentId} variant="secondary" className={`${isCompact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}>
                      {segmentId}
                    </Badge>
                  ))}
                  {customer.segments.length > 2 && (
                    <Badge variant="secondary" className={`${isCompact ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5'}`}>
                      +{customer.segments.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity shrink-0`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>{t('actions')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAction('view'); }}>
                <Eye className="mr-2 h-4 w-4" />
                {t('viewDetailsAction')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onAction('edit'); }}>
                <Edit className="mr-2 h-4 w-4" />
                {t('editCustomerAction')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onAction('delete'); }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {t('deleteAction')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!isCompact && (
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FaDollarSign className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">{t('lifetimeValueLabel')}</p>
            </div>
            <p className="text-lg font-semibold">{formatCurrency(customer.lifetimeValue)}</p>
          </div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <FaRunning className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-medium">{t('healthScoreLabel')}</p>
            </div>
            <div className="flex items-center gap-2">
              <Progress value={customer.healthScore} className="flex-1 h-2" />
              <span className={`text-sm font-semibold ${getHealthScoreColor(customer.healthScore)}`}>
                {customer.healthScore}
              </span>
            </div>
          </div>
        </div>
        )}

        <div className={`flex items-center justify-between ${isCompact ? '' : ''}`}>
          {getRiskBadge(customer.riskLevel)}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(customer.lastInteraction).toLocaleDateString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CustomersPage() {
  const t = useTranslations('customers');
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(9);
  const { data: healthData, loading: healthLoading, refetch: refetchHealth } = useCustomerHealth(selectedCustomer || undefined);
  const { data: insightsData, loading: insightsLoading, refetch: refetchInsights } = useCustomerInsights(selectedCustomer || undefined);
  const params = useSearchParams();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [waOptOut, setWaOptOut] = useState<boolean | null>(null);
  const [waToggleLoading, setWaToggleLoading] = useState(false);
  const [prefs, setPrefs] = useState<import('@/lib/api/customers-client').CustomerPreferences | null>(null);

  const analyticsData = useMemo(() => {
    const total = customers.length;
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newCustomersThisMonth = customers.filter(c => new Date(c.createdAt) >= startOfMonth).length;

    const segments = [
      {
        id: 'new-customer',
        name: t('segments.newCustomers'),
        description: t('segments.newCustomersDesc'),
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

  const filteredCustomers = useMemo(() => {
    const q = (searchQuery || '').trim().toLowerCase();
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return customers.filter((c) => {
      if (selectedSegment === 'new-customer') {
        if (new Date(c.createdAt) < startOfMonth) return false;
      }
      if (!q) return true;
      const name = `${c.firstName ?? ''} ${c.lastName ?? ''}`.toLowerCase();
      const company = (c.company ?? '').toLowerCase();
      const email = (c.email ?? '').toLowerCase();
      return name.includes(q) || company.includes(q) || email.includes(q) || c.id.toLowerCase().includes(q);
    });
  }, [customers, searchQuery, selectedSegment]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const paginatedCustomers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  useEffect(() => { setPage(1); }, [searchQuery, selectedSegment, pageSize]);

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

  useEffect(() => {
    (async () => {
      try {
        if (!selectedCustomer) { setWaOptOut(null); return; }
        const p = await customersApi.getPreferences(selectedCustomer);
        setPrefs(p);
        setWaOptOut(Boolean(p?.marketingPreferences?.whatsappOptOut === true));
      } catch {
        setWaOptOut(null);
      } finally { /* noop */ }
    })();
  }, [selectedCustomer]);


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
      <div className="container mx-auto p-6 space-y-8">
        {/* Header Skeleton */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <div className="flex gap-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-36" />
          </div>
        </div>

        {/* Metrics Grid Skeleton */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <MetricCard
              key={i}
              title=""
              value=""
              change=""
              trend="neutral"
              icon={FaUsers}
              loading={true}
            />
          ))}
        </div>

        {/* Main Content Skeleton */}
        <Card>
          <CardContent className="p-6">
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-40 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaUsers className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
            <h1 className="text-2xl font-semibold text-foreground">
                  {t('title')}
                </h1>
              </div>
          <p className="text-sm text-muted-foreground ml-[42px]">
            {t('subtitle')}
          </p>
            </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs border-0 shadow-sm">
            <FaDownload className="h-3 w-3 mr-1.5" />
              {t('exportReport')}
            </Button>
            <Button
              onClick={() => setShowCreateDialog(true)}
            size="sm"
            className="h-8 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
            >
            <UserPlus className="h-3 w-3 mr-1.5" />
              {t('addCustomer')}
            </Button>
            {selectedCustomer && (
              <Button
              variant="ghost"
                size="sm"
              className="h-8 text-xs"
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
              <MdRefresh className="h-3 w-3 mr-1.5" />
                {t('rescoreHealth')}
              </Button>
            )}
            {selectedCustomer && (
              <Button
                variant={waOptOut ? "destructive" : "outline"}
                size="sm"
                disabled={waToggleLoading}
              className={`h-8 text-xs ${waOptOut ? '' : 'border-0 shadow-sm'}`}
                onClick={async () => {
                  if (!selectedCustomer) return;
                  setWaToggleLoading(true);
                  try {
                    if (waOptOut) {
                      await customersApi.whatsappOptIn(selectedCustomer);
                      setWaOptOut(false);
                    } else {
                      await customersApi.whatsappOptOut(selectedCustomer);
                      setWaOptOut(true);
                    }
                  } catch {
                    /* noop */
                  } finally {
                    setWaToggleLoading(false);
                  }
                }}
              >
              <MessageSquare className="h-3 w-3 mr-1.5" />
                {waOptOut ? 'WA Opt‑Out' : 'WA Opt‑In'}
              </Button>
            )}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title={t('stats.totalCustomers')}
          value={analyticsData.overview.totalCustomers.toLocaleString()}
          change={`+${analyticsData.overview.newCustomersThisMonth}`}
          trend="up"
          icon={FaUsers}
          subtitle={t('stats.thisMonth')}
        />

        <MetricCard
          title={t('stats.activeCustomers')}
          value={analyticsData.overview.activeCustomers.toLocaleString()}
          change={analyticsData.overview.totalCustomers > 0 ?
            `${Math.round((analyticsData.overview.activeCustomers / analyticsData.overview.totalCustomers) * 100)}%` :
            '0%'
          }
          trend="neutral"
          icon={FaRunning}
          subtitle={t('stats.ofTotal')}
        />

        <MetricCard
          title={t('stats.avgLifetimeValue')}
          value={formatCurrency(analyticsData.overview.averageLifetimeValue)}
          change="+12.5%"
          trend="up"
          icon={FaDollarSign}
          subtitle={t('stats.fromLastMonth')}
        />

        <MetricCard
          title={t('stats.churnRate')}
          value={`${analyticsData.overview.churnRate}%`}
          change="-0.8%"
          trend="down"
          icon={FaExclamationTriangle}
          subtitle={t('stats.fromLastMonth')}
        />
      </div>

      {/* Main Content Tabs */}
      <Card className="border-0 shadow-sm">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b border-border/50 px-6 py-3">
            <TabsList className="grid w-full grid-cols-5 bg-transparent h-auto p-0 gap-1">
              <TabsTrigger 
                value="overview" 
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-muted-foreground hover:text-foreground transition-colors border-0"
              >
                <FaBullseye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium">{t('tabs.overview')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="segments" 
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-950/30 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 text-muted-foreground hover:text-foreground transition-colors border-0"
              >
                <FaUsers className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-xs font-medium">{t('tabs.segments')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-green-50 dark:data-[state=active]:bg-green-950/30 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 text-muted-foreground hover:text-foreground transition-colors border-0"
              >
                <FaChartLine className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium">{t('tabs.analytics')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="customers" 
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground transition-colors border-0"
              >
                <FaUsers className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-medium">{t('tabs.customers')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="insights" 
                className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-yellow-50 dark:data-[state=active]:bg-yellow-950/30 data-[state=active]:text-yellow-600 dark:data-[state=active]:text-yellow-400 text-muted-foreground hover:text-foreground transition-colors border-0"
              >
                <FaBolt className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs font-medium">{t('tabs.insights')}</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="p-6 space-y-8">
            {/* Customer Segments Overview */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl shadow-sm">
                  <FaBullseye className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{t('segments.title')}</h3>
                  <p className="text-muted-foreground">{t('segments.description')}</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analyticsData.segments.map((segment) => (
                  <div key={segment.id} className="animate-fade-in">
                    <CustomerSegmentCard
                      segment={segment}
                      onClick={() => setSelectedSegment(segment.id)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-amber-500/20 to-amber-500/10 rounded-2xl shadow-sm">
                  <Award className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">{t('topCustomers.title')}</h3>
                  <p className="text-muted-foreground">{t('topCustomersDesc')}</p>
                </div>
              </div>
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {analyticsData.topCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CustomerCard
                      customer={customer}
                      onClick={() => setSelectedCustomer(customer.id)}
                      onAction={(action) => {
                        if (action === 'view') {
                          setSelectedCustomer(customer.id);
                        }
                        // Handle other actions
                      }}
                      t={t}
                    />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="segments" className="p-6 space-y-6">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-500/10 rounded-2xl shadow-sm">
                <FaUsers className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{t('customerSegments')}</h3>
                <p className="text-muted-foreground">{t('organizeCustomers')}</p>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {analyticsData.segments.map((segment, index) => (
                <div
                  key={segment.id}
                  className="animate-slide-up"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <CustomerSegmentCard
                    segment={segment}
                    onClick={() => setSelectedSegment(segment.id)}
                    onExport={async (format) => {
                      try {
                        await analyticsApi.requestExport({ type: 'metric', format: format === 'json' ? 'json' : 'csv', sourceId: `segment:${segment.id}`, parameters: { segmentId: segment.id } });
                      } catch { /* noop */ }
                    }}
                    onTriggerWorkflow={async () => {
                      try {
                        // Placeholder: reuse analytics schedule as a stand-in trigger or call a workflow endpoint if exists
                        await analyticsApi.createSchedule({ type: 'custom', source: `segment:${segment.id}`, schedule: { frequency: 'weekly', time: '09:00', timezone: 'UTC', dayOfWeek: 1 }, recipients: [], format: 'json', filters: { segmentId: segment.id } });
                      } catch { /* noop */ }
                    }}
                    onSendCampaign={async () => {
                      try {
                        await analyticsApi.createSchedule({ type: 'survey', source: `segment:${segment.id}`, schedule: { frequency: 'weekly', time: '10:00', timezone: 'UTC', dayOfWeek: 2 }, recipients: [], format: 'json', filters: { segmentId: segment.id, kind: 'campaign' } });
                      } catch { /* noop */ }
                    }}
                  />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <CustomerAnalyticsDashboard />
          </TabsContent>

          <TabsContent value="customers" className="space-y-6">
            {/* Customer Health Score */}
            {selectedCustomer && healthData && (
              <CustomerHealthScore
                customerId={selectedCustomer}
                healthScore={healthData}
                onRefresh={refetchHealth}
                loading={healthLoading}
              />
            )}

            {/* Key Insights */}
            {selectedCustomer && insightsData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FaBolt className="h-5 w-5 text-primary" />
                    {t('keyInsights')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {insightsData.sentimentAnalysis && (
                    <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                      <div className="text-sm">
                        <span className="text-muted-foreground">{t('sentiment')}:</span>{' '}
                        <span className="font-semibold text-primary">{insightsData.sentimentAnalysis.overall}</span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="text-muted-foreground">{t('score')}:</span>{' '}
                        <span className="font-semibold">{(insightsData.sentimentAnalysis.score * 100).toFixed(0)}%</span>
                        <span className="text-muted-foreground mx-2">•</span>
                        <span className="text-muted-foreground">{t('trend')}:</span>{' '}
                        <span className="font-semibold">{insightsData.sentimentAnalysis.trend}</span>
                      </div>
                      {typeof insightsData.confidence === 'number' && (
                        <Badge variant="secondary">
                          {t('confidence')}: {Math.round((insightsData.confidence || 0) * 100)}%
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-600" />
                        {t('opportunities')}
                      </h4>
                      <div className="space-y-3">
                        {(insightsData.opportunities || []).map((item, i) => (
                          <div key={`opp-${i}`} className="flex items-start gap-3 p-3 border border-emerald-200 dark:border-emerald-800 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20">
                            <FaArrowUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                            <p className="text-sm">{item}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="font-semibold flex items-center gap-2">
                        <FaBullseye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        {t('nextBestActions')}
                      </h4>
                      <div className="space-y-3">
                        {(insightsData.nextBestActions || []).map((item, i) => (
                          <div key={`nba-${i}`} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-start gap-3">
                              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                              <p className="text-sm">{item}</p>
                            </div>
                            <Button size="sm" variant="outline">
                              {t('execute')}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={refetchInsights} disabled={insightsLoading}>
                      <MdRefresh className={`h-4 w-4 mr-2 ${insightsLoading ? 'animate-spin' : ''}`} />
                      {insightsLoading ? t('loading') : t('refresh')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preferences & Quiet Hours */}
            {selectedCustomer && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-primary" />
                    {t('preferences.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Channel Preferences */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">{t('preferences.channels')}</h4>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <Label htmlFor="pref-wa">{t('preferences.whatsapp')}</Label>
                          <p className="text-xs text-muted-foreground">{t('preferences.whatsappDesc')}</p>
                        </div>
                        <Switch
                          id="pref-wa"
                          checked={!waOptOut}
                          onCheckedChange={async (checked) => {
                            if (!selectedCustomer) return;
                            try {
                              const mp = { whatsappOptOut: !checked };
                              const updated = await customersApi.updatePreferences(selectedCustomer, { marketingPreferences: mp });
                              setPrefs(updated);
                              setWaOptOut(!checked);
                            } catch {
                              /* noop */
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <Label htmlFor="pref-email">{t('preferences.email')}</Label>
                          <p className="text-xs text-muted-foreground">{t('preferences.emailDesc')}</p>
                        </div>
                        <Switch
                          id="pref-email"
                          checked={!(prefs?.marketingPreferences?.emailOptOut ?? false)}
                          onCheckedChange={async (checked) => {
                            if (!selectedCustomer) return;
                            try {
                              const mp = { ...(prefs?.marketingPreferences || {}), emailOptOut: !checked };
                              const updated = await customersApi.updatePreferences(selectedCustomer, { marketingPreferences: mp });
                              setPrefs(updated);
                            } catch { /* noop */ }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div className="space-y-0.5">
                          <Label htmlFor="pref-sms">{t('preferences.sms')}</Label>
                          <p className="text-xs text-muted-foreground">{t('preferences.smsDesc')}</p>
                        </div>
                        <Switch
                          id="pref-sms"
                          checked={!(prefs?.marketingPreferences?.smsOptOut ?? false)}
                          onCheckedChange={async (checked) => {
                            if (!selectedCustomer) return;
                            try {
                              const mp = { ...(prefs?.marketingPreferences || {}), smsOptOut: !checked };
                              const updated = await customersApi.updatePreferences(selectedCustomer, { marketingPreferences: mp });
                              setPrefs(updated);
                            } catch { /* noop */ }
                          }}
                        />
                      </div>
                    </div>

                    {/* Quiet Hours */}
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold">{t('preferences.quietHours')}</h4>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <Label htmlFor="qh-start">{t('preferences.start')}</Label>
                          <Input
                            id="qh-start"
                            type="time"
                            value={(prefs?.quietHours?.start || '') as string}
                            onChange={async (e) => {
                              if (!selectedCustomer) return;
                              const updated = await customersApi.updatePreferences(selectedCustomer, { quietHours: { ...(prefs?.quietHours || {}), start: e.target.value } });
                              setPrefs(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="qh-end">{t('preferences.end')}</Label>
                          <Input
                            id="qh-end"
                            type="time"
                            value={(prefs?.quietHours?.end || '') as string}
                            onChange={async (e) => {
                              if (!selectedCustomer) return;
                              const updated = await customersApi.updatePreferences(selectedCustomer, { quietHours: { ...(prefs?.quietHours || {}), end: e.target.value } });
                              setPrefs(updated);
                            }}
                          />
                        </div>
                        <div>
                          <Label htmlFor="qh-tz">{t('preferences.timezone')}</Label>
                          <Input
                            id="qh-tz"
                            placeholder="UTC"
                            value={(prefs?.quietHours?.timezone || '') as string}
                            onChange={async (e) => {
                              if (!selectedCustomer) return;
                              const updated = await customersApi.updatePreferences(selectedCustomer, { quietHours: { ...(prefs?.quietHours || {}), timezone: e.target.value } });
                              setPrefs(updated);
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Modern Search, Filters & View Toggle */}
            <div className="flex flex-col sm:flex-row gap-4 mb-4 p-4 bg-muted/30 rounded-xl border border-border/50">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder={t('searchCustomers')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-background/50 backdrop-blur-sm border-border/50 focus:border-primary/50 transition-colors"
                  />
                </div>
              </div>
              <Select value={selectedSegment} onValueChange={setSelectedSegment}>
                <SelectTrigger className="w-48 bg-background/50 backdrop-blur-sm border-border/50">
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
              <Button variant="outline" className="bg-background/50 backdrop-blur-sm border-border/50 hover:bg-background">
                <Filter className="h-4 w-4 mr-2" />
                {t('filters')}
              </Button>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  {t('gridView')}
                </Button>
                <Button
                  variant={viewMode === 'table' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                >
                  {t('tableView')}
              </Button>
              </div>
            </div>

            {/* Results summary & pagination */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredCustomers.length} {t('resultsCount', { count: filteredCustomers.length }).split(' ')[1]} • {t('pageInfo', { current: page, total: totalPages })}
              </p>
              <div className="flex items-center gap-2">
                <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                  <SelectTrigger className="w-28 h-9">
                    <SelectValue placeholder={t('pageSizePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {[6,9,12,18].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n} {t('perPage')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>{t('prevPage')}</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>{t('nextPage')}</Button>
              </div>
            </div>

            {/* Customer List */}
            {viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {paginatedCustomers.map((c) => (
                <CustomerCard
                    key={c.id}
                    variant="compact"
                    customer={{
                      id: c.id,
                      name: `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || (c.company ?? c.email ?? c.id),
                      email: c.email ?? '',
                      avatar: null as unknown as string | null,
                      lifetimeValue: 0,
                      healthScore: 0,
                      riskLevel: 'low',
                      lastInteraction: c.updatedAt,
                      segments: (c.tags as unknown as string[]) || [],
                    }}
                    onClick={() => setSelectedCustomer(c.id)}
                  onAction={(action) => {
                      if (action === 'view') setSelectedCustomer(c.id);
                  }}
                    t={t}
                />
              ))}
            </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-border/50">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left px-4 py-3">{t('nameColumn')}</th>
                      <th className="text-left px-4 py-3">{t('emailColumn')}</th>
                      <th className="text-left px-4 py-3">{t('companyColumn')}</th>
                      <th className="text-left px-4 py-3">{t('tagsColumn')}</th>
                      <th className="text-left px-4 py-3">{t('updatedColumn')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map((c) => (
                      <tr key={c.id} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => setSelectedCustomer(c.id)}>
                        <td className="px-4 py-3 font-medium">{`${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || (c.company ?? c.email ?? c.id)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{c.email ?? '-'}</td>
                        <td className="px-4 py-3">{c.company ?? '-'}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {(c.tags as unknown as string[] | undefined)?.slice(0, 3).map((t) => (
                              <Badge key={`${c.id}-${t}`} variant="secondary" className="text-[10px]">{t}</Badge>
                            )) || null}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(c.updatedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredCustomers.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-muted/20">
                <img src="https://img.icons8.com/?id=e4NkZ7kWAD7f&format=png&size=48" alt="search" className="mb-4 opacity-80" />
                <h4 className="text-lg font-semibold mb-1">{t('noCustomersFound')}</h4>
                <p className="text-sm text-muted-foreground">{t('noCustomersDesc')}</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="insights" className="p-6 space-y-8">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-3 bg-gradient-to-br from-purple-500/20 to-purple-500/10 rounded-2xl shadow-sm">
                <FaBolt className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-2xl font-bold">{t('customerInsights')}</h3>
                <p className="text-muted-foreground">{t('aiInsightsDesc')}</p>
              </div>
            </div>

            <div className="grid gap-8 md:grid-cols-2">
              {/* Opportunities */}
              <Card className="bg-gradient-to-br from-emerald-50/50 to-emerald-100/30 dark:from-emerald-950/20 dark:to-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-emerald-700 dark:text-emerald-400">
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                      <FaArrowUp className="h-5 w-5" />
                    </div>
                    {t('insights.opportunities')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-5 border border-emerald-200 dark:border-emerald-800 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <img src="https://img.icons8.com/?id=12608&format=png&size=14" alt="vip" className="h-4 w-4" />
                      <h4 className="font-semibold text-emerald-900 dark:text-emerald-100">{t('insights.vipGrowth')}</h4>
                    </div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 mb-4">{t('insights.vipGrowthDesc')}</p>
                    <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                      <FaArrowUp className="h-4 w-4 mr-2" />
                      {t('insights.expandProgram')}
                    </Button>
                  </div>

                  <div className="p-5 border border-blue-200 dark:border-blue-800 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <Star className="h-5 w-5 text-blue-600" />
                      <h4 className="font-semibold text-blue-900 dark:text-blue-100">{t('insights.newCustomerSuccess')}</h4>
                    </div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-4">{t('insights.newCustomerSuccessDesc')}</p>
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-900/20">
                      <FaBullseye className="h-4 w-4 mr-2" />
                      {t('insights.optimizeOnboarding')}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Risks */}
              <Card className="bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10 border-red-200/50 dark:border-red-800/50 shadow-lg">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-red-700 dark:text-red-400">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <FaExclamationTriangle className="h-5 w-5" />
                    </div>
                    {t('insights.risks')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-5 border border-red-200 dark:border-red-800 rounded-xl bg-red-50/80 dark:bg-red-950/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <FaArrowDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <h4 className="font-semibold text-red-900 dark:text-red-100">{t('insights.atRiskIncrease')}</h4>
                    </div>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">{t('insights.atRiskIncreaseDesc')}</p>
                    <Button size="sm" variant="destructive" className="shadow-md">
                      <Shield className="h-4 w-4 mr-2" />
                      {t('insights.implementRetention')}
                    </Button>
                  </div>

                  <div className="p-5 border border-amber-200 dark:border-amber-800 rounded-xl bg-amber-50/80 dark:bg-amber-950/30 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100">{t('insights.supportVolumeRising')}</h4>
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">{t('insights.supportVolumeRisingDesc')}</p>
                    <Button size="sm" variant="outline" className="border-amber-300 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/20">
                      <FaRunning className="h-4 w-4 mr-2" />
                      {t('insights.reviewProcesses')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
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
      <CreateCustomerDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={refetchCustomers}
      />
    </div>
  );
}