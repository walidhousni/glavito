import { api } from './config';

type ApiEnvelope<T> = { data: T } | T;

function unwrap<T>(payload: ApiEnvelope<T> | null | undefined): T | null {
  if (payload == null) return null;
  if (typeof payload === 'object' && payload !== null && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export interface AgentGoal {
  id: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  metric: 'tickets_resolved' | 'response_time' | 'csat_score';
  target: number;
  current: number;
  startDate: string | Date;
  endDate: string | Date;
  achieved: boolean;
  achievedAt: Date | null;
  progress: number;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AgentAchievement {
  id: string;
  userId: string;
  badgeType: string;
  earnedAt: Date;
  metadata?: Record<string, unknown>;
  createdAt: string | Date;
}

export interface CreateAgentGoalRequest {
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  metric: 'tickets_resolved' | 'response_time' | 'csat_score';
  target: number;
  startDate: string | Date;
  endDate: string | Date;
}

export interface UpdateGoalProgressRequest {
  current: number;
}

export const agentGoalsApi = {
  // Get goals for an agent
  getAgentGoals: async (userId: string, type?: string): Promise<AgentGoal[]> => {
    const params = type ? { type } : undefined;
    const response = await api.get(`/agent-profiles/${userId}/goals`, { params });
    return unwrap<AgentGoal[]>(response.data) ?? [];
  },

  // Create a goal for an agent
  createAgentGoal: async (data: CreateAgentGoalRequest): Promise<AgentGoal> => {
    const response = await api.post(`/agent-profiles/${data.userId}/goals`, data);
    return unwrap<AgentGoal>(response.data)!;
  },

  // Update goal progress
  updateGoalProgress: async (userId: string, goalId: string, data: UpdateGoalProgressRequest): Promise<AgentGoal> => {
    const response = await api.put(`/agent-profiles/${userId}/goals/${goalId}`, data);
    return unwrap<AgentGoal>(response.data)!;
  },

  // Get achievements for an agent
  getAgentAchievements: async (userId: string): Promise<AgentAchievement[]> => {
    const response = await api.get(`/agent-profiles/${userId}/achievements`);
    return unwrap<AgentAchievement[]>(response.data) ?? [];
  },

  // Award achievement to an agent (admin action)
  awardAchievement: async (userId: string, badgeType: string, metadata?: Record<string, unknown>): Promise<AgentAchievement> => {
    const response = await api.post(`/agent-profiles/${userId}/achievements`, { badgeType, metadata });
    return unwrap<AgentAchievement>(response.data)!;
  },
};

