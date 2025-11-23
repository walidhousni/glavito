import { api as apiClient } from './config';

export interface DashboardMetrics {
  activeConversations: number;
  pendingTickets: number;
  slaAtRisk: number;
  agentsOnline: number;
  resolvedToday: number;
  timestamp: string;
}

export interface AgentMetrics {
  assignedTickets: number;
  resolvedToday: number;
  resolvedThisWeek: number;
  avgResponseTime: number;
  csatScore: number;
  timestamp: string;
}

export interface DashboardConfig {
  id: string;
  userId: string;
  layout: Record<string, unknown>;
  widgets: string[];
  theme?: string;
  settings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentGoal {
  id: string;
  userId: string;
  type: 'daily' | 'weekly' | 'monthly';
  metric: 'tickets_resolved' | 'response_time' | 'csat_score';
  target: number;
  current: number;
  startDate: string;
  endDate: string;
  achieved: boolean;
  achievedAt: string | null;
  progress: number;
  metadata?: Record<string, unknown>;
}

export interface AgentAchievement {
  id: string;
  userId: string;
  badgeType: string;
  earnedAt: string;
  metadata?: Record<string, unknown>;
}

export const dashboardApi = {
  /**
   * Get real-time dashboard metrics
   */
  async getRealTimeMetrics(): Promise<DashboardMetrics> {
    const response = await apiClient.get('/dashboard/real-time');
    return response.data;
  },

  /**
   * Get agent-specific metrics
   */
  async getAgentMetrics(userId: string): Promise<AgentMetrics> {
    const response = await apiClient.get(`/dashboard/agent/${userId}`);
    return response.data;
  },

  /**
   * Get dashboard configuration
   */
  async getDashboardConfig(): Promise<DashboardConfig> {
    const response = await apiClient.get('/dashboard/config');
    return response.data;
  },

  /**
   * Save dashboard configuration
   */
  async saveDashboardConfig(config: {
    layout?: Record<string, unknown>;
    widgets?: string[];
    theme?: string;
    settings?: Record<string, unknown>;
  }): Promise<DashboardConfig> {
    const response = await apiClient.put('/dashboard/config', config);
    return response.data;
  },

  /**
   * Get agent goals
   */
  async getAgentGoals(userId: string, type?: string): Promise<AgentGoal[]> {
    const response = await apiClient.get(`/agent-profiles/${userId}/goals`, {
      params: { type },
    });
    return response.data;
  },

  /**
   * Create agent goal
   */
  async createAgentGoal(
    userId: string,
    goal: {
      type: 'daily' | 'weekly' | 'monthly';
      metric: 'tickets_resolved' | 'response_time' | 'csat_score';
      target: number;
      startDate: string;
      endDate: string;
    },
  ): Promise<AgentGoal> {
    const response = await apiClient.post(`/agent-profiles/${userId}/goals`, goal);
    return response.data;
  },

  /**
   * Update goal progress
   */
  async updateGoalProgress(
    userId: string,
    goalId: string,
    current: number,
  ): Promise<AgentGoal> {
    const response = await apiClient.post(
      `/agent-profiles/${userId}/goals/${goalId}/progress`,
      { current },
    );
    return response.data;
  },

  /**
   * Get agent achievements
   */
  async getAgentAchievements(userId: string): Promise<AgentAchievement[]> {
    const response = await apiClient.get(`/agent-profiles/${userId}/achievements`);
    return response.data;
  },
};
