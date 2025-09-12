/**
 * Workflow Service Tests
 * Comprehensive test suite for workflow management functionality
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { 
  WorkflowService, 
  CreateWorkflowRuleRequest, 
  UpdateWorkflowRuleRequest,
  CreateRoutingRuleRequest,
  CreateEscalationPathRequest,
  WorkflowCondition,
  WorkflowAction
} from '../workflow.service';
import { DatabaseService } from '@glavito/shared-database';

describe('WorkflowService', () => {
  let service: WorkflowService;
  let databaseService: jest.Mocked<DatabaseService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockWorkflowId = 'workflow-123';
  const mockTicketId = 'ticket-123';

  const mockWorkflowRule = {
    id: mockWorkflowId,
    tenantId: mockTenantId,
    name: 'Test Workflow',
    description: 'Test workflow description',
    type: 'routing',
    priority: 1,
    isActive: true,
    conditions: [
      {
        field: 'priority',
        operator: 'equals',
        value: 'high',
      },
    ],
    actions: [
      {
        type: 'assign_to_user',
        parameters: { userId: 'agent-123' },
      },
    ],
    triggers: [
      {
        event: 'ticket_created',
      },
    ],
    schedule: null,
    metadata: {},
    executionCount: 0,
    lastExecuted: null,
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
    priority: 'high',
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
    assignedAgent: null,
  };

  beforeEach(async () => {
    const mockDatabaseService = {
      workflowRule: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
      workflowExecution: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      routingRule: {
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      escalationPath: {
        create: jest.fn(),
        findMany: jest.fn(),
        updateMany: jest.fn(),
        count: jest.fn(),
      },
      ticket: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      teamMember: {
        findFirst: jest.fn(),
      },
    };

    const mockEventEmitter = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowService,
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

    service = module.get<WorkflowService>(WorkflowService);
    databaseService = module.get(DatabaseService);
    eventEmitter = module.get(EventEmitter2);
  });

  describe('createWorkflowRule', () => {
    const createRequest: CreateWorkflowRuleRequest = {
      name: 'Test Workflow',
      description: 'Test workflow description',
      type: 'routing',
      priority: 1,
      conditions: [
        {
          field: 'priority',
          operator: 'equals',
          value: 'high',
        },
      ],
      actions: [
        {
          type: 'assign_to_user',
          parameters: { userId: 'agent-123' },
        },
      ],
      triggers: [
        {
          event: 'ticket_created',
        },
      ],
    };

    it('should create workflow rule successfully', async () => {
      databaseService.workflowRule.create.mockResolvedValue(mockWorkflowRule);

      const result = await service.createWorkflowRule(mockTenantId, createRequest, mockUserId);

      expect(result).toMatchObject({
        id: mockWorkflowId,
        name: 'Test Workflow',
        type: 'routing',
        priority: 1,
        isActive: true,
      });

      expect(databaseService.workflowRule.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          name: createRequest.name,
          description: createRequest.description,
          type: createRequest.type,
          priority: createRequest.priority || 0,
          conditions: createRequest.conditions,
          actions: createRequest.actions,
          triggers: createRequest.triggers,
          schedule: createRequest.schedule,
          metadata: createRequest.metadata || {},
        },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('workflow.rule.created', {
        tenantId: mockTenantId,
        workflowId: mockWorkflowId,
        userId: mockUserId,
        type: createRequest.type,
      });
    });

    it('should validate workflow conditions', async () => {
      const invalidRequest = {
        ...createRequest,
        conditions: [
          {
            field: 'priority',
            operator: 'invalid_operator' as any,
            value: 'high',
          },
        ],
      };

      await expect(
        service.createWorkflowRule(mockTenantId, invalidRequest, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate workflow actions', async () => {
      const invalidRequest = {
        ...createRequest,
        actions: [
          {
            type: 'invalid_action' as any,
            parameters: {},
          },
        ],
      };

      await expect(
        service.createWorkflowRule(mockTenantId, invalidRequest, mockUserId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getWorkflowRules', () => {
    it('should return workflow rules with pagination', async () => {
      const mockRules = [mockWorkflowRule];
      databaseService.workflowRule.findMany.mockResolvedValue(mockRules);
      databaseService.workflowRule.count.mockResolvedValue(1);

      const result = await service.getWorkflowRules(mockTenantId, {
        type: 'routing',
        limit: 10,
        offset: 0,
      });

      expect(result.rules).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(result.rules[0]).toMatchObject({
        id: mockWorkflowId,
        name: 'Test Workflow',
        type: 'routing',
      });

      expect(databaseService.workflowRule.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, type: 'routing' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 10,
        skip: 0,
      });
    });

    it('should filter by active status', async () => {
      databaseService.workflowRule.findMany.mockResolvedValue([]);
      databaseService.workflowRule.count.mockResolvedValue(0);

      await service.getWorkflowRules(mockTenantId, { isActive: true });

      expect(databaseService.workflowRule.findMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isActive: true },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: 50,
        skip: 0,
      });
    });
  });

  describe('updateWorkflowRule', () => {
    const updateRequest: UpdateWorkflowRuleRequest = {
      name: 'Updated Workflow',
      priority: 2,
      isActive: false,
    };

    it('should update workflow rule successfully', async () => {
      const updatedRule = { ...mockWorkflowRule, ...updateRequest };
      databaseService.workflowRule.findFirst.mockResolvedValue(mockWorkflowRule);
      databaseService.workflowRule.update.mockResolvedValue(updatedRule);

      const result = await service.updateWorkflowRule(
        mockTenantId,
        mockWorkflowId,
        updateRequest,
        mockUserId
      );

      expect(result.name).toBe('Updated Workflow');
      expect(result.priority).toBe(2);
      expect(result.isActive).toBe(false);

      expect(eventEmitter.emit).toHaveBeenCalledWith('workflow.rule.updated', {
        tenantId: mockTenantId,
        workflowId: mockWorkflowId,
        userId: mockUserId,
        changes: updateRequest,
      });
    });

    it('should throw NotFoundException when workflow rule not found', async () => {
      databaseService.workflowRule.findFirst.mockResolvedValue(null);

      await expect(
        service.updateWorkflowRule(mockTenantId, 'non-existent', updateRequest, mockUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteWorkflowRule', () => {
    it('should delete workflow rule successfully', async () => {
      databaseService.workflowRule.findFirst.mockResolvedValue(mockWorkflowRule);
      databaseService.workflowRule.delete.mockResolvedValue(mockWorkflowRule);

      await service.deleteWorkflowRule(mockTenantId, mockWorkflowId, mockUserId);

      expect(databaseService.workflowRule.delete).toHaveBeenCalledWith({
        where: { id: mockWorkflowId },
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('workflow.rule.deleted', {
        tenantId: mockTenantId,
        workflowId: mockWorkflowId,
        userId: mockUserId,
        ruleName: mockWorkflowRule.name,
      });
    });

    it('should throw NotFoundException when workflow rule not found', async () => {
      databaseService.workflowRule.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteWorkflowRule(mockTenantId, 'non-existent', mockUserId)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('executeWorkflowForTicket', () => {
    it('should execute applicable workflows for ticket', async () => {
      const mockExecution = {
        id: 'execution-123',
        workflowId: mockWorkflowId,
        ticketId: mockTicketId,
        triggeredBy: mockUserId,
        status: 'completed',
        input: { ticket: mockTicket, context: {} },
        output: { results: [] },
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1000,
        metadata: {},
      };

      databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
      databaseService.workflowRule.findMany.mockResolvedValue([mockWorkflowRule]);
      databaseService.workflowExecution.create.mockResolvedValue(mockExecution);
      databaseService.workflowExecution.update.mockResolvedValue(mockExecution);
      databaseService.workflowRule.update.mockResolvedValue(mockWorkflowRule);

      const result = await service.executeWorkflowForTicket(
        mockTicketId,
        'ticket_created',
        mockUserId
      );

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'execution-123',
        status: 'completed',
      });

      expect(databaseService.workflowExecution.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException when ticket not found', async () => {
      databaseService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.executeWorkflowForTicket('non-existent', 'ticket_created', mockUserId)
      ).rejects.toThrow(NotFoundException);
    });

    it('should skip workflows that do not match conditions', async () => {
      const nonMatchingWorkflow = {
        ...mockWorkflowRule,
        conditions: [
          {
            field: 'priority',
            operator: 'equals',
            value: 'low', // Ticket has 'high' priority
          },
        ],
      };

      databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
      databaseService.workflowRule.findMany.mockResolvedValue([nonMatchingWorkflow]);

      const result = await service.executeWorkflowForTicket(
        mockTicketId,
        'ticket_created',
        mockUserId
      );

      expect(result).toHaveLength(0);
    });
  });

  describe('createRoutingRule', () => {
    const createRequest: CreateRoutingRuleRequest = {
      name: 'High Priority Routing',
      description: 'Route high priority tickets to senior agents',
      priority: 1,
      conditions: [
        {
          field: 'priority',
          operator: 'equals',
          value: 'high',
        },
      ],
      actions: [
        {
          type: 'assign_to_team',
          parameters: { teamId: 'senior-team' },
        },
      ],
    };

    it('should create routing rule successfully', async () => {
      const mockRoutingRule = {
        id: 'routing-123',
        tenantId: mockTenantId,
        ...createRequest,
        isActive: true,
        matchCount: 0,
        lastMatched: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseService.routingRule.create.mockResolvedValue(mockRoutingRule);

      const result = await service.createRoutingRule(mockTenantId, createRequest, mockUserId);

      expect(result).toMatchObject({
        id: 'routing-123',
        name: 'High Priority Routing',
        priority: 1,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('routing.rule.created', {
        tenantId: mockTenantId,
        ruleId: 'routing-123',
        userId: mockUserId,
      });
    });
  });

  describe('createEscalationPath', () => {
    const createRequest: CreateEscalationPathRequest = {
      name: 'Standard Escalation',
      description: 'Standard escalation path for unresolved tickets',
      steps: [
        {
          level: 1,
          delay: 60, // 1 hour
          assignTo: {
            type: 'team',
            id: 'senior-team',
          },
          notifications: [
            {
              type: 'email',
              recipients: ['manager@example.com'],
            },
          ],
        },
      ],
      conditions: [
        {
          field: 'priority',
          operator: 'in',
          value: ['high', 'critical'],
        },
      ],
    };

    it('should create escalation path successfully', async () => {
      const mockEscalationPath = {
        id: 'escalation-123',
        tenantId: mockTenantId,
        ...createRequest,
        isActive: true,
        isDefault: false,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseService.escalationPath.create.mockResolvedValue(mockEscalationPath);

      const result = await service.createEscalationPath(mockTenantId, createRequest, mockUserId);

      expect(result).toMatchObject({
        id: 'escalation-123',
        name: 'Standard Escalation',
        steps: createRequest.steps,
      });

      expect(eventEmitter.emit).toHaveBeenCalledWith('escalation.path.created', {
        tenantId: mockTenantId,
        pathId: 'escalation-123',
        userId: mockUserId,
      });
    });

    it('should unset other default escalation paths when creating default', async () => {
      const defaultRequest = { ...createRequest, isDefault: true };
      const mockEscalationPath = {
        id: 'escalation-123',
        tenantId: mockTenantId,
        ...defaultRequest,
        isActive: true,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      databaseService.escalationPath.updateMany.mockResolvedValue({ count: 1 });
      databaseService.escalationPath.create.mockResolvedValue(mockEscalationPath);

      await service.createEscalationPath(mockTenantId, defaultRequest, mockUserId);

      expect(databaseService.escalationPath.updateMany).toHaveBeenCalledWith({
        where: { tenantId: mockTenantId, isDefault: true },
        data: { isDefault: false },
      });
    });
  });

  describe('processTicketRouting', () => {
    it('should process ticket routing successfully', async () => {
      const mockRoutingRule = {
        id: 'routing-123',
        tenantId: mockTenantId,
        name: 'High Priority Routing',
        priority: 1,
        conditions: [
          {
            field: 'priority',
            operator: 'equals',
            value: 'high',
          },
        ],
        actions: [
          {
            type: 'assign_to_user',
            parameters: { userId: 'agent-123' },
          },
        ],
        isActive: true,
        matchCount: 0,
        lastMatched: null,
      };

      databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
      databaseService.routingRule.findMany.mockResolvedValue([mockRoutingRule]);
      databaseService.ticket.update.mockResolvedValue({ ...mockTicket, assignedAgentId: 'agent-123' });
      databaseService.routingRule.update.mockResolvedValue({
        ...mockRoutingRule,
        matchCount: 1,
        lastMatched: new Date(),
      });

      await service.processTicketRouting(mockTicketId);

      expect(databaseService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicketId },
        data: { assignedAgentId: 'agent-123' },
      });

      expect(databaseService.routingRule.update).toHaveBeenCalledWith({
        where: { id: 'routing-123' },
        data: {
          matchCount: { increment: 1 },
          lastMatched: expect.any(Date),
        },
      });
    });

    it('should throw NotFoundException when ticket not found', async () => {
      databaseService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.processTicketRouting('non-existent')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('condition evaluation', () => {
    it('should evaluate equals condition correctly', async () => {
      const conditions: WorkflowCondition[] = [
        {
          field: 'priority',
          operator: 'equals',
          value: 'high',
        },
      ];

      databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
      databaseService.workflowRule.findMany.mockResolvedValue([
        { ...mockWorkflowRule, conditions },
      ]);

      const mockExecution = {
        id: 'execution-123',
        workflowId: mockWorkflowId,
        ticketId: mockTicketId,
        triggeredBy: mockUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1000,
      };

      databaseService.workflowExecution.create.mockResolvedValue(mockExecution);
      databaseService.workflowExecution.update.mockResolvedValue(mockExecution);
      databaseService.workflowRule.update.mockResolvedValue(mockWorkflowRule);

      const result = await service.executeWorkflowForTicket(
        mockTicketId,
        'ticket_created',
        mockUserId
      );

      expect(result).toHaveLength(1);
    });

    it('should evaluate contains condition correctly', async () => {
      const ticketWithDescription = {
        ...mockTicket,
        description: 'This is an urgent ticket that needs immediate attention',
      };

      const conditions: WorkflowCondition[] = [
        {
          field: 'description',
          operator: 'contains',
          value: 'urgent',
        },
      ];

      databaseService.ticket.findUnique.mockResolvedValue(ticketWithDescription);
      databaseService.workflowRule.findMany.mockResolvedValue([
        { ...mockWorkflowRule, conditions },
      ]);

      const mockExecution = {
        id: 'execution-123',
        workflowId: mockWorkflowId,
        ticketId: mockTicketId,
        triggeredBy: mockUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1000,
      };

      databaseService.workflowExecution.create.mockResolvedValue(mockExecution);
      databaseService.workflowExecution.update.mockResolvedValue(mockExecution);
      databaseService.workflowRule.update.mockResolvedValue(mockWorkflowRule);

      const result = await service.executeWorkflowForTicket(
        mockTicketId,
        'ticket_created',
        mockUserId
      );

      expect(result).toHaveLength(1);
    });

    it('should evaluate in condition correctly', async () => {
      const conditions: WorkflowCondition[] = [
        {
          field: 'priority',
          operator: 'in',
          value: ['high', 'critical'],
        },
      ];

      databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
      databaseService.workflowRule.findMany.mockResolvedValue([
        { ...mockWorkflowRule, conditions },
      ]);

      const mockExecution = {
        id: 'execution-123',
        workflowId: mockWorkflowId,
        ticketId: mockTicketId,
        triggeredBy: mockUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1000,
      };

      databaseService.workflowExecution.create.mockResolvedValue(mockExecution);
      databaseService.workflowExecution.update.mockResolvedValue(mockExecution);
      databaseService.workflowRule.update.mockResolvedValue(mockWorkflowRule);

      const result = await service.executeWorkflowForTicket(
        mockTicketId,
        'ticket_created',
        mockUserId
      );

      expect(result).toHaveLength(1);
    });
  });

  describe('workflow actions', () => {
    it('should execute assign_to_user action', async () => {
      const actions: WorkflowAction[] = [
        {
          type: 'assign_to_user',
          parameters: { userId: 'agent-123' },
        },
      ];

      databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
      databaseService.workflowRule.findMany.mockResolvedValue([
        { ...mockWorkflowRule, actions },
      ]);
      databaseService.ticket.update.mockResolvedValue({
        ...mockTicket,
        assignedAgentId: 'agent-123',
      });

      const mockExecution = {
        id: 'execution-123',
        workflowId: mockWorkflowId,
        ticketId: mockTicketId,
        triggeredBy: mockUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1000,
      };

      databaseService.workflowExecution.create.mockResolvedValue(mockExecution);
      databaseService.workflowExecution.update.mockResolvedValue(mockExecution);
      databaseService.workflowRule.update.mockResolvedValue(mockWorkflowRule);

      await service.executeWorkflowForTicket(mockTicketId, 'ticket_created', mockUserId);

      expect(databaseService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicketId },
        data: { assignedAgentId: 'agent-123' },
      });
    });

    it('should execute set_priority action', async () => {
      const actions: WorkflowAction[] = [
        {
          type: 'set_priority',
          parameters: { priority: 'critical' },
        },
      ];

      databaseService.ticket.findUnique.mockResolvedValue(mockTicket);
      databaseService.workflowRule.findMany.mockResolvedValue([
        { ...mockWorkflowRule, actions },
      ]);
      databaseService.ticket.update.mockResolvedValue({
        ...mockTicket,
        priority: 'critical',
      });

      const mockExecution = {
        id: 'execution-123',
        workflowId: mockWorkflowId,
        ticketId: mockTicketId,
        triggeredBy: mockUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1000,
      };

      databaseService.workflowExecution.create.mockResolvedValue(mockExecution);
      databaseService.workflowExecution.update.mockResolvedValue(mockExecution);
      databaseService.workflowRule.update.mockResolvedValue(mockWorkflowRule);

      await service.executeWorkflowForTicket(mockTicketId, 'ticket_created', mockUserId);

      expect(databaseService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicketId },
        data: { priority: 'critical' },
      });
    });

    it('should execute add_tag action', async () => {
      const actions: WorkflowAction[] = [
        {
          type: 'add_tag',
          parameters: { tag: 'urgent' },
        },
      ];

      databaseService.ticket.findUnique
        .mockResolvedValueOnce(mockTicket) // First call for workflow execution
        .mockResolvedValueOnce(mockTicket); // Second call for add_tag action

      databaseService.workflowRule.findMany.mockResolvedValue([
        { ...mockWorkflowRule, actions },
      ]);

      databaseService.ticket.update.mockResolvedValue({
        ...mockTicket,
        tags: ['urgent'],
      });

      const mockExecution = {
        id: 'execution-123',
        workflowId: mockWorkflowId,
        ticketId: mockTicketId,
        triggeredBy: mockUserId,
        status: 'completed',
        startedAt: new Date(),
        completedAt: new Date(),
        duration: 1000,
      };

      databaseService.workflowExecution.create.mockResolvedValue(mockExecution);
      databaseService.workflowExecution.update.mockResolvedValue(mockExecution);
      databaseService.workflowRule.update.mockResolvedValue(mockWorkflowRule);

      await service.executeWorkflowForTicket(mockTicketId, 'ticket_created', mockUserId);

      expect(databaseService.ticket.update).toHaveBeenCalledWith({
        where: { id: mockTicketId },
        data: { tags: ['urgent'] },
      });
    });
  });
});