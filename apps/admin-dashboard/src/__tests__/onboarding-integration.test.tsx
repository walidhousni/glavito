/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { OnboardingStep } from '@glavito/shared-types';

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock the step components
jest.mock('@/components/onboarding/steps/welcome-step', () => ({
  WelcomeStep: ({ onComplete }: { onComplete: (data: any) => void }) => (
    <div data-testid="welcome-step">
      <button onClick={() => onComplete({ welcomed: true })}>Get Started</button>
    </div>
  ),
}));

jest.mock('@/components/onboarding/steps/organization-setup-step', () => ({
  OrganizationSetupStep: ({ onComplete }: { onComplete: (data: any) => void }) => (
    <div data-testid="organization-step">
      <button onClick={() => onComplete({ companyName: 'Test Company' })}>Continue</button>
    </div>
  ),
}));

// Mock other step components
const mockStepComponents = [
  'channel-configuration-step',
  'ai-configuration-step',
  'knowledge-base-step',
  'payment-setup-step',
  'team-management-step',
  'workflow-configuration-step',
  'customer-portal-step',
  'data-import-step',
  'analytics-setup-step',
];

mockStepComponents.forEach((stepName) => {
  const componentName = stepName
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('') + 'Step';
  
  jest.mock(`@/components/onboarding/steps/${stepName}`, () => ({
    [componentName]: ({ onComplete }: { onComplete: (data: any) => void }) => (
      <div data-testid={stepName}>
        <button onClick={() => onComplete({})}>Continue</button>
      </div>
    ),
  }));
});

const mockSession = {
  id: 'test-session',
  userId: 'test-user',
  tenantId: 'test-tenant',
  currentStep: OnboardingStep.WELCOME,
  completedSteps: [],
  stepData: {},
  status: 'active' as const,
  startedAt: new Date(),
  lastActivityAt: new Date(),
  completedAt: null,
  estimatedCompletion: null,
  metadata: {},
};

const mockProgress = {
  sessionId: 'test-session',
  totalSteps: 11,
  completedSteps: 0,
  currentStep: OnboardingStep.WELCOME,
  progressPercentage: 0,
  estimatedTimeRemaining: 15,
  nextRecommendedAction: 'Get started with the welcome step',
  milestones: [],
};

describe('OnboardingWizard Integration', () => {
  const mockOnStepComplete = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the welcome step initially', () => {
    render(
      <OnboardingWizard
        session={mockSession}
        progress={mockProgress}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    expect(screen.getByText('onboarding.title')).toBeInTheDocument();
  });

  it('shows progress information', () => {
    render(
      <OnboardingWizard
        session={mockSession}
        progress={mockProgress}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('onboarding.progress.step')).toBeInTheDocument();
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('calls onStepComplete when step is completed', async () => {
    render(
      <OnboardingWizard
        session={mockSession}
        progress={mockProgress}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    const getStartedButton = screen.getByText('Get Started');
    fireEvent.click(getStartedButton);

    await waitFor(() => {
      expect(mockOnStepComplete).toHaveBeenCalledWith(
        OnboardingStep.WELCOME,
        { welcomed: true }
      );
    });
  });

  it('shows step navigation with correct states', () => {
    const sessionWithProgress = {
      ...mockSession,
      completedSteps: [OnboardingStep.WELCOME],
      currentStep: OnboardingStep.ORGANIZATION_SETUP,
    };

    render(
      <OnboardingWizard
        session={sessionWithProgress}
        progress={{ ...mockProgress, completedSteps: 1, progressPercentage: 9 }}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    // Should show completed welcome step and current organization step
    const stepNavigation = screen.getByText('onboarding.steps.welcome.title').closest('div');
    expect(stepNavigation).toHaveClass('bg-gradient-to-r', 'from-green-400', 'to-emerald-500');
  });

  it('handles navigation buttons correctly', () => {
    const sessionWithProgress = {
      ...mockSession,
      completedSteps: [OnboardingStep.WELCOME],
      currentStep: OnboardingStep.ORGANIZATION_SETUP,
    };

    render(
      <OnboardingWizard
        session={sessionWithProgress}
        progress={{ ...mockProgress, completedSteps: 1 }}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    // Previous button should be enabled
    const previousButton = screen.getByText('onboarding.navigation.previous');
    expect(previousButton).not.toBeDisabled();

    // Skip button should be present
    const skipButton = screen.getByText('onboarding.navigation.skip');
    expect(skipButton).toBeInTheDocument();
  });

  it('shows completion button on last step', () => {
    const finalSession = {
      ...mockSession,
      currentStep: OnboardingStep.ANALYTICS_SETUP,
      completedSteps: Object.values(OnboardingStep).slice(0, -1),
    };

    render(
      <OnboardingWizard
        session={finalSession}
        progress={{ ...mockProgress, completedSteps: 10, progressPercentage: 91 }}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    expect(screen.getByText('onboarding.navigation.complete')).toBeInTheDocument();
  });

  it('handles loading states correctly', () => {
    render(
      <OnboardingWizard
        session={mockSession}
        progress={mockProgress}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    // Initially not loading
    expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
  });
});

describe('OnboardingWizard Error Handling', () => {
  const mockOnStepComplete = jest.fn();
  const mockOnComplete = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles step completion errors gracefully', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    mockOnStepComplete.mockRejectedValueOnce(new Error('Step completion failed'));

    render(
      <OnboardingWizard
        session={mockSession}
        progress={mockProgress}
        onStepComplete={mockOnStepComplete}
        onComplete={mockOnComplete}
      />
    );

    const getStartedButton = screen.getByText('Get Started');
    fireEvent.click(getStartedButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Error completing step:', expect.any(Error));
    });

    consoleSpy.mockRestore();
  });
});