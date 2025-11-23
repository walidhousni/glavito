import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChannelsService } from './channels.service';

@ApiTags('Channels')
@Controller('channels')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(@Body() createChannelDto: any) {
    return this.channelsService.create(createChannelDto);
  }

  @Get()
  findAll(@Req() req: any) {
    const tenantId = req?.user?.tenantId;
    return this.channelsService.findAll(tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateChannelDto: any) {
    return this.channelsService.update(id, updateChannelDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.channelsService.remove(id);
  }

  @Get('whatsapp/templates')
  listWhatsAppTemplates() {
    return this.channelsService.listWhatsAppTemplates();
  }

  @Post('whatsapp/templates/refresh')
  refreshWhatsAppTemplates() {
    return this.channelsService.refreshWhatsAppTemplates();
  }

  @Post('whatsapp/test-send')
  testSendTemplate(@Body() body: { to: string; templateId: string; templateParams?: Record<string, string>; language?: string }) {
    return this.channelsService.testSendWhatsAppTemplate(body)
  }

  @Post('whatsapp/templates/create')
  createWhatsAppTemplate(@Body() body: {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;
    body: string;
    header?: string;
    footer?: string;
    buttons?: Array<{
      type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
      text?: string;
      url?: string;
      phoneNumber?: string;
    }>;
  }) {
    return this.channelsService.createWhatsAppTemplate(body);
  }
}