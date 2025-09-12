/**
 * Unit tests for AIAutomationService
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { DatabaseService } from '@glavito/shared-database';
import { AIAutomationService } from '../ai-automation.service';
import { AIFeatureConfig, AIModelConfig, TrainingData, WorkflowDefinition } from '@glavito/shared-types';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { of, throwError } from 'rxjs';

describe('AIAutomationService', () => {
  let service: AIAutomationService;
  let databaseService: jest.Mocked<DatabaseService>;
  let configService: jest.Mocked<ConfigService>;
  let httpService: jest.Mocked<HttpService>;

  const mockTenantId = 'tenant-123';
  const mockModelId = 'model-123';
  const mockWorkflowId = 'workflow-123';

  beforeEach(async () => {
    const mockDatabaseService = {
      integrationStatus: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      aIModel: {
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      workflowAutomation: {
        create: jest.fn(),
        upsert: jest.fn(),
        update: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      knowledgeBase: {
        upsert: jest.fn(),
      },
    };

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockHttpService = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAutomationService,
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
          useValue: mockHttpService,
        },
      ],
    }).compile();

    service = module.get<AIAutomationService>(AIAutomationService);
    databaseService = module.get(DatabaseService);
    configService = module.get(ConfigService);
    httpService = module.get(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initializeAIFeatures', () => {
    const mockAIConfig: AIFeatureConfig = {
      ticketClassification: true,
      sentimentAnalysis: true,
      autoResponse: false,
      languageDetection: true,
      knowledgeBaseSuggestions: false,
      workflowAutomation: true,
      customModels: []
    };

    it('should successfully initialize AI features', async () => {
      // Mock database operations
      databaseService.aIModel.upsert.mockResolvedValue({
        id: 'model-1',
        tenantId: mockTenantId,
        name: 'ticket-classification',
        type: 'classification',
        status: 'ready',
        configuration: {},
        accuracy: 0.89,
        version: '1.0',
        isActive: true,
        errorMessage: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      databaseService.workflowAutomation.upsert.mockResolvedValue({
        id: 'workflow-1',
        tenantId: mockTenantId,
        name: 'basic-automation',
        description: 'Basic ticket routing',
        workflowType: 'custom',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      databaseService.integrationStatus.upsert.mockResolvedValue({
        id: 'integration-1',
        tenantId: mockTenantId,
        integrationType: 'ai',
        status: 'connected',
        configuration: mockAIConfig,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.initializeAIFeatures(mockTenantId, mockAIConfig);

      expect(result.success).toBe(true);
      expect(result.enabledFeatures).toContain('ticketClassification');
      expect(result.enabledFeatures).toContain('sentimentAnalysis');
      expect(result.enabledFeatures).toContain('languageDetection');
      expect(result.enabledFeatures).toContain('workflowAutomation');
      expect(result.errors).toHaveLength(0);

      expect(databaseService.integrationStatus.upsert).toHaveBeenCalledWith({
        where: {
          tenantId_integrationType: {
            tenantId: mockTenantId,
            integrationType: 'ai'
          }
        },
        create: expect.objectContaining({
          tenantId: mockTenantId,
          integrationType: 'ai',
          status: 'connected',
          configuration: mockAIConfig
        }),
        update: expect.objectContaining({
          status: 'connected',
          configuration: mockAIConfig
        })
      });
    });

    it('should handle partial failures gracefully', async () => {
      // Mock some operations to fail
      databaseService.aIModel.upsert
        .mockResolvedValueOnce({} as any) // ticket classification succeeds
        .mockRejectedValueOnce(new Error('Sentiment analysis failed')); // sentiment analysis fails

      databaseService.workflowAutomation.upsert.mockResolvedValue({} as any);
      databaseService.integrationStatus.upsert.mockResolvedValue({} as any);

      const result = await service.initializeAIFeatures(mockTenantId, mockAIConfig);

      expect(result.success).toBe(false);
      expect(result.enabledFeatures).toContain('ticketClassification');
      expect(result.enabledFeatures).not.toContain('sentimentAnalysis');
      expect(result.errors).toContain('Sentiment analysis: Sentiment analysis failed');
    });

    it('should throw InternalServerErrorException on database failure', async () => {
      databaseService.integrationStatus.upsert.mockRejectedValue(new Error('Database error'));

      await expect(
        service.initializeAIFeatures(mockTenantId, mockAIConfig)
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('createN8NWorkflow', () => {
    const mockWorkflowDefinition: WorkflowDefinition = {
      name: 'Test Workflow',
      description: 'Test workflow description',
      nodes: [
        {
          id: 'webhook',
          type: 'n8n-nodes-base.webhook',
          name: 'Webhook',
          parameters: {}
        }
      ],
      connections: {},
      settings: {}
    };

    it('should successfully create N8N workflow', async () => {
      // Mock N8N configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'N8N_URL':
            return 'http://n8n.example.com';
          case 'N8N_API_KEY':
            return 'test-api-key';
          default:
            return undefined;
        }
      });

      // Mock N8N API response
      httpService.post.mockReturnValue(
        of({
          status: 200,
          data: { id: 'n8n-workflow-123' }
        } as any)
      );

      // Mock database creation
      databaseService.workflowAutomation.create.mockResolvedValue({
        id: mockWorkflowId,
        tenantId: mockTenantId,
        name: mockWorkflowDefinition.name,
        description: mockWorkflowDefinition.description,
        workflowType: 'n8n',
        workflowId: 'n8n-workflow-123',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.createN8NWorkflow(mockTenantId, mockWorkflowDefinition);

      expect(result).toEqual({
        id: mockWorkflowId,
        name: mockWorkflowDefinition.name,
        isActive: false,
        createdAt: expect.any(Date)
      });

      expect(httpService.post).toHaveBeenCalledWith(
        'http://n8n.example.com/api/v1/workflows',
        expect.objectContaining({
          name: mockWorkflowDefinition.name,
          nodes: mockWorkflowDefinition.nodes,
          connections: mockWorkflowDefinition.connections,
          settings: mockWorkflowDefinition.settings,
          active: false
        }),
        {
          headers: {
            'X-N8N-API-KEY': 'test-api-key',
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should throw BadRequestException when N8N configuration is missing', async () => {
      configService.get.mockReturnValue(undefined);

      await expect(
        service.createN8NWorkflow(mockTenantId, mockWorkflowDefinition)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle N8N API errors', async () => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'N8N_URL':
            return 'http://n8n.example.com';
          case 'N8N_API_KEY':
            return 'test-api-key';
          default:
            return undefined;
        }
      });

      httpService.post.mockReturnValue(
        throwError(() => new Error('N8N API error'))
      );

      await expect(
        service.createN8NWorkflow(mockTenantId, mockWorkflowDefinition)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('activateN8NWorkflow', () => {
    it('should successfully activate N8N workflow', async () => {
      // Mock workflow lookup
      databaseService.workflowAutomation.findFirst.mockResolvedValue({
        id: mockWorkflowId,
        tenantId: mockTenantId,
        workflowId: 'n8n-workflow-123',
        name: 'Test Workflow',
        isActive: false,
      } as any);

      // Mock N8N configuration
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'N8N_URL':
            return 'http://n8n.example.com';
          case 'N8N_API_KEY':
            return 'test-api-key';
          default:
            return undefined;
        }
      });

      // Mock N8N API response
      httpService.patch.mockReturnValue(
        of({ status: 200, data: {} } as any)
      );

      // Mock database update
      databaseService.workflowAutomation.update.mockResolvedValue({} as any);

      const result = await service.activateN8NWorkflow(mockTenantId, mockWorkflowId);

      expect(result).toEqual({
        success: true,
        workflowId: mockWorkflowId,
        errorMessage: null
      });

      expect(httpService.patch).toHaveBeenCalledWith(
        'http://n8n.example.com/api/v1/workflows/n8n-workflow-123',
        { active: true },
        {
          headers: {
            'X-N8N-API-KEY': 'test-api-key',
            'Content-Type': 'application/json'
          }
        }
      );

      expect(databaseService.workflowAutomation.update).toHaveBeenCalledWith({
        where: { id: mockWorkflowId },
        data: { isActive: true }
      });
    });

    it('should return error when workflow not found', async () => {
      databaseService.workflowAutomation.findFirst.mockResolvedValue(null);

      const result = await service.activateN8NWorkflow(mockTenantId, mockWorkflowId);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Workflow not found');
    });

    it('should handle N8N API activation errors', async () => {
      databaseService.workflowAutomation.findFirst.mockResolvedValue({
        id: mockWorkflowId,
        workflowId: 'n8n-workflow-123',
      } as any);

      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'N8N_URL':
            return 'http://n8n.example.com';
          case 'N8N_API_KEY':
            return 'test-api-key';
          default:
            return undefined;
        }
      });

      httpService.patch.mockReturnValue(
        throwError(() => new Error('Activation failed'))
      );

      const result = await service.activateN8NWorkflow(mockTenantId, mockWorkflowId);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Activation failed');
    });
  });

  describe('trainCustomModel', () => {
    const mockModelConfig: AIModelConfig = {
      id: 'custom-model',
      name: 'Custom Classification Model',
      type: 'classification',
      configuration: {
        categories: ['urgent', 'normal', 'low'],
        confidence_threshold: 0.8
      },
      isActive: true
    };

    const mockTrainingData: TrainingData = {
      type: 'classification',
      data: [
        { text: 'Urgent issue with payment', label: 'urgent' },
        { text: 'General question about features', label: 'normal' }
      ],
      labels: ['urgent', 'normal', 'low']
    };

    it('should successfully start model training', async () => {
      databaseService.aIModel.create.mockResolvedValue({
        id: mockModelId,
        tenantId: mockTenantId,
        name: mockModelConfig.name,
        type: mockModelConfig.type,
        status: 'training',
        configuration: mockModelConfig.configuration,
        trainingData: mockTrainingData,
        version: '1.0',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.trainCustomModel(mockTenantId, mockModelConfig, mockTrainingData);

      expect(result.success).toBe(true);
      expect(result.trainingId).toBe(`training_${mockModelId}`);
      expect(result.estimatedCompletion).toBeInstanceOf(Date);
      expect(result.errorMessage).toBeNull();

      expect(databaseService.aIModel.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockTenantId,
          name: mockModelConfig.name,
          type: mockModelConfig.type,
          status: 'training',
          configuration: mockModelConfig.configuration,
          trainingData: mockTrainingData,
          version: '1.0',
          isActive: false
        }
      });
    });

    it('should handle training initiation errors', async () => {
      databaseService.aIModel.create.mockRejectedValue(new Error('Database error'));

      const result = await service.trainCustomModel(mockTenantId, mockModelConfig, mockTrainingData);

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Database error');
    });
  });

  describe('getModelStatus', () => {
    it('should return model status successfully', async () => {
      const mockModel = {
        id: mockModelId,
        tenantId: mockTenantId,
        name: 'Test Model',
        type: 'classification',
        status: 'ready',
        accuracy: 0.92,
        errorMessage: null,
      };

      databaseService.aIModel.findFirst.mockResolvedValue(mockModel as any);

      const result = await service.getModelStatus(mockTenantId, mockModelId);

      expect(result).toEqual({
        id: mockModelId,
        status: 'ready',
        accuracy: 0.92,
        errorMessage: undefined
      });
    });

    it('should throw BadRequestException when model not found', async () => {
      databaseService.aIModel.findFirst.mockResolvedValue(null);

      await expect(
        service.getModelStatus(mockTenantId, mockModelId)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAIFeaturesStatus', () => {
    it('should return comprehensive AI features status', async () => {
      // Mock integration status
      databaseService.integrationStatus.findUnique.mockResolvedValue({
        id: 'integration-1',
        tenantId: mockTenantId,
        integrationType: 'ai',
        status: 'connected',
        healthCheckData: {
          enabledFeatures: ['ticketClassification', 'sentimentAnalysis'],
          lastCheckedAt: new Date(),
          isHealthy: true
        }
      } as any);

      // Mock AI models
      databaseService.aIModel.findMany.mockResolvedValue([
        {
          id: 'model-1',
          name: 'ticket-classification',
          status: 'ready',
          accuracy: 0.89
        },
        {
          id: 'model-2',
          name: 'sentiment-analysis',
          status: 'ready',
          accuracy: 0.92
        }
      ] as any);

      // Mock workflows
      databaseService.workflowAutomation.findMany.mockResolvedValue([
        {
          id: 'workflow-1',
          name: 'Auto Assignment',
          isActive: true,
          createdAt: new Date()
        }
      ] as any);

      const result = await service.getAIFeaturesStatus(mockTenantId);

      expect(result.configured).toEqual(['ticketClassification', 'sentimentAnalysis']);
      expect(result.available).toHaveLength(6);
      expect(result.models).toHaveLength(2);
      expect(result.workflows).toHaveLength(1);
    });

    it('should handle missing integration status', async () => {
      databaseService.integrationStatus.findUnique.mockResolvedValue(null);
      databaseService.aIModel.findMany.mockResolvedValue([]);
      databaseService.workflowAutomation.findMany.mockResolvedValue([]);

      const result = await service.getAIFeaturesStatus(mockTenantId);

      expect(result.configured).toEqual([]);
      expect(result.models).toEqual([]);
      expect(result.workflows).toEqual([]);
    });
  });

  describe('getN8NTemplates', () => {
    it('should return available N8N templates', async () => {
      const templates = await service.getN8NTemplates();

      expect(templates).toBeInstanceOf(Array);
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('description');
      expect(templates[0]).toHaveProperty('workflow');
      expect(templates[0]).toHaveProperty('category');
      expect(templates[0]).toHaveProperty('complexity');
    });

    it('should filter templates by category', async () => {
      const templates = await service.getN8NTemplates('ticket-management');

      expect(templates).toBeInstanceOf(Array);
      templates.forEach(template => {
        expect(template.category).toBe('ticket-management');
      });
    });
  });
});