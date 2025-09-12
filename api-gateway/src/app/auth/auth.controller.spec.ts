import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { User } from '@glavito/shared-types';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockUser: User = {
    id: 'user-123',
    tenantId: 'tenant-123',
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'agent',
    status: 'active',
    avatar: undefined,
    lastLoginAt: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTokens = {
    accessToken: 'access-token',
    refreshToken: 'refresh-token',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            verifyEmail: jest.fn(),
            requestPasswordReset: jest.fn(),
            resetPassword: jest.fn(),
            createInvitation: jest.fn(),
            getInvitation: jest.fn(),
            acceptInvitation: jest.fn(),
            getUserProfile: jest.fn(),
            initiateSSO: jest.fn(),
            handleSSOCallback: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'newuser@example.com',
        password: 'SecurePass123',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      const expectedResult = {
        user: mockUser,
        ...mockTokens,
      };

      authService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle registration conflict', async () => {
      const registerDto = {
        email: 'existing@example.com',
        password: 'SecurePass123',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      authService.register.mockRejectedValue(new ConflictException('Email already exists'));

      await expect(controller.register(registerDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('POST /auth/login', () => {
    it('should successfully login a user', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'SecurePass123',
      };

      const expectedResult = {
        user: mockUser,
        ...mockTokens,
      };

      authService.login.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid credentials', async () => {
      const loginDto = {
        email: 'test@example.com',
        password: 'wrong-password',
      };

      authService.login.mockRejectedValue(new UnauthorizedException('Invalid credentials'));

      await expect(controller.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should successfully refresh tokens', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const expectedResult = {
        user: mockUser,
        ...mockTokens,
      };

      authService.refresh.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refresh).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
      expect(result).toEqual(expectedResult);
    });

    it('should handle invalid refresh token', async () => {
      const refreshTokenDto = {
        refreshToken: 'invalid-refresh-token',
      };

      authService.refresh.mockRejectedValue(new UnauthorizedException('Invalid refresh token'));

      await expect(controller.refresh(refreshTokenDto)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('POST /auth/logout', () => {
    it('should successfully logout a user', async () => {
      const logoutDto = {
        refreshToken: 'valid-refresh-token',
      };

      authService.logout.mockResolvedValue(undefined);

      const result = await controller.logout(logoutDto);

      expect(authService.logout).toHaveBeenCalledWith(logoutDto.refreshToken);
      expect(result).toEqual({ message: 'Successfully logged out' });
    });
  });

  describe('POST /auth/verify-email', () => {
    it('should successfully verify email', async () => {
      const token = 'verification-token';

      const expectedResult = {
        user: mockUser,
        ...mockTokens,
      };

      authService.verifyEmail.mockResolvedValue(expectedResult);

      const result = await controller.verifyEmail(token);

      expect(authService.verifyEmail).toHaveBeenCalledWith(token);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('POST /auth/password-reset', () => {
    it('should successfully send password reset email', async () => {
      const email = 'test@example.com';

      authService.requestPasswordReset.mockResolvedValue(undefined);

      const result = await controller.requestPasswordReset(email);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith(email);
      expect(result).toEqual({ message: 'Password reset email sent' });
    });
  });

  describe('POST /auth/password-reset/confirm', () => {
    it('should successfully reset password', async () => {
      const passwordResetConfirmDto = {
        token: 'reset-token',
        newPassword: 'NewSecurePass123',
      };

      authService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword(passwordResetConfirmDto);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        passwordResetConfirmDto.token,
        passwordResetConfirmDto.newPassword,
      );
      expect(result).toEqual({ message: 'Password successfully reset' });
    });
  });

  describe('POST /auth/invitations', () => {
    it('should successfully create invitation', async () => {
      const createInvitationDto = {
        email: 'invited@example.com',
        role: 'agent' as const,
      };

      const expectedInvitation = {
        id: 'invitation-123',
        email: 'invited@example.com',
        role: 'agent' as const,
        token: 'invitation-token',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      authService.createInvitation.mockResolvedValue(expectedInvitation);

      const result = await controller.createInvitation(createInvitationDto, {
        user: { ...mockUser, role: 'admin' },
      });

      expect(authService.createInvitation).toHaveBeenCalledWith({
        ...createInvitationDto,
        tenantId: mockUser.tenantId,
        inviterUserId: mockUser.id,
      });
      expect(result).toEqual(expectedInvitation);
    });
  });

  describe('GET /auth/invitations/:token', () => {
    it('should successfully get invitation details', async () => {
      const token = 'valid-invitation-token';
      const expectedInvitation = {
        id: 'invitation-123',
        email: 'invited@example.com',
        role: 'agent',
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      };

      authService.getInvitation.mockResolvedValue(expectedInvitation);

      const result = await controller.getInvitation(token);

      expect(authService.getInvitation).toHaveBeenCalledWith(token);
      expect(result).toEqual(expectedInvitation);
    });
  });

  describe('POST /auth/invitations/:token/accept', () => {
    it('should successfully accept invitation', async () => {
      const token = 'valid-invitation-token';
      const acceptInvitationDto = {
        firstName: 'Jane',
        lastName: 'Doe',
        password: 'SecurePass123',
        token: 'valid-invitation-token',
      };

      const expectedResult = {
        user: mockUser,
        ...mockTokens,
      };

      authService.acceptInvitation.mockResolvedValue(expectedResult);

      const result = await controller.acceptInvitation(token, acceptInvitationDto);

      expect(authService.acceptInvitation).toHaveBeenCalledWith(token, acceptInvitationDto);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('GET /auth/me', () => {
    it('should successfully get current user profile', async () => {
      authService.getUserProfile.mockResolvedValue(mockUser);

      const result = await controller.getProfile({ user: mockUser });

      expect(authService.getUserProfile).toHaveBeenCalledWith(mockUser.id);
      expect(result).toEqual(mockUser);
    });
  });

  describe('POST /auth/sso/initiate', () => {
    it('should successfully initiate SSO', async () => {
      const provider = 'google' as const;
      const redirectUrl = 'http://localhost:4200/auth/callback';

      const expectedResult = {
        url: 'https://accounts.google.com/oauth2/auth?...',
        state: 'csrf-state',
      };

      authService.initiateSSO.mockResolvedValue(expectedResult);

      const result = await controller.initiateSSO(provider, redirectUrl);

      expect(authService.initiateSSO).toHaveBeenCalledWith(provider, redirectUrl);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('POST /auth/sso/callback', () => {
    it('should successfully handle SSO callback', async () => {
      const provider = 'google' as const;
      const code = 'oauth-code';
      const state = 'csrf-state';

      const expectedResult = {
        user: mockUser,
        ...mockTokens,
        isNewUser: false,
      };

      authService.handleSSOCallback.mockResolvedValue(expectedResult);

      const result = await controller.handleSSOCallback(provider, code, state);

      expect(authService.handleSSOCallback).toHaveBeenCalledWith(provider, code, state);
      expect(result).toEqual(expectedResult);
    });
  });
});