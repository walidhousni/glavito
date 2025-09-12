import { api } from './config';

type ApiEnvelope<T> = { data: T } | T;

function unwrap<T>(payload: ApiEnvelope<T> | null | undefined): T | null {
  if (payload == null) return null;
  if (typeof payload === 'object' && payload !== null && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export interface Team {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  settings: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  members: TeamMember[];
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'member' | 'lead' | 'admin';
  permissions: string[];
  skills: string[];
  availability?: Record<string, any>;
  isActive: boolean;
  joinedAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    status: string;
  };
}

export interface AgentProfile {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    status: string;
  };
  displayName?: string;
  bio?: string;
  skills: string[];
  languages: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  availability: 'available' | 'busy' | 'away' | 'offline';
  maxConcurrentTickets: number;
  autoAssign: boolean;
  notificationSettings?: Record<string, any>;
  performanceMetrics: {
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
    responseTime: number;
    activeTickets: number;
  };
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface CreateTeamRequest {
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  settings?: Record<string, any>;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
  settings?: Record<string, any>;
}

export interface AddTeamMemberRequest {
  userId: string;
  role?: 'member' | 'lead' | 'admin';
  permissions?: string[];
  skills?: string[];
  availability?: Record<string, any>;
}

export interface UpdateTeamMemberRequest {
  role?: 'member' | 'lead' | 'admin';
  permissions?: string[];
  skills?: string[];
  availability?: Record<string, any>;
  isActive?: boolean;
}

export interface UpdateAgentProfileRequest {
  skills?: string[];
  languages?: string[];
  maxConcurrentTickets?: number;
  availability?: {
    status?: 'available' | 'busy' | 'away' | 'offline';
    workingHours?: {
      timezone?: string;
      schedule?: Record<string, { start: string; end: string; }>;
    };
    autoAssignment?: boolean;
  };
  preferences?: Record<string, any>;
}

export interface CreateAgentProfileRequest {
  userId: string;
  displayName?: string;
  bio?: string;
  skills?: string[];
  languages?: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  maxConcurrentTickets?: number;
  autoAssign?: boolean;
  notificationSettings?: Record<string, any>;
}

export interface AgentAvailabilityRequest {
  availability: 'available' | 'busy' | 'away' | 'offline';
  message?: string;
  autoReturn?: string | Date;
}

export interface AgentPerformanceMetrics {
  averageResponseTime: number;
  resolutionRate: number;
  customerSatisfaction: number;
  ticketsResolved: number;
  ticketsAssigned: number;
  period: {
    start: string;
    end: string;
  };
  trends: {
    responseTime: Array<{ date: string; value: number; }>;
    resolutionRate: Array<{ date: string; value: number; }>;
    satisfaction: Array<{ date: string; value: number; }>;
  };
}

// Team API
export const teamApi = {
  // Get all teams
  getTeams: async (): Promise<Team[]> => {
    const response = await api.get('/teams', { params: { includeMembers: true } });
    return unwrap<Team[]>(response.data) ?? [];
  },

  // Get team by ID
  getTeam: async (teamId: string): Promise<Team> => {
    const response = await api.get(`/teams/${teamId}`);
    return unwrap<Team>(response.data)!;
  },

  // Create team
  createTeam: async (data: CreateTeamRequest): Promise<Team> => {
    const response = await api.post('/teams', data);
    return unwrap<Team>(response.data)!;
  },

  // Update team
  updateTeam: async (teamId: string, data: UpdateTeamRequest): Promise<Team> => {
    const response = await api.put(`/teams/${teamId}`, data);
    return unwrap<Team>(response.data)!;
  },

  // Delete team
  deleteTeam: async (teamId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}`);
  },

  // Get team members
  getTeamMembers: async (teamId: string): Promise<TeamMember[]> => {
    const response = await api.get(`/teams/${teamId}/members`);
    return unwrap<TeamMember[]>(response.data) ?? [];
  },

  // Add team member
  addTeamMember: async (teamId: string, data: AddTeamMemberRequest): Promise<TeamMember> => {
    const response = await api.post(`/teams/${teamId}/members`, data);
    return unwrap<TeamMember>(response.data)!;
  },

  // Update team member
  updateTeamMember: async (teamId: string, memberId: string, data: UpdateTeamMemberRequest): Promise<TeamMember> => {
    const response = await api.put(`/teams/${teamId}/members/${memberId}`, data);
    return unwrap<TeamMember>(response.data)!;
  },

  // Remove team member
  removeTeamMember: async (teamId: string, memberId: string): Promise<void> => {
    await api.delete(`/teams/${teamId}/members/${memberId}`);
  },
};

// Agent API
export const agentApi = {
  // Get all agent profiles
  getAgentProfiles: async (): Promise<AgentProfile[]> => {
    const response = await api.get('/agent-profiles');
    return unwrap<AgentProfile[]>(response.data) ?? [];
  },

  // Create agent profile
  createAgentProfile: async (data: CreateAgentProfileRequest): Promise<AgentProfile> => {
    const response = await api.post('/agent-profiles', data);
    return unwrap<AgentProfile>(response.data)!;
  },

  // Get available agents for assignment
  getAvailableAgents: async (params?: {
    skills?: string[];
    languages?: string[];
    maxLoad?: boolean;
  }): Promise<AgentProfile[]> => {
    const response = await api.get('/agent-profiles/available', { params });
    return unwrap<AgentProfile[]>(response.data) ?? [];
  },

  // Get agent profile by user ID
  getAgentProfile: async (userId: string): Promise<AgentProfile> => {
    const response = await api.get(`/agent-profiles/${userId}`);
    return unwrap<AgentProfile>(response.data)!;
  },

  // Update agent profile
  updateAgentProfile: async (userId: string, data: UpdateAgentProfileRequest): Promise<AgentProfile> => {
    const response = await api.put(`/agent-profiles/${userId}`, data);
    return unwrap<AgentProfile>(response.data)!;
  },

  // Update agent availability
  updateAgentAvailability: async (userId: string, data: AgentAvailabilityRequest): Promise<void> => {
    await api.put(`/agent-profiles/${userId}/availability`, data);
  },

  // Get agent performance metrics
  getAgentPerformanceMetrics: async (userId: string): Promise<AgentPerformanceMetrics> => {
    const response = await api.get(`/agent-profiles/${userId}/performance`);
    return unwrap<AgentPerformanceMetrics>(response.data)!;
  },
  // Get top-performing agents for the tenant
  getTopAgents: async (params?: { limit?: number; from?: string; to?: string }): Promise<Array<{ userId: string; name: string; avatar?: string; ticketsResolved: number; ticketsAssigned: number; resolutionRate: number; averageFirstResponseMinutes: number }>> => {
    const response = await api.get('/agent-profiles/top/performers', { params });
    return unwrap<typeof response.data>(response.data) as any ?? [];
  },
};