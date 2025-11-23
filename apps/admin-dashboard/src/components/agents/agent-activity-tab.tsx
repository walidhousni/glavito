'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Calendar,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { AgentProfile } from '@/lib/api/team';

interface AgentActivityTabProps {
  agent: AgentProfile;
}

export function AgentActivityTab({ agent }: AgentActivityTabProps) {
  const t = useTranslations('agents');

  // Mock activity data - in production, this would come from an API
  const activities = [
    {
      id: '1',
      type: 'ticket_resolved',
      title: t('resolvedTicket', { fallback: 'Resolved ticket' }),
      description: '#1234 - Customer billing inquiry',
      time: '2 hours ago',
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/30',
    },
    {
      id: '2',
      type: 'message_sent',
      title: t('sentMessage', { fallback: 'Sent message' }),
      description: 'Response to customer inquiry',
      time: '3 hours ago',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    },
    {
      id: '3',
      type: 'ticket_assigned',
      title: t('ticketAssigned', { fallback: 'Ticket assigned' }),
      description: '#1235 - Technical support needed',
      time: '4 hours ago',
      icon: User,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950/30',
    },
    {
      id: '4',
      type: 'status_changed',
      title: t('statusChanged', { fallback: 'Status changed' }),
      description: 'Changed status to Available',
      time: '5 hours ago',
      icon: AlertCircle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50 dark:bg-orange-950/30',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Activity Timeline */}
      <Card className="agent-detail-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('recentActivity', { fallback: 'Recent Activity' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={activity.id} className="relative">
                  {index !== activities.length - 1 && (
                    <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border" />
                  )}
                  <div className="flex gap-4">
                    <div className={`flex-shrink-0 p-3 rounded-xl ${activity.bgColor}`}>
                      <Icon className={`h-5 w-5 ${activity.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-medium">{activity.title}</div>
                          <div className="text-sm text-muted-foreground mt-1">{activity.description}</div>
                        </div>
                        <div className="text-xs text-muted-foreground whitespace-nowrap">{activity.time}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Activity Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="agent-metric-card">
          <CardHeader>
            <CardTitle className="text-base">{t('todayActivity', { fallback: "Today's Activity" })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('ticketsHandled', { fallback: 'Tickets handled' })}</span>
              <Badge variant="secondary">8</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('messagesSet', { fallback: 'Messages sent' })}</span>
              <Badge variant="secondary">24</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('avgResponseTime', { fallback: 'Avg response time' })}</span>
              <Badge variant="secondary">{agent.performanceMetrics?.responseTime ?? 0}m</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="agent-metric-card">
          <CardHeader>
            <CardTitle className="text-base">{t('thisWeek', { fallback: 'This Week' })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('ticketsResolved', { fallback: 'Tickets resolved' })}</span>
              <Badge variant="secondary">{agent.performanceMetrics?.ticketsCompleted ?? 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('hoursWorked', { fallback: 'Hours worked' })}</span>
              <Badge variant="secondary">38h</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{t('satisfaction', { fallback: 'Satisfaction' })}</span>
              <Badge variant="secondary">{(agent.performanceMetrics?.customerSatisfaction ?? 0).toFixed(1)}/5.0</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for detailed history */}
      <Card className="agent-detail-card">
        <CardContent className="p-12 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">{t('detailedHistory', { fallback: 'Detailed History' })}</h3>
          <p className="text-muted-foreground">
            {t('detailedHistoryDesc', {
              fallback: 'Full activity history with filters and search capabilities coming soon.',
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

