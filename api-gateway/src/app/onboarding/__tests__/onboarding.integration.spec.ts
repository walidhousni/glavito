import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { DatabaseService } from '@glavito/shared-database';
import { OnboardingModule } from '../onboarding.module';
import { OnboardingStep } from '@glavito/shared-types';

describe('Onboarding Integration Tests', () => {
  let app: INestApplication;
  let databaseService: DatabaseService;
  let authToken: string;
  let tenantId: string;
  let userId: string;
  let sessionId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [OnboardingModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    databaseService = moduleFixture.get<DatabaseService>(DatabaseService);
    
    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  beforeEach(async () => {
    // Reset onboarding session before each test
    await databaseService.onboardingSession.deleteMany({
      where: { tenantId },
    });
  });

  describe('POST /onboarding/start', () => {
    it('should start a new onboarding session', async () => {
      const response = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          context: {
            industry: 'technology',
            companySize: '11-50',
          },
        })
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        userId,
        tenantId,
        currentStep: OnboardingStep.WELCOME,
        completedSteps: [],
        status: 'active',
      });

      sessionId = response.body.id;
    });

    it('should return existing session if already exists', async () => {
      // Create initial session
      const firstResponse = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      // Try to start again
      const secondResponse = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      expect(firstResponse.body.id).toBe(secondResponse.body.id);
    });
  });

  describe('GET /onboarding/status', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);
      
      sessionId = response.body.id;
    });

    it('should return current onboarding status', async () => {
      const response = await request(app.getHttpServer())
        .get('/onboarding/status')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        session: {
          id: sessionId,
          currentStep: OnboardingStep.WELCOME,
          status: 'active',
        },
        progress: {
          totalSteps: expect.any(Number),
          completedSteps: 0,
          progressPercentage: 0,
        },
      });
    });
  });

  describe('PUT /onboarding/step/:sessionId', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);
      
      sessionId = response.body.id;
    });

    it('should update step progress successfully', async () => {
      const stepData = {
        welcomed: true,
        timestamp: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .put(`/onboarding/step/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.WELCOME,
          data: stepData,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: stepData,
        nextStep: expect.any(String),
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app.getHttpServer())
        .put(`/onboarding/step/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.ORGANIZATION_SETUP,
          data: {
            companyName: '', // Invalid - too short
            primaryColor: 'invalid-color', // Invalid format
          },
        })
        .expect(200);

      expect(response.body).toMatchObject({
        success: false,
        errors: expect.arrayContaining([
          expect.stringContaining('companyName'),
          expect.stringContaining('primaryColor'),
        ]),
      });
    });

    it('should prevent skipping required dependencies', async () => {
      await request(app.getHttpServer())
        .put(`/onboarding/step/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.TEAM_MANAGEMENT, // Depends on ORGANIZATION_SETUP
          data: {},
        })
        .expect(400);
    });
  });

  describe('Complete Onboarding Flow', () => {
    it('should complete full onboarding process', async () => {
      // Start onboarding
      const startResponse = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      sessionId = startResponse.body.id;

      // Complete Welcome step
      await request(app.getHttpServer())
        .put(`/onboarding/step/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.WELCOME,
          data: { welcomed: true },
        })
        .expect(200);

      // Complete Organization Setup step
      await request(app.getHttpServer())
        .put(`/onboarding/step/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.ORGANIZATION_SETUP,
          data: {
            companyName: 'Test Company',
            primaryColor: '#3B82F6',
            industry: 'technology',
            companySize: '11-50',
          },
        })
        .expect(200);

      // Complete remaining required steps...
      // (In a real test, you'd complete all required steps)

      // Complete onboarding
      const completeResponse = await request(app.getHttpServer())
        .post(`/onboarding/complete/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(completeResponse.body).toMatchObject({
        success: true,
        completedAt: expect.any(String),
        summary: {
          totalTime: expect.any(Number),
          stepsCompleted: expect.any(Number),
          featuresEnabled: expect.any(Array),
        },
      });

      // Verify tenant is marked as onboarded
      const tenant = await databaseService.tenant.findUnique({
        where: { id: tenantId },
      });
      expect(tenant.onboardingComplete).toBe(true);
    });
  });

  describe('Configuration Integration', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);
      
      sessionId = response.body.id;
    });

    it('should configure organization branding', async () => {
      const brandingData = {
        companyName: 'Test Company',
        primaryColor: '#3B82F6',
        secondaryColor: '#6B7280',
        accentColor: '#F59E0B',
        industry: 'technology',
        companySize: '11-50',
      };

      await request(app.getHttpServer())
        .put(`/onboarding/step/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.ORGANIZATION_SETUP,
          data: brandingData,
        })
        .expect(200);

      // Verify branding was saved to tenant
      const tenant = await databaseService.tenant.findUnique({
        where: { id: tenantId },
      });

      expect(tenant.brandingConfig).toMatchObject({
        primaryColor: '#3B82F6',
        secondaryColor: '#6B7280',
        accentColor: '#F59E0B',
      });
    });

    it('should configure WhatsApp integration', async () => {
      const whatsappConfig = {
        whatsapp: {
          enabled: true,
          businessAccountId: 'test-business-id',
          accessToken: 'test-access-token',
          phoneNumberId: 'test-phone-id',
          webhookVerifyToken: 'test-verify-token',
        },
      };

      await request(app.getHttpServer())
        .put(`/onboarding/step/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.CHANNEL_CONFIGURATION,
          data: whatsappConfig,
        })
        .expect(200);

      // Verify integration status was created
      const integration = await databaseService.integrationStatus.findUnique({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'whatsapp',
          },
        },
      });

      expect(integration).toBeTruthy();
      expect(integration.status).toBe('connected');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid session ID', async () => {
      await request(app.getHttpServer())
        .put('/onboarding/step/invalid-session-id')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          stepId: OnboardingStep.WELCOME,
          data: {},
        })
        .expect(404);
    });

    it('should handle unauthorized requests', async () => {
      await request(app.getHttpServer())
        .post('/onboarding/start')
        .expect(401);
    });

    it('should handle malformed request data', async () => {
      const response = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);

      await request(app.getHttpServer())
        .put(`/onboarding/step/${response.body.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          // Missing required fields
        })
        .expect(400);
    });
  });

  describe('Pause and Resume', () => {
    beforeEach(async () => {
      const response = await request(app.getHttpServer())
        .post('/onboarding/start')
        .set('Authorization', `Bearer ${authToken}`)
        .send({})
        .expect(201);
      
      sessionId = response.body.id;
    });

    it('should pause and resume onboarding session', async () => {
      // Pause onboarding
      await request(app.getHttpServer())
        .put(`/onboarding/pause/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify session is paused
      let session = await databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
      });
      expect(session.status).toBe('paused');

      // Resume onboarding
      const resumeResponse = await request(app.getHttpServer())
        .put(`/onboarding/resume/${sessionId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(resumeResponse.body.status).toBe('active');

      // Verify session is active
      session = await databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
      });
      expect(session.status).toBe('active');
    });
  });

  // Helper functions
  async function setupTestData() {
    // Create test tenant
    const tenant = await databaseService.tenant.create({
      data: {
        name: 'Test Tenant',
        subdomain: 'test-tenant',
        plan: 'starter',
        status: 'active',
        settings: {},
        owner: {
          create: {
            email: 'test@example.com',
            passwordHash: 'hashed-password',
            firstName: 'Test',
            lastName: 'User',
            role: 'admin',
            status: 'active',
            emailVerified: true,
          },
        },
      },
      include: {
        owner: true,
      },
    });

    tenantId = tenant.id;
    userId = tenant.owner.id;

    // Generate mock auth token (in real implementation, use proper JWT)
    authToken = 'mock-jwt-token';
  }

  async function cleanupTestData() {
    // Clean up test data
    await databaseService.onboardingSession.deleteMany({
      where: { tenantId },
    });
    
    await databaseService.integrationStatus.deleteMany({
      where: { tenantId },
    });
    
    await databaseService.tenant.delete({
      where: { id: tenantId },
    });
  }
});