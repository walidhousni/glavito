'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useOnboarding } from '@/lib/hooks/use-onboarding';
import { OnboardingStep, OnboardingSession, OnboardingProgress } from '@glavito/shared-types';

interface OnboardingContextType {
  // State
  session: OnboardingSession | null;
  progress: OnboardingProgress | null;
  isLoading: boolean;
  error: string | null;
  isReady: boolean;

  // Actions
  completeStep: (stepId: OnboardingStep, data: any) => Promise<{ success: boolean; error?: string }>;
  skipStep: (stepId: OnboardingStep) => Promise<{ success: boolean; error?: string }>;
  goToStep: (stepId: OnboardingStep) => Promise<{ success: boolean; error?: string }>;
  pauseOnboarding: () => Promise<{ success: boolean; error?: string }>;
  resumeOnboarding: () => Promise<{ success: boolean; error?: string }>;
  finishOnboarding: () => Promise<{ success: boolean; error?: string; result?: any }>;
  clearError: () => void;

  // Utilities
  getStepProgress: (stepId: OnboardingStep) => { completed: boolean; current: boolean; data: any };
  canAccessStep: (stepId: OnboardingStep) => boolean;

  // Computed
  isCompleted: boolean;
  isPaused: boolean;
  isActive: boolean;
  progressPercentage: number;
  estimatedTimeRemaining: number;
}

const OnboardingContext = createContext<OnboardingContextType | null>(null);

interface OnboardingProviderProps {
  children: React.ReactNode;
}

export function OnboardingProvider({ children }: OnboardingProviderProps) {
  const onboarding = useOnboarding();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render until mounted to avoid hydration issues
  if (!mounted) {
    return null;
  }

  return (
    <OnboardingContext.Provider value={onboarding}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboardingContext() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingContext must be used within an OnboardingProvider');
  }
  return context;
}

// Enhanced loading component
function OnboardingLoadingScreen() {
  const t = useTranslations('onboarding.loading');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Animated logo/icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 animate-ping">
            <div className="w-16 h-16 bg-blue-400 rounded-full opacity-20 mx-auto"></div>
          </div>
          <div className="relative">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mx-auto flex items-center justify-center">
              <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Loading text */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {t('title')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('subtitle')}
        </p>
        
        {/* Progress indicator */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
        
        <p className="text-sm text-gray-500">
          {t('message')}
        </p>
      </div>
    </div>
  );
}

// Enhanced error component
function OnboardingErrorScreen({ error, onRetry }: { error: string; onRetry: () => void }) {
  const t = useTranslations('onboarding.error');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto px-6">
        {/* Error icon */}
        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {t('title')}
        </h2>
        <p className="text-gray-600 mb-6">
          {t('subtitle')}
        </p>
        
        {/* Error details */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{error}</p>
        </div>
        
        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={onRetry}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-6 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:scale-105"
          >
            {t('retry')}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            {t('refresh')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Higher-order component for onboarding protection
export function withOnboarding<P extends object>(
  Component: React.ComponentType<P>
) {
  return function OnboardingProtectedComponent(props: P) {
    const { session, isReady, isCompleted, error, clearError } = useOnboardingContext();
    const [retryCount, setRetryCount] = useState(0);

    const handleRetry = () => {
      clearError();
      setRetryCount(prev => prev + 1);
      // Force a re-render to retry loading
      window.location.reload();
    };

    // Show error screen if there's an error
    if (error) {
      return <OnboardingErrorScreen error={error} onRetry={handleRetry} />;
    }

    // Show enhanced loading while checking onboarding status
    if (!isReady) {
      return <OnboardingLoadingScreen />;
    }

    // Redirect to onboarding if not completed
    if (!isCompleted && session?.status !== 'completed') {
      window.location.href = '/onboarding';
      return null;
    }

    return <Component {...props} />;
  };
}

// Hook for checking if onboarding is required
export function useOnboardingRequired() {
  const { session, isReady, isCompleted } = useOnboardingContext();

  return {
    isRequired: isReady && !isCompleted && session?.status !== 'completed',
    isReady,
    isCompleted,
    session,
  };
}