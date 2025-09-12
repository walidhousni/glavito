import api from './config';
import type { Ticket } from '@glavito/shared-types';

export interface TicketStats {
  total: number;
  open: number;
  inProgress: number;
  waiting: number;
  resolved: number;
  closed: number;
  overdue: number;
  unassigned: number;
  slaAtRisk: number;
  averageResolutionTime: number; // minutes
  averageFirstResponseTime: number; // minutes
  customerSatisfactionScore: number; // 0..5 or 0..100 depending backend (we normalize client-side)
  trendsData: Array<{ status: string; _count: { status: number } }>;
  statusCounts?: Record<string, number>;
  priorityCounts?: Record<string, number>;
  satisfactionBreakdown?: {
    totalResponses: number;
    positivePct: number;
    negativePct: number;
    neutralPct: number;
  };
}

export interface Pagination {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

 

export interface TicketQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  status?: string[];
  priority?: string[];
  assignedAgentId?: string;
  customerId?: string;
  channelId?: string;
  teamId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  overdue?: boolean;
  unassigned?: boolean;
  slaAtRisk?: boolean;
}

export class TicketsApiClient {
  protected basePath: string;
  constructor(basePath = '/tickets') {
    this.basePath = basePath;
  }

  async list(params: TicketQuery = {}) {
    const cleanedParams = Object.entries(params as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      if (typeof value === 'string' && value.trim() === '') return acc;
      if (Array.isArray(value) && value.length === 0) return acc;
      if (typeof value === 'boolean' && value === false) return acc;
      acc[key] = value;
      return acc;
    }, {});

    const res = await api.get(this.basePath, { params: cleanedParams });
    return (res as any)?.data?.data ?? res.data;
  }

  async stats(tenantId?: string) {
    const res = await api.get(`${this.basePath}/stats`, { params: { tenantId } });
    return (res as any)?.data?.data ?? res.data;
  }

  async getStats(tenantId?: string): Promise<TicketStats> {
    const res = await api.get(`${this.basePath}/stats`, { params: { tenantId } });
    const payload = (res as any)?.data?.data ?? res.data;
    return payload as TicketStats;
  }

  async advancedSearch(params: TicketQuery & { q?: string; semantic?: boolean; page?: number; limit?: number }) {
    const { q, semantic, ...rest } = params || {};
    const cleanedParams = Object.entries(rest as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, value]) => {
      if (value === undefined || value === null) return acc;
      if (typeof value === 'string' && value.trim() === '') return acc;
      if (Array.isArray(value) && value.length === 0) return acc;
      if (typeof value === 'boolean' && value === false) return acc;
      acc[key] = value;
      return acc;
    }, {});
    const res = await api.get(`${this.basePath}/search/advanced`, {
      params: { q, semantic, ...cleanedParams },
    });
    return ((res as any)?.data?.data ?? res.data) as { data: unknown[]; total: number; page: number; limit: number; facets: { status: Record<string, number>; priority: Record<string, number>; tags: Record<string, number> } };
  }

  async suggest(q: string) {
    const res = await api.get(`${this.basePath}/search/suggest`, { params: { q } });
    return ((res as any)?.data?.data ?? res.data) as { subjects: string[]; tags: string[]; customers: Array<{ id: string; name: string; email?: string; company?: string }> };
  }

  async listSavedSearches() {
    const res = await api.get(`${this.basePath}/search/saved`);
    return ((res as any)?.data?.data ?? res.data) as Array<{ id: string; name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean; updatedAt: string }>;
  }

  async createSavedSearch(payload: { name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }) {
    const res = await api.post(`${this.basePath}/search/saved`, payload);
    return (res as any)?.data?.data ?? res.data;
  }

  async updateSavedSearch(id: string, payload: { name?: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }) {
    const res = await api.patch(`${this.basePath}/search/saved/${id}`, payload);
    return (res as any)?.data?.data ?? res.data;
  }

  async deleteSavedSearch(id: string) {
    const res = await api.delete(`${this.basePath}/search/saved/${id}`);
    return (res as any)?.data?.data ?? res.data;
  }

  async get(id: string) {
    const res = await api.get(`${this.basePath}/${id}`);
    return (res as any)?.data?.data ?? res.data;
  }

  async create(payload: Record<string, unknown>) {
    const res = await api.post(this.basePath, payload);
    return (res as any)?.data?.data ?? res.data;
  }

  async update(id: string, payload: Record<string, unknown>) {
    const res = await api.patch(`${this.basePath}/${id}`, payload);
    return (res as any)?.data?.data ?? res.data;
  }

  async assign(id: string, agentId: string) {
    const res = await api.patch(`${this.basePath}/${id}/assign`, { agentId });
    return (res as any)?.data?.data ?? res.data;
  }

  async resolve(id: string) {
    const res = await api.patch(`${this.basePath}/${id}/resolve`);
    return (res as any)?.data?.data ?? res.data;
  }

  async snooze(id: string, payload: { until: string; reason?: string }) {
    const res = await api.patch(`${this.basePath}/${id}/snooze`, payload);
    return (res as any)?.data?.data ?? res.data;
  }

  async reopen(id: string) {
    const res = await api.patch(`${this.basePath}/${id}/reopen`);
    return (res as any)?.data?.data ?? res.data;
  }

  async autoAssign(id: string) {
    const res = await api.patch(`${this.basePath}/${id}/assign/auto`);
    return (res as any)?.data?.data ?? res.data;
  }

  async remove(id: string) {
    const res = await api.delete(`${this.basePath}/${id}`);
    return (res as any)?.data?.data ?? res.data;
  }

  async addNote(id: string, payload: { content: string; userId: string; tenantId: string; isPrivate?: boolean }) {
    const res = await api.post(`${this.basePath}/${id}/notes`, payload);
    return (res as any)?.data?.data ?? res.data;
  }

  async listNotes(id: string, limit = 50) {
    const res = await api.get(`${this.basePath}/${id}/notes`, { params: { limit } });
    return (res as any)?.data?.data ?? res.data;
  }

  async listWatchers(id: string) {
    const res = await api.get(`${this.basePath}/${id}/watchers`);
    return (res as any)?.data?.data ?? res.data;
  }

  async addWatcher(id: string, userId?: string) {
    const res = await api.post(`${this.basePath}/${id}/watchers`, userId ? { userId } : {});
    return (res as any)?.data?.data ?? res.data;
  }

  async removeWatcher(id: string, userId: string) {
    const res = await api.delete(`${this.basePath}/${id}/watchers/${userId}`);
    return (res as any)?.data?.data ?? res.data;
  }

  async updateTags(id: string, payload: { add?: string[]; remove?: string[]; tenantId: string }) {
    const res = await api.patch(`${this.basePath}/${id}/tags`, payload);
    return (res as any)?.data?.data ?? res.data;
  }

  async timeline(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/timeline`, { params: { tenantId } });
    return (res as any)?.data?.data ?? res.data;
  }

  async similar(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/similar`, { params: { tenantId } });
    return (res as any)?.data?.data ?? res.data;
  }

  async export(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/export`, { params: { tenantId } });
    return (res as any)?.data?.data ?? res.data;
  }

  async aiAnalysis(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/ai`, { params: { tenantId } });
    return (res as any)?.data?.data ?? res.data;
  }

  async analyzeNow(id: string) {
    const res = await api.post(`${this.basePath}/${id}/ai/analyze`);
    return (res as any)?.data?.data ?? res.data;
  }
}

export class TicketsConvenienceApi extends TicketsApiClient {
  async listRecent(limit = 5): Promise<Ticket[]> {
    const res = await api.get(`${this.basePath}`, {
      params: { page: 1, limit, sortBy: 'createdAt', sortOrder: 'desc' },
    });
    const data = (res as any)?.data?.data ?? res.data;
    return (data ?? []) as Ticket[];
  }
}

export const ticketsApi = new TicketsConvenienceApi('/tickets');


