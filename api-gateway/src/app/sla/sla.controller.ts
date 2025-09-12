import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SLAService } from './sla.service';
import { CreateSLAPolicyDto, UpdateSLAPolicyDto, SLAQueryDto, TicketEventDto } from './dto/sla.dto';
import { CurrentUser } from '@glavito/shared-auth';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('SLA')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('sla')
export class SLAController {
  constructor(private readonly slaService: SLAService) { }

  @Post('policies')
  @ApiOperation({ summary: 'Create a new SLA policy' })
  @ApiResponse({ status: 201, description: 'SLA policy created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createPolicy(@Body() createSLAPolicyDto: CreateSLAPolicyDto, @CurrentUser() user: any) {
    return this.slaService.createPolicy({ ...createSLAPolicyDto, tenantId: user.tenantId });
  }

  @Get('policies')
  @ApiOperation({ summary: 'Get all SLA policies' })
  @ApiResponse({ status: 200, description: 'List of SLA policies' })
  async getPolicies(@Query() query: SLAQueryDto) {
    return this.slaService.getPolicies(query);
  }

  @Get('policies/:id')
  @ApiOperation({ summary: 'Get a specific SLA policy' })
  @ApiResponse({ status: 200, description: 'SLA policy details' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async getPolicy(@Param('id') id: string) {
    return this.slaService.getPolicy(id);
  }

  @Put('policies/:id')
  @ApiOperation({ summary: 'Update an SLA policy' })
  @ApiResponse({ status: 200, description: 'SLA policy updated successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async updatePolicy(
    @Param('id') id: string,
    @Body() updateSLAPolicyDto: UpdateSLAPolicyDto,
    @CurrentUser() user: unknown
  ) {
    return this.slaService.updatePolicy(id, updateSLAPolicyDto, user.tenantId);
  }

  @Delete('policies/:id')
  @ApiOperation({ summary: 'Delete an SLA policy' })
  @ApiResponse({ status: 200, description: 'SLA policy deleted successfully' })
  @ApiResponse({ status: 404, description: 'Policy not found' })
  async deletePolicy(@Param('id') id: string) {
    return this.slaService.deletePolicy(id);
  }

  @Post('instances')
  @ApiOperation({ summary: 'Create a new SLA instance for a ticket' })
  @ApiResponse({ status: 201, description: 'SLA instance created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  async createInstance(
    @Body('slaId') slaId: string,
    @Body('ticketId') ticketId: string
  ) {
    return this.slaService.createInstance(slaId, ticketId);
  }

  @Get('instances')
  @ApiOperation({ summary: 'Get all SLA instances' })
  @ApiResponse({ status: 200, description: 'List of SLA instances' })
  async getInstances(@Query() query: SLAQueryDto) {
    return this.slaService.getInstances(query);
  }

  @Get('instances/:id')
  @ApiOperation({ summary: 'Get a specific SLA instance' })
  @ApiResponse({ status: 200, description: 'SLA instance details' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async getInstance(@Param('id') id: string) {
    return this.slaService.getInstance(id);
  }

  @Post('instances/:id/events')
  @ApiOperation({ summary: 'Handle ticket events for SLA tracking' })
  @ApiResponse({ status: 200, description: 'Event processed successfully' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async handleTicketEvent(
    @Param('id') id: string,
    @Body() event: TicketEventDto
  ) {
    return this.slaService.handleTicketEvent(id, event);
  }

  @Post('events/ticket/:ticketId')
  @ApiOperation({ summary: 'Handle ticket events by ticket ID' })
  @ApiResponse({ status: 200, description: 'Event processed successfully' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async handleTicketEventByTicketId(
    @Param('ticketId') ticketId: string,
    @Body() event: TicketEventDto
  ) {
    return this.slaService.handleTicketEvent(ticketId, event);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get SLA metrics and analytics' })
  @ApiResponse({ status: 200, description: 'SLA metrics data' })
  async getMetrics(@Query() query: SLAQueryDto) {
    return this.slaService.getMetrics(query);
  }

  @Post('check-breaches')
  @ApiOperation({ summary: 'Check for SLA breaches' })
  @ApiResponse({ status: 200, description: 'Breach check completed' })
  async checkBreaches() {
    return this.slaService.checkSLABreaches();
  }

  @Get('policy-by-ticket/:ticketId')
  @ApiOperation({ summary: 'Get applicable SLA policy for a ticket' })
  @ApiResponse({ status: 200, description: 'SLA policy details' })
  @ApiResponse({ status: 404, description: 'Ticket not found' })
  async getPolicyByTicket(@Param('ticketId') ticketId: string) {
    return this.slaService.getPolicyByTicket(ticketId);
  }

  @Get('policies/:id/instances')
  @ApiOperation({ summary: 'Get all instances for a specific SLA policy' })
  @ApiResponse({ status: 200, description: 'List of SLA instances' })
  async getPolicyInstances(
    @Param('id') policyId: string,
    @Query() query: SLAQueryDto
  ) {
    const queryWithPolicy = { ...query, slaId: policyId };
    return this.slaService.getInstances(queryWithPolicy);
  }

  @Get('ticket/:ticketId/instance')
  @ApiOperation({ summary: 'Get SLA instance for a specific ticket' })
  @ApiResponse({ status: 200, description: 'SLA instance details' })
  @ApiResponse({ status: 404, description: 'Instance not found' })
  async getTicketInstance(@Param('ticketId') ticketId: string) {
    return this.slaService.getSLAInstanceByTicket(ticketId);
  }
}