/**
 * Onboarding Store
 * Zustand store for managing onboarding state
 */

import { create } from 'zustand';
import { onboardingAPI } from '../api/onboarding';
import type { OnboardingStep as SharedOnboardingStep } from '@glavito/shared-types';
import { useAuthStore } from './auth-store';

export type OnboardingType = 'tenant_setup' | 'agent_welcome';
export type OnboardingRole = 'tenant_admin' | 'agent';
export type OnboardingStep = SharedOnboardingStep;

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
}

interface OnboardingStore {
  // Session state
  session: OnboardingSession | null;
  currentStepIndex: number;
  totalSteps: number;
  steps: readonly string[];
  
  // Step data
  stepData: Record<string, unknown>;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initialize: () => Promise<void>;
  startOnboarding: (type: OnboardingType, role: OnboardingRole) => Promise<void>;
  nextStep: () => Promise<void>;
  prevStep: () => void;
  goToStep: (stepIndex: number) => void;
  saveStepData: (stepId: OnboardingStep, data: Record<string, unknown>) => Promise<void>;
  skipStep: (stepId: OnboardingStep) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  pauseOnboarding: () => Promise<void>;
  resumeOnboarding: () => Promise<void>;
  reset: () => void;
  
  // Helper getters
  getCurrentStep: () => string;
  isFirstStep: () => boolean;
  isLastStep: () => boolean;
  canGoNext: () => boolean;
  canGoPrev: () => boolean;
}

// Tenant Admin Steps
const TENANT_STEPS = [
  'welcome',
  'stripe',
  'channels',
  'team',
  'knowledge-base',
  'ai-features',
  'workflows',
  'complete',
] as const;

// Agent Steps
const AGENT_STEPS = [
  'profile',
  'tour',
  'sample-ticket',
  'knowledge-base-intro',
  'notifications',
] as const;

export const useOnboardingStore = create<OnboardingStore>((set, get) => ({
  // Initial state
  session: null,
  currentStepIndex: 0,
  totalSteps: 0,
  steps: [],
  stepData: {},
  isLoading: false,
  error: null,
  
  // Initialize from existing session
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await onboardingAPI.getOnboardingStatus();
      const session = status?.session || null;

      if (session) {
        const steps = session.type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
        const stepsArray = steps as readonly string[];
        const currentStepIndex = stepsArray.indexOf(session.currentStep) !== -1 ? stepsArray.indexOf(session.currentStep) : 0;

        set({
          session,
          currentStepIndex,
          totalSteps: steps.length,
          steps,
          stepData: session.stepData,
          isLoading: false,
        });
      } else {
        // Determine onboarding type for new session
        const typeInfo = await onboardingAPI.getOnboardingType();
        const steps = typeInfo.type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
        
        set({
          totalSteps: steps.length,
          steps,
          isLoading: false,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to initialize onboarding';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  
  // Start new onboarding session
  startOnboarding: async (type: OnboardingType, role: OnboardingRole) => {
    set({ isLoading: true, error: null });
    try {
      console.log('[OnboardingStore] Starting onboarding with type:', type, 'role:', role);
      const session = await onboardingAPI.startOnboardingWithType(type, role);
      console.log('[OnboardingStore] Session started successfully:', session);
      const steps = type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
      
      set({
        session,
        currentStepIndex: 0,
        totalSteps: steps.length,
        steps,
        stepData: session.stepData,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to start onboarding';
      console.error('[OnboardingStore] Failed to start:', error);
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  
  // Navigate to next step
  nextStep: async () => {
    const { session, currentStepIndex, steps, stepData } = get();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    if (currentStepIndex >= steps.length - 1) {
      // Last step - complete onboarding
      await get().completeOnboarding();
      return;
    }
    
    const currentStep = steps[currentStepIndex];
    const currentStepData = stepData[currentStep];
    
    set({ isLoading: true, error: null });
    try {
      // Save current step data
      if (currentStepData) {
        const stepId = (currentStep as OnboardingStep);
        const result = await onboardingAPI.updateStep(session.id, stepId, currentStepData);
        set({
          session: result.session,
          stepData: result.session.stepData,
        });
      }
      
      // Move to next step
      set({
        currentStepIndex: currentStepIndex + 1,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to proceed to next step';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  
  // Navigate to previous step
  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },
  
  // Go to specific step
  goToStep: (stepIndex: number) => {
    const { totalSteps, session } = get();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    if (stepIndex >= 0 && stepIndex < totalSteps) {
      set({ currentStepIndex: stepIndex });
    }
  },
  
  // Save step data
  saveStepData: async (stepId: OnboardingStep, data: Record<string, unknown>) => {
    const { session, stepData } = get();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    // Update local step data immediately
    set({
      stepData: {
        ...stepData,
        [stepId as string]: data,
      },
    });
    
    // Optionally save to backend (debounced in real implementation)
    try {
      const result = await onboardingAPI.updateStep(session.id, stepId, data);
      set({
        session: result.session,
        stepData: result.session.stepData,
      });
    } catch (error: unknown) {
      console.error('Failed to save step data:', error);
      // Don't throw - allow local editing to continue
    }
  },
  
  // Skip current step
  skipStep: async (stepId: OnboardingStep) => {
    const { session, currentStepIndex } = get();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    set({ isLoading: true, error: null });
    try {
      const result = await onboardingAPI.skipStep(session.id, stepId);
      set({
        session: result.session,
        currentStepIndex: currentStepIndex + 1,
        stepData: result.session.stepData,
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to skip step';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  
  // Complete onboarding
  completeOnboarding: async () => {
    const { session } = get();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    set({ isLoading: true, error: null });
    try {
      await onboardingAPI.completeOnboarding(session.id);
      set({
        session: { ...session, status: 'completed', completedAt: new Date() },
        isLoading: false,
      });
      // Mark user as having completed onboarding to avoid redirect loops
      try {
        useAuthStore.getState().updateUser({ onboardingCompleted: true });
      } catch {
        // noop – do not block completion on store update failure
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to complete onboarding';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  
  // Pause onboarding
  pauseOnboarding: async () => {
    const { session } = get();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    set({ isLoading: true, error: null });
    try {
      await onboardingAPI.pauseOnboarding(session.id);
      set({
        session: { ...session, status: 'paused' },
        isLoading: false,
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to pause onboarding';
      set({ error: message, isLoading: false });
      throw error;
    }
  },
  
  // Resume onboarding
  resumeOnboarding: async () => {
    const { session } = get();
    
    if (!session) {
      throw new Error('No active session');
    }
    
    try {
      const resumed = await onboardingAPI.resumeOnboarding(session.id);
      set({ session: resumed });
    } catch (error: unknown) {
      console.error('Failed to resume onboarding:', error);
    }
  },
  
  // Reset store
  reset: () => {
    set({
      session: null,
      currentStepIndex: 0,
      totalSteps: 0,
      steps: [],
      stepData: {},
      isLoading: false,
      error: null,
    });
  },
  
  // Helper methods
  getCurrentStep: () => {
    const { steps, currentStepIndex } = get();
    return steps[currentStepIndex] || '';
  },
  
  isFirstStep: () => {
    return get().currentStepIndex === 0;
  },
  
  isLastStep: () => {
    const { currentStepIndex, totalSteps } = get();
    return currentStepIndex >= totalSteps - 1;
  },
  
  canGoNext: () => {
    const { currentStepIndex, totalSteps } = get();
    return currentStepIndex < totalSteps - 1;
  },
  
  canGoPrev: () => {
    return get().currentStepIndex > 0;
  },
}));
