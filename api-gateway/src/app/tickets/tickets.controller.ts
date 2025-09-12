import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, PermissionsGuard } from '@glavito/shared-auth';
// import { UseInterceptors } from '@nestjs/common';
import { Roles, Permissions } from '@glavito/shared-auth';
import { TicketsService } from './tickets.service';
import { TicketsSearchService } from './tickets-search.service';
import type { Ticket, CreateTicketRequest, UpdateTicketRequest, TicketFilters, PaginationParams } from '@glavito/shared-types';

@ApiTags('Tickets')
@Controller('tickets')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly search: TicketsSearchService,
  ) {}

  @Post()
  @Roles('admin', 'agent')
  @Permissions('tickets.create')
  @ApiOperation({ summary: 'Create a new ticket' })
  @ApiResponse({ status: 201, description: 'Ticket created successfully' })
  async create(@Body() createTicketDto: CreateTicketRequest): Promise<Ticket> {
    return this.ticketsService.create(createTicketDto);
  }

  @Get()
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Get all tickets' })
  @ApiResponse({ status: 200, description: 'List of tickets' })
  async findAll(
    @Query() filters: TicketFilters & { dateFrom?: string; dateTo?: string },
    @Query() pagination: PaginationParams,
    @Req() req: any,
  ): Promise<Ticket[]> {
    const mapped: TicketFilters = { ...filters } as any;
    if ((filters as any).dateFrom || (filters as any).dateTo) {
      (mapped as any).dateRange = {
        from: (filters as any).dateFrom ? new Date((filters as any).dateFrom) : undefined,
        to: (filters as any).dateTo ? new Date((filters as any).dateTo) : undefined,
      } as any;
    }
    const tenantId = req?.user?.tenantId;
    return this.ticketsService.findAll(mapped, pagination, tenantId);
  }

  @Get('search/advanced')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Advanced search with facets and optional semantic ranking' })
  @Header('Cache-Control', 'private, max-age=30')
  async advancedSearch(
    @Query('q') q: string,
    @Query() filters: any,
    @Query() pagination: PaginationParams & { semantic?: string },
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.id as string;
    const semantic = String((pagination as any).semantic || '').toLowerCase() === 'true';
    return this.search.search(tenantId, q, filters as any, {
      page: (pagination as any).page ? Number((pagination as any).page) : 1,
      limit: (pagination as any).limit ? Number((pagination as any).limit) : 20,
      sortBy: (pagination as any).sortBy,
      sortOrder: (pagination as any).sortOrder as any,
      semantic,
    }, userId);
  }

  @Get('search/suggest')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Typeahead suggestions for subjects, tags, customers' })
  @Header('Cache-Control', 'private, max-age=30')
  async suggest(
    @Query('q') q: string,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    return this.search.suggest(tenantId, q || '');
  }

  // Saved searches
  @Get('search/saved')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'List saved searches for current user' })
  async listSaved(@Req() req: any) {
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.id as string;
    return this.search.listSavedSearches(tenantId, userId);
  }

  @Post('search/saved')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Create a saved search for current user' })
  async createSaved(@Body() body: { name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.id as string;
    return this.search.createSavedSearch(tenantId, userId, body);
  }

  @Patch('search/saved/:id')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Update a saved search' })
  async updateSaved(@Param('id') id: string, @Body() body: { name?: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; alertsEnabled?: boolean }, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.id as string;
    return this.search.updateSavedSearch(tenantId, userId, id, body);
  }

  @Delete('search/saved/:id')
  @Roles('admin', 'agent')
  @ApiOperation({ summary: 'Delete a saved search' })
  async deleteSaved(@Param('id') id: string, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string;
    const userId = req?.user?.id as string;
    return this.search.deleteSavedSearch(tenantId, userId, id);
  }

  @Get('stats')
  @Roles('admin')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Get ticket stats and trends' })
  @ApiResponse({ status: 200, description: 'Ticket stats' })
  async stats(@Query('tenantId') tenantId?: string) {
    return this.ticketsService.getStats(tenantId);
  }

  @Get(':id')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Get ticket by ID' })
  @ApiResponse({ status: 200, description: 'Ticket found' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async findOne(@Param('id') id: string, @Req() req: any): Promise<Ticket> {
    return this.ticketsService.findOne(id, req?.user?.tenantId);
  }

  @Patch(':id')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Update ticket' })
  @ApiResponse({ status: 200, description: 'Ticket updated successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketRequest,
    @Req() req: any,
  ): Promise<Ticket> {
    return this.ticketsService.update(id, updateTicketDto, req?.user?.tenantId);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('tickets.delete')
  @ApiOperation({ summary: 'Delete ticket' })
  @ApiResponse({ status: 200, description: 'Ticket deleted successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async remove(@Param('id') id: string, @Req() req: any): Promise<void> {
    return this.ticketsService.remove(id, req?.user?.tenantId);
  }

  @Patch(':id/assign')
  @Roles('admin', 'agent')
  @Permissions('tickets.assign')
  @ApiOperation({ summary: 'Assign ticket to agent' })
  @ApiResponse({ status: 200, description: 'Ticket assigned successfully' })
  async assign(
    @Param('id') id: string,
    @Body() body: { agentId: string },
    @Req() req: any,
  ): Promise<Ticket> {
    return this.ticketsService.assign(id, body.agentId, req?.user?.tenantId);
  }

  @Patch(':id/assign/auto')
  @Roles('admin', 'agent')
  @Permissions('tickets.assign')
  @ApiOperation({ summary: 'Auto-assign ticket to best agent' })
  @ApiResponse({ status: 200, description: 'Ticket auto-assigned (or remains unassigned if none found)' })
  async autoAssign(
    @Param('id') id: string,
    @Req() req: any,
  ): Promise<Ticket> {
    return this.ticketsService.autoAssign(id, req?.user?.tenantId);
  }

  @Patch(':id/resolve')
  @Roles('admin', 'agent')
  @Permissions('tickets.resolve')
  @ApiOperation({ summary: 'Resolve ticket' })
  @ApiResponse({ status: 200, description: 'Ticket resolved successfully' })
  async resolve(@Param('id') id: string, @Req() req: any): Promise<Ticket> {
    return this.ticketsService.resolve(id, req?.user?.tenantId);
  }

  @Patch(':id/snooze')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Snooze ticket until a future time' })
  @ApiResponse({ status: 200, description: 'Ticket snoozed successfully' })
  async snooze(
    @Param('id') id: string,
    @Body() body: { until: string; reason?: string },
    @Req() req: any,
  ): Promise<Ticket> {
    const until = body?.until ? new Date(body.until) : undefined;
    return this.ticketsService.snooze(id, until, body?.reason, req?.user?.tenantId, req?.user?.id);
  }

  @Patch(':id/reopen')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Reopen ticket' })
  @ApiResponse({ status: 200, description: 'Ticket reopened successfully' })
  async reopen(@Param('id') id: string, @Req() req: any): Promise<Ticket> {
    return this.ticketsService.reopen(id, req?.user?.tenantId);
  }

  @Get(':id/similar')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Find similar tickets' })
  async similar(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.findSimilar(id, req?.user?.tenantId);
  }

  @Get(':id/timeline')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Get ticket timeline' })
  async timeline(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.getTimeline(id, req?.user?.tenantId);
  }

  @Get(':id/export')
  @Roles('admin')
  @Permissions('tickets.export')
  @ApiOperation({ summary: 'Export ticket' })
  async export(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.export(id, req?.user?.tenantId);
  }

  @Delete(':id/erase')
  @Roles('admin')
  @Permissions('tickets.delete')
  @ApiOperation({ summary: 'Erase ticket (DSR delete)' })
  async erase(@Param('id') id: string, @Req() req: any) {
    await this.ticketsService.remove(id, req?.user?.tenantId)
    return { ok: true }
  }

  @Get(':id/ai')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'Get AI analysis for ticket' })
  async ai(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.getAIAnalysis(id, req?.user?.tenantId);
  }

  @Post(':id/ai/analyze')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Run AI analysis now and enrich ticket (priority/tags) best-effort' })
  async analyzeNow(@Param('id') id: string, @Req() req: any) {
    return this.ticketsService.analyzeNow(id, req?.user?.tenantId);
  }

  @Patch(':id/tags')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Add or remove tags from ticket' })
  async updateTags(
    @Param('id') id: string,
    @Body() body: { add?: string[]; remove?: string[] },
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId;
    if (body.add?.length) {
      await this.ticketsService.addTags(id, body.add, tenantId);
    }
    if (body.remove?.length) {
      await this.ticketsService.removeTags(id, body.remove, tenantId);
    }
    return this.ticketsService.findOne(id, tenantId);
  }

  @Post(':id/notes')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Add a note to a ticket' })
  async addNote(
    @Param('id') id: string,
    @Body() body: { content: string; isPrivate?: boolean },
    @Req() req: any,
  ) {
    const userId = req?.user?.id;
    const tenantId = req?.user?.tenantId;
    return this.ticketsService.addNote(id, body.content, userId, tenantId, body.isPrivate ?? true);
  }

  @Get(':id/notes')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'List notes for a ticket' })
  async listNotes(
    @Param('id') id: string,
    @Query('limit') limit = '50',
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    const lim = Number(limit) || 50;
    return this.ticketsService.listNotes(id, tenantId, lim);
  }

  @Get(':id/watchers')
  @Roles('admin', 'agent')
  @Permissions('tickets.read')
  @ApiOperation({ summary: 'List watchers for a ticket' })
  async listWatchers(@Param('id') id: string, @Req() req: any) {
    const tenantId = req?.user?.tenantId as string;
    return this.ticketsService.listWatchers(id, tenantId);
  }

  @Post(':id/watchers')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Add a watcher to a ticket (defaults to current user)' })
  async addWatcher(
    @Param('id') id: string,
    @Body() body: { userId?: string },
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    const actorId = req?.user?.id as string;
    const targetUserId = body?.userId || actorId;
    return this.ticketsService.addWatcher(id, targetUserId, tenantId, actorId);
  }

  @Delete(':id/watchers/:userId')
  @Roles('admin', 'agent')
  @Permissions('tickets.update')
  @ApiOperation({ summary: 'Remove a watcher from a ticket' })
  async removeWatcher(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId as string;
    return this.ticketsService.removeWatcher(id, userId, tenantId);
  }
}