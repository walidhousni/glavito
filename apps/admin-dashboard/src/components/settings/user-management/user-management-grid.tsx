'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { AgentCard } from '@/components/agents/agent-card';
import type { AgentProfile } from '@/lib/api/team';

interface UserManagementGridProps {
  agents: AgentProfile[];
}

export function UserManagementGrid({ agents }: UserManagementGridProps) {
  const params = useParams();
  const locale = params?.locale as string || 'en';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {agents.map((agent, index) => (
        <AgentCard key={agent.id} agent={agent} index={index} locale={locale} />
      ))}
    </div>
  );
}
