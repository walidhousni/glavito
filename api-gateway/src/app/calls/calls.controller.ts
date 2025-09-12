import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CallsService } from './calls.service';
import { Roles, Permissions, RolesGuard, PermissionsGuard } from '@glavito/shared-auth';

@ApiTags('Calls')
@Controller('calls')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class CallsController {
  constructor(private readonly calls: CallsService) {}

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
    @Body() body: { to: string; from?: string }
  ) {
    const userId = String(req?.user?.id || '');
    const tenantId = String(req?.user?.tenantId || '');
    return this.calls.startOutboundCall({ tenantId, startedBy: userId, to: body.to, from: body.from });
  }

  @Get()
  @Roles('admin', 'agent')
  @Permissions('calls.read')
  async list(
    @Req() req: { user?: { tenantId?: string } },
    @Query('conversationId') conversationId?: string,
    @Query('status') status?: string,
  ) {
    const tenantId = req?.user?.tenantId as string;
    return this.calls.listCalls({ tenantId, conversationId, status });
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
}



