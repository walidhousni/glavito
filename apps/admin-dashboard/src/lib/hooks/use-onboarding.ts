/**
 * useOnboarding Hook
 * Main hook for accessing onboarding functionality
 */

import { useEffect } from 'react';
import { useOnboardingStore } from '../store/onboarding-store';
import { useAuth } from './use-auth';

export function useOnboarding() {
  const store = useOnboardingStore();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  // Initialize only when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user && !store.session && !store.isLoading && !authLoading) {
      store.initialize().catch((error) => {
        console.error('Failed to initialize onboarding:', error);
      });
    }
  }, [store, isAuthenticated, user, authLoading]);
  
  return {
    // State
    session: store.session,
    currentStepIndex: store.currentStepIndex,
    currentStep: store.getCurrentStep(),
    totalSteps: store.totalSteps,
    steps: store.steps,
    progress: store.session?.progress || 0,
    stepData: store.stepData,
    isLoading: store.isLoading || authLoading,
    error: store.error,
    
    // Navigation helpers
    isFirstStep: store.isFirstStep(),
    isLastStep: store.isLastStep(),
    canGoNext: store.canGoNext(),
    canGoPrev: store.canGoPrev(),
    
    // Actions
    startOnboarding: store.startOnboarding,
    nextStep: store.nextStep,
    prevStep: store.prevStep,
    goToStep: store.goToStep,
    saveStepData: store.saveStepData,
    skipStep: store.skipStep,
    completeOnboarding: store.completeOnboarding,
    pauseOnboarding: store.pauseOnboarding,
    resumeOnboarding: store.resumeOnboarding,
    reset: store.reset,
  };
}
