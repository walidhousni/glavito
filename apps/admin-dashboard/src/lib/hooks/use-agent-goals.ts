import { useEffect } from 'react';
import { useAgentGoalsStore } from '@/lib/store/agent-goals-store';
import type { CreateAgentGoalRequest, UpdateGoalProgressRequest } from '@/lib/api/agent-goals';

export function useAgentGoals(userId?: string, type?: string) {
  const {
    goals,
    achievements,
    isLoading,
    error,
    fetchGoals,
    fetchAchievements,
    createGoal,
    updateGoalProgress,
    awardAchievement,
    clearError,
    reset,
  } = useAgentGoalsStore();

  useEffect(() => {
    if (userId) {
      fetchGoals(userId, type);
      fetchAchievements(userId);
    } else {
      reset();
    }
  }, [userId, type, fetchGoals, fetchAchievements, reset]);

  const handleCreateGoal = async (data: CreateAgentGoalRequest) => {
    return createGoal(data);
  };

  const handleUpdateGoalProgress = async (goalId: string, data: UpdateGoalProgressRequest) => {
    if (!userId) throw new Error('User ID is required');
    return updateGoalProgress(userId, goalId, data);
  };

  const handleAwardAchievement = async (badgeType: string, metadata?: Record<string, unknown>) => {
    if (!userId) throw new Error('User ID is required');
    return awardAchievement(userId, badgeType, metadata);
  };

  const refetch = () => {
    if (userId) {
      fetchGoals(userId, type);
      fetchAchievements(userId);
    }
  };

  return {
    goals,
    achievements,
    isLoading,
    error,
    createGoal: handleCreateGoal,
    updateGoalProgress: handleUpdateGoalProgress,
    awardAchievement: handleAwardAchievement,
    refetch,
    clearError,
  };
}

