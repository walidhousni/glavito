import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CollaborationService } from './collaboration.service';

@ApiTags('collaboration')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collaboration')
export class CollaborationController {
  constructor(private readonly collaborationService: CollaborationService) {}

  @Get('channels')
  @ApiOperation({ summary: 'List internal channels' })
  async list(@Req() req: any) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.listChannels(tenantId);
  }

  @Post('channels')
  @ApiOperation({ summary: 'Create internal channel' })
  async create(@Req() req: any, @Body() body: { name: string; type: string; teamId?: string }) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.collaborationService.createChannel(tenantId, userId, body);
  }

  @Post('channels/:id/join')
  @ApiOperation({ summary: 'Join a channel' })
  async join(@Req() req: any, @Param('id') id: string) {
    const userId = req.user?.id as string;
    return this.collaborationService.joinChannel(userId, id);
  }

  @Get('channels/:id/messages')
  @ApiOperation({ summary: 'List channel messages' })
  async listMessages(@Req() req: any, @Param('id') id: string, @Query('limit') limit?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.listMessages(tenantId, id, limit ? parseInt(limit, 10) : 50);
  }

  @Post('channels/:id/messages')
  @ApiOperation({ summary: 'Post channel message' })
  async postMessage(@Req() req: any, @Param('id') id: string, @Body() body: { content: string }) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.collaborationService.postMessage(tenantId, userId, id, body.content);
  }

  @Get('users')
  @ApiOperation({ summary: 'Search users for @mentions' })
  async users(@Req() req: any, @Query('q') q = '') {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.listUsersForMentions(tenantId, q);
  }

  // Shifts
  @Post('shifts')
  @ApiOperation({ summary: 'Create shift (team or user)' })
  async createShift(
    @Req() req: any,
    @Body() body: { teamId?: string; userId?: string; title?: string; startTime: string; endTime: string; timezone?: string }
  ) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.createShift(tenantId, body);
  }

  @Get('shifts')
  @ApiOperation({ summary: 'List shifts (by date/team/user)' })
  async listShifts(
    @Req() req: any,
    @Query('teamId') teamId?: string,
    @Query('userId') userId?: string,
    @Query('date') date?: string,
  ) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.listShifts(tenantId, { teamId, userId, date });
  }

  @Get('coverage')
  @ApiOperation({ summary: 'Coverage by team for a day' })
  async coverage(@Req() req: any, @Query('date') date?: string) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.coverageByTeam(tenantId, date);
  }

  // Participants & DMs
  @Get('channels/:id/participants')
  @ApiOperation({ summary: 'List channel participants' })
  async participants(@Req() req: any, @Param('id') id: string) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.listParticipants(tenantId, id);
  }

  @Post('channels/:id/participants')
  @ApiOperation({ summary: 'Add channel participant' })
  async addParticipant(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { userId: string; role?: string }
  ) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.addParticipant(tenantId, id, body.userId, body.role);
  }

  @Post('channels/:id/participants/remove')
  @ApiOperation({ summary: 'Remove channel participant' })
  async removeParticipant(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { userId: string }
  ) {
    const tenantId = req.user?.tenantId as string;
    return this.collaborationService.removeParticipant(tenantId, id, body.userId);
  }

  @Post('dm')
  @ApiOperation({ summary: 'Create or return a DM channel with another user' })
  async createDM(@Req() req: any, @Body() body: { otherUserId: string }) {
    const tenantId = req.user?.tenantId as string;
    const userId = req.user?.id as string;
    return this.collaborationService.createDM(tenantId, userId, body.otherUserId);
  }
}


