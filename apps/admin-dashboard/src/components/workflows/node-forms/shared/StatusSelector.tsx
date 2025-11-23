'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface StatusSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  statuses?: string[];
}

const DEFAULT_STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export function StatusSelector({
  value,
  onChange,
  label = 'Status',
  required = false,
  statuses,
}: StatusSelectorProps) {
  const statusList = statuses
    ? statuses.map((s) => DEFAULT_STATUSES.find((d) => d.value === s) || { value: s, label: s })
    : DEFAULT_STATUSES;

  return (
    <div className="space-y-1">
      {label && (
        <Label className="text-xs">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder="Select status" />
        </SelectTrigger>
        <SelectContent>
          {statusList.map((status) => (
            <SelectItem key={status.value} value={status.value}>
              {status.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

