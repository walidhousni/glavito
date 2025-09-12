
import { 
  OnboardingSession, 
  OnboardingProgress, 
  OnboardingStep,
  OnboardingStatusResponse,
  StartOnboardingRequest,
  UpdateStepRequest,
  StepResult,
  CompletionResult,
  StepConfiguration,
  WhatsAppConfig,
  InstagramConfig,
  EmailConfig,
  ChannelConnectionStatus,
  ChannelType,
  AIFeatureConfig,
  AIModelTrainingRequest,
  WorkflowAutomationRequest,
  WorkflowAutomationResponse,
  ModelStatus,
  N8NTemplate,
  AIFeaturesStatusResponse,
  KnowledgeBaseSetupRequest,
  CreateArticleRequest,
  KnowledgeBaseArticle,
  KnowledgeBaseStats,
  AIArticleSuggestion,
  PaymentSetupRequest,
  StripeAccountInfo,
  PaymentStatus,
  BillingConfiguration,
  TeamManagementSetupRequest,
  TeamInfo,
  InvitationInfo,
  TeamStats,
  // New two-tier types
  OnboardingType,
  OnboardingRole,
  TenantSetupStatus,
  AgentWelcomeStatus,
  TenantSetupStep,
  AgentWelcomeStep,
  AgentInvitationContext
} from '@glavito/shared-types';
import { api as axiosApi } from '@/lib/api/config';

// Normalize API base and ensure it includes /api
const rawBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/$/, '');
const API_BASE_URL = /\/api$/.test(rawBase) ? rawBase : `${rawBase}/api`;

class OnboardingAPI {
  private async request<T>(endpoint: string, options: { method?: string; data?: unknown } = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    try {
      const tenantHeader = (typeof window !== 'undefined' && window.location?.host)
        ? { 'x-tenant-host': window.location.host }
        : undefined;
      const method = (options.method || 'GET').toUpperCase();
      const needsContentType = method === 'POST' || method === 'PUT' || method === 'PATCH';
      const headers = {
        Accept: 'application/json',
        ...(needsContentType ? { 'Content-Type': 'application/json' } : {}),
        ...(tenantHeader || {}),
      } as Record<string, string>;
      const response = await axiosApi.request({
        url,
        method: options.method || 'GET',
        data: options.data,
        headers,
      });

      const payload = (response as any)?.data?.data ?? response?.data;
      return payload as T;
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Network error';
      // Swallow benign terminal states for UX smoothness
      if (/already\s+completed/i.test(message)) {
        return { success: true } as T;
      }
      throw new Error(message);
    }
  }

  async startOnboarding(request?: StartOnboardingRequest): Promise<OnboardingSession> {
    return this.request<OnboardingSession>('/onboarding/start', {
      method: 'POST',
      data: request || {},
    });
  }

  async getOnboardingStatus(): Promise<OnboardingStatusResponse> {
    return this.request<OnboardingStatusResponse>('/onboarding/status');
  }

  async getProgress(sessionId: string): Promise<OnboardingProgress> {
    return this.request<OnboardingProgress>(`/onboarding/progress/${sessionId}`);
  }

  async updateStep(sessionId: string, stepId: OnboardingStep, data: any): Promise<StepResult> {
    const request: UpdateStepRequest = { stepId, data };
    try {
      return await this.request<StepResult>(`/onboarding/step/${sessionId}`, {
        method: 'PUT',
        data: request,
      });
    } catch (err: any) {
      const message: string = err?.message || '';
      // Auto-recover if backend says the session is paused/not active
      if (/not\s+active|paused/i.test(message)) {
        // eslint-disable-next-line no-useless-catch
        try {
          await this.resumeOnboarding(sessionId);
          return await this.request<StepResult>(`/onboarding/step/${sessionId}`, {
            method: 'PUT',
            data: request,
          });
        } catch (retryErr) {
          throw retryErr;
        }
      }
      throw err;
    }
  }

  async pauseOnboarding(sessionId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/onboarding/pause/${sessionId}`, {
      method: 'PUT',
      data: {},
    });
  }

  async resumeOnboarding(sessionId: string): Promise<OnboardingSession> {
    return this.request<OnboardingSession>(`/onboarding/resume/${sessionId}`, {
      method: 'PUT',
      data: {},
    });
  }

  async completeOnboarding(sessionId: string, opts?: { force?: boolean }): Promise<CompletionResult> {
    const force = opts?.force === true;
    const query = force ? '?force=true' : '';
    return this.request<CompletionResult>(`/onboarding/complete/${sessionId}${query}`, {
      method: 'POST',
      data: {},
    });
  }

  async getStepConfiguration(stepId: OnboardingStep): Promise<StepConfiguration> {
    return this.request<StepConfiguration>(`/onboarding/step/${stepId}/config`);
  }

  // Channel Integration Methods

  async configureWhatsApp(config: WhatsAppConfig): Promise<ChannelConnectionStatus> {
    return this.request<ChannelConnectionStatus>('/onboarding/channels/whatsapp', {
      method: 'POST',
      data: config,
    });
  }

  async configureInstagram(config: InstagramConfig): Promise<ChannelConnectionStatus> {
    return this.request<ChannelConnectionStatus>('/onboarding/channels/instagram', {
      method: 'POST',
      data: config,
    });
  }

  async configureEmail(config: EmailConfig): Promise<ChannelConnectionStatus> {
    return this.request<ChannelConnectionStatus>('/onboarding/channels/email', {
      method: 'POST',
      data: config,
    });
  }

  async testAllChannels(): Promise<ChannelConnectionStatus[]> {
    return this.request<ChannelConnectionStatus[]>('/onboarding/channels/test');
  }

  async getChannelStatus(): Promise<{
    configured: ChannelType[];
    available: ChannelType[];
    total: number;
    completed: number;
  }> {
    return this.request('/onboarding/channels/status');
  }

  // AI and Automation Methods

  async initializeAIFeatures(config: AIFeatureConfig): Promise<{
    success: boolean;
    enabledFeatures: string[];
    errors: string[];
  }> {
    return this.request('/onboarding/ai/initialize', {
      method: 'POST',
      data: config,
    });
  }

  async trainCustomModel(request: AIModelTrainingRequest): Promise<{
    success: boolean;
    trainingId: string;
    estimatedCompletion: Date;
  }> {
    return this.request('/onboarding/ai/models/train', {
      method: 'POST',
      data: request,
    });
  }

  async getModelStatus(modelId: string): Promise<ModelStatus> {
    return this.request(`/onboarding/ai/models/${modelId}/status`);
  }

  async createWorkflow(request: WorkflowAutomationRequest): Promise<WorkflowAutomationResponse> {
    return this.request('/onboarding/workflows/create', {
      method: 'POST',
      data: request,
    });
  }

  async activateWorkflow(workflowId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/onboarding/workflows/${workflowId}/activate`, {
      method: 'PUT',
      data: {},
    });
  }

  async getWorkflowTemplates(): Promise<N8NTemplate[]> {
    return this.request('/onboarding/workflows/templates');
  }

  async getAIFeaturesStatus(): Promise<AIFeaturesStatusResponse> {
    return this.request('/onboarding/ai/status');
  }

  // Knowledge Base Methods

  async setupKnowledgeBase(request: KnowledgeBaseSetupRequest): Promise<{
    success: boolean;
    articlesCreated: number;
    categoriesCreated: string[];
    message: string;
  }> {
    return this.request('/onboarding/knowledge-base/setup', {
      method: 'POST',
      data: request,
    });
  }

  async createKBArticle(request: CreateArticleRequest): Promise<KnowledgeBaseArticle> {
    return this.request('/onboarding/knowledge-base/articles', {
      method: 'POST',
      data: request,
    });
  }

  async getKBArticles(): Promise<{ articles: KnowledgeBaseArticle[]; totalCount: number }> {
    return this.request('/onboarding/knowledge-base/articles');
  }

  async getKBStats(): Promise<KnowledgeBaseStats> {
    return this.request('/onboarding/knowledge-base/stats');
  }

  async getKBSuggestions(): Promise<AIArticleSuggestion[]> {
    return this.request('/onboarding/knowledge-base/suggestions');
  }

  async getKBCategories(): Promise<string[]> {
    return this.request('/onboarding/knowledge-base/categories');
  }

  async getKBTags(): Promise<{ tag: string; count: number }[]> {
    return this.request('/onboarding/knowledge-base/tags');
  }

  // Payment Integration Methods

  async setupPaymentIntegration(request: PaymentSetupRequest): Promise<{
    success: boolean;
    stripeAccount: StripeAccountInfo;
    onboardingUrl: string;
    message: string;
  }> {
    return this.request('/onboarding/payment/setup', {
      method: 'POST',
      data: request,
    });
  }

  async getPaymentStatus(): Promise<PaymentStatus> {
    return this.request('/onboarding/payment/status');
  }

  async createPaymentAccountLink(): Promise<{ url: string; expiresAt: Date }> {
    return this.request('/onboarding/payment/account-link', {
      method: 'POST',
      data: {},
    });
  }

  async getStripeAccount(): Promise<StripeAccountInfo | null> {
    return this.request('/onboarding/payment/account');
  }

  async getBillingConfiguration(): Promise<BillingConfiguration | null> {
    return this.request('/onboarding/payment/billing-config');
  }

  // Team Management Methods

  async setupTeamManagement(request: TeamManagementSetupRequest): Promise<{
    success: boolean;
    teamsCreated: TeamInfo[];
    invitationsSent: InvitationInfo[];
    message: string;
  }> {
    return this.request('/onboarding/team/setup', {
      method: 'POST',
      data: request,
    });
  }

  async getTeamManagementStatus(): Promise<{
    teams: TeamInfo[];
    stats: TeamStats;
    invitations: InvitationInfo[];
    isConfigured: boolean;
  }> {
    return this.request('/onboarding/team/status');
  }

  async getAvailableUsersForTeams(): Promise<Array<{
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    role: string;
    status: string;
    isTeamMember: boolean;
  }>> {
    return this.request('/onboarding/team/available-users');
  }

  // Two-Tier Onboarding Methods

  async getTenantSetupStatus(): Promise<TenantSetupStatus> {
    return this.request('/onboarding/tenant-setup/status');
  }

  async getAgentWelcomeStatus(userId: string): Promise<AgentWelcomeStatus> {
    return this.request(`/onboarding/agent-welcome/status/${userId}`);
  }

  async startAgentWelcome(context: AgentInvitationContext): Promise<OnboardingSession> {
    return this.request('/onboarding/agent-welcome/start', {
      method: 'POST',
      data: context,
    });
  }

  async completeTenantSetup(): Promise<{ success: boolean; message: string }> {
    return this.request('/onboarding/tenant-setup/complete', {
      method: 'POST',
      data: {},
    });
  }

  async getOnboardingType(): Promise<{
    type: OnboardingType;
    role: OnboardingRole;
    isTenantOwner: boolean;
  }> {
    return this.request('/onboarding/type');
  }

  async getStepConfiguration(stepId: OnboardingStep, type: OnboardingType): Promise<StepConfiguration> {
    return this.request(`/onboarding/step/${stepId}/config?type=${type}`);
  }

  // Enhanced start onboarding with type and role
  async startOnboardingWithType(
    type: OnboardingType, 
    role: OnboardingRole, 
    request?: StartOnboardingRequest
  ): Promise<OnboardingSession> {
    return this.request('/onboarding/start', {
      method: 'POST',
      data: {
        type,
        role,
        ...request
      },
    });
  }
}

export const onboardingAPI = new OnboardingAPI();