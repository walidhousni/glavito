'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle, Circle, Clock, Sparkles, Star, Zap, ArrowRight } from 'lucide-react';
import { OnboardingStep } from '@glavito/shared-types';
import { cn } from '@/lib/utils';

interface StepIndicatorProps {
  steps: OnboardingStep[];
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  variant?: 'vertical' | 'horizontal';
  className?: string;
}

const stepKeyMap: Record<OnboardingStep, string> = {
  WELCOME: 'welcome',
  ORGANIZATION_SETUP: 'organization',
  CHANNEL_CONFIGURATION: 'channels',
  AI_CONFIGURATION: 'ai',
  KNOWLEDGE_BASE: 'knowledgeBase',
  PAYMENT_SETUP: 'payment',
  TEAM_MANAGEMENT: 'team',
  WORKFLOW_CONFIGURATION: 'workflows',
  CUSTOMER_PORTAL: 'portal',
  DATA_IMPORT: 'dataImport',
  ANALYTICS_SETUP: 'analytics',
} as unknown as Record<OnboardingStep, string>;

const getStepTitle = (t: any, stepKey: string) => {
  return t(`${stepKey}.title`, { defaultValue: stepKey });
};

const getStepStatus = (step: OnboardingStep, currentStep: OnboardingStep, completedSteps: OnboardingStep[]) => {
  if (completedSteps.includes(step)) return 'completed';
  if (step === currentStep) return 'current';
  return 'pending';
};

const getStepIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return CheckCircle;
    case 'current':
      return Clock;
    default:
      return Circle;
  }
};

const getStepClasses = (status: string) => {
  switch (status) {
    case 'completed':
      return {
        container: 'bg-green-600 text-white',
        icon: 'text-white',
        title: 'text-green-800'
      };
    case 'current':
      return {
        container: 'bg-blue-600 text-white',
        icon: 'text-white',
        title: 'text-blue-800'
      };
    default:
      return {
        container: 'bg-gray-200 text-gray-600',
        icon: 'text-gray-600',
        title: 'text-gray-600'
      };
  }
};

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  currentStep,
  completedSteps,
  variant = 'vertical',
  className
}) => {
  const t = useTranslations('onboarding.steps');

  if (variant === 'horizontal') {
    return <HorizontalStepIndicator {...{ steps, currentStep, completedSteps, className }} />;
  }

  const currentStepIndex = steps.indexOf(currentStep);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className={cn('relative', className)}>
      {/* Progress Background Line */}
      <div className="absolute left-4 top-8 bottom-8 w-0.5 bg-gradient-to-b from-slate-200 via-slate-300 to-slate-200" />
      
      {/* Animated Progress Line */}
      <div 
        className="absolute left-4 top-8 w-0.5 bg-gradient-to-b from-blue-500 via-indigo-500 to-purple-500 transition-all duration-1000 ease-out"
        style={{ height: `${Math.max(0, progressPercentage - 10)}%` }}
      />
      
      <div className="space-y-6">
        {steps.map((step, index) => {
          const stepKey = stepKeyMap[step] || step.toString();
          const title = getStepTitle(t, stepKey);
          const status = getStepStatus(step, currentStep, completedSteps);
          const Icon = getStepIcon(status);
          const stepClasses = getStepClasses(status);
          const isActive = status === 'current';
          const isCompleted = status === 'completed';

          return (
            <div key={step} className="relative flex items-start space-x-4 group">
              {/* Step Circle */}
              <div className={cn(
                'relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                isCompleted && 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30 scale-110',
                isActive && 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 scale-110 animate-pulse',
                !isCompleted && !isActive && 'bg-slate-200 group-hover:bg-slate-300'
              )}>
                {isCompleted ? (
                  <CheckCircle className="w-5 h-5 text-white" />
                ) : isActive ? (
                  <Sparkles className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <span className="text-xs font-semibold text-slate-600">{index + 1}</span>
                )}
              </div>
              
              {/* Step Content */}
              <div className="flex-1 min-w-0 pb-2">
                <div className={cn(
                  'flex items-center gap-2 mb-1 transition-colors duration-200',
                  isActive && 'text-blue-700',
                  isCompleted && 'text-emerald-700',
                  !isActive && !isCompleted && 'text-slate-600 group-hover:text-slate-800'
                )}>
                  <h3 className="text-sm font-semibold">{title}</h3>
                  {isActive && <Star className="w-3 h-3 text-blue-500 animate-pulse" />}
                  {isCompleted && <Zap className="w-3 h-3 text-emerald-500" />}
                </div>
                
                {isActive && (
                  <div className="flex items-center gap-2 text-xs text-blue-600 font-medium">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                    {t('status.currentlyActive')}
                  </div>
                )}
                
                {isCompleted && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 font-medium">
                    <CheckCircle className="w-3 h-3" />
                    {t('status.completed')}
                  </div>
                )}
                
                {!isActive && !isCompleted && (
                  <div className="text-xs text-slate-500">
                    {t('status.step', { number: index + 1 })}
                  </div>
                )}
              </div>
              
              {/* Hover Effect */}
              {!isCompleted && !isActive && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-slate-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
              )}
            </div>
          );
        })}
      </div>
      
      {/* Progress Summary */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200/50">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-700 font-medium">
            {t('progress.label', { current: currentStepIndex + 1, total: steps.length })}
          </span>
          <span className="text-blue-700 font-semibold">
            {t('progress.percentage', { percentage: Math.round(progressPercentage) })}
          </span>
        </div>
        <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export { StepIndicator };

const HorizontalStepIndicator: React.FC<Omit<StepIndicatorProps, 'variant'>> = ({
  steps,
  currentStep,
  completedSteps,
  className
}) => {
  const t = useTranslations('onboarding.steps');
  const currentStepIndex = steps.indexOf(currentStep);
  const progressPercentage = ((currentStepIndex + 1) / steps.length) * 100;

  return (
    <div className={cn('w-full', className)}>
      {/* Mobile-optimized horizontal progress */}
      <div className="relative mb-6">
        {/* Background line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 rounded-full" />
        
        {/* Progress line */}
        <div 
          className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progressPercentage}%` }}
        />
        
        {/* Step indicators */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const stepKey = stepKeyMap[step] || step.toString();
            const title = getStepTitle(t, stepKey);
            const status = getStepStatus(step, currentStep, completedSteps);
            const isActive = status === 'current';
            const isCompleted = status === 'completed';

            return (
              <div key={step} className="flex flex-col items-center group">
                {/* Step circle */}
                <div className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 relative z-10',
                  isCompleted && 'bg-gradient-to-br from-emerald-500 to-green-600 shadow-lg shadow-emerald-500/30',
                  isActive && 'bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30 scale-110',
                  !isCompleted && !isActive && 'bg-white border-2 border-slate-300 group-hover:border-slate-400'
                )}>
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-white" />
                  ) : isActive ? (
                    <Sparkles className="w-4 h-4 text-white" />
                  ) : (
                    <span className="text-xs font-semibold text-slate-600">{index + 1}</span>
                  )}
                </div>
                
                {/* Step label */}
                <div className="mt-3 text-center max-w-20">
                  <h3 className={cn(
                    'text-xs font-medium transition-colors duration-200 leading-tight',
                    isActive && 'text-blue-700',
                    isCompleted && 'text-emerald-700',
                    !isActive && !isCompleted && 'text-slate-600'
                  )}>
                    {title}
                  </h3>
                  
                  {isActive && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-xs text-blue-600 font-medium">Active</span>
                    </div>
                  )}
                </div>
                
                {/* Active step indicator */}
                {isActive && (
                  <div className="absolute -top-1 -left-1 w-10 h-10 border-2 border-blue-300 rounded-full animate-ping opacity-30" />
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Compact progress summary */}
      <div className="flex items-center justify-between text-sm px-2">
        <span className="text-slate-600">
          Step {currentStepIndex + 1} of {steps.length}
        </span>
        <span className="text-blue-700 font-semibold">
          {Math.round(progressPercentage)}%
        </span>
      </div>
    </div>
  );
};

export { HorizontalStepIndicator };