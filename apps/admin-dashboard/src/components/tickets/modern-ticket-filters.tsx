'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface TicketFiltersValue {
  search: string;
  status: string[];
  priority: string[];
  assignee: string[];
  customer: string[];
  channel: string[];
  team: string[];
  dateRange: { from: Date | null; to: Date | null };
  tags: string[];
  special: string[];
}

export interface ModernTicketFiltersProps {
  filters: TicketFiltersValue;
  onFiltersChange: (filters: TicketFiltersValue) => void;
  onClearFilters: () => void;
}

const statuses = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'pending', label: 'Pending' },
  { key: 'on_hold', label: 'On Hold' },
  { key: 'closed', label: 'Closed' },
];

export function ModernTicketFilters({
  filters,
  onFiltersChange,
  onClearFilters,
}: ModernTicketFiltersProps) {
  const activeStatus = filters.status.length > 0 ? filters.status[0] : 'all';

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Search tickets..."
          value={filters.search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            onFiltersChange({ ...filters, search: e.target.value })
          }
          className="w-[240px]"
        />
        {filters.search && (
          <Badge variant="secondary" className="text-xs">
            {filters.search}
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex bg-muted rounded-lg p-1">
          {statuses.map((s) => (
            <Button
              key={s.key}
              variant={activeStatus === s.key ? 'default' : 'ghost'}
              size="sm"
              className="px-3"
              onClick={() =>
                onFiltersChange({
                  ...filters,
                  status: s.key === 'all' ? [] : [s.key],
                })
              }
            >
              {s.label}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={onClearFilters}>
          Clear
        </Button>
      </div>
    </div>
  );
}


