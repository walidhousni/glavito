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
  activeAgents?: number;
  weekTrendPct?: number;
  averageResolutionTime: number; // minutes
  averageFirstResponseTime: number; // minutes
  customerSatisfactionScore: number; // 0..5 or 0..100 depending backend (we normalize client-side)
  trendsData: Array<{ status: string; _count: { status: number } }> | Array<{ date: string; total: number; resolved: number; avgFirstResponseMinutes: number }>;
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

export type ActivityFeedItem = {
  id: string;
  type: 'ticket' | 'agent' | 'customer' | 'system' | 'message' | 'sla';
  title: string;
  description?: string;
  user: string;
  time: string; // ISO
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  metadata?: Record<string, unknown>;
};

export class TicketsApiClient {
  protected basePath: string;
  constructor(basePath = '/tickets') {
    this.basePath = basePath;
  }

  // Safely unwrap API responses supporting both { data } and { data: { data } } envelopes
  private unwrap<T>(res: unknown): T {
    const r = res as Record<string, unknown> | undefined;
    if (r && typeof r === 'object') {
      if (typeof (r as { data?: unknown }).data !== 'undefined') {
        const inner = (r as { data?: unknown }).data as Record<string, unknown> | undefined;
        if (inner && typeof inner === 'object' && typeof (inner as { data?: unknown }).data !== 'undefined') {
          return ((inner as { data?: unknown }).data) as T;
        }
        return inner as unknown as T;
      }
    }
    return r as unknown as T;
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
    return this.unwrap(res);
  }

  async getStats(params?: { tenantId?: string; range?: '7d' | '30d' | '90d'; days?: number }): Promise<TicketStats> {
    const qp: Record<string, unknown> = {};
    if (params?.tenantId) qp.tenantId = params.tenantId;
    if (params?.range) qp.range = params.range;
    if (params?.days != null) qp.days = params.days;
    const res = await api.get(`${this.basePath}/stats`, { params: qp });
    return this.unwrap<TicketStats>(res);
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
    return this.unwrap(res) as { data: unknown[]; total: number; page: number; limit: number; facets: { status: Record<string, number>; priority: Record<string, number>; tags: Record<string, number> } };
  }

  async suggest(q: string) {
    const res = await api.get(`${this.basePath}/search/suggest`, { params: { q } });
    return ((res as any)?.data?.data ?? res.data) as { subjects: string[]; tags: string[]; customers: Array<{ id: string; name: string; email?: string; company?: string }> };
  }

  // Activity feed and agent stats
  async activityFeed(options?: { limit?: number; agentId?: string }): Promise<ActivityFeedItem[]> {
    const res = await api.get(`${this.basePath}/feed`, { params: { limit: options?.limit, agentId: options?.agentId } });
    const payload = this.unwrap<ActivityFeedItem[] | { data: ActivityFeedItem[] }>(res);
    return (Array.isArray(payload) ? payload : (payload as { data?: ActivityFeedItem[] })?.data) ?? [];
  }

  async myStats(): Promise<{ assigned: number; open: number; waiting: number; urgent: number; resolvedToday: number }> {
    const res = await api.get(`${this.basePath}/agent/my-stats`);
    return this.unwrap(res) as { assigned: number; open: number; waiting: number; urgent: number; resolvedToday: number };
  }

  async listSavedSearches() {
    const res = await api.get(`${this.basePath}/search/saved`);
    return this.unwrap(res) as Array<{ id: string; name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean; updatedAt: string }>;
  }

  async createSavedSearch(payload: { name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }) {
    const res = await api.post(`${this.basePath}/search/saved`, payload);
    return this.unwrap(res);
  }

  async updateSavedSearch(id: string, payload: { name?: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }) {
    const res = await api.patch(`${this.basePath}/search/saved/${id}`, payload);
    return this.unwrap(res);
  }

  async deleteSavedSearch(id: string) {
    const res = await api.delete(`${this.basePath}/search/saved/${id}`);
    return this.unwrap(res);
  }

  async get(id: string) {
    const res = await api.get(`${this.basePath}/${id}`);
    return this.unwrap(res);
  }

  async create(payload: Record<string, unknown>) {
    const res = await api.post(this.basePath, payload);
    return this.unwrap(res);
  }

  async update(id: string, payload: Record<string, unknown>) {
    const res = await api.patch(`${this.basePath}/${id}`, payload);
    return this.unwrap(res);
  }

  async assign(id: string, agentId: string) {
    const res = await api.patch(`${this.basePath}/${id}/assign`, { agentId });
    return this.unwrap(res);
  }

  async resolve(id: string) {
    const res = await api.patch(`${this.basePath}/${id}/resolve`);
    return this.unwrap(res);
  }

  async snooze(id: string, payload: { until: string; reason?: string }) {
    const res = await api.patch(`${this.basePath}/${id}/snooze`, payload);
    return this.unwrap(res);
  }

  async reopen(id: string) {
    const res = await api.patch(`${this.basePath}/${id}/reopen`);
    return this.unwrap(res);
  }

  async autoAssign(id: string) {
    const res = await api.patch(`${this.basePath}/${id}/assign/auto`);
    return this.unwrap(res);
  }

  async remove(id: string) {
    const res = await api.delete(`${this.basePath}/${id}`);
    return this.unwrap(res);
  }

  async addNote(id: string, payload: { content: string; userId: string; tenantId: string; isPrivate?: boolean }) {
    const res = await api.post(`${this.basePath}/${id}/notes`, payload);
    return this.unwrap(res);
  }

  async listNotes(id: string, limit = 50) {
    const res = await api.get(`${this.basePath}/${id}/notes`, { params: { limit } });
    return this.unwrap(res);
  }

  async listWatchers(id: string) {
    const res = await api.get(`${this.basePath}/${id}/watchers`);
    return this.unwrap(res);
  }

  async addWatcher(id: string, userId?: string) {
    const res = await api.post(`${this.basePath}/${id}/watchers`, userId ? { userId } : {});
    return this.unwrap(res);
  }

  async removeWatcher(id: string, userId: string) {
    const res = await api.delete(`${this.basePath}/${id}/watchers/${userId}`);
    return this.unwrap(res);
  }

  async updateTags(id: string, payload: { add?: string[]; remove?: string[]; tenantId: string }) {
    const res = await api.patch(`${this.basePath}/${id}/tags`, payload);
    return this.unwrap(res);
  }

  async timeline(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/timeline`, { params: { tenantId } });
    return this.unwrap(res);
  }

  async similar(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/similar`, { params: { tenantId } });
    return this.unwrap(res);
  }

  async export(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/export`, { params: { tenantId } });
    return this.unwrap(res);
  }

  async aiAnalysis(id: string, tenantId: string) {
    const res = await api.get(`${this.basePath}/${id}/ai`, { params: { tenantId } });
    return this.unwrap(res);
  }

  async analyzeNow(id: string) {
    const res = await api.post(`${this.basePath}/${id}/ai/analyze`);
    return this.unwrap(res);
  }

  async getRoutingSuggestions(id: string, limit = 5) {
    const res = await api.get(`${this.basePath}/${id}/routing/suggestions`, {
      params: { limit },
    });
    return this.unwrap(res) as Array<{
      agentId: string;
      score: number;
      agent: {
        id: string;
        firstName: string | null;
        lastName: string | null;
        email: string;
        avatar: string | null;
        skills: string[];
        languages: string[];
      } | null;
      reasoning: {
        capacityScore: number;
        skillMatch: number;
        languageMatch: number;
        teamAlign: number;
        performanceScore: number;
        matchedSkills: string[];
        missingSkills: string[];
        currentLoad: number;
        maxCapacity: number;
        languageMatchDetails?: string;
        teamMatchDetails?: string;
      };
    }>;
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


