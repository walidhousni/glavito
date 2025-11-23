import { useState, useEffect, useCallback } from 'react';
import { conversationsApi } from '@/lib/api/conversations-client';

export interface Agent {
  id: string;
  userId: string;
  user?: {
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    avatar?: string | null;
    status?: string;
  };
}

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all teams and their members
      const teams = await conversationsApi.listTeams(true);
      const allMembers: Agent[] = [];
      const seenUserIds = new Set<string>();

      if (Array.isArray(teams)) {
        for (const team of teams) {
          try {
            const members = await conversationsApi.getTeamMembers(team.id);
            if (Array.isArray(members)) {
              members.forEach((member: any) => {
                if (member.user && member.userId && !seenUserIds.has(member.userId)) {
                  seenUserIds.add(member.userId);
                  allMembers.push({
                    id: member.id,
                    userId: member.userId,
                    user: member.user,
                  });
                }
              });
            }
          } catch {
            // Skip teams that fail
          }
        }
      }

      setAgents(allMembers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
      setAgents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

