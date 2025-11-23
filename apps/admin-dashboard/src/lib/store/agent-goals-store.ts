import { create } from 'zustand';
import { agentGoalsApi, AgentGoal, AgentAchievement, CreateAgentGoalRequest, UpdateGoalProgressRequest } from '../api/agent-goals';

interface AgentGoalsState {
  goals: AgentGoal[];
  achievements: AgentAchievement[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchGoals: (userId: string, type?: string) => Promise<void>;
  fetchAchievements: (userId: string) => Promise<void>;
  createGoal: (data: CreateAgentGoalRequest) => Promise<AgentGoal>;
  updateGoalProgress: (userId: string, goalId: string, data: UpdateGoalProgressRequest) => Promise<void>;
  awardAchievement: (userId: string, badgeType: string, metadata?: Record<string, unknown>) => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

export const useAgentGoalsStore = create<AgentGoalsState>((set, get) => ({
  goals: [],
  achievements: [],
  isLoading: false,
  error: null,

  fetchGoals: async (userId: string, type?: string) => {
    set({ isLoading: true, error: null });
    try {
      const goals = await agentGoalsApi.getAgentGoals(userId, type);
      set({ goals, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch goals',
        isLoading: false,
      });
    }
  },

  fetchAchievements: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const achievements = await agentGoalsApi.getAgentAchievements(userId);
      set({ achievements, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch achievements',
        isLoading: false,
      });
    }
  },

  createGoal: async (data: CreateAgentGoalRequest) => {
    set({ isLoading: true, error: null });
    try {
      const newGoal = await agentGoalsApi.createAgentGoal(data);
      set(state => ({
        goals: [...state.goals, newGoal],
        isLoading: false,
      }));
      return newGoal;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create goal',
        isLoading: false,
      });
      throw error;
    }
  },

  updateGoalProgress: async (userId: string, goalId: string, data: UpdateGoalProgressRequest) => {
    set({ isLoading: true, error: null });
    try {
      const updatedGoal = await agentGoalsApi.updateGoalProgress(userId, goalId, data);
      set(state => ({
        goals: state.goals.map(goal => goal.id === goalId ? updatedGoal : goal),
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update goal progress',
        isLoading: false,
      });
    }
  },

  awardAchievement: async (userId: string, badgeType: string, metadata?: Record<string, unknown>) => {
    set({ isLoading: true, error: null });
    try {
      const newAchievement = await agentGoalsApi.awardAchievement(userId, badgeType, metadata);
      set(state => ({
        achievements: [...state.achievements, newAchievement],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to award achievement',
        isLoading: false,
      });
    }
  },

  clearError: () => {
    set({ error: null });
  },

  reset: () => {
    set({
      goals: [],
      achievements: [],
      isLoading: false,
      error: null,
    });
  },
}));

