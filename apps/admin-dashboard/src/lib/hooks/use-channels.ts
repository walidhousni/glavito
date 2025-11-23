import { useState, useEffect } from 'react';
import { channelsApi } from '@/lib/api/channels-client';

export interface Channel {
  id: string;
  name?: string;
  type: string;
  isActive?: boolean;
}

export function useChannels() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    
    async function fetchChannels() {
      try {
        setLoading(true);
        setError(null);
        const data = await channelsApi.list();
        if (!cancelled) {
          setChannels(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load channels');
          setChannels([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchChannels();

    return () => {
      cancelled = true;
    };
  }, []);

  return { channels, loading, error, refetch: () => {
    setLoading(true);
    channelsApi.list().then(data => {
      setChannels(Array.isArray(data) ? data : []);
      setLoading(false);
    }).catch(err => {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
      setLoading(false);
    });
  } };
}

