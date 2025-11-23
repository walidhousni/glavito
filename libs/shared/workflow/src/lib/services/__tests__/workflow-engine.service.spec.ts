import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineService } from '../workflow-engine.service';
import { PrismaService } from '@glavito/shared-database';
import { EventPublisherService } from '@glavito/shared-kafka';
import { WorkflowExecutionService } from '../workflow-execution.service';
import { N8NSyncService } from '../n8n-sync.service';
import { ExecutionStatus, TriggerType, ActionType } from '../../interfaces/workflow.interface';

describe('WorkflowEngineService', () => {
  let service: WorkflowEngineService;
  let prismaService: jest.Mocked<PrismaService>;
  let eventPublisher: jest.Mocked<EventPublisherService>;
  let executionService: jest.Mocked<WorkflowExecutionService>;
  let n8nSyncService: jest.Mocked<N8NSyncService>;

  const mockWorkflowRule = {
    id: 'workflow-1',
    tenantId: 'tenant-1',
    name: 'Test Workflow',
    description: 'Test workflow description',
    type: 'automation',
    priority: 1,
    isActive: true,
    conditions: [],
    actions: [],
    triggers: [],
    schedule: null,
    metadata: { createdBy: 'system', version: '1.0' },
    executionCount: 0,
    lastExecuted: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockExecution = {
    id: 'execution-1',
    workflowId: 'workflow-1',
    triggeredBy: 'user-1',
    status: ExecutionStatus.PENDING,
    input: { test: 'data' },
    output: null,
    errorMessage: null,
    startedAt: new Date(),
    completedAt: null,
    duration: null,
    metadata: { triggerType: 'manual' },
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(async () => {
    const mockPrismaService = {
      workflowRule: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn()
      },
      workflowExecution: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        aggregate: jest.fn()
      },
      auditLog: {
        create: jest.fn()
      }
    };

    const mockEventPublisher = {
      publishWorkflowEvent: jest.fn()
    };

    const mockExecutionService = {
      executeWorkflow: jest.fn()
    };

    const mockN8NSyncService = {
      syncWorkflowToN8N: jest.fn(),
      syncWorkflowStatus: jest.fn(),
      deleteN8NWorkflow: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkflowEngineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        },
        {
          provide: EventPublisherService,
          useValue: mockEventPublisher
        },
        {
          provide: WorkflowExecutionService,
          useValue: mockExecutionService
        },
        {
          provide: N8NSyncService,
          useValue: mockN8NSyncService
        }
      ]
    }).compile();

    service = module.get<WorkflowEngineService>(WorkflowEngineService);
    prismaService = module.get(PrismaService);
    eventPublisher = module.get(EventPublisherService);
    executionService = module.get(WorkflowExecutionService);
    n8nSyncService = module.get(N8NSyncService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createWorkflowRule', () => {
    it('should create a workflow rule successfully', async () => {
      const createRequest = {
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        description: 'Test workflow description',
        type: 'automation' as const,
        priority: 1,
        isActive: true,
        conditions: [],
        actions: [],
        triggers: [],
        metadata: {}
      };

      prismaService.workflowRule.create.mockResolvedValue(mockWorkflowRule as any);
      eventPublisher.publishWorkflowEvent.mockResolvedValue(undefined);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      const result = await service.createWorkflowRule(createRequest);

      expect(prismaService.workflowRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Test Workflow',
          description: 'Test workflow description',
          type: 'automation',
          priority: 1,
          isActive: true,
          conditions: [],
          actions: [],
          triggers: [],
          executionCount: 0
        })
      });

      expect(eventPublisher.publishWorkflowEvent).toHaveBeenCalledWith({
        eventType: 'workflow.created',
        tenantId: 'tenant-1',
        timestamp: expect.any(String),
        data: expect.objectContaining({
          workflowId: 'workflow-1',
          name: 'Test Workflow',
          type: 'automation',
          isActive: true
        })
      });

      expect(result).toEqual(expect.objectContaining({
        id: 'workflow-1',
        name: 'Test Workflow',
        type: 'automation'
      }));
    });

    it('should sync to N8N when workflow has nodes', async () => {
      const createRequest = {
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        description: 'Test workflow description',
        type: 'automation' as const,
        metadata: {
          nodes: [{ id: 'node-1', type: 'start' }]
        }
      };

      const workflowWithNodes = {
        ...mockWorkflowRule,
        metadata: { nodes: [{ id: 'node-1', type: 'start' }] }
      };

      prismaService.workflowRule.create.mockResolvedValue(workflowWithNodes as any);
      n8nSyncService.syncWorkflowToN8N.mockResolvedValue('n8n-workflow-id');
      eventPublisher.publishWorkflowEvent.mockResolvedValue(undefined);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      await service.createWorkflowRule(createRequest);

      expect(n8nSyncService.syncWorkflowToN8N).toHaveBeenCalledWith('workflow-1');
    });

    it('should throw error for duplicate workflow name', async () => {
      const createRequest = {
        tenantId: 'tenant-1',
        name: 'Existing Workflow',
        description: 'Test workflow description',
        type: 'automation' as const
      };

      prismaService.workflowRule.findFirst.mockResolvedValue(mockWorkflowRule as any);

      await expect(service.createWorkflowRule(createRequest)).rejects.toThrow(
        "Workflow rule with name 'Existing Workflow' already exists"
      );
    });
  });

  describe('getWorkflowRule', () => {
    it('should return workflow rule by ID', async () => {
      prismaService.workflowRule.findFirst.mockResolvedValue({
        ...mockWorkflowRule,
        executions: []
      } as any);

      const result = await service.getWorkflowRule('workflow-1', 'tenant-1');

      expect(prismaService.workflowRule.findFirst).toHaveBeenCalledWith({
        where: { id: 'workflow-1', tenantId: 'tenant-1' },
        include: {
          executions: {
            take: 10,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      expect(result).toEqual(expect.objectContaining({
        id: 'workflow-1',
        name: 'Test Workflow'
      }));
    });

    it('should return null for non-existent workflow', async () => {
      prismaService.workflowRule.findFirst.mockResolvedValue(null);

      const result = await service.getWorkflowRule('non-existent', 'tenant-1');

      expect(result).toBeNull();
    });
  });

  describe('listWorkflowRules', () => {
    it('should return paginated list of workflow rules', async () => {
      const mockWorkflows = [mockWorkflowRule];
      
      prismaService.workflowRule.findMany.mockResolvedValue(mockWorkflows as any);
      prismaService.workflowRule.count.mockResolvedValue(1);

      const result = await service.listWorkflowRules(
        { tenantId: 'tenant-1', type: 'automation' },
        1,
        20
      );

      expect(prismaService.workflowRule.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', type: 'automation' },
        skip: 0,
        take: 20,
        orderBy: [
          { priority: 'desc' },
          { createdAt: 'desc' }
        ],
        include: {
          executions: {
            take: 5,
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      expect(result).toEqual({
        data: expect.arrayContaining([
          expect.objectContaining({ id: 'workflow-1' })
        ]),
        total: 1,
        page: 1,
        limit: 20
      });
    });
  });

  describe('updateWorkflowRule', () => {
    it('should update workflow rule successfully', async () => {
      const updateRequest = {
        name: 'Updated Workflow',
        description: 'Updated description',
        isActive: false
      };

      prismaService.workflowRule.findFirst.mockResolvedValue({
        ...mockWorkflowRule,
        executions: []
      } as any);

      const updatedWorkflow = {
        ...mockWorkflowRule,
        ...updateRequest
      };

      prismaService.workflowRule.update.mockResolvedValue(updatedWorkflow as any);
      eventPublisher.publishWorkflowEvent.mockResolvedValue(undefined);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      const result = await service.updateWorkflowRule('workflow-1', updateRequest, 'tenant-1');

      expect(prismaService.workflowRule.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: expect.objectContaining({
          name: 'Updated Workflow',
          description: 'Updated description',
          isActive: false
        })
      });

      expect(result).toEqual(expect.objectContaining({
        name: 'Updated Workflow',
        description: 'Updated description',
        isActive: false
      }));
    });

    it('should sync workflow status when isActive changes', async () => {
      const updateRequest = { isActive: false };

      prismaService.workflowRule.findFirst.mockResolvedValue({
        ...mockWorkflowRule,
        executions: []
      } as any);

      prismaService.workflowRule.update.mockResolvedValue({
        ...mockWorkflowRule,
        isActive: false
      } as any);

      n8nSyncService.syncWorkflowStatus.mockResolvedValue(undefined);
      eventPublisher.publishWorkflowEvent.mockResolvedValue(undefined);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      await service.updateWorkflowRule('workflow-1', updateRequest, 'tenant-1');

      expect(n8nSyncService.syncWorkflowStatus).toHaveBeenCalledWith('workflow-1', false);
    });
  });

  describe('deleteWorkflowRule', () => {
    it('should delete workflow rule successfully', async () => {
      prismaService.workflowRule.findFirst.mockResolvedValue({
        ...mockWorkflowRule,
        executions: []
      } as any);

      prismaService.workflowRule.delete.mockResolvedValue(mockWorkflowRule as any);
      n8nSyncService.deleteN8NWorkflow.mockResolvedValue(undefined);
      eventPublisher.publishWorkflowEvent.mockResolvedValue(undefined);
      prismaService.auditLog.create.mockResolvedValue({} as any);

      await service.deleteWorkflowRule('workflow-1', 'tenant-1');

      expect(n8nSyncService.deleteN8NWorkflow).toHaveBeenCalledWith('workflow-1');
      expect(prismaService.workflowRule.delete).toHaveBeenCalledWith({
        where: { id: 'workflow-1' }
      });

      expect(eventPublisher.publishWorkflowEvent).toHaveBeenCalledWith({
        eventType: 'workflow.deleted',
        tenantId: 'tenant-1',
        timestamp: expect.any(String),
        data: expect.objectContaining({
          workflowId: 'workflow-1',
          name: 'Test Workflow'
        })
      });
    });
  });

  describe('executeWorkflowRule', () => {
    it('should execute workflow rule successfully', async () => {
      const input = {
        data: { test: 'input' },
        context: { tenantId: 'tenant-1' }
      };

      prismaService.workflowRule.findFirst.mockResolvedValue({
        ...mockWorkflowRule,
        executions: []
      } as any);

      prismaService.workflowExecution.create.mockResolvedValue(mockExecution as any);
      prismaService.workflowRule.update.mockResolvedValue(mockWorkflowRule as any);
      executionService.executeWorkflow.mockResolvedValue({
        ...mockExecution,
        status: ExecutionStatus.COMPLETED
      } as any);
      eventPublisher.publishWorkflowEvent.mockResolvedValue(undefined);

      const result = await service.executeWorkflowRule('workflow-1', input, 'user-1', 'tenant-1');

      expect(prismaService.workflowExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workflowId: 'workflow-1',
          triggeredBy: 'user-1',
          status: ExecutionStatus.PENDING,
          input: { test: 'input' }
        })
      });

      expect(executionService.executeWorkflow).toHaveBeenCalledWith(
        'execution-1',
        expect.objectContaining({ id: 'workflow-1' }),
        input
      );

      expect(result).toEqual(expect.objectContaining({
        id: 'execution-1',
        status: ExecutionStatus.COMPLETED
      }));
    });

    it('should throw error for inactive workflow', async () => {
      const inactiveWorkflow = { ...mockWorkflowRule, isActive: false };

      prismaService.workflowRule.findFirst.mockResolvedValue({
        ...inactiveWorkflow,
        executions: []
      } as any);

      await expect(
        service.executeWorkflowRule('workflow-1', { data: {} }, 'user-1', 'tenant-1')
      ).rejects.toThrow('Workflow rule is not active: workflow-1');
    });
  });

  describe('getWorkflowStatistics', () => {
    it('should return workflow statistics', async () => {
      prismaService.workflowRule.count
        .mockResolvedValueOnce(10) // total workflows
        .mockResolvedValueOnce(8); // active workflows

      prismaService.workflowExecution.count
        .mockResolvedValueOnce(100) // total executions
        .mockResolvedValueOnce(85) // successful executions
        .mockResolvedValueOnce(15); // failed executions

      prismaService.workflowExecution.aggregate.mockResolvedValue({
        _avg: { duration: 5000 }
      } as any);

      const result = await service.getWorkflowStatistics('tenant-1');

      expect(result).toEqual({
        totalWorkflows: 10,
        activeWorkflows: 8,
        totalExecutions: 100,
        successfulExecutions: 85,
        failedExecutions: 15,
        averageExecutionTime: 5000
      });
    });
  });

  describe('validation', () => {
    it('should validate trigger types', async () => {
      const createRequest = {
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        type: 'automation' as const,
        triggers: [
          {
            id: 'trigger-1',
            type: 'invalid_type' as any,
            name: 'Invalid Trigger',
            enabled: true,
            configuration: {}
          }
        ]
      };

      await expect(service.createWorkflowRule(createRequest)).rejects.toThrow(
        'Invalid trigger type: invalid_type'
      );
    });

    it('should validate action types', async () => {
      const createRequest = {
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        type: 'automation' as const,
        actions: [
          {
            id: 'action-1',
            type: 'invalid_action' as any,
            name: 'Invalid Action',
            enabled: true,
            configuration: {}
          }
        ]
      };

      await expect(service.createWorkflowRule(createRequest)).rejects.toThrow(
        'Invalid action type: invalid_action'
      );
    });

    it('should validate schedule trigger configuration', async () => {
      const createRequest = {
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        type: 'automation' as const,
        triggers: [
          {
            id: 'trigger-1',
            type: TriggerType.SCHEDULE,
            name: 'Schedule Trigger',
            enabled: true,
            configuration: {} // Missing schedule
          }
        ]
      };

      await expect(service.createWorkflowRule(createRequest)).rejects.toThrow(
        'Schedule trigger requires schedule configuration'
      );
    });

    it('should validate assign ticket action configuration', async () => {
      const createRequest = {
        tenantId: 'tenant-1',
        name: 'Test Workflow',
        type: 'automation' as const,
        actions: [
          {
            id: 'action-1',
            type: ActionType.ASSIGN_TICKET,
            name: 'Assign Ticket',
            enabled: true,
            configuration: {} // Missing agentId or teamId
          }
        ]
      };

      await expect(service.createWorkflowRule(createRequest)).rejects.toThrow(
        'Assign ticket action requires agentId or teamId'
      );
    });
  });
});