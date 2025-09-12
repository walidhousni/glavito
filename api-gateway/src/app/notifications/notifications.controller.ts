import { Body, Controller, Post, Get, Patch, Param, Delete, Query, Req, UseGuards } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for current user' })
  async list(@Req() req: any, @Query('onlyUnread') onlyUnread?: string) {
    const userId = req?.user?.id as string
    const tenantId = req?.user?.tenantId as string
    return this.svc.list(userId, tenantId, { onlyUnread: String(onlyUnread || '').toLowerCase() === 'true' })
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  async markRead(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id as string
    const tenantId = req?.user?.tenantId as string
    return this.svc.markRead(id, userId, tenantId)
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read for current user' })
  async markAllRead(@Req() req: any) {
    const userId = req?.user?.id as string
    const tenantId = req?.user?.tenantId as string
    return this.svc.markAllRead(userId, tenantId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification' })
  async remove(@Param('id') id: string, @Req() req: any) {
    const userId = req?.user?.id as string
    const tenantId = req?.user?.tenantId as string
    return this.svc.remove(id, userId, tenantId)
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all notifications for current user' })
  async clearAll(@Req() req: any) {
    const userId = req?.user?.id as string
    const tenantId = req?.user?.tenantId as string
    return this.svc.clearAll(userId, tenantId)
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  async getPreferences(@Req() req: any) {
    const userId = req?.user?.id as string
    const tenantId = req?.user?.tenantId as string
    return this.svc.getPreferences(userId, tenantId)
  }

  @Patch('preferences')
  @ApiOperation({ summary: 'Update notification preferences for current user' })
  async updatePreferences(@Req() req: any, @Body() body: { preferences: Record<string, unknown> } | Record<string, unknown>) {
    const userId = req?.user?.id as string
    const tenantId = req?.user?.tenantId as string
    const prefs = (body as any)?.preferences ?? body
    return this.svc.updatePreferences(userId, tenantId, prefs as Record<string, unknown>)
  }

  @Post('agent')
  async agent(@Body() body: { agentId: string; message: string }) {
    await this.svc.notifyAgent(body.agentId, body.message)
    return { success: true }
  }

  @Post('team')
  async team(@Body() body: { teamId: string; message: string }) {
    await this.svc.notifyTeam(body.teamId, body.message)
    return { success: true }
  }

  @Post('webhook')
  async webhook(@Body() body: { url: string; payload?: Record<string, unknown> }) {
    await this.svc.notifyWebhook(body.url, body.payload || {})
    return { success: true }
  }
}


