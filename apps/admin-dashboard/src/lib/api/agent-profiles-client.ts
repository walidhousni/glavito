import api from './config';

export type AgentAvailability = 'available' | 'busy' | 'away' | 'offline';

export interface AgentProfileInfo {
  id: string;
  userId: string;
  displayName?: string;
  bio?: string;
  skills?: string[];
  languages?: string[];
  timezone?: string;
  availability: AgentAvailability;
  maxConcurrentTickets?: number;
  autoAssign?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpdateAgentAvailabilityRequest {
  availability: AgentAvailability;
  message?: string;
  autoReturn?: string; // ISO datetime
}

function unwrap<T>(res: unknown): T {
  const r = res as Record<string, unknown> | undefined;
  if (r && typeof r === 'object') {
    const outer = (r as { data?: unknown }).data as Record<string, unknown> | undefined;
    if (outer && typeof outer === 'object') {
      const inner = (outer as { data?: unknown }).data;
      return (inner !== undefined ? inner : outer) as unknown as T;
    }
  }
  return r as unknown as T;
}

class AgentProfilesApi {
  protected basePath: string;
  constructor(basePath = '/agent-profiles') {
    this.basePath = basePath;
  }

  async get(userId: string): Promise<AgentProfileInfo> {
    const res = await api.get(`${this.basePath}/${userId}`);
    return unwrap<AgentProfileInfo>(res);
  }

  async updateAvailability(userId: string, payload: UpdateAgentAvailabilityRequest): Promise<{ success: boolean; message?: string }> {
    const res = await api.put(`${this.basePath}/${userId}/availability`, payload);
    return unwrap<{ success: boolean; message?: string }>(res);
  }
}

export const agentProfilesApi = new AgentProfilesApi('/agent-profiles');


