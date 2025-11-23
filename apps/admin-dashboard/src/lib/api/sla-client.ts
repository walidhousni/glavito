import api from './config';

export interface SLAPolicy {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  priority: string;
  conditions: any;
  targets: any;
  businessHours: any;
  holidays: string[];
  escalationRules: any;
  notifications: any;
  metadata: any;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SLAInstance {
  id: string;
  slaId: string;
  ticketId: string;
  status: 'active' | 'completed' | 'breached' | 'paused';
  firstResponseDue: string;
  resolutionDue: string;
  firstResponseAt?: string;
  resolutionAt?: string;
  pausedDuration: number;
  breachCount: number;
  escalationLevel: number;
  notifications: any[];
  metadata: any;
  createdAt: string;
  updatedAt: string;
  slaPolicy?: SLAPolicy;
}

export interface SLAMetrics {
  totalSLAs: number;
  activeSLAs: number;
  breachedSLAs: number;
  averageFirstResponseTime: number;
  averageResolutionTime: number;
  firstResponseCompliance: number;
  resolutionCompliance: number;
  breachTrends: any[];
}

export interface SLAQueryParams {
  priority?: string;
  tenantId?: string;
  slaId?: string;
  status?: string;
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export const slaApi = {
  // Policies
  async getPolicies(params?: SLAQueryParams): Promise<SLAPolicy[]> {
    const { data } = await api.get('/sla/policies', { params });
    return (data as any)?.data ?? data;
  },

  async getPolicy(id: string): Promise<SLAPolicy> {
    const { data } = await api.get(`/sla/policies/${id}`);
    return (data as any)?.data ?? data;
  },

  async createPolicy(policyData: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const { data } = await api.post('/sla/policies', policyData);
    return (data as any)?.data ?? data;
  },

  async updatePolicy(id: string, policyData: Partial<SLAPolicy>): Promise<SLAPolicy> {
    const { data } = await api.patch(`/sla/policies/${id}`, policyData);
    return (data as any)?.data ?? data;
  },

  async deletePolicy(id: string): Promise<void> {
    await api.delete(`/sla/policies/${id}`);
  },

  // Instances
  async getInstances(params?: SLAQueryParams): Promise<SLAInstance[]> {
    const { data } = await api.get('/sla/instances', { params });
    return (data as any)?.data ?? data;
  },

  async getInstance(id: string): Promise<SLAInstance> {
    const { data } = await api.get(`/sla/instances/${id}`);
    return (data as any)?.data ?? data;
  },

  async getInstanceByTicket(ticketId: string): Promise<SLAInstance | null> {
    try {
      const { data } = await api.get(`/sla/ticket/${ticketId}/instance`);
      return (data as any)?.data ?? data;
    } catch {
      return null;
    }
  },

  async createInstance(slaId: string, ticketId: string): Promise<SLAInstance> {
    const { data } = await api.post('/sla/instances', { slaId, ticketId });
    return (data as any)?.data ?? data;
  },

  async updateInstance(id: string, updates: Partial<SLAInstance>): Promise<SLAInstance> {
    const { data } = await api.patch(`/sla/instances/${id}`, updates);
    return (data as any)?.data ?? data;
  },

  // Metrics
  async getMetrics(params?: SLAQueryParams): Promise<SLAMetrics> {
    const { data } = await api.get('/sla/metrics', { params });
    return (data as any)?.data ?? data;
  },

  async checkBreaches(): Promise<void> {
    await api.post('/sla/check-breaches');
  },

  // Events
  async handleTicketEvent(ticketId: string, event: { type: string; timestamp?: string; data?: any }): Promise<void> {
    await api.post(`/sla/events/ticket/${ticketId}`, event);
  },

  // Policy by ticket
  async getPolicyByTicket(ticketId: string): Promise<SLAPolicy | null> {
    try {
      const { data } = await api.get(`/sla/policies/ticket/${ticketId}`);
      return (data as any)?.data ?? data;
    } catch {
      return null;
    }
  }
};
