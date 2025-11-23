'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface TicketCardProps {
  ticket: {
    id: string;
    subject: string;
    description?: string;
    status: string;
    priority: string;
    customer?: { firstName?: string; lastName?: string; company?: string };
    createdAt?: string | Date;
  };
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick: () => void;
}

export function TicketCard({
  ticket,
  selected,
  onSelect,
  onClick,
}: TicketCardProps) {
  const fullName = `${ticket.customer?.firstName || ''} ${ticket.customer?.lastName || ''}`.trim();
  return (
    <Card
      className={cn(
        'p-4 border transition-colors cursor-pointer',
        selected && 'bg-blue-50 dark:bg-blue-950/20'
      )}
      onClick={onClick}
    >
      <CardContent className="p-0 space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-medium line-clamp-1">{ticket.subject}</div>
          <Badge variant="outline" className="text-xs">
            {ticket.priority}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground line-clamp-2">
          {ticket.description || 'No description'}
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="text-muted-foreground">{fullName || 'Customer'}</div>
          <Badge className="capitalize">{ticket.status}</Badge>
        </div>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-mono">#{ticket.id}</span>
          <span>
            {ticket.createdAt
              ? new Date(ticket.createdAt).toLocaleString()
              : ''}
          </span>
        </div>
        <div className="flex justify-end">
          <label className="text-xs flex items-center gap-1 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(e.target.checked)}
              onClick={(e) => e.stopPropagation()}
            />
            Select
          </label>
        </div>
      </CardContent>
    </Card>
  );
}


