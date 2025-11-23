'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VariableInput } from './shared/VariableInput';
import { ChannelSelector } from './shared/ChannelSelector';

interface SendMessageFormProps {
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

export function SendMessageForm({ config, onChange }: SendMessageFormProps) {
  const channel = config.channel || 'auto';
  const message = config.message || config.content || '';
  const messageType = config.messageType || 'text';
  const conversationId = config.conversationId || '';

  const updateConfig = (updates: Record<string, any>) => {
    onChange({ ...config, ...updates });
  };

  return (
    <div className="space-y-3">
      <ChannelSelector
        value={channel}
        onChange={(v) => updateConfig({ channel: v })}
        label="Channel"
        allowAuto
      />

      <div className="space-y-1">
        <Label className="text-xs">Message Type</Label>
        <Select
          value={messageType}
          onValueChange={(v) => updateConfig({ messageType: v })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="contact">Contact</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <VariableInput
        value={message}
        onChange={(v) => updateConfig({ message: v, content: v })}
        label="Message Content"
        placeholder="Enter message text or use {{variable}}"
        type="textarea"
      />

      {(messageType === 'image' || messageType === 'document' || messageType === 'video' || messageType === 'audio') && (
        <VariableInput
          value={config.mediaUrl || ''}
          onChange={(v) => updateConfig({ mediaUrl: v })}
          label="Media URL"
          placeholder="https://example.com/image.jpg or {{mediaUrl}}"
        />
      )}

      {messageType === 'location' && (
        <div className="grid grid-cols-2 gap-2">
          <VariableInput
            value={config.latitude || ''}
            onChange={(v) => updateConfig({ latitude: v })}
            label="Latitude"
            placeholder="40.7128 or {{lat}}"
          />
          <VariableInput
            value={config.longitude || ''}
            onChange={(v) => updateConfig({ longitude: v })}
            label="Longitude"
            placeholder="-74.0060 or {{lng}}"
          />
        </div>
      )}

      <VariableInput
        value={conversationId}
        onChange={(v) => updateConfig({ conversationId: v })}
        label="Conversation ID (optional)"
        placeholder="Leave empty to auto-detect"
      />
      <p className="text-[11px] text-muted-foreground">
        Leave empty to auto-find by ticket/customer context
      </p>
    </div>
  );
}

