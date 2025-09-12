'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Clock,
  AlertTriangle,
  MessageSquare,
  User,
  Calendar,
  Tag as TagIcon,
  TrendingUp,
  Zap,
  Building,
  Mail,
  Phone,
  Eye,
  MoreHorizontal
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTicketsWebSocket } from '@/lib/hooks/use-tickets-websocket';

interface TicketCardProps {
  ticket: unknown;
  selected?: boolean;
  onSelect?: (selected: boolean) => void;
  onClick?: () => void;
  compact?: boolean;
}

export function TicketCard({
  ticket,
  selected = false,
  onSelect,
  onClick,
  compact = false
}: TicketCardProps) {
  const t = useTranslations('tickets');

  useTicketsWebSocket({
    onEvent: ({ type, payload }) => {
      if (payload.ticketId !== ticket.id) return;
      if (type === 'ticket.resolved') {
        ticket.status = 'resolved';
      }
      if (type === 'ticket.reopened') {
        ticket.status = 'open';
      }
      if (type === 'ticket.assigned' || type === 'ticket.auto_assigned') {
        ticket.assignedAgentId = payload.assignedAgentId || null;
      }
    }
  });

  const getPriorityColor = (
    priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical' | string
  ) => {
    const colors: Record<'low' | 'medium' | 'high' | 'urgent' | 'critical', string> = {
      low: 'text-green-600 bg-green-50 border-green-200',
      medium: 'text-blue-600 bg-blue-50 border-blue-200',
      high: 'text-orange-600 bg-orange-50 border-orange-200',
      urgent: 'text-red-600 bg-red-50 border-red-200',
      critical: 'text-red-700 bg-red-100 border-red-300',
    };
    return (colors as Record<string, string>)[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent':
      case 'critical':
        return <AlertTriangle className="h-3 w-3" />;
      case 'high':
        return <TrendingUp className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const created = new Date(date);
    const diffInHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) return t('justNow');
    if (diffInHours < 24) return t('hoursAgo', { hours: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t('daysAgo', { days: diffInDays });

    return created.toLocaleDateString();
  };

  const isOverdue = ticket.dueDate && new Date(ticket.dueDate) < new Date() &&
    !['resolved', 'closed'].includes(ticket.status);

  const isSLAAtRisk = ticket.slaInstance?.status === 'active' && (
    (ticket.slaInstance.firstResponseDue &&
      new Date(ticket.slaInstance.firstResponseDue) < new Date(Date.now() + 2 * 60 * 60 * 1000) &&
      !ticket.slaInstance.firstResponseAt) ||
    (ticket.slaInstance.resolutionDue &&
      new Date(ticket.slaInstance.resolutionDue) < new Date(Date.now() + 4 * 60 * 60 * 1000) &&
      !ticket.slaInstance.resolutionAt)
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        className={cn(
          "group cursor-pointer transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/10 border-0 bg-white dark:bg-gray-900/50 backdrop-blur-sm",
          selected && "ring-2 ring-blue-500 ring-offset-2 bg-blue-50/50 dark:bg-blue-950/20",
          isOverdue && "border-l-4 border-l-red-500 bg-red-50/30 dark:bg-red-950/20",
          isSLAAtRisk && "border-l-4 border-l-orange-500 bg-orange-50/30 dark:bg-orange-950/20"
        )}
        onClick={onClick}
      >
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              {onSelect && (
                <Checkbox
                  checked={selected}
                  onCheckedChange={onSelect}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1"
                />
              )}

              <div className="flex-1 min-w-0 space-y-2">
                {/* Ticket ID and Priority */}
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="font-mono text-xs">
                    {ticket.id}
                  </Badge>
                  <div className="flex items-center space-x-2">
                    {getPriorityIcon(ticket.priority)}
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs font-medium",
                        getPriorityColor(ticket.priority)
                      )}
                    >
                      {t(`priority.${ticket.priority}`)}
                    </Badge>
                  </div>
                </div>

                {/* Subject */}
                <h4 className="font-semibold text-gray-900 dark:text-white leading-tight line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {ticket.subject}
                </h4>

                {/* Description */}
                {!compact && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                    {ticket.description}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Eye className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Customer Info */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <Avatar className="h-8 w-8">
              <AvatarImage src={ticket.customer?.avatar} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                {ticket.customer?.firstName?.[0]}{ticket.customer?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="font-medium text-sm text-gray-900 dark:text-white truncate">
                  {ticket.customer?.firstName} {ticket.customer?.lastName}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                {ticket.customer?.company && (
                  <div className="flex items-center space-x-1">
                    <Building className="h-3 w-3" />
                    <span className="truncate">{ticket.customer.company}</span>
                  </div>
                )}
                {ticket.customer?.email && (
                  <div className="flex items-center space-x-1">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{ticket.customer.email}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status and Assignment */}
          <div className="flex items-center justify-between">
            <Badge
              className={cn(
                "px-3 py-1 text-xs font-medium",
                ticket.status === 'open' && "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300",
                ticket.status === 'in_progress' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300",
                ticket.status === 'pending' && "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300",
                ticket.status === 'resolved' && "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300",
                ticket.status === 'closed' && "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"
              )}
            >
              {t(`status.${ticket.status}`)}
            </Badge>

            {ticket.assignedAgent ? (
              <div className="flex items-center space-x-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={ticket.assignedAgent.avatar} />
                  <AvatarFallback className="text-xs">
                    {ticket.assignedAgent.firstName?.[0]}{ticket.assignedAgent.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-gray-600 dark:text-gray-400 truncate">
                  {ticket.assignedAgent.firstName}
                </span>
              </div>
            ) : (
              <Badge variant="outline" className="text-xs">
                {t('unassigned')}
              </Badge>
            )}
          </div>

          {/* Tags */}
          {ticket.tags && ticket.tags.length > 0 && (
            <div className="flex items-center space-x-1 flex-wrap">
              <TagIcon className="h-3 w-3 text-gray-400" />
              {ticket.tags.slice(0, compact ? 2 : 4).map((tag: string) => (
                <Badge key={tag} variant="secondary" className="text-xs px-2 py-0.5">
                  {tag}
                </Badge>
              ))}
              {ticket.tags.length > (compact ? 2 : 4) && (
                <Badge variant="outline" className="text-xs">
                  +{ticket.tags.length - (compact ? 2 : 4)}
                </Badge>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>{getTimeAgo(ticket.createdAt)}</span>
              </div>

              {ticket._count?.conversations > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{ticket._count.conversations}</span>
                </div>
              )}
            </div>

            {/* Warning Indicators */}
            <div className="flex items-center space-x-2">
              {isOverdue && (
                <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                  <Clock className="h-3 w-3" />
                  <span>{t('overdue')}</span>
                </div>
              )}

              {isSLAAtRisk && (
                <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
                  <Zap className="h-3 w-3" />
                  <span>{t('slaRisk')}</span>
                </div>
              )}

              {ticket.slaInstance?.breachCount > 0 && (
                <div className="flex items-center space-x-1 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-3 w-3" />
                  <span>{ticket.slaInstance.breachCount}</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Insights */}
          {ticket.aiAnalysis && (
            <div className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <Zap className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="font-medium text-blue-900 dark:text-blue-100">{t('aiInsights')}</span>
                  {ticket.aiAnalysis.sentiment && (
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs border-0",
                        ticket.aiAnalysis.sentiment === 'positive' && "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300",
                        ticket.aiAnalysis.sentiment === 'negative' && "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300",
                        ticket.aiAnalysis.sentiment === 'neutral' && "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300"
                      )}
                    >
                      {t(`sentiment.${ticket.aiAnalysis.sentiment}`)}
                    </Badge>
                  )}
                </div>
                {ticket.aiAnalysis.urgencyScore && (
                  <div className="flex items-center space-x-1">
                    <span className="text-blue-700 dark:text-blue-300">{t('urgency')}:</span>
                    <span className={cn(
                      "font-medium",
                      ticket.aiAnalysis.urgencyScore > 0.7 && "text-red-600 dark:text-red-400",
                      ticket.aiAnalysis.urgencyScore > 0.4 && ticket.aiAnalysis.urgencyScore <= 0.7 && "text-orange-600 dark:text-orange-400",
                      ticket.aiAnalysis.urgencyScore <= 0.4 && "text-green-600 dark:text-green-400"
                    )}>
                      {Math.round(ticket.aiAnalysis.urgencyScore * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}