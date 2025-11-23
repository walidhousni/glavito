import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AdvancedEventBusService } from '@glavito/shared-kafka';
import { Prisma } from '@prisma/client';

export interface EmojiReaction {
  emoji: string;
  userId: string;
  userName?: string;
  timestamp: string;
}

export interface AddReactionDto {
  messageId: string;
  emoji: string;
  userId: string;
  userName?: string;
}

export interface RemoveReactionDto {
  messageId: string;
  emoji: string;
  userId: string;
}

export interface CreateInternalNoteDto {
  conversationId: string;
  authorId: string;
  content: string;
  mentions?: string[];
  isPinned?: boolean;
  parentNoteId?: string;
}

export interface UpdateInternalNoteDto {
  content?: string;
  mentions?: string[];
  isPinned?: boolean;
}

/**
 * MessageFeaturesService centralizes emoji reactions, internal notes, and other message-related features
 */
@Injectable()
export class MessageFeaturesService {
  private readonly logger = new Logger(MessageFeaturesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: AdvancedEventBusService
  ) {}

  // ==================== EMOJI REACTIONS ====================

  /**
   * Add an emoji reaction to a message
   */
  async addReaction(dto: AddReactionDto): Promise<EmojiReaction[]> {
    const { messageId, emoji, userId, userName } = dto;

    try {
      const message = await this.prisma.messageAdvanced.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      // Parse existing reactions
      const reactions: EmojiReaction[] = message.reactions 
        ? (JSON.parse(JSON.stringify(message.reactions)) as EmojiReaction[])
        : [];

      // Check if user already reacted with this emoji
      const existingIndex = reactions.findIndex(
        (r) => r.userId === userId && r.emoji === emoji
      );

      if (existingIndex >= 0) {
        // User already reacted with this emoji, don't add duplicate
        return reactions;
      }

      // Add new reaction
      const newReaction: EmojiReaction = {
        emoji,
        userId,
        userName,
        timestamp: new Date().toISOString(),
      };

      reactions.push(newReaction);

      // Update message
      await this.prisma.messageAdvanced.update({
        where: { id: messageId },
        data: { reactions: reactions as unknown as Prisma.InputJsonValue },
      });

      this.logger.log(`Added reaction ${emoji} to message ${messageId} by user ${userId}`);

      // Publish event
      await this.eventBus.publish({
        eventType: 'message.reaction.added',
        eventId: messageId,
        aggregateId: message.conversationId,
        aggregateType: 'message',
        tenantId: '',
        timestamp: new Date(),
        version: '1.0',
        eventData: {
          messageId,
          conversationId: message.conversationId,
          reaction: newReaction,
        },
        metadata: {
          source: 'message-features-service',
        },
      });

      return reactions;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to add reaction: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Remove an emoji reaction from a message
   */
  async removeReaction(dto: RemoveReactionDto): Promise<EmojiReaction[]> {
    const { messageId, emoji, userId } = dto;

    try {
      const message = await this.prisma.messageAdvanced.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new NotFoundException(`Message ${messageId} not found`);
      }

      // Parse existing reactions
      const reactions: EmojiReaction[] = message.reactions 
        ? (JSON.parse(JSON.stringify(message.reactions)) as EmojiReaction[])
        : [];

      // Remove the reaction
      const updatedReactions = reactions.filter(
        (r) => !(r.userId === userId && r.emoji === emoji)
      );

      // Update message
      await this.prisma.messageAdvanced.update({
        where: { id: messageId },
        data: { reactions: updatedReactions as unknown as Prisma.InputJsonValue },
      });

      this.logger.log(`Removed reaction ${emoji} from message ${messageId} by user ${userId}`);

      // Publish event
      await this.eventBus.publish({
        eventType: 'message.reaction.removed',
        eventId: messageId,
        aggregateId: message.conversationId,
        aggregateType: 'message',
        tenantId: '',
        timestamp: new Date(),
        version: '1.0',
        eventData: {
          messageId,
          conversationId: message.conversationId,
          emoji,
          userId,
        },
        metadata: {
          source: 'message-features-service',
        },
      });

      return updatedReactions;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to remove reaction: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get all reactions for a message
   */
  async getReactions(messageId: string): Promise<EmojiReaction[]> {
    const message = await this.prisma.messageAdvanced.findUnique({
      where: { id: messageId },
      select: { reactions: true },
    });

    if (!message) {
      throw new NotFoundException(`Message ${messageId} not found`);
    }

      return (message.reactions ? JSON.parse(JSON.stringify(message.reactions)) : []) as EmojiReaction[];
  }

  // ==================== INTERNAL NOTES ====================

  /**
   * Create an internal note for a conversation
   */
  async createInternalNote(dto: CreateInternalNoteDto) {
    const { conversationId, authorId, content, mentions, isPinned, parentNoteId } = dto;

    try {
      const note = await this.prisma.conversationNote.create({
        data: {
          conversationId,
          authorId,
          content,
          isPrivate: true,
          mentions: mentions || [],
          isPinned: isPinned || false,
          parentNoteId,
        },
      });

      this.logger.log(`Created internal note ${note.id} for conversation ${conversationId}`);

      // Publish event
      await this.eventBus.publish({
        eventType: 'conversation.note.created',
        eventId: note.id,
        aggregateId: conversationId,
        aggregateType: 'conversation',
        tenantId: '',
        timestamp: new Date(),
        version: '1.0',
        eventData: {
          noteId: note.id,
          conversationId,
          authorId,
          mentions,
        },
        metadata: {
          source: 'message-features-service',
        },
      });

      // If there are mentions, publish notification events
      if (mentions && mentions.length > 0) {
        for (const mentionedUserId of mentions) {
          await this.eventBus.publish({
            eventType: 'user.mentioned',
            eventId: `${note.id}-${mentionedUserId}`,
            aggregateId: conversationId,
            aggregateType: 'conversation',
            tenantId: '',
            timestamp: new Date(),
            version: '1.0',
            eventData: {
              mentionedUserId,
              conversationId,
              noteId: note.id,
              authorId,
            },
            metadata: {
              source: 'message-features-service',
            },
          });
        }
      }

      return note;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to create internal note: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Update an internal note
   */
  async updateInternalNote(noteId: string, dto: UpdateInternalNoteDto) {
    try {
      const note = await this.prisma.conversationNote.update({
        where: { id: noteId },
        data: {
          ...(dto.content !== undefined && { content: dto.content }),
          ...(dto.mentions !== undefined && { mentions: dto.mentions }),
          ...(dto.isPinned !== undefined && { isPinned: dto.isPinned }),
        },
      });

      this.logger.log(`Updated internal note ${noteId}`);

      // Publish event
      await this.eventBus.publish({
        eventType: 'conversation.note.updated',
        eventId: noteId,
        aggregateId: note.conversationId,
        aggregateType: 'conversation',
        tenantId: '',
        timestamp: new Date(),
        version: '1.0',
        eventData: {
          noteId,
          conversationId: note.conversationId,
        },
        metadata: {
          source: 'message-features-service',
        },
      });

      return note;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to update internal note: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Delete an internal note
   */
  async deleteInternalNote(noteId: string) {
    try {
      const note = await this.prisma.conversationNote.delete({
        where: { id: noteId },
      });

      this.logger.log(`Deleted internal note ${noteId}`);

      // Publish event
      await this.eventBus.publish({
        eventType: 'conversation.note.deleted',
        eventId: noteId,
        aggregateId: note.conversationId,
        aggregateType: 'conversation',
        tenantId: '',
        timestamp: new Date(),
        version: '1.0',
        eventData: {
          noteId,
          conversationId: note.conversationId,
        },
        metadata: {
          source: 'message-features-service',
        },
      });

      return note;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to delete internal note: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Get all internal notes for a conversation
   */
  async getInternalNotes(conversationId: string, options?: { pinnedOnly?: boolean }) {
    const where: Record<string, unknown> = {
      conversationId,
      isPrivate: true,
    };

    if (options?.pinnedOnly) {
      where['isPinned'] = true;
    }

    const notes = await this.prisma.conversationNote.findMany({
      where,
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' },
      ],
    });

    return notes;
  }

  /**
   * Add a reaction to an internal note
   */
  async addNoteReaction(noteId: string, dto: AddReactionDto): Promise<EmojiReaction[]> {
    const { emoji, userId, userName } = dto;

    try {
      const note = await this.prisma.conversationNote.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        throw new NotFoundException(`Note ${noteId} not found`);
      }

      // Parse existing reactions
      const reactions: EmojiReaction[] = (note.reactions ? JSON.parse(JSON.stringify(note.reactions)) : []) as EmojiReaction[];

      // Check if user already reacted with this emoji
      const existingIndex = reactions.findIndex(
        (r) => r.userId === userId && r.emoji === emoji
      );

      if (existingIndex >= 0) {
        return reactions;
      }

      // Add new reaction
      const newReaction: EmojiReaction = {
        emoji,
        userId,
        userName,
        timestamp: new Date().toISOString(),
      };

      reactions.push(newReaction);

      // Update note
      await this.prisma.conversationNote.update({
        where: { id: noteId },
        data: { reactions: reactions as unknown as Prisma.InputJsonValue },
      });

      this.logger.log(`Added reaction ${emoji} to note ${noteId} by user ${userId}`);

      return reactions;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to add note reaction: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Pin/unpin an internal note
   */
  async toggleNotePin(noteId: string): Promise<boolean> {
    try {
      const note = await this.prisma.conversationNote.findUnique({
        where: { id: noteId },
      });

      if (!note) {
        throw new NotFoundException(`Note ${noteId} not found`);
      }

      const newPinnedState = !note.isPinned;

      await this.prisma.conversationNote.update({
        where: { id: noteId },
        data: { isPinned: newPinnedState },
      });

      this.logger.log(`Toggled pin for note ${noteId} to ${newPinnedState}`);

      return newPinnedState;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to toggle note pin: ${err.message}`, err.stack);
      throw error;
    }
  }
}

