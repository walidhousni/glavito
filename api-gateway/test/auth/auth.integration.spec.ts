import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { PrismaService } from '../../src/app/prisma/prisma.service';
import { RedisService } from '@glavito/shared-redis';
import { EventPublisherService } from '@glavito/shared-kafka';

describe('Authentication Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let redisService: RedisService;
  let eventPublisher: EventPublisherService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);
    redisService = moduleFixture.get<RedisService>(RedisService);
    eventPublisher = moduleFixture.get<EventPublisherService>(EventPublisherService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await prisma.invitation.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();
    await redisService.flushAll();
  });

  describe('User Registration', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenantName: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toMatchObject({
        user: {
          email: registerDto.email,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: registerDto.email },
        include: { tenant: true },
      });
      expect(user).toBeDefined();
      expect(user.tenant.name).toBe(registerDto.tenantName);
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'Test123!@#',
        firstName: 'John',
        lastName: 'Doe',
        tenantName: 'Test Company',
      };

      // Create first user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Try to create duplicate
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('already exists');
    });

    it('should fail with weak password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'weak',
        firstName: 'John',
        lastName: 'Doe',
        tenantName: 'Test Company',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('password');
    });
  });

  describe('User Login', () => {
    beforeEach(async () => {
      // Create a test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Test123!@#',
          firstName: 'Test',
          lastName: 'User',
          tenantName: 'Test Company',
        })
        .expect(201);
    });

    it('should login successfully with valid credentials', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: loginDto.email,
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
    });

    it('should fail with invalid password', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'wrongpassword',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with non-existent user', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Test123!@#',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });
  });

  describe('Token Refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Login to get refresh token
      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'login@example.com',
          password: 'Test123!@#',
        })
        .expect(200);

      refreshToken = loginResponse.body.tokens.refreshToken;
    });

    it('should refresh tokens successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(200);

      expect(response.body).toMatchObject({
        accessToken: expect.any(String),
        refreshToken: expect.any(String),
      });

      // Verify old refresh token is invalidated
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });

    it('should fail with invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);

      expect(response.body.message).toContain('Invalid refresh token');
    });
  });

  describe('SSO Authentication', () => {
    it('should initiate Google SSO', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/sso/google')
        .expect(302);

      expect(response.header.location).toContain('google.com');
    });

    it('should initiate Microsoft SSO', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/sso/microsoft')
        .expect(302);

      expect(response.header.location).toContain('microsoft.com');
    });

    it('should initiate GitHub SSO', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/sso/github')
        .expect(302);

      expect(response.header.location).toContain('github.com');
    });
  });

  describe('Password Reset', () => {
    beforeEach(async () => {
      // Create test user
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'reset@example.com',
          password: 'Test123!@#',
          firstName: 'Reset',
          lastName: 'User',
          tenantName: 'Test Company',
        })
        .expect(201);
    });

    it('should send password reset email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'reset@example.com' })
        .expect(200);

      expect(response.body.message).toContain('sent');
    });

    it('should fail for non-existent email', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: 'nonexistent@example.com' })
        .expect(404);

      expect(response.body.message).toContain('not found');
    });
  });

  describe('Email Verification', () => {
    let verificationToken: string;

    beforeEach(async () => {
      // Create unverified user
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'verify@example.com',
          password: 'Test123!@#',
          firstName: 'Verify',
          lastName: 'User',
          tenantName: 'Test Company',
        })
        .expect(201);

      // Get verification token from Redis
      verificationToken = await redisService.get(`email-verification:verify@example.com`);
    });

    it('should verify email successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: verificationToken })
        .expect(200);

      expect(response.body.message).toContain('verified');

      // Verify user is now verified
      const user = await prisma.user.findUnique({
        where: { email: 'verify@example.com' },
      });
      expect(user.emailVerified).toBe(true);
    });

    it('should fail with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/verify-email')
        .send({ token: 'invalid-token' })
        .expect(400);

      expect(response.body.message).toContain('Invalid or expired token');
    });
  });

  describe('Invitations', () => {
    let adminToken: string;
    let tenantId: string;

    beforeEach(async () => {
      // Create admin user and get token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'admin@example.com',
          password: 'Test123!@#',
          firstName: 'Admin',
          lastName: 'User',
          tenantName: 'Test Company',
        })
        .expect(201);

      adminToken = registerResponse.body.tokens.accessToken;
      tenantId = registerResponse.body.user.tenantId;
    });

    it('should create invitation successfully', async () => {
      const invitationDto = {
        email: 'invite@example.com',
        role: 'USER',
        tenantId,
      };

      const response = await request(app.getHttpServer())
        .post('/auth/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invitationDto)
        .expect(201);

      expect(response.body).toMatchObject({
        email: invitationDto.email,
        role: invitationDto.role,
        status: 'PENDING',
      });
    });

    it('should accept invitation successfully', async () => {
      // Create invitation
      const invitationResponse = await request(app.getHttpServer())
        .post('/auth/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'accept@example.com',
          role: 'USER',
          tenantId,
        })
        .expect(201);

      const invitationId = invitationResponse.body.id;
      const invitationToken = invitationResponse.body.token;

      // Accept invitation
      const response = await request(app.getHttpServer())
        .post(`/auth/invitations/${invitationId}/accept`)
        .send({
          firstName: 'Invited',
          lastName: 'User',
          password: 'Test123!@#',
          token: invitationToken,
        })
        .expect(200);

      expect(response.body).toMatchObject({
        user: {
          email: 'accept@example.com',
          tenantId,
        },
        tokens: {
          accessToken: expect.any(String),
          refreshToken: expect.any(String),
        },
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on login attempts', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      // Make multiple failed attempts
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send(loginDto)
          .expect(401);
      }

      // Next attempt should be rate limited
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(429);

      expect(response.body.message).toContain('Too many attempts');
    });
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/health')
        .expect(200);

      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-xss-protection']).toBe('1; mode=block');
    });
  });

  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/health')
        .expect(200);

      expect(response.body).toMatchObject({
        status: 'ok',
        timestamp: expect.any(String),
        services: {
          database: 'connected',
          redis: 'connected',
        },
      });
    });
  });
});