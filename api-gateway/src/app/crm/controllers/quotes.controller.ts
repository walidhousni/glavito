import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentTenant, CurrentUser } from '@glavito/shared-auth';
import type { CreateQuoteDto, UpdateQuoteDto } from '../services/quote.service';
import { QuoteService } from '../services/quote.service';

interface UserPayload {
  id: string;
  tenantId: string;
}

@Controller('crm/quotes')
@UseGuards(JwtAuthGuard)
export class QuotesController {
  constructor(private readonly quoteService: QuoteService) {}

  /**
   * Create a new quote
   */
  @Post()
  async createQuote(
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: CreateQuoteDto
  ) {
    return this.quoteService.createQuote(tenantId, user.id, data);
  }

  /**
   * Update a quote
   */
  @Put(':quoteId')
  async updateQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: UpdateQuoteDto
  ) {
    return this.quoteService.updateQuote(quoteId, user.id, data);
  }

  /**
   * Create a revision of a quote
   */
  @Post(':quoteId/revisions')
  async createRevision(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: UserPayload,
    @Body() data: UpdateQuoteDto
  ) {
    return this.quoteService.createRevision(quoteId, user.id, data);
  }

  /**
   * Send quote to customer
   */
  @Post(':quoteId/send')
  async sendQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: UserPayload
  ) {
    return this.quoteService.sendQuote(quoteId, user.id);
  }

  /**
   * Accept quote
   */
  @Post(':quoteId/accept')
  async acceptQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: UserPayload,
    @Body() body?: { signedBy?: string }
  ) {
    return this.quoteService.acceptQuote(quoteId, user.id, body?.signedBy);
  }

  /**
   * Reject quote
   */
  @Post(':quoteId/reject')
  async rejectQuote(
    @Param('quoteId') quoteId: string,
    @CurrentUser() user: UserPayload,
    @Body() body?: { reason?: string }
  ) {
    return this.quoteService.rejectQuote(quoteId, body?.reason, user.id);
  }

  /**
   * Get quote by ID
   */
  @Get(':quoteId')
  async getQuote(@Param('quoteId') quoteId: string) {
    return this.quoteService.getQuote(quoteId);
  }

  /**
   * List quotes for tenant
   */
  @Get()
  async listQuotes(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: string,
    @Query('dealId') dealId?: string,
    @Query('customerId') customerId?: string,
    @Query('createdBy') createdBy?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string
  ) {
    const filters: {
      status?: string;
      dealId?: string;
      customerId?: string;
      createdBy?: string;
      fromDate?: Date;
      toDate?: Date;
    } = {};
    
    if (status) filters.status = status;
    if (dealId) filters.dealId = dealId;
    if (customerId) filters.customerId = customerId;
    if (createdBy) filters.createdBy = createdBy;
    if (fromDate) filters.fromDate = new Date(fromDate);
    if (toDate) filters.toDate = new Date(toDate);

    return this.quoteService.listQuotes(tenantId, filters);
  }

  /**
   * Get quote statistics
   */
  @Get('stats/overview')
  async getQuoteStats(@CurrentTenant() tenantId: string) {
    return this.quoteService.getQuoteStats(tenantId);
  }
}

