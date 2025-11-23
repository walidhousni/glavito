'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { conversationsApi } from '@/lib/api/conversations-client';
import { ticketsApi } from '@/lib/api/tickets-client';
import { crmApi } from '@/lib/api/crm-client';
import { formatDistanceToNow, isValid as isDateValid } from 'date-fns';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface TimelineEvent {
  id: string;
  type: 'conversation' | 'ticket' | 'deal' | 'email' | 'call' | 'note';
  title: string;
  description?: string;
  timestamp: Date;
  channel?: 'whatsapp' | 'instagram' | 'email' | 'sms' | 'phone' | 'web';
  metadata?: Record<string, any>;
}

interface UnifiedCustomerTimelineProps {
  customerId?: string;
  leadId?: string;
}

function toSafeDate(value: any): Date {
  const dateValue = value instanceof Date ? value : new Date(value);
  return isDateValid(dateValue) ? dateValue : new Date();
}

export function UnifiedCustomerTimeline({ customerId, leadId }: UnifiedCustomerTimelineProps) {
  const t = useTranslations('crm');
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    async function loadTimeline() {
      setLoading(true);
      try {
        const [conversationsResult, ticketsResult, dealsResult, activitiesResult] = await Promise.all([
          customerId ? conversationsApi.list({ customerId, limit: 50 }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          customerId ? ticketsApi.list({ customerId, limit: 50 }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
          leadId ? crmApi.listDeals().catch(() => []) : Promise.resolve([]),
          leadId ? crmApi.listLeadActivities(leadId).catch(() => ({ data: [] })) : Promise.resolve({ data: [] }),
        ]);

        const conversations = Array.isArray(conversationsResult.data) ? conversationsResult.data : [];
        const tickets = Array.isArray(ticketsResult.data) ? ticketsResult.data : [];
        const deals = Array.isArray(dealsResult) ? dealsResult : [];
        const activities = Array.isArray(activitiesResult.data) ? activitiesResult.data : [];

        const timeline: TimelineEvent[] = [
          ...conversations.map((c: any) => ({
            id: c.id,
            type: 'conversation' as const,
            title: `${c.channel?.type || 'Conversation'}`,
            description: c.lastMessage?.content || '',
            timestamp: toSafeDate(c.updatedAt),
            channel: c.channel?.type,
          })),
          ...tickets.map((t: any) => ({
            id: t.id,
            type: 'ticket' as const,
            title: t.subject || 'Support Ticket',
            description: t.description,
            timestamp: toSafeDate(t.createdAt),
          })),
          ...deals.filter((d: any) => d.customerId === customerId).map((d: any) => ({
            id: d.id,
            type: 'deal' as const,
            title: `Deal moved to ${d.stage}`,
            description: d.name,
            timestamp: toSafeDate(d.updatedAt),
          })),
          ...activities.map((a: any) => ({
            id: a.id,
            type: 'note' as const,
            title: a.type || 'Activity',
            description: a.description,
            timestamp: toSafeDate(a.createdAt),
          })),
        ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

        setEvents(timeline);
      } catch (error) {
        console.error('Failed to load timeline:', error);
      } finally {
        setLoading(false);
      }
    }

    if (customerId || leadId) {
      loadTimeline();
    }
  }, [customerId, leadId]);

  const getEventIcon = (event: TimelineEvent) => {
    switch (event.type) {
      case 'conversation':
        return event.channel === 'whatsapp' ? 'https://img.icons8.com/?size=24&id=16713' :
               event.channel === 'instagram' ? 'https://img.icons8.com/?size=24&id=32292' :
               event.channel === 'email' ? 'https://img.icons8.com/?size=24&id=LPcVNr4g0oyz' :
               'https://img.icons8.com/?size=24&id=9730';
      case 'ticket': return 'https://img.icons8.com/?size=24&id=85057';
      case 'deal': return 'https://img.icons8.com/?size=24&id=xuvGCOXi8Wyg';
      default: return 'https://img.icons8.com/?size=24&id=82749';
    }
  };

  const filteredEvents = filter === 'all' ? events : events.filter(e => e.type === filter);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{t('timeline.title', { default: 'Unified Timeline' })}</CardTitle>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('timeline.all', { default: 'All Activities' })}</SelectItem>
              <SelectItem value="conversation">{t('timeline.conversations', { default: 'Conversations' })}</SelectItem>
              <SelectItem value="ticket">{t('timeline.tickets', { default: 'Tickets' })}</SelectItem>
              <SelectItem value="deal">{t('timeline.deals', { default: 'Deals' })}</SelectItem>
              <SelectItem value="note">{t('timeline.notes', { default: 'Notes' })}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <ScrollArea className="h-[600px] pr-4">
            <div className="relative space-y-6">
              {/* Vertical timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-purple-500 to-pink-500" />
              
              {filteredEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {t('timeline.noEvents', { default: 'No events found' })}
                </p>
              ) : (
                filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="relative pl-12 group"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-0 top-2 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center ring-4 ring-background">
                      <Image src={getEventIcon(event)} alt="" width={16} height={16} className="brightness-0 invert" />
                    </div>
                    
                    <Card className="group-hover:shadow-lg transition-all duration-300 cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h4 className="font-semibold group-hover:text-primary transition-colors">
                              {event.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(event.timestamp, { addSuffix: true })}
                            </p>
                          </div>
                          <Badge variant="outline">{event.type}</Badge>
                        </div>
                        {event.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {event.description}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
