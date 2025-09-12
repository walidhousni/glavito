'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Ticket, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  User, 
  TrendingUp, 
  TrendingDown,
  Minus,
  Star,
  Timer,
  Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TicketStatsProps {
  stats: any;
  loading?: boolean;
}

export function TicketStats({ stats, loading = false }: TicketStatsProps) {
  const t = useTranslations('tickets');

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted animate-pulse rounded" />
              </CardTitle>
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const statCards = [
    {
      title: t('stats.totalTickets'),
      value: stats.total || 0,
      icon: Ticket,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      description: t('stats.allTickets')
    },
    {
      title: t('stats.openTickets'),
      value: stats.open || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: t('stats.needsAttention'),
      percentage: stats.total > 0 ? Math.round((stats.open / stats.total) * 100) : 0
    },
    {
      title: t('stats.inProgress'),
      value: stats.inProgress || 0,
      icon: Users,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
      description: t('stats.beingWorked'),
      percentage: stats.total > 0 ? Math.round((stats.inProgress / stats.total) * 100) : 0
    },
    {
      title: t('stats.resolved'),
      value: stats.resolved || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      description: t('stats.completedToday'),
      percentage: stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0
    },
    {
      title: t('stats.overdue'),
      value: stats.overdue || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
      description: t('stats.pastDueDate'),
      urgent: stats.overdue > 0
    },
    {
      title: t('stats.unassigned'),
      value: stats.unassigned || 0,
      icon: User,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      description: t('stats.needsAssignment'),
      urgent: stats.unassigned > 5
    },
    {
      title: t('stats.slaAtRisk'),
      value: stats.slaAtRisk || 0,
      icon: Timer,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      description: t('stats.approachingDeadline'),
      urgent: stats.slaAtRisk > 0
    },
    {
      title: t('stats.avgResolutionTime'),
      value: stats.averageResolutionTime ? `${Math.round(stats.averageResolutionTime / 60)}h` : '0h',
      icon: TrendingUp,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      description: t('stats.timeToResolve')
    }
  ];

  const getTrendIcon = (value: number, threshold: number) => {
    if (value > threshold) return <TrendingUp className="h-3 w-3 text-red-500" />;
    if (value < threshold * 0.8) return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-gray-500" />;
  };

  return (
    <div className="space-y-6">
      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className={cn(stat.urgent && "border-red-200 bg-red-50/50")}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={cn("p-2 rounded-full", stat.bgColor)}>
                  <Icon className={cn("h-4 w-4", stat.color)} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.urgent && (
                    <Badge variant="destructive" className="text-xs">
                      {t('urgent')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
                {stat.percentage !== undefined && (
                  <div className="mt-2">
                    <Progress 
                      value={stat.percentage} 
                      className="h-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.percentage}% {t('stats.ofTotal')}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Detailed Analytics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('stats.statusDistribution')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { status: 'open', value: stats.open, color: 'bg-blue-500' },
              { status: 'in_progress', value: stats.inProgress, color: 'bg-yellow-500' },
              { status: 'waiting', value: stats.waiting, color: 'bg-orange-500' },
              { status: 'resolved', value: stats.resolved, color: 'bg-green-500' },
              { status: 'closed', value: stats.closed, color: 'bg-gray-500' }
            ].map((item) => (
              <div key={item.status} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className={cn("w-3 h-3 rounded-full", item.color)} />
                  <span className="text-sm capitalize">
                    {t(`status.${item.status}`)}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{item.value || 0}</span>
                  <span className="text-xs text-muted-foreground">
                    ({stats.total > 0 ? Math.round((item.value / stats.total) * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('stats.performance')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('stats.avgFirstResponse')}
                </span>
                <span className="text-sm font-medium">
                  {stats.averageFirstResponseTime ? 
                    `${Math.round(stats.averageFirstResponseTime / 60)}h` : 
                    '0h'
                  }
                </span>
              </div>
              <Progress 
                value={stats.averageFirstResponseTime ? 
                  Math.min((stats.averageFirstResponseTime / (4 * 60)) * 100, 100) : 0
                } 
                className="h-2"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {t('stats.customerSatisfaction')}
                </span>
                <div className="flex items-center space-x-1">
                  <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  <span className="text-sm font-medium">
                    {stats.customerSatisfactionScore ? 
                      stats.customerSatisfactionScore.toFixed(1) : 
                      '0.0'
                    }
                  </span>
                </div>
              </div>
              <Progress 
                value={stats.customerSatisfactionScore ? 
                  (stats.customerSatisfactionScore / 5) * 100 : 0
                } 
                className="h-2"
              />
            </div>

            <div className="pt-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t('stats.thisWeek')}</span>
                <div className="flex items-center space-x-1">
                  {getTrendIcon(stats.resolved || 0, 10)}
                  <span>
                    {stats.resolved > 10 ? t('stats.improving') : 
                     stats.resolved < 8 ? t('stats.declining') : 
                     t('stats.stable')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Priority Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('stats.priorityBreakdown')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { priority: 'critical', color: 'bg-red-600', textColor: 'text-red-600' },
              { priority: 'urgent', color: 'bg-red-500', textColor: 'text-red-500' },
              { priority: 'high', color: 'bg-orange-500', textColor: 'text-orange-500' },
              { priority: 'medium', color: 'bg-blue-500', textColor: 'text-blue-500' },
              { priority: 'low', color: 'bg-green-500', textColor: 'text-green-500' }
            ].map((item) => {
              // Prefer backend priorityCounts; fallback to 0 if missing
              const count = (stats.priorityCounts?.[item.priority] as number) || 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={item.priority} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={cn("w-3 h-3 rounded-full", item.color)} />
                    <span className="text-sm capitalize">
                      {t(`priority.${item.priority}`)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">{count}</span>
                    <span className="text-xs text-muted-foreground">({pct}%)</span>
                    {item.priority === 'critical' && count > 0 && (
                      <AlertTriangle className="h-3 w-3 text-red-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}