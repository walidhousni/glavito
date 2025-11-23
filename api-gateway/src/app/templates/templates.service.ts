import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface ApplyTemplateOptions {
  tenantId: string;
  templateId: string;
  userId?: string;
  customizations?: Record<string, unknown>;
  applyCustomFields?: boolean;
  applyWorkflows?: boolean;
  applySLA?: boolean;
  applyRouting?: boolean;
  applyDashboards?: boolean;
  applyAnalytics?: boolean;
  applyPipelines?: boolean;
  applyAutomations?: boolean;
  applyIntegrations?: boolean;
  applyPortalTheme?: boolean;
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * List all available industry templates
   */
  async listTemplates(filter?: { industry?: string; isActive?: boolean }) {
    const where: any = {};
    
    if (filter?.industry) {
      where.industry = filter.industry;
    }
    
    if (filter?.isActive !== undefined) {
      where.isActive = filter.isActive;
    }

    return this.db.industryTemplate.findMany({
      where,
      orderBy: [
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ],
      include: {
        _count: {
          select: { applications: true }
        }
      }
    });
  }

  /**
   * Get a specific template by ID
   */
  async getTemplate(templateId: string) {
    const template = await this.db.industryTemplate.findUnique({
      where: { id: templateId },
      include: {
        _count: {
          select: { applications: true }
        }
      }
    });

    if (!template) {
      throw new NotFoundException(`Template ${templateId} not found`);
    }

    return template;
  }

  /**
   * Get templates for a specific industry
   */
  async getTemplatesByIndustry(industry: string) {
    return this.db.industryTemplate.findMany({
      where: {
        industry,
        isActive: true
      },
      orderBy: { usageCount: 'desc' },
      include: {
        _count: {
          select: { applications: true }
        }
      }
    });
  }

  /**
   * Apply an industry template to a tenant
   */
  async applyTemplate(options: ApplyTemplateOptions) {
    const { tenantId, templateId, userId, customizations = {} } = options;

    // Get the template
    const template = await this.getTemplate(templateId);

    // Check if template was already applied
    const existing = await this.db.industryTemplateApplication.findFirst({
      where: { tenantId, templateId }
    });

    if (existing) {
      this.logger.warn(`Template ${templateId} already applied to tenant ${tenantId}`);
      return existing;
    }

    // Apply different components based on options
    const results = {
      customFields: 0,
      workflows: 0,
      slaTemplates: 0,
      routingRules: 0,
      dashboards: 0,
      analytics: 0,
      pipelines: 0,
      automations: 0,
      integrations: 0,
      portalTheme: false,
    };

    try {
      // Apply custom fields
      if (options.applyCustomFields !== false && template.customFieldsSchema) {
        results.customFields = await this.applyCustomFields(
          tenantId,
          template.customFieldsSchema as any
        );
      }

      // Apply workflows
      if (options.applyWorkflows !== false && template.workflowTemplates) {
        results.workflows = await this.applyWorkflows(
          tenantId,
          template.workflowTemplates as any
        );
      }

      // Apply SLA templates
      if (options.applySLA !== false && template.slaTemplates) {
        results.slaTemplates = await this.applySLATemplates(
          tenantId,
          template.slaTemplates as any
        );
      }

      // Apply routing rules
      if (options.applyRouting !== false && template.routingRules) {
        results.routingRules = await this.applyRoutingRules(
          tenantId,
          template.routingRules as any
        );
      }

      // Apply dashboard layouts
      if (options.applyDashboards !== false && template.dashboardLayouts) {
        results.dashboards = await this.applyDashboardLayouts(
          tenantId,
          template.dashboardLayouts as any
        );
      }

      // Apply analytics presets
      if (options.applyAnalytics !== false && template.analyticsPresets) {
        results.analytics = await this.applyAnalyticsPresets(
          tenantId,
          template.analyticsPresets as any
        );
      }

      // Apply CRM pipeline stages
      if (options.applyPipelines !== false && template.pipelineStages) {
        results.pipelines = await this.applyPipelineStages(
          tenantId,
          template.pipelineStages as any
        );
      }

      // Apply automation recipes
      if (options.applyAutomations !== false && template.automationRecipes) {
        results.automations = await this.applyAutomationRecipes(
          tenantId,
          template.automationRecipes as any
        );
      }

      // Apply portal theme
      if (options.applyPortalTheme !== false && template.portalTheme) {
        results.portalTheme = await this.applyPortalTheme(
          tenantId,
          template.portalTheme as any
        );
      }

      // Create application record
      const application = await this.db.industryTemplateApplication.create({
        data: {
          tenantId,
          templateId,
          appliedBy: userId,
          customizations: customizations as any,
          status: 'active'
        }
      });

      // Update template usage count
      await this.db.industryTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      });

      // Update tenant industry profile
      await this.updateTenantIndustryProfile(tenantId, template.industry);

      this.logger.log(
        `Applied template ${templateId} to tenant ${tenantId}. Results: ${JSON.stringify(results)}`
      );

      return {
        application,
        results
      };
    } catch (error) {
      this.logger.error(`Failed to apply template ${templateId}: ${error}`);
      throw error;
    }
  }

  /**
   * Apply custom fields from template
   */
  private async applyCustomFields(
    tenantId: string,
    schema: Record<string, any[]>
  ): Promise<number> {
    let count = 0;

    for (const [entity, fields] of Object.entries(schema)) {
      for (const field of fields || []) {
        try {
          await this.db.customFieldDefinition.create({
            data: {
              tenantId,
              entity,
              ...field,
            }
          });
          count++;
        } catch (error) {
          this.logger.warn(`Failed to create custom field ${field.name}: ${error}`);
        }
      }
    }

    return count;
  }

  /**
   * Apply workflow templates
   */
  private async applyWorkflows(
    tenantId: string,
    workflows: any[]
  ): Promise<number> {
    let count = 0;

    for (const workflow of workflows) {
      try {
        // Create workflow from template
        await this.db.workflowRule.create({
          data: {
            tenantId,
            name: workflow.name,
            description: workflow.description,
            type: workflow.type || 'automation',
            conditions: workflow.conditions || [],
            actions: workflow.actions || [],
            triggers: workflow.triggers || [],
            isActive: workflow.isActive ?? true,
            priority: workflow.priority ?? 0,
            metadata: workflow.metadata || {}
          }
        });
        count++;
      } catch (error) {
        this.logger.warn(`Failed to create workflow ${workflow.name}: ${error}`);
      }
    }

    return count;
  }

  /**
   * Apply SLA templates
   */
  private async applySLATemplates(
    tenantId: string,
    templates: any[]
  ): Promise<number> {
    let count = 0;

    for (const sla of templates) {
      try {
        await this.db.sLAPolicy.create({
          data: {
            tenantId,
            name: sla.name,
            description: sla.description,
            priority: sla.priority || 'medium',
            isActive: sla.isActive ?? true,
            conditions: sla.conditions || [],
            targets: sla.targets || {},
            businessHours: sla.businessHours,
            holidays: sla.holidays || [],
            escalationRules: sla.escalationRules || [],
            notifications: sla.notifications || [],
            metadata: sla.metadata || {}
          }
        });
        count++;
      } catch (error) {
        this.logger.warn(`Failed to create SLA policy ${sla.name}: ${error}`);
      }
    }

    return count;
  }

  /**
   * Apply routing rules
   */
  private async applyRoutingRules(
    tenantId: string,
    rules: Record<string, any>
  ): Promise<number> {
    let count = 0;

    // Apply default routing strategy
    if (rules.defaultStrategy) {
      try {
        await this.db.routingStrategy.create({
          data: {
            tenantId,
            name: rules.defaultStrategy.name || 'Default Routing',
            description: rules.defaultStrategy.description,
            strategy: rules.defaultStrategy.strategy || 'skill-based',
            configuration: rules.defaultStrategy.configuration || {},
            conditions: rules.defaultStrategy.conditions || [],
            priority: rules.defaultStrategy.priority ?? 0,
            isActive: true,
            isDefault: true
          }
        });
        count++;
      } catch (error) {
        this.logger.warn(`Failed to create routing strategy: ${error}`);
      }
    }

    // Apply additional routing rules
    if (rules.additionalRules && Array.isArray(rules.additionalRules)) {
      for (const rule of rules.additionalRules) {
        try {
          await this.db.routingRule.create({
            data: {
              tenantId,
              name: rule.name,
              description: rule.description,
              priority: rule.priority ?? 0,
              conditions: rule.conditions || [],
              actions: rule.actions || [],
              isActive: rule.isActive ?? true
            }
          });
          count++;
        } catch (error) {
          this.logger.warn(`Failed to create routing rule ${rule.name}: ${error}`);
        }
      }
    }

    return count;
  }

  /**
   * Apply dashboard layouts
   */
  private async applyDashboardLayouts(
    tenantId: string,
    layouts: Record<string, any>
  ): Promise<number> {
    // Store dashboard layouts in tenant settings for now
    // TODO: Create dedicated dashboard configuration system
    try {
      await this.db.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            dashboardLayouts: layouts
          } as any
        }
      });
      return 1;
    } catch (error) {
      this.logger.warn(`Failed to apply dashboard layouts: ${error}`);
      return 0;
    }
  }

  /**
   * Apply analytics presets
   */
  private async applyAnalyticsPresets(
    tenantId: string,
    presets: any[]
  ): Promise<number> {
    let count = 0;

    for (const preset of presets) {
      try {
        await this.db.analyticsReportTemplate.create({
          data: {
            tenantId,
            name: preset.name,
            category: preset.category,
            definition: preset.definition || {},
            isActive: preset.isActive ?? true
          }
        });
        count++;
      } catch (error) {
        this.logger.warn(`Failed to create analytics preset ${preset.name}: ${error}`);
      }
    }

    return count;
  }

  /**
   * Apply CRM pipeline stages
   */
  private async applyPipelineStages(
    tenantId: string,
    pipelines: Record<string, any>
  ): Promise<number> {
    let count = 0;

    // Apply default pipeline for leads
    if (pipelines.leads) {
      try {
        await this.db.salesPipeline.create({
          data: {
            tenantId,
            name: pipelines.leads.name || 'Lead Pipeline',
            description: pipelines.leads.description,
            stages: pipelines.leads.stages || [],
            isDefault: true,
            isActive: true
          }
        });
        count++;
      } catch (error) {
        this.logger.warn(`Failed to create lead pipeline: ${error}`);
      }
    }

    // Apply default pipeline for deals
    if (pipelines.deals) {
      try {
        await this.db.salesPipeline.create({
          data: {
            tenantId,
            name: pipelines.deals.name || 'Sales Pipeline',
            description: pipelines.deals.description,
            stages: pipelines.deals.stages || [],
            isDefault: true,
            isActive: true
          }
        });
        count++;
      } catch (error) {
        this.logger.warn(`Failed to create sales pipeline: ${error}`);
      }
    }

    return count;
  }

  /**
   * Apply automation recipes
   */
  private async applyAutomationRecipes(
    tenantId: string,
    recipes: any[]
  ): Promise<number> {
    // Automation recipes are similar to workflows
    return this.applyWorkflows(tenantId, recipes);
  }

  /**
   * Apply portal theme
   */
  private async applyPortalTheme(
    tenantId: string,
    theme: Record<string, any>
  ): Promise<boolean> {
    try {
      // Check if customer portal exists
      const portal = await this.db.customerPortal.findUnique({
        where: { tenantId }
      });

      if (portal) {
        // Update existing portal with theme
        await this.db.customerPortal.update({
          where: { tenantId },
          data: {
            branding: theme.branding || {},
            customization: theme.customization || {}
          }
        });
      }

      return true;
    } catch (error) {
      this.logger.warn(`Failed to apply portal theme: ${error}`);
      return false;
    }
  }

  /**
   * Update tenant industry profile
   */
  private async updateTenantIndustryProfile(tenantId: string, industry: string) {
    try {
      await this.db.tenantIndustryProfile.upsert({
        where: { tenantId },
        create: {
          tenantId,
          primaryIndustry: industry
        },
        update: {
          primaryIndustry: industry
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to update tenant industry profile: ${error}`);
    }
  }

  /**
   * Get applied templates for a tenant
   */
  async getAppliedTemplates(tenantId: string) {
    return this.db.industryTemplateApplication.findMany({
      where: { tenantId },
      include: {
        template: true
      },
      orderBy: { appliedAt: 'desc' }
    });
  }

  /**
   * Get tenant industry profile
   */
  async getTenantIndustryProfile(tenantId: string) {
    return this.db.tenantIndustryProfile.findUnique({
      where: { tenantId }
    });
  }

  /**
   * Update tenant industry profile
   */
  async updateIndustryProfile(
    tenantId: string,
    data: {
      primaryIndustry?: string;
      subIndustries?: string[];
      companySize?: string;
      region?: string;
      customizations?: Record<string, any>;
    }
  ) {
    return this.db.tenantIndustryProfile.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...data,
        customizations: data.customizations as any
      },
      update: {
        ...data,
        customizations: data.customizations as any
      }
    });
  }
}

