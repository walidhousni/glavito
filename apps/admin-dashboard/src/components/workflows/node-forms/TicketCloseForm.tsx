'use client';

import React from 'react';
import { VariableInput } from './shared/VariableInput';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface TicketCloseFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function TicketCloseForm({ config, onChange }: TicketCloseFormProps) {
  const ticketId = config.ticketId || '';
  const status = config.status || 'resolved';
  const reason = config.reason || '';

  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-3">
      <VariableInput
        value={ticketId}
        onChange={(v) => updateConfig({ ticketId: v })}
        label="Ticket ID"
        placeholder="{{ticketId}} or leave empty to use context"
      />
      <p className="text-[11px] text-muted-foreground">
        Leave empty to use ticketId from workflow context
      </p>

      <div className="space-y-1">
        <Label className="text-xs">Resolution Status</Label>
        <Select
          value={status}
          onValueChange={(v) => updateConfig({ status: v })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Resolution Reason (optional)</Label>
        <Textarea
          value={reason}
          onChange={(e) => updateConfig({ reason: e.target.value })}
          placeholder="Reason for closing the ticket"
          rows={3}
          className="text-xs"
        />
      </div>
    </div>
  );
}

