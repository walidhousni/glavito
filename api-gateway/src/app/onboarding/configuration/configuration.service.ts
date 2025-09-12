import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import {
  BrandingConfig,
  ColorScheme,
  ChannelConfig,
  WhatsAppConfig,
  InstagramConfig,
  EmailConfig,
  AIFeatureConfig,
  WorkflowConfig,
  SLARule,
  EscalationPath,
} from '@glavito/shared-types';

@Injectable()
export class ConfigurationService {
  private readonly logger = new Logger(ConfigurationService.name);
  
  constructor(private readonly databaseService: DatabaseService) {}

  // Organization Configuration
  async updateOrganizationBranding(tenantId: string, branding: BrandingConfig): Promise<void> {
    await this.databaseService.tenant.update({
      where: { id: tenantId },
      data: {
        brandingConfig: branding as any,
        updatedAt: new Date(),
      },
    });
  }

  async uploadLogo(tenantId: string, logoFile: any): Promise<string> {
    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(logoFile.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.');
    }

    if (logoFile.size > maxSize) {
      throw new Error('File size too large. Maximum size is 2MB.');
    }

    // Generate unique filename
    const fileExtension = logoFile.originalname.split('.').pop();
    const fileName = `logo-${tenantId}-${Date.now()}.${fileExtension}`;
    
    // In a real implementation, upload to cloud storage (AWS S3, etc.)
    // For now, we'll simulate the upload
    const logoUrl = `https://storage.glavito.com/logos/${tenantId}/${fileName}`;
    
    // Get current branding config
    const currentTenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
      select: { brandingConfig: true },
    });

    const updatedBranding = {
      ...(currentTenant?.brandingConfig as any || {}),
      logoUrl,
    };

    await this.databaseService.tenant.update({
      where: { id: tenantId },
      data: {
        brandingConfig: updatedBranding,
        updatedAt: new Date(),
      },
    });

    return logoUrl;
  }

  async setColorScheme(tenantId: string, colors: ColorScheme): Promise<void> {
    const currentBranding = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
      select: { brandingConfig: true },
    });

    const updatedBranding = {
      ...(currentBranding?.brandingConfig as any || {}),
      primaryColor: colors.primary,
      secondaryColor: colors.secondary,
      accentColor: colors.accent,
    };

    await this.databaseService.tenant.update({
      where: { id: tenantId },
      data: {
        brandingConfig: updatedBranding,
        updatedAt: new Date(),
      },
    });
  }

  // Channel Configuration
  async configureWhatsApp(tenantId: string, config: WhatsAppConfig): Promise<{ status: string }> {
    try {
      // Validate required fields
      if (!config.businessAccountId || !config.accessToken || !config.phoneNumberId) {
        throw new Error('Missing required WhatsApp configuration fields');
      }

      // Test WhatsApp Business API connection
      const testResult = await this.testWhatsAppConnection(config);
      if (!testResult.success) {
        throw new Error(`WhatsApp connection failed: ${testResult.error}`);
      }

      // Set up webhook endpoint
      const webhookUrl = `${process.env.API_BASE_URL}/webhooks/whatsapp/${tenantId}`;
      const webhookResult = await this.setupWhatsAppWebhook(config, webhookUrl);
      
      if (!webhookResult.success) {
        console.warn('WhatsApp webhook setup failed, but connection is valid');
      }

      // Store configuration
      await this.databaseService.integrationStatus.upsert({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'whatsapp',
          },
        },
        update: {
          status: 'connected',
          configuration: config as any,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          healthCheckData: {
            lastCheckedAt: new Date(),
            isHealthy: true,
            responseTime: testResult.responseTime,
          },
        },
        create: {
          tenantId,
          integrationType: 'whatsapp',
          status: 'connected',
          configuration: config as any,
          lastSyncAt: new Date(),
          healthCheckData: {
            lastCheckedAt: new Date(),
            isHealthy: true,
            responseTime: testResult.responseTime,
          },
        },
      });

      return { status: 'connected' };
    } catch (error) {
      // Store error status
      await this.databaseService.integrationStatus.upsert({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'whatsapp',
          },
        },
        update: {
          status: 'error',
          errorMessage: (error as Error).message,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          integrationType: 'whatsapp',
          status: 'error',
          configuration: config as any,
          errorMessage: (error as Error).message,
        },
      });

      throw error;
    }
  }

  private async testWhatsAppConnection(config: WhatsAppConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      // Mock WhatsApp API call - in real implementation, make actual API call
      // const response = await fetch(`https://graph.facebook.com/v18.0/${config.businessAccountId}`, {
      //   headers: { Authorization: `Bearer ${config.accessToken}` }
      // });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const responseTime = Date.now() - startTime;
      
      // Mock successful response
      return { success: true, responseTime };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private async setupWhatsAppWebhook(config: WhatsAppConfig, webhookUrl: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Mock webhook setup - in real implementation, configure WhatsApp webhook
      // const response = await fetch(`https://graph.facebook.com/v18.0/${config.businessAccountId}/subscribed_apps`, {
      //   method: 'POST',
      //   headers: { Authorization: `Bearer ${config.accessToken}` },
      //   body: JSON.stringify({ callback_url: webhookUrl, verify_token: config.webhookVerifyToken })
      // });
      
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async configureInstagram(tenantId: string, config: InstagramConfig): Promise<{ status: string }> {
    try {
      // Validate required fields
      if (!config.businessAccountId || !config.accessToken || !config.pageId) {
        throw new Error('Missing required Instagram configuration fields');
      }

      // Test Instagram Graph API connection
      const testResult = await this.testInstagramConnection(config);
      if (!testResult.success) {
        throw new Error(`Instagram connection failed: ${testResult.error}`);
      }

      // Store configuration
      await this.databaseService.integrationStatus.upsert({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'instagram',
          },
        },
        update: {
          status: 'connected',
          configuration: config as any,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          healthCheckData: {
            lastCheckedAt: new Date(),
            isHealthy: true,
            responseTime: testResult.responseTime,
          },
        },
        create: {
          tenantId,
          integrationType: 'instagram',
          status: 'connected',
          configuration: config as any,
          lastSyncAt: new Date(),
          healthCheckData: {
            lastCheckedAt: new Date(),
            isHealthy: true,
            responseTime: testResult.responseTime,
          },
        },
      });

      return { status: 'connected' };
    } catch (error) {
      // Store error status
      await this.databaseService.integrationStatus.upsert({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'instagram',
          },
        },
        update: {
          status: 'error',
          errorMessage: (error as Error).message,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          integrationType: 'instagram',
          status: 'error',
          configuration: config as any,
          errorMessage: (error as Error).message,
        },
      });

      throw error;
    }
  }

  private async testInstagramConnection(config: InstagramConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      // Mock Instagram API call - in real implementation, make actual API call
      // const response = await fetch(`https://graph.facebook.com/v18.0/${config.businessAccountId}`, {
      //   headers: { Authorization: `Bearer ${config.accessToken}` }
      // });
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const responseTime = Date.now() - startTime;
      
      // Mock successful response
      return { success: true, responseTime };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  async configureEmail(tenantId: string, config: EmailConfig): Promise<{ status: string }> {
    try {
      // Validate configuration based on provider
      if (config.provider === 'custom') {
        if (!config.imapConfig?.host || !config.smtpConfig?.host) {
          throw new Error('IMAP and SMTP configuration required for custom provider');
        }
        if (!config.imapConfig?.username || !config.imapConfig?.password) {
          throw new Error('Email credentials are required');
        }
      }

      // Test email connection
      const testResult = await this.testEmailConnection(config);
      if (!testResult.success) {
        throw new Error(`Email connection failed: ${testResult.error}`);
      }

      // Store configuration (encrypt sensitive data)
      const sanitizedConfig = this.sanitizeEmailConfig(config);
      
      await this.databaseService.integrationStatus.upsert({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'email',
          },
        },
        update: {
          status: 'connected',
          configuration: sanitizedConfig as any,
          lastSyncAt: new Date(),
          updatedAt: new Date(),
          healthCheckData: {
            lastCheckedAt: new Date(),
            isHealthy: true,
            responseTime: testResult.responseTime,
          },
        },
        create: {
          tenantId,
          integrationType: 'email',
          status: 'connected',
          configuration: sanitizedConfig as any,
          lastSyncAt: new Date(),
          healthCheckData: {
            lastCheckedAt: new Date(),
            isHealthy: true,
            responseTime: testResult.responseTime,
          },
        },
      });

      return { status: 'connected' };
    } catch (error) {
      // Store error status
      await this.databaseService.integrationStatus.upsert({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: 'email',
          },
        },
        update: {
          status: 'error',
          errorMessage: (error as Error).message,
          updatedAt: new Date(),
        },
        create: {
          tenantId,
          integrationType: 'email',
          status: 'error',
          configuration: this.sanitizeEmailConfig(config) as any,
          errorMessage: (error as Error).message,
        },
      });

      throw error;
    }
  }

  private async testEmailConnection(config: EmailConfig): Promise<{ success: boolean; error?: string; responseTime?: number }> {
    const startTime = Date.now();
    
    try {
      if (config.provider === 'custom' && config.imapConfig) {
        // Mock IMAP connection test
        // In real implementation, use nodemailer or similar to test connection
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const responseTime = Date.now() - startTime;
        return { success: true, responseTime };
      } else {
        // For Gmail/Outlook, test OAuth or app password
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const responseTime = Date.now() - startTime;
        return { success: true, responseTime };
      }
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  }

  private sanitizeEmailConfig(config: EmailConfig): unknown {
    // Remove sensitive data before storing
    const sanitized = { ...config };
    
    if (sanitized.imapConfig) {
      sanitized.imapConfig = {
        ...sanitized.imapConfig,
        password: '***ENCRYPTED***', // In real implementation, encrypt the password
      };
    }
    
    if (sanitized.smtpConfig) {
      sanitized.smtpConfig = {
        ...sanitized.smtpConfig,
        password: '***ENCRYPTED***', // In real implementation, encrypt the password
      };
    }
    
    return sanitized;
  }

  async testChannelConnection(tenantId: string, channelType: string): Promise<{ success: boolean; message: string }> {
    try {
      // Get the integration status for the channel
      const integration = await this.databaseService.integrationStatus.findUnique({
        where: {
          tenantId_integrationType: {
            tenantId,
            integrationType: channelType,
          },
        },
      });

      if (!integration) {
        return { success: false, message: `${channelType} channel not configured` };
      }

      if (integration.status !== 'connected') {
        return { success: false, message: `${channelType} channel is not connected` };
      }

      // Perform basic health check based on channel type
      let testResult: { success: boolean; error?: string };
      
      switch (channelType) {
        case 'whatsapp':
          testResult = await this.testWhatsAppConnection(integration.configuration as any);
          break;
        case 'instagram':
          testResult = await this.testInstagramConnection(integration.configuration as any);
          break;
        case 'email':
          testResult = await this.testEmailConnection(integration.configuration as any);
          break;
        default:
          return { success: false, message: `Unsupported channel type: ${channelType}` };
      }

      if (testResult.success) {
        // Update health check data
        await this.databaseService.integrationStatus.update({
          where: {
            tenantId_integrationType: {
              tenantId,
              integrationType: channelType,
            },
          },
          data: {
            healthCheckData: {
              lastCheckedAt: new Date(),
              isHealthy: true,
            },
          },
        });
        
        return { success: true, message: `${channelType} connection test successful` };
      } else {
        return { success: false, message: testResult.error || `${channelType} connection test failed` };
      }
    } catch (error) {
      this.logger.error(`Channel connection test failed for ${channelType}:`, error);
      return { success: false, message: `Connection test failed: ${(error as Error).message}` };
    }
  }

  // AI Configuration
  async enableAIFeatures(tenantId: string, features: AIFeatureConfig): Promise<void> {
    await this.databaseService.integrationStatus.upsert({
      where: {
        tenantId_integrationType: {
          tenantId,
          integrationType: 'ai',
        },
      },
      update: {
        status: 'connected',
        configuration: features as any,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        integrationType: 'ai',
        status: 'connected',
        configuration: features as any,
      },
    });
  }

  // Workflow Configuration
  async createTicketWorkflows(tenantId: string, workflows: WorkflowConfig[]): Promise<void> {
    try {
      for (const workflow of workflows) {
        await this.databaseService.workflow.upsert({
          where: {
            tenantId_name: {
              tenantId,
              name: workflow.name,
            },
          },
          update: {
            description: workflow.description,
            triggers: workflow.triggers as any,
             conditions: workflow.conditions as any,
             actions: workflow.actions as any,
             isActive: workflow.enabled ?? true,
            updatedAt: new Date(),
          },
          create: {
            tenantId,
            name: workflow.name,
            description: workflow.description,
            triggers: workflow.triggers as any,
             conditions: workflow.conditions as any,
             actions: workflow.actions as any,
             isActive: workflow.enabled ?? true,
          },
        });
      }
      
      this.logger.log(`Created ${workflows.length} workflows for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to create workflows for tenant ${tenantId}:`, error);
      throw new Error(`Failed to create workflows: ${(error as Error).message}`);
    }
  }

  async configureSLARules(tenantId: string, slaRules: SLARule[]): Promise<void> {
    try {
      for (const rule of slaRules) {
        await this.databaseService.slaRule.upsert({
          where: {
            tenantId_name: {
              tenantId,
              name: rule.name,
            },
          },
          update: {
            description: rule.description,
            priority: 1, // Default priority
             responseTimeMinutes: rule.responseTime,
             resolutionTimeMinutes: rule.resolutionTime,
             conditions: rule.conditions as any,
             escalationRules: rule.escalationPath as any,
             isActive: rule.enabled ?? true,
            updatedAt: new Date(),
          },
          create: {
            tenantId,
            name: rule.name,
            description: rule.description,
            priority: 1, // Default priority
             responseTimeMinutes: rule.responseTime,
             resolutionTimeMinutes: rule.resolutionTime,
             conditions: rule.conditions as any,
             escalationRules: rule.escalationPath as any,
             isActive: rule.enabled ?? true,
          },
        });
      }
      
      this.logger.log(`Configured ${slaRules.length} SLA rules for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to configure SLA rules for tenant ${tenantId}:`, error);
      throw new Error(`Failed to configure SLA rules: ${(error as Error).message}`);
    }
  }

  async setupEscalationPaths(tenantId: string, escalations: EscalationPath[]): Promise<void> {
    try {
      for (const escalation of escalations) {
        await this.databaseService.escalationPath.upsert({
          where: {
            tenantId_name: {
              tenantId,
              name: escalation.name,
            },
          },
          update: {
            description: escalation.name, // Use name as description fallback
             triggerConditions: {} as any, // Default empty conditions
             steps: escalation.steps as any,
             isActive: escalation.enabled ?? true,
            updatedAt: new Date(),
          },
          create: {
            tenantId,
            name: escalation.name,
            description: escalation.name, // Use name as description fallback
             triggerConditions: {} as any, // Default empty conditions
             steps: escalation.steps as any,
             isActive: escalation.enabled ?? true,
          },
        });
      }
      
      this.logger.log(`Set up ${escalations.length} escalation paths for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to setup escalation paths for tenant ${tenantId}:`, error);
      throw new Error(`Failed to setup escalation paths: ${(error as Error).message}`);
    }
  }

  // Organization Configuration Methods
  async getOrganizationConfig(tenantId: string): Promise<any> {
    try {
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: {
          name: true,
          subdomain: true,
          plan: true,
          status: true,
          settings: true,
          brandingConfig: true,
        },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return {
        name: tenant.name,
        subdomain: tenant.subdomain,
        plan: tenant.plan,
        status: tenant.status,
        settings: tenant.settings,
        branding: tenant.brandingConfig,
      };
    } catch (error) {
      this.logger.error(`Failed to get organization config for tenant ${tenantId}:`, error);
      throw new Error(`Failed to get organization config: ${(error as Error).message}`);
    }
  }

  async updateOrganizationConfig(tenantId: string, config: any): Promise<void> {
    try {
      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: {
          name: config.name,
          settings: config.settings || {},
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated organization config for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to update organization config for tenant ${tenantId}:`, error);
      throw new Error(`Failed to update organization config: ${(error as Error).message}`);
    }
  }

  // Branding Configuration Methods
  async getBrandingConfig(tenantId: string): Promise<any> {
    try {
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: { brandingConfig: true },
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      return tenant.brandingConfig || {};
    } catch (error) {
      this.logger.error(`Failed to get branding config for tenant ${tenantId}:`, error);
      throw new Error(`Failed to get branding config: ${(error as Error).message}`);
    }
  }

  async updateBrandingConfig(tenantId: string, config: any): Promise<void> {
    try {
      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: {
          brandingConfig: config,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated branding config for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to update branding config for tenant ${tenantId}:`, error);
      throw new Error(`Failed to update branding config: ${(error as Error).message}`);
    }
  }

  async generateBrandingPreview(tenantId: string): Promise<any> {
    try {
      const brandingConfig = await this.getBrandingConfig(tenantId);
      
      // Generate a preview based on the branding configuration
      return {
        preview: {
          logoUrl: brandingConfig.logoUrl || '/default-logo.png',
          primaryColor: brandingConfig.primaryColor || '#007bff',
          secondaryColor: brandingConfig.secondaryColor || '#6c757d',
          accentColor: brandingConfig.accentColor || '#28a745',
          companyName: brandingConfig.companyName || 'Your Company',
        },
        css: this.generatePreviewCSS(brandingConfig),
      };
    } catch (error) {
      this.logger.error(`Failed to generate branding preview for tenant ${tenantId}:`, error);
      throw new Error(`Failed to generate branding preview: ${(error as Error).message}`);
    }
  }

  private generatePreviewCSS(brandingConfig: any): string {
    return `
      :root {
        --primary-color: ${brandingConfig.primaryColor || '#007bff'};
        --secondary-color: ${brandingConfig.secondaryColor || '#6c757d'};
        --accent-color: ${brandingConfig.accentColor || '#28a745'};
      }
      .preview-container {
        background-color: var(--primary-color);
        color: white;
        padding: 20px;
        border-radius: 8px;
      }
    `;
  }

  // Custom Fields Configuration Methods
  async getCustomFields(tenantId: string): Promise<any[]> {
    try {
      // In a real implementation, you would have a custom_fields table
      // For now, we'll return mock data or get from tenant settings
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = tenant?.settings as any || {};
      return settings.customFields || [];
    } catch (error) {
      this.logger.error(`Failed to get custom fields for tenant ${tenantId}:`, error);
      throw new Error(`Failed to get custom fields: ${(error as Error).message}`);
    }
  }

  async createCustomField(tenantId: string, fieldConfig: any): Promise<any> {
    try {
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = tenant?.settings as any || {};
      const customFields = settings.customFields || [];
      
      const newField = {
        id: `field_${Date.now()}`,
        ...fieldConfig,
        createdAt: new Date(),
      };
      
      customFields.push(newField);
      
      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            ...settings,
            customFields,
          },
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Created custom field for tenant ${tenantId}`);
      return newField;
    } catch (error) {
      this.logger.error(`Failed to create custom field for tenant ${tenantId}:`, error);
      throw new Error(`Failed to create custom field: ${(error as Error).message}`);
    }
  }

  async updateCustomField(tenantId: string, fieldId: string, fieldConfig: any): Promise<any> {
    try {
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = tenant?.settings as any || {};
      const customFields = settings.customFields || [];
      
      const fieldIndex = customFields.findIndex((field: any) => field.id === fieldId);
      if (fieldIndex === -1) {
        throw new Error('Custom field not found');
      }
      
      customFields[fieldIndex] = {
        ...customFields[fieldIndex],
        ...fieldConfig,
        updatedAt: new Date(),
      };
      
      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            ...settings,
            customFields,
          },
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated custom field ${fieldId} for tenant ${tenantId}`);
      return customFields[fieldIndex];
    } catch (error) {
      this.logger.error(`Failed to update custom field for tenant ${tenantId}:`, error);
      throw new Error(`Failed to update custom field: ${(error as Error).message}`);
    }
  }

  async deleteCustomField(tenantId: string, fieldId: string): Promise<void> {
    try {
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });

      const settings = tenant?.settings as any || {};
      const customFields = settings.customFields || [];
      
      const filteredFields = customFields.filter((field: any) => field.id !== fieldId);
      
      await this.databaseService.tenant.update({
        where: { id: tenantId },
        data: {
          settings: {
            ...settings,
            customFields: filteredFields,
          },
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Deleted custom field ${fieldId} for tenant ${tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to delete custom field for tenant ${tenantId}:`, error);
      throw new Error(`Failed to delete custom field: ${(error as Error).message}`);
    }
  }

  // Configuration Validation
  async validateConfiguration(tenantId: string, config: any): Promise<{ isValid: boolean; errors: string[] }> {
    try {
      const errors: string[] = [];

      // Validate organization config
      if (config.organization) {
        if (!config.organization.name || config.organization.name.trim().length === 0) {
          errors.push('Organization name is required');
        }
      }

      // Validate branding config
      if (config.branding) {
        if (config.branding.primaryColor && !/^#[0-9A-F]{6}$/i.test(config.branding.primaryColor)) {
          errors.push('Invalid primary color format');
        }
        if (config.branding.secondaryColor && !/^#[0-9A-F]{6}$/i.test(config.branding.secondaryColor)) {
          errors.push('Invalid secondary color format');
        }
      }

      // Validate custom fields
      if (config.customFields && Array.isArray(config.customFields)) {
        config.customFields.forEach((field: any, index: number) => {
          if (!field.name || field.name.trim().length === 0) {
            errors.push(`Custom field ${index + 1}: Name is required`);
          }
          if (!field.type || !['text', 'number', 'email', 'select', 'checkbox'].includes(field.type)) {
            errors.push(`Custom field ${index + 1}: Invalid field type`);
          }
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error(`Failed to validate configuration for tenant ${tenantId}:`, error);
      throw new Error(`Failed to validate configuration: ${(error as Error).message}`);
    }
  }

  // Configuration Export/Import
  async exportConfiguration(tenantId: string): Promise<any> {
    try {
      const [organizationConfig, brandingConfig, customFields] = await Promise.all([
        this.getOrganizationConfig(tenantId),
        this.getBrandingConfig(tenantId),
        this.getCustomFields(tenantId),
      ]);

      const exportData = {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        tenantId,
        configuration: {
          organization: organizationConfig,
          branding: brandingConfig,
          customFields,
        },
      };

      this.logger.log(`Exported configuration for tenant ${tenantId}`);
      return exportData;
    } catch (error) {
      this.logger.error(`Failed to export configuration for tenant ${tenantId}:`, error);
      throw new Error(`Failed to export configuration: ${(error as Error).message}`);
    }
  }

  async importConfiguration(tenantId: string, config: any): Promise<{ success: boolean; message: string }> {
    try {
      // Validate the import data structure
      if (!config.configuration) {
        throw new Error('Invalid configuration format');
      }

      const { organization, branding, customFields } = config.configuration;

      // Import organization config
      if (organization) {
        await this.updateOrganizationConfig(tenantId, organization);
      }

      // Import branding config
      if (branding) {
        await this.updateBrandingConfig(tenantId, branding);
      }

      // Import custom fields
      if (customFields && Array.isArray(customFields)) {
        // Clear existing custom fields and import new ones
        const tenant = await this.databaseService.tenant.findUnique({
          where: { id: tenantId },
          select: { settings: true },
        });

        const settings = tenant?.settings as any || {};
        
        await this.databaseService.tenant.update({
          where: { id: tenantId },
          data: {
            settings: {
              ...settings,
              customFields,
            },
            updatedAt: new Date(),
          },
        });
      }

      this.logger.log(`Imported configuration for tenant ${tenantId}`);
      return {
        success: true,
        message: 'Configuration imported successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to import configuration for tenant ${tenantId}:`, error);
      throw new Error(`Failed to import configuration: ${(error as Error).message}`);
    }
  }
}