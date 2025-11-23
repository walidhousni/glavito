import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { CrmTimelineService } from './crm-timeline.service';

@Injectable()
export class CrmLinksService {
  private readonly logger = new Logger(CrmLinksService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly timeline: CrmTimelineService
  ) {}

  async linkTicketToLead(
    tenantId: string,
    ticketId: string,
    leadId: string,
    userId: string
  ): Promise<void> {
    // Verify ticket exists and belongs to tenant
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Verify lead exists and belongs to tenant
    const lead = await this.db.lead.findFirst({
      where: { id: leadId, tenantId },
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    // Update ticket
    await this.db.ticket.update({
      where: { id: ticketId },
      data: { relatedLeadId: leadId },
    });

    // Create audit log
    await this.db.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'link_ticket_to_lead',
        resource: 'ticket',
        resourceId: ticketId,
        newValues: { leadId },
      },
    });

    // Invalidate timeline cache
    await this.timeline.invalidateTimeline(tenantId, ticket.customerId);
    if (lead.customerId) {
      await this.timeline.invalidateTimeline(tenantId, lead.customerId);
    }

    this.logger.log(`Linked ticket ${ticketId} to lead ${leadId} in tenant ${tenantId}`);
  }

  async unlinkTicketFromLead(
    tenantId: string,
    ticketId: string,
    userId: string
  ): Promise<void> {
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: { lead: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const oldLeadId = ticket.relatedLeadId;

    await this.db.ticket.update({
      where: { id: ticketId },
      data: { relatedLeadId: null },
    });

    // Create audit log
    await this.db.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'unlink_ticket_from_lead',
        resource: 'ticket',
        resourceId: ticketId,
        oldValues: { leadId: oldLeadId },
      },
    });

    // Invalidate timeline cache
    await this.timeline.invalidateTimeline(tenantId, ticket.customerId);
    if (ticket.lead?.customerId) {
      await this.timeline.invalidateTimeline(tenantId, ticket.lead.customerId);
    }

    this.logger.log(`Unlinked ticket ${ticketId} from lead in tenant ${tenantId}`);
  }

  async linkTicketToDeal(
    tenantId: string,
    ticketId: string,
    dealId: string,
    userId: string
  ): Promise<void> {
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, tenantId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const deal = await this.db.deal.findFirst({
      where: { id: dealId, tenantId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    await this.db.ticket.update({
      where: { id: ticketId },
      data: { relatedDealId: dealId },
    });

    // Create audit log
    await this.db.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'link_ticket_to_deal',
        resource: 'ticket',
        resourceId: ticketId,
        newValues: { dealId },
      },
    });

    // Invalidate timeline cache
    await this.timeline.invalidateTimeline(tenantId, ticket.customerId);
    if (deal.customerId) {
      await this.timeline.invalidateTimeline(tenantId, deal.customerId);
    }

    this.logger.log(`Linked ticket ${ticketId} to deal ${dealId} in tenant ${tenantId}`);
  }

  async unlinkTicketFromDeal(
    tenantId: string,
    ticketId: string,
    userId: string
  ): Promise<void> {
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: { deal: true },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const oldDealId = ticket.relatedDealId;

    await this.db.ticket.update({
      where: { id: ticketId },
      data: { relatedDealId: null },
    });

    // Create audit log
    await this.db.auditLog.create({
      data: {
        tenantId,
        userId,
        action: 'unlink_ticket_from_deal',
        resource: 'ticket',
        resourceId: ticketId,
        oldValues: { dealId: oldDealId },
      },
    });

    // Invalidate timeline cache
    await this.timeline.invalidateTimeline(tenantId, ticket.customerId);
    if (ticket.deal?.customerId) {
      await this.timeline.invalidateTimeline(tenantId, ticket.deal.customerId);
    }

    this.logger.log(`Unlinked ticket ${ticketId} from deal in tenant ${tenantId}`);
  }

  async getLinkedTickets(
    tenantId: string,
    entityType: 'lead' | 'deal',
    entityId: string
  ): Promise<any[]> {
    const where: any = { tenantId };

    if (entityType === 'lead') {
      where.relatedLeadId = entityId;
    } else {
      where.relatedDealId = entityId;
    }

    return this.db.ticket.findMany({
      where,
      select: {
        id: true,
        subject: true,
        status: true,
        priority: true,
        createdAt: true,
        updatedAt: true,
        channel: {
          select: {
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTicketLinks(tenantId: string, ticketId: string): Promise<{
    lead?: any;
    deal?: any;
  }> {
    const ticket = await this.db.ticket.findFirst({
      where: { id: ticketId, tenantId },
      include: {
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            company: true,
            status: true,
            score: true,
          },
        },
        deal: {
          select: {
            id: true,
            name: true,
            stage: true,
            value: true,
            currency: true,
            probability: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      lead: ticket.lead || undefined,
      deal: ticket.deal || undefined,
    };
  }

  async autoLinkTickets(tenantId: string, batchSize = 100): Promise<{
    processed: number;
    linked: number;
    errors: number;
  }> {
    let processed = 0;
    let linked = 0;
    let errors = 0;

    // Find tickets without links
    const tickets = await this.db.ticket.findMany({
      where: {
        tenantId,
        relatedLeadId: null,
        relatedDealId: null,
      },
      include: {
        customer: {
          select: {
            email: true,
            phone: true,
            company: true,
          },
        },
      },
      take: batchSize,
    });

    for (const ticket of tickets) {
      processed++;

      try {
        // Try to find matching lead by email or phone
        const lead = await this.db.lead.findFirst({
          where: {
            tenantId,
            OR: [
              ticket.customer.email ? { email: ticket.customer.email } : {},
              ticket.customer.phone ? { phone: ticket.customer.phone } : {},
              ticket.customer.company ? { company: ticket.customer.company } : {},
            ].filter((clause) => Object.keys(clause).length > 0),
          },
          orderBy: { createdAt: 'desc' },
        });

        if (lead) {
          await this.db.ticket.update({
            where: { id: ticket.id },
            data: { relatedLeadId: lead.id },
          });
          linked++;
          this.logger.debug(`Auto-linked ticket ${ticket.id} to lead ${lead.id}`);
        }

        // Try to find matching deal
        const deal = await this.db.deal.findFirst({
          where: {
            tenantId,
            customerId: ticket.customerId,
            stage: {
              notIn: ['WON', 'LOST'],
            },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (deal) {
          await this.db.ticket.update({
            where: { id: ticket.id },
            data: { relatedDealId: deal.id },
          });
          linked++;
          this.logger.debug(`Auto-linked ticket ${ticket.id} to deal ${deal.id}`);
        }
      } catch (error) {
        errors++;
        this.logger.error(`Error auto-linking ticket ${ticket.id}:`, error);
      }
    }

    this.logger.log(`Auto-link completed: processed=${processed}, linked=${linked}, errors=${errors}`);

    return { processed, linked, errors };
  }
}

