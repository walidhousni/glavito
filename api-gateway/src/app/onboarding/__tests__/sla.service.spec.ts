/**
 * SLA Service Tests
 * Comprehensive test suite for SLA management functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
    SLAService,
    CreateSLAPolicyRequest,
    UpdateSLAPolicyRequest,
    SLATargets,
    SLACondition
} from '../sla.service';
import { DatabaseService } from '@glavito/shared-database';

describe('SLAService', () => {
    let service: SLAService;
    let databaseService: jest.Mocked<DatabaseService>;
    let eventEmitter: jest.Mocked<EventEmitter2>;

    const mockTenantId = 'tenant-123';
    const mockUserId = 'user-123';
    const mockSLAId = 'sla-123';
    const mockTicketId = 'ticket-123';

    const mockSLATargets: SLATargets = {
        firstResponse: {
            enabled: true,
            time: 2,
            unit: 'hours',
        },
        resolution: {
            enabled: true,
            time: 24,
            unit: 'hours',
        },
    };

    const mockSLAPolicy = {
        id: mockSLAId,
        tenantId: mockTenantId,
        name: 'Standard SLA',
        description: 'Standard SLA policy',
        priority: 'medium',
        isActive: true,
        conditions: [
            {
                field: 'priority',
                operator: 'equals',
                value: 'medium',
            },
        ],
        targets: mockSLATargets,
        businessHours: null,
        holidays: [],
        escalationRules: [],
        notifications: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    const mockTicket = {
        id: mockTicketId,
        tenantId: mockTenantId,
        customerId: 'customer-123',
        assignedAgentId: null,
        channelId: 'channel-123',
        subject: 'Test Ticket',
        description: 'Test ticket description',
        status: 'open',
        priority: 'medium',
        tags: [],
        customFields: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        customer: {
            id: 'customer-123',
            email: 'customer@example.com',
            firstName: 'John',
            lastName: 'Doe',
        },
        channel: {
            id: 'channel-123',
            name: 'Email',
            type: 'email',
        },
    };

    const mockSLAInstance = {
        id: 'sla-instance-123',
        slaId: mockSLAId,
        ticketId: mockTicketId,
        status: 'active',
        firstResponseDue: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
        firstResponseAt: null,
        resolutionDue: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        resolutionAt: null,
        pausedDuration: 0,
        breachCount: 0,
        escalationLevel: 0,
        lastEscalatedAt: null,
        notifications: [],
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
    };

    beforeEach(async () => {
        const mockDatabaseService = {
            sLAPolicy: {
                create: jest.fn(),
                findMany: jest.fn(),
                findFirst: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn(),
            },
            sLAInstance: {
                create: jest.fn(),
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                count: jest.fn(),
            },
            ticket: {
                findUnique: jest.fn(),
            },
        };

        const mockEventEmitter = {
            emit: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SLAService,
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
                    provide: EventEmitter2,
                    useValue: mockEventEmitter,
                },
            ],
        }).compile();

        service = module.get<SLAService>(SLAService);
        databaseService = module.get(DatabaseService);
        eventEmitter = module.get(EventEmitter2);
    });

    describe('createSLAPolicy', () => {
        const createRequest: CreateSLAPolicyRequest = {
            name: 'Standard SLA',
            description: 'Standard SLA policy',
            priority: 'medium',
            conditions: [
                {
                    field: 'priority',
                    operator: 'equals',
                    value: 'medium',
                },
            ],
            targets: mockSLATargets,
        };

        it('should create SLA policy successfully', async () => {
            databaseService.sLAPolicy.create.mockResolvedValue(mockSLAPolicy);

            const result = await service.createSLAPolicy(mockTenantId, createRequest, mockUserId);

            expect(result).toMatchObject({
                id: mockSLAId,
                name: 'Standard SLA',
                priority: 'medium',
                isActive: true,
            });

            expect(databaseService.sLAPolicy.create).toHaveBeenCalledWith({
                data: {
                    tenantId: mockTenantId,
                    name: createRequest.name,
                    description: createRequest.description,
                    priority: createRequest.priority,
                    conditions: createRequest.conditions,
                    targets: createRequest.targets,
                    businessHours: createRequest.businessHours,
                    holidays: createRequest.holidays || [],
                    escalationRules: createRequest.escalationRules || [],
                    notifications: createRequest.notifications || [],
                    metadata: createRequest.metadata || {},
                },
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('sla.policy.created', {
                tenantId: mockTenantId,
                slaId: mockSLAId,
                userId: mockUserId,
                priority: createRequest.priority,
            });
        });

        it('should validate SLA targets', async () => {
            const invalidRequest = {
                ...createRequest,
                targets: {
                    firstResponse: {
                        enabled: false,
                        time: 0,
                        unit: 'hours' as const,
                    },
                    resolution: {
                        enabled: false,
                        time: 0,
                        unit: 'hours' as const,
                    },
                },
            };

            await expect(
                service.createSLAPolicy(mockTenantId, invalidRequest, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });

        it('should validate SLA conditions', async () => {
            const invalidRequest = {
                ...createRequest,
                conditions: [
                    {
                        field: 'priority',
                        operator: 'invalid_operator' as any,
                        value: 'medium',
                    },
                ],
            };

            await expect(
                service.createSLAPolicy(mockTenantId, invalidRequest, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('getSLAPolicies', () => {
        it('should return SLA policies with pagination', async () => {
            const mockPolicies = [mockSLAPolicy];
            databaseService.sLAPolicy.findMany.mockResolvedValue(mockPolicies);
            databaseService.sLAPolicy.count.mockResolvedValue(1);

            const result = await service.getSLAPolicies(mockTenantId, {
                priority: 'medium',
                limit: 10,
                offset: 0,
            });

            expect(result.policies).toHaveLength(1);
            expect(result.totalCount).toBe(1);
            expect(result.policies[0]).toMatchObject({
                id: mockSLAId,
                name: 'Standard SLA',
                priority: 'medium',
            });

            expect(databaseService.sLAPolicy.findMany).toHaveBeenCalledWith({
                where: { tenantId: mockTenantId, priority: 'medium' },
                orderBy: { createdAt: 'desc' },
                take: 10,
                skip: 0,
            });
        });

        it('should filter by active status', async () => {
            databaseService.sLAPolicy.findMany.mockResolvedValue([]);
            databaseService.sLAPolicy.count.mockResolvedValue(0);

            await service.getSLAPolicies(mockTenantId, { isActive: true });

            expect(databaseService.sLAPolicy.findMany).toHaveBeenCalledWith({
                where: { tenantId: mockTenantId, isActive: true },
                orderBy: { createdAt: 'desc' },
                take: 50,
                skip: 0,
            });
        });
    });

    describe('updateSLAPolicy', () => {
        const updateRequest: UpdateSLAPolicyRequest = {
            name: 'Updated SLA',
            priority: 'high',
            isActive: false,
        };

        it('should update SLA policy successfully', async () => {
            const updatedPolicy = { ...mockSLAPolicy, ...updateRequest };
            databaseService.sLAPolicy.findFirst.mockResolvedValue(mockSLAPolicy);
            databaseService.sLAPolicy.update.mockResolvedValue(updatedPolicy);

            const result = await service.updateSLAPolicy(
                mockTenantId,
                mockSLAId,
                updateRequest,
                mockUserId
            );

            expect(result.name).toBe('Updated SLA');
            expect(result.priority).toBe('high');
            expect(result.isActive).toBe(false);

            expect(eventEmitter.emit).toHaveBeenCalledWith('sla.policy.updated', {
                tenantId: mockTenantId,
                slaId: mockSLAId,
                userId: mockUserId,
                changes: updateRequest,
            });
        });

        it('should throw NotFoundException when SLA policy not found', async () => {
            databaseService.sLAPolicy.findFirst.mockResolvedValue(null);

            await expect(
                service.updateSLAPolicy(mockTenantId, 'non-existent', updateRequest, mockUserId)
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteSLAPolicy', () => {
        it('should delete SLA policy successfully', async () => {
            databaseService.sLAPolicy.findFirst.mockResolvedValue(mockSLAPolicy);
            databaseService.sLAInstance.count.mockResolvedValue(0); // No active instances
            databaseService.sLAPolicy.delete.mockResolvedValue(mockSLAPolicy);

            await service.deleteSLAPolicy(mockTenantId, mockSLAId, mockUserId);

            expect(databaseService.sLAPolicy.delete).toHaveBeenCalledWith({
                where: { id: mockSLAId },
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('sla.policy.deleted', {
                tenantId: mockTenantId,
                slaId: mockSLAId,
                userId: mockUserId,
                policyName: mockSLAPolicy.name,
            });
        });

        it('should throw NotFoundException when SLA policy not found', async () => {
            databaseService.sLAPolicy.findFirst.mockResolvedValue(null);

            await expect(
                service.deleteSLAPolicy(mockTenantId, 'non-existent', mockUserId)
            ).rejects.toThrow(NotFoundException);
        });

        it('should throw BadRequestException when policy has active instances', async () => {
            databaseService.sLAPolicy.findFirst.mockResolvedValue(mockSLAPolicy);
            databaseService.sLAInstance.count.mockResolvedValue(5); // Has active instances

            await expect(
                service.deleteSLAPolicy(mockTenantId, mockSLAId, mockUserId)
            ).rejects.toThrow(BadRequestException);
        });
    });

    describe('createSLAInstance', () => {
        it('should create SLA instance for applicable ticket', async () => {
            databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
            databaseService.sLAPolicy.findMany.mockResolvedValue([mockSLAPolicy]);
            databaseService.sLAInstance.create.mockResolvedValue(mockSLAInstance);

            const result = await service.createSLAInstance(mockTicketId);

            expect(result).toMatchObject({
                id: 'sla-instance-123',
                slaId: mockSLAId,
                ticketId: mockTicketId,
                status: 'active',
            });

            expect(databaseService.sLAInstance.create).toHaveBeenCalledWith({
                data: {
                    slaId: mockSLAId,
                    ticketId: mockTicketId,
                    firstResponseDue: expect.any(Date),
                    resolutionDue: expect.any(Date),
                    metadata: {
                        policyName: mockSLAPolicy.name,
                        priority: mockSLAPolicy.priority,
                    },
                },
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('sla.instance.created', {
                tenantId: mockTenantId,
                slaInstanceId: 'sla-instance-123',
                ticketId: mockTicketId,
                slaId: mockSLAId,
            });
        });

        it('should return null when no applicable SLA policy found', async () => {
            const nonMatchingTicket = { ...mockTicket, priority: 'low' };
            databaseService.ticket.findUnique.mockResolvedValue(nonMatchingTicket);
            databaseService.sLAPolicy.findMany.mockResolvedValue([mockSLAPolicy]);

            const result = await service.createSLAInstance(mockTicketId);

            expect(result).toBeNull();
        });

        it('should throw NotFoundException when ticket not found', async () => {
            databaseService.ticket.findUnique.mockResolvedValue(null);

            await expect(
                service.createSLAInstance('non-existent')
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateSLAInstance', () => {
        it('should update SLA instance on first response', async () => {
            const responseTime = new Date();
            const updatedInstance = {
                ...mockSLAInstance,
                firstResponseAt: responseTime,
            };

            databaseService.sLAInstance.findUnique.mockResolvedValue(mockSLAInstance);
            databaseService.sLAInstance.update.mockResolvedValue(updatedInstance);

            await service.updateSLAInstance(mockTicketId, 'first_response', responseTime);

            expect(databaseService.sLAInstance.update).toHaveBeenCalledWith({
                where: { ticketId: mockTicketId },
                data: {
                    firstResponseAt: responseTime,
                },
            });

            expect(eventEmitter.emit).toHaveBeenCalledWith('sla.instance.updated', {
                slaInstanceId: 'sla-instance-123',
                ticketId: mockTicketId,
                event: 'first_response',
                timestamp: responseTime,
            });
        });

        it('should update SLA instance on resolution', async () => {
            const resolutionTime = new Date();
            const updatedInstance = {
                ...mockSLAInstance,
                resolutionAt: resolutionTime,
                status: 'completed',
            };

            databaseService.sLAInstance.findUnique.mockResolvedValue(mockSLAInstance);
            databaseService.sLAInstance.update.mockResolvedValue(updatedInstance);

            await service.updateSLAInstance(mockTicketId, 'resolution', resolutionTime);

            expect(databaseService.sLAInstance.update).toHaveBeenCalledWith({
                where: { ticketId: mockTicketId },
                data: {
                    resolutionAt: resolutionTime,
                    status: 'completed',
                },
            });
        });

        it('should handle SLA breach on first response', async () => {
            const lateResponseTime = new Date(mockSLAInstance.firstResponseDue!.getTime() + 60 * 60 * 1000); // 1 hour late
            const breachedInstance = {
                ...mockSLAInstance,
                firstResponseAt: lateResponseTime,
                breachCount: 1,
            };

            databaseService.sLAInstance.findUnique.mockResolvedValue(mockSLAInstance);
            databaseService.sLAInstance.update.mockResolvedValue(breachedInstance);

            await service.updateSLAInstance(mockTicketId, 'first_response', lateResponseTime);

            expect(databaseService.sLAInstance.update).toHaveBeenCalledWith({
                where: { ticketId: mockTicketId },
                data: {
                    firstResponseAt: lateResponseTime,
                    breachCount: { increment: 1 },
                },
            });
        });

        it('should pause SLA instance', async () => {
            const pauseTime = new Date();
            const pausedInstance = {
                ...mockSLAInstance,
                status: 'paused',
                metadata: {
                    ...mockSLAInstance.metadata,
                    pausedAt: pauseTime,
                },
            };

            databaseService.sLAInstance.findUnique.mockResolvedValue(mockSLAInstance);
            databaseService.sLAInstance.update.mockResolvedValue(pausedInstance);

            await service.updateSLAInstance(mockTicketId, 'pause', pauseTime);

            expect(databaseService.sLAInstance.update).toHaveBeenCalledWith({
                where: { ticketId: mockTicketId },
                data: {
                    status: 'paused',
                    metadata: {
                        ...mockSLAInstance.metadata,
                        pausedAt: pauseTime,
                    },
                },
            });
        });

        it('should resume SLA instance and extend due dates', async () => {
            const pausedInstance = {
                ...mockSLAInstance,
                status: 'paused',
                metadata: {
                    pausedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // Paused 2 hours ago
                },
            };

            const resumeTime = new Date();
            const resumedInstance = {
                ...pausedInstance,
                status: 'active',
                pausedDuration: 120, // 2 hours in minutes
                firstResponseDue: new Date(mockSLAInstance.firstResponseDue!.getTime() + 2 * 60 * 60 * 1000),
                resolutionDue: new Date(mockSLAInstance.resolutionDue!.getTime() + 2 * 60 * 60 * 1000),
            };

            databaseService.sLAInstance.findUnique.mockResolvedValue(pausedInstance);
            databaseService.sLAInstance.update.mockResolvedValue(resumedInstance);

            await service.updateSLAInstance(mockTicketId, 'resume', resumeTime);

            expect(databaseService.sLAInstance.update).toHaveBeenCalledWith({
                where: { ticketId: mockTicketId },
                data: {
                    status: 'active',
                    pausedDuration: { increment: 120 },
                    firstResponseDue: expect.any(Date),
                    resolutionDue: expect.any(Date),
                },
            });
        });

        it('should do nothing when SLA instance not found', async () => {
            databaseService.sLAInstance.findUnique.mockResolvedValue(null);

            await service.updateSLAInstance(mockTicketId, 'first_response');

            expect(databaseService.sLAInstance.update).not.toHaveBeenCalled();
        });
    });

    describe('getSLAInstances', () => {
        it('should return SLA instances with pagination', async () => {
            const mockInstances = [mockSLAInstance];
            const mockInstancesWithRelations = [
                {
                    ...mockSLAInstance,
                    slaPolicy: {
                        name: 'Standard SLA',
                        priority: 'medium',
                    },
                    ticket: {
                        subject: 'Test Ticket',
                        status: 'open',
                        priority: 'medium',
                    },
                },
            ];

            databaseService.sLAInstance.findMany.mockResolvedValue(mockInstancesWithRelations);
            databaseService.sLAInstance.count.mockResolvedValue(1);

            const result = await service.getSLAInstances(mockTenantId, {
                status: 'active',
                limit: 10,
                offset: 0,
            });

            expect(result.instances).toHaveLength(1);
            expect(result.totalCount).toBe(1);
            expect(result.instances[0]).toMatchObject({
                id: 'sla-instance-123',
                status: 'active',
            });

            expect(databaseService.sLAInstance.findMany).toHaveBeenCalledWith({
                where: {
                    slaPolicy: { tenantId: mockTenantId },
                    status: 'active',
                },
                include: {
                    slaPolicy: {
                        select: {
                            name: true,
                            priority: true,
                        },
                    },
                    ticket: {
                        select: {
                            subject: true,
                            status: true,
                            priority: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
                take: 10,
                skip: 0,
            });
        });
    });

    describe('getSLAMetrics', () => {
        it('should return comprehensive SLA metrics', async () => {
            const mockCompletedInstances = [
                {
                    firstResponseDue: new Date(Date.now() - 2 * 60 * 60 * 1000),
                    firstResponseAt: new Date(Date.now() - 1.5 * 60 * 60 * 1000), // 30 minutes early
                    resolutionDue: new Date(Date.now() - 1 * 60 * 60 * 1000),
                    resolutionAt: new Date(Date.now() - 0.5 * 60 * 60 * 1000), // 30 minutes early
                    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
                },
            ];

            databaseService.sLAInstance.count
                .mockResolvedValueOnce(10) // totalSLAs
                .mockResolvedValueOnce(3)  // activeSLAs
                .mockResolvedValueOnce(2); // breachedSLAs

            databaseService.sLAInstance.findMany.mockResolvedValue(mockCompletedInstances);

            const result = await service.getSLAMetrics(mockTenantId);

            expect(result).toMatchObject({
                totalSLAs: 10,
                activeSLAs: 3,
                breachedSLAs: 2,
                averageFirstResponseTime: expect.any(Number),
                averageResolutionTime: expect.any(Number),
                firstResponseCompliance: expect.any(Number),
                resolutionCompliance: expect.any(Number),
                breachTrends: expect.any(Array),
            });

            expect(result.firstResponseCompliance).toBe(100); // Met SLA
            expect(result.resolutionCompliance).toBe(100); // Met SLA
        });

        it('should handle zero completed instances', async () => {
            databaseService.sLAInstance.count.mockResolvedValue(0);
            databaseService.sLAInstance.findMany.mockResolvedValue([]);

            const result = await service.getSLAMetrics(mockTenantId);

            expect(result.averageFirstResponseTime).toBe(0);
            expect(result.averageResolutionTime).toBe(0);
            expect(result.firstResponseCompliance).toBe(0);
            expect(result.resolutionCompliance).toBe(0);
        });
    });

    describe('condition evaluation', () => {
        it('should evaluate equals condition correctly', async () => {
            const conditions: SLACondition[] = [
                {
                    field: 'priority',
                    operator: 'equals',
                    value: 'medium',
                },
            ];

            const policy = { ...mockSLAPolicy, conditions };
            databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
            databaseService.sLAPolicy.findMany.mockResolvedValue([policy]);
            databaseService.sLAInstance.create.mockResolvedValue(mockSLAInstance);

            const result = await service.createSLAInstance(mockTicketId);

            expect(result).not.toBeNull();
            expect(databaseService.sLAInstance.create).toHaveBeenCalled();
        });

        it('should evaluate not_equals condition correctly', async () => {
            const conditions: SLACondition[] = [
                {
                    field: 'priority',
                    operator: 'not_equals',
                    value: 'low',
                },
            ];

            const policy = { ...mockSLAPolicy, conditions };
            databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
            databaseService.sLAPolicy.findMany.mockResolvedValue([policy]);
            databaseService.sLAInstance.create.mockResolvedValue(mockSLAInstance);

            const result = await service.createSLAInstance(mockTicketId);

            expect(result).not.toBeNull();
            expect(databaseService.sLAInstance.create).toHaveBeenCalled();
        });

        it('should evaluate contains condition correctly', async () => {
            const ticketWithDescription = {
                ...mockTicket,
                description: 'This is an urgent ticket that needs immediate attention',
            };

            const conditions: SLACondition[] = [
                {
                    field: 'description',
                    operator: 'contains',
                    value: 'urgent',
                },
            ];

            const policy = { ...mockSLAPolicy, conditions };
            databaseService.ticket.findUnique.mockResolvedValue(ticketWithDescription);
            databaseService.sLAPolicy.findMany.mockResolvedValue([policy]);
            databaseService.sLAInstance.create.mockResolvedValue(mockSLAInstance);

            const result = await service.createSLAInstance(mockTicketId);

            expect(result).not.toBeNull();
            expect(databaseService.sLAInstance.create).toHaveBeenCalled();
        });

        it('should evaluate in condition correctly', async () => {
            const conditions: SLACondition[] = [
                {
                    field: 'priority',
                    operator: 'in',
                    value: ['medium', 'high'],
                },
            ];

            const policy = { ...mockSLAPolicy, conditions };
            databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
            databaseService.sLAPolicy.findMany.mockResolvedValue([policy]);
            databaseService.sLAInstance.create.mockResolvedValue(mockSLAInstance);

            const result = await service.createSLAInstance(mockTicketId);

            expect(result).not.toBeNull();
            expect(databaseService.sLAInstance.create).toHaveBeenCalled();
        });

        it('should not match when conditions fail', async () => {
            const conditions: SLACondition[] = [
                {
                    field: 'priority',
                    operator: 'equals',
                    value: 'critical', // Ticket has 'medium' priority
                },
            ];

            const policy = { ...mockSLAPolicy, conditions };
            databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
            databaseService.sLAPolicy.findMany.mockResolvedValue([policy]);

            const result = await service.createSLAInstance(mockTicketId);

            expect(result).toBeNull();
            expect(databaseService.sLAInstance.create).not.toHaveBeenCalled();
        });
    });
});