'use client'

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuthStore } from '@/lib/store/auth-store';
import { StatsCards } from '@/components/dashboard/stats-cards';
import { PerformanceOverview } from '@/components/dashboard/performance-overview';
import { SLAMonitoringWidget } from '@/components/dashboard/sla-monitoring-widget';
import { SatisfactionOverviewWidget } from '@/components/dashboard/satisfaction-overview-widget';
import { QuickActions } from '@/components/dashboard/quick-actions';
import { GlavaiInsightsWidget } from '@/components/dashboard/glavai-insights-widget';
import { useTickets } from '@/lib/hooks/use-tickets';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useNotificationStore } from '@/lib/store/notification-store';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { Bell, CheckCircle2, AlertCircle, MessageSquare, User } from 'lucide-react';
import { customersApi } from '@/lib/api/customers-client';
import { useAnalytics } from '@/lib/hooks/use-analytics';

export default function DashboardPage() {
  const t = useTranslations('dashboard');
  const { user } = useAuthStore();
  const { stats, refetch: refetchTickets } = useTickets({ 
    autoRefresh: true, 
    refreshInterval: 30000
  });
  
  const { notifications, fetchNotifications } = useNotificationStore();
  const { kpiMetrics } = useAnalytics(user?.tenantId || '', '30d');
  const [customersCount, setCustomersCount] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchNotifications();
    
    customersApi.list().then(list => {
      setCustomersCount(list.length);
    }).catch(() => setCustomersCount(0));
  }, [fetchNotifications]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'ticket': return <MessageSquare className="h-4 w-4 text-blue-500" />;
      case 'sla': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'customer': return <User className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const revenueMetric = kpiMetrics?.find(m => m.name === 'revenue' || m.id === 'revenue');
  const revenue = revenueMetric ? `$${revenueMetric.value.toLocaleString()}` : undefined;
  const growth = revenueMetric?.changePercentage ? `${revenueMetric.trend === 'up' ? '+' : ''}${revenueMetric.changePercentage}%` : undefined;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 p-6 md:p-8">
      <div className="max-w-[1800px] mx-auto space-y-8">
        {/* Welcome Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col gap-2"
        >
          <h1 className="text-5xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
            {t('welcomeBack', { name: user?.firstName || 'Admin' })}
          </h1>
          <p className="text-muted-foreground text-lg">
            {t('overviewDescription', { fallback: "Here's what's happening with your support operations today." })}
          </p>
        </motion.div>

        {/* Stats Cards */}
        <StatsCards 
          ticketsTotal={stats?.total}
          customersTotal={customersCount}
          revenue={revenue}
          growth={growth}
        />

        {/* Main Grid - Better 3:2 Ratio */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          
          {/* Left Column (Performance & Activity) - 3 cols */}
          <div className="lg:col-span-3 space-y-6">
            {/* Performance Overview */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="h-[500px]"
            >
              <PerformanceOverview />
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <Card className="border-0 shadow-xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
                <CardHeader className="border-b border-slate-100 dark:border-slate-800">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                      <Bell className="h-4 w-4 text-white" />
                    </div>
                    {t('recentActivity', { fallback: 'Recent Activity' })}
                  </CardTitle>
                  <CardDescription className="text-sm">
                    {t('latestNotifications', { fallback: 'Latest updates from your team' })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    {notifications.slice(0, 5).map((notification, index) => (
                      <motion.div 
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + index * 0.1, duration: 0.3 }}
                        className="flex items-start space-x-4 p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-200 border border-transparent hover:border-slate-200 dark:hover:border-slate-700 cursor-pointer group"
                      >
                        <div className="mt-1 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 p-2.5 rounded-xl shadow-sm">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 space-y-1 min-w-0">
                          <p className="text-sm font-semibold leading-none truncate">{notification.title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {!notification.isRead && (
                          <Badge className="bg-blue-500 text-white hover:bg-blue-600 shadow-lg shadow-blue-500/30 flex-shrink-0">New</Badge>
                        )}
                      </motion.div>
                    ))}
                    {notifications.length === 0 && (
                      <div className="text-center py-16">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 mb-4">
                          <CheckCircle2 className="h-8 w-8 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium text-foreground">All caught up!</p>
                        <p className="text-xs text-muted-foreground mt-1">No recent activity</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Right Column (Widgets & Actions) - 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <SLAMonitoringWidget />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <SatisfactionOverviewWidget />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              <GlavaiInsightsWidget />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <QuickActions />
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
