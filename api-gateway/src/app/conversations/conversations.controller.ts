import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, Req, NotFoundException, Header } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ConversationsService } from './conversations.service';
import { Roles, Permissions, RolesGuard, PermissionsGuard } from '@glavito/shared-auth';

@ApiTags('Conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@ApiBearerAuth()
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @Roles('admin', 'agent')
  @Permissions('conversations.create')
  create(@Body() createConversationDto: any, @Req() req: any) {
    const tenantId = req?.user?.tenantId;
    return this.conversationsService.create({ ...createConversationDto, tenantId });
  }

  @Get()
  @Roles('admin', 'agent')
  @Permissions('conversations.read')
  @Header('Cache-Control', 'private, max-age=30')
  findAll(
    @Query('tenantId') tenantId?: string,
    @Query('ticketId') ticketId?: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('channelType') channelType?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.conversationsService.findAll({
      tenantId,
      ticketId,
      customerId,
      status,
      channelType,
      search,
      page,
      limit,
    });
  }

  @Get(':id')
  @Roles('admin', 'agent')
  @Permissions('conversations.read')
  async findOne(@Param('id') id: string, @Req() req: any) {
    const tenantId = req?.user?.tenantId;
    const item = await this.conversationsService.findOne(id);
    if (!item || (tenantId && item.tenantId !== tenantId)) {
      throw new NotFoundException('Conversation not found');
    }
    return item;
  }

  @Get(':id/messages')
  @Roles('admin', 'agent')
  @Permissions('conversations.read')
  @Header('Cache-Control', 'private, max-age=30')
  async findMessages(@Param('id') id: string, @Req() req: any) {
    const tenantId = req?.user?.tenantId;
    const item = await this.conversationsService.findOne(id);
    if (!item || (tenantId && item.tenantId !== tenantId)) {
      throw new NotFoundException('Conversation not found');
    }
    return this.conversationsService.findMessages(id);
  }

  @Patch(':id')
  @Roles('admin', 'agent')
  @Permissions('conversations.update')
  update(@Param('id') id: string, @Body() updateConversationDto: any) {
    return this.conversationsService.update(id, updateConversationDto);
  }

  @Delete(':id')
  @Roles('admin')
  @Permissions('conversations.delete')
  remove(@Param('id') id: string) {
    return this.conversationsService.remove(id);
  }
}