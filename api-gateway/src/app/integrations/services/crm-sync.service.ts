import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';

interface MappedCustomerData {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  company?: string;
  customFields?: Record<string, unknown>;
  tags?: string[];
}

@Injectable()
export class CrmSyncService {
  private readonly logger = new Logger(CrmSyncService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Handle order created (Shopify/WooCommerce)
   * connectorConfig: {
   *   autoCreate?: { customer?: boolean; ticket?: boolean | 'conditional' },
   *   ticketRules?: { highValueOrder?: number; paymentFailed?: boolean; fulfillmentError?: boolean }
   * }
   */
  async handleOrderCreated(tenantId: string, order: Record<string, any>, connectorConfig: Record<string, any>) {
    try {
      const autoCreate = (connectorConfig?.autoCreate || {}) as { customer?: boolean; ticket?: boolean | 'conditional' };
      const rules = (connectorConfig?.ticketRules || {}) as { highValueOrder?: number; paymentFailed?: boolean; fulfillmentError?: boolean };

      // Upsert customer if enabled
      let customer: any = null;
      if (autoCreate.customer !== false) {
        const email = order?.email || order?.customer?.email || '';
        const firstName = order?.customer?.first_name || order?.customer?.firstName || order?.billing_address?.first_name || '';
        const lastName = order?.customer?.last_name || order?.customer?.lastName || order?.billing_address?.last_name || '';
        const phone = order?.customer?.phone || order?.billing_address?.phone || '';
        const company = order?.customer?.company || order?.billing_address?.company || '';
        customer = await this.prisma.customer.upsert({
          where: { tenantId_email: { tenantId, email } } as any,
          create: {
            tenantId,
            email,
            firstName,
            lastName,
            phone,
            company,
            customFields: { source: order?.source_name || 'ecommerce', externalId: String(order?.id || '') } as any,
          },
          update: {
            firstName,
            lastName,
            phone,
            company,
            updatedAt: new Date(),
          },
        });
      }

      // Decide ticket creation
      const createTicketMode = autoCreate.ticket ?? 'conditional';
      if (createTicketMode === true || createTicketMode === 'conditional') {
        const shouldCreate = this.shouldCreateTicketForOrder(order, rules);
        if (createTicketMode === true || shouldCreate) {
          await this.createTicketFromOrder(tenantId, order, customer);
        }
      }
    } catch (error: any) {
      this.logger.error(`Failed handleOrderCreated: ${error?.message}`);
      throw error;
    }
  }

  async handleOrderUpdated(tenantId: string, order: Record<string, any>, connectorConfig: Record<string, any>) {
    try {
      // Optionally update related ticket status or add note (best-effort)
      const extId = String(order?.id || '');
      const ticket = await this.prisma.ticket.findFirst({
        where: { tenantId, description: { contains: extId } },
      });
      if (ticket) {
        await this.prisma.ticket.update({
          where: { id: ticket.id },
          data: {
            tags: Array.from(new Set([...(ticket.tags || []), 'order_updated'])),
            updatedAt: new Date(),
          },
        });
      }
    } catch (error: any) {
      this.logger.warn(`handleOrderUpdated noop: ${error?.message}`);
    }
  }

  private shouldCreateTicketForOrder(order: Record<string, any>, rules: { highValueOrder?: number; paymentFailed?: boolean; fulfillmentError?: boolean }): boolean {
    try {
      const total = Number(order?.total_price || order?.total || 0);
      if (rules?.highValueOrder && total >= Number(rules.highValueOrder)) return true;
      const financialStatus = String(order?.financial_status || order?.payment_status || '').toLowerCase();
      if (rules?.paymentFailed && (financialStatus.includes('failed') || financialStatus.includes('void'))) return true;
      const fulfillmentStatus = String(order?.fulfillment_status || '').toLowerCase();
      if (rules?.fulfillmentError && (fulfillmentStatus.includes('failed') || fulfillmentStatus.includes('cancel'))) return true;
      return false;
    } catch {
      return false;
    }
  }

  private async createTicketFromOrder(tenantId: string, order: Record<string, any>, customer: any | null) {
    const channel = await this.getDefaultChannel(tenantId);
    const customerId = customer?.id || (
      await this.prisma.customer.findFirst({ where: { tenantId, email: order?.email || order?.customer?.email || '' } })
    )?.id;
    if (!channel || !customerId) return;
    const subject = `Order #${order?.order_number || order?.id} follow-up`;
    const description = `Order total: ${order?.total_price || order?.total}\nFinancial: ${order?.financial_status || order?.payment_status}\nFulfillment: ${order?.fulfillment_status}`;
    await this.prisma.ticket.create({
      data: {
        tenantId,
        customerId,
        channelId: channel.id,
        subject,
        description,
        status: 'open',
        priority: 'medium',
        tags: ['ecommerce', String(order?.source_name || 'shop')],
      },
    });
  }
  async upsertCustomerFromCrm(
    tenantId: string,
    crmData: Record<string, any>,
    mappings: Record<string, unknown>
  ): Promise<any> {
    try {
      const mapped = this.applyFieldMapping(crmData, mappings);
      
      if (!mapped.email) {
        this.logger.warn(`Skipping CRM record without email: ${JSON.stringify(crmData)}`);
        return null;
      }

      // Upsert customer by email
      const customer = await this.prisma.customer.upsert({
        where: {
          tenantId_email: {
            tenantId,
            email: mapped.email,
          },
        },
        create: {
          tenantId,
          email: mapped.email,
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          phone: mapped.phone,
          company: mapped.company,
          customFields: (mapped.customFields || {}) as any,
          tags: mapped.tags || [],
        },
        update: {
          firstName: mapped.firstName,
          lastName: mapped.lastName,
          phone: mapped.phone,
          company: mapped.company,
          customFields: (mapped.customFields || {}) as any,
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Upserted customer ${customer.id} from CRM data`);
      return customer;
    } catch (error: any) {
      this.logger.error(`Failed to upsert customer from CRM: ${error?.message}`);
      throw error;
    }
  }

  async createTicketFromCrmLead(
    tenantId: string,
    leadData: Record<string, any>,
    customer: any,
    autoCreate: boolean
  ): Promise<any | null> {
    try {
      if (!autoCreate) {
        return null;
      }

      // Get default channel for tenant
      const channel = await this.getDefaultChannel(tenantId);
      if (!channel) {
        this.logger.warn(`No default channel found for tenant ${tenantId}`);
        return null;
      }

      const priority = this.mapPriority(leadData.priority || leadData.Priority);
      const source = leadData.source || leadData.Source || leadData.LeadSource || 'crm';

      const ticket = await this.prisma.ticket.create({
        data: {
          tenantId,
          customerId: customer.id,
          channelId: channel.id,
          subject: `New Lead: ${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'New CRM Lead',
          description: leadData.description || leadData.Description || '',
          status: 'open',
          priority,
          tags: ['crm-lead', source].filter(Boolean),
        },
      });

      this.logger.log(`Created ticket ${ticket.id} for CRM lead`);
      return ticket;
    } catch (error: any) {
      this.logger.error(`Failed to create ticket from CRM lead: ${error?.message}`);
      return null;
    }
  }

  async upsertLeadFromCrm(
    tenantId: string,
    leadData: Record<string, any>,
    mappings: Record<string, unknown>,
    customer: any
  ): Promise<any> {
    try {
      const mapped = this.applyFieldMapping(leadData, mappings);
      
      const email = mapped.email || leadData.Email || leadData.email;
      if (!email) {
        this.logger.warn(`Skipping lead without email`);
        return null;
      }

      // Find existing lead
      const existingLead = await this.prisma.lead.findFirst({
        where: {
          tenantId,
          email: email as string,
        },
      });

      let lead;
      if (existingLead) {
        // Update existing lead
        lead = await this.prisma.lead.update({
          where: { id: existingLead.id },
          data: {
            firstName: mapped.firstName as string,
            lastName: mapped.lastName as string,
            company: mapped.company as string,
            phone: mapped.phone as string,
            status: this.mapLeadStatus(leadData.status || leadData.Status),
            customerId: customer?.id,
            score: this.calculateLeadScore(leadData),
            customFields: (mapped.customFields || {}) as any,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create new lead
        lead = await this.prisma.lead.create({
          data: {
            tenantId,
            email: email as string,
            firstName: mapped.firstName as string,
            lastName: mapped.lastName as string,
            company: mapped.company as string,
            phone: mapped.phone as string,
            source: (leadData.source || leadData.Source || leadData.LeadSource || 'crm') as string,
            status: this.mapLeadStatus(leadData.status || leadData.Status),
            customerId: customer?.id,
            score: this.calculateLeadScore(leadData),
            customFields: (mapped.customFields || {}) as any,
            tags: (mapped.tags || []) as string[],
          },
        });
      }

      this.logger.log(`Upserted lead ${lead.id} from CRM data`);
      return lead;
    } catch (error: any) {
      this.logger.error(`Failed to upsert lead from CRM: ${error?.message}`);
      throw error;
    }
  }

  private applyFieldMapping(
    sourceData: Record<string, any>,
    mappings: Record<string, unknown>
  ): MappedCustomerData {
    const mapped: MappedCustomerData = {
      email: '',
      customFields: {},
    };

    // Apply mappings
    for (const [sourceField, targetField] of Object.entries(mappings)) {
      const value = sourceData[sourceField];
      if (value !== undefined && value !== null) {
        if (typeof targetField === 'string') {
          // Direct field mapping
          if (['email', 'firstName', 'lastName', 'phone', 'company'].includes(targetField)) {
            (mapped as any)[targetField] = String(value);
          } else {
            // Custom field
            if (!mapped.customFields) mapped.customFields = {};
            mapped.customFields[targetField] = value;
          }
        }
      }
    }

    // Fallback to common field names if mapping didn't work
    if (!mapped.email) {
      mapped.email = sourceData.Email || sourceData.email || sourceData.EmailAddress || '';
    }
    if (!mapped.firstName) {
      mapped.firstName = sourceData.FirstName || sourceData.firstName || sourceData.first_name || '';
    }
    if (!mapped.lastName) {
      mapped.lastName = sourceData.LastName || sourceData.lastName || sourceData.last_name || '';
    }
    if (!mapped.phone) {
      mapped.phone = sourceData.Phone || sourceData.phone || sourceData.PhoneNumber || sourceData.MobilePhone || '';
    }
    if (!mapped.company) {
      mapped.company = sourceData.Company || sourceData.company || sourceData.CompanyName || sourceData.Account?.Name || '';
    }

    return mapped;
  }

  private async getDefaultChannel(tenantId: string): Promise<any | null> {
    try {
      // Try to find a web or email channel
      let channel = await this.prisma.channel.findFirst({
        where: {
          tenantId,
          type: { in: ['web', 'email'] },
          isActive: true,
        },
      });

      // Fallback to any active channel
      if (!channel) {
        channel = await this.prisma.channel.findFirst({
          where: {
            tenantId,
            isActive: true,
          },
        });
      }

      return channel;
    } catch (error: any) {
      this.logger.error(`Failed to get default channel: ${error?.message}`);
      return null;
    }
  }

  private mapPriority(crmPriority: any): string {
    const priority = String(crmPriority || '').toLowerCase();
    
    if (priority.includes('high') || priority.includes('urgent')) {
      return 'high';
    }
    if (priority.includes('low')) {
      return 'low';
    }
    return 'medium';
  }

  private mapLeadStatus(crmStatus: any): string {
    const status = String(crmStatus || '').toLowerCase();
    
    if (status.includes('new')) return 'NEW';
    if (status.includes('contact')) return 'CONTACTED';
    if (status.includes('qualif')) return 'QUALIFIED';
    if (status.includes('proposal')) return 'PROPOSAL';
    if (status.includes('negot')) return 'NEGOTIATION';
    if (status.includes('convert') || status.includes('won')) return 'CONVERTED';
    if (status.includes('lost') || status.includes('dead')) return 'LOST';
    
    return 'NEW';
  }

  private calculateLeadScore(leadData: Record<string, any>): number {
    let score = 0;
    
    // Score based on data completeness
    if (leadData.Email || leadData.email) score += 10;
    if (leadData.Phone || leadData.phone) score += 10;
    if (leadData.Company || leadData.company) score += 15;
    if (leadData.Title || leadData.title) score += 5;
    
    // Score from CRM if available
    if (leadData.Score || leadData.score || leadData.Rating) {
      const crmScore = parseInt(leadData.Score || leadData.score || leadData.Rating);
      if (!isNaN(crmScore)) {
        score += Math.min(crmScore, 60);
      }
    }
    
    return Math.min(score, 100);
  }

  async getIntegrationConfig(tenantId: string, provider: string): Promise<any> {
    try {
      const connector = await this.prisma.integrationConnector.findUnique({
        where: {
          tenantId_provider: { tenantId, provider } as any,
        },
      });
      return connector;
    } catch (error: any) {
      this.logger.error(`Failed to get integration config: ${error?.message}`);
      return null;
    }
  }
}

