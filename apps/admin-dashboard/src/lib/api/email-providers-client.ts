import { api } from './config';

export type EmailProviderType = 'SMTP' | 'SES' | 'SENDGRID' | 'ALIYUN_DM';

export interface TenantEmailProviderConfigDto {
  id: string;
  provider: EmailProviderType;
  isPrimary: boolean;
  fromName: string;
  fromEmail: string;
  replyToEmail?: string;
  dkimDomain?: string;
  trackingDomain?: string;
  ratePerSecond?: number;
  credentials: Record<string, unknown> | string;
  createdAt?: string;
  updatedAt?: string;
}

export const emailProvidersApi = {
  listMy: async (): Promise<TenantEmailProviderConfigDto[]> => {
    const res = await api.get('/tenants/me/email/providers');
    return Array.isArray(res.data) ? (res.data as TenantEmailProviderConfigDto[]) : [];
  },
  createMy: async (payload: Omit<TenantEmailProviderConfigDto, 'id' | 'createdAt' | 'updatedAt'>) => {
    const res = await api.post('/tenants/me/email/providers', payload);
    return res.data as { id: string };
  },
  updateMy: async (id: string, patch: Partial<TenantEmailProviderConfigDto>) => {
    const res = await api.patch(`/tenants/me/email/providers/${encodeURIComponent(id)}`, patch);
    return res.data as { success: boolean };
  },
  deleteMy: async (id: string) => {
    const res = await api.delete(`/tenants/me/email/providers/${encodeURIComponent(id)}`);
    return res.data as { success: boolean };
  },
  verifyDomainMy: async (id: string) => {
    const res = await api.post(`/tenants/me/email/providers/${encodeURIComponent(id)}/verify-domain`, {});
    return res.data as { status: string; instructions?: string };
  },
};


