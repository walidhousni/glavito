import { useEffect } from 'react';
import { useAgentStore } from '@/lib/store/agent-store';
import { UpdateAgentProfileRequest, AgentAvailabilityRequest } from '@/lib/api/team';

// Hook for managing all agents
export const useAgents = () => {
  const {
    agents,
    availableAgents,
    isLoading,
    error,
    fetchAgents,
    fetchAvailableAgents,
    updateAgentProfile,
    updateAgentAvailability,
    clearError,
  } = useAgentStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const getAvailableAgents = async (params?: {
    skills?: string[];
    languages?: string[];
    maxLoad?: boolean;
  }) => {
    return fetchAvailableAgents(params);
  };

  const updateProfile = async (userId: string, data: UpdateAgentProfileRequest) => {
    return updateAgentProfile(userId, data);
  };

  const updateAvailability = async (userId: string, data: AgentAvailabilityRequest) => {
    return updateAgentAvailability(userId, data);
  };

  return {
    agents,
    availableAgents,
    isLoading,
    error,
    refetch: fetchAgents,
    getAvailableAgents,
    updateProfile,
    updateAvailability,
    clearError,
  };
};

// Hook for managing a specific agent
export const useAgent = (userId?: string) => {
  const {
    currentAgent,
    performanceMetrics,
    isLoading,
    error,
    fetchAgent,
    fetchAgentPerformance,
    updateAgentProfile,
    updateAgentAvailability,
    setCurrentAgent,
    clearError,
  } = useAgentStore();

  useEffect(() => {
    if (userId) {
      fetchAgent(userId);
      fetchAgentPerformance(userId);
    } else {
      setCurrentAgent(null);
    }
  }, [userId, fetchAgent, fetchAgentPerformance, setCurrentAgent]);

  const updateProfile = async (data: UpdateAgentProfileRequest) => {
    if (!userId) throw new Error('User ID is required');
    return updateAgentProfile(userId, data);
  };

  const updateAvailability = async (data: AgentAvailabilityRequest) => {
    if (!userId) throw new Error('User ID is required');
    return updateAgentAvailability(userId, data);
  };

  const refetchPerformance = () => {
    if (userId) {
      fetchAgentPerformance(userId);
    }
  };

  return {
    agent: currentAgent,
    performanceMetrics,
    isLoading,
    error,
    updateProfile,
    updateAvailability,
    refetchPerformance,
    clearError,
  };
};

// Hook for current user's agent profile
export const useMyAgentProfile = () => {
  // In a real app, you'd get the current user ID from auth context
  const currentUserId = 'current-user-id'; // Replace with actual current user ID
  
  return useAgent(currentUserId);
};