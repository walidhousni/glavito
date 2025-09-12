import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from '../onboarding.service';
import { DatabaseService } from '@glavito/shared-database';
import { OnboardingStep } from '@glavito/shared-types';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OnboardingService', () => {
  let service: OnboardingService;
  let databaseService: jest.Mocked<DatabaseService>;

  const mockSession = {
    id: 'session-1',
    userId: 'user-1',
    tenantId: 'tenant-1',
    currentStep: OnboardingStep.WELCOME,
    completedSteps: [],
    stepData: {},
    status: 'active',
    startedAt: new Date(),
    lastActivityAt: new Date(),
    estimatedCompletion: new Date(),
    metadata: {},
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      onboardingSession: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        deleteMany: jest.fn(),
      },
      tenant: {
        update: jest.fn(),
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OnboardingService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
      ],
    }).compile();

    service = module.get<OnboardingService>(OnboardingService);
    databaseService = module.get(DatabaseService);
  });

  describe('startOnboarding', () => {
    it('should create a new onboarding session', async () => {
      databaseService.onboardingSession.findUnique.mockResolvedValue(null);
      databaseService.onboardingSession.create.mockResolvedValue(mockSession);

      const result = await service.startOnboarding('user-1', 'tenant-1');

      expect(result).toEqual(mockSession);
      expect(databaseService.onboardingSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          tenantId: 'tenant-1',
          currentStep: OnboardingStep.WELCOME,
          completedSteps: [],
          stepData: {},
          status: 'active',
        }),
      });
    });

    it('should return existing session if not completed', async () => {
      const existingSession = { ...mockSession, status: 'paused' };
      databaseService.onboardingSession.findUnique.mockResolvedValue(existingSession);

      const result = await service.startOnboarding('user-1', 'tenant-1');

      expect(result).toEqual(existingSession);
      expect(databaseService.onboardingSession.create).not.toHaveBeenCalled();
    });

    it('should create new session if existing one is completed', async () => {
      const completedSession = { ...mockSession, status: 'completed' };
      databaseService.onboardingSession.findUnique.mockResolvedValue(completedSession);
      databaseService.onboardingSession.create.mockResolvedValue(mockSession);

      const result = await service.startOnboarding('user-1', 'tenant-1');

      expect(result).toEqual(mockSession);
      expect(databaseService.onboardingSession.create).toHaveBeenCalled();
    });
  });

  describe('getOnboardingProgress', () => {
    it('should return progress information', async () => {
      const sessionWithProgress = {
        ...mockSession,
        completedSteps: [OnboardingStep.WELCOME],
      };
      databaseService.onboardingSession.findUnique.mockResolvedValue(sessionWithProgress);

      const result = await service.getOnboardingProgress('session-1');

      expect(result).toMatchObject({
        totalSteps: expect.any(Number),
        completedSteps: 1,
        currentStep: OnboardingStep.WELCOME,
        progressPercentage: expect.any(Number),
        estimatedTimeRemaining: expect.any(Number),
        nextRecommendedAction: expect.any(String),
      });
    });

    it('should throw NotFoundException for invalid session', async () => {
      databaseService.onboardingSession.findUnique.mockResolvedValue(null);

      await expect(service.getOnboardingProgress('invalid-session')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('updateStepProgress', () => {
    beforeEach(() => {
      databaseService.onboardingSession.findUnique.mockResolvedValue(mockSession);
      databaseService.onboardingSession.update.mockResolvedValue({
        ...mockSession,
        completedSteps: [OnboardingStep.WELCOME],
      });
    });

    it('should update step progress successfully', async () => {
      const stepData = { welcomed: true };

      const result = await service.updateStepProgress(
        'session-1',
        OnboardingStep.WELCOME,
        stepData
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(stepData);
      expect(databaseService.onboardingSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          completedSteps: [OnboardingStep.WELCOME],
          stepData: { [OnboardingStep.WELCOME]: stepData },
        }),
      });
    });

    it('should validate step data', async () => {
      const invalidData = { companyName: '' }; // Too short

      const result = await service.updateStepProgress(
        'session-1',
        OnboardingStep.ORGANIZATION_SETUP,
        invalidData
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('companyName must be at least 2 characters');
    });

    it('should check step dependencies', async () => {
      // Try to complete team management without organization setup
      await expect(
        service.updateStepProgress('session-1', OnboardingStep.TEAM_MANAGEMENT, {})
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException for invalid session', async () => {
      databaseService.onboardingSession.findUnique.mockResolvedValue(null);

      await expect(
        service.updateStepProgress('invalid-session', OnboardingStep.WELCOME, {})
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive session', async () => {
      const inactiveSession = { ...mockSession, status: 'completed' };
      databaseService.onboardingSession.findUnique.mockResolvedValue(inactiveSession);

      await expect(
        service.updateStepProgress('session-1', OnboardingStep.WELCOME, {})
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeOnboarding', () => {
    it('should complete onboarding successfully', async () => {
      const completedSession = {
        ...mockSession,
        completedSteps: [OnboardingStep.WELCOME, OnboardingStep.ORGANIZATION_SETUP],
      };
      databaseService.onboardingSession.findUnique.mockResolvedValue(completedSession);
      databaseService.onboardingSession.update.mockResolvedValue({
        ...completedSession,
        status: 'completed',
        completedAt: new Date(),
      });
      databaseService.tenant.update.mockResolvedValue({} as any);

      const result = await service.completeOnboarding('session-1');

      expect(result.success).toBe(true);
      expect(result.completedAt).toBeDefined();
      expect(result.summary).toMatchObject({
        totalTime: expect.any(Number),
        stepsCompleted: 2,
        featuresEnabled: expect.any(Array),
      });

      expect(databaseService.tenant.update).toHaveBeenCalledWith({
        where: { id: 'tenant-1' },
        data: { onboardingComplete: true },
      });
    });

    it('should throw BadRequestException if required steps are missing', async () => {
      const incompleteSession = {
        ...mockSession,
        completedSteps: [], // Missing required steps
      };
      databaseService.onboardingSession.findUnique.mockResolvedValue(incompleteSession);

      await expect(service.completeOnboarding('session-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('pauseOnboarding', () => {
    it('should pause onboarding session', async () => {
      databaseService.onboardingSession.findUnique.mockResolvedValue(mockSession);
      databaseService.onboardingSession.update.mockResolvedValue({
        ...mockSession,
        status: 'paused',
      });

      await service.pauseOnboarding('session-1');

      expect(databaseService.onboardingSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: 'paused',
          lastActivityAt: expect.any(Date),
        },
      });
    });
  });

  describe('resumeOnboarding', () => {
    it('should resume paused onboarding session', async () => {
      const pausedSession = { ...mockSession, status: 'paused' };
      databaseService.onboardingSession.findUnique.mockResolvedValue(pausedSession);
      databaseService.onboardingSession.update.mockResolvedValue({
        ...pausedSession,
        status: 'active',
      });

      const result = await service.resumeOnboarding('session-1');

      expect(result.status).toBe('active');
      expect(databaseService.onboardingSession.update).toHaveBeenCalledWith({
        where: { id: 'session-1' },
        data: {
          status: 'active',
          lastActivityAt: expect.any(Date),
        },
      });
    });

    it('should throw BadRequestException if session is not paused', async () => {
      databaseService.onboardingSession.findUnique.mockResolvedValue(mockSession);

      await expect(service.resumeOnboarding('session-1')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getStepConfiguration', () => {
    it('should return step configuration', async () => {
      const result = await service.getStepConfiguration(OnboardingStep.WELCOME);

      expect(result).toMatchObject({
        id: OnboardingStep.WELCOME,
        title: expect.any(String),
        description: expect.any(String),
        isRequired: expect.any(Boolean),
        estimatedTime: expect.any(Number),
        dependencies: expect.any(Array),
        validationRules: expect.any(Object),
      });
    });

    it('should throw NotFoundException for invalid step', async () => {
      await expect(service.getStepConfiguration('invalid-step' as OnboardingStep)).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('private methods', () => {
    describe('validateStepData', () => {
      it('should validate organization setup data', () => {
        const service = new OnboardingService(databaseService);
        const validData = {
          companyName: 'Test Company',
          primaryColor: '#3B82F6',
        };

        // Access private method for testing
        const errors = (service as any).validateStepData(
          OnboardingStep.ORGANIZATION_SETUP,
          validData
        );

        expect(errors).toHaveLength(0);
      });

      it('should return validation errors for invalid data', () => {
        const service = new OnboardingService(databaseService);
        const invalidData = {
          companyName: 'A', // Too short
          primaryColor: 'invalid-color', // Invalid format
        };

        const errors = (service as any).validateStepData(
          OnboardingStep.ORGANIZATION_SETUP,
          invalidData
        );

        expect(errors.length).toBeGreaterThan(0);
        expect(errors).toContain('companyName must be at least 2 characters');
        expect(errors).toContain('primaryColor format is invalid');
      });
    });

    describe('extractEnabledFeatures', () => {
      it('should extract enabled features from step data', () => {
        const service = new OnboardingService(databaseService);
        const stepData = {
          [OnboardingStep.CHANNEL_CONFIGURATION]: {
            whatsapp: { enabled: true },
            instagram: { enabled: true },
            email: { enabled: false },
          },
          [OnboardingStep.AI_CONFIGURATION]: {
            ticketClassification: true,
            sentimentAnalysis: false,
            autoResponse: true,
          },
          [OnboardingStep.PAYMENT_SETUP]: {
            enablePayments: true,
          },
        };

        const features = (service as any).extractEnabledFeatures(stepData);

        expect(features).toContain('WhatsApp Integration');
        expect(features).toContain('Instagram Integration');
        expect(features).toContain('AI Ticket Classification');
        expect(features).toContain('Auto Response');
        expect(features).toContain('Stripe Payment Processing');
        expect(features).not.toContain('Sentiment Analysis');
      });
    });
  });
});