import api from './config';

export type Portal = {
  id?: string;
  tenantId?: string;
  name?: string;
  description?: string | null;
  subdomain?: string;
  customDomain?: string | null;
  isActive?: boolean;
  isPublished?: boolean;
  branding?: Record<string, unknown>;
  features?: Record<string, unknown>;
  customization?: Record<string, unknown>;
  seoSettings?: Record<string, unknown>;
  publishedAt?: string | null;
  lastPublishedAt?: string | null;
};

export type PortalPage = {
  id?: string;
  portalId?: string;
  name: string;
  slug: string;
  title: string;
  content: string;
  pageType?: string;
  isActive?: boolean;
  sortOrder?: number;
  seoTitle?: string | null;
  seoDescription?: string | null;
  customCss?: string | null;
  customJs?: string | null;
};

export type PortalTheme = {
  id?: string;
  portalId?: string;
  name: string;
  description?: string | null;
  isActive?: boolean;
  isSystem?: boolean;
  colors?: Record<string, unknown>;
  typography?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  components?: Record<string, unknown>;
  customCss?: string | null;
};

export type PortalWidget = {
  id?: string;
  portalId?: string;
  name: string;
  type: string;
  configuration?: Record<string, unknown>;
  position?: Record<string, unknown>;
  isActive?: boolean;
  sortOrder?: number;
};

export const portalApi = {
  async getPortal(): Promise<Portal | null> {
    const { data } = await api.get('/customer-portal/me');
    return data || null;
  },

  async upsertPortal(patch: Partial<Portal>): Promise<Portal> {
    const { data } = await api.patch('/customer-portal/me', patch);
    return data;
  },

  async publish(): Promise<Portal> {
    const { data } = await api.post('/customer-portal/me/publish', {});
    return data;
  },

  // Pages
  async listPages(): Promise<PortalPage[]> {
    const { data } = await api.get('/customer-portal/me/pages');
    return data || [];
  },

  async upsertPage(payload: PortalPage): Promise<PortalPage> {
    const { data } = await api.post('/customer-portal/me/pages', payload);
    return data;
  },

  async deletePage(id: string): Promise<{ success: true }> {
    const { data } = await api.delete(`/customer-portal/me/pages/${id}`);
    return data;
  },

  // Themes
  async listThemes(): Promise<PortalTheme[]> {
    const { data } = await api.get('/customer-portal/me/themes');
    return data || [];
  },

  async upsertTheme(payload: PortalTheme): Promise<PortalTheme> {
    const { data } = await api.post('/customer-portal/me/themes', payload);
    return data;
  },

  // Widgets
  async listWidgets(): Promise<PortalWidget[]> {
    const { data } = await api.get('/customer-portal/me/widgets');
    return data || [];
  },

  async upsertWidget(payload: PortalWidget): Promise<PortalWidget> {
    const { data } = await api.post('/customer-portal/me/widgets', payload);
    return data;
  },

  async deleteWidget(id: string): Promise<{ success: true }> {
    const { data } = await api.delete(`/customer-portal/me/widgets/${id}`);
    return data;
  },
};


