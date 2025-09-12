import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { 
  OnboardingSession, 
  OnboardingProgress, 
  OnboardingStep,
  StepConfiguration,
  CompletionResult,
  OnboardingType,
  OnboardingRole,
  StartOnboardingRequest,
} from '@glavito/shared-types';
import { onboardingAPI } from '@/lib/api/onboarding';

interface OnboardingState {
  // State
  session: OnboardingSession | null;
  progress: OnboardingProgress | null;
  currentStepConfig: StepConfiguration | null;
  isLoading: boolean;
  error: string | null;
  isInitialized: boolean;
  onboardingType: OnboardingType | null;
  onboardingRole: OnboardingRole | null;

  // Actions
  initializeOnboarding: () => Promise<void>;
  startOnboarding: (request?: StartOnboardingRequest) => Promise<void>;
  startOnboardingWithType: (type: OnboardingType, role: OnboardingRole, request?: StartOnboardingRequest) => Promise<void>;
  updateStep: (stepId: OnboardingStep, data: Record<string, unknown>) => Promise<void>;
  pauseOnboarding: () => Promise<void>;
  resumeOnboarding: () => Promise<void>;
  completeOnboarding: () => Promise<CompletionResult>;
  setCurrentStep: (step: OnboardingStep) => Promise<void>;
  clearError: () => void;
  reset: () => void;
  getOnboardingType: () => Promise<{ type: OnboardingType; role: OnboardingRole; isTenantOwner: boolean }>;
}

const initialState = {
  session: null,
  progress: null,
  currentStepConfig: null,
  isLoading: false,
  error: null,
  isInitialized: false,
  onboardingType: null,
  onboardingRole: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        initializeOnboarding: async () => {
          const { isInitialized, isLoading, session, progress } = get();

          // Only skip if a fetch is in-flight OR we already have valid data
          if (isLoading) return;
          if (isInitialized && session && progress) return;

          set({ isLoading: true, error: null });

          try {
            // First, determine the onboarding type and role
            const typeInfo = await onboardingAPI.getOnboardingType();
            
            // Get onboarding status
            const statusResponse = await onboardingAPI.getOnboardingStatus();
            
            // Get current step configuration
            let currentStepConfig = null as StepConfiguration | null;
            if (statusResponse.session.status === 'active') {
              try {
                currentStepConfig = await onboardingAPI.getStepConfiguration(
                  statusResponse.session.currentStep,
                  typeInfo.type
                );
              } catch (error) {
                console.warn('Failed to load step configuration:', error);
              }
            }

            set({
              session: statusResponse.session,
              progress: statusResponse.progress,
              currentStepConfig,
              onboardingType: typeInfo.type,
              onboardingRole: typeInfo.role,
              isLoading: false,
              isInitialized: true,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to initialize onboarding',
              isLoading: false,
              // Mark initialized to prevent infinite spinners; UI can offer retry
              isInitialized: true,
            });
          }
        },

        startOnboarding: async (request) => {
          set({ isLoading: true, error: null });

          try {
            const session = await onboardingAPI.startOnboarding(request);
            const progress = await onboardingAPI.getProgress(session.id);
            
            let currentStepConfig = null as StepConfiguration | null;
            try {
              currentStepConfig = await onboardingAPI.getStepConfiguration(
                session.currentStep,
                session.type
              );
            } catch (error) {
              console.warn('Failed to load step configuration:', error);
            }

            set({
              session,
              progress,
              currentStepConfig,
              onboardingType: session.type,
              onboardingRole: session.role,
              isLoading: false,
              isInitialized: true,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to start onboarding',
              isLoading: false,
            });
          }
        },

        startOnboardingWithType: async (type, role, request) => {
          set({ isLoading: true, error: null });

          try {
            const session = await onboardingAPI.startOnboardingWithType(type, role, request);
            const progress = await onboardingAPI.getProgress(session.id);
            
            let currentStepConfig = null as StepConfiguration | null;
            try {
              currentStepConfig = await onboardingAPI.getStepConfiguration(
                session.currentStep,
                session.type
              );
            } catch (error) {
              console.warn('Failed to load step configuration:', error);
            }

            set({
              session,
              progress,
              currentStepConfig,
              onboardingType: session.type,
              onboardingRole: session.role,
              isLoading: false,
              isInitialized: true,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to start onboarding',
              isLoading: false,
            });
          }
        },

        updateStep: async (stepId, data) => {
          const { session } = get();
          if (!session) {
            throw new Error('No active onboarding session');
          }

          set({ isLoading: true, error: null });

          try {
            const result = await onboardingAPI.updateStep(session.id, stepId, data);
            
            if (!result.success) {
              throw new Error(result.errors?.join(', ') || 'Failed to update step');
            }

            // Fetch updated session and progress from backend
            const statusResponse = await onboardingAPI.getOnboardingStatus();
            const updatedSession = statusResponse.session;
            const updatedProgress = statusResponse.progress;

            // Get next step configuration
            let currentStepConfig = null as StepConfiguration | null;
            if (result.nextStep) {
              try {
                currentStepConfig = await onboardingAPI.getStepConfiguration(
                  result.nextStep,
                  session.type
                );
              } catch (error) {
                console.warn('Failed to load next step configuration:', error);
              }
            }

            set({
              session: updatedSession,
              progress: updatedProgress,
              currentStepConfig,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to update step',
              isLoading: false,
            });
            throw error;
          }
        },

        pauseOnboarding: async () => {
          const { session } = get();
          if (!session) return;

          set({ isLoading: true, error: null });

          try {
            await onboardingAPI.pauseOnboarding(session.id);
            
            set({
              session: { ...session, status: 'paused' } as OnboardingSession,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to pause onboarding',
              isLoading: false,
            });
          }
        },

        resumeOnboarding: async () => {
          const { session } = get();
          if (!session) return;

          set({ isLoading: true, error: null });

          try {
            const resumedSession = await onboardingAPI.resumeOnboarding(session.id);
            const progress = await onboardingAPI.getProgress(resumedSession.id);
            
            let currentStepConfig = null as StepConfiguration | null;
            try {
              currentStepConfig = await onboardingAPI.getStepConfiguration(
                resumedSession.currentStep,
                resumedSession.type
              );
            } catch (error) {
              console.warn('Failed to load step configuration:', error);
            }

            set({
              session: resumedSession,
              progress,
              currentStepConfig,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to resume onboarding',
              isLoading: false,
            });
          }
        },

        completeOnboarding: async () => {
          const { session } = get();
          if (!session) {
            throw new Error('No active onboarding session');
          }

          set({ isLoading: true, error: null });

          try {
            const result = await onboardingAPI.completeOnboarding(session.id, { force: true });
            
            set({
              session: { ...session, status: 'completed', completedAt: new Date() } as OnboardingSession,
              isLoading: false,
            });

            return result;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to complete onboarding',
              isLoading: false,
            });
            throw error;
          }
        },

        setCurrentStep: async (step) => {
          const { session } = get();
          if (!session) return;

          set({ isLoading: true, error: null });

          try {
            const stepConfig = await onboardingAPI.getStepConfiguration(step, session.type);
            
            set({
              session: { ...session, currentStep: step } as OnboardingSession,
              currentStepConfig: stepConfig,
              isLoading: false,
            });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to load step configuration',
              isLoading: false,
            });
          }
        },

        getOnboardingType: async () => {
          try {
            return await onboardingAPI.getOnboardingType();
          } catch (error) {
            throw new Error(error instanceof Error ? error.message : 'Failed to get onboarding type');
          }
        },

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          set(initialState);
        },
      }),
      {
        name: 'onboarding-store',
        partialize: (state) => ({
          session: state.session,
          progress: state.progress,
          isInitialized: state.isInitialized,
          onboardingType: state.onboardingType,
          onboardingRole: state.onboardingRole,
        }),
      }
    ),
    {
      name: 'onboarding-store',
    }
  )
);