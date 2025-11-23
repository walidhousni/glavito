'use client';

import { validateTicketCreate, ValidationError } from './shared/validation';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { VariableInput } from './shared/VariableInput';
import { ChannelSelector } from './shared/ChannelSelector';
import { PrioritySelector } from './shared/PrioritySelector';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface TicketCreateFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function TicketCreateForm({ config, onChange }: TicketCreateFormProps) {
  const subject = config.subject || '';
  const description = config.description || '';
  const customerId = config.customerId || '';
  const channelId = config.channelId || '';
  const priority = config.priority || 'medium';
  const tags = Array.isArray(config.tags) ? config.tags : [];

  const errors = validateTicketCreate(config);

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
      {errors.length > 0 && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            <div className="space-y-1">
              {errors.map((error, idx) => (
                <div key={idx}>
                  <strong>{error.field}:</strong> {error.message}
                </div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}
      <VariableInput
        value={subject}
        onChange={(v) => updateConfig({ subject: v })}
        label="Subject"
        placeholder="Ticket subject or {{subject}}"
        required
      />

      <VariableInput
        value={description}
        onChange={(v) => updateConfig({ description: v })}
        label="Description"
        placeholder="Ticket description or {{description}}"
        type="textarea"
      />

      <VariableInput
        value={customerId}
        onChange={(v) => updateConfig({ customerId: v })}
        label="Customer ID (optional)"
        placeholder="{{customerId}} or leave empty to use context"
      />
      <p className="text-[11px] text-muted-foreground">
        Leave empty to use customerId from workflow context
      </p>

      <ChannelSelector
        value={channelId}
        onChange={(v) => updateConfig({ channelId: v })}
        label="Channel"
        required
      />

      <PrioritySelector
        value={priority}
        onChange={(v) => updateConfig({ priority: v })}
      />

      <div className="space-y-1">
        <Label className="text-xs">Tags</Label>
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
        <Label className="text-xs">Custom Fields (JSON)</Label>
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
          placeholder='{"field1": "value1", "field2": "{{variable}}"}'
        />
      </div>
    </div>
  );
}

