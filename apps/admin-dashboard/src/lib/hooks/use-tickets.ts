'use client';

import { useState, useEffect, useCallback } from 'react';
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
  averageResolutionTime: number;
  averageFirstResponseTime: number;
  customerSatisfactionScore: number;
  trendsData: any[];
}

interface PaginatedTickets {
  data: any[];
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
  const role: 'admin' | 'agent' | undefined = (user as any)?.role as any;
  const capabilities = {
    canViewStats: role === 'admin',
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

  // Mock data fallback for demonstration
  const mockTickets = [
    {
      id: '1',
      subject: 'Unable to access premium features after subscription upgrade',
      description: 'I upgraded my subscription to premium yesterday but I still cannot access the premium features.',
      status: 'in_progress',
      priority: 'high',
      customerId: '1',
      channelId: '1',
      assignedAgentId: '1',
      teamId: '1',
      tags: ['billing', 'premium', 'urgent'],
      createdAt: '2024-01-15T10:30:00Z',
      updatedAt: '2024-01-15T14:20:00Z',
      dueDate: '2024-01-17T17:00:00Z',
      customer: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@acme.com',
        company: 'Acme Corp'
      },
      channel: {
        id: '1',
        name: 'Email Support',
        type: 'email'
      },
      assignedAgent: {
        id: '1',
        firstName: 'Alice',
        lastName: 'Wilson',
        email: 'alice@company.com'
      },
      aiAnalysis: {
        classification: 'billing_issue',
        sentiment: 'frustrated',
        urgencyScore: 0.8
      },
      slaInstance: {
        status: 'active',
        breachCount: 0
      },
      _count: {
        conversations: 1,
        timelineEvents: 4
      }
    },
    {
      id: '2',
      subject: 'Integration API returning 500 errors',
      description: 'Our integration with your API started returning 500 errors this morning. This is affecting our production system.',
      status: 'open',
      priority: 'critical',
      customerId: '2',
      channelId: '2',
      assignedAgentId: null,
      teamId: '1',
      tags: ['api', 'integration', 'critical', 'production'],
      createdAt: '2024-01-15T09:15:00Z',
      updatedAt: '2024-01-15T09:15:00Z',
      dueDate: '2024-01-15T17:00:00Z',
      customer: {
        id: '2',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@techstart.com',
        company: 'TechStart Inc'
      },
      channel: {
        id: '2',
        name: 'WhatsApp Business',
        type: 'whatsapp'
      },
      assignedAgent: null,
      aiAnalysis: {
        classification: 'technical_issue',
        sentiment: 'urgent',
        urgencyScore: 0.95
      },
      slaInstance: {
        status: 'active',
        breachCount: 0
      },
      _count: {
        conversations: 0,
        timelineEvents: 1
      }
    },
    {
      id: '3',
      subject: 'Request for custom dashboard features',
      description: 'We would like to request some custom dashboard features for our team. Can we schedule a call to discuss?',
      status: 'waiting',
      priority: 'medium',
      customerId: '3',
      channelId: '3',
      assignedAgentId: '2',
      teamId: '2',
      tags: ['feature-request', 'dashboard', 'custom'],
      createdAt: '2024-01-14T16:45:00Z',
      updatedAt: '2024-01-15T11:30:00Z',
      dueDate: '2024-01-18T17:00:00Z',
      customer: {
        id: '3',
        firstName: 'Mike',
        lastName: 'Johnson',
        email: 'mike@global.com',
        company: 'Global Solutions'
      },
      channel: {
        id: '3',
        name: 'Instagram DM',
        type: 'instagram'
      },
      assignedAgent: {
        id: '2',
        firstName: 'Bob',
        lastName: 'Brown',
        email: 'bob@company.com'
      },
      aiAnalysis: {
        classification: 'feature_request',
        sentiment: 'positive',
        urgencyScore: 0.3
      },
      slaInstance: {
        status: 'active',
        breachCount: 0
      },
      _count: {
        conversations: 2,
        timelineEvents: 3
      }
    },
    {
      id: '4',
      subject: 'Billing discrepancy in last invoice',
      description: 'There seems to be a discrepancy in our last invoice. We were charged for features we did not use.',
      status: 'resolved',
      priority: 'high',
      customerId: '1',
      channelId: '1',
      assignedAgentId: '3',
      teamId: '3',
      tags: ['billing', 'invoice', 'discrepancy'],
      createdAt: '2024-01-13T14:20:00Z',
      updatedAt: '2024-01-14T10:15:00Z',
      resolvedAt: '2024-01-14T10:15:00Z',
      dueDate: '2024-01-16T17:00:00Z',
      customer: {
        id: '1',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@acme.com',
        company: 'Acme Corp'
      },
      channel: {
        id: '1',
        name: 'Email Support',
        type: 'email'
      },
      assignedAgent: {
        id: '3',
        firstName: 'Carol',
        lastName: 'Davis',
        email: 'carol@company.com'
      },
      aiAnalysis: {
        classification: 'billing_issue',
        sentiment: 'concerned',
        urgencyScore: 0.7
      },
      slaInstance: {
        status: 'completed',
        breachCount: 0
      },
      _count: {
        conversations: 3,
        timelineEvents: 6
      }
    }
  ];

  const mockStats: TicketStats = {
    total: 4,
    open: 1,
    inProgress: 1,
    waiting: 1,
    resolved: 1,
    closed: 0,
    overdue: 0,
    unassigned: 1,
    slaAtRisk: 0,
    averageResolutionTime: 1440, // 24 hours in minutes
    averageFirstResponseTime: 120, // 2 hours in minutes
    customerSatisfactionScore: 4.2,
    trendsData: [
      { status: 'open', _count: { status: 1 } },
      { status: 'in_progress', _count: { status: 1 } },
      { status: 'waiting', _count: { status: 1 } },
      { status: 'resolved', _count: { status: 1 } }
    ]
  };

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Try real API
      let filteredTickets: any[] | null = null;
      try {
        const response = await ticketsApi.advancedSearch({
          ...filters,
          q: (filters as any).search,
          page: pagination.page,
          limit: pagination.limit,
          sortBy: pagination.sortBy,
          sortOrder: pagination.sortOrder,
          semantic,
        } as any);
        if (response && Array.isArray(response.data)) {
          setTickets({
            data: response.data,
            total: response.total ?? response.data.length,
            page: (response.page ?? pagination.page) || 1,
            limit: (response.limit ?? pagination.limit) || 20,
            totalPages: Math.ceil((response.total ?? response.data.length) / ((response.limit ?? pagination.limit) || 20)),
            hasNext: ((response.page ?? 1) * (response.limit ?? 20)) < (response.total ?? 0),
            hasPrev: (response.page ?? 1) > 1,
          });
          setFacets(response.facets || null);
          try {
            const s = await ticketsApi.stats();
            setStats(s);
          } catch {
            setStats(mockStats);
          }
          setLoading(false);
          return;
        }
      } catch {
        // fallback to mock
      }

      if (!filteredTickets) {
        // Apply filters to mock data
        filteredTickets = [...mockTickets];
      }

      // Status filter
      if (filters.status && filters.status.length > 0) {
        filteredTickets = filteredTickets.filter(ticket => 
          filters.status!.includes(ticket.status)
        );
      }

      // Priority filter
      if (filters.priority && filters.priority.length > 0) {
        filteredTickets = filteredTickets.filter(ticket => 
          filters.priority!.includes(ticket.priority)
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
          filters.tags!.some(tag => ticket.tags.includes(tag))
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
          ticket.subject.toLowerCase().includes(searchLower) ||
          ticket.description.toLowerCase().includes(searchLower) ||
          ticket.customer.firstName.toLowerCase().includes(searchLower) ||
          ticket.customer.lastName.toLowerCase().includes(searchLower) ||
          ticket.customer.email.toLowerCase().includes(searchLower) ||
          ticket.customer.company.toLowerCase().includes(searchLower)
        );
      }

      // Apply sorting with null-safe comparisons
      filteredTickets.sort((a, b) => {
        const sortKey = (pagination.sortBy as keyof typeof a) || 'createdAt';
        const aValue = (a?.[sortKey] ?? null) as unknown as string | number | Date | null;
        const bValue = (b?.[sortKey] ?? null) as unknown as string | number | Date | null;

        const normalize = (v: any) => {
          if (v === null || v === undefined) return null;
          if (typeof v === 'string') {
            // Try parse ISO date strings; fallback to string
            const date = new Date(v);
            return !isNaN(date.getTime()) ? date.getTime() : v.toLowerCase();
          }
          if (v instanceof Date) return v.getTime();
          return v;
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
      if (!stats) {
        try {
          const s = await ticketsApi.stats();
          setStats(s);
        } catch {
          setStats(mockStats);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit, pagination.sortBy, pagination.sortOrder, semantic]);

  const refetch = useCallback(() => {
    fetchTickets();
  }, [fetchTickets]);

  const createTicket = useCallback(async (ticketData: any) => {
    try {
      await ticketsApi.create(ticketData);
      
      // Refresh tickets after creation
      refetch();
    } catch (err) {
      throw new Error('Failed to create ticket');
    }
  }, [refetch]);

  const updateTicket = useCallback(async (ticketId: string, updates: any) => {
    try {
      await ticketsApi.update(ticketId, updates);
      
      // Refresh tickets after update
      refetch();
    } catch (err) {
      throw new Error('Failed to update ticket');
    }
  }, [refetch]);

  const deleteTicket = useCallback(async (ticketId: string) => {
    try {
      await ticketsApi.remove(ticketId);
      
      // Refresh tickets after deletion
      refetch();
    } catch (err) {
      throw new Error('Failed to delete ticket');
    }
  }, [refetch]);

  const bulkAction = useCallback(async (actionData: any) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // In real app, make API call for bulk action
      console.log('Performing bulk action:', actionData);
      
      // Refresh tickets after bulk action
      refetch();
    } catch (err) {
      throw new Error('Failed to perform bulk action');
    }
  }, [refetch]);

  const assignTicket = useCallback(async (ticketId: string, agentId: string) => {
    try {
      await ticketsApi.assign(ticketId, agentId);
      
      // Refresh tickets after assignment
      refetch();
    } catch (err) {
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
      
      // Refresh tickets after status update
      refetch();
    } catch (err) {
      throw new Error('Failed to update ticket status');
    }
  }, [refetch]);

  const updatePriority = useCallback(async (ticketId: string, priority: string, reason?: string) => {
    try {
      await ticketsApi.update(ticketId, { priority, reason });
      
      // Refresh tickets after priority update
      refetch();
    } catch (err) {
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