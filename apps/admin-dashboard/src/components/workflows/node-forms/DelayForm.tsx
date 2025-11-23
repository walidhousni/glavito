'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { VariableInput } from './shared/VariableInput';

interface DelayFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function DelayForm({ config, onChange }: DelayFormProps) {
  const delayType = config.delayType || 'fixed';
  const duration = config.duration || config.delayMs || 0;
  const cron = config.cron || '';
  const resumeAt = config.resumeAt || '';

  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-xs">Delay Type</Label>
        <Select
          value={delayType}
          onValueChange={(v) => updateConfig({ delayType: v })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fixed">Fixed Duration</SelectItem>
            <SelectItem value="cron">Cron Schedule</SelectItem>
            <SelectItem value="until">Until Date/Time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {delayType === 'fixed' && (
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Hours</Label>
            <Input
              type="number"
              value={Math.floor((duration || 0) / (1000 * 60 * 60))}
              onChange={(e) => {
                const hours = parseInt(e.target.value || '0', 10);
                const minutes = Math.floor(((duration || 0) % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor(((duration || 0) % (1000 * 60)) / 1000);
                const newDuration = hours * 1000 * 60 * 60 + minutes * 1000 * 60 + seconds * 1000;
                updateConfig({ duration: newDuration, delayMs: newDuration });
              }}
              className="h-8"
              min="0"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Minutes</Label>
            <Input
              type="number"
              value={Math.floor(((duration || 0) % (1000 * 60 * 60)) / (1000 * 60))}
              onChange={(e) => {
                const hours = Math.floor((duration || 0) / (1000 * 60 * 60));
                const minutes = parseInt(e.target.value || '0', 10);
                const seconds = Math.floor(((duration || 0) % (1000 * 60)) / 1000);
                const newDuration = hours * 1000 * 60 * 60 + minutes * 1000 * 60 + seconds * 1000;
                updateConfig({ duration: newDuration, delayMs: newDuration });
              }}
              className="h-8"
              min="0"
              max="59"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Seconds</Label>
            <Input
              type="number"
              value={Math.floor(((duration || 0) % (1000 * 60)) / 1000)}
              onChange={(e) => {
                const hours = Math.floor((duration || 0) / (1000 * 60 * 60));
                const minutes = Math.floor(((duration || 0) % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = parseInt(e.target.value || '0', 10);
                const newDuration = hours * 1000 * 60 * 60 + minutes * 1000 * 60 + seconds * 1000;
                updateConfig({ duration: newDuration, delayMs: newDuration });
              }}
              className="h-8"
              min="0"
              max="59"
            />
          </div>
        </div>
      )}

      {delayType === 'cron' && (
        <VariableInput
          value={cron}
          onChange={(v) => updateConfig({ cron: v })}
          label="Cron Expression"
          placeholder="*/15 * * * *"
        />
      )}

      {delayType === 'until' && (
        <div className="space-y-1">
          <Label className="text-xs">Resume At</Label>
          <Input
            type="datetime-local"
            value={resumeAt ? new Date(resumeAt).toISOString().slice(0, 16) : ''}
            onChange={(e) => {
              const date = e.target.value ? new Date(e.target.value).toISOString() : '';
              updateConfig({ resumeAt: date });
            }}
            className="h-8"
          />
        </div>
      )}

      {delayType === 'fixed' && duration > 0 && (
        <p className="text-xs text-muted-foreground">
          Total delay: {Math.floor(duration / (1000 * 60 * 60))}h{' '}
          {Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60))}m{' '}
          {Math.floor((duration % (1000 * 60)) / 1000)}s
        </p>
      )}
    </div>
  );
}

