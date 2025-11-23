import { Test, TestingModule } from '@nestjs/testing';
import { WorkflowEngineService } from '../workflow-engine.service';
import { WorkflowExecutionService } from '../workflow-execution.service';
import { N8NSyncService } from '../n8n-sync.service';
import { PrismaService } from '@glavito/shared-database';
import { EventPublisherService } from '@glavito/shared-kafka';
import { TriggerType, ActionType } from '../../interfaces/workflow.interface';

describe('WorkflowEngineService Integration', () => {
  let service: WorkflowEngineService;
  let prismaService: PrismaService;
  let module: TestingModule;

  beforeAll(async () => {
    // Mock services for integration test
    const mockEventPublisher = {
      publishWorkflowEvent: jest.fn().mockResolvedValue(undefined)
    };

    const mockExecutionService = {
      executeWorkflow: jest.fn().mockResolvedValue({
        id: 'execution-1',
        status: 'completed'
      })
    };

    const mockN8NSyncService = {
      syncWorkflowToN8N: jest.fn().mockResolvedValue('n8n-workflow-id'),
      syncWorkflowStatus: jest.fn().mockResolvedValue(undefined),
      deleteN8NWorkflow: jest.fn().mockResolvedValue(undefined)
    };

    // Use a mock PrismaService for integration testing
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
        create: jest.fn().mockResolvedValue({})
      }
    };

    module = await Test.createTestingModule({
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
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Workflow CRUD Operations', () => {
    it('should create, read, update, and delete a workflow', async () => {
      const tenantId = 'test-tenant';
      const workflowData = {
        tenantId,
        name: 'Integration Test Workflow',
        description: 'A workflow for integration testing',
        type: 'automation' as const,
        priority: 1,
        isActive: true,
        conditions: [
          {
            field: 'ticket.priority',
            operator: 'equals',
            value: 'high'
          }
        ],
        actions: [
          {
            id: 'action-1',
            type: ActionType.ASSIGN_TICKET,
            name: 'Auto Assign High Priority',
            enabled: true,
            configuration: {
              agentId: 'agent-1'
            }
          }
        ],
        triggers: [
          {
            id: 'trigger-1',
            type: TriggerType.EVENT,
            name: 'Ticket Created',
            enabled: true,
            configuration: {
              eventType: 'ticket.created'
            }
          }
        ],
        metadata: {
          category: 'automation',
          tags: ['high-priority', 'auto-assign']
        }
      };

      const mockCreatedWorkflow = {
        id: 'workflow-1',
        ...workflowData,
        executionCount: 0,
        lastExecuted: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock create operation
      (prismaService.workflowRule.create as jest.Mock).mockResolvedValue(mockCreatedWorkflow);

      // CREATE: Test workflow creation
      const createdWorkflow = await service.createWorkflowRule(workflowData);

      expect(createdWorkflow).toEqual(expect.objectContaining({
        id: 'workflow-1',
        name: 'Integration Test Workflow',
        type: 'automation',
        isActive: true
      }));

      expect(prismaService.workflowRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          name: 'Integration Test Workflow',
          type: 'automation',
          priority: 1,
          isActive: true,
          conditions: expect.arrayContaining([
            expect.objectContaining({
              field: 'ticket.priority',
              operator: 'equals',
              value: 'high'
            })
          ]),
          actions: expect.arrayContaining([
            expect.objectContaining({
              type: ActionType.ASSIGN_TICKET,
              configuration: { agentId: 'agent-1' }
            })
          ]),
          triggers: expect.arrayContaining([
            expect.objectContaining({
              type: TriggerType.EVENT,
              configuration: { eventType: 'ticket.created' }
            })
          ])
        })
      });

      // READ: Test workflow retrieval
      (prismaService.workflowRule.findFirst as jest.Mock).mockResolvedValue({
        ...mockCreatedWorkflow,
        executions: []
      });

      const retrievedWorkflow = await service.getWorkflowRule('workflow-1', tenantId);

      expect(retrievedWorkflow).toEqual(expect.objectContaining({
        id: 'workflow-1',
        name: 'Integration Test Workflow'
      }));

      // UPDATE: Test workflow update
      const updateData = {
        name: 'Updated Integration Test Workflow',
        description: 'Updated description',
        isActive: false
      };

      const mockUpdatedWorkflow = {
        ...mockCreatedWorkflow,
        ...updateData,
        updatedAt: new Date()
      };

      (prismaService.workflowRule.update as jest.Mock).mockResolvedValue(mockUpdatedWorkflow);

      const updatedWorkflow = await service.updateWorkflowRule('workflow-1', updateData, tenantId);

      expect(updatedWorkflow).toEqual(expect.objectContaining({
        name: 'Updated Integration Test Workflow',
        isActive: false
      }));

      expect(prismaService.workflowRule.update).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
        data: expect.objectContaining({
          name: 'Updated Integration Test Workflow',
          description: 'Updated description',
          isActive: false
        })
      });

      // DELETE: Test workflow deletion
      (prismaService.workflowRule.delete as jest.Mock).mockResolvedValue(mockUpdatedWorkflow);

      await service.deleteWorkflowRule('workflow-1', tenantId);

      expect(prismaService.workflowRule.delete).toHaveBeenCalledWith({
        where: { id: 'workflow-1' }
      });
    });
  });

  describe('Workflow Execution Flow', () => {
    it('should execute a complete workflow flow', async () => {
      const tenantId = 'test-tenant';
      const workflowId = 'workflow-1';
      const userId = 'user-1';

      const mockWorkflow = {
        id: workflowId,
        tenantId,
        name: 'Test Execution Workflow',
        type: 'automation',
        isActive: true,
        actions: [
          {
            id: 'action-1',
            type: ActionType.UPDATE_FIELD,
            name: 'Update Priority',
            enabled: true,
            configuration: {
              field: 'priority',
              value: 'high'
            }
          }
        ],
        triggers: [
          {
            id: 'trigger-1',
            type: TriggerType.MANUAL,
            name: 'Manual Trigger',
            enabled: true,
            configuration: {}
          }
        ],
        executions: []
      };

      const mockExecution = {
        id: 'execution-1',
        workflowId,
        triggeredBy: userId,
        status: 'pending',
        input: { ticketId: 'ticket-1' },
        metadata: { triggerType: 'manual' },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mock workflow retrieval
      (prismaService.workflowRule.findFirst as jest.Mock).mockResolvedValue(mockWorkflow);

      // Mock execution creation
      (prismaService.workflowExecution.create as jest.Mock).mockResolvedValue(mockExecution);

      // Mock workflow update for execution count
      (prismaService.workflowRule.update as jest.Mock).mockResolvedValue({
        ...mockWorkflow,
        executionCount: 1,
        lastExecuted: new Date()
      });

      // Execute the workflow
      const input = {
        data: { ticketId: 'ticket-1', priority: 'medium' },
        context: { tenantId, userId }
      };

      const execution = await service.executeWorkflowRule(workflowId, input, userId, tenantId);

      // Verify execution was created
      expect(prismaService.workflowExecution.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          workflowId,
          triggeredBy: userId,
          status: 'pending',
          input: { ticketId: 'ticket-1', priority: 'medium' }
        })
      });

      // Verify execution count was updated
      expect(prismaService.workflowRule.update).toHaveBeenCalledWith({
        where: { id: workflowId },
        data: {
          executionCount: { increment: 1 },
          lastExecuted: expect.any(Date)
        }
      });

      expect(execution).toEqual(expect.objectContaining({
        id: 'execution-1',
        status: 'completed'
      }));
    });
  });

  describe('Workflow Statistics', () => {
    it('should calculate workflow statistics correctly', async () => {
      const tenantId = 'test-tenant';

      // Mock statistics queries
      (prismaService.workflowRule.count as jest.Mock)
        .mockResolvedValueOnce(25) // total workflows
        .mockResolvedValueOnce(20); // active workflows

      (prismaService.workflowExecution.count as jest.Mock)
        .mockResolvedValueOnce(500) // total executions
        .mockResolvedValueOnce(450) // successful executions
        .mockResolvedValueOnce(50); // failed executions

      (prismaService.workflowExecution.aggregate as jest.Mock).mockResolvedValue({
        _avg: { duration: 3500 }
      });

      const stats = await service.getWorkflowStatistics(tenantId);

      expect(stats).toEqual({
        totalWorkflows: 25,
        activeWorkflows: 20,
        totalExecutions: 500,
        successfulExecutions: 450,
        failedExecutions: 50,
        averageExecutionTime: 3500
      });

      // Verify correct queries were made
      expect(prismaService.workflowRule.count).toHaveBeenCalledWith({
        where: { tenantId }
      });

      expect(prismaService.workflowRule.count).toHaveBeenCalledWith({
        where: { tenantId, isActive: true }
      });

      expect(prismaService.workflowExecution.count).toHaveBeenCalledWith({
        where: { workflow: { tenantId } }
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const tenantId = 'test-tenant';
      const workflowData = {
        tenantId,
        name: 'Error Test Workflow',
        type: 'automation' as const
      };

      // Mock database error
      (prismaService.workflowRule.create as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.createWorkflowRule(workflowData)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle validation errors', async () => {
      const tenantId = 'test-tenant';
      
      // Mock existing workflow for duplicate name check
      (prismaService.workflowRule.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing-workflow',
        name: 'Duplicate Name'
      });

      const workflowData = {
        tenantId,
        name: 'Duplicate Name',
        type: 'automation' as const
      };

      await expect(service.createWorkflowRule(workflowData)).rejects.toThrow(
        "Workflow rule with name 'Duplicate Name' already exists"
      );
    });
  });
});