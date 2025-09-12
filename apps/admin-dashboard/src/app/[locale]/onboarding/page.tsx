'use client';

import React, { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { DashboardPreview } from '@/components/onboarding/dashboard-preview';
import { useOnboardingStore } from '@/lib/store/onboarding-store';
import { useAuthStore } from '@/lib/store/auth-store';
import { OnboardingStep } from '@glavito/shared-types';
import { useRouter } from '@/i18n.config';

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const tc = useTranslations('common');
  const router = useRouter();
  const {
    session,
    progress,
    isLoading,
    error,
    isInitialized,
    initializeOnboarding,
    updateStep,
    completeOnboarding,
    clearError,
  } = useOnboardingStore();

  useEffect(() => {
    // Initialize when first loading, or if persisted state says initialized but critical data is missing
    if (!isInitialized || !session || !progress) {
      initializeOnboarding();
    }
  }, [isInitialized, session, progress, initializeOnboarding]);

  const handleStepComplete = async (stepId: OnboardingStep, data: Record<string, unknown>) => {
    try {
      await updateStep(stepId, data);
    } catch (err) {
      console.error('Error completing step:', err);
      throw err;
    }
  };

  const handleComplete = async () => {
    try {
      const result = await completeOnboarding();
      console.log('Onboarding completed!', result);
      
      // Update user's onboarding status in auth store
      const { updateUser } = useAuthStore.getState();
      if (updateUser) {
        updateUser({ onboardingCompleted: true });
      }
      
      // Redirect to dashboard (locale-aware)
      router.push('/dashboard');
    } catch (err) {
      console.error('Error completing onboarding:', err);
      throw err;
    }
  };

  const Loading = (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-primary mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">{t('loading.initializing')}</p>
      </div>
    </div>
  );

  // Show error first to avoid masking failures behind a spinner
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('errors.loadingFailed')}</h2>
          <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
          <button
            onClick={() => {
              clearError();
              initializeOnboarding();
            }}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            {tc('tryAgain', { default: 'Try Again' })}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading || !isInitialized || !session || !progress) {
    return Loading;
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-3">
          <div className="h-7 w-7 rounded-md bg-black"></div>
          <span className="text-lg font-semibold tracking-tight">Glavito</span>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-6 py-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
        <section className="lg:col-span-7 xl:col-span-6">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold tracking-tight">{t('title', { defaultValue: 'Tell us about your company' })}</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-prose">{t('subtitle')}</p>
          </div>
          <OnboardingWizard
            session={session}
            progress={progress}
            onStepComplete={handleStepComplete}
            onComplete={handleComplete}
          />
        </section>
        <aside className="hidden lg:block lg:col-span-5 xl:col-span-6">
          <div className="sticky top-8 rounded-xl border bg-muted/30 p-6 h-[calc(100vh-6rem)]">
            <DashboardPreview variant="onboarding" />
          </div>
        </aside>
      </main>
    </div>
  );
}