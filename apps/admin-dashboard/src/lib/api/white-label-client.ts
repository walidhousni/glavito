import { api } from './config';

export type BrandAssetType = 'logo' | 'favicon' | 'email_header' | 'mobile_icon' | string;

export interface BrandAsset {
  id: string;
  tenantId: string;
  type: BrandAssetType;
  originalUrl: string;
  variants: Array<{ size: string; format: string; url: string; fileSize: number }>;
  metadata: Record<string, unknown>;
  version: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WhiteLabelTemplateClientItem {
  id: string;
  type: string;
  name: string;
  content: string;
  subject?: string;
  variables: Array<{ key: string; type?: string; required?: boolean; description?: string }>;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface DomainRecord {
  id: string;
  tenantId: string;
  portalId: string;
  domain: string;
  status: 'pending' | 'verifying' | 'active' | 'failed' | string;
  verificationToken?: string | null;
  dnsRecords?: Array<{ type: 'TXT' | 'CNAME'; name: string; value: string; ttl: number; purpose?: string }>;
  sslStatus?: 'pending' | 'active' | 'failed' | string;
  sslCertificate?: Record<string, unknown> | null;
  lastCheckedAt?: string;
  verifiedAt?: string;
  errorMessage?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export const whiteLabelApi = {
  // Settings (full and scoped)
  getSettings: async () => {
    const res = await api.get('/white-label/settings');
    return res.data as import('@glavito/shared-types').TenantWhiteLabelSettings;
  },
  updateSettings: async (patch: Partial<import('@glavito/shared-types').TenantWhiteLabelSettings>) => {
    const res = await api.patch('/white-label/settings', patch);
    return res.data as import('@glavito/shared-types').TenantWhiteLabelSettings;
  },
  updateCompany: async (payload: Partial<import('@glavito/shared-types').TenantWhiteLabelSettings['company']>) => {
    const res = await api.patch('/white-label/settings/company', payload);
    return res.data as import('@glavito/shared-types').TenantWhiteLabelSettings;
  },
  updateLocalization: async (payload: Partial<import('@glavito/shared-types').TenantWhiteLabelSettings['localization']>) => {
    const res = await api.patch('/white-label/settings/localization', payload);
    return res.data as import('@glavito/shared-types').TenantWhiteLabelSettings;
  },
  listAssets: async (): Promise<BrandAsset[]> => {
    const res = await api.get('/white-label/assets');
    return res.data as BrandAsset[];
  },

  uploadAsset: async (file: File, type: BrandAssetType) => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/white-label/assets/upload?type=${encodeURIComponent(type)}` as string, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data as BrandAsset;
  },

  createAssetRecord: async (payload: { type: BrandAssetType; originalUrl: string; variants?: Array<{ size: string; format: string; url: string; fileSize: number }>; metadata?: Record<string, unknown> }) => {
    const res = await api.post('/white-label/assets', payload);
    return res.data as BrandAsset;
  },

  deleteAsset: async (id: string) => {
    const res = await api.delete(`/white-label/assets/${id}`);
    return res.data as { success: true };
  },
  activateAsset: async (id: string) => {
    const res = await api.post(`/white-label/assets/${id}/activate`, {});
    return res.data as BrandAsset;
  },

  // Templates
  listTemplates: async (type?: string) => {
    const q = type ? `?type=${encodeURIComponent(type)}` : '';
    const res = await api.get(`/white-label/templates${q}`);
    return res.data as WhiteLabelTemplateClientItem[];
  },
  upsertTemplate: async (tpl: { type: string; name: string; subject?: string; content: string; variables?: Array<{ key: string; type?: string; required?: boolean; description?: string }>; isActive?: boolean }) => {
    const res = await api.post('/white-label/templates', tpl);
    return res.data;
  },
  deleteTemplate: async (id: string) => {
    const res = await api.delete(`/white-label/templates/${id}`);
    return res.data;
  },
  previewTemplate: async (content: string, variables: Record<string, unknown>) => {
    const res = await api.post('/white-label/templates/preview', { content, variables });
    return res.data as { content: string; engine: 'handlebars' | 'fallback'; success: boolean };
  },
  testSendTemplate: async (id: string, payload: { to: string; variables?: Record<string, unknown> }) => {
    const res = await api.post(`/white-label/templates/${id}/test-send`, payload);
    return res.data as { success: boolean; error?: string; message?: string; dnsValidation?: any; deliveryId?: string };
  },

  // Deliveries
  listDeliveries: async (params?: { take?: number; status?: string; q?: string }) => {
    const sp = new URLSearchParams();
    if (params?.take != null) sp.set('take', String(params.take));
    if (params?.status) sp.set('status', params.status);
    if (params?.q) sp.set('q', params.q);
    const q = sp.toString() ? `?${sp.toString()}` : '';
    const res = await api.get(`/white-label/deliveries${q}`);
    return res.data as Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; openedAt?: string; openCount: number; clickCount: number; createdAt: string }>;
  },

  // Theme
  getTheme: async () => {
    const res = await api.get('/white-label/theme');
    return res.data as import('@glavito/shared-types').WhiteLabelTheme;
  },

  // Feature toggles
  listToggles: async () => {
    const res = await api.get('/white-label/toggles');
    return Array.isArray(res.data) ? res.data as Array<{ id: string; featureKey: string; isEnabled: boolean; configuration?: Record<string, unknown>; restrictions?: Record<string, unknown>; updatedAt: string }> : [];
  },
  upsertToggle: async (toggle: { featureKey: string; isEnabled?: boolean; configuration?: Record<string, unknown>; restrictions?: Record<string, unknown> }) => {
    const res = await api.post('/white-label/toggles', toggle);
    return res.data;
  },
  deleteToggle: async (featureKey: string) => {
    const res = await api.delete(`/white-label/toggles/${encodeURIComponent(featureKey)}`);
    return res.data;
  },
  // SMTP (per-tenant)
  getSmtp: async () => {
    const res = await api.get('/white-label/smtp');
    return (res.data?.smtp || null) as { host: string; port: number; user: string; from?: string; secure?: boolean } | null;
  },
  updateSmtp: async (payload: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) => {
    const res = await api.patch('/white-label/smtp', payload);
    return res.data as { smtp: { host: string; port: number; user: string; from?: string; secure?: boolean } };
  },
  testSmtp: async (payload: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) => {
    const res = await api.post('/white-label/smtp/test', payload);
    return res.data as { ok: boolean; error?: string };
  },

  // Email DNS (DKIM/SPF/DMARC)
  getEmailDnsGuidance: async (domain: string) => {
    const res = await api.get(`/white-label/domains/${encodeURIComponent(domain)}/email-dns-guidance`);
    return res.data as { domain: string; provider: string; records: Array<{ type: 'TXT' | 'CNAME'; name: string; value: string; ttl: number; purpose: string }> };
  },
  validateEmailDns: async (domain: string) => {
    const res = await api.get(`/white-label/domains/${encodeURIComponent(domain)}/email-dns-validate`);
    return res.data as { domain: string; checks: { spf: any; dkim: any; dmarc: any }; passed: boolean };
  },

  // Domains CRUD
  listDomains: async (): Promise<DomainRecord[]> => {
    const res = await api.get('/white-label/domains');
    return Array.isArray(res.data) ? res.data as DomainRecord[] : [];
  },
  createDomain: async (payload: { domain: string; portalId?: string }): Promise<DomainRecord> => {
    const res = await api.post('/white-label/domains', payload);
    return res.data as DomainRecord;
  },
  checkDomain: async (id: string): Promise<DomainRecord> => {
    const res = await api.post(`/white-label/domains/${encodeURIComponent(id)}/check`, {});
    return res.data as DomainRecord;
  },
  requestSSL: async (id: string): Promise<DomainRecord> => {
    const res = await api.post(`/white-label/domains/${encodeURIComponent(id)}/ssl`, {});
    return res.data as DomainRecord;
  },
  deleteDomain: async (id: string): Promise<{ success: true }> => {
    const res = await api.delete(`/white-label/domains/${encodeURIComponent(id)}`);
    return res.data as { success: true };
  },
};


