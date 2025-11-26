'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './use-auth';
import { ticketsApi } from '../api/tickets-client';

interface TicketFilters {
  status?: string[];
  priority?: string[];
  assignedAgentId?: string;
  customerId?: string;
  channelId?: string;
  teamId?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  overdue?: boolean;
  unassigned?: boolean;
  slaAtRisk?: boolean;
  search?: string;
}

interface TicketPagination {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface UseTicketsOptions {
  filters?: TicketFilters;
  pagination?: TicketPagination;
  autoRefresh?: boolean;
  refreshInterval?: number;
  semantic?: boolean;
}

interface TicketStats {
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
  averageResolutionTime: number;
  averageFirstResponseTime: number;
  customerSatisfactionScore: number;
  trendsData: Array<Record<string, unknown>>;
}

interface TicketLite {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  customerId?: string;
  assignedAgentId?: string | null;
  channelId?: string;
  teamId?: string;
  tags: string[];
  dueDate?: string | Date | null;
  createdAt?: string | Date;
  customer?: { firstName: string; lastName: string; email: string; company?: string };
  assignedAgent?: { firstName?: string; lastName?: string } | null;
  slaInstance?: { breachCount?: number } | null;
}

interface PaginatedTickets {
  data: TicketLite[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface SearchFacets {
  status: Record<string, number>;
  priority: Record<string, number>;
  tags: Record<string, number>;
}

export function useTickets(options: UseTicketsOptions = {}) {
  const { user } = useAuth();
  const role = (user?.role ?? undefined) as 'admin' | 'agent' | undefined;
  const capabilities = {
    canViewStats: role === 'admin' || role === 'agent',
    canDelete: role === 'admin',
    canAutoAssign: role === 'admin',
    canAssign: role === 'admin' || role === 'agent',
    canResolve: role === 'admin' || role === 'agent',
    canAddNote: role === 'admin' || role === 'agent',
  };
  const [tickets, setTickets] = useState<PaginatedTickets | null>(null);
  const [stats, setStats] = useState<TicketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [facets, setFacets] = useState<SearchFacets | null>(null);

  const {
    filters = {},
    pagination = { page: 1, limit: 20, sortBy: 'createdAt', sortOrder: 'desc' },
    autoRefresh = false,
    refreshInterval = 30000,
    semantic = false,
  } = options;

  // If agent and no assignedAgentId/unassigned provided, default to own queue
  const effectiveFilters: TicketFilters = useMemo(() => {
    const base = { ...filters } as TicketFilters
    if (role === 'agent' && !base.assignedAgentId && !base.unassigned) {
      base.assignedAgentId = (user as any)?.id as string | undefined
    }
    return base
  }, [filters, role, user])

  // Minimal fallback data for when API is unavailable
  const mockTickets = useMemo<TicketLite[]>(() => [], []);

  const mockStats = useMemo<TicketStats>(() => ({
    total: 0,
    open: 0,
    inProgress: 0,
    waiting: 0,
    resolved: 0,
    closed: 0,
    overdue: 0,
    unassigned: 0,
    slaAtRisk: 0,
    activeAgents: 0,
    weekTrendPct: 0,
    averageResolutionTime: 0,
    averageFirstResponseTime: 0,
    customerSatisfactionScore: 0,
    trendsData: []
  }), []);

  const statsLoadedRef = useRef<boolean>(false)

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try real API
      let filteredTickets: TicketLite[] | null = null;
      try {
        const response = await ticketsApi.advancedSearch({
          ...effectiveFilters,
          q: (filters as { search?: string }).search,
          page: pagination.page,
          limit: pagination.limit,
          sortBy: pagination.sortBy,
          sortOrder: pagination.sortOrder,
          semantic,
        } as Record<string, unknown>);
        if (response && Array.isArray(response.data)) {
          setTickets({
            data: response.data as TicketLite[],
            total: response.total ?? (response.data as TicketLite[]).length,
            page: (response.page ?? pagination.page) || 1,
            limit: (response.limit ?? pagination.limit) || 20,
            totalPages: Math.ceil((response.total ?? response.data.length) / ((response.limit ?? pagination.limit) || 20)),
            hasNext: ((response.page ?? 1) * (response.limit ?? 20)) < (response.total ?? 0),
            hasPrev: (response.page ?? 1) > 1,
          });
          setFacets(response.facets || null);
          // Fetch stats only once on first load to avoid loops; subsequent refreshes every N seconds already handled by auto-refresh caller
          try {
            if (!statsLoadedRef.current) {
              if (capabilities.canViewStats) {
                const s = await ticketsApi.stats();
                setStats(s as TicketStats);
              } else {
                setStats(mockStats);
              }
              statsLoadedRef.current = true
            }
          } catch {
            setStats(mockStats);
            statsLoadedRef.current = true
          }
          setLoading(false);
          return;
        }
      } catch (apiErr) {
        const status = (apiErr as any)?.response?.status as number | undefined;
        const message = status === 401
          ? 'You are not authenticated. Please sign in.'
          : ((apiErr as Error)?.message || 'Failed to fetch tickets');
        setError(message);
        setLoading(false);
        return; // Stop here on API error, don't show empty mock silently
      }

      if (!filteredTickets) {
        // Apply filters to mock data
        filteredTickets = [...mockTickets];
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        filteredTickets = filteredTickets.filter(ticket => 
          (filters.status as string[]).includes(ticket.status)
        );
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        filteredTickets = filteredTickets.filter(ticket => 
          (filters.priority as string[]).includes(ticket.priority)
        );
      }

      // Assigned agent filter
      if (filters.assignedAgentId) {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.assignedAgentId === filters.assignedAgentId
        );
      }

      // Customer filter
      if (filters.customerId) {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.customerId === filters.customerId
        );
      }

      // Channel filter
      if (filters.channelId) {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.channelId === filters.channelId
        );
      }

      // Team filter
      if (filters.teamId) {
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.teamId === filters.teamId
        );
      }

      // Tags filter
      if (filters.tags && filters.tags.length > 0) {
        filteredTickets = filteredTickets.filter(ticket => 
          (filters.tags as string[]).some(tag => (ticket.tags || []).includes(tag))
        );
      }

      // Unassigned filter
      if (filters.unassigned) {
        filteredTickets = filteredTickets.filter(ticket => 
          !ticket.assignedAgentId
        );
      }

      // Overdue filter
      if (filters.overdue) {
        const now = new Date();
        filteredTickets = filteredTickets.filter(ticket => 
          ticket.dueDate && 
          new Date(ticket.dueDate) < now && 
          !['resolved', 'closed'].includes(ticket.status)
        );
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredTickets = filteredTickets.filter(ticket => 
          (ticket.subject || '').toLowerCase().includes(searchLower) ||
          (ticket.description || '').toLowerCase().includes(searchLower) ||
          (ticket.customer?.firstName || '').toLowerCase().includes(searchLower) ||
          (ticket.customer?.lastName || '').toLowerCase().includes(searchLower) ||
          (ticket.customer?.email || '').toLowerCase().includes(searchLower) ||
          (ticket.customer?.company || '').toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting with null-safe comparisons
      filteredTickets.sort((a, b) => {
        const sortKey = (pagination.sortBy as keyof TicketLite) || 'createdAt';
        const aValue = (a?.[sortKey] ?? null) as unknown as string | number | Date | null;
        const bValue = (b?.[sortKey] ?? null) as unknown as string | number | Date | null;

        const normalize = (v: unknown) => {
          if (v === null || v === undefined) return null as number | string | null;
          if (typeof v === 'string') {
            const date = new Date(v);
            return !isNaN(date.getTime()) ? date.getTime() : v.toLowerCase();
          }
          if (v instanceof Date) return v.getTime();
          return v as number | string;
        };

        const av = normalize(aValue);
        const bv = normalize(bValue);

        if (av === bv) return 0;
        if (av === null) return 1; // nulls last
        if (bv === null) return -1;

        const asc = pagination.sortOrder === 'asc';
        // numeric compare if both numbers
        if (typeof av === 'number' && typeof bv === 'number') {
          return asc ? av - bv : bv - av;
        }
        // fallback to string compare
        const result = String(av).localeCompare(String(bv));
        return asc ? result : -result;
      });

      // Apply pagination
      const startIndex = ((pagination.page || 1) - 1) * (pagination.limit || 20);
      const endIndex = startIndex + (pagination.limit || 20);
      const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

      const result: PaginatedTickets = {
        data: paginatedTickets,
        total: filteredTickets.length,
        page: pagination.page || 1,
        limit: pagination.limit || 20,
        totalPages: Math.ceil(filteredTickets.length / (pagination.limit || 20)),
        hasNext: endIndex < filteredTickets.length,
        hasPrev: (pagination.page || 1) > 1
      };

      setTickets(result);
      try {
        if (!statsLoadedRef.current) {
          if (capabilities.canViewStats) {
            const s = await ticketsApi.stats();
            setStats(s as TicketStats);
          } else {
            setStats(mockStats);
          }
          statsLoadedRef.current = true
        }
      } catch {
        setStats(mockStats);
        statsLoadedRef.current = true
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [effectiveFilters, filters, pagination.page, pagination.limit, pagination.sortBy, pagination.sortOrder, semantic, capabilities.canViewStats, mockTickets, mockStats]);

  const refetch = useCallback(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = useCallback(async (ticketData: Record<string, unknown>) => {
    try {
      await ticketsApi.create(ticketData);
      refetch();
    } catch {
      throw new Error('Failed to create ticket');
    }
  }, [refetch]);

  const updateTicket = useCallback(async (ticketId: string, updates: Record<string, unknown>) => {
    try {
      await ticketsApi.update(ticketId, updates);
      refetch();
    } catch {
      throw new Error('Failed to update ticket');
    }
  }, [refetch]);

  const deleteTicket = useCallback(async (ticketId: string) => {
    try {
      await ticketsApi.remove(ticketId);
      refetch();
    } catch {
      throw new Error('Failed to delete ticket');
    }
  }, [refetch]);

  const bulkAction = useCallback(async (actionData: Record<string, unknown>) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('Performing bulk action:', actionData);
      refetch();
    } catch {
      throw new Error('Failed to perform bulk action');
    }
  }, [refetch]);

  const assignTicket = useCallback(async (ticketId: string, agentId: string) => {
    try {
      await ticketsApi.assign(ticketId, agentId);
      refetch();
    } catch {
      throw new Error('Failed to assign ticket');
    }
  }, [refetch]);

  const updateStatus = useCallback(async (ticketId: string, status: string, reason?: string) => {
    try {
      if (status === 'resolved') {
        await ticketsApi.resolve(ticketId);
      } else if (status === 'open') {
        await ticketsApi.reopen(ticketId);
      } else {
        await ticketsApi.update(ticketId, { status, reason });
      }
      refetch();
    } catch {
      throw new Error('Failed to update ticket status');
    }
  }, [refetch]);

  const updatePriority = useCallback(async (ticketId: string, priority: string, reason?: string) => {
    try {
      await ticketsApi.update(ticketId, { priority, reason });
      refetch();
    } catch {
      throw new Error('Failed to update ticket priority');
    }
  }, [refetch]);

  const autoAssign = useCallback(async (ticketId: string) => {
    await ticketsApi.autoAssign(ticketId);
    refetch();
  }, [refetch]);

  const addNote = useCallback(async (ticketId: string, payload: { content: string; userId: string; tenantId: string; isPrivate?: boolean }) => {
    await ticketsApi.addNote(ticketId, payload);
    refetch();
  }, [refetch]);

  const updateTags = useCallback(async (ticketId: string, payload: { add?: string[]; remove?: string[]; tenantId: string }) => {
    await ticketsApi.updateTags(ticketId, payload);
    refetch();
  }, [refetch]);

  // Initial fetch
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // Auto-refresh
  useEffect(() => {
    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchTickets, refreshInterval);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [autoRefresh, refreshInterval, fetchTickets]);

  return {
    tickets,
    stats,
    facets,
    loading,
    error,
    refetch,
    createTicket,
    updateTicket,
    deleteTicket,
    bulkAction,
    assignTicket,
    updateStatus,
    updatePriority,
    autoAssign,
    addNote,
    updateTags,
    capabilities
  };
}