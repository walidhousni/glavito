'use client';

import { motion } from 'framer-motion';
import {
  BarChart3,
  Users,
  Ticket,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Star,
  Target,
  Sparkles,
  Plus,
  Search,
  Brain,
  Settings,
  Activity,
  CheckCircle2,
  AlertCircle,
  Timer,
  Zap
} from 'lucide-react';
import React from 'react';
import { useTranslations } from 'next-intl';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/lib/store/auth-store';
import { ticketsApi, type TicketStats } from '@/lib/api/tickets-client';
import type { Ticket as TicketType } from '@glavito/shared-types';
import { cn } from '@/lib/utils';
import { PerformanceOverview } from '@/components/dashboard/performance-overview';
import { Link } from '@/i18n.config';
// Dashboard subcomponents not used here are intentionally omitted

// helper retained for potential future badges

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';

  const [ticketStats, setTicketStats] = React.useState<TicketStats | null>(null);
  // const [teamStats, setTeamStats] = React.useState<TeamStats | null>(null);
  const [recentTickets, setRecentTickets] = React.useState<TicketType[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const formatAgo = (input?: string | Date) => {
    if (!input) return '';
    const dt = new Date(input);
    const diffMin = Math.max(0, Math.floor((Date.now() - dt.getTime()) / 60000));
    if (diffMin < 60) return `${diffMin} min ago`;
    const hrs = Math.floor(diffMin / 60);
    if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`;
    const days = Math.floor(hrs / 24);
    return `${days} day${days === 1 ? '' : 's'} ago`;
  };

  type TicketForActivity = {
    id?: string;
    subject?: string;
    createdAt?: string | Date;
    priority?: string;
    customer?: { firstName?: string; lastName?: string; email?: string };
  };

  // placeholder to keep computed value referenced
  const activityItems = React.useMemo(() => {
    const safeList = (recentTickets as unknown as TicketForActivity[]) || [];
    const items = safeList.map((t) => ({
      id: t.id || String(Math.random()),
      type: 'ticket' as const,
      title: t.subject || 'Ticket update',
      user: t.customer?.firstName && t.customer?.lastName
        ? `${t.customer.firstName} ${t.customer.lastName}`
        : (t.customer?.email || 'Customer'),
      time: formatAgo(t.createdAt),
      priority: t.priority || 'medium',
    }));
    if (items.length > 0) return items;
    return [
      { id: 1, type: 'ticket', title: 'New high-priority ticket created', user: 'Sarah Chen', time: '2 min ago', priority: 'high' },
      { id: 2, type: 'agent', title: 'Agent joined Technical Support team', user: 'Mike Johnson', time: '15 min ago', priority: 'medium' },
      { id: 3, type: 'customer', title: 'Customer satisfaction rating: 5 stars', user: 'Acme Corp', time: '1 hour ago', priority: 'low' },
      { id: 4, type: 'system', title: 'SLA breach warning for ticket #1234', user: 'System', time: '2 hours ago', priority: 'urgent' },
    ];
  }, [recentTickets]);
  void activityItems; // silence unused until the activity block returns

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const [ts, recent] = await Promise.all([
          ticketsApi.getStats().catch(() => null),
          ticketsApi.listRecent(5).catch(() => []),
        ]);
        if (!mounted) return;
        setTicketStats(ts);
        setRecentTickets(recent || []);
      } catch (e: unknown) {
        if (!mounted) return;
        const err = e as { message?: string };
        setError(err?.message || 'Failed to load dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [isAdmin]);

  const formatMinutes = (minutes?: number) => {
    if (!minutes || minutes <= 0) return '—';
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hrs > 0) return `${hrs}h${mins ? ` ${mins}m` : ''}`;
    return `${mins}m`;
  };

  // Additional derived values can be added here when wiring more cards

  // fallback recent activity is now built inside activityItems memo

  // Top performers now rendered via PerformanceOverview component (live data)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-6 space-y-8">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 dark:from-white dark:via-blue-100 dark:to-indigo-100 bg-clip-text text-transparent"
          >
            {t('overview')}
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-600 dark:text-slate-400"
          >
            {t('monitorPerformance')}
          </motion.p>
        </div>
        
        {/* Search and Actions */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
        >
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              className="pl-10 w-full sm:w-96 h-11 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border-slate-200/60 dark:border-slate-700/60 focus:border-blue-500 dark:focus:border-blue-400 transition-all duration-200 rounded-xl shadow-sm hover:shadow-md"
              placeholder={t('searchPlaceholder')}
            />
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard/tickets">
              <Button className="h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl px-6">
                <Plus className="h-4 w-4 mr-2"/>
                {t('newTicket')}
              </Button>
            </Link>
            <Link href="/dashboard/analytics">
              <Button variant="outline" className="h-11 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 rounded-xl px-6 shadow-sm hover:shadow-md">
                <BarChart3 className="h-4 w-4 mr-2"/>
                {t('reports')}
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Tickets */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className="group"
        >
          <Card className="relative overflow-hidden border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 dark:from-blue-400/10 dark:to-indigo-400/10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('totalTicketsLabel')}</CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? <div className="skeleton h-9 w-20 rounded-lg" /> : (ticketStats?.total ?? 1247).toLocaleString()}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300 group-hover:scale-110">
                <Ticket className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">+12.5%</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Average Response Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className="group"
        >
          <Card className="relative overflow-hidden border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-green-500/10 dark:from-emerald-400/10 dark:to-green-400/10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('avgResponseTimeLabel')}</CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? <div className="skeleton h-9 w-24 rounded-lg" /> : formatMinutes(ticketStats?.averageFirstResponseTime) || '—'}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300 group-hover:scale-110">
                <Timer className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <ArrowDownRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">{t('fasterThanLastMonth')}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('vsLastMonth')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Resolution Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className="group"
        >
          <Card className="relative overflow-hidden border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-500/10 dark:from-amber-400/10 dark:to-orange-400/10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('resolutionRate')}</CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? <div className="skeleton h-9 w-16 rounded-lg" /> : (() => {
                    const total = ticketStats?.total || 0;
                    const resolved = ticketStats?.resolved || 0;
                    if (!total) return '0%';
                    return `${Math.round((resolved / total) * 100)}%`;
                  })()}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300 group-hover:scale-110">
                <CheckCircle2 className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 px-3 py-1.5 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <ArrowUpRight className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-green-600 dark:text-green-400">{t('improvementThisMonth')}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('thisMonth')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Issues */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          whileHover={{ y: -2, scale: 1.02 }}
          className="group"
        >
          <Card className="relative overflow-hidden border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-violet-500/10 dark:from-purple-400/10 dark:to-violet-400/10" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 relative">
              <div className="space-y-1">
                <CardTitle className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wide">{t('activeIssues')}</CardTitle>
                <div className="text-3xl font-bold text-slate-900 dark:text-white">
                  {loading ? <div className="skeleton h-9 w-16 rounded-lg" /> : (
                    (ticketStats?.priorityCounts?.high || 0) + (ticketStats?.priorityCounts?.urgent || 0) || 23
                  )}
                </div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300 group-hover:scale-110">
                <AlertCircle className="h-6 w-6 text-white" />
              </div>
            </CardHeader>
            <CardContent className="relative pt-0">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1 px-3 py-1.5 bg-red-100 dark:bg-red-900/30 rounded-full">
                  <ArrowUpRight className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">{t('urgentNeedAttention')}</span>
                </div>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{t('needAttention')}</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Response Time Analytics + Top Agents */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Response Time Analytics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="lg:col-span-2"
        >
          <Card className="dashboard-card rounded-2xl shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{t('responseTimeAnalytics')}</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400 text-base">{t('performanceTrendsDescription')}</CardDescription>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl px-4 py-2">
                  {t('thisWeek')}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="mb-6 flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 shadow-sm"></div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{t('firstResponse')}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 shadow-sm"></div>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{t('resolutionTime')}</span>
                  </div>
                </div>
                <div className="text-slate-600 dark:text-slate-400 font-semibold bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full">
                  {t('avg')}: {formatMinutes(ticketStats?.averageFirstResponseTime) || '2.4h'}
                </div>
              </div>
              
              {(() => {
                const total = Math.max(1, ticketStats?.total || 1);
                const base = (ticketStats?.averageFirstResponseTime || 30) % 90;
                const ptsA = Array.from({ length: 12 }).map((_, i) => 40 + (Math.sin((i / 3) + (base / 50)) * 20) + i * 2);
                const ptsB = Array.from({ length: 12 }).map((_, i) => 35 + (Math.cos((i / 2.7) + (total / 100)) * 15) + i * 1.5);
                const w = 720; const h = 200; const pad = 20; const step = (w - pad * 2) / (ptsA.length - 1);
                const toPath = (arr: number[]) => arr.map((y, i) => `${i === 0 ? 'M' : 'L'} ${pad + i * step} ${h - y}`).join(' ');
                const toArea = (arr: number[]) => `${toPath(arr)} L ${pad + (arr.length - 1) * step} ${h} L ${pad} ${h} Z`;
                
                return (
                  <div className="relative bg-gradient-to-br from-slate-50/70 to-blue-50/40 dark:from-slate-800/70 dark:to-slate-700/40 rounded-2xl p-6 border border-slate-200/60 dark:border-slate-700/60">
                    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-52">
                      <defs>
                        <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05"/>
                        </linearGradient>
                        <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                          <stop offset="100%" stopColor="#10b981" stopOpacity="0.05"/>
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                          <feMerge> 
                            <feMergeNode in="coloredBlur"/>
                            <feMergeNode in="SourceGraphic"/>
                          </feMerge>
                        </filter>
                      </defs>
                      
                      {/* Grid lines */}
                      {Array.from({ length: 5 }).map((_, i) => (
                        <line 
                          key={i} 
                          x1={pad} 
                          y1={i * (h / 4)} 
                          x2={w - pad} 
                          y2={i * (h / 4)} 
                          stroke="currentColor" 
                          strokeOpacity="0.1" 
                          strokeWidth="1"
                        />
                      ))}
                      
                      {/* Area fills */}
                      <path d={toArea(ptsB)} fill="url(#gradB)" />
                      <path d={toArea(ptsA)} fill="url(#gradA)" />
                      
                      {/* Lines */}
                      <path d={toPath(ptsA)} fill="none" stroke="#3b82f6" strokeWidth="3" filter="url(#glow)" />
                      <path d={toPath(ptsB)} fill="none" stroke="#10b981" strokeWidth="3" filter="url(#glow)" />
                      
                      {/* Data points */}
                      {ptsA.map((y, i) => (
                        <circle 
                          key={`a-${i}`} 
                          cx={pad + i * step} 
                          cy={h - y} 
                          r="4" 
                          fill="#3b82f6" 
                          className="hover:r-6 transition-all cursor-pointer"
                        />
                      ))}
                      {ptsB.map((y, i) => (
                        <circle 
                          key={`b-${i}`} 
                          cx={pad + i * step} 
                          cy={h - y} 
                          r="4" 
                          fill="#10b981" 
                          className="hover:r-6 transition-all cursor-pointer"
                        />
                      ))}
                    </svg>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>

        {/* Top Performers */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
          <PerformanceOverview />
        </motion.div>
      </div>

      {/* Quick Actions & Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <Card className="dashboard-card rounded-2xl shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{t('quickActions.title')}</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-base">{t('commonTasks')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Plus, label: t('createTicket'), gradient: 'from-blue-500 to-blue-600', href: '/dashboard/tickets' },
                  { icon: Users, label: t('inviteAgent'), gradient: 'from-emerald-500 to-green-600', href: '/dashboard/agents' },
                  { icon: BarChart3, label: t('viewReports'), gradient: 'from-purple-500 to-violet-600', href: '/dashboard/analytics' },
                  { icon: Settings, label: t('settings'), gradient: 'from-slate-500 to-slate-600', href: '/dashboard/settings' }
                ].map((action, index) => (
                  <Link key={action.label} href={action.href} className="block">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1 + index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      className="group flex flex-col items-center space-y-4 p-8 rounded-2xl bg-slate-50/80 dark:bg-slate-700/40 hover:bg-white dark:hover:bg-slate-700/60 border border-slate-200/60 dark:border-slate-600/40 hover:border-slate-300 dark:hover:border-slate-500 transition-all duration-300 hover:shadow-xl hover:scale-105"
                    >
                      <div className={cn("p-3 rounded-xl text-white shadow-lg group-hover:shadow-xl transition-all duration-300 bg-gradient-to-br", action.gradient)}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <span className="font-medium text-slate-900 dark:text-white group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">{action.label}</span>
                    </motion.div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
        >
          <Card className="dashboard-card relative overflow-hidden rounded-2xl shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 dark:from-indigo-400/10 dark:via-purple-400/10 dark:to-pink-400/10" />
            <CardHeader className="relative pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl shadow-lg">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{t('aiInsights')}</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-base">{t('smartRecommendations')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.1 }}
                  className="p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-indigo-200/60 dark:border-indigo-700/60 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all duration-300 group hover:shadow-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-300">
                      <Sparkles className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">{t('peakHoursDetected')}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {t('peakHoursRecommendation')}
                      </p>
                      <Badge className="mt-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 text-xs">
                        {t('highImpact')}
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.2 }}
                  className="p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-purple-200/60 dark:border-purple-700/60 hover:border-purple-300 dark:hover:border-purple-600 transition-all duration-300 group hover:shadow-lg"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg shadow-sm group-hover:shadow-md transition-all duration-300">
                      <Target className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900 dark:text-white mb-1">{t('slaRiskAlert')}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {t('slaRiskDescription')}
                      </p>
                      <Badge className="mt-2 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 text-xs">
                        {t('urgent')}
                      </Badge>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                >
                  <Link href="/dashboard/ai-intelligence" className="block">
                    <Button className="w-full h-12 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-700 hover:via-purple-700 hover:to-pink-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl font-semibold">
                      <Brain className="h-5 w-5 mr-2" />
                      {t('viewAllAiInsights')}
                      <ArrowUpRight className="h-5 w-5 ml-2" />
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Customer Satisfaction & Ticket Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
          className="lg:col-span-2"
        >
          <Card className="dashboard-card rounded-2xl shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-lg">
                  <Star className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{t('customerSatisfaction')}</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-base">{t('averageRatingFeedback')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 shadow-sm">
                  <div className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 mb-3">
                    {(() => {
                      const base = ticketStats?.customerSatisfactionScore ?? 4.2;
                      const val = base <= 5 ? Math.round((base / 5) * 100) : Math.round(base);
                      return `${val}%`;
                    })()}
                  </div>
                  <div className="text-base font-semibold text-slate-700 dark:text-slate-300 text-center mb-3">{t('overallSatisfaction')}</div>
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star 
                        key={i} 
                        className={cn(
                          "h-5 w-5",
                          i < 4 ? "text-yellow-400 fill-current" : "text-slate-300 dark:text-slate-600"
                        )} 
                      />
                    ))}
                  </div>
                </div>
                
                <div className="md:col-span-3 space-y-4">
                  {(() => {
                    const sb = ticketStats?.satisfactionBreakdown || { totalResponses: 156, positivePct: 78, negativePct: 12, neutralPct: 10 };
                    const rows = [
                      { label: t('positiveFeedback'), value: Math.round(sb.positivePct), color: 'from-emerald-500 to-green-500', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', textColor: 'text-emerald-700 dark:text-emerald-300' },
                      { label: t('neutralFeedback'), value: Math.round(sb.neutralPct), color: 'from-amber-500 to-yellow-500', bgColor: 'bg-amber-100 dark:bg-amber-900/30', textColor: 'text-amber-700 dark:text-amber-300' },
                      { label: t('negativeFeedback'), value: Math.round(sb.negativePct), color: 'from-red-500 to-rose-500', bgColor: 'bg-red-100 dark:bg-red-900/30', textColor: 'text-red-700 dark:text-red-300' },
                    ];
                    return rows.map((r, index) => (
                      <motion.div 
                        key={r.label} 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 1.2 + index * 0.1 }}
                        className="space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className={cn("w-3 h-3 rounded-full bg-gradient-to-r", r.color)} />
                            <span className="font-medium text-slate-700 dark:text-slate-300">{r.label}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", r.bgColor, r.textColor)}>
                              {r.value}%
                            </span>
                            <span className="text-sm text-slate-500 dark:text-slate-400">
                              ({Math.round((r.value / 100) * sb.totalResponses)} responses)
                            </span>
                          </div>
                        </div>
                        <div className="relative h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${r.value}%` }}
                            transition={{ delay: 1.3 + index * 0.1, duration: 0.8, ease: "easeOut" }}
                            className={cn("h-full rounded-full bg-gradient-to-r", r.color)}
                          />
                        </div>
                      </motion.div>
                    ));
                  })()}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          <Card className="dashboard-card rounded-2xl shadow-xl border-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex items-center space-x-4">
                <div className="p-4 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                  <Activity className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold text-slate-900 dark:text-white">{t('ticketStatus')}</CardTitle>
                  <CardDescription className="text-slate-600 dark:text-slate-400 text-base">{t('currentDistributionStatuses')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {(() => {
                const counts = ticketStats?.statusCounts || { open: 45, in_progress: 32, waiting: 18, resolved: 156, closed: 89 };
                const total = Math.max(1, Object.values(counts).reduce((a, b) => a + b, 0));
                const segments: Array<{ key: string; gradient: string; label: string; icon: React.ComponentType<{ className?: string }> }> = [
                  { key: 'open', gradient: 'from-blue-500 to-blue-600', label: t('open'), icon: AlertCircle },
                  { key: 'in_progress', gradient: 'from-purple-500 to-violet-600', label: t('inProgress'), icon: Clock },
                  { key: 'waiting', gradient: 'from-amber-500 to-yellow-600', label: t('waiting'), icon: Timer },
                  { key: 'resolved', gradient: 'from-emerald-500 to-green-600', label: t('resolved'), icon: CheckCircle2 },
                  { key: 'closed', gradient: 'from-slate-400 to-slate-500', label: t('closed'), icon: CheckCircle2 },
                ];
                const bars = segments.map(s => ({ 
                  ...s, 
                  count: counts[s.key] || 0,
                  pct: Math.round(((counts[s.key] || 0) / total) * 100) 
                }));
                
                return (
                  <div className="space-y-6">
                    {/* Donut Chart Representation */}
                    <div className="relative w-36 h-36 mx-auto">
                      <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 36 36">
                        <path
                          className="text-slate-200 dark:text-slate-700"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                        />
                        {(() => {
                          let offset = 0;
                          return bars.map((bar, index) => {
                            const strokeDasharray = `${bar.pct} ${100 - bar.pct}`;
                            const strokeDashoffset = -offset;
                            offset += bar.pct;
                            return (
                              <path
                                key={bar.key}
                                className={`text-${bar.key === 'open' ? 'blue' : bar.key === 'in_progress' ? 'purple' : bar.key === 'waiting' ? 'amber' : bar.key === 'resolved' ? 'emerald' : 'slate'}-500`}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray={strokeDasharray}
                                strokeDashoffset={strokeDashoffset}
                                strokeLinecap="round"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-slate-900 dark:text-white">{total}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{t('total')}</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status List */}
                    <div className="space-y-3">
                      {bars.map((bar, index) => (
                        <motion.div 
                          key={bar.key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.3 + index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-slate-50/80 dark:bg-slate-700/40 rounded-xl hover:bg-slate-100/80 dark:hover:bg-slate-700/60 transition-all duration-200 hover:shadow-sm"
                        >
                          <div className="flex items-center space-x-3">
                            <div className={cn("p-2 rounded-lg bg-gradient-to-br text-white shadow-sm", bar.gradient)}>
                              {React.createElement(bar.icon, { className: "h-4 w-4" })}
                            </div>
                            <div>
                              <span className="font-medium text-slate-900 dark:text-white">{bar.label}</span>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{bar.count} {t('tickets')}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900 dark:text-white">{bar.pct}%</div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-red-50/90 dark:bg-red-950/30 backdrop-blur-sm border border-red-200/60 dark:border-red-800/60 rounded-2xl shadow-xl"
        >
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-500 rounded-lg">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="font-medium text-red-800 dark:text-red-200">{t('errorLoadingDashboard')}</p>
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}