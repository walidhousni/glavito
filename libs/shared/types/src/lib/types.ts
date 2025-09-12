// import { OnboardingProgress, OnboardingSession, OnboardingStep, StepConfiguration } from './onboarding-types.js';
import { WorkflowTemplate } from './template-types.js';

// Core Entity Types
export interface Tenant {
  id: string;
  name: string;
  slug?: string;
  subdomain: string;
  plan: string;
  status: string;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'agent' | 'customer';
  status: 'active' | 'inactive' | 'pending';
  avatar?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  tenantId: string;
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  tags: string[];
  customFields: Record<string, any>;
  healthScore?: number;
  churnRisk?: 'low' | 'medium' | 'high' | 'critical';
  healthReasons?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerInsights {
  keyInsights: string[];
  riskFactors: string[];
  opportunities: string[];
  nextBestActions: string[];
  sentimentAnalysis?: {
    overall: 'positive' | 'negative' | 'neutral';
    score: number; // 0..1
    trend: 'improving' | 'stable' | 'declining';
  };
  behavioralAnalysis?: {
    recentActivity: Array<{ type: string; count: number }>;
    channelPreference: Array<{ channel: string; percentage: number }>;
  };
  explanation?: string;
  confidence?: number;
}

export interface Ticket {
  id: string;
  tenantId: string;
  customerId: string;
  assignedAgentId?: string;
  teamId?: string;
  channelId: string;
  subject: string;
  description: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  customFields: Record<string, any>;
  dueDate?: Date;
  language?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

// ----- Customization types -----
export interface CustomFieldDefinitionDTO {
  id: string;
  tenantId: string;
  entity: 'ticket' | 'customer' | 'lead' | 'deal' | string;
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date' | 'email' | 'phone' | 'url';
  required: boolean;
  options?: Array<{ value: string; label: string } | string> | Record<string, unknown> | null;
  defaultValue?: unknown;
  validation?: Record<string, unknown> | null;
  conditions?: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  version: number;
  readOnly?: boolean;
  rolesAllowed?: string[];
  description?: string | null;
  group?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CustomObjectTypeDTO {
  id: string;
  tenantId: string;
  name: string;
  label: string;
  description?: string | null;
  schema: {
    fields?: Array<{ name: string; label: string; type: string; required?: boolean; options?: unknown; validation?: unknown }>;
    relations?: Record<string, unknown>;
    [k: string]: unknown;
  };
  relationships: Record<string, unknown>;
  version: number;
  isActive: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CustomObjectRecordDTO {
  id: string;
  tenantId: string;
  typeId: string;
  values: Record<string, unknown>;
  references: Record<string, unknown>;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderType: 'agent' | 'customer' | 'system';
  content: string;
  messageType: 'text' | 'image' | 'file' | 'audio' | 'video';
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Channel {
  id: string;
  tenantId: string;
  name: string;
  type: 'email' | 'whatsapp' | 'instagram' | 'facebook' | 'chat' | 'phone';
  config: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// API Request/Response Types
export interface CreateTicketRequest {
  tenantId?: string;
  customerId: string;
  channelId: string;
  subject: string;
  description: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgentId?: string;
  teamId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  dueDate?: string;
  language?: string;
}

export interface UpdateTicketRequest {
  subject?: string;
  description?: string;
  status?: 'open' | 'pending' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignedAgentId?: string;
  teamId?: string;
  tags?: string[];
  customFields?: Record<string, any>;
  dueDate?: string;
  language?: string;
}

export interface CreateTenantRequest {
  name: string;
  subdomain: string;
  plan?: 'starter' | 'professional' | 'business' | 'enterprise';
  settings?: Record<string, any>;
}

export interface UpdateTenantRequest {
  name?: string;
  subdomain?: string;
  plan?: 'starter' | 'professional' | 'business' | 'enterprise';
  status?: 'active' | 'suspended' | 'trial';
  settings?: Record<string, any>;
}

export interface SendMessageRequest {
  conversationId: string;
  content: string;
  messageType?: 'text' | 'image' | 'file' | 'audio' | 'video';
  metadata?: Record<string, any>;
}

// Authentication Types
export interface LoginRequest {
  email: string;
  password: string;
  tenantId?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  tenantId?: string;
}

export interface SSORequest {
  provider: 'google' | 'microsoft' | 'github';
  code: string;
  state: string;
  tenantId?: string;
}

export interface SSOInitiateRequest {
  provider: 'google' | 'microsoft' | 'github';
  redirectUrl: string;
}

export interface SSOInitiateResponse {
  authUrl: string;
  state: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

export interface EmailVerificationRequest {
  token: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
  tenant: Tenant;
  subscription?: Subscription;
}

export interface RegisterResponse {
  user: User;
  tenant: Tenant;
  accessToken?: string;
  refreshToken?: string;
  requiresEmailVerification: boolean;
}

export interface JwtPayload {
  sub: string;
  email: string;
  tenantId: string;
  role: string;
  iat?: number;
  exp?: number;
}

// Enhanced User Model
export interface EnhancedUser extends User {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  loginAttempts: number;
  lockoutUntil?: Date;
  ssoProviders: SSOProvider[];
}

// SSO Provider Types
export interface SSOProvider {
  id: string;
  userId: string;
  provider: 'google' | 'microsoft' | 'github';
  providerId: string;
  email: string;
  tokenExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription Types
export interface Subscription {
  id: string;
  tenantId: string;
  plan: 'starter' | 'professional' | 'business' | 'enterprise';
  status: 'active' | 'cancelled' | 'past_due' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEndsAt?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  cancelReason?: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSubscriptionRequest {
  plan: 'starter' | 'professional' | 'business' | 'enterprise';
  paymentMethodId: string;
}

export interface UpdateSubscriptionRequest {
  plan?: string;
  cancelAtPeriodEnd?: boolean;
}

// Invitation Types
export interface Invitation {
  id: string;
  tenantId: string;
  inviterUserId: string;
  email: string;
  role: 'agent' | 'admin';
  token: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateInvitationRequest {
  email: string;
  role: 'agent' | 'admin';
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password?: string;
}

// Organization Types
export interface CreateOrganizationRequest {
  name: string;
  subdomain: string;
  settings?: Record<string, any>;
}

export interface UpdateOrganizationRequest {
  name?: string;
  subdomain?: string;
  settings?: Record<string, any>;
}

// Authentication Error Types
export interface AuthError {
  code: string;
  message: string;
  details?: any;
}

export interface AuthErrors {
  INVALID_CREDENTIALS: AuthError;
  ACCOUNT_LOCKED: AuthError;
  EMAIL_NOT_VERIFIED: AuthError;
  SSO_PROVIDER_ERROR: AuthError;
  TOKEN_EXPIRED: AuthError;
  INVALID_TOKEN: AuthError;
  EMAIL_ALREADY_EXISTS: AuthError;
  INVALID_PASSWORD: AuthError;
}

// Security Types
export interface SecurityConfig {
  maxLoginAttempts: number;
  lockoutDuration: number;
  tokenExpiration: number;
  refreshTokenExpiration: number;
  passwordMinLength: number;
  requireEmailVerification: boolean;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: string;
  payload: any;
  timestamp: Date;
}

export interface TicketUpdatedEvent extends WebSocketEvent {
  type: 'ticket.updated';
  payload: {
    ticketId: string;
    changes: Partial<Ticket>;
  };
}

// MessageReceivedEvent is defined in events.ts

// Kafka Event Types
export interface KafkaEvent {
  eventType: string;
  tenantId: string;
  payload: any;
  timestamp: Date;
  correlationId?: string;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

// Filter and Query Types
export interface TicketFilters {
  status?: string[];
  priority?: string[];
  assignedAgentId?: string;
  customerId?: string;
  channelId?: string;
  teamId?: string;
  tags?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Onboarding System Types - moved to onboarding-types.ts



// StepConfiguration moved to onboarding-types.ts

// StepResult moved to onboarding-types.ts

// CompletionResult moved to onboarding-types.ts

// Configuration Types
export interface BrandingConfig {
  companyName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fontFamily: string;
  customCSS?: string;
}

export interface ColorScheme {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface ChannelConfig {
  whatsapp?: WhatsAppConfig;
  instagram?: InstagramConfig;
  email?: EmailConfig;
}

// Unified channel configuration types (superset to support all usages)
export interface WhatsAppConfig {
  businessAccountId: string;
  phoneNumberId: string;
  accessToken: string;
  verifyToken?: string; // Preferred token field
  webhookVerifyToken?: string; // Legacy/alternative naming
  webhookUrl?: string;
  enabled?: boolean;
}

export interface InstagramConfig {
  pageId: string;
  accessToken: string;
  appId?: string;
  appSecret?: string;
  verifyToken?: string;
  businessAccountId?: string; // Legacy shape support
  webhookUrl?: string;
  enabled?: boolean;
}

export interface EmailConfig {
  provider: 'gmail' | 'outlook' | 'custom';
  // Top-level SMTP/IMAP fields (used by channel integration)
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  imapHost?: string;
  imapPort?: number;
  username?: string;
  password?: string;
  fromEmail?: string;
  fromName?: string;
  // Nested configs (used by configuration service)
  imapConfig?: IMAPConfig;
  smtpConfig?: SMTPConfig;
  enabled?: boolean;
}

export interface IMAPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
}

export interface AIFeatureConfig {
  ticketClassification: boolean;
  sentimentAnalysis: boolean;
  autoResponse: boolean;
  languageDetection: boolean;
  knowledgeBaseSuggestions: boolean;
  workflowAutomation: boolean;
  customModels: AIModelConfig[];
}

export interface AIModelConfig {
  id: string;
  name: string;
  type: 'classification' | 'sentiment' | 'language' | 'custom';
  configuration: Record<string, any>;
  isActive: boolean;
}

export interface WorkflowConfig {
  name: string;
  description: string;
  triggers: WorkflowTrigger[];
  actions: WorkflowAction[];
  conditions: WorkflowCondition[];
  enabled: boolean;
  priority: number;
}

export interface WorkflowTrigger {
  type: 'ticket_created' | 'message_received' | 'time_based' | 'custom';
  configuration: Record<string, any>;
}

export interface WorkflowAction {
  type: 'assign_agent' | 'send_message' | 'update_status' | 'create_task' | 'custom';
  configuration: Record<string, any>;
}

export interface WorkflowCondition {
  field: string;
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: any;
}

export interface SLARule {
  name: string;
  description: string;
  conditions: WorkflowCondition[];
  responseTime: number; // in minutes
  resolutionTime: number; // in minutes
  escalationPath: string[];
  enabled: boolean;
}

export interface EscalationPath {
  id: string;
  name: string;
  steps: EscalationStep[];
  enabled: boolean;
}

export interface EscalationStep {
  order: number;
  delayMinutes: number;
  action: 'notify_manager' | 'reassign_ticket' | 'change_priority' | 'send_email';
  configuration: Record<string, any>;
}

// Integration Types
export interface IntegrationStatus {
  id: string;
  tenantId: string;
  integrationType: 'whatsapp' | 'instagram' | 'email' | 'stripe' | 'n8n' | 'ai';
  status: 'pending' | 'connected' | 'error' | 'disabled';
  configuration: Record<string, any>;
  lastSyncAt?: Date;
  errorMessage?: string;
  healthCheck: {
    lastCheckedAt: Date;
    isHealthy: boolean;
    responseTime?: number;
  };
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ConnectionTest {
  success: boolean;
  responseTime: number;
  errorMessage?: string;
  details?: Record<string, any>;
}

export interface WebhookStatus {
  isConfigured: boolean;
  url?: string;
  lastVerified?: Date;
  errorMessage?: string;
}

// Template Types
// OnboardingTemplate and WorkflowTemplate moved to template-types.ts to avoid duplicates

export interface FAQTemplate {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  industry: string;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  type: 'welcome' | 'notification' | 'reminder' | 'custom';
  variables: string[];
}

export interface N8NTemplate {
  id: string;
  name: string;
  description: string;
  workflow: Record<string, any>;
  category: string;
  complexity: 'beginner' | 'intermediate' | 'advanced';
}

// AI Model Management Types
export interface AIModelTrainingRequest {
  name: string;
  type: 'classification' | 'sentiment' | 'language' | 'custom';
  configuration: Record<string, any>;
  trainingData: TrainingData;
}

export interface AIModelResponse {
  id: string;
  name: string;
  type: string;
  status: 'training' | 'ready' | 'error' | 'disabled';
  accuracy?: number;
  version: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowAutomationRequest {
  name: string;
  description?: string;
  workflowType: 'n8n' | 'zapier' | 'custom';
  workflowDefinition?: WorkflowDefinition;
  templateId?: string;
}

export interface WorkflowAutomationResponse {
  id: string;
  name: string;
  description?: string;
  workflowType: string;
  workflowId?: string;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AIFeaturesStatusResponse {
  configured: string[];
  available: string[];
  models: ModelStatus[];
  workflows: WorkflowResult[];
  healthCheck: {
    isHealthy: boolean;
    lastCheckedAt: Date;
    errors?: string[];
  };
}

// Knowledge Base Types
export interface KnowledgeBaseArticle {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  aiEmbedding?: any;
  searchScore?: number;
  viewCount: number;
  helpfulCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateArticleRequest {
  title: string;
  content: string;
  category: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
}

export interface ArticleSearchRequest {
  query: string;
  category?: string;
  tags?: string[];
  limit?: number;
  includeUnpublished?: boolean;
}

export interface ArticleSearchResult {
  articles: KnowledgeBaseArticle[];
  totalCount: number;
  searchTime: number;
  suggestions: string[];
}

export interface CategoryStats {
  category: string;
  articleCount: number;
  publishedCount: number;
  totalViews: number;
  averageHelpfulness: number;
}

export interface KnowledgeBaseStats {
  totalArticles: number;
  publishedArticles: number;
  totalViews: number;
  totalHelpfulVotes: number;
  categoriesStats: CategoryStats[];
  popularTags: { tag: string; count: number }[];
  recentActivity: {
    articlesCreated: number;
    articlesUpdated: number;
    viewsThisWeek: number;
  };
}

export interface AIArticleSuggestion {
  title: string;
  content: string;
  category: string;
  tags: string[];
  confidence: number;
  reasoning: string;
}

export interface KnowledgeBaseSetupRequest {
  initialCategories: string[];
  defaultArticles: CreateArticleRequest[];
  enableAISuggestions: boolean;
  enableSearch: boolean;
  publicAccess: boolean;
}

// Stripe Payment Types
export interface StripeAccountSetupRequest {
  email: string;
  country: string;
  businessType: 'individual' | 'company';
  businessProfile?: {
    name?: string;
    url?: string;
    mcc?: string;
    productDescription?: string;
  };
}

export interface StripeAccountInfo {
  id: string;
  email?: string;
  country?: string;
  defaultCurrency?: string;
  businessType?: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  requirements: {
    currentlyDue: string[];
    eventuallyDue: string[];
    pastDue: string[];
    pendingVerification: string[];
  };
  capabilities: Record<string, string>;
}

export interface PaymentStatus {
  isConfigured: boolean;
  accountId?: string;
  payoutsEnabled: boolean;
  chargesEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: string[];
  errorMessage?: string;
}

export interface PaymentIntentRequest {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  receiptEmail?: string;
  metadata?: Record<string, string>;
}

export interface BillingConfigurationRequest {
  currency: string;
  taxRate?: number;
  invoicePrefix?: string;
  paymentTerms?: number;
  autoCharge?: boolean;
  lateFeeRate?: number;
  reminderDays?: number[];
}

export interface BillingConfiguration {
  id: string;
  tenantId: string;
  currency: string;
  taxRate?: number;
  invoicePrefix: string;
  paymentTerms: number;
  autoCharge: boolean;
  lateFeeRate?: number;
  reminderDays: number[];
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentSetupRequest {
  stripeAccount: StripeAccountSetupRequest;
  billingConfiguration: BillingConfigurationRequest;
  enableAutomaticPayouts: boolean;
  enableCustomerPortal: boolean;
}

// Team Management Types
export interface CreateTeamRequest {
  name: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
}

export interface UpdateTeamRequest {
  name?: string;
  description?: string;
  color?: string;
  isDefault?: boolean;
}

export interface TeamInfo {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  color?: string;
  isDefault: boolean;
  memberCount: number;
  activeMembers: number;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  members?: TeamMemberInfo[];
}

export interface TeamMemberInfo {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    status: string;
  };
  role: string;
  permissions: string[];
  skills: string[];
  availability?: Record<string, any>;
  isActive: boolean;
  joinedAt: Date;
  performanceMetrics?: {
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
  };
}

export interface AddTeamMemberRequest {
  userId: string;
  role?: 'member' | 'lead' | 'admin';
  permissions?: string[];
  skills?: string[];
  availability?: Record<string, any>;
}

export interface UpdateTeamMemberRequest {
  role?: 'member' | 'lead' | 'admin';
  permissions?: string[];
  skills?: string[];
  availability?: Record<string, any>;
  isActive?: boolean;
}

export interface TeamStats {
  totalTeams: number;
  totalMembers: number;
  activeMembers: number;
  averageTeamSize: number;
  teamPerformance: {
    teamId: string;
    teamName: string;
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    memberCount: number;
  }[];
}

// Invitation Types
export interface SendInvitationRequest {
  email: string;
  role: 'agent' | 'admin' | 'manager';
  teamIds?: string[];
  permissions?: string[];
  customMessage?: string;
  templateId?: string;
}

export interface InvitationInfo {
  id: string;
  tenantId: string;
  inviterUserId: string;
  inviter: {
    firstName: string;
    lastName: string;
    email: string;
  };
  email: string;
  role: string;
  token: string;
  status: string;
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  teamIds?: string[];
  permissions?: string[];
  customMessage?: string;
}

export interface AcceptInvitationRequest {
  token: string;
  firstName: string;
  lastName: string;
  password?: string;
}

export interface InvitationStats {
  totalSent: number;
  totalAccepted: number;
  totalPending: number;
  totalExpired: number;
  acceptanceRate: number;
  recentInvitations: InvitationInfo[];
}

// Agent Profile Types
export interface CreateAgentProfileRequest {
  userId: string;
  displayName?: string;
  bio?: string;
  skills?: string[];
  languages?: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  maxConcurrentTickets?: number;
  autoAssign?: boolean;
  notificationSettings?: Record<string, any>;
}

export interface UpdateAgentProfileRequest {
  displayName?: string;
  bio?: string;
  skills?: string[];
  languages?: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  availability?: 'available' | 'busy' | 'away' | 'offline';
  maxConcurrentTickets?: number;
  autoAssign?: boolean;
  notificationSettings?: Record<string, any>;
}

export interface AgentProfileInfo {
  id: string;
  userId: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    status: string;
  };
  displayName?: string;
  bio?: string;
  skills: string[];
  languages: string[];
  timezone?: string;
  workingHours?: Record<string, { start: string; end: string }>;
  availability: string;
  maxConcurrentTickets: number;
  autoAssign: boolean;
  notificationSettings: Record<string, any>;
  performanceMetrics: {
    ticketsAssigned: number;
    ticketsCompleted: number;
    averageResolutionTime: number;
    customerSatisfaction: number;
    responseTime: number;
    activeTickets: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamManagementSetupRequest {
  teams: CreateTeamRequest[];
  invitations: SendInvitationRequest[];
  agentProfiles: CreateAgentProfileRequest[];
  enableAutoAssignment: boolean;
  enablePerformanceTracking: boolean;
}

export interface CustomTemplate {
  name: string;
  description: string;
  category: string;
  templateData: Record<string, any>;
}

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  templateData: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// Smart Defaults and Suggestions
export interface SmartDefaults {
  branding: Partial<BrandingConfig>;
  channels: Partial<ChannelConfig>;
  workflows: WorkflowTemplate[];
  faqs: FAQTemplate[];
  aiFeatures: Partial<AIFeatureConfig>;
}

export interface ConfigurationSuggestion {
  field: string;
  suggestedValue: any;
  reason: string;
  confidence: number;
}

// OnboardingContext moved to onboarding-types.ts

// Request/Response Types for Onboarding - StartOnboardingRequest moved to onboarding-types.ts

// UpdateStepRequest and OnboardingStatusResponse moved to onboarding-types.ts

// Stripe Integration Types
export interface StripeConfig {
  accountId: string;
  publicKey: string;
  secretKey: string;
  webhookSecret: string;
}

export interface StripeAccount {
  id: string;
  email: string;
  country: string;
  defaultCurrency: string;
  detailsSubmitted: boolean;
  payoutsEnabled: boolean;
}

export interface PaymentStatus {
  isConfigured: boolean;
  accountId?: string;
  payoutsEnabled: boolean;
  errorMessage?: string;
}

export interface BillingConfig {
  currency: string;
  taxRate?: number;
  invoicePrefix: string;
  paymentTerms: number;
  autoCharge: boolean;
}

// N8N Integration Types
export interface WorkflowDefinition {
  name: string;
  description: string;
  nodes: Record<string, any>[];
  connections: Record<string, unknown>;
  settings: Record<string, unknown>;
}

export interface WorkflowResult {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

export interface ActivationResult {
  success: boolean;
  workflowId: string;
  errorMessage?: string;
}

// AI/ML Integration Types
export interface TrainingData {
  type: 'classification' | 'sentiment' | 'language';
  data: Record<string, unknown>[];
  labels?: string[];
}

export interface ModelStatus {
  id: string;
  status: 'training' | 'ready' | 'error';
  accuracy?: number;
  errorMessage?: string;
}

export interface TrainingConfig {
  modelType: string;
  parameters: Record<string, unknown>;
  validationSplit: number;
}

export interface ModelInitResult {
  success: boolean;
  modelId: string;
  errorMessage?: string;
}

export interface TrainingResult {
  success: boolean;
  trainingId: string;
  estimatedCompletion: Date;
  errorMessage?: string;
}

// AI-Enhanced Ticket Management Types
export interface TicketTimelineEvent {
  id: string;
  ticketId: string;
  userId?: string;
  eventType: 'created' | 'updated' | 'assigned' | 'resolved' | 'commented' | 'status_changed' | 'priority_changed';
  description: string;
  oldValue?: any;
  newValue?: any;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface TicketCollaboration {
  id: string;
  ticketId: string;
  userId: string;
  action: 'viewing' | 'typing' | 'editing' | 'commenting';
  metadata: Record<string, any>;
  startedAt: Date;
  endedAt?: Date;
  isActive: boolean;
}

export interface TicketAIAnalysis {
  id: string;
  ticketId: string;
  classification?: {
    category: string;
    subcategory: string;
    confidence: number;
  };
  sentiment?: {
    score: number;
    label: string;
    confidence: number;
  };
  priority?: {
    suggested: string;
    confidence: number;
    reasoning: string;
  };
  suggestedResponses: Array<{
    content: string;
    confidence: number;
    type: 'template' | 'generated';
  }>;
  knowledgeBaseSuggestions: Array<{
    articleId: string;
    title: string;
    relevanceScore: number;
    excerpt: string;
  }>;
  escalationRecommendation?: {
    shouldEscalate: boolean;
    reason: string;
    suggestedAgent?: string;
    urgencyLevel: number;
  };
  languageDetection?: {
    language: string;
    confidence: number;
  };
  keyPhrases: string[];
  entities: Array<{
    text: string;
    type: string;
    confidence: number;
  }>;
  urgencyScore?: number;
  complexityScore?: number;
  estimatedResolutionTime?: number;
  similarTickets: Array<{
    ticketId: string;
    similarity: number;
    reason: string;
  }>;
  automationTriggers: Array<{
    triggerId: string;
    confidence: number;
    action: string;
  }>;
  lastAnalyzedAt: Date;
  analysisVersion: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketSearch {
  id: string;
  ticketId: string;
  searchableText: string;
  keywords: string[];
  searchVector?: string;
  aiEmbedding?: number[];
  lastIndexedAt: Date;
  indexVersion: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// --------------------------------------------------
// CRM Types
// --------------------------------------------------

export interface Lead {
  id: string;
  tenantId: string;
  customerId?: string;
  email: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
  source: string;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CONVERTED' | 'LOST';
  score: number;
  scoreReason?: Record<string, any>;
  assignedUserId?: string;
  tags: string[];
  customFields: Record<string, any>;
  lastActivityAt?: Date;
  convertedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LeadActivity {
  id: string;
  leadId: string;
  userId?: string;
  type: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface SalesPipeline {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  stages: Array<{ id: string; name: string; probability?: number; order: number }>;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deal {
  id: string;
  tenantId: string;
  leadId?: string;
  customerId?: string;
  name: string;
  description?: string;
  value: number;
  currency: string;
  probability: number;
  stage: string;
  pipelineId: string;
  assignedUserId?: string;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  lostReason?: string;
  tags: string[];
  customFields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealActivity {
  id: string;
  dealId: string;
  userId?: string;
  type: string;
  description: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

export interface Product {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  price: number;
  currency: string;
  isActive: boolean;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface DealProduct {
  id: string;
  dealId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface CustomerSegment {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  criteria: Record<string, any>;
  isActive: boolean;
  isDynamic: boolean;
  customerCount: number;
  lastCalculated?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSegmentMembership {
  id: string;
  segmentId: string;
  customerId: string;
  addedAt: Date;
}

export interface MarketingCampaign {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: 'EMAIL' | 'SMS' | 'SOCIAL' | 'WEBINAR' | 'CONTENT' | 'PAID_ADS';
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  segmentId?: string;
  startDate?: Date;
  endDate?: Date;
  budget?: number;
  spent: number;
  metrics: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CampaignVariant {
  id: string;
  campaignId: string;
  name: string;
  weight: number;
  subject?: string;
  content: Record<string, any>;
  metrics: Record<string, any>;
  createdAt: Date;
}

export interface CampaignDelivery {
  id: string;
  campaignId: string;
  variantId?: string;
  customerId: string;
  channel: 'email' | 'whatsapp' | 'instagram' | 'sms';
  status: 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'failed' | 'bounced';
  errorMessage?: string;
  scheduledAt?: Date;
  sentAt?: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  messageId?: string;
  metadata: Record<string, any>;
  createdAt: Date;
}

// Integrations
export interface IntegrationConnectorDTO {
  id: string;
  tenantId: string;
  provider: 'salesforce' | 'hubspot' | string;
  status: 'disconnected' | 'connected' | 'error' | 'disabled';
  config: Record<string, unknown>;
  lastSyncAt?: string | Date | null;
  lastError?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface IntegrationSyncLogDTO {
  id: string;
  tenantId: string;
  connectorId: string;
  direction: 'outbound' | 'inbound';
  entity: string;
  status: 'success' | 'failed' | 'partial';
  stats: Record<string, unknown>;
  errorMessage?: string;
  startedAt?: string | Date;
  completedAt?: string | Date;
}

// Marketing DTOs
export interface CreateMarketingCampaignDto {
  name: string;
  description?: string;
  type: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'INSTAGRAM' | 'SOCIAL' | 'WEBINAR' | 'CONTENT' | 'PAID_ADS';
  status?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  segmentId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  budget?: number;
  subject?: string;
  content?: Record<string, any>;
}

export interface UpdateMarketingCampaignDto {
  name?: string;
  description?: string;
  type?: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'INSTAGRAM' | 'SOCIAL' | 'WEBINAR' | 'CONTENT' | 'PAID_ADS';
  status?: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  segmentId?: string;
  startDate?: string | Date;
  endDate?: string | Date;
  budget?: number;
  subject?: string;
  content?: Record<string, any>;
}

export interface CreateCampaignVariantDto {
  name: string;
  weight?: number;
  subject?: string;
  content?: Record<string, any>;
}

export interface UpdateCampaignVariantDto {
  name?: string;
  weight?: number;
  subject?: string;
  content?: Record<string, any>;
}

export interface CampaignPerformanceMetrics {
  totalOpens: number;
  totalClicks: number;
  totalConversions: number;
  roi?: number;
  trend?: Array<{ date: string; opens: number; clicks: number; conversions: number }>;
}

// AI Service Request/Response Types
export interface AnalyzeTicketRequest {
  ticketId: string;
  content: string;
  includeClassification?: boolean;
  includeSentiment?: boolean;
  includePriority?: boolean;
  includeSuggestions?: boolean;
  includeKnowledgeBase?: boolean;
}

export interface AnalyzeTicketResponse {
  ticketId: string;
  analysis: TicketAIAnalysis;
  processingTime: number;
  confidence: number;
}

export interface SearchTicketsRequest {
  query: string;
  filters?: {
    status?: string[];
    priority?: string[];
    assignedAgentId?: string;
    customerId?: string;
    dateRange?: {
      start: Date;
      end: Date;
    };
  };
  useSemanticSearch?: boolean;
  limit?: number;
  offset?: number;
}

export interface SearchTicketsResponse {
  tickets: Array<{
    ticket: Ticket;
    relevanceScore: number;
    matchedFields: string[];
    highlights: Record<string, string[]>;
  }>;
  total: number;
  searchTime: number;
  suggestions?: string[];
}

export interface CollaborationEvent {
  type: 'user_joined' | 'user_left' | 'typing_start' | 'typing_stop' | 'editing_start' | 'editing_stop';
  userId: string;
  ticketId: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface TimelineEventRequest {
  ticketId: string;
  eventType: string;
  description: string;
  oldValue?: any;
  newValue?: any;
  metadata?: Record<string, any>;
}

// Enhanced AI Configuration Types
export interface EnhancedAIFeatureConfig extends AIFeatureConfig {
  realTimeAnalysis: boolean;
  collaborativeFeatures: boolean;
  advancedSearch: boolean;
  timelineTracking: boolean;
  semanticSearch: boolean;
  multiLanguageSupport: boolean;
  customModelTraining: boolean;
}

export interface AIAnalysisConfig {
  enableClassification: boolean;
  enableSentiment: boolean;
  enablePriorityPrediction: boolean;
  enableResponseSuggestions: boolean;
  enableKnowledgeBaseSuggestions: boolean;
  enableEscalationRecommendations: boolean;
  enableLanguageDetection: boolean;
  enableEntityExtraction: boolean;
  enableSimilarTicketDetection: boolean;
  confidenceThreshold: number;
  analysisTimeout: number;
}

export interface SearchConfig {
  enableSemanticSearch: boolean;
  enableFullTextSearch: boolean;
  indexingBatchSize: number;
  searchTimeout: number;
  maxResults: number;
  highlightEnabled: boolean;
  suggestionEnabled: boolean;
}

// Channel Integration Types
export enum ChannelType {
  EMAIL = 'email',
  WHATSAPP = 'whatsapp',
  INSTAGRAM = 'instagram',
  FACEBOOK = 'facebook',
  CHAT = 'chat',
  PHONE = 'phone'
}

export interface ChannelConnectionStatus {
  channelId: string;
  type: ChannelType;
  status: 'connected' | 'error' | 'pending';
  message: string;
  webhookUrl?: string;
  lastTested: Date;
}

export interface WebhookConfig {
  url: string;
  verifyToken: string;
  secret?: string;
}

// Updated Channel Configuration Types
// (Removed duplicate interfaces; unified versions are defined earlier in file.)

// OnboardingError and OnboardingErrors moved to onboarding-types.ts
