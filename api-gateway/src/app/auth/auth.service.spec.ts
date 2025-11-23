import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EmailService } from '../email/email.service';
import * as bcrypt from 'bcryptjs';
import { ConflictException, UnauthorizedException, NotFoundException } from '@nestjs/common';

jest.mock('bcryptjs');
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({ toString: jest.fn(() => 'random-token') })),
}));

describe('AuthService', () => {
  let service: AuthService;
  let databaseService: jest.Mocked<DatabaseService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let emailService: jest.Mocked<EmailService>;

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'agent',
    status: 'active',
    emailVerified: true,
    loginAttempts: 0,
    lockoutUntil: null,
    lastLoginAt: new Date(),
    tenantId: 'tenant-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            ssoProvider: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            invitation: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
            tenant: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config = {
                JWT_SECRET: 'test-secret',
                JWT_REFRESH_SECRET: 'test-refresh-secret',
                JWT_VERIFY_SECRET: 'test-verify-secret',
                JWT_RESET_SECRET: 'test-reset-secret',
                JWT_EXPIRES_IN: '24h',
                JWT_REFRESH_EXPIRES_IN: '7d',
                JWT_VERIFY_EXPIRES_IN: '24h',
                JWT_RESET_EXPIRES_IN: '1h',
                FRONTEND_URL: 'http://localhost:4200',
              };
              return config[key];
            }),
          },
        },
        {
          provide: EmailService,
          useValue: {
            sendVerificationEmail: jest.fn(),
            sendPasswordResetEmail: jest.fn(),
            sendInvitationEmail: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    databaseService = module.get(DatabaseService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
    emailService = module.get(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const registerData = {
      email: 'newuser@example.com',
      password: 'SecurePass123',
      firstName: 'Jane',
      lastName: 'Smith',
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = 'hashed-password';
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      databaseService.user.findUnique.mockResolvedValue(null);
      databaseService.user.create.mockResolvedValue({
        ...mockUser,
        ...registerData,
        passwordHash: hashedPassword,
        emailVerified: false,
      });

      const result = await service.register(registerData);

      expect(databaseService.user.create).toHaveBeenCalledWith({
        data: {
          email: registerData.email,
          passwordHash: hashedPassword,
          firstName: registerData.firstName,
          lastName: registerData.lastName,
          role: 'agent',
          status: 'active',
          emailVerified: false,
        },
      });
      expect(emailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw ConflictException if email already exists', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.register(registerData)).rejects.toThrow(ConflictException);
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'SecurePass123',
    };

    it('should successfully login a user', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      jwtService.sign.mockReturnValue('access-token');

      const result = await service.login(loginData);

      expect(databaseService.user.update).toHaveBeenCalledWith({
        where: { email: loginData.email },
        data: {
          lastLoginAt: expect.any(Date),
          loginAttempts: 0,
          lockoutUntil: null,
        },
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid credentials', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for locked account', async () => {
      const lockedUser = {
        ...mockUser,
        lockoutUntil: new Date(Date.now() + 3600000), // 1 hour from now
      };
      databaseService.user.findUnique.mockResolvedValue(lockedUser);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException for unverified email', async () => {
      const unverifiedUser = {
        ...mockUser,
        emailVerified: false,
      };
      databaseService.user.findUnique.mockResolvedValue(unverifiedUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should return user for valid credentials', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toEqual(mockUser);
    });

    it('should return null for invalid credentials', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      const result = await service.validateUser('test@example.com', 'wrong-password');

      expect(result).toBeNull();
    });

    it('should handle account lockout', async () => {
      const lockedUser = {
        ...mockUser,
        loginAttempts: 5,
        lockoutUntil: new Date(Date.now() + 3600000),
      };
      databaseService.user.findUnique.mockResolvedValue(lockedUser);

      const result = await service.validateUser('test@example.com', 'password');

      expect(result).toBeNull();
    });
  });

  describe('refreshTokens', () => {
    it('should successfully refresh tokens', async () => {
      const refreshToken = 'valid-refresh-token';
      jwtService.verify.mockReturnValue({ userId: mockUser.id });
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('new-access-token');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      const refreshToken = 'invalid-refresh-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should successfully logout a user', async () => {
      const refreshToken = 'valid-refresh-token';
      jwtService.verify.mockReturnValue({ userId: mockUser.id });

      await service.logout(refreshToken);

      expect(jwtService.verify).toHaveBeenCalledWith(refreshToken, {
        secret: 'test-refresh-secret',
      });
    });
  });

  describe('verifyEmail', () => {
    it('should successfully verify email', async () => {
      const token = 'verification-token';
      jwtService.verify.mockReturnValue({ userId: mockUser.id });
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      databaseService.user.update.mockResolvedValue({
        ...mockUser,
        emailVerified: true,
      });

      const result = await service.verifyEmail(token);

      expect(databaseService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { emailVerified: true },
      });
      expect(result).toHaveProperty('emailVerified', true);
    });

    it('should throw NotFoundException for invalid token', async () => {
      const token = 'invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.verifyEmail(token)).rejects.toThrow(NotFoundException);
    });
  });

  describe('sendPasswordReset', () => {
    it('should successfully send password reset email', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('reset-token');

      await service.sendPasswordReset('test@example.com');

      expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith(
        mockUser.email,
        'reset-token',
      );
    });

    it('should not throw error for non-existent email (security)', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);

      await expect(service.sendPasswordReset('nonexistent@example.com')).resolves.not.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should successfully reset password', async () => {
      const token = 'valid-reset-token';
      const newPassword = 'NewSecurePass123';
      jwtService.verify.mockReturnValue({ userId: mockUser.id });
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new-hashed-password');

      await service.resetPassword(token, newPassword);

      expect(databaseService.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: 'new-hashed-password',
          loginAttempts: 0,
          lockoutUntil: null,
        },
      });
    });

    it('should throw NotFoundException for invalid token', async () => {
      const token = 'invalid-token';
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(service.resetPassword(token, 'new-password')).rejects.toThrow(NotFoundException);
    });
  });

  describe('createInvitation', () => {
    const invitationData = {
      email: 'invited@example.com',
      role: 'agent',
      tenantId: 'tenant-123',
      inviterUserId: mockUser.id,
    };

    it('should successfully create invitation', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);
      databaseService.invitation.create.mockResolvedValue({
        id: 'invitation-123',
        email: invitationData.email,
        role: invitationData.role,
        token: 'invitation-token',
        status: 'pending',
        tenantId: invitationData.tenantId,
        inviterUserId: invitationData.inviterUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.createInvitation(invitationData);

      expect(databaseService.invitation.create).toHaveBeenCalledWith({
        data: {
          email: invitationData.email,
          role: invitationData.role,
          token: expect.any(String),
          tenantId: invitationData.tenantId,
          inviterUserId: invitationData.inviterUserId,
          expiresAt: expect.any(Date),
        },
      });
      expect(emailService.sendInvitationEmail).toHaveBeenCalled();
      expect(result).toHaveProperty('token');
    });

    it('should throw ConflictException if user already exists', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.createInvitation(invitationData)).rejects.toThrow(ConflictException);
    });
  });

  describe('acceptInvitation', () => {
    const acceptData = {
      token: 'invitation-token',
      firstName: 'Jane',
      lastName: 'Doe',
      password: 'SecurePass123',
    };

    it('should successfully accept invitation', async () => {
      const invitation = {
        id: 'invitation-123',
        email: 'invited@example.com',
        role: 'agent',
        token: acceptData.token,
        status: 'pending',
        tenantId: 'tenant-123',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      databaseService.invitation.findUnique.mockResolvedValue(invitation);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
      databaseService.user.create.mockResolvedValue({
        ...mockUser,
        ...acceptData,
        passwordHash: 'hashed-password',
      });

      const result = await service.acceptInvitation(acceptData);

      expect(databaseService.user.create).toHaveBeenCalledWith({
        data: {
          email: invitation.email,
          passwordHash: 'hashed-password',
          firstName: acceptData.firstName,
          lastName: acceptData.lastName,
          role: invitation.role,
          tenantId: invitation.tenantId,
          status: 'active',
          emailVerified: true,
        },
      });
      expect(databaseService.invitation.update).toHaveBeenCalledWith({
        where: { id: invitation.id },
        data: { status: 'accepted' },
      });
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
    });

    it('should throw NotFoundException for invalid invitation', async () => {
      databaseService.invitation.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvitation(acceptData)).rejects.toThrow(NotFoundException);
    });

    it('should throw UnauthorizedException for expired invitation', async () => {
      const expiredInvitation = {
        id: 'invitation-123',
        email: 'invited@example.com',
        role: 'agent',
        token: acceptData.token,
        status: 'pending',
        expiresAt: new Date(Date.now() - 1000), // Expired
      };

      databaseService.invitation.findUnique.mockResolvedValue(expiredInvitation);

      await expect(service.acceptInvitation(acceptData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getUserProfile(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should throw NotFoundException for non-existent user', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile('nonexistent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('initiateSSO', () => {
    it('should return SSO initiation URL', async () => {
      const ssoData = {
        provider: 'google' as const,
        redirectUrl: 'http://localhost:4200/auth/callback',
      };

      const result = await service.initiateSSO(ssoData);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('state');
    });
  });

  describe('handleSSOCallback', () => {
    it('should handle successful SSO callback for new user', async () => {
      const ssoData = {
        provider: 'google' as const,
        code: 'oauth-code',
        state: 'csrf-state',
      };

      const mockSSOProfile = {
        id: 'google-123',
        email: 'google@example.com',
        name: 'Google User',
        picture: 'https://example.com/avatar.jpg',
      };

      jest.spyOn(service, 'getSSOProfile').mockResolvedValue(mockSSOProfile);
      databaseService.user.findUnique.mockResolvedValue(null);
      databaseService.user.create.mockResolvedValue({
        ...mockUser,
        email: mockSSOProfile.email,
        firstName: 'Google',
        lastName: 'User',
        emailVerified: true,
      });
      databaseService.ssoProvider.create.mockResolvedValue({
        id: 'sso-123',
        userId: mockUser.id,
        provider: 'google',
        providerId: mockSSOProfile.id,
        email: mockSSOProfile.email,
      });

      const result = await service.handleSSOCallback(ssoData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('isNewUser', true);
    });

    it('should handle SSO callback for existing user', async () => {
      const ssoData = {
        provider: 'google' as const,
        code: 'oauth-code',
        state: 'csrf-state',
      };

      const mockSSOProfile = {
        id: 'google-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      };

      jest.spyOn(service, 'getSSOProfile').mockResolvedValue(mockSSOProfile);
      databaseService.user.findUnique.mockResolvedValue(mockUser);
      databaseService.ssoProvider.findUnique.mockResolvedValue({
        id: 'sso-123',
        userId: mockUser.id,
        provider: 'google',
        providerId: mockSSOProfile.id,
        email: mockSSOProfile.email,
      });

      const result = await service.handleSSOCallback(ssoData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('isNewUser', false);
    });
  });
});