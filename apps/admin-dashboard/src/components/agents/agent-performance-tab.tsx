'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Star,
  CheckCircle,
  Activity,
  Target,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentProfile } from '@/lib/api/team';

interface AgentPerformanceTabProps {
  agent: AgentProfile;
}

export function AgentPerformanceTab({ agent }: AgentPerformanceTabProps) {
  const t = useTranslations('agents');
  const metrics = agent.performanceMetrics;

  const performanceData = [
    {
      label: t('ticketsAssigned', { fallback: 'Tickets Assigned' }),
      value: metrics?.ticketsAssigned ?? 0,
      icon: Target,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      label: t('ticketsCompleted', { fallback: 'Tickets Completed' }),
      value: metrics?.ticketsCompleted ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      label: t('avgResolutionTime', { fallback: 'Avg Resolution Time' }),
      value: `${metrics?.averageResolutionTime ?? 0}h`,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    },
    {
      label: t('customerSatisfaction', { fallback: 'Customer Satisfaction' }),
      value: (metrics?.customerSatisfaction ?? 0).toFixed(1),
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/30',
    },
    {
      label: t('responseTime', { fallback: 'Response Time' }),
      value: `${metrics?.responseTime ?? 0}m`,
      icon: Activity,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      label: t('activeTickets', { fallback: 'Active Tickets' }),
      value: metrics?.activeTickets ?? 0,
      icon: Activity,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50 dark:bg-pink-950/30',
    },
  ];

  const resolutionRate =
    metrics?.ticketsAssigned && metrics.ticketsAssigned > 0
      ? Math.round((metrics.ticketsCompleted / metrics.ticketsAssigned) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {performanceData.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <Card key={index} className="agent-metric-card">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-muted-foreground mb-2">{metric.label}</div>
                    <div className="text-3xl font-bold animate-count-up">{metric.value}</div>
                  </div>
                  <div className={`p-3 rounded-xl ${metric.bgColor}`}>
                    <Icon className={`h-6 w-6 ${metric.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Resolution Rate */}
      <Card className="agent-detail-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('resolutionRate', { fallback: 'Resolution Rate' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-lg font-medium">
                {metrics?.ticketsCompleted ?? 0} / {metrics?.ticketsAssigned ?? 0} {t('tickets', { fallback: 'tickets' })}
              </span>
              <Badge variant={resolutionRate >= 80 ? 'default' : 'secondary'} className="text-lg px-4 py-1">
                {resolutionRate}%
              </Badge>
            </div>
            <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
              <div
                className="h-4 bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 rounded-full transition-all duration-1000 animate-progress-fill"
                style={{ width: `${Math.min(resolutionRate, 100)}%` }}
              />
            </div>
            {resolutionRate >= 80 ? (
              <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                <TrendingUp className="h-4 w-4" />
                <span>{t('excellentPerformance', { fallback: 'Excellent performance!' })}</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-orange-600 dark:text-orange-400">
                <TrendingDown className="h-4 w-4" />
                <span>{t('roomForImprovement', { fallback: 'Room for improvement' })}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      <Card className="agent-detail-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            {t('performanceInsights', { fallback: 'Performance Insights' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <div className="font-medium text-blue-900 dark:text-blue-100">
                    {t('responseTimeGood', { fallback: 'Response time is within target' })}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    {t('responseTimeDesc', {
                      fallback: 'Average response time of {time}m is below the 30m target.',
                      time: metrics?.responseTime ?? 0,
                    })}
                  </div>
                </div>
              </div>
            </div>

            {resolutionRate >= 80 && (
              <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-green-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-green-900 dark:text-green-100">
                      {t('highResolutionRate', { fallback: 'High resolution rate' })}
                    </div>
                    <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                      {t('highResolutionDesc', { fallback: 'Resolving {rate}% of assigned tickets.', rate: resolutionRate })}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(metrics?.customerSatisfaction ?? 0) >= 4.0 && (
              <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-3">
                  <Star className="h-5 w-5 text-yellow-600 fill-yellow-600 mt-0.5" />
                  <div>
                    <div className="font-medium text-yellow-900 dark:text-yellow-100">
                      {t('excellentSatisfaction', { fallback: 'Excellent customer satisfaction' })}
                    </div>
                    <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      {t('excellentSatisfactionDesc', {
                        fallback: 'Maintaining a {rating}/5.0 satisfaction rating.',
                        rating: (metrics?.customerSatisfaction ?? 0).toFixed(1),
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

