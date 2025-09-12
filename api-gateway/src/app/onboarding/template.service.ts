/**
 * Template Management Service
 * Handles industry-specific onboarding templates and smart defaults
 */

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface OnboardingTemplate {
  id: string;
  name: string;
  description: string;
  industry: string;
  category: 'complete' | 'workflow' | 'faq' | 'email' | 'dashboard' | 'survey';
  version: string;
  isPublic: boolean;
  isOfficial: boolean;
  tags: string[];
  configuration: TemplateConfiguration;
  metadata: TemplateMetadata;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  usageCount: number;
  rating: number;
  reviews: TemplateReview[];
}

export interface TemplateConfiguration {
  organizationSetup?: OrganizationTemplate;
  channelIntegration?: ChannelTemplate;
  teamManagement?: TeamTemplate;
  workflowRules?: WorkflowTemplate;
  knowledgeBase?: KnowledgeBaseTemplate;
  customerPortal?: PortalTemplate;
  aiAutomation?: AITemplate;
  analytics?: AnalyticsTemplate;
  customFields?: CustomFieldTemplate[];
}

export interface OrganizationTemplate {
  requiredFields: string[];
  optionalFields: string[];
  defaultValues: Record<string, any>;
  branding: {
    colorScheme: string[];
    logoGuidelines: string;
    fontRecommendations: string[];
  };
  businessHours: {
    timezone: string;
    workingDays: number[];
    workingHours: { start: string; end: string };
    holidays: string[];
  };
}

export interface ChannelTemplate {
  recommendedChannels: string[];
  channelPriority: Record<string, number>;
  integrationSteps: Array<{
    channel: string;
    steps: string[];
    estimatedTime: number;
  }>;
  defaultSettings: Record<string, any>;
}

export interface TeamTemplate {
  roles: Array<{
    name: string;
    permissions: string[];
    description: string;
    isRequired: boolean;
  }>;
  teamStructure: {
    minSize: number;
    maxSize: number;
    recommendedSize: number;
    hierarchy: string[];
  };
  skillRequirements: Array<{
    skill: string;
    level: 'beginner' | 'intermediate' | 'advanced';
    isRequired: boolean;
  }>;
}

export interface WorkflowTemplate {
  rules: Array<{
    name: string;
    description: string;
    conditions: Record<string, any>;
    actions: Record<string, any>;
    priority: number;
    isActive: boolean;
  }>;
  slaRules: Array<{
    name: string;
    conditions: Record<string, any>;
    responseTime: number;
    resolutionTime: number;
    escalationRules: Array<{
      level: number;
      timeThreshold: number;
      assignTo: string;
    }>;
  }>;
  categories: string[];
  priorities: string[];
  statuses: string[];
}

export interface KnowledgeBaseTemplate {
  categories: Array<{
    name: string;
    description: string;
    icon: string;
    order: number;
  }>;
  articles: Array<{
    title: string;
    content: string;
    category: string;
    tags: string[];
    isPublished: boolean;
    order: number;
  }>;
  faqs: Array<{
    question: string;
    answer: string;
    category: string;
    order: number;
  }>;
  searchKeywords: string[];
}

export interface PortalTemplate {
  theme: {
    primaryColor: string;
    secondaryColor: string;
    fontFamily: string;
    layout: 'modern' | 'classic' | 'minimal';
  };
  features: Array<{
    name: string;
    enabled: boolean;
    configuration: Record<string, any>;
  }>;
  pages: Array<{
    name: string;
    path: string;
    content: string;
    isPublic: boolean;
  }>;
  customization: {
    logo: string;
    favicon: string;
    customCSS: string;
    customJS: string;
  };
}

export interface AITemplate {
  automationRules: Array<{
    name: string;
    trigger: string;
    conditions: Record<string, any>;
    actions: Record<string, any>;
    confidence: number;
  }>;
  chatbotConfig: {
    personality: string;
    responseStyle: 'formal' | 'casual' | 'friendly';
    fallbackMessages: string[];
    escalationTriggers: string[];
  };
  classificationRules: Array<{
    category: string;
    keywords: string[];
    confidence: number;
    actions: string[];
  }>;
}

export interface AnalyticsTemplate {
  dashboards: Array<{
    name: string;
    widgets: Array<{
      type: string;
      title: string;
      config: Record<string, any>;
    }>;
  }>;
  kpis: Array<{
    name: string;
    description: string;
    formula: string;
    target: number;
    unit: string;
  }>;
  reports: Array<{
    name: string;
    type: string;
    schedule: string;
    recipients: string[];
  }>;
}

export interface CustomFieldTemplate {
  name: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'multiselect' | 'date';
  label: string;
  description?: string;
  required: boolean;
  options?: string[];
  defaultValue?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export interface TemplateMetadata {
  industry: string;
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedSetupTime: number; // minutes
  prerequisites: string[];
  supportedFeatures: string[];
  integrations: string[];
  languages: string[];
  screenshots: string[];
  documentation: string;
  changelog: Array<{
    version: string;
    date: Date;
    changes: string[];
  }>;
}

export interface TemplateReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  pros: string[];
  cons: string[];
  createdAt: Date;
}

export interface TemplateFilter {
  industry?: string;
  category?: string;
  companySize?: string;
  complexity?: string;
  tags?: string[];
  rating?: number;
  isOfficial?: boolean;
  isPublic?: boolean;
}

export interface SmartRecommendation {
  templateId: string;
  confidence: number;
  reasons: string[];
  estimatedBenefit: string;
  customizations: Array<{
    field: string;
    suggestedValue: any;
    reason: string;
  }>;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Get all available templates
   */
  async getTemplates(filter?: TemplateFilter): Promise<OnboardingTemplate[]> {
    try {
      this.logger.log('Fetching onboarding templates');

      // In a real implementation, this would query the database
      const templates = await this.loadTemplatesFromDatabase(filter);
      
      return templates;
    } catch (error) {
      this.logger.error(`Failed to get templates: ${(error as Error).message}`);
      throw new BadRequestException('Failed to get templates');
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<OnboardingTemplate> {
    try {
      const template = await this.loadTemplateFromDatabase(templateId);
      
      if (!template) {
        throw new NotFoundException('Template not found');
      }

      return template;
    } catch (error) {
      this.logger.error(`Failed to get template: ${(error as Error).message}`);
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to get template');
    }
  }

  /**
   * Create custom template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    templateData: Partial<OnboardingTemplate>
  ): Promise<OnboardingTemplate> {
    try {
      this.logger.log(`Creating template for tenant: ${tenantId}`);

      const template: OnboardingTemplate = {
        id: `template-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: templateData.name || 'Custom Template',
        description: templateData.description || '',
        industry: templateData.industry || 'general',
        category: templateData.category || 'complete',
        version: '1.0.0',
        isPublic: templateData.isPublic || false,
        isOfficial: false,
        tags: templateData.tags || [],
        configuration: templateData.configuration || {},
        metadata: templateData.metadata || this.getDefaultMetadata(),
        createdBy: userId,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0,
        rating: 0,
        reviews: [],
      };

      await this.saveTemplateToDatabase(template);

      this.eventEmitter.emit('template.created', {
        templateId: template.id,
        tenantId,
        userId,
      });

      return template;
    } catch (error) {
      this.logger.error(`Failed to create template: ${(error as Error).message}`);
      throw new BadRequestException('Failed to create template');
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    templateId: string,
    userId: string,
    updates: Partial<OnboardingTemplate>
  ): Promise<OnboardingTemplate> {
    try {
      const template = await this.getTemplate(templateId);
      
      // Check if user can update this template
      if (template.createdBy !== userId && !template.isPublic) {
        throw new BadRequestException('Not authorized to update this template');
      }

      const updatedTemplate = {
        ...template,
        ...updates,
        updatedAt: new Date(),
        version: this.incrementVersion(template.version),
      };

      await this.saveTemplateToDatabase(updatedTemplate);

      this.eventEmitter.emit('template.updated', {
        templateId,
        userId,
        changes: Object.keys(updates),
      });

      return updatedTemplate;
    } catch (error) {
      this.logger.error(`Failed to update template: ${(error as Error).message}`);
      throw new BadRequestException('Failed to update template');
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string, userId: string): Promise<void> {
    try {
      const template = await this.getTemplate(templateId);
      
      // Check if user can delete this template
      if (template.createdBy !== userId) {
        throw new BadRequestException('Not authorized to delete this template');
      }

      await this.removeTemplateFromDatabase(templateId);

      this.eventEmitter.emit('template.deleted', {
        templateId,
        userId,
      });

      this.logger.log(`Template deleted: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to delete template: ${(error as Error).message}`);
      throw new BadRequestException('Failed to delete template');
    }
  }

  /**
   * Apply template to tenant
   */
  async applyTemplate(
    tenantId: string,
    templateId: string,
    customizations?: Record<string, any>
  ): Promise<void> {
    try {
      this.logger.log(`Applying template ${templateId} to tenant: ${tenantId}`);

      const template = await this.getTemplate(templateId);
      const config = template.configuration;

      // Apply organization setup
      if (config.organizationSetup) {
        await this.applyOrganizationTemplate(tenantId, config.organizationSetup, customizations);
      }

      // Apply channel integration
      if (config.channelIntegration) {
        await this.applyChannelTemplate(tenantId, config.channelIntegration, customizations);
      }

      // Apply team management
      if (config.teamManagement) {
        await this.applyTeamTemplate(tenantId, config.teamManagement, customizations);
      }

      // Apply workflow rules
      if (config.workflowRules) {
        await this.applyWorkflowTemplate(tenantId, config.workflowRules, customizations);
      }

      // Apply knowledge base
      if (config.knowledgeBase) {
        await this.applyKnowledgeBaseTemplate(tenantId, config.knowledgeBase, customizations);
      }

      // Apply customer portal
      if (config.customerPortal) {
        await this.applyPortalTemplate(tenantId, config.customerPortal, customizations);
      }

      // Apply AI automation
      if (config.aiAutomation) {
        await this.applyAITemplate(tenantId, config.aiAutomation, customizations);
      }

      // Apply analytics
      if (config.analytics) {
        await this.applyAnalyticsTemplate(tenantId, config.analytics, customizations);
      }

      // Update usage count
      template.usageCount++;
      await this.saveTemplateToDatabase(template);

      this.eventEmitter.emit('template.applied', {
        templateId,
        tenantId,
        customizations,
      });

      this.logger.log(`Template applied successfully: ${templateId}`);
    } catch (error) {
      this.logger.error(`Failed to apply template: ${(error as Error).message}`);
      throw new BadRequestException('Failed to apply template');
    }
  }

  /**
   * Get smart recommendations for tenant
   */
  async getSmartRecommendations(
    tenantId: string,
    context: {
      industry?: string;
      companySize?: string;
      useCase?: string;
      existingTools?: string[];
    }
  ): Promise<SmartRecommendation[]> {
    try {
      this.logger.log(`Getting smart recommendations for tenant: ${tenantId}`);

      const templates = await this.getTemplates({
        industry: context.industry,
        companySize: context.companySize,
        isPublic: true,
      });

      const recommendations: SmartRecommendation[] = [];

      for (const template of templates) {
        const confidence = this.calculateRecommendationConfidence(template, context);
        
        if (confidence > 0.5) {
          const reasons = this.generateRecommendationReasons(template, context);
          const customizations = await this.generateSmartCustomizations(template, context);

          recommendations.push({
            templateId: template.id,
            confidence,
            reasons,
            estimatedBenefit: this.calculateEstimatedBenefit(template, context),
            customizations,
          });
        }
      }

      // Sort by confidence
      recommendations.sort((a, b) => b.confidence - a.confidence);

      return recommendations.slice(0, 5); // Return top 5 recommendations
    } catch (error) {
      this.logger.error(`Failed to get smart recommendations: ${(error as Error).message}`);
      throw new BadRequestException('Failed to get smart recommendations');
    }
  }

  /**
   * Get template categories
   */
  async getTemplateCategories(): Promise<Array<{ name: string; count: number; description: string }>> {
    try {
      return [
        {
          name: 'complete',
          count: 15,
          description: 'Complete onboarding templates with all components',
        },
        {
          name: 'workflow',
          count: 25,
          description: 'Workflow and automation rule templates',
        },
        {
          name: 'faq',
          count: 30,
          description: 'Knowledge base and FAQ templates',
        },
        {
          name: 'email',
          count: 20,
          description: 'Email notification and communication templates',
        },
        {
          name: 'dashboard',
          count: 12,
          description: 'Analytics dashboard and reporting templates',
        },
        {
          name: 'survey',
          count: 18,
          description: 'Customer satisfaction survey templates',
        },
      ];
    } catch (error) {
      this.logger.error(`Failed to get template categories: ${(error as Error).message}`);
      throw new BadRequestException('Failed to get template categories');
    }
  }

  /**
   * Get template industries
   */
  async getTemplateIndustries(): Promise<Array<{ name: string; count: number; description: string }>> {
    try {
      return [
        {
          name: 'technology',
          count: 35,
          description: 'Software, SaaS, and technology companies',
        },
        {
          name: 'ecommerce',
          count: 28,
          description: 'Online retail and e-commerce businesses',
        },
        {
          name: 'healthcare',
          count: 22,
          description: 'Healthcare providers and medical services',
        },
        {
          name: 'finance',
          count: 20,
          description: 'Financial services and fintech companies',
        },
        {
          name: 'education',
          count: 18,
          description: 'Educational institutions and EdTech',
        },
        {
          name: 'consulting',
          count: 15,
          description: 'Professional services and consulting firms',
        },
        {
          name: 'manufacturing',
          count: 12,
          description: 'Manufacturing and industrial companies',
        },
        {
          name: 'nonprofit',
          count: 10,
          description: 'Non-profit organizations and NGOs',
        },
      ];
    } catch (error) {
      this.logger.error(`Failed to get template industries: ${(error as Error).message}`);
      throw new BadRequestException('Failed to get template industries');
    }
  }

  /**
   * Add template review
   */
  async addTemplateReview(
    templateId: string,
    userId: string,
    userName: string,
    review: {
      rating: number;
      comment: string;
      pros: string[];
      cons: string[];
    }
  ): Promise<void> {
    try {
      const template = await this.getTemplate(templateId);
      
      const newReview: TemplateReview = {
        id: `review-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        userId,
        userName,
        rating: review.rating,
        comment: review.comment,
        pros: review.pros,
        cons: review.cons,
        createdAt: new Date(),
      };

      template.reviews.push(newReview);
      
      // Recalculate average rating
      const totalRating = template.reviews.reduce((sum, r) => sum + r.rating, 0);
      template.rating = totalRating / template.reviews.length;

      await this.saveTemplateToDatabase(template);

      this.eventEmitter.emit('template.reviewed', {
        templateId,
        userId,
        rating: review.rating,
      });
    } catch (error) {
      this.logger.error(`Failed to add template review: ${(error as Error).message}`);
      throw new BadRequestException('Failed to add template review');
    }
  }

  // Private helper methods

  private async loadTemplatesFromDatabase(filter?: TemplateFilter): Promise<OnboardingTemplate[]> {
    // In a real implementation, this would query the database
    // For now, return sample templates
    return this.getSampleTemplates().filter(template => {
      if (filter?.industry && template.industry !== filter.industry) return false;
      if (filter?.category && template.category !== filter.category) return false;
      if (filter?.isOfficial !== undefined && template.isOfficial !== filter.isOfficial) return false;
      if (filter?.isPublic !== undefined && template.isPublic !== filter.isPublic) return false;
      if (filter?.rating && template.rating < filter.rating) return false;
      if (filter?.tags && !filter.tags.some(tag => template.tags.includes(tag))) return false;
      return true;
    });
  }

  private async loadTemplateFromDatabase(templateId: string): Promise<OnboardingTemplate | null> {
    const templates = await this.loadTemplatesFromDatabase();
    return templates.find(t => t.id === templateId) || null;
  }

  private async saveTemplateToDatabase(template: OnboardingTemplate): Promise<void> {
    // In a real implementation, this would save to database
    this.logger.debug(`Saving template: ${template.id}`);
  }

  private async removeTemplateFromDatabase(templateId: string): Promise<void> {
    // In a real implementation, this would remove from database
    this.logger.debug(`Removing template: ${templateId}`);
  }

  private getSampleTemplates(): OnboardingTemplate[] {
    return [
      {
        id: 'tech-startup-complete',
        name: 'Tech Startup Complete',
        description: 'Complete onboarding template for technology startups',
        industry: 'technology',
        category: 'complete',
        version: '2.1.0',
        isPublic: true,
        isOfficial: true,
        tags: ['startup', 'saas', 'agile', 'modern'],
        configuration: {
          organizationSetup: {
            requiredFields: ['name', 'website', 'industry', 'size'],
            optionalFields: ['description', 'logo', 'address'],
            defaultValues: {
              industry: 'technology',
              timezone: 'UTC',
            },
            branding: {
              colorScheme: ['#3b82f6', '#1e40af', '#64748b'],
              logoGuidelines: 'Modern, clean logo preferred',
              fontRecommendations: ['Inter', 'Roboto', 'Open Sans'],
            },
            businessHours: {
              timezone: 'UTC',
              workingDays: [1, 2, 3, 4, 5],
              workingHours: { start: '09:00', end: '17:00' },
              holidays: [],
            },
          },
          channelIntegration: {
            recommendedChannels: ['email', 'slack', 'chat', 'api'],
            channelPriority: {
              email: 1,
              slack: 2,
              chat: 3,
              api: 4,
            },
            integrationSteps: [
              {
                channel: 'email',
                steps: ['Configure SMTP', 'Set up templates', 'Test delivery'],
                estimatedTime: 15,
              },
              {
                channel: 'slack',
                steps: ['Install Slack app', 'Configure webhooks', 'Test notifications'],
                estimatedTime: 10,
              },
            ],
            defaultSettings: {
              autoResponse: true,
              businessHoursOnly: false,
            },
          },
          workflowRules: {
            rules: [
              {
                name: 'Auto-assign to available agent',
                description: 'Automatically assign new tickets to available agents',
                conditions: { status: 'new', priority: 'medium' },
                actions: { assign: 'auto', notify: true },
                priority: 1,
                isActive: true,
              },
              {
                name: 'Escalate high priority tickets',
                description: 'Escalate high priority tickets after 1 hour',
                conditions: { priority: 'high', responseTime: '>60' },
                actions: { escalate: 'supervisor', notify: true },
                priority: 2,
                isActive: true,
              },
            ],
            slaRules: [
              {
                name: 'Standard SLA',
                conditions: { priority: 'medium' },
                responseTime: 120, // 2 hours
                resolutionTime: 1440, // 24 hours
                escalationRules: [
                  {
                    level: 1,
                    timeThreshold: 60,
                    assignTo: 'senior-agent',
                  },
                  {
                    level: 2,
                    timeThreshold: 120,
                    assignTo: 'supervisor',
                  },
                ],
              },
            ],
            categories: ['Technical', 'Billing', 'General', 'Feature Request'],
            priorities: ['Low', 'Medium', 'High', 'Urgent'],
            statuses: ['New', 'Open', 'Pending', 'Resolved', 'Closed'],
          },
          knowledgeBase: {
            categories: [
              {
                name: 'Getting Started',
                description: 'Basic setup and configuration guides',
                icon: 'rocket',
                order: 1,
              },
              {
                name: 'Troubleshooting',
                description: 'Common issues and solutions',
                icon: 'wrench',
                order: 2,
              },
              {
                name: 'API Documentation',
                description: 'Developer resources and API guides',
                icon: 'code',
                order: 3,
              },
            ],
            articles: [
              {
                title: 'Quick Start Guide',
                content: 'Welcome to our platform! This guide will help you get started...',
                category: 'Getting Started',
                tags: ['setup', 'beginner', 'guide'],
                isPublished: true,
                order: 1,
              },
              {
                title: 'API Authentication',
                content: 'Learn how to authenticate with our API...',
                category: 'API Documentation',
                tags: ['api', 'auth', 'developer'],
                isPublished: true,
                order: 1,
              },
            ],
            faqs: [
              {
                question: 'How do I reset my password?',
                answer: 'You can reset your password by clicking the "Forgot Password" link...',
                category: 'Getting Started',
                order: 1,
              },
              {
                question: 'What are the API rate limits?',
                answer: 'Our API has the following rate limits...',
                category: 'API Documentation',
                order: 1,
              },
            ],
            searchKeywords: ['setup', 'api', 'authentication', 'troubleshooting'],
          },
        },
        metadata: {
          industry: 'technology',
          companySize: 'startup',
          complexity: 'moderate',
          estimatedSetupTime: 45,
          prerequisites: ['Admin access', 'Email configuration'],
          supportedFeatures: ['Multi-channel', 'Automation', 'Analytics', 'API'],
          integrations: ['Slack', 'GitHub', 'Stripe', 'Google Analytics'],
          languages: ['en', 'es', 'fr'],
          screenshots: ['/templates/tech-startup/screenshot1.png'],
          documentation: '/docs/templates/tech-startup',
          changelog: [
            {
              version: '2.1.0',
              date: new Date('2024-01-15'),
              changes: ['Added Slack integration', 'Improved workflow rules'],
            },
            {
              version: '2.0.0',
              date: new Date('2023-12-01'),
              changes: ['Major redesign', 'New analytics dashboard'],
            },
          ],
        },
        createdBy: 'system',
        createdAt: new Date('2023-10-01'),
        updatedAt: new Date('2024-01-15'),
        usageCount: 1247,
        rating: 4.7,
        reviews: [
          {
            id: 'review-1',
            userId: 'user-1',
            userName: 'John Doe',
            rating: 5,
            comment: 'Excellent template! Saved us hours of setup time.',
            pros: ['Easy to use', 'Comprehensive', 'Great documentation'],
            cons: ['Could use more customization options'],
            createdAt: new Date('2024-01-10'),
          },
        ],
      },
      {
        id: 'ecommerce-standard',
        name: 'E-commerce Standard',
        description: 'Standard onboarding template for e-commerce businesses',
        industry: 'ecommerce',
        category: 'complete',
        version: '1.5.0',
        isPublic: true,
        isOfficial: true,
        tags: ['ecommerce', 'retail', 'orders', 'customers'],
        configuration: {
          organizationSetup: {
            requiredFields: ['name', 'website', 'currency', 'timezone'],
            optionalFields: ['logo', 'description', 'address', 'phone'],
            defaultValues: {
              industry: 'ecommerce',
              currency: 'USD',
            },
            branding: {
              colorScheme: ['#059669', '#10b981', '#6b7280'],
              logoGuidelines: 'Brand-focused, trustworthy design',
              fontRecommendations: ['Poppins', 'Nunito', 'Source Sans Pro'],
            },
            businessHours: {
              timezone: 'UTC',
              workingDays: [1, 2, 3, 4, 5, 6, 7], // 7 days a week
              workingHours: { start: '08:00', end: '20:00' },
              holidays: [],
            },
          },
          workflowRules: {
            rules: [
              {
                name: 'Order-related tickets priority',
                description: 'Prioritize tickets related to orders and payments',
                conditions: { category: 'orders', keywords: ['payment', 'refund', 'shipping'] },
                actions: { priority: 'high', assign: 'order-specialist' },
                priority: 1,
                isActive: true,
              },
            ],
            slaRules: [
              {
                name: 'High Priority Response',
                conditions: { priority: 'high' },
                responseTime: 60,
                resolutionTime: 240,
                escalationRules: [
                  {
                    level: 1,
                    timeThreshold: 30,
                    assignTo: 'supervisor',
                  },
                ],
              },
            ],
            categories: ['Orders', 'Shipping', 'Returns', 'Product Questions', 'Technical'],
            priorities: ['Low', 'Medium', 'High', 'Urgent'],
            statuses: ['New', 'Processing', 'Shipped', 'Delivered', 'Resolved'],
          },
          knowledgeBase: {
            categories: [
              {
                name: 'Order Management',
                description: 'How to manage orders and payments',
                icon: 'shopping-cart',
                order: 1,
              },
              {
                name: 'Shipping & Returns',
                description: 'Shipping policies and return procedures',
                icon: 'truck',
                order: 2,
              },
            ],
            faqs: [
              {
                question: 'How do I track my order?',
                answer: 'You can track your order using the tracking number...',
                category: 'Order Management',
                order: 1,
              },
              {
                question: 'What is your return policy?',
                answer: 'We accept returns within 30 days...',
                category: 'Shipping & Returns',
                order: 1,
              },
            ],
            articles: [],
            searchKeywords: ['order', 'shipping', 'return', 'refund', 'tracking'],
          },
        },
        metadata: {
          industry: 'ecommerce',
          companySize: 'medium',
          complexity: 'moderate',
          estimatedSetupTime: 35,
          prerequisites: ['E-commerce platform access', 'Payment gateway'],
          supportedFeatures: ['Order tracking', 'Multi-currency', 'Inventory sync'],
          integrations: ['Shopify', 'WooCommerce', 'Stripe', 'PayPal'],
          languages: ['en', 'es', 'fr', 'de'],
          screenshots: ['/templates/ecommerce/screenshot1.png'],
          documentation: '/docs/templates/ecommerce',
          changelog: [
            {
              version: '1.5.0',
              date: new Date('2024-01-01'),
              changes: ['Added multi-currency support', 'Improved order tracking'],
            },
          ],
        },
        createdBy: 'system',
        createdAt: new Date('2023-09-15'),
        updatedAt: new Date('2024-01-01'),
        usageCount: 892,
        rating: 4.5,
        reviews: [],
      },
    ];
  }

  private getDefaultMetadata(): TemplateMetadata {
    return {
      industry: 'general',
      companySize: 'medium',
      complexity: 'moderate',
      estimatedSetupTime: 30,
      prerequisites: [],
      supportedFeatures: [],
      integrations: [],
      languages: ['en'],
      screenshots: [],
      documentation: '',
      changelog: [],
    };
  }

  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  private calculateRecommendationConfidence(
    template: OnboardingTemplate,
    context: any
  ): number {
    let confidence = 0.5; // Base confidence

    // Industry match
    if (template.industry === context.industry) {
      confidence += 0.3;
    }

    // Company size match
    if (template.metadata.companySize === context.companySize) {
      confidence += 0.2;
    }

    // Rating boost
    if (template.rating > 4.0) {
      confidence += 0.1;
    }

    // Usage count boost
    if (template.usageCount > 100) {
      confidence += 0.1;
    }

    // Official template boost
    if (template.isOfficial) {
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  private generateRecommendationReasons(
    template: OnboardingTemplate,
    context: any
  ): string[] {
    const reasons: string[] = [];

    if (template.industry === context.industry) {
      reasons.push(`Designed specifically for ${context.industry} industry`);
    }

    if (template.metadata.companySize === context.companySize) {
      reasons.push(`Optimized for ${context.companySize} companies`);
    }

    if (template.rating > 4.0) {
      reasons.push(`Highly rated (${template.rating}/5.0) by users`);
    }

    if (template.usageCount > 100) {
      reasons.push(`Proven template used by ${template.usageCount}+ organizations`);
    }

    if (template.isOfficial) {
      reasons.push('Official template maintained by our team');
    }

    return reasons;
  }

  private async generateSmartCustomizations(
    template: OnboardingTemplate,
    context: any
  ): Promise<Array<{ field: string; suggestedValue: any; reason: string }>> {
    const customizations: Array<{ field: string; suggestedValue: any; reason: string }> = [];

    // Industry-specific customizations
    if (context.industry === 'ecommerce') {
      customizations.push({
        field: 'businessHours.workingDays',
        suggestedValue: [1, 2, 3, 4, 5, 6, 7],
        reason: 'E-commerce businesses typically operate 7 days a week',
      });
    }

    // Company size customizations
    if (context.companySize === 'startup') {
      customizations.push({
        field: 'teamManagement.teamStructure.recommendedSize',
        suggestedValue: 3,
        reason: 'Startups typically begin with smaller support teams',
      });
    }

    return customizations;
  }

  private calculateEstimatedBenefit(template: OnboardingTemplate, context: any): string {
    const setupTime = template.metadata.estimatedSetupTime;
    const manualSetupTime = setupTime * 3; // Assume manual setup takes 3x longer

    return `Save approximately ${manualSetupTime - setupTime} minutes of setup time`;
  }

  // Template application methods

  private async applyOrganizationTemplate(
    tenantId: string,
    orgTemplate: OrganizationTemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply organization template configuration
    this.logger.debug(`Applying organization template for tenant: ${tenantId}`);
  }

  private async applyChannelTemplate(
    tenantId: string,
    channelTemplate: ChannelTemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply channel template configuration
    this.logger.debug(`Applying channel template for tenant: ${tenantId}`);
  }

  private async applyTeamTemplate(
    tenantId: string,
    teamTemplate: TeamTemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply team template configuration
    this.logger.debug(`Applying team template for tenant: ${tenantId}`);
  }

  private async applyWorkflowTemplate(
    tenantId: string,
    workflowTemplate: WorkflowTemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply workflow template configuration
    this.logger.debug(`Applying workflow template for tenant: ${tenantId}`);
  }

  private async applyKnowledgeBaseTemplate(
    tenantId: string,
    kbTemplate: KnowledgeBaseTemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply knowledge base template configuration
    this.logger.debug(`Applying knowledge base template for tenant: ${tenantId}`);
  }

  private async applyPortalTemplate(
    tenantId: string,
    portalTemplate: PortalTemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply portal template configuration
    this.logger.debug(`Applying portal template for tenant: ${tenantId}`);
  }

  private async applyAITemplate(
    tenantId: string,
    aiTemplate: AITemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply AI template configuration
    this.logger.debug(`Applying AI template for tenant: ${tenantId}`);
  }

  private async applyAnalyticsTemplate(
    tenantId: string,
    analyticsTemplate: AnalyticsTemplate,
    customizations?: Record<string, any>
  ): Promise<void> {
    // Apply analytics template configuration
    this.logger.debug(`Applying analytics template for tenant: ${tenantId}`);
  }
}