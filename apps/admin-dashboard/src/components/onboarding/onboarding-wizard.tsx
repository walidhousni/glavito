'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, ArrowLeft } from 'lucide-react';
import { 
  OnboardingStep, 
  OnboardingSession, 
  OnboardingProgress, 
  OnboardingType, 
  TenantSetupStep,
  AgentWelcomeStep
} from '@glavito/shared-types';

// Component will use the enums directly

import { WelcomeStep } from './steps/welcome-step';
import { OrganizationSetupStep } from './steps/organization-setup-step';
import { ChannelConfigurationStep } from './steps/channel-configuration-step';
import { AIConfigurationStep } from './steps/ai-configuration-step';
import { KnowledgeBaseStep } from './steps/knowledge-base-step';
import { PaymentSetupStep } from './steps/payment-setup-step';
import { TeamManagementStep } from './steps/team-management-step';
import { WorkflowConfigurationStep } from './steps/workflow-configuration-step';
import { CustomerPortalStep } from './steps/customer-portal-step';
import { DataImportStep } from './steps/data-import-step';
import { AnalyticsSetupStep } from './steps/analytics-setup-step';

interface OnboardingWizardProps {
  session: OnboardingSession;
  progress: OnboardingProgress;
  onStepComplete: (stepId: OnboardingStep, data: Record<string, unknown>) => Promise<void>;
  onComplete: () => Promise<void>;
}

// Map steps to components for tenant setup
const tenantStepComponents: Record<TenantSetupStep, React.ComponentType<{
  data: Record<string, unknown>;
  onComplete: (data: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
  session: OnboardingSession;
  progress: OnboardingProgress;
}>> = {
  [TenantSetupStep.WELCOME]: WelcomeStep,
  [TenantSetupStep.ORGANIZATION_SETUP]: OrganizationSetupStep,
  [TenantSetupStep.CHANNEL_CONFIGURATION]: ChannelConfigurationStep,
  [TenantSetupStep.AI_CONFIGURATION]: AIConfigurationStep,
  [TenantSetupStep.KNOWLEDGE_BASE]: KnowledgeBaseStep,
  [TenantSetupStep.PAYMENT_SETUP]: PaymentSetupStep,
  [TenantSetupStep.TEAM_MANAGEMENT]: TeamManagementStep,
  [TenantSetupStep.WORKFLOW_CONFIGURATION]: WorkflowConfigurationStep,
  [TenantSetupStep.CUSTOMER_PORTAL]: CustomerPortalStep,
  [TenantSetupStep.DATA_IMPORT]: DataImportStep,
  [TenantSetupStep.ANALYTICS_SETUP]: AnalyticsSetupStep,
};

// Map steps to components for agent welcome (simplified for now)
const agentStepComponents: Record<AgentWelcomeStep, React.ComponentType<{
  data: Record<string, unknown>;
  onComplete: (data: Record<string, unknown>) => Promise<void>;
  isLoading: boolean;
  session: OnboardingSession;
  progress: OnboardingProgress;
}>> = {
  [AgentWelcomeStep.WELCOME]: WelcomeStep,
  [AgentWelcomeStep.PROFILE_SETUP]: OrganizationSetupStep, // Reuse for profile setup
  [AgentWelcomeStep.TEAM_ASSIGNMENT]: TeamManagementStep,
  [AgentWelcomeStep.PERMISSIONS_OVERVIEW]: WelcomeStep, // Placeholder
  [AgentWelcomeStep.FEATURE_TOUR]: WelcomeStep, // Placeholder
  [AgentWelcomeStep.TEST_TICKET]: WelcomeStep, // Placeholder
  [AgentWelcomeStep.NOTIFICATION_PREFERENCES]: WelcomeStep, // Placeholder
  [AgentWelcomeStep.QUICK_START]: WelcomeStep, // Placeholder
};

export function OnboardingWizard({
  session,
  progress,
  onStepComplete,
  onComplete
}: OnboardingWizardProps) {
  const t = useTranslations('onboarding');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const isTenantSetup = session.type === OnboardingType.TENANT_SETUP;

  // Get the appropriate steps and components based on onboarding type
  const steps = isTenantSetup 
    ? Object.values(TenantSetupStep) as OnboardingStep[]
    : Object.values(AgentWelcomeStep) as OnboardingStep[];
  
  const stepComponents = isTenantSetup ? tenantStepComponents : agentStepComponents;
  
  const currentStep = session.currentStep;
  const CurrentStepComponent = stepComponents[currentStep as keyof typeof stepComponents];

  useEffect(() => {
    const index = steps.indexOf(session.currentStep);
    if (index !== -1) setCurrentStepIndex(index);
  }, [session.currentStep, steps]);
  
  if (!CurrentStepComponent) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Step component not found for: {currentStep}</p>
      </div>
    );
  }

  const getStepTitle = (step: OnboardingStep) => {
    if (isTenantSetup) {
      return t(`tenantSetup.${step}.title`, { defaultValue: step });
    } else {
      return t(`agentWelcome.${step}.title`, { defaultValue: step });
    }
  };

  const handleStepComplete = async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      await onStepComplete(currentStep, data);
      
      // The backend will determine the next step and update the session
      // The session will be updated and the component will re-render with the new current step
      
    } catch (error) {
      console.error('Error completing step:', error);
      // Handle error - you might want to show an error message to the user
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreviousStep = () => {
    if (currentStepIndex > 0) setCurrentStepIndex(currentStepIndex - 1);
  };

  const handleSkipStep = async () => {
    await handleStepComplete({});
  };

  const isStepCompleted = (step: OnboardingStep) => session.completedSteps.includes(step);

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isActive = index === currentStepIndex;
            const isCompleted = isStepCompleted(step);
            return (
              <React.Fragment key={step}>
                <div className={`h-2 w-16 rounded-full ${isCompleted ? 'bg-green-600' : isActive ? 'bg-primary' : 'bg-muted'}`}></div>
              </React.Fragment>
            );
          })}
        </div>
        <div className="mt-3">
          <h2 className="text-xl font-semibold">{getStepTitle(currentStep)}</h2>
          <p className="text-sm text-muted-foreground">{progress.nextRecommendedAction}</p>
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-xl border bg-card">
        <div className="p-6">
          {React.createElement(CurrentStepComponent, {
            data: (session.stepData as Record<string, unknown>)[currentStep] || {},
            onComplete: handleStepComplete,
            isLoading: isLoading,
            session: session,
            progress: progress
          })}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between mt-6">
        <Button variant="outline" onClick={handlePreviousStep} disabled={currentStepIndex === 0 || isLoading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('navigation.previous')}
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={handleSkipStep} disabled={isLoading}>{t('navigation.skip')}</Button>
          {progress.nextRecommendedAction === 'Onboarding complete' ? (
            <Button onClick={onComplete} disabled={isLoading} className="">
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/80 border-t-transparent mr-2"></div>
                  {t('loading.completing')}
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {t('navigation.complete')}
                </>
              )}
            </Button>
          ) : (
            <Button onClick={() => handleStepComplete({})} disabled={isLoading}>
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/80 border-t-transparent mr-2"></div>
                  {t('loading.saving')}
                </>
              ) : (
                <>
                  {t('navigation.next')}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}