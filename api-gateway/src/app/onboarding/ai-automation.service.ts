/**
 * AI and Automation Integration Service for Onboarding
 * Handles AI model configuration, N8N workflow integration, and automation setup
 */

import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { 
  AIFeatureConfig,
  AIModelConfig,
  WorkflowConfig,
  WorkflowDefinition,
  WorkflowResult,
  ActivationResult,
  TrainingData,
  ModelStatus,
  TrainingConfig,
  ModelInitResult,
  TrainingResult,
  N8NTemplate
} from '@glavito/shared-types';

@Injectable()
export class AIAutomationService {
  private readonly logger = new Logger(AIAutomationService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  /**
   * Initialize AI features for a tenant
   */
  async initializeAIFeatures(
    tenantId: string,
    config: AIFeatureConfig
  ): Promise<{ success: boolean; enabledFeatures: string[]; errors: string[] }> {
    try {
      this.logger.log(`Initializing AI features for tenant: ${tenantId}`);

      const enabledFeatures: string[] = [];
      const errors: string[] = [];

      // Initialize ticket classification
      if (config.ticketClassification) {
        try {
          await this.initializeTicketClassification(tenantId);
          enabledFeatures.push('ticketClassification');
        } catch (error) {
          errors.push(`Ticket classification: ${error.message}`);
        }
      }

      // Initialize sentiment analysis
      if (config.sentimentAnalysis) {
        try {
          await this.initializeSentimentAnalysis(tenantId);
          enabledFeatures.push('sentimentAnalysis');
        } catch (error) {
          errors.push(`Sentiment analysis: ${error.message}`);
        }
      }

      // Initialize auto response
      if (config.autoResponse) {
        try {
          await this.initializeAutoResponse(tenantId);
          enabledFeatures.push('autoResponse');
        } catch (error) {
          errors.push(`Auto response: ${error.message}`);
        }
      }

      // Initialize language detection
      if (config.languageDetection) {
        try {
          await this.initializeLanguageDetection(tenantId);
          enabledFeatures.push('languageDetection');
        } catch (error) {
          errors.push(`Language detection: ${error.message}`);
        }
      }

      // Initialize knowledge base suggestions
      if (config.knowledgeBaseSuggestions) {
        try {
          await this.initializeKnowledgeBaseSuggestions(tenantId);
          enabledFeatures.push('knowledgeBaseSuggestions');
        } catch (error) {
          errors.push(`Knowledge base suggestions: ${error.message}`);
        }
      }

      // Initialize workflow automation
      if (config.workflowAutomation) {
        try {
          await this.initializeWorkflowAutomation(tenantId);
          enabledFeatures.push('workflowAutomation');
        } catch (error) {
          errors.push(`Workflow automation: ${error.message}`);
        }
      }

      // Initialize custom models
      for (const customModel of config.customModels || []) {
        try {
          await this.initializeCustomModel(tenantId, customModel);
          enabledFeatures.push(`customModel_${customModel.id}`);
        } catch (error) {
          errors.push(`Custom model ${customModel.name}: ${error.message}`);
        }
      }

      // Update integration status
      await this.databaseService.integrationStatus.upsert({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'ai'
          }
        },
        create: {
          tenantId,
          integrationType: 'ai',
          status: errors.length === 0 ? 'connected' : 'error',
          configuration: config,
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          healthCheckData: {
            enabledFeatures,
            lastCheckedAt: new Date(),
            isHealthy: errors.length === 0
          }
        },
        update: {
          status: errors.length === 0 ? 'connected' : 'error',
          configuration: config,
          errorMessage: errors.length > 0 ? errors.join('; ') : null,
          healthCheckData: {
            enabledFeatures,
            lastCheckedAt: new Date(),
            isHealthy: errors.length === 0
          }
        }
      });

      return {
        success: errors.length === 0,
        enabledFeatures,
        errors
      };

    } catch (error) {
      this.logger.error(`AI features initialization failed: ${error.message}`);
      throw new InternalServerErrorException('Failed to initialize AI features');
    }
  }

  /**
   * Create and configure N8N workflow
   */
  async createN8NWorkflow(
    tenantId: string,
    workflowDefinition: WorkflowDefinition
  ): Promise<WorkflowResult> {
    try {
      this.logger.log(`Creating N8N workflow for tenant: ${tenantId}`);

      const n8nUrl = this.configService.get('N8N_URL');
      const n8nApiKey = this.configService.get('N8N_API_KEY');

      if (!n8nUrl || !n8nApiKey) {
        throw new BadRequestException('N8N configuration not found');
      }

      // Create workflow in N8N
      const response = await firstValueFrom(
        this.httpService.post(
          `${n8nUrl}/api/v1/workflows`,
          {
            name: workflowDefinition.name,
            nodes: workflowDefinition.nodes,
            connections: workflowDefinition.connections,
            settings: workflowDefinition.settings,
            active: false
          },
          {
            headers: {
              'X-N8N-API-KEY': n8nApiKey,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      const workflowId = response.data.id;

      // Save workflow automation record
      const workflowAutomation = await this.databaseService.workflowAutomation.create({
        data: {
          tenantId,
          name: workflowDefinition.name,
          description: workflowDefinition.description,
          workflowType: 'n8n',
          workflowId: workflowId.toString(),
          triggers: workflowDefinition.nodes.filter(node => node.type?.includes('trigger')),
          actions: workflowDefinition.nodes.filter(node => !node.type?.includes('trigger')),
          conditions: [],
          isActive: false
        }
      });

      return {
        id: workflowAutomation.id,
        name: workflowDefinition.name,
        isActive: false,
        createdAt: workflowAutomation.createdAt
      };

    } catch (error) {
      this.logger.error(`N8N workflow creation failed: ${error.message}`);
      throw new BadRequestException(`Failed to create workflow: ${error.message}`);
    }
  }

  /**
   * Activate N8N workflow
   */
  async activateN8NWorkflow(tenantId: string, workflowId: string): Promise<ActivationResult> {
    try {
      this.logger.log(`Activating N8N workflow: ${workflowId} for tenant: ${tenantId}`);

      const workflowAutomation = await this.databaseService.workflowAutomation.findFirst({
        where: {
          tenantId,
          id: workflowId
        }
      });

      if (!workflowAutomation) {
        throw new BadRequestException('Workflow not found');
      }

      const n8nUrl = this.configService.get('N8N_URL');
      const n8nApiKey = this.configService.get('N8N_API_KEY');

      // Activate workflow in N8N
      await firstValueFrom(
        this.httpService.patch(
          `${n8nUrl}/api/v1/workflows/${workflowAutomation.workflowId}`,
          { active: true },
          {
            headers: {
              'X-N8N-API-KEY': n8nApiKey,
              'Content-Type': 'application/json'
            }
          }
        )
      );

      // Update local record
      await this.databaseService.workflowAutomation.update({
        where: { id: workflowId },
        data: { isActive: true }
      });

      return {
        success: true,
        workflowId,
        errorMessage: null
      };

    } catch (error) {
      this.logger.error(`N8N workflow activation failed: ${error.message}`);
      return {
        success: false,
        workflowId,
        errorMessage: error.message
      };
    }
  }

  /**
   * Get available N8N templates
   */
  async getN8NTemplates(category?: string): Promise<N8NTemplate[]> {
    try {
      // In a real implementation, this would fetch from N8N community templates
      // For now, we'll return predefined templates
      const templates: N8NTemplate[] = [
        {
          id: 'ticket-auto-assign',
          name: 'Auto-assign Tickets',
          description: 'Automatically assign tickets based on keywords and agent availability',
          workflow: {
            nodes: [
              {
                id: 'webhook',
                type: 'n8n-nodes-base.webhook',
                name: 'Ticket Created',
                parameters: {
                  path: 'ticket-created',
                  httpMethod: 'POST'
                }
              },
              {
                id: 'classify',
                type: 'n8n-nodes-base.function',
                name: 'Classify Ticket',
                parameters: {
                  functionCode: `
                    const ticket = items[0].json;
                    const keywords = ticket.subject.toLowerCase();
                    
                    let category = 'general';
                    if (keywords.includes('billing') || keywords.includes('payment')) {
                      category = 'billing';
                    } else if (keywords.includes('technical') || keywords.includes('bug')) {
                      category = 'technical';
                    }
                    
                    return [{ json: { ...ticket, category } }];
                  `
                }
              },
              {
                id: 'assign',
                type: 'n8n-nodes-base.httpRequest',
                name: 'Assign Agent',
                parameters: {
                  url: '{{$env.API_URL}}/api/tickets/{{$json.id}}/assign',
                  method: 'POST',
                  body: {
                    category: '={{$json.category}}'
                  }
                }
              }
            ],
            connections: {
              'Ticket Created': {
                main: [['Classify Ticket']]
              },
              'Classify Ticket': {
                main: [['Assign Agent']]
              }
            }
          },
          category: 'ticket-management',
          complexity: 'beginner'
        },
        {
          id: 'sentiment-escalation',
          name: 'Sentiment-based Escalation',
          description: 'Escalate tickets with negative sentiment to managers',
          workflow: {
            nodes: [
              {
                id: 'webhook',
                type: 'n8n-nodes-base.webhook',
                name: 'Message Received',
                parameters: {
                  path: 'message-received',
                  httpMethod: 'POST'
                }
              },
              {
                id: 'sentiment',
                type: 'n8n-nodes-base.httpRequest',
                name: 'Analyze Sentiment',
                parameters: {
                  url: '{{$env.AI_API_URL}}/sentiment',
                  method: 'POST',
                  body: {
                    text: '={{$json.content}}'
                  }
                }
              },
              {
                id: 'condition',
                type: 'n8n-nodes-base.if',
                name: 'Check Negative Sentiment',
                parameters: {
                  conditions: {
                    number: [
                      {
                        value1: '={{$json.sentiment_score}}',
                        operation: 'smaller',
                        value2: -0.5
                      }
                    ]
                  }
                }
              },
              {
                id: 'escalate',
                type: 'n8n-nodes-base.httpRequest',
                name: 'Escalate to Manager',
                parameters: {
                  url: '{{$env.API_URL}}/api/tickets/{{$json.ticket_id}}/escalate',
                  method: 'POST'
                }
              }
            ],
            connections: {
              'Message Received': {
                main: [['Analyze Sentiment']]
              },
              'Analyze Sentiment': {
                main: [['Check Negative Sentiment']]
              },
              'Check Negative Sentiment': {
                main: [['Escalate to Manager'], []]
              }
            }
          },
          category: 'customer-experience',
          complexity: 'intermediate'
        }
      ];

      return category 
        ? templates.filter(t => t.category === category)
        : templates;

    } catch (error) {
      this.logger.error(`Failed to get N8N templates: ${error.message}`);
      return [];
    }
  }

  /**
   * Train custom AI model
   */
  async trainCustomModel(
    tenantId: string,
    modelConfig: AIModelConfig,
    trainingData: TrainingData
  ): Promise<TrainingResult> {
    try {
      this.logger.log(`Training custom model for tenant: ${tenantId}`);

      // Create AI model record
      const aiModel = await this.databaseService.aIModel.create({
        data: {
          tenantId,
          name: modelConfig.name,
          type: modelConfig.type,
          status: 'training',
          configuration: modelConfig.configuration,
          trainingData: trainingData,
          version: '1.0',
          isActive: false
        }
      });

      // In a real implementation, this would trigger actual ML training
      // For now, we'll simulate the training process
      const trainingId = `training_${aiModel.id}`;
      const estimatedCompletion = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

      // Simulate training completion after a delay
      setTimeout(async () => {
        try {
          await this.databaseService.aIModel.update({
            where: { id: aiModel.id },
            data: {
              status: 'ready',
              accuracy: 0.85 + Math.random() * 0.1, // Simulate 85-95% accuracy
              isActive: true
            }
          });
          this.logger.log(`Model training completed for: ${aiModel.id}`);
        } catch (error) {
          this.logger.error(`Failed to update model status: ${error.message}`);
        }
      }, 5000); // Complete after 5 seconds for demo

      return {
        success: true,
        trainingId,
        estimatedCompletion,
        errorMessage: null
      };

    } catch (error) {
      this.logger.error(`Model training failed: ${error.message}`);
      return {
        success: false,
        trainingId: '',
        estimatedCompletion: new Date(),
        errorMessage: error.message
      };
    }
  }

  /**
   * Get AI model status
   */
  async getModelStatus(tenantId: string, modelId: string): Promise<ModelStatus> {
    try {
      const model = await this.databaseService.aIModel.findFirst({
        where: {
          tenantId,
          id: modelId
        }
      });

      if (!model) {
        throw new BadRequestException('Model not found');
      }

      return {
        id: model.id,
        status: model.status as 'training' | 'ready' | 'error',
        accuracy: model.accuracy || undefined,
        errorMessage: model.errorMessage || undefined
      };

    } catch (error) {
      this.logger.error(`Failed to get model status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get AI features status for tenant
   */
  async getAIFeaturesStatus(tenantId: string): Promise<{
    configured: string[];
    available: string[];
    models: ModelStatus[];
    workflows: WorkflowResult[];
  }> {
    try {
      // Get integration status
      const integration = await this.databaseService.integrationStatus.findUnique({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'ai'
          }
        }
      });

      // Get AI models
      const models = await this.databaseService.aIModel.findMany({
        where: { tenantId }
      });

      // Get workflows
      const workflows = await this.databaseService.workflowAutomation.findMany({
        where: { tenantId }
      });

      const configured = integration?.healthCheckData?.enabledFeatures || [];
      const available = [
        'ticketClassification',
        'sentimentAnalysis',
        'autoResponse',
        'languageDetection',
        'knowledgeBaseSuggestions',
        'workflowAutomation'
      ];

      return {
        configured,
        available,
        models: models.map(model => ({
          id: model.id,
          status: model.status as 'training' | 'ready' | 'error',
          accuracy: model.accuracy || undefined,
          errorMessage: model.errorMessage || undefined
        })),
        workflows: workflows.map(workflow => ({
          id: workflow.id,
          name: workflow.name,
          isActive: workflow.isActive,
          createdAt: workflow.createdAt
        }))
      };

    } catch (error) {
      this.logger.error(`Failed to get AI features status: ${error.message}`);
      throw error;
    }
  }

  // Private helper methods

  private async initializeTicketClassification(tenantId: string): Promise<void> {
    // Initialize ticket classification model
    await this.databaseService.aIModel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'ticket-classification'
        }
      },
      create: {
        tenantId,
        name: 'ticket-classification',
        type: 'classification',
        status: 'ready',
        configuration: {
          categories: ['billing', 'technical', 'general', 'urgent'],
          confidence_threshold: 0.7
        },
        accuracy: 0.89,
        version: '1.0',
        isActive: true
      },
      update: {
        isActive: true,
        status: 'ready'
      }
    });
  }

  private async initializeSentimentAnalysis(tenantId: string): Promise<void> {
    // Initialize sentiment analysis model
    await this.databaseService.aIModel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'sentiment-analysis'
        }
      },
      create: {
        tenantId,
        name: 'sentiment-analysis',
        type: 'sentiment',
        status: 'ready',
        configuration: {
          scale: 'negative_neutral_positive',
          confidence_threshold: 0.6
        },
        accuracy: 0.92,
        version: '1.0',
        isActive: true
      },
      update: {
        isActive: true,
        status: 'ready'
      }
    });
  }

  private async initializeAutoResponse(tenantId: string): Promise<void> {
    // Initialize auto response system
    await this.databaseService.aIModel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'auto-response'
        }
      },
      create: {
        tenantId,
        name: 'auto-response',
        type: 'custom',
        status: 'ready',
        configuration: {
          response_templates: [
            {
              trigger: 'greeting',
              response: 'Hello! How can I help you today?'
            },
            {
              trigger: 'billing_question',
              response: 'I can help you with billing questions. Let me connect you with our billing team.'
            }
          ],
          confidence_threshold: 0.8
        },
        accuracy: 0.85,
        version: '1.0',
        isActive: true
      },
      update: {
        isActive: true,
        status: 'ready'
      }
    });
  }

  private async initializeLanguageDetection(tenantId: string): Promise<void> {
    // Initialize language detection
    await this.databaseService.aIModel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'language-detection'
        }
      },
      create: {
        tenantId,
        name: 'language-detection',
        type: 'language',
        status: 'ready',
        configuration: {
          supported_languages: ['en', 'es', 'fr', 'de', 'ar'],
          confidence_threshold: 0.9
        },
        accuracy: 0.96,
        version: '1.0',
        isActive: true
      },
      update: {
        isActive: true,
        status: 'ready'
      }
    });
  }

  private async initializeKnowledgeBaseSuggestions(tenantId: string): Promise<void> {
    // Initialize knowledge base suggestions
    await this.databaseService.aIModel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'kb-suggestions'
        }
      },
      create: {
        tenantId,
        name: 'kb-suggestions',
        type: 'custom',
        status: 'ready',
        configuration: {
          embedding_model: 'sentence-transformers',
          similarity_threshold: 0.7,
          max_suggestions: 5
        },
        accuracy: 0.88,
        version: '1.0',
        isActive: true
      },
      update: {
        isActive: true,
        status: 'ready'
      }
    });
  }

  private async initializeWorkflowAutomation(tenantId: string): Promise<void> {
    // Initialize basic workflow automation
    await this.databaseService.workflowAutomation.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: 'basic-automation'
        }
      },
      create: {
        tenantId,
        name: 'basic-automation',
        description: 'Basic ticket routing and escalation',
        workflowType: 'custom',
        triggers: [
          {
            type: 'ticket_created',
            conditions: []
          }
        ],
        actions: [
          {
            type: 'auto_assign',
            configuration: {
              strategy: 'round_robin'
            }
          }
        ],
        conditions: [],
        isActive: true
      },
      update: {
        isActive: true
      }
    });
  }

  private async initializeCustomModel(tenantId: string, modelConfig: AIModelConfig): Promise<void> {
    await this.databaseService.aIModel.upsert({
      where: {
        tenantId_name: {
          tenantId,
          name: modelConfig.name
        }
      },
      create: {
        tenantId,
        name: modelConfig.name,
        type: modelConfig.type,
        status: 'training',
        configuration: modelConfig.configuration,
        version: '1.0',
        isActive: modelConfig.isActive
      },
      update: {
        configuration: modelConfig.configuration,
        isActive: modelConfig.isActive
      }
    });
  }
}