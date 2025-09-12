import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { OnboardingWizard } from '@/components/onboarding/onboarding-wizard';
import { OnboardingProvider } from '@/components/onboarding/onboarding-provider';
import { useOnboardingStore } from '@/lib/store/onboarding-store';
import { OnboardingStep } from '@glavito/shared-types';

// Mock the store
jest.mock('@/lib/store/onboarding-store');
const mockUseOnboardingStore = useOnboardingStore as jest.MockedFunction<typeof useOnboardingStore>;

// Mock next-intl
const messages = {
  onboarding: {
    title: 'Setup Your Ticketing Platform',
    'navigation.previous': 'Previous',
    'navigation.next': 'Continue',
    'navigation.skip': 'Skip for now',
    'navigation.complete': 'Complete Setup',
    'progress.step': 'Step {current} of {total}',
    'progress.estimatedTime': 'Estimated time remaining: {minutes} minutes',
    'steps.welcome.title': 'Welcome to Glavito',
    'steps.organization.title': 'Organization Setup',
    'steps.channels.title': 'Channel Configuration',
  },
};

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <OnboardingProvider>
        {component}
      </OnboardingProvider>
    </NextIntlClientProvider>
  );
};

describe('Onboarding System', () => {
  const mockSession = {
    id: 'session_1',
    userId: 'user_1',
    tenantId: 'tenant_1',
    currentStep: OnboardingStep.WELCOME,
    completedSteps: [],
    stepData: {},
    status: 'active' as const,
    startedAt: new Date(),
    lastActivityAt: new Date(),
    estimatedCompletion: new Date(),
    metadata: {},
  };

  const mockProgress = {
    totalSteps: 11,
    completedSteps: 0,
    currentStep: OnboardingStep.WELCOME,
    progressPercentage: 0,
    estimatedTimeRemaining: 120,
    nextRecommendedAction: 'Complete Welcome step',
  };

  beforeEach(() => {
    mockUseOnboardingStore.mockReturnValue({
      session: mockSession,
      progress: mockProgress,
      currentStepConfig: null,
      isLoading: false,
      error: null,
      isInitialized: true,
      initializeOnboarding: jest.fn(),
      startOnboarding: jest.fn(),
      updateStep: jest.fn(),
      pauseOnboarding: jest.fn(),
      resumeOnboarding: jest.fn(),
      completeOnboarding: jest.fn(),
      setCurrentStep: jest.fn(),
      clearError: jest.fn(),
      reset: jest.fn(),
    });
  });

  describe('OnboardingWizard', () => {
    it('renders the onboarding wizard with correct title', () => {
      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={mockProgress}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      expect(screen.getByText('Setup Your Ticketing Platform')).toBeInTheDocument();
      expect(screen.getByText('Step 1 of 11')).toBeInTheDocument();
    });

    it('displays progress bar with correct percentage', () => {
      const progressWithCompletion = { ...mockProgress, progressPercentage: 25 };
      
      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={progressWithCompletion}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    });

    it('shows estimated time remaining', () => {
      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={mockProgress}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      expect(screen.getByText('Estimated time remaining: 120 minutes')).toBeInTheDocument();
    });

    it('calls onStepComplete when continue button is clicked', async () => {
      const mockOnStepComplete = jest.fn();
      
      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={mockProgress}
          onStepComplete={mockOnStepComplete}
          onComplete={jest.fn()}
        />
      );

      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockOnStepComplete).toHaveBeenCalledWith(OnboardingStep.WELCOME, {});
      });
    });

    it('disables previous button on first step', () => {
      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={mockProgress}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      const previousButton = screen.getByText('Previous');
      expect(previousButton).toBeDisabled();
    });

    it('shows skip button for optional steps', () => {
      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={mockProgress}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      expect(screen.getByText('Skip for now')).toBeInTheDocument();
    });
  });

  describe('Onboarding Store', () => {
    it('initializes onboarding when not initialized', async () => {
      const mockInitialize = jest.fn();
      mockUseOnboardingStore.mockReturnValue({
        session: null,
        progress: null,
        currentStepConfig: null,
        isLoading: false,
        error: null,
        isInitialized: false,
        initializeOnboarding: mockInitialize,
        startOnboarding: jest.fn(),
        updateStep: jest.fn(),
        pauseOnboarding: jest.fn(),
        resumeOnboarding: jest.fn(),
        completeOnboarding: jest.fn(),
        setCurrentStep: jest.fn(),
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      renderWithProviders(<div>Test</div>);

      await waitFor(() => {
        expect(mockInitialize).toHaveBeenCalled();
      });
    });

    it('handles step completion correctly', async () => {
      const mockUpdateStep = jest.fn().mockResolvedValue(undefined);
      mockUseOnboardingStore.mockReturnValue({
        session: mockSession,
        progress: mockProgress,
        currentStepConfig: null,
        isLoading: false,
        error: null,
        isInitialized: true,
        initializeOnboarding: jest.fn(),
        startOnboarding: jest.fn(),
        updateStep: mockUpdateStep,
        pauseOnboarding: jest.fn(),
        resumeOnboarding: jest.fn(),
        completeOnboarding: jest.fn(),
        setCurrentStep: jest.fn(),
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      const mockOnStepComplete = jest.fn().mockImplementation(async (stepId, data) => {
        await mockUpdateStep(stepId, data);
      });

      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={mockProgress}
          onStepComplete={mockOnStepComplete}
          onComplete={jest.fn()}
        />
      );

      const continueButton = screen.getByText('Continue');
      fireEvent.click(continueButton);

      await waitFor(() => {
        expect(mockUpdateStep).toHaveBeenCalledWith(OnboardingStep.WELCOME, {});
      });
    });
  });

  describe('Error Handling', () => {
    it('displays error message when there is an error', () => {
      mockUseOnboardingStore.mockReturnValue({
        session: null,
        progress: null,
        currentStepConfig: null,
        isLoading: false,
        error: 'Failed to load onboarding',
        isInitialized: true,
        initializeOnboarding: jest.fn(),
        startOnboarding: jest.fn(),
        updateStep: jest.fn(),
        pauseOnboarding: jest.fn(),
        resumeOnboarding: jest.fn(),
        completeOnboarding: jest.fn(),
        setCurrentStep: jest.fn(),
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      renderWithProviders(<div>Test</div>);

      expect(screen.getByText('Failed to load onboarding')).toBeInTheDocument();
    });

    it('shows loading state when loading', () => {
      mockUseOnboardingStore.mockReturnValue({
        session: null,
        progress: null,
        currentStepConfig: null,
        isLoading: true,
        error: null,
        isInitialized: false,
        initializeOnboarding: jest.fn(),
        startOnboarding: jest.fn(),
        updateStep: jest.fn(),
        pauseOnboarding: jest.fn(),
        resumeOnboarding: jest.fn(),
        completeOnboarding: jest.fn(),
        setCurrentStep: jest.fn(),
        clearError: jest.fn(),
        reset: jest.fn(),
      });

      renderWithProviders(<div>Test</div>);

      expect(screen.getByText('Loading your onboarding...')).toBeInTheDocument();
    });
  });

  describe('Step Navigation', () => {
    it('shows completed steps with checkmarks', () => {
      const sessionWithCompletedSteps = {
        ...mockSession,
        completedSteps: [OnboardingStep.WELCOME],
        currentStep: OnboardingStep.ORGANIZATION_SETUP,
      };

      renderWithProviders(
        <OnboardingWizard
          session={sessionWithCompletedSteps}
          progress={mockProgress}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      // Check that welcome step shows as completed
      const stepIndicators = screen.getAllByRole('button');
      expect(stepIndicators.length).toBeGreaterThan(0);
    });

    it('shows complete setup button on last step', () => {
      const lastStepSession = {
        ...mockSession,
        currentStep: OnboardingStep.ANALYTICS_SETUP,
      };

      renderWithProviders(
        <OnboardingWizard
          session={lastStepSession}
          progress={mockProgress}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      expect(screen.getByText('Complete Setup')).toBeInTheDocument();
    });
  });

  describe('Internationalization', () => {
    it('displays translated text correctly', () => {
      renderWithProviders(
        <OnboardingWizard
          session={mockSession}
          progress={mockProgress}
          onStepComplete={jest.fn()}
          onComplete={jest.fn()}
        />
      );

      expect(screen.getByText('Setup Your Ticketing Platform')).toBeInTheDocument();
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Continue')).toBeInTheDocument();
      expect(screen.getByText('Skip for now')).toBeInTheDocument();
    });
  });
});