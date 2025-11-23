import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Logger
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TicketsService } from './tickets.service';
import { AIAnalysisService } from './ai-analysis.service';
import { SearchService } from './search.service';
import type {
  Ticket,
  CreateTicketRequest,
  UpdateTicketRequest,
  TicketFilters,
  PaginationParams,
  AnalyzeTicketRequest,
  AnalyzeTicketResponse,
  SearchTicketsRequest,
  SearchTicketsResponse,
  TimelineEventRequest,
  CollaborationEvent
} from '@glavito/shared-types';

@Controller('tickets')
@UseGuards(JwtAuthGuard)
export class EnhancedTicketsController {
  private readonly logger = new Logger(EnhancedTicketsController.name);

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly aiAnalysisService: AIAnalysisService,
    private readonly searchService: SearchService
  ) {}

  // Enhanced ticket creation with AI analysis
  @Post()
  async create(@Body() createTicketDto: CreateTicketRequest): Promise<Ticket> {
    const ticket = await this.ticketsService.create(createTicketDto);
    
    // Trigger AI analysis for new ticket
    try {
      await this.aiAnalysisService.analyzeTicket({
        ticketId: ticket.id,
        content: ticket.description || '',
        includeClassification: true,
        includeSentiment: true,
        includePriority: true,
        includeSuggestions: true
      });
    } catch (error) {
      this.logger.warn(`AI analysis failed for ticket ${ticket.id}:`, error);
    }

    return ticket;
  }

  // AI-powered ticket analysis
  @Post(':id/analyze')
  async analyzeTicket(
    @Param('id') id: string,
    @Body() analyzeRequest: Omit<AnalyzeTicketRequest, 'ticketId'>
  ): Promise<AnalyzeTicketResponse> {
    const ticket = await this.ticketsService.findOne(id);
    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return this.aiAnalysisService.analyzeTicket({
      ...analyzeRequest,
      ticketId: id,
      content: ticket.description || ''
    });
  }

  // AI-powered semantic search
  @Post('search')
  async searchTickets(@Body() searchRequest: SearchTicketsRequest): Promise<SearchTicketsResponse> {
    return this.searchService.searchTickets(searchRequest);
  }

  // Get AI analysis history for a ticket
  @Get(':id/analysis-history')
  async getAnalysisHistory(@Param('id') id: string) {
    return this.aiAnalysisService.getAnalysisHistory(id);
  }

  // Get AI-powered response suggestions
  @Get(':id/response-suggestions')
  async getResponseSuggestions(@Param('id') id: string) {
    return this.aiAnalysisService.generateResponseSuggestions(id);
  }

  // Get knowledge base suggestions
  @Get(':id/knowledge-suggestions')
  async getKnowledgeSuggestions(@Param('id') id: string) {
    return this.aiAnalysisService.getKnowledgeBaseSuggestions(id);
  }

  // Add timeline event
  @Post(':id/timeline')
  async addTimelineEvent(
    @Param('id') id: string,
    @Body() eventRequest: Omit<TimelineEventRequest, 'ticketId'>
  ) {
    // Mock implementation - replace with actual timeline service
    this.logger.log(`Timeline event added for ticket ${id}:`, eventRequest);
    return {
      id: `timeline_${Date.now()}`,
      ticketId: id,
      ...eventRequest,
      createdAt: new Date()
    };
  }

  // Handle collaboration events
  @Post(':id/collaboration')
  async handleCollaborationEvent(
    @Param('id') id: string,
    @Body() collaborationEvent: Omit<CollaborationEvent, 'ticketId'>
  ) {
    // Mock implementation - replace with actual collaboration service
    this.logger.log(`Collaboration event for ticket ${id}:`, collaborationEvent);
    return {
      success: true,
      event: {
        ...collaborationEvent,
        ticketId: id,
        timestamp: new Date()
      }
    };
  }

  // Standard CRUD operations (delegated to existing service)
  @Get()
  async findAll(
    @Query() filters: TicketFilters,
    @Query() pagination: PaginationParams
  ): Promise<Ticket[]> {
    return this.ticketsService.findAll(filters, pagination);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTicketDto: UpdateTicketRequest
  ): Promise<Ticket> {
    const updatedTicket = await this.ticketsService.update(id, updateTicketDto);
    
    // Trigger re-analysis if content changed
    if (updateTicketDto.description) {
      try {
        await this.aiAnalysisService.analyzeTicket({
          ticketId: id,
          content: updateTicketDto.description,
          includeClassification: true,
          includeSentiment: true
        });
      } catch (error) {
        this.logger.warn(`AI re-analysis failed for ticket ${id}:`, error);
      }
    }

    return updatedTicket;
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    return this.ticketsService.remove(id);
  }

  @Patch(':id/assign')
  async assign(
    @Param('id') id: string,
    @Body() assignDto: { agentId: string }
  ): Promise<Ticket> {
    return this.ticketsService.assign(id, assignDto.agentId);
  }

  @Patch(':id/resolve')
  async resolve(@Param('id') id: string): Promise<Ticket> {
    return this.ticketsService.resolve(id);
  }
}