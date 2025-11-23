import { apiClient } from './client';

export interface IndustryTemplate {
  id: string;
  industry: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  isActive: boolean;
  isGlobal: boolean;
  customFieldsSchema: Record<string, any>;
  workflowTemplates: any[];
  slaTemplates: any[];
  routingRules: Record<string, any>;
  dashboardLayouts: Record<string, any>;
  analyticsPresets: any[];
  pipelineStages: Record<string, any>;
  automationRecipes: any[];
  integrationPacks: string[];
  portalTheme: Record<string, any>;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  _count?: {
    applications: number;
  };
}

export interface TenantIndustryProfile {
  id: string;
  tenantId: string;
  primaryIndustry: string | null;
  subIndustries: string[];
  companySize: string | null;
  region: string | null;
  customizations: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ApplyTemplateResponse {
  application: {
    id: string;
    tenantId: string;
    templateId: string;
    appliedAt: string;
    appliedBy: string | null;
    status: string;
  };
  results: {
    customFields: number;
    workflows: number;
    slaTemplates: number;
    routingRules: number;
    dashboards: number;
    analytics: number;
    pipelines: number;
    automations: number;
    integrations: number;
    portalTheme: boolean;
  };
}

export const templatesApi = {
  /**
   * List all available industry templates
   */
  list: async (params?: { industry?: string; isActive?: boolean }) => {
    const queryParams = new URLSearchParams();
    if (params?.industry) queryParams.set('industry', params.industry);
    if (params?.isActive !== undefined) queryParams.set('isActive', String(params.isActive));
    
    const url = `/templates${queryParams.toString() ? `?${queryParams}` : ''}`;
    return apiClient.get<IndustryTemplate[]>(url);
  },

  /**
   * Get a specific template by ID
   */
  getById: async (id: string) => {
    return apiClient.get<IndustryTemplate>(`/templates/${id}`);
  },

  /**
   * Get templates for a specific industry
   */
  getByIndustry: async (industry: string) => {
    return apiClient.get<IndustryTemplate[]>(`/templates/industry/${industry}`);
  },

  /**
   * Apply a template to the current tenant
   */
  apply: async (
    templateId: string,
    options?: {
      customizations?: Record<string, unknown>;
      applyCustomFields?: boolean;
      applyWorkflows?: boolean;
      applySLA?: boolean;
      applyRouting?: boolean;
      applyDashboards?: boolean;
      applyAnalytics?: boolean;
      applyPipelines?: boolean;
      applyAutomations?: boolean;
      applyIntegrations?: boolean;
      applyPortalTheme?: boolean;
    }
  ) => {
    return apiClient.post<ApplyTemplateResponse>('/templates/apply', {
      templateId,
      customizations: options?.customizations,
      options: {
        applyCustomFields: options?.applyCustomFields,
        applyWorkflows: options?.applyWorkflows,
        applySLA: options?.applySLA,
        applyRouting: options?.applyRouting,
        applyDashboards: options?.applyDashboards,
        applyAnalytics: options?.applyAnalytics,
        applyPipelines: options?.applyPipelines,
        applyAutomations: options?.applyAutomations,
        applyIntegrations: options?.applyIntegrations,
        applyPortalTheme: options?.applyPortalTheme
      }
    });
  },

  /**
   * Get applied templates for current tenant
   */
  getApplied: async () => {
    return apiClient.get<any[]>('/templates/tenant/applied');
  },

  /**
   * Get current tenant's industry profile
   */
  getProfile: async () => {
    return apiClient.get<TenantIndustryProfile>('/templates/tenant/profile');
  },

  /**
   * Update tenant's industry profile
   */
  updateProfile: async (data: {
    primaryIndustry?: string;
    subIndustries?: string[];
    companySize?: string;
    region?: string;
    customizations?: Record<string, any>;
  }) => {
    return apiClient.put<TenantIndustryProfile>('/templates/tenant/profile', data);
  }
};

