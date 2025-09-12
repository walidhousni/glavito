/**
 * Team Service Tests
 * Comprehensive test suite for team management functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { TeamService, TeamMember, UpdateTeamMemberRequest } from '../team.service';
import { DatabaseService } from '@glavito/shared-database';

describe('TeamService', () => {
  let service: TeamService;
  let databaseService: jest.Mocked<DatabaseService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockActorId = 'actor-123';

  const mockUser = {
    id: mockUserId,
    tenantId: mockTenantId,
    email: 'test@example.com',
    firstName: 'John',
    lastName: 'Doe',
    role: 'agent',
    status: 'active',
    avatar: null,
    lastLoginAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    userPermissions: [
      {
        permission: {
          name: 'tickets.view',
        },
      },
      {
        permission: {
          name: 'customers.view',
        },
      },
    ],
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      user: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        groupBy: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      permission: {
        findMany: jest.fn(),
      },
      userPermission: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
        groupBy: jest.fn(),
      },
      invitation: {
        count: jest.fn(),
      },
      auditLog: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamService,
        {
          provide: DatabaseService,
          useValue: mockDatabaseService,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('test-value'),
          },
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

    service = module.get<TeamService>(TeamService);
    databaseService = module.get(DatabaseService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('getTeamMembers', () => {
    it('should return team members with pagination', async () => {
      const mockUsers = [mockUser];
      databaseService.user.findMany.mockResolvedValue(mockUsers);
      databaseService.user.count.mockResolvedValue(1);

      const result = await service.getTeamMembers(mockTenantId, {
        limit: 10,
        offset: 0,
      });

      expect(result.members).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.members[0]).toMatchObject({
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'agent',
        permissions: ['tickets.view', 'customers.view'],
      });
    });

    it('should filter team members by role', async () => {
      databaseService.user.findMany.mockResolvedValue([mockUser]);
      databaseService.user.count.mockResolvedValue(1);

      await service.getTeamMembers(mockTenantId, { role: 'agent' });

      expect(databaseService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'agent' }),
        })
      );
    });

    it('should search team members by name and email', async () => {
      databaseService.user.findMany.mockResolvedValue([mockUser]);
      databaseService.user.count.mockResolvedValue(1);

      await service.getTeamMembers(mockTenantId, { search: 'john' });

      expect(databaseService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
        })
      );
    });

    it('should handle database errors', async () => {
      databaseService.user.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getTeamMembers(mockTenantId)).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getTeamMember', () => {
    it('should return a specific team member', async () => {
      databaseService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.getTeamMember(mockTenantId, mockUserId);

      expect(result).toMatchObject({
        id: mockUserId,
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      });
    });

    it('should throw NotFoundException when member not found', async () => {
      databaseService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.getTeamMember(mockTenantId, 'non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateTeamMember', () => {
    const updateRequest: UpdateTeamMemberRequest = {
      firstName: 'Jane',
      lastName: 'Smith',
      role: 'admin',
      permissions: ['team.manage', 'settings.manage'],
    };

    it('should update team member successfully', async () => {
      const updatedUser = { ...mockUser, ...updateRequest };
      databaseService.user.findFirst.mockResolvedValue(mockUser);
      databaseService.user.update.mockResolvedValue(updatedUser);

      const result = await service.updateTeamMember(
        mockTenantId,
        mockUserId,
        updateRequest,
        mockActorId
      );

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.role).toBe('admin');
      expect(eventEmitter.emit).toHaveBeenCalledWith('team.member.updated', 
        expect.objectContaining({
          tenantId: mockTenantId,
          memberId: mockUserId,
          actorId: mockActorId,
        })
      );
    });

    it('should throw NotFoundException when member not found', async () => {
      databaseService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.updateTeamMember(mockTenantId, 'non-existent', updateRequest, mockActorId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should update permissions when provided', async () => {
      databaseService.user.findFirst.mockResolvedValueOnce(mockUser);
      databaseService.user.update.mockResolvedValue(mockUser);
      databaseService.user.findFirst.mockResolvedValueOnce(mockUser);
      databaseService.permission.findMany.mockResolvedValue([
        { id: 'perm-1', name: 'team.manage' },
        { id: 'perm-2', name: 'settings.manage' },
      ]);
      databaseService.userPermission.deleteMany.mockResolvedValue({ count: 2 });
      databaseService.userPermission.createMany.mockResolvedValue({ count: 2 });

      await service.updateTeamMember(
        mockTenantId,
        mockUserId,
        updateRequest,
        mockActorId
      );

      expect(databaseService.userPermission.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(databaseService.userPermission.createMany).toHaveBeenCalled();
    });
  });

  describe('removeTeamMember', () => {
    it('should remove team member successfully', async () => {
      const mockTenant = { id: mockTenantId, ownerId: 'different-user' };
      databaseService.user.findFirst.mockResolvedValue(mockUser);
      databaseService.tenant.findUnique.mockResolvedValue(mockTenant);
      databaseService.user.update.mockResolvedValue({ ...mockUser, status: 'removed' });

      await service.removeTeamMember(mockTenantId, mockUserId, mockActorId);

      expect(databaseService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { status: 'removed' },
      });
      expect(eventEmitter.emit).toHaveBeenCalledWith('team.member.removed', 
        expect.objectContaining({
          tenantId: mockTenantId,
          memberId: mockUserId,
          actorId: mockActorId,
        })
      );
    });

    it('should throw ForbiddenException when trying to remove tenant owner', async () => {
      const mockTenant = { id: mockTenantId, ownerId: mockUserId };
      databaseService.user.findFirst.mockResolvedValue(mockUser);
      databaseService.tenant.findUnique.mockResolvedValue(mockTenant);

      await expect(
        service.removeTeamMember(mockTenantId, mockUserId, mockActorId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException when member not found', async () => {
      databaseService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.removeTeamMember(mockTenantId, 'non-existent', mockActorId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTeamRoles', () => {
    it('should return system roles with member counts', async () => {
      databaseService.user.groupBy.mockResolvedValue([
        { role: 'admin', _count: { role: 2 } },
        { role: 'agent', _count: { role: 5 } },
      ]);

      const result = await service.getTeamRoles(mockTenantId);

      expect(result).toHaveLength(4); // owner, admin, agent, viewer
      expect(result.find(r => r.id === 'admin')?.memberCount).toBe(2);
      expect(result.find(r => r.id === 'agent')?.memberCount).toBe(5);
      expect(result.find(r => r.id === 'owner')?.memberCount).toBe(0);
      expect(result.find(r => r.id === 'viewer')?.memberCount).toBe(0);
    });
  });

  describe('getTeamStats', () => {
    it('should return comprehensive team statistics', async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      
      databaseService.user.count
        .mockResolvedValueOnce(10) // totalMembers
        .mockResolvedValueOnce(8)  // activeMembers
        .mockResolvedValueOnce(2)  // newMembers
        .mockResolvedValueOnce(5); // recentLogins
      
      databaseService.invitation.count
        .mockResolvedValueOnce(3)  // pendingInvitations
        .mockResolvedValueOnce(1); // recentInvitations
      
      databaseService.user.groupBy.mockResolvedValue([
        { role: 'admin', _count: { role: 2 } },
        { role: 'agent', _count: { role: 6 } },
        { role: 'viewer', _count: { role: 2 } },
      ]);
      
      databaseService.userPermission.groupBy.mockResolvedValue([
        { permissionId: 'perm-1', _count: { permissionId: 5 } },
        { permissionId: 'perm-2', _count: { permissionId: 3 } },
      ]);
      
      databaseService.permission.findMany.mockResolvedValue([
        { id: 'perm-1', name: 'tickets.view' },
        { id: 'perm-2', name: 'customers.view' },
      ]);

      const result = await service.getTeamStats(mockTenantId);

      expect(result).toMatchObject({
        totalMembers: 10,
        activeMembers: 8,
        pendingInvitations: 3,
        roleDistribution: expect.arrayContaining([
          { role: 'admin', count: 2 },
          { role: 'agent', count: 6 },
          { role: 'viewer', count: 2 },
        ]),
        recentActivity: {
          newMembers: 2,
          loginActivity: 5,
          invitationsSent: 1,
        },
        permissionUsage: expect.arrayContaining([
          { permission: 'tickets.view', userCount: 5 },
          { permission: 'customers.view', userCount: 3 },
        ]),
      });
    });
  });

  describe('searchTeamMembers', () => {
    it('should search team members by query', async () => {
      databaseService.user.findMany.mockResolvedValue([mockUser]);

      const result = await service.searchTeamMembers(mockTenantId, 'john', {
        role: 'agent',
        limit: 10,
      });

      expect(result).toHaveLength(1);
      expect(databaseService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: mockTenantId,
            role: 'agent',
            OR: expect.arrayContaining([
              { firstName: { contains: 'john', mode: 'insensitive' } },
              { lastName: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
            ]),
          }),
          take: 10,
        })
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true for owner role', async () => {
      const ownerUser = { ...mockUser, role: 'owner' };
      databaseService.user.findUnique.mockResolvedValue(ownerUser);

      const result = await service.hasPermission(mockUserId, 'any.permission');

      expect(result).toBe(true);
    });

    it('should return true when user has specific permission', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission(mockUserId, 'tickets.view');

      expect(result).toBe(true);
    });

    it('should return false when user does not have permission', async () => {
      databaseService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.hasPermission(mockUserId, 'admin.permission');

      expect(result).toBe(false);
    });

    it('should return false when user not found', async () => {
      databaseService.user.findUnique.mockResolvedValue(null);

      const result = await service.hasPermission('non-existent', 'any.permission');

      expect(result).toBe(false);
    });
  });

  describe('updateUserPermissions', () => {
    it('should update user permissions successfully', async () => {
      const permissions = ['team.manage', 'settings.manage'];
      databaseService.permission.findMany.mockResolvedValue([
        { id: 'perm-1', name: 'team.manage' },
        { id: 'perm-2', name: 'settings.manage' },
      ]);
      databaseService.userPermission.deleteMany.mockResolvedValue({ count: 2 });
      databaseService.userPermission.createMany.mockResolvedValue({ count: 2 });

      await service.updateUserPermissions(mockUserId, permissions);

      expect(databaseService.userPermission.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(databaseService.userPermission.createMany).toHaveBeenCalledWith({
        data: [
          { userId: mockUserId, permissionId: 'perm-1' },
          { userId: mockUserId, permissionId: 'perm-2' },
        ],
      });
    });

    it('should handle empty permissions array', async () => {
      databaseService.permission.findMany.mockResolvedValue([]);
      databaseService.userPermission.deleteMany.mockResolvedValue({ count: 0 });

      await service.updateUserPermissions(mockUserId, []);

      expect(databaseService.userPermission.deleteMany).toHaveBeenCalled();
      expect(databaseService.userPermission.createMany).not.toHaveBeenCalled();
    });
  });
});