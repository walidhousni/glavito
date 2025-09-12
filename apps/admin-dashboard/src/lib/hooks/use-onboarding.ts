import { useEffect, useState } from 'react';
import { useOnboardingStore } from '@/lib/store/onboarding-store';
import { OnboardingStep } from '@glavito/shared-types';

export function useOnboarding() {
  const store = useOnboardingStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!store.isInitialized && !store.isLoading) {
      store.initializeOnboarding().finally(() => {
        setIsReady(true);
      });
    } else {
      setIsReady(true);
    }
  }, [store.isInitialized, store.isLoading, store.initializeOnboarding]);

  const completeStep = async (stepId: OnboardingStep, data: any) => {
    try {
      await store.updateStep(stepId, data);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const skipStep = async (stepId: OnboardingStep) => {
    return completeStep(stepId, { skipped: true });
  };

  const goToStep = async (stepId: OnboardingStep) => {
    try {
      await store.setCurrentStep(stepId);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const pauseOnboarding = async () => {
    try {
      await store.pauseOnboarding();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const resumeOnboarding = async () => {
    try {
      await store.resumeOnboarding();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const finishOnboarding = async () => {
    try {
      const result = await store.completeOnboarding();
      return { success: true, result };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  };

  const getStepProgress = (stepId: OnboardingStep) => {
    if (!store.session) return { completed: false, current: false, data: null };

    return {
      completed: store.session.completedSteps.includes(stepId),
      current: store.session.currentStep === stepId,
      data: store.session.stepData[stepId] || null,
    };
  };

  const canAccessStep = (stepId: OnboardingStep) => {
    if (!store.currentStepConfig) return true;

    // Check if all dependencies are completed
    const dependencies = store.currentStepConfig.dependencies || [];
    return dependencies.every(dep => 
      store.session?.completedSteps.includes(dep)
    );
  };

  return {
    // State
    session: store.session,
    progress: store.progress,
    currentStepConfig: store.currentStepConfig,
    isLoading: store.isLoading,
    error: store.error,
    isReady,

    // Actions
    completeStep,
    skipStep,
    goToStep,
    pauseOnboarding,
    resumeOnboarding,
    finishOnboarding,
    clearError: store.clearError,
    reset: store.reset,

    // Utilities
    getStepProgress,
    canAccessStep,
    
    // Computed values
    isCompleted: store.session?.status === 'completed',
    isPaused: store.session?.status === 'paused',
    isActive: store.session?.status === 'active',
    progressPercentage: store.progress?.progressPercentage || 0,
    estimatedTimeRemaining: store.progress?.estimatedTimeRemaining || 0,
  };
}