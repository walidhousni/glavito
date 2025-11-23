'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/lib/store/auth-store';
import { agentApi, type AgentProfile, type AgentAvailabilityRequest } from '@/lib/api/team';
import { useToast } from '@/hooks/use-toast';

export function useAgentAvailability() {
  const { user } = useAuthStore();
  const { toast } = useToast();
  const [availability, setAvailability] = useState<'available' | 'busy' | 'away' | 'offline'>('available');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<AgentProfile | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const agentProfile = await agentApi.getAgentProfile(user.id);
      setProfile(agentProfile);
      setAvailability(agentProfile.availability || 'available');
    } catch (error) {
      // If profile doesn't exist, that's okay - user might not be an agent
      console.debug('Agent profile not found:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateAvailability = async (newAvailability: 'available' | 'busy' | 'away' | 'offline') => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const request: AgentAvailabilityRequest = {
        availability: newAvailability,
      };
      
      await agentApi.updateAgentAvailability(user.id, request);
      setAvailability(newAvailability);
      
      toast({
        title: 'Status updated',
        description: `Your status is now ${newAvailability}`,
      });
    } catch (error) {
      toast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    availability,
    loading,
    profile,
    updateAvailability,
    refresh: loadProfile,
  };
}

