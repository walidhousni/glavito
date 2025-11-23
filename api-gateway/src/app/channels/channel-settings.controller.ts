import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@glavito/shared-auth';
import {
  ChannelSettingsService,
  type ChannelBranding,
} from './channel-settings.service';

@ApiTags('channel-settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('channels/settings')
export class ChannelSettingsController {
  constructor(private readonly channelSettings: ChannelSettingsService) {}

  @Get(':channelType/branding')
  @ApiOperation({ summary: 'Get channel-specific branding' })
  @Roles('admin', 'agent')
  async getChannelBranding(
    @Req() req: { user: { tenantId: string } },
    @Param('channelType') channelType: string,
  ) {
    const tenantId = req.user.tenantId;
    const branding = await this.channelSettings.getChannelBranding(
      tenantId,
      channelType,
    );
    return { success: true, data: branding };
  }

  @Put(':channelType/branding')
  @ApiOperation({ summary: 'Update channel-specific branding' })
  @Roles('admin')
  async updateChannelBranding(
    @Req() req: { user: { tenantId: string } },
    @Param('channelType') channelType: string,
    @Body() branding: ChannelBranding,
  ) {
    const tenantId = req.user.tenantId;
    const updated = await this.channelSettings.updateChannelBranding(
      tenantId,
      channelType,
      branding,
    );
    return { success: true, data: updated };
  }

  @Get(':channelType/analytics')
  @ApiOperation({ summary: 'Get channel analytics' })
  @Roles('admin', 'agent')
  async getChannelAnalytics(
    @Req() req: { user: { tenantId: string } },
    @Param('channelType') channelType: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const tenantId = req.user.tenantId;
    const dateRange = {
      from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      to: to ? new Date(to) : new Date(),
    };
    const analytics = await this.channelSettings.getChannelAnalytics(
      tenantId,
      channelType,
      dateRange,
    );
    return { success: true, data: analytics };
  }

  @Post('whatsapp/sync-templates')
  @ApiOperation({ summary: 'Sync WhatsApp templates from Meta' })
  @Roles('admin')
  async syncWhatsAppTemplates(@Req() req: { user: { tenantId: string } }) {
    const tenantId = req.user.tenantId;
    const result = await this.channelSettings.syncWhatsAppTemplates(tenantId);
    return { success: true, data: result };
  }
}

