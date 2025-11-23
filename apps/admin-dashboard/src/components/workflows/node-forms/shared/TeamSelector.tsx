'use client';

import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useTeams } from '@/lib/hooks/use-teams';
import { Loader2 } from 'lucide-react';

interface TeamSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowNone?: boolean;
  required?: boolean;
}

export function TeamSelector({
  value,
  onChange,
  label = 'Team',
  allowNone = true,
  required = false,
}: TeamSelectorProps) {
  const { teams, loading } = useTeams();

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
          <SelectValue placeholder={loading ? 'Loading...' : 'Select team'} />
        </SelectTrigger>
        <SelectContent>
          {allowNone && (
            <SelectItem value="none">None</SelectItem>
          )}
          {teams.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
              {team.description && (
                <span className="text-muted-foreground text-xs ml-2">({team.description})</span>
              )}
            </SelectItem>
          ))}
          {teams.length === 0 && !loading && (
            <SelectItem value="Value" disabled>
              No teams available
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {loading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading teams...
        </div>
      )}
    </div>
  );
}

