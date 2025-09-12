import { api } from './config';

export interface TenantBranding {
  name?: string;
  colors?: { primary?: string; secondary?: string };
  customCSS?: string;
  faviconUrl?: string;
  logoUrl?: string;
}

export interface DashboardConfig {
  layout: 'grid' | 'masonry';
  widgets: string[];
  configByWidget?: Record<string, unknown>;
}

export type RolesMapping = Record<string, { permissions: string[] }>;

export const tenantsApi = {
  getMyBranding: async (): Promise<TenantBranding> => {
    const res = await api.get('/tenants/me/branding');
    const payload = (res as any)?.data?.data ?? res?.data;
    return (payload || {}) as TenantBranding;
  },

  getBranding: async (tenantId: string): Promise<TenantBranding> => {
    const res = await api.get(`/tenants/${tenantId}/branding`);
    const payload = (res as any)?.data?.data ?? res?.data;
    return (payload || {}) as TenantBranding;
  },

  updateBranding: async (tenantId: string, payload: TenantBranding): Promise<TenantBranding> => {
    const res = await api.patch(`/tenants/${tenantId}/branding`, payload);
    return res.data || {};
  },

  uploadLogo: async (tenantId: string, file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/tenants/${tenantId}/branding/logo`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { url: res.data?.url };
  },

  uploadFavicon: async (tenantId: string, file: File): Promise<{ url: string }> => {
    const form = new FormData();
    form.append('file', file);
    const res = await api.post(`/tenants/${tenantId}/branding/favicon`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return { url: res.data?.url };
  },

  // Dashboard customization (current tenant)
  getMyDashboard: async (): Promise<DashboardConfig> => {
    const res = await api.get('/tenants/me/dashboard');
    return (res.data || {}) as DashboardConfig;
  },

  updateMyDashboard: async (config: DashboardConfig) => {
    const res = await api.patch('/tenants/me/dashboard', config);
    return res.data;
  },

  // Roles mapping (current tenant)
  getMyRoles: async (): Promise<RolesMapping> => {
    const res = await api.get('/tenants/me/roles');
    return (res.data || {}) as RolesMapping;
  },

  updateMyRoles: async (mapping: RolesMapping) => {
    const res = await api.patch('/tenants/me/roles', mapping);
    return res.data;
  },

  getMyPermissions: async (): Promise<string[]> => {
    const res = await api.get('/tenants/me/permissions');
    return (res.data?.permissions || []) as string[];
  },

  // API Keys (current tenant)
  listApiKeys: async () => {
    const res = await api.get('/tenants/me/api-keys');
    const payload = (res as any)?.data?.data ?? res?.data
    return Array.isArray(payload) ? payload as Array<{ id: string; name: string; prefix: string; permissions: string[]; isActive: boolean; lastUsedAt?: string; createdAt: string }> : []
  },
  createApiKey: async (name: string, permissions: string[] = []) => {
    const res = await api.post('/tenants/me/api-keys', { name, permissions });
    const payload = (res as any)?.data?.data ?? res?.data
    return payload as { id: string; name: string; prefix: string; preview: string; plaintext: string; permissions: string[]; isActive: boolean; createdAt: string };
  },
  deleteApiKey: async (id: string) => {
    const res = await api.delete(`/tenants/me/api-keys/${id}`);
    const payload = (res as any)?.data?.data ?? res?.data
    return payload as { success: true };
  },

  // Localization (current tenant)
  listSupportedLocales: async (): Promise<string[]> => {
    const res = await api.get('/localization/supported');
    return (res.data || []) as string[];
  },
  listSupportedCurrencies: async (): Promise<string[]> => {
    const res = await api.get('/localization/supported-currencies');
    return (res.data || []) as string[];
  },
  getMyLocale: async (): Promise<{ locale: string }> => {
    const res = await api.get('/localization/me');
    return (res.data || { locale: 'en' });
  },
  setMyLocale: async (locale: 'en' | 'fr' | 'ar') => {
    const res = await api.patch('/localization/me', { locale });
    return (res.data || { locale });
  },
  getMyCurrency: async (): Promise<{ currency: string }> => {
    const res = await api.get('/localization/currency');
    return (res.data || { currency: 'USD' });
  },
  setMyCurrency: async (currency: string) => {
    const res = await api.patch('/localization/currency', { currency });
    return (res.data || { currency });
  },

  // Domains (white-label)
  listDomains: async () => {
    const res = await api.get('/white-label/domains');
    return res.data as Array<{ id: string; domain: string; status: string; sslStatus: string; verificationToken?: string; dnsRecords?: any; errorMessage?: string; createdAt: string }>;
  },
  createDomain: async (domain: string) => {
    const res = await api.post('/white-label/domains', { domain });
    return res.data;
  },
  checkDomain: async (id: string) => {
    const res = await api.post(`/white-label/domains/${id}/check`);
    return res.data;
  },
  requestSSL: async (id: string) => {
    const res = await api.post(`/white-label/domains/${id}/ssl`);
    return res.data;
  },
  deleteDomain: async (id: string) => {
    const res = await api.delete(`/white-label/domains/${id}`);
    return res.data;
  },
};


