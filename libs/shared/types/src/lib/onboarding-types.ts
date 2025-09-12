// Onboarding Types and Enums for Two-Tier System

export enum OnboardingType {
  TENANT_SETUP = 'tenant_setup',
  AGENT_WELCOME = 'agent_welcome'
}

export enum OnboardingRole {
  TENANT_ADMIN = 'tenant_admin',
  AGENT = 'agent'
}

export enum TenantSetupStep {
  WELCOME = 'welcome',
  ORGANIZATION_SETUP = 'organization_setup',
  CHANNEL_CONFIGURATION = 'channel_configuration',
  AI_CONFIGURATION = 'ai_configuration',
  KNOWLEDGE_BASE = 'knowledge_base',
  PAYMENT_SETUP = 'payment_setup',
  TEAM_MANAGEMENT = 'team_management',
  WORKFLOW_CONFIGURATION = 'workflow_configuration',
  CUSTOMER_PORTAL = 'customer_portal',
  DATA_IMPORT = 'data_import',
  ANALYTICS_SETUP = 'analytics_setup'
}

export enum AgentWelcomeStep {
  WELCOME = 'welcome',
  PROFILE_SETUP = 'profile_setup',
  TEAM_ASSIGNMENT = 'team_assignment',
  PERMISSIONS_OVERVIEW = 'permissions_overview',
  FEATURE_TOUR = 'feature_tour',
  TEST_TICKET = 'test_ticket',
  NOTIFICATION_PREFERENCES = 'notification_preferences',
  QUICK_START = 'quick_start'
}

// Union type for all steps
export type OnboardingStep = TenantSetupStep | AgentWelcomeStep;

// Enhanced onboarding session interface
export interface OnboardingSession {
  id: string;
  userId: string;
  tenantId: string;
  type: OnboardingType;
  role: OnboardingRole;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  stepData: Record<string, unknown>;
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
  metadata: Record<string, unknown>;
}

// Enhanced progress interface
export interface OnboardingProgress {
  totalSteps: number;
  completedSteps: number;
  currentStep: OnboardingStep;
  progressPercentage: number;
  estimatedTimeRemaining: number;
  nextRecommendedAction: string;
  type: OnboardingType;
  role: OnboardingRole;
}

// Tenant setup completion status
export interface TenantSetupStatus {
  isCompleted: boolean;
  completedAt?: Date;
  completedBy?: string;
  completedSteps: TenantSetupStep[];
  missingSteps: TenantSetupStep[];
  progressPercentage: number;
}

// Agent welcome status
export interface AgentWelcomeStatus {
  isCompleted: boolean;
  completedAt?: Date;
  completedSteps: AgentWelcomeStep[];
  missingSteps: AgentWelcomeStep[];
  progressPercentage: number;
  assignedTeam?: string;
  permissions: string[];
}

// Step configuration for tenant setup
export interface TenantSetupStepConfiguration {
  id: TenantSetupStep;
  title: string;
  description: string;
  isRequired: boolean;
  estimatedTime: number; // in minutes
  dependencies: TenantSetupStep[];
  validationRules: Record<string, unknown>;
  category: 'setup' | 'integration' | 'configuration' | 'optional';
}

// Step configuration for agent welcome
export interface AgentWelcomeStepConfiguration {
  id: AgentWelcomeStep;
  title: string;
  description: string;
  isRequired: boolean;
  estimatedTime: number; // in minutes
  dependencies: AgentWelcomeStep[];
  validationRules: Record<string, unknown>;
  category: 'welcome' | 'setup' | 'training' | 'optional';
}

// Union type for step configurations
export type StepConfiguration = TenantSetupStepConfiguration | AgentWelcomeStepConfiguration;

// Enhanced start onboarding request
export interface StartOnboardingRequest {
  type: OnboardingType;
  role: OnboardingRole;
  context?: {
    industry?: string;
    companySize?: string;
    existingTools?: string[];
    invitedBy?: string; // For agents
    teamId?: string; // For agents
  };
}

// Update step request
export interface UpdateStepRequest {
  stepId: OnboardingStep;
  data: Record<string, unknown>;
}

// Enhanced step result
export interface StepResult {
  success: boolean;
  data?: Record<string, unknown>;
  nextStep?: OnboardingStep;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

// Enhanced completion result
export interface CompletionResult {
  success: boolean;
  completedAt: Date;
  summary: {
    totalTime: number; // in minutes
    stepsCompleted: number;
    featuresEnabled: string[];
    type: OnboardingType;
    role: OnboardingRole;
  };
  nextActions?: string[];
  redirectUrl?: string;
}

// Agent invitation context
export interface AgentInvitationContext {
  invitedBy: string;
  teamId?: string;
  role: string;
  permissions: string[];
  tenantName: string;
  welcomeMessage?: string;
}

// Tenant setup completion event
export interface TenantSetupCompletedEvent {
  tenantId: string;
  completedBy: string;
  completedAt: Date;
  featuresEnabled: string[];
  nextSteps: string[];
}

// Agent onboarding completed event
export interface AgentOnboardingCompletedEvent {
  userId: string;
  tenantId: string;
  teamId?: string;
  completedAt: Date;
  assignedPermissions: string[];
}
