/**
 * Internal Channels Service
 * Handles team collaboration rooms and messages
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface CreateRoomRequest {
  name: string;
  description?: string;
  participantIds: string[];
}

export interface CreateMessageRequest {
  content: string;
  mentions?: string[];
}

export interface AddReactionRequest {
  emoji: string;
}

@Injectable()
export class InternalChannelsService {
  private readonly logger = new Logger(InternalChannelsService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all rooms for a team
   */
  async getTeamRooms(tenantId: string, teamId: string, userId: string): Promise<any[]> {
    // Verify user is team member
    const member = await this.db.teamMember.findFirst({
      where: {
        teamId,
        userId,
        isActive: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this team');
    }

    const channels = await this.db.internalChannel.findMany({
      where: {
        tenantId,
        participants: {
          some: {
            userId,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return channels.map((channel) => ({
      id: channel.id,
      name: channel.name,
      description: channel.description,
      createdBy: channel.createdBy,
      participants: channel.participants.map((p: any) => p.user),
      messageCount: channel._count.messages,
      createdAt: channel.createdAt,
    }));
  }

  /**
   * Create a new room
   */
  async createRoom(
    tenantId: string,
    teamId: string,
    userId: string,
    request: CreateRoomRequest,
  ) {
    // Verify user is team member
    const member = await this.db.teamMember.findFirst({
      where: {
        teamId,
        userId,
        isActive: true,
      },
    });

    if (!member) {
      throw new ForbiddenException('Not a member of this team');
    }

    // Create channel
    const channel = await this.db.internalChannel.create({
      data: {
        tenantId,
        name: request.name,
        description: request.description,
        type: 'team',
        createdById: userId,
        participants: {
          create: [
            // Add creator
            { userId },
            // Add other participants
            ...request.participantIds
              .filter((id) => id !== userId)
              .map((participantId) => ({ userId: participantId })),
          ],
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    this.logger.log(`Room created: ${channel.id} by user ${userId}`);

    return {
      id: channel.id,
      name: channel.name,
      description: channel.description,
      createdBy: channel.createdBy,
      participants: channel.participants.map((p: any) => p.user),
      createdAt: channel.createdAt,
    };
  }

  /**
   * Get messages for a room with pagination
   */
  async getRoomMessages(
    tenantId: string,
    channelId: string,
    userId: string,
    cursor?: string,
    limit = 50,
  ): Promise<{ items: any[]; nextCursor: string | null; hasMore: boolean }> {
    // Verify user is participant
    const participant = await this.db.internalChannelParticipant.findFirst({
      where: {
        channelId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a participant in this room');
    }

    const messages = await this.db.internalMessage.findMany({
      where: {
        channelId,
        ...(cursor ? { id: { lt: cursor } } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit + 1, // Take one extra to check if there are more
    });

    // Fetch reactions separately
    const messageIds = messages.map(m => m.id);
    const reactions = await this.db.roomMessageReaction.findMany({
      where: {
        messageId: { in: messageIds },
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Group reactions by message ID
    const reactionsByMessage = reactions.reduce((acc: Record<string, any[]>, reaction: any) => {
      if (!acc[reaction.messageId]) {
        acc[reaction.messageId] = [];
      }
      acc[reaction.messageId].push(reaction);
      return acc;
    }, {} as Record<string, any[]>);

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;

    // Attach reactions to messages
    const itemsWithReactions = items.map(message => ({
      ...message,
      reactions: reactionsByMessage[message.id] || [],
    }));

    return {
      items: itemsWithReactions.reverse(), // Reverse to show oldest first
      nextCursor: hasMore ? items[items.length - 1].id : null,
      hasMore,
    };
  }

  /**
   * Create a message in a room
   */
  async createMessage(
    tenantId: string,
    channelId: string,
    userId: string,
    request: CreateMessageRequest,
  ) {
    // Verify user is participant
    const participant = await this.db.internalChannelParticipant.findFirst({
      where: {
        channelId,
        userId,
      },
    });

    if (!participant) {
      throw new ForbiddenException('Not a participant in this room');
    }

    const message = await this.db.internalMessage.create({
      data: {
        channelId,
        senderId: userId,
        content: request.content,
        mentions: request.mentions || [],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    this.logger.log(`Message created: ${message.id} in channel ${channelId}`);

    return message;
  }

  /**
   * Add reaction to a message
   */
  async addReaction(
    messageId: string,
    userId: string,
    request: AddReactionRequest,
  ) {
    // Verify message exists and user has access
    const message = await this.db.internalMessage.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            participants: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.channel.participants.length === 0) {
      throw new ForbiddenException('Not a participant in this room');
    }

    // Check if reaction already exists
    const existing = await this.db.roomMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji: request.emoji,
        },
      },
    });

    if (existing) {
      // Remove existing reaction (toggle)
      await this.db.roomMessageReaction.delete({
        where: { id: existing.id },
      });
      return { action: 'removed', reactionId: existing.id };
    }

    // Add new reaction
    const reaction = await this.db.roomMessageReaction.create({
      data: {
        messageId,
        userId,
        emoji: request.emoji,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return { action: 'added', reaction };
  }

  /**
   * Soft delete a message (mark as deleted)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await this.db.internalMessage.findUnique({
      where: { id: messageId },
      include: {
        channel: {
          include: {
            participants: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId && message.channel.participants.length === 0) {
      throw new ForbiddenException('Cannot delete this message');
    }

    // Soft delete by updating content
    await this.db.internalMessage.update({
      where: { id: messageId },
      data: {
        content: '[Message deleted]',
      },
    });

    this.logger.log(`Message deleted: ${messageId} by user ${userId}`);

    return { success: true };
  }
}

