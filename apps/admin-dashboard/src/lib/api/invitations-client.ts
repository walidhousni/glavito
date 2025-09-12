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

export const invitationsApi = {
  async sendInvitation(payload: SendInvitationRequest) {
    const res = await api.post('/invitations', payload);
    return (res as any)?.data?.data ?? res.data;
  },
};


