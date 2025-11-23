import { useState, useEffect } from 'react';
import { conversationsApi } from '@/lib/api/conversations-client';

export interface Team {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  isDefault?: boolean;
}

export function useTeams() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchTeams() {
      try {
        setLoading(true);
        setError(null);
        const data = await conversationsApi.listTeams(false);
        if (!cancelled) {
          setTeams(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load teams');
          setTeams([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchTeams();

    return () => {
      cancelled = true;
    };
  }, []);

  return { teams, loading, error, refetch: () => {
    setLoading(true);
    conversationsApi.listTeams(false).then(data => {
      setTeams(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load teams');
      setLoading(false);
    });
  } };
}

