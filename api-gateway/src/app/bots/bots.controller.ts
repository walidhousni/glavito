import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@glavito/shared-auth';
import { BotsService } from './bots.service';
import { AutopilotProcessorService } from './autopilot-processor.service';

@ApiTags('bots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bots')
export class BotsController {
  constructor(private readonly bots: BotsService, private readonly autopilot: AutopilotProcessorService) {}

  @Get('agents')
  @ApiOperation({ summary: 'List bot agents' })
  @Roles('admin')
  listAgents(@Req() req: any) {
    const tenantId = req.user?.tenantId as string;
    return this.bots.listAgents(tenantId);
  }

  @Post('autopilot/test')
  @ApiOperation({ summary: 'Test autopilot reply for a conversation (draft or auto)' })
  @Roles('admin')
  async autopilotTest(
    @Req() req: any,
    @Body() body: { conversationId: string; content: string; previousMessages?: string[]; mode?: 'draft'|'auto'; minConfidence?: number; channelType?: string }
  ) {
    const tenantId = req.user?.tenantId as string;
    const mode = (body.mode || 'draft') as 'draft'|'auto';
    return this.autopilot.process({
      tenantId,
      conversationId: body.conversationId,
      content: body.content,
      previousMessages: body.previousMessages || [],
      channelType: body.channelType,
      mode,
      minConfidence: body.minConfidence,
    });
  }

  @Post('autopilot/approve')
  @ApiOperation({ summary: 'Approve a draft message and send it' })
  @Roles('admin')
  async approveDraft(
    @Req() req: any,
    @Body() body: { conversationId: string; messageId: string }
  ) {
    const tenantId = req.user?.tenantId as string;
    // Promote draft message content to outbound via orchestrator
    const db = (this.bots as any)['db'] as { message: { findUnique: Function } } | undefined;
    if (!db) return { success: false, error: 'service_unavailable' };
    const draft = await (db as any).message.findUnique({ where: { id: body.messageId } }).catch(() => null);
    if (!draft || !(draft.metadata as any)?.draft) return { success: false, error: 'not_draft' };
    const orchestrator = (this.autopilot as any)['orchestrator'];
    if (!orchestrator) return { success: false, error: 'orchestrator_unavailable' };
    const res = await orchestrator.sendMessage(body.conversationId, { content: draft.content, messageType: draft.messageType || 'text' } as any, tenantId, req.user?.id || 'bot');
    return res;
  }

  @Post('agents')
  @ApiOperation({ summary: 'Create bot agent' })
  @Roles('admin')
  createAgent(@Req() req: any, @Body() body: { name: string; description?: string; operatingMode?: 'draft' | 'auto'; minConfidence?: number; allowedChannels?: string[]; guardrails?: Record<string, unknown> }) {
    const tenantId = req.user?.tenantId as string;
    return this.bots.createAgent(tenantId, body);
  }

  @Patch('agents/:id/activate')
  @ApiOperation({ summary: 'Activate or deactivate a bot agent' })
  @Roles('admin')
  activateAgent(@Req() req: any, @Param('id') id: string, @Body() body: { active: boolean }) {
    const tenantId = req.user?.tenantId as string;
    return this.bots.activateAgent(tenantId, id, !!body.active);
  }

  @Post('bindings')
  @ApiOperation({ summary: 'Bind an agent to a channel' })
  @Roles('admin')
  bindToChannel(@Req() req: any, @Body() body: { agentId: string; channelId: string; channelType: string; routingHints?: Record<string, unknown>; isEnabled?: boolean }) {
    const tenantId = req.user?.tenantId as string;
    return this.bots.bindAgent(tenantId, body);
  }

  @Get('bindings')
  @ApiOperation({ summary: 'List agent-channel bindings' })
  @Roles('admin')
  listBindings(@Req() req: any) {
    const tenantId = req.user?.tenantId as string;
    return this.bots.listBindings(tenantId);
  }
}


