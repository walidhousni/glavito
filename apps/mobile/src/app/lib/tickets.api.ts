import { createApiClient } from './api';

export type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: 'low' | 'medium' | 'high' | 'urgent' | string;
  customer?: { id: string; firstName?: string | null; lastName?: string | null; email?: string | null };
  channel?: { id: string; type: string; name?: string };
  assignedAgent?: { id: string; firstName?: string; lastName?: string } | null;
  createdAt: string;
  updatedAt: string;
};

export type TicketFilters = Partial<{
  status: string[];
  priority: string[];
  assignedAgentId: string;
  teamId: string;
  customerId: string;
  channelId: string;
  tags: string[];
  search: string;
  overdue: boolean;
  slaAtRisk: boolean;
  unassigned: boolean;
}>;

export async function listTickets(filters: TicketFilters = {}, pagination: { page?: number; limit?: number } = {}) {
  const api = createApiClient();
  const res = await api.get('/tickets', { params: { ...filters, ...pagination } });
  return (res.data || []) as Ticket[];
}

export async function getTicket(id: string) {
  const api = createApiClient();
  const res = await api.get(`/tickets/${id}`);
  return res.data as Ticket;
}

export async function getTicketStats() {
  const api = createApiClient();
  const res = await api.get('/tickets/stats');
  return res.data;
}

export async function addTicketNote(id: string, content: string, isPrivate = true) {
  const api = createApiClient();
  const res = await api.post(`/tickets/${id}/notes`, { content, isPrivate });
  return res.data;
}

export async function updateTicket(id: string, changes: Partial<Pick<Ticket, 'status' | 'priority' | 'subject'>>) {
  const api = createApiClient();
  const res = await api.patch(`/tickets/${id}`, changes);
  return res.data as Ticket;
}

export async function assignTicket(id: string, agentId: string) {
  const api = createApiClient();
  const res = await api.patch(`/tickets/${id}/assign`, { agentId });
  return res.data as Ticket;
}

export async function searchTickets(filters: TicketFilters = {}, pagination: { page?: number; limit?: number } = {}) {
  // Alias to listTickets to keep API explicit
  return listTickets(filters, pagination);
}

export async function getTicketTimeline(id: string) {
  const api = createApiClient();
  const res = await api.get(`/tickets/${id}/timeline`);
  return res.data as Array<{ id: string; eventType: string; description?: string; createdAt: string; user?: any }>;
}

export async function createTicket(payload: {
  subject: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent' | string;
  teamId?: string;
  channelId?: string;
  customerId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
}) {
  const api = createApiClient();
  const res = await api.post('/tickets', payload);
  return res.data as Ticket;
}


