import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CallsService } from './calls.service';
import { CallsAnalyticsService } from './calls-analytics.service';
import { DatabaseService } from '@glavito/shared-database';
import { Roles, Permissions, RolesGuard, PermissionsGuard, CurrentTenant } from '@glavito/shared-auth';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(
    private readonly calls: CallsService,
    private readonly callsAnalytics: CallsAnalyticsService,
    private readonly db: DatabaseService
  ) {}

  @Post()
  @Roles('admin', 'agent')
  @Permissions('calls.start')
  async create(
    @Req() req: { user?: { id?: string; tenantId?: string } },
    @Body() body: { 
      conversationId?: string; 
      type: 'voice' | 'video'; 
      metadata?: Record<string, any>;
      customerId?: string;
      channelId?: string;
    }
  ) {
    const userId = String(req?.user?.id || '');
    const tenantId = String(req?.user?.tenantId || '');
    return this.calls.createCall({ 
      tenantId, 
      startedBy: userId, 
      conversationId: body.conversationId, 
      type: body.type, 
      metadata: body.metadata,
      customerId: body.customerId,
      channelId: body.channelId
    });
  }

  @Patch(':id/end')
  @Roles('admin', 'agent')
  @Permissions('calls.end')
  async end(@Param('id') id: string, @Body() body: { recordingUrl?: string; transcription?: string }) {
    return this.calls.endCall(id, body);
  }

  @Post('telephony/outbound')
  @Roles('admin', 'agent')
  @Permissions('calls.start')
  async startOutbound(
    @Req() req: { user?: { id?: string; tenantId?: string } },
    @Body() body: { to: string; from?: string; conversationId?: string; type?: 'voice' | 'video' }
  ) {
    const userId = String(req?.user?.id || '');
    const tenantId = String(req?.user?.tenantId || '');
    
    // Use startOutboundCall which creates the call record and initiates Twilio call
    const call = await this.calls.startOutboundCall({ 
      tenantId, 
      startedBy: userId, 
      to: body.to, 
      from: body.from 
    });
    
    // Update call with conversationId if provided
    if (body.conversationId && call.id) {
      await this.db.call.update({
        where: { id: call.id },
        data: { conversationId: body.conversationId },
      });
      return await this.calls.getCall(call.id);
    }
    
    return call;
  }

  @Get()
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async list(
    @Req() req: { user?: { tenantId?: string } },
    @Query('conversationId') conversationId?: string,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
  ) {
    const tenantId = req?.user?.tenantId as string;
    return this.calls.listCalls({ tenantId, conversationId, status, customerId });
  }

  @Get(':id')
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async get(@Param('id') id: string) {
    const call = await this.calls.getCall(id);
    // Optional: tenant scoping if needed; omitted for brevity
    return call;
  }

  @Post(':id/participants')
  @Roles('admin', 'agent')
  @Permissions('calls.start')
  async addParticipant(
    @Param('id') id: string,
    @Req() req: { user?: { id?: string } },
    @Body() body: { userId?: string; customerId?: string; role?: string }
  ) {
    const userId = body.userId || (req?.user?.id as string);
    return this.calls.addParticipant(id, { userId, customerId: body.customerId, role: body.role });
  }

  @Get('analytics/me')
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async analyticsMe(@CurrentTenant() tenantId: string) {
    const last7Days = {
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };
    return this.callsAnalytics.getCallAnalytics(tenantId, last7Days);
  }

  @Get('analytics/quality')
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async quality24h(@CurrentTenant() tenantId: string) {
    const last24h = {
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      endDate: new Date(),
    };
    return this.callsAnalytics.getCallQuality(tenantId, last24h);
  }

  @Get('analytics/trends')
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async trends(
    @CurrentTenant() tenantId: string,
    @Query('days') days?: string
  ) {
    const numDays = days ? parseInt(days, 10) : 7;
    return this.callsAnalytics.getCallTrends(tenantId, numDays);
  }

  @Get('analytics/breakdown')
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async breakdown(
    @CurrentTenant() tenantId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.callsAnalytics.getCallBreakdown(tenantId, dateRange);
  }

  @Get('analytics/agent/:agentId')
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async agentPerformance(
    @CurrentTenant() tenantId: string,
    @Param('agentId') agentId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const dateRange = {
      startDate: startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate: endDate ? new Date(endDate) : new Date(),
    };
    return this.callsAnalytics.getAgentCallPerformance(tenantId, agentId, dateRange);
  }
}



