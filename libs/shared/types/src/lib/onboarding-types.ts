/**
 * Onboarding Types
 * Shared types for the onboarding system
 */

export type OnboardingType = 'tenant_setup' | 'agent_welcome';
export type OnboardingRole = 'tenant_admin' | 'agent';

// Tenant Admin Steps
export const TENANT_STEPS = [
  'welcome',
  'industry',
  'stripe',
  'channels',
  'team',
  'knowledge-base',
  'ai-features',
  'workflows',
  'complete',
] as const;

// Agent Steps
export const AGENT_STEPS = [
  'profile',
  'tour',
  'sample-ticket',
  'knowledge-base-intro',
  'notifications',
] as const;

export type TenantStep = typeof TENANT_STEPS[number];
export type AgentStep = typeof AGENT_STEPS[number];
export type OnboardingStep = TenantStep | AgentStep;

export interface StartOnboardingRequest {
  type: OnboardingType;
  role: OnboardingRole;
  metadata?: Record<string, unknown>;
}

export interface UpdateStepRequest {
  stepId: OnboardingStep;
  data: Record<string, unknown>;
}

export interface OnboardingSession {
  id: string;
  userId: string;
  tenantId: string;
  type: OnboardingType;
  role: OnboardingRole;
  currentStep: string;
  completedSteps: string[];
  stepData: Record<string, unknown>;
  status: string;
  progress: number;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

export interface OnboardingProgress {
  sessionId: string;
  currentStep: string;
  completedSteps: string[];
  totalSteps: number;
  progress: number;
  estimatedCompletion?: Date;
}

export interface OnboardingStatusResponse {
  session: OnboardingSession | null;
  hasActiveSession: boolean;
}

export interface StepResult {
  success: boolean;
  session: OnboardingSession;
  nextStep?: string;
  message?: string;
}

export interface CompletionResult {
  success: boolean;
  message: string;
  redirectUrl?: string;
}

export interface StepConfiguration {
  stepId: OnboardingStep;
  title: string;
  description: string;
  isRequired: boolean;
  canSkip: boolean;
  estimatedTime: number; // in minutes
  dependencies: OnboardingStep[];
  validation?: {
    required: string[];
    optional: string[];
  };
}

// Two-tier onboarding status types
export interface TenantSetupStatus {
  isComplete: boolean;
  completedSteps: string[];
  currentStep?: string;
  progress: number;
  lastActivityAt?: Date;
  completedAt?: Date;
}

export interface AgentWelcomeStatus {
  isComplete: boolean;
  completedSteps: string[];
  currentStep?: string;
  progress: number;
  lastActivityAt?: Date;
  completedAt?: Date;
}

export interface AgentInvitationContext {
  invitationToken: string;
  inviterName: string;
  tenantName: string;
  role: string;
  teamName?: string;
}
