/**
 * Internal Channels Controller
 * REST API for team collaboration rooms
 */

import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@glavito/shared-auth';
import { InternalChannelsService, CreateRoomRequest, CreateMessageRequest, AddReactionRequest } from './internal-channels.service';
import { CollabGateway } from '../collab/collab.gateway';

@ApiTags('internal-channels')
@ApiBearerAuth()
@Controller('teams/:teamId/rooms')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InternalChannelsController {
  constructor(
    private readonly service: InternalChannelsService,
    private readonly collabGateway: CollabGateway,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms for a team' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of rooms' })
  async getTeamRooms(@Request() req: any, @Param('teamId') teamId: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.service.getTeamRooms(tenantId, teamId, userId);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Room created' })
  async createRoom(
    @Request() req: any,
    @Param('teamId') teamId: string,
    @Body() body: CreateRoomRequest,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.service.createRoom(tenantId, teamId, userId, body);
  }

  @Get(':roomId/messages')
  @ApiOperation({ summary: 'Get messages for a room' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of messages' })
  async getRoomMessages(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: number,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.service.getRoomMessages(
      tenantId,
      roomId,
      userId,
      cursor,
      limit ? Number(limit) : 50,
    );
  }

  @Post(':roomId/messages')
  @ApiOperation({ summary: 'Create a message in a room' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Message created' })
  async createMessage(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Body() body: CreateMessageRequest,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    
    // Create message in database
    const message = await this.service.createMessage(tenantId, roomId, userId, body);
    
    // Broadcast via Socket.IO
    this.collabGateway.broadcastMessageCreated(roomId, message);

    // Send mention notifications if any
    if (body.mentions && body.mentions.length > 0) {
      body.mentions.forEach((mentionedUserId) => {
        this.collabGateway.notifyMention(mentionedUserId, {
          type: 'message_mention',
          channelId: roomId,
          messageId: message.id,
          from: {
            id: userId,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
          },
          content: message.content,
        });
      });
    }

    return message;
  }

  @Post(':roomId/messages/:messageId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or remove reaction to a message' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reaction toggled' })
  async addReaction(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
    @Body() body: AddReactionRequest,
  ) {
    const userId = req.user.id;
    const result = await this.service.addReaction(messageId, userId, body);

    // Broadcast reaction change
    const room = `team:${roomId}`;
    if (result.action === 'added') {
      this.collabGateway.broadcastReactionAdded(room, {
        messageId,
        ...result.reaction,
      });
    } else {
      this.collabGateway.broadcastReactionRemoved(room, result.reactionId, messageId);
    }

    return result;
  }

  @Delete(':roomId/messages/:messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a message' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Message deleted' })
  async deleteMessage(
    @Request() req: any,
    @Param('roomId') roomId: string,
    @Param('messageId') messageId: string,
  ) {
    const userId = req.user.id;
    await this.service.deleteMessage(messageId, userId);

    // Broadcast deletion
    const room = `team:${roomId}`;
    this.collabGateway.server.to(room).emit('message_deleted', {
      channelId: roomId,
      messageId,
    });
  }
}

