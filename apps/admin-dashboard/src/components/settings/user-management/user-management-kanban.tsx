'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AgentCard } from '@/components/agents/agent-card';
import type { AgentProfile } from '@/lib/api/team';

interface UserManagementKanbanProps {
  agentsByStatus: {
    available: AgentProfile[];
    busy: AgentProfile[];
    away: AgentProfile[];
    offline: AgentProfile[];
  };
}

export function UserManagementKanban({ agentsByStatus }: UserManagementKanbanProps) {
  const t = useTranslations('settings.userManagement');
  const params = useParams();
  const locale = params?.locale as string || 'en';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
      {Object.entries(agentsByStatus).map(([status, agents]) => (
        <Card key={status}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="capitalize">{t(status, { fallback: status })}</span>
              <Badge variant="secondary">{agents.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} locale={locale} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
