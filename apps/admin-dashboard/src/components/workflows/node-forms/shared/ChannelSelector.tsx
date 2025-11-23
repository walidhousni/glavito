'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useChannels } from '@/lib/hooks/use-channels';
import { Loader2 } from 'lucide-react';

interface ChannelSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  required?: boolean;
  allowAuto?: boolean;
}

export function ChannelSelector({
  value,
  onChange,
  label = 'Channel',
  required = false,
  allowAuto = false,
}: ChannelSelectorProps) {
  const { channels, loading } = useChannels();

  return (
    <div className="space-y-1">
      {label && (
        <Label className="text-xs">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
      )}
      <Select value={value} onValueChange={onChange} disabled={loading}>
        <SelectTrigger className="h-8">
          <SelectValue placeholder={loading ? 'Loading...' : 'Select channel'} />
        </SelectTrigger>
        <SelectContent>
          {allowAuto && (
            <SelectItem value="auto">Auto (detect from context)</SelectItem>
          )}
          {channels
            .filter((ch) => ch.isActive !== false)
            .map((channel) => (
              <SelectItem key={channel.id} value={channel.id}>
                {channel.name || channel.type || channel.id}
              </SelectItem>
            ))}
          {channels.length === 0 && !loading && (
            <SelectItem value="" disabled>
              No channels available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {loading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading channels...
        </div>
      )}
    </div>
  );
}

