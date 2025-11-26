/**
 * Onboarding Page
 * Multi-step wizard for tenant admin and agent onboarding
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from '@/i18n.config';
import { useTranslations } from 'next-intl';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { X, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useOnboarding } from '@/lib/hooks/use-onboarding';
import { useOnboardingWebSocket } from '@/lib/hooks/use-onboarding-websocket';
import { ProgressBar } from '@/components/onboarding/progress-bar';
import { StepNavigation } from '@/components/onboarding/step-navigation';
import { useAuth } from '@/lib/hooks/use-auth';
import { useAuthStore } from '@/lib/store/auth-store';
import type { OnboardingStep } from '@glavito/shared-types';

// Import step components (we'll create these next)
import { WelcomeStep } from '@/components/onboarding/steps/welcome-step';
import { IndustryStep } from '@/components/onboarding/steps/industry-step';
import { StripeStep } from '@/components/onboarding/steps/stripe-step';
import { ChannelsStep } from '@/components/onboarding/steps/channels-step';
import { TeamStep } from '@/components/onboarding/steps/team-step';
import { KnowledgeBaseStep } from '@/components/onboarding/steps/knowledge-base-step';
import { AIFeaturesStep } from '@/components/onboarding/steps/ai-features-step';
import { WorkflowsStep } from '@/components/onboarding/steps/workflows-step';
import { CompleteStep } from '@/components/onboarding/steps/complete-step';
import { AgentProfileStep } from '@/components/onboarding/steps/agent-profile-step';
import { AgentTourStep } from '@/components/onboarding/steps/agent-tour-step';
import { AgentSampleTicketStep } from '@/components/onboarding/steps/agent-sample-ticket-step';
import { AgentKBIntroStep } from '@/components/onboarding/steps/agent-kb-intro-step';
import { AgentNotificationsStep } from '@/components/onboarding/steps/agent-notifications-step';

// Step configuration with Icons8 icons
const TENANT_STEPS_CONFIG = [
  {
    id: 'welcome',
    label: 'Welcome',
    icon: 'https://img.icons8.com/?size=32&id=3723',
    component: WelcomeStep,
  },
  {
    id: 'industry',
    label: 'Industry',
    icon: 'https://img.icons8.com/?size=32&id=53384',
    component: IndustryStep,
  },
  {
    id: 'stripe',
    label: 'Payment',
    icon: 'https://img.icons8.com/?size=32&id=19951',
    component: StripeStep,
  },
  {
    id: 'channels',
    label: 'Channels',
    icon: 'https://img.icons8.com/?size=32&id=16466',
    component: ChannelsStep,
  },
  {
    id: 'team',
    label: 'Team',
    icon: 'https://img.icons8.com/?size=32&id=34287',
    component: TeamStep,
  },
  {
    id: 'knowledge-base',
    label: 'Knowledge',
    icon: 'https://img.icons8.com/?size=32&id=36389',
    component: KnowledgeBaseStep,
  },
  {
    id: 'ai-features',
    label: 'AI Features',
    icon: 'https://img.icons8.com/?size=32&id=FQrA6ic36VQu',
    component: AIFeaturesStep,
  },
  {
    id: 'workflows',
    label: 'Workflows',
    icon: 'https://img.icons8.com/?size=32&id=43738',
    component: WorkflowsStep,
  },
  {
    id: 'complete',
    label: 'Done',
    icon: 'https://img.icons8.com/?size=32&id=82751',
    component: CompleteStep,
  },
];

const AGENT_STEPS_CONFIG = [
  {
    id: 'profile',
    label: 'Profile',
    icon: 'https://img.icons8.com/?size=32&id=23264',
    component: AgentProfileStep,
  },
  {
    id: 'tour',
    label: 'Tour',
    icon: 'https://img.icons8.com/?size=32&id=31906',
    component: AgentTourStep,
  },
  {
    id: 'sample-ticket',
    label: 'Practice',
    icon: 'https://img.icons8.com/?size=32&id=85057',
    component: AgentSampleTicketStep,
  },
  {
    id: 'knowledge-base-intro',
    label: 'Knowledge',
    icon: 'https://img.icons8.com/?size=32&id=36389',
    component: AgentKBIntroStep,
  },
  {
    id: 'notifications',
    label: 'Settings',
    icon: 'https://img.icons8.com/?size=32&id=9730',
    component: AgentNotificationsStep,
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const t = useTranslations('onboarding');
  const { user } = useAuth();
  const onboarding = useOnboarding();
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  // Connect to WebSocket for real-time updates
  useOnboardingWebSocket(user?.id);
  
  // Determine step configuration based on onboarding type
  const stepsConfig = onboarding.session?.type === 'tenant_setup'
    ? TENANT_STEPS_CONFIG
    : AGENT_STEPS_CONFIG;
  
  const currentStepConfig = stepsConfig[onboarding.currentStepIndex];
  const CurrentStepComponent = currentStepConfig?.component;
  const autoCompleteTriggered = useRef(false);
  
  // Initialize onboarding ONCE when component mounts
  const initializationAttempted = useRef(false);
  
  useEffect(() => {
    // Prevent multiple initialization attempts
    if (initializationAttempted.current) {
      return;
    }
    
    // If already has a session (loaded by useOnboarding hook), we're ready
    if (onboarding.session) {
      setIsReady(true);
      return;
    }
    
    // Wait for user and initial load to complete
    if (!user || onboarding.isLoading) {
      return;
    }
    
    // Only attempt once
    initializationAttempted.current = true;
    
    // Start a new session since none exists
    const startSession = async () => {
      try {
        console.log('[Onboarding] No existing session, starting new one for user:', user.id);
        
        await onboarding.startOnboarding(
          user.role === 'admin' || user.role === 'tenant_admin' ? 'tenant_setup' : 'agent_welcome',
          user.role === 'admin' || user.role === 'tenant_admin' ? 'tenant_admin' : 'agent'
        );
        
        setIsReady(true);
      } catch (error) {
        console.error('[Onboarding] Failed to start session:', error);
        setIsReady(true); // Show error state but don't block
      }
    };
    
    startSession();
  }, [user, onboarding.session, onboarding.isLoading, onboarding]);

  // Auto-complete when entering the final "complete" step to avoid getting stuck
  useEffect(() => {
    if (currentStepConfig?.id !== 'complete') {
      autoCompleteTriggered.current = false;
      return;
    }

    if (autoCompleteTriggered.current) {
      return;
    }

    autoCompleteTriggered.current = true;
    (async () => {
      try {
        console.log('[Onboarding] Auto-completing on final step...');
        await onboarding.completeOnboarding();
      } catch (err) {
        console.warn('[Onboarding] Auto-complete failed or already completed:', err);
      } finally {
        const target = (user?.role === 'admin' || user?.role === 'tenant_admin') ? '/dashboard' : '/agent';
        console.log('[Onboarding] Auto navigation to:', target);
        router.replace(target);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStepConfig?.id]);
  
  const handleNext = async () => {
    try {
      // Check if we're on the last step BEFORE calling nextStep
      const wasLastStep = onboarding.isLastStep;
      
      console.log('[Onboarding] handleNext called, wasLastStep:', wasLastStep);
      console.log('[Onboarding] Current session status:', onboarding.session?.status);
      console.log('[Onboarding] isLoading:', onboarding.isLoading);
      
      if (wasLastStep) {
        // Complete the onboarding
        console.log('[Onboarding] Completing onboarding...');
        
        // Add timeout to prevent hanging
        const completionPromise = onboarding.completeOnboarding();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Completion timeout')), 10000)
        );
        
        try {
          await Promise.race([completionPromise, timeoutPromise]);
          console.log('[Onboarding] Onboarding completed successfully');
        } catch (timeoutError) {
          console.warn('[Onboarding] Completion timed out or failed:', timeoutError);
          // Continue anyway - we'll navigate regardless
        }
        
        // Navigate to appropriate dashboard
        const target = (user?.role === 'admin' || user?.role === 'tenant_admin') ? '/dashboard' : '/agent';
        console.log('[Onboarding] Navigating to:', target);
        router.push(target);
      } else {
        // Move to next step
        console.log('[Onboarding] Moving to next step...');
        await onboarding.nextStep();
        console.log('[Onboarding] Moved to next step');
      }
    } catch (error) {
      console.error('[Onboarding] Failed to proceed:', error);
      // Try to navigate anyway if we're on the last step
      if (onboarding.isLastStep) {
        const target = (user?.role === 'admin' || user?.role === 'tenant_admin') ? '/dashboard' : '/agent';
        console.log('[Onboarding] Error recovery: forcing navigation to', target);
        router.push(target);
      }
    }
  };
  
  const handlePrev = () => {
    onboarding.prevStep();
  };
  
  const handleSkip = async () => {
    if (currentStepConfig) {
      try {
        await onboarding.skipStep(currentStepConfig.id as OnboardingStep);
      } catch (error) {
        console.error('Failed to skip step:', error);
        // You could add a toast notification here
      }
    }
  };
  
  const handleExit = () => {
    setExitDialogOpen(true);
  };
  
  const confirmExit = async () => {
    try {
      await onboarding.pauseOnboarding();
      const target = (user?.role === 'admin' || user?.role === 'tenant_admin') ? '/dashboard' : '/agent';
      router.push(target);
    } catch (error) {
      console.error('Failed to pause onboarding:', error);
      // Still navigate to dashboard even if pause fails
      const target = (user?.role === 'admin' || user?.role === 'tenant_admin') ? '/dashboard' : '/agent';
      router.push(target);
    }
  };

  // Safety net: if backend marks onboarding completed, navigate automatically (one-shot)
  const safetyRedirectedRef = useRef(false);
  useEffect(() => {
    if (safetyRedirectedRef.current) return;
    if (onboarding.session?.status === 'completed') {
      try {
        useAuthStore.getState().updateUser({ onboardingCompleted: true });
      } catch (err) {
        console.warn('[Onboarding] Failed to mark user onboardingCompleted in store', err);
      }
      safetyRedirectedRef.current = true;
      const target = (user?.role === 'admin' || user?.role === 'tenant_admin') ? '/dashboard' : '/agent';
      router.replace(target);
    }
  }, [onboarding.session?.status, user?.role, router]);
  
  // Loading state
  if (!isReady || !currentStepConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
          <p className="text-lg font-medium text-gray-600 dark:text-gray-400">
            {t('loading', { default: 'Preparing your onboarding...' })}
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-900 dark:via-purple-950 dark:to-pink-950">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="https://img.icons8.com/?size=40&id=xuvGCOXi8Wyg"
              alt="Logo"
              width={36}
              height={36}
            />
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('title', { default: 'Welcome to Glavito' })}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {t('subtitle', { default: 'Let\'s get you set up' })}
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExit}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="container mx-auto px-4 pt-24 pb-8">
        <Card className="max-w-5xl mx-auto border-0 shadow-2xl overflow-hidden">
          {/* Progress Bar */}
          <ProgressBar
            steps={stepsConfig.map(s => ({ id: s.id, label: s.label, icon: s.icon }))}
            currentStepIndex={onboarding.currentStepIndex}
            completedSteps={onboarding.stepData ? Object.keys(onboarding.stepData) : []}
          />
          
          {/* Step Content */}
          <div className="p-8 min-h-[500px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepConfig.id}
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                transition={{ duration: 0.3 }}
              >
                <CurrentStepComponent
                  data={(onboarding.stepData[currentStepConfig.id] as Record<string, unknown>) || {}}
                  onDataChange={(data: Record<string, unknown>) => {
                    onboarding.saveStepData(currentStepConfig.id as OnboardingStep, data);
                  }}
                />
              </motion.div>
            </AnimatePresence>
          </div>
          
          {/* Navigation */}
          <StepNavigation
            canGoPrev={onboarding.canGoPrev}
            canGoNext={onboarding.canGoNext}
            isFirstStep={onboarding.isFirstStep}
            isLastStep={onboarding.isLastStep}
            isLoading={onboarding.isLoading}
            onPrev={handlePrev}
            onNext={handleNext}
            onSkip={handleSkip}
          />
        </Card>
      </div>
      
      {/* Exit Confirmation Dialog */}
      <Dialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('exitDialog.title', { default: 'Exit Onboarding?' })}</DialogTitle>
            <DialogDescription>
              {t('exitDialog.description', { default: 'Your progress will be saved. You can resume anytime from where you left off.' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExitDialogOpen(false)}>
              {t('exitDialog.cancel', { default: 'Continue Onboarding' })}
            </Button>
            <Button onClick={confirmExit}>
              {t('exitDialog.confirm', { default: 'Exit for Now' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
