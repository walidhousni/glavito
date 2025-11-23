'use client';

import React, { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Clock, ChevronRight, AlertCircle, CheckCircle2, Timer } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ticketsApi } from '@/lib/api/tickets-client';
import { cn } from '@/lib/utils';

interface SLATicket {
  id: string;
  subject: string;
  priority: string;
  assignedAgent?: {
    firstName: string;
    lastName: string;
  };
  slaInstance?: {
    status: string;
    firstResponseDue?: string;
    resolutionDue?: string;
  };
}

export function SLAMonitoringWidget() {
  const t = useTranslations('sla');
  const router = useRouter();
  
  const [atRiskTickets, setAtRiskTickets] = useState<SLATicket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAtRiskTickets = async () => {
      try {
        setLoading(true);
        const list = await ticketsApi.list({
          status: ['open', 'in_progress'],
          slaAtRisk: true,
          limit: 10,
        }).catch(() => [] as SLATicket[]);

        const tickets = Array.isArray(list) ? list : [];
        setAtRiskTickets(tickets);
      } catch (error) {
        console.error('Failed to load SLA tickets:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAtRiskTickets();
    const interval = setInterval(loadAtRiskTickets, 60000);

    return () => clearInterval(interval);
  }, []);

  const getTimeRemaining = (dueDate: string) => {
    const now = Date.now();
    const due = new Date(dueDate).getTime();
    const diff = due - now;

    if (diff <= 0) return { text: 'Breached', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200', progress: 100 };

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    let text = '';
    let color = '';
    let bgColor = '';
    let borderColor = '';
    let progress = 0;

    if (hours < 1) {
      text = `${minutes}m`;
      color = 'text-red-600';
      bgColor = 'bg-red-50 dark:bg-red-950/20';
      borderColor = 'border-red-200 dark:border-red-800';
      progress = 90;
    } else if (hours < 2) {
      text = `${hours}h ${minutes}m`;
      color = 'text-orange-600';
      bgColor = 'bg-orange-50 dark:bg-orange-950/20';
      borderColor = 'border-orange-200 dark:border-orange-800';
      progress = 75;
    } else {
      text = `${hours}h ${minutes}m`;
      color = 'text-yellow-600';
      bgColor = 'bg-yellow-50 dark:bg-yellow-950/20';
      borderColor = 'border-yellow-200 dark:border-yellow-800';
      progress = 50;
    }

    return { text, color, bgColor, borderColor, progress };
  };

  const handleTicketClick = (ticketId: string) => {
    router.push(`/dashboard/tickets?ticket=${ticketId}`);
  };

  if (loading) {
    return (
      <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30">
              <Timer className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">{t('slaMonitoring', { fallback: 'SLA Monitoring' })}</CardTitle>
              <CardDescription className="text-xs">Loading...</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl hover:shadow-xl transition-all duration-300">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-10 w-10 rounded-xl bg-gradient-to-br flex items-center justify-center shadow-lg transition-all duration-300",
              atRiskTickets.length > 0 
                ? "from-red-500 to-orange-600 shadow-red-500/30 animate-pulse" 
                : "from-green-500 to-emerald-600 shadow-green-500/30"
            )}>
              {atRiskTickets.length > 0 ? (
                <AlertCircle className="h-5 w-5 text-white" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-white" />
              )}
            </div>
            <div>
              <CardTitle className="text-lg">{t('slaMonitoring', { fallback: 'SLA Monitoring' })}</CardTitle>
              <CardDescription className="text-xs">
                {atRiskTickets.length > 0 
                  ? t('atRiskTickets', { count: atRiskTickets.length, fallback: `${atRiskTickets.length} tickets at risk` })
                  : t('allGood', { fallback: 'All tickets on track' })
                }
              </CardDescription>
            </div>
          </div>
          
          {atRiskTickets.length > 0 && (
            <Badge variant="destructive" className="bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse">
              {atRiskTickets.length}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {atRiskTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30 mb-4">
              <CheckCircle2 className="h-8 w-8 text-white" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">
              {t('allGood', { fallback: 'All Good!' })}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('allTicketsOnTrack', { fallback: 'All tickets are meeting SLA targets' })}
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[280px] pr-2">
            <div className="space-y-3">
              {atRiskTickets.map((ticket) => {
                const dueDate = ticket.slaInstance?.firstResponseDue || ticket.slaInstance?.resolutionDue;
                if (!dueDate) return null;

                const { text, color, bgColor, borderColor, progress } = getTimeRemaining(dueDate);

                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleTicketClick(ticket.id)}
                    className={cn(
                      "p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group",
                      "hover:scale-[1.02] hover:shadow-md",
                      bgColor,
                      borderColor
                    )}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                          {ticket.subject}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge variant="outline" className="text-[10px] h-5 border-0 bg-white/50 dark:bg-slate-800/50">
                            #{ticket.id.slice(0, 8)}
                          </Badge>
                          {ticket.priority && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] h-5 border-0',
                                ticket.priority === 'urgent' && 'bg-red-500 text-white',
                                ticket.priority === 'high' && 'bg-orange-500 text-white',
                                ticket.priority === 'medium' && 'bg-yellow-500 text-white',
                              )}
                            >
                              {ticket.priority}
                            </Badge>
                          )}
                        </div>
                      </div>

                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5" />
                          {t('timeRemaining', { fallback: 'Time remaining' })}
                        </span>
                        <span className={cn('font-bold', color)}>
                          {text}
                        </span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    {ticket.assignedAgent && (
                      <div className="text-[10px] text-muted-foreground mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                        {t('assignedTo', { name: `${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}`, fallback: `Assigned to ${ticket.assignedAgent.firstName} ${ticket.assignedAgent.lastName}` })}
                      </div>
                    )}
                  </div>
                );
              })}</div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
