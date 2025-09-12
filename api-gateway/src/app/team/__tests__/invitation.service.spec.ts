/**
 * Invitation Service Tests
 * Comprehensive test suite for invitation management functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { 
  InvitationService, 
  SendInvitationRequest, 
  BulkInviteRequest,
  AcceptInvitationRequest 
} from '../invitation.service';
import { DatabaseService } from '@glavito/shared-database';

describe('InvitationService', () => {
  let service: InvitationService;
  let databaseService: jest.Mocked<DatabaseService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let configService: jest.Mocked<ConfigService>;

  const mockTenantId = 'tenant-123';
  const mockInviterId = 'inviter-123';
  const mockInvitationId = 'invitation-123';
  const mockToken = 'mock-token-123';

  const mockInviter = {
    id: mockInviterId,
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@example.com',
  };

  const mockTenant = {
    id: mockTenantId,
    name: 'Test Company',
  };

  const mockInvitation = {
    id: mockInvitationId,
    tenantId: mockTenantId,
    inviterUserId: mockInviterId,
    email: 'test@example.com',
    role: 'agent',
    token: mockToken,
    status: 'pending',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        count: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      invitation: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      userPermission: {
        createMany: jest.fn(),
      },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const mockConfigService = {
      get: jest.fn().mockReturnValue('http://localhost:3000'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: HttpService,
          useValue: {
            get: jest.fn(),
            post: jest.fn(),
          },
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<InvitationService>(InvitationService);
    databaseService = module.get(DatabaseService);
    eventEmitter = module.get(EventEmitter2);
    configService = module.get(ConfigService);
  });

  describe('sendInvitation', () => {
    const invitationRequest: SendInvitationRequest = {
      email: 'test@example.com',
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'agent',
      message: 'Welcome to our team!',
      expiresInDays: 7,
    };

    it('should send invitation successfully', async () => {
      databaseService.user.findFirst.mockResolvedValue(null); // No existing user
      databaseService.invitation.findFirst.mockResolvedValue(null); // No existing invitation
      databaseService.user.findUnique.mockResolvedValue(mockInviter);
      databaseService.invitation.create.mockResolvedValue(mockInvitation);

      const result = await service.sendInvitation(
        mockTenantId,
        invitationRequest,
        mockInviterId
      );

      expect(result).toMatchObject({
        id: mockInvitationId,
        email: 'test@example.com',
        role: 'agent',
        status: 'pending',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('invitation.sent', {
        tenantId: mockTenantId,
        invitationId: mockInvitationId,
        email: 'test@example.com',
        role: 'agent',
        inviterId: mockInviterId,
      });
    });

    it('should throw BadRequestException when user already exists', async () => {
      const existingUser = { id: 'user-123', email: 'test@example.com' };
      databaseService.user.findFirst.mockResolvedValue(existingUser);

      await expect(
        service.sendInvitation(mockTenantId, invitationRequest, mockInviterId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when invitation already exists', async () => {
      databaseService.user.findFirst.mockResolvedValue(null);
      databaseService.invitation.findFirst.mockResolvedValue(mockInvitation);

      await expect(
        service.sendInvitation(mockTenantId, invitationRequest, mockInviterId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when inviter not found', async () => {
      databaseService.user.findFirst.mockResolvedValue(null);
      databaseService.invitation.findFirst.mockResolvedValue(null);
      databaseService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.sendInvitation(mockTenantId, invitationRequest, mockInviterId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendBulkInvitations', () => {
    const bulkRequest: BulkInviteRequest = {
      invitations: [
        {
          email: 'user1@example.com',
          firstName: 'User',
          lastName: 'One',
          role: 'agent',
        },
        {
          email: 'user2@example.com',
          firstName: 'User',
          lastName: 'Two',
          role: 'viewer',
        },
      ],
      message: 'Welcome to our team!',
      expiresInDays: 7,
    };

    it('should send bulk invitations successfully', async () => {
      // Mock successful invitation sending
      databaseService.user.findFirst.mockResolvedValue(null);
      databaseService.invitation.findFirst.mockResolvedValue(null);
      databaseService.user.findUnique.mockResolvedValue(mockInviter);
      databaseService.invitation.create.mockResolvedValue(mockInvitation);

      const result = await service.sendBulkInvitations(
        mockTenantId,
        bulkRequest,
        mockInviterId
      );

      expect(result.successful).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(eventEmitter.emit).toHaveBeenCalledWith('invitation.bulk.sent', {
        tenantId: mockTenantId,
        inviterId: mockInviterId,
        totalSent: 2,
        totalFailed: 0,
        successful: ['user1@example.com', 'user2@example.com'],
        failed: [],
      });
    });

    it('should handle partial failures in bulk invitations', async () => {
      // Mock first invitation success, second failure
      databaseService.user.findFirst
        .mockResolvedValueOnce(null) // First invitation - no existing user
        .mockResolvedValueOnce({ id: 'existing-user' }); // Second invitation - user exists
      
      databaseService.invitation.findFirst.mockResolvedValue(null);
      databaseService.user.findUnique.mockResolvedValue(mockInviter);
      databaseService.invitation.create.mockResolvedValue(mockInvitation);

      const result = await service.sendBulkInvitations(
        mockTenantId,
        bulkRequest,
        mockInviterId
      );

      expect(result.successful).toHaveLength(1);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].email).toBe('user2@example.com');
    });
  });

  describe('getInvitations', () => {
    it('should return invitations with pagination', async () => {
      const mockInvitations = [
        {
          ...mockInvitation,
          inviter: mockInviter,
        },
      ];

      databaseService.invitation.findMany.mockResolvedValue(mockInvitations);
      databaseService.invitation.count.mockResolvedValue(1);

      const result = await service.getInvitations(mockTenantId, {
        status: 'pending',
        limit: 10,
        offset: 0,
      });

      expect(result.invitations).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.invitations[0]).toMatchObject({
        id: mockInvitationId,
        email: 'test@example.com',
        role: 'agent',
        status: 'pending',
      });
    });

    it('should filter invitations by status and role', async () => {
      databaseService.invitation.findMany.mockResolvedValue([]);
      databaseService.invitation.count.mockResolvedValue(0);

      await service.getInvitations(mockTenantId, {
        status: 'pending',
        role: 'agent',
      });

      expect(databaseService.invitation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            tenantId: mockTenantId,
            status: 'pending',
            role: 'agent',
          },
        })
      );
    });
  });

  describe('resendInvitation', () => {
    it('should resend invitation successfully', async () => {
      const mockInvitationWithInviter = {
        ...mockInvitation,
        inviter: mockInviter,
      };

      databaseService.invitation.findFirst.mockResolvedValue(mockInvitationWithInviter);

      const result = await service.resendInvitation(
        mockTenantId,
        mockInvitationId,
        mockInviterId
      );

      expect(result).toMatchObject({
        id: mockInvitationId,
        email: 'test@example.com',
        status: 'pending',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('invitation.resent', {
        tenantId: mockTenantId,
        invitationId: mockInvitationId,
        email: 'test@example.com',
        actorId: mockInviterId,
      });
    });

    it('should extend expiration for expired invitations', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        inviter: mockInviter,
      };

      databaseService.invitation.findFirst.mockResolvedValue(expiredInvitation);
      databaseService.invitation.update.mockResolvedValue({
        ...expiredInvitation,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      });

      await service.resendInvitation(mockTenantId, mockInvitationId, mockInviterId);

      expect(databaseService.invitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitationId },
        data: { expiresAt: expect.any(Date) },
      });
    });

    it('should throw NotFoundException when invitation not found', async () => {
      databaseService.invitation.findFirst.mockResolvedValue(null);

      await expect(
        service.resendInvitation(mockTenantId, 'non-existent', mockInviterId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('cancelInvitation', () => {
    it('should cancel invitation successfully', async () => {
      databaseService.invitation.findFirst.mockResolvedValue(mockInvitation);
      databaseService.invitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'cancelled',
      });

      await service.cancelInvitation(mockTenantId, mockInvitationId, mockInviterId);

      expect(databaseService.invitation.update).toHaveBeenCalledWith({
        where: { id: mockInvitationId },
        data: { status: 'cancelled' },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('invitation.cancelled', {
        tenantId: mockTenantId,
        invitationId: mockInvitationId,
        email: 'test@example.com',
        actorId: mockInviterId,
      });
    });

    it('should throw NotFoundException when invitation not found', async () => {
      databaseService.invitation.findFirst.mockResolvedValue(null);

      await expect(
        service.cancelInvitation(mockTenantId, 'non-existent', mockInviterId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptInvitation', () => {
    const acceptRequest: AcceptInvitationRequest = {
      token: mockToken,
      firstName: 'Jane',
      lastName: 'Smith',
      password: 'securePassword123',
    };

    it('should accept invitation successfully', async () => {
      const mockInvitationWithTenant = {
        ...mockInvitation,
        tenant: mockTenant,
      };

      const mockCreatedUser = {
        id: 'new-user-123',
        tenantId: mockTenantId,
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'agent',
      };

      databaseService.invitation.findFirst.mockResolvedValue(mockInvitationWithTenant);
      databaseService.user.findFirst.mockResolvedValue(null); // No existing user
      databaseService.user.create.mockResolvedValue(mockCreatedUser);
      databaseService.invitation.update.mockResolvedValue({
        ...mockInvitation,
        status: 'accepted',
        acceptedAt: new Date(),
      });

      const result = await service.acceptInvitation(acceptRequest);

      expect(result.success).toBe(true);
      expect(result.user).toMatchObject({
        id: 'new-user-123',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'agent',
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('invitation.accepted', {
        tenantId: mockTenantId,
        invitationId: mockInvitationId,
        userId: 'new-user-123',
        email: 'test@example.com',
        role: 'agent',
      });
    });

    it('should return failure for invalid token', async () => {
      databaseService.invitation.findFirst.mockResolvedValue(null);

      const result = await service.acceptInvitation(acceptRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid or expired invitation token');
    });

    it('should return failure when user already exists', async () => {
      const mockInvitationWithTenant = {
        ...mockInvitation,
        tenant: mockTenant,
      };

      databaseService.invitation.findFirst.mockResolvedValue(mockInvitationWithTenant);
      databaseService.user.findFirst.mockResolvedValue({ id: 'existing-user' });

      const result = await service.acceptInvitation(acceptRequest);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User already exists in this organization');
    });
  });

  describe('getInvitationByToken', () => {
    it('should return valid invitation details', async () => {
      const mockInvitationWithDetails = {
        ...mockInvitation,
        tenant: mockTenant,
        inviter: mockInviter,
      };

      databaseService.invitation.findFirst.mockResolvedValue(mockInvitationWithDetails);

      const result = await service.getInvitationByToken(mockToken);

      expect(result.valid).toBe(true);
      expect(result.invitation).toMatchObject({
        email: 'test@example.com',
        role: 'agent',
        tenantName: 'Test Company',
        inviterName: 'John Doe',
      });
    });

    it('should return invalid for non-existent token', async () => {
      databaseService.invitation.findFirst.mockResolvedValue(null);

      const result = await service.getInvitationByToken('invalid-token');

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invalid invitation token');
    });

    it('should return invalid for expired invitation', async () => {
      const expiredInvitation = {
        ...mockInvitation,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Expired yesterday
        tenant: mockTenant,
        inviter: mockInviter,
      };

      databaseService.invitation.findFirst.mockResolvedValue(expiredInvitation);

      const result = await service.getInvitationByToken(mockToken);

      expect(result.valid).toBe(false);
      expect(result.message).toBe('Invitation has expired');
    });
  });

  describe('getInvitationStats', () => {
    it('should return comprehensive invitation statistics', async () => {
      const mockRecentInvitations = [
        {
          ...mockInvitation,
          inviter: mockInviter,
        },
      ];

      databaseService.invitation.count
        .mockResolvedValueOnce(10) // totalSent
        .mockResolvedValueOnce(3)  // pending
        .mockResolvedValueOnce(6)  // accepted
        .mockResolvedValueOnce(1); // expired

      databaseService.invitation.findMany.mockResolvedValue(mockRecentInvitations);

      const result = await service.getInvitationStats(mockTenantId);

      expect(result).toMatchObject({
        totalSent: 10,
        pending: 3,
        accepted: 6,
        expired: 1,
        acceptanceRate: 60, // 6/10 * 100
        recentInvitations: expect.arrayContaining([
          expect.objectContaining({
            id: mockInvitationId,
            email: 'test@example.com',
          }),
        ]),
      });
    });

    it('should handle zero invitations', async () => {
      databaseService.invitation.count.mockResolvedValue(0);
      databaseService.invitation.findMany.mockResolvedValue([]);

      const result = await service.getInvitationStats(mockTenantId);

      expect(result.acceptanceRate).toBe(0);
      expect(result.recentInvitations).toHaveLength(0);
    });
  });

  describe('cleanupExpiredInvitations', () => {
    it('should cleanup expired invitations', async () => {
      databaseService.invitation.updateMany.mockResolvedValue({ count: 5 });

      const result = await service.cleanupExpiredInvitations();

      expect(result).toBe(5);
      expect(databaseService.invitation.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'pending',
          expiresAt: { lt: expect.any(Date) },
        },
        data: {
          status: 'expired',
        },
      });
    });

    it('should handle cleanup errors gracefully', async () => {
      databaseService.invitation.updateMany.mockRejectedValue(new Error('Database error'));

      const result = await service.cleanupExpiredInvitations();

      expect(result).toBe(0);
    });
  });
});