/**
 * Ticket Collaboration Service
 * Handles notes, reactions, and checklists for tickets
 */

import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';

export interface CreateNoteRequest {
  content: string;
  isPrivate?: boolean;
}

export interface UpdateNoteRequest {
  content: string;
}

export interface AddNoteReactionRequest {
  emoji: string;
}

export interface CreateSubtaskRequest {
  title: string;
  assigneeId?: string;
  dueDate?: string;
}

export interface UpdateSubtaskRequest {
  title?: string;
  isDone?: boolean;
  assigneeId?: string;
  dueDate?: string;
}

@Injectable()
export class TicketCollabService {
  private readonly logger = new Logger(TicketCollabService.name);

  constructor(private readonly db: DatabaseService) {}

  /**
   * Get all notes for a ticket
   */
  async getTicketNotes(tenantId: string, ticketId: string, userId: string) {
    // Verify ticket access
    await this.verifyTicketAccess(tenantId, ticketId, userId);

    const notes = await this.db.ticketNote.findMany({
      where: {
        ticketId,
      },
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Fetch reactions separately
    const noteIds = notes.map(n => n.id);
    const reactions = await this.db.ticketNoteReaction.findMany({
      where: {
        noteId: { in: noteIds },
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

    // Group reactions by note ID
    const reactionsByNote = reactions.reduce((acc: Record<string, any[]>, reaction: any) => {
      if (!acc[reaction.noteId]) {
        acc[reaction.noteId] = [];
      }
      acc[reaction.noteId].push(reaction);
      return acc;
    }, {} as Record<string, any[]>);

    // Attach reactions to notes
    return notes.map(note => ({
      ...note,
      reactions: reactionsByNote[note.id] || [],
    }));
  }

  /**
   * Create a note for a ticket
   */
  async createNote(
    tenantId: string,
    ticketId: string,
    userId: string,
    request: CreateNoteRequest,
  ) {
    // Verify ticket access
    await this.verifyTicketAccess(tenantId, ticketId, userId);

    const note = await this.db.ticketNote.create({
      data: {
        ticketId,
        userId,
        content: request.content,
        isPrivate: request.isPrivate ?? true,
      },
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
    });

    this.logger.log(`Note created: ${note.id} for ticket ${ticketId}`);

    return note;
  }

  /**
   * Update a note
   */
  async updateNote(
    noteId: string,
    userId: string,
    request: UpdateNoteRequest,
  ) {
    const note = await this.db.ticketNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('Cannot edit this note');
    }

    const updated = await this.db.ticketNote.update({
      where: { id: noteId },
      data: {
        content: request.content,
      },
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
    });

    this.logger.log(`Note updated: ${noteId}`);

    return updated;
  }

  /**
   * Delete a note
   */
  async deleteNote(noteId: string, userId: string) {
    const note = await this.db.ticketNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    if (note.userId !== userId) {
      throw new ForbiddenException('Cannot delete this note');
    }

    await this.db.ticketNote.delete({
      where: { id: noteId },
    });

    this.logger.log(`Note deleted: ${noteId}`);

    return { success: true };
  }

  /**
   * Add reaction to a note
   */
  async addNoteReaction(
    noteId: string,
    userId: string,
    request: AddNoteReactionRequest,
  ) {
    // Verify note exists
    const note = await this.db.ticketNote.findUnique({
      where: { id: noteId },
    });

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    // Check if reaction already exists
    const existing = await this.db.ticketNoteReaction.findUnique({
      where: {
        noteId_userId_emoji: {
          noteId,
          userId,
          emoji: request.emoji,
        },
      },
    });

    if (existing) {
      // Remove existing reaction (toggle)
      await this.db.ticketNoteReaction.delete({
        where: { id: existing.id },
      });
      return { action: 'removed', reactionId: existing.id };
    }

    // Add new reaction
    const reaction = await this.db.ticketNoteReaction.create({
      data: {
        noteId,
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
   * Get subtasks for a ticket
   */
  async getSubtasks(tenantId: string, ticketId: string, userId: string) {
    // Verify ticket access
    await this.verifyTicketAccess(tenantId, ticketId, userId);

    return this.db.ticketSubtask.findMany({
      where: {
        ticketId,
      },
      include: {
        assignee: {
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
        order: 'asc',
      },
    });
  }

  /**
   * Create a subtask
   */
  async createSubtask(
    tenantId: string,
    ticketId: string,
    userId: string,
    request: CreateSubtaskRequest,
  ) {
    // Verify ticket access
    await this.verifyTicketAccess(tenantId, ticketId, userId);

    // Get max order
    const maxOrder = await this.db.ticketSubtask.findFirst({
      where: { ticketId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const subtask = await this.db.ticketSubtask.create({
      data: {
        ticketId,
        title: request.title,
        assigneeId: request.assigneeId,
        dueDate: request.dueDate ? new Date(request.dueDate) : null,
        order: (maxOrder?.order ?? -1) + 1,
      },
      include: {
        assignee: {
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

    this.logger.log(`Subtask created: ${subtask.id} for ticket ${ticketId}`);

    return subtask;
  }

  /**
   * Update a subtask
   */
  async updateSubtask(
    subtaskId: string,
    userId: string,
    request: UpdateSubtaskRequest,
  ) {
    const subtask = await this.db.ticketSubtask.findUnique({
      where: { id: subtaskId },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    const updated = await this.db.ticketSubtask.update({
      where: { id: subtaskId },
      data: {
        ...(request.title !== undefined && { title: request.title }),
        ...(request.isDone !== undefined && { isDone: request.isDone }),
        ...(request.assigneeId !== undefined && { assigneeId: request.assigneeId }),
        ...(request.dueDate !== undefined && { dueDate: request.dueDate ? new Date(request.dueDate) : null }),
      },
      include: {
        assignee: {
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

    this.logger.log(`Subtask updated: ${subtaskId}`);

    return updated;
  }

  /**
   * Delete a subtask
   */
  async deleteSubtask(subtaskId: string, userId: string) {
    const subtask = await this.db.ticketSubtask.findUnique({
      where: { id: subtaskId },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found');
    }

    await this.db.ticketSubtask.delete({
      where: { id: subtaskId },
    });

    this.logger.log(`Subtask deleted: ${subtaskId}`);

    return { success: true };
  }

  /**
   * Verify user has access to the ticket
   */
  private async verifyTicketAccess(
    tenantId: string,
    ticketId: string,
    userId: string,
  ): Promise<void> {
    const ticket = await this.db.ticket.findFirst({
      where: {
        id: ticketId,
        tenantId,
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // For now, allow any user in the tenant to access
    // In production, you might want to check team membership or assignment
  }
}

