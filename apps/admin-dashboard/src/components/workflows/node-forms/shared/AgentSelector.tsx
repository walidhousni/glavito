'use client';

import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAgents } from '@/lib/hooks/use-agents';
import { Loader2, Search, User } from 'lucide-react';

interface AgentSelectorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  allowUnassigned?: boolean;
  required?: boolean;
}

export function AgentSelector({
  value,
  onChange,
  label = 'Agent',
  allowUnassigned = true,
  required = false,
}: AgentSelectorProps) {
  const { agents, loading } = useAgents();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAgents = agents.filter((agent) => {
    if (!searchQuery) return true;
    const name = `${agent.user?.firstName || ''} ${agent.user?.lastName || ''}`.toLowerCase();
    const email = agent.user?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

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
          <SelectValue placeholder={loading ? 'Loading...' : 'Select agent'} />
        </SelectTrigger>
        <SelectContent>
          {allowUnassigned && (
            <SelectItem value="unassigned">Unassigned</SelectItem>
          )}
          <div className="px-2 py-1.5">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search agents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-7 pl-7 text-xs"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          {filteredAgents.length > 0 ? (
            filteredAgents.map((agent) => {
              const name = `${agent.user?.firstName || ''} ${agent.user?.lastName || ''}`.trim() || agent.user?.email || 'Unknown';
              return (
                <SelectItem key={agent.id} value={agent.userId}>
                  <div className="flex items-center gap-2">
                    <User className="h-3 w-3" />
                    <span>{name}</span>
                    {agent.user?.email && (
                      <span className="text-muted-foreground text-xs">({agent.user.email})</span>
                    )}
                  </div>
                </SelectItem>
              );
            })
          ) : (
            <SelectItem value="Value" disabled>
              {loading ? 'Loading...' : searchQuery ? 'No agents found' : 'No agents available'}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      {loading && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Loading agents...
        </div>
      )}
    </div>
  );
}

