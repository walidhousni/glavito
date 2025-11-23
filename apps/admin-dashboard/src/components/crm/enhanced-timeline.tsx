'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  MessageSquare,
  Ticket,
  TrendingUp,
  FileText,
  Phone,
  Mail,
  Filter,
  Calendar,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { crmApi } from '@/lib/api/crm-client';

interface TimelineEvent {
  id: string;
  type: 'message' | 'conversation' | 'ticket' | 'lead_activity' | 'deal_activity' | 'quote_activity' | 'call';
  title: string;
  description?: string;
  timestamp: Date;
  channel?: string;
  metadata?: Record<string, any>;
  entityId?: string;
  entityType?: string;
}

interface EnhancedTimelineProps {
  customerId?: string;
  leadId?: string;
  dealId?: string;
  className?: string;
}

const eventIcons: Record<string, React.ElementType> = {
  message: MessageSquare,
  conversation: MessageSquare,
  ticket: Ticket,
  lead_activity: TrendingUp,
  deal_activity: TrendingUp,
  quote_activity: FileText,
  call: Phone,
};

const eventColors: Record<string, string> = {
  message: 'bg-blue-100 text-blue-800',
  conversation: 'bg-purple-100 text-purple-800',
  ticket: 'bg-orange-100 text-orange-800',
  lead_activity: 'bg-green-100 text-green-800',
  deal_activity: 'bg-emerald-100 text-emerald-800',
  quote_activity: 'bg-yellow-100 text-yellow-800',
  call: 'bg-pink-100 text-pink-800',
};

function TimelineEventItem({ event }: { event: TimelineEvent }) {
  const Icon = eventIcons[event.type] || MessageSquare;
  const colorClass = eventColors[event.type] || 'bg-gray-100 text-gray-800';

  return (
    <div className="flex gap-3 group">
      <div className="flex flex-col items-center">
        <div className={cn('rounded-full p-2', colorClass)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="w-px flex-1 bg-border mt-2" />
      </div>
      <div className="flex-1 pb-6">
        <Card className="group-hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-sm">{event.title}</h4>
                {event.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
              </div>
              <Badge variant="outline" className="text-xs">
                {event.type.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>{format(new Date(event.timestamp), 'PPp')}</span>
              {event.channel && (
                <Badge variant="secondary" className="text-xs">
                  {event.channel}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function EnhancedTimeline({ customerId, leadId, dealId, className }: EnhancedTimelineProps) {
  const [events, setEvents] = React.useState<TimelineEvent[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedChannels, setSelectedChannels] = React.useState<string[]>([]);

  const eventTypes = [
    'message',
    'conversation',
    'ticket',
    'lead_activity',
    'deal_activity',
    'quote_activity',
    'call',
  ];

  const channels = ['email', 'whatsapp', 'webchat', 'phone', 'sms'];

  React.useEffect(() => {
    async function fetchTimeline() {
      try {
        setIsLoading(true);
        const response = await crmApi.getTimeline({
          customerId,
          leadId,
          dealId,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          channels: selectedChannels.length > 0 ? selectedChannels : undefined,
          limit: 50,
        });
        setEvents(response.events || []);
      } catch (error) {
        console.error('Failed to fetch timeline:', error);
        setEvents([]);
      } finally {
        setIsLoading(false);
      }
    }

    if (customerId || leadId || dealId) {
      fetchTimeline();
    }
  }, [customerId, leadId, dealId, selectedTypes, selectedChannels]);

  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  // Group events by date
  const eventsByDate = React.useMemo(() => {
    const grouped: Record<string, TimelineEvent[]> = {};
    events.forEach((event) => {
      const date = format(new Date(event.timestamp), 'yyyy-MM-dd');
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(event);
    });
    return grouped;
  }, [events]);

  const sortedDates = Object.keys(eventsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              Event Types
              {selectedTypes.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedTypes.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {eventTypes.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={selectedTypes.includes(type)}
                onCheckedChange={() => toggleType(type)}
              >
                {type.replace('_', ' ')}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Mail className="mr-2 h-4 w-4" />
              Channels
              {selectedChannels.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {selectedChannels.length}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Filter by channel</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {channels.map((channel) => (
              <DropdownMenuCheckboxItem
                key={channel}
                checked={selectedChannels.includes(channel)}
                onCheckedChange={() => toggleChannel(channel)}
              >
                {channel}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {(selectedTypes.length > 0 || selectedChannels.length > 0) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedTypes([]);
              setSelectedChannels([]);
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">Loading timeline...</div>
          </div>
        ) : sortedDates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No timeline events found</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date}>
              {/* Date Header */}
              <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 py-2 mb-4">
                <h3 className="text-sm font-semibold text-muted-foreground">
                  {format(new Date(date), 'EEEE, MMMM d, yyyy')}
                </h3>
              </div>

              {/* Events for this date */}
              <div className="space-y-0">
                {eventsByDate[date].map((event, index) => (
                  <TimelineEventItem
                    key={`${event.id}-${index}`}
                    event={event}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

