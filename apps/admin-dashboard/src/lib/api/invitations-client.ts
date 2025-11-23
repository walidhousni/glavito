import api from './config';

export type InvitationRole = 'agent' | 'admin' | 'manager';

export interface SendInvitationRequest {
  email: string;
  role: InvitationRole;
  teamIds?: string[];
  permissions?: string[];
  customMessage?: string;
  templateId?: string;
}

export interface BulkInviteRequest {
  emails: string[];
  role: InvitationRole;
  teamIds?: string[];
  permissions?: string[];
  customMessage?: string;
  templateId?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password?: string;
}

export interface InvitationInfo {
  id: string;
  tenantId: string;
  inviterUserId: string;
  inviter: { firstName: string; lastName: string; email: string };
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: string | Date;
  acceptedAt?: string | Date;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export const invitationsApi = {
  async sendInvitation(payload: SendInvitationRequest) {
    const res = await api.post('/invitations', payload);
    const data = res.data as unknown;
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      return (data as { data: unknown }).data;
    }
    return data;
  },
  async sendBulk(payload: BulkInviteRequest) {
    const res = await api.post('/invitations/bulk', payload);
    const data = res.data as unknown;
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      return (data as { data: unknown }).data;
    }
    return data;
  },
  async getInvitations(params?: { status?: string }): Promise<InvitationInfo[]> {
    const res = await api.get('/invitations', { params });
    const data = res.data as unknown;
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      return ((data as { data: unknown }).data as InvitationInfo[]) ?? [];
    }
    return (data as InvitationInfo[]) ?? [];
  },
  async validate(token: string): Promise<InvitationInfo | null> {
    const res = await api.get(`/invitations/validate/${encodeURIComponent(token)}`);
    const data = res.data as unknown;
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      return ((data as { data: unknown }).data as InvitationInfo | null) ?? null;
    }
    return (data as InvitationInfo | null) ?? null;
  },
  async accept(payload: AcceptInvitationRequest): Promise<{ success: boolean; user?: unknown; message: string }> {
    const res = await api.post('/invitations/accept', payload);
    const data = res.data as unknown;
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      return (data as { data: { success: boolean; user?: unknown; message: string } }).data;
    }
    return data as { success: boolean; user?: unknown; message: string };
  },
  async resend(invitationId: string): Promise<void> {
    await api.post(`/invitations/${encodeURIComponent(invitationId)}/resend`);
  },
  async cancel(invitationId: string): Promise<{ success: true; message: string }> {
    const res = await api.delete(`/invitations/${encodeURIComponent(invitationId)}`);
    const data = res.data as unknown;
    if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
      return (data as { data: { success: true; message: string } }).data;
    }
    return data as { success: true; message: string };
  },
};


