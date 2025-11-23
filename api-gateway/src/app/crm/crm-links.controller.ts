import { Controller, Post, Delete, Get, Param, Query, Req, UseGuards, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { CrmLinksService } from './crm-links.service';
import { Roles, RolesGuard } from '@glavito/shared-auth';

@Controller('crm/links')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CrmLinksController {
  constructor(private readonly linksService: CrmLinksService) {}

  @Post('tickets/:ticketId/lead')
  @Roles('admin', 'agent')
  async linkTicketToLead(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body('leadId') leadId: string
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    await this.linksService.linkTicketToLead(tenantId, ticketId, leadId, userId);

    return { success: true, message: 'Ticket linked to lead successfully' };
  }

  @Delete('tickets/:ticketId/lead')
  @Roles('admin', 'agent')
  async unlinkTicketFromLead(
    @Req() req: any,
    @Param('ticketId') ticketId: string
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    await this.linksService.unlinkTicketFromLead(tenantId, ticketId, userId);

    return { success: true, message: 'Ticket unlinked from lead successfully' };
  }

  @Post('tickets/:ticketId/deal')
  @Roles('admin', 'agent')
  async linkTicketToDeal(
    @Req() req: any,
    @Param('ticketId') ticketId: string,
    @Body('dealId') dealId: string
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    await this.linksService.linkTicketToDeal(tenantId, ticketId, dealId, userId);

    return { success: true, message: 'Ticket linked to deal successfully' };
  }

  @Delete('tickets/:ticketId/deal')
  @Roles('admin', 'agent')
  async unlinkTicketFromDeal(
    @Req() req: any,
    @Param('ticketId') ticketId: string
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.userId;

    await this.linksService.unlinkTicketFromDeal(tenantId, ticketId, userId);

    return { success: true, message: 'Ticket unlinked from deal successfully' };
  }

  @Get('tickets/:ticketId')
  @Roles('admin', 'agent')
  async getTicketLinks(
    @Req() req: any,
    @Param('ticketId') ticketId: string
  ) {
    const tenantId = req.user.tenantId;
    return this.linksService.getTicketLinks(tenantId, ticketId);
  }

  @Get('leads/:leadId/tickets')
  @Roles('admin', 'agent')
  async getLeadTickets(
    @Req() req: any,
    @Param('leadId') leadId: string
  ) {
    const tenantId = req.user.tenantId;
    return this.linksService.getLinkedTickets(tenantId, 'lead', leadId);
  }

  @Get('deals/:dealId/tickets')
  @Roles('admin', 'agent')
  async getDealTickets(
    @Req() req: any,
    @Param('dealId') dealId: string
  ) {
    const tenantId = req.user.tenantId;
    return this.linksService.getLinkedTickets(tenantId, 'deal', dealId);
  }

  @Post('auto-link')
  @Roles('admin')
  async autoLinkTickets(
    @Req() req: any,
    @Query('batchSize') batchSize?: string
  ) {
    const tenantId = req.user.tenantId;
    const size = batchSize ? parseInt(batchSize, 10) : 100;

    return this.linksService.autoLinkTickets(tenantId, size);
  }
}

