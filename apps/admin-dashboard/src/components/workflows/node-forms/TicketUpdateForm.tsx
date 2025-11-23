'use client';

import React from 'react';
import { VariableInput } from './shared/VariableInput';
import { PrioritySelector } from './shared/PrioritySelector';
import { StatusSelector } from './shared/StatusSelector';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TicketUpdateFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function TicketUpdateForm({ config, onChange }: TicketUpdateFormProps) {
  const ticketId = config.ticketId || '';
  const subject = config.subject || '';
  const description = config.description || '';
  const status = config.status || '';
  const priority = config.priority || '';
  const tags = Array.isArray(config.tags) ? config.tags : [];

  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  };

  const handleAddTag = (tag: string) => {
    if (tag.trim() && !tags.includes(tag.trim())) {
      updateConfig({ tags: [...tags, tag.trim()] });
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateConfig({ tags: tags.filter((t) => t !== tagToRemove) });
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

      <VariableInput
        value={subject}
        onChange={(v) => updateConfig({ subject: v })}
        label="Subject (optional)"
        placeholder="New subject or {{subject}}"
      />

      <VariableInput
        value={description}
        onChange={(v) => updateConfig({ description: v })}
        label="Description (optional)"
        placeholder="New description or {{description}}"
        type="textarea"
      />

      <StatusSelector
        value={status}
        onChange={(v) => updateConfig({ status: v })}
        label="Status (optional)"
      />

      <PrioritySelector
        value={priority || 'medium'}
        onChange={(v) => updateConfig({ priority: v })}
        label="Priority (optional)"
      />

      <div className="space-y-1">
        <Label className="text-xs">Tags (optional)</Label>
        <div className="flex flex-wrap gap-1 mb-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
              {tag}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag)}
                className="hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
        <Input
          placeholder="Add tag (press Enter)"
          className="h-8"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleAddTag(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs">Custom Fields (JSON, optional)</Label>
        <textarea
          className="font-mono text-xs min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2"
          value={JSON.stringify(config.customFields || {}, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value || '{}');
              updateConfig({ customFields: parsed });
            } catch {
              // Ignore invalid JSON while typing
            }
          }}
          placeholder='{"field1": "value1"}'
        />
      </div>
    </div>
  );
}

