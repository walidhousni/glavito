/**
 * Ticket Collaboration Controller
 * REST API for ticket notes, reactions, and checklists
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '@glavito/shared-auth';
import {
  TicketCollabService,
  CreateNoteRequest,
  UpdateNoteRequest,
  AddNoteReactionRequest,
  CreateSubtaskRequest,
  UpdateSubtaskRequest,
} from './ticket-collab.service';
import { CollabGateway } from '../collab/collab.gateway';

@ApiTags('ticket-collaboration')
@ApiBearerAuth()
@Controller('tickets/:ticketId/collab')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketCollabController {
  constructor(
    private readonly service: TicketCollabService,
    private readonly collabGateway: CollabGateway,
  ) {}

  // ======== Notes ========

  @Get('notes')
  @ApiOperation({ summary: 'Get all notes for a ticket' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of notes' })
  async getNotes(@Request() req: any, @Param('ticketId') ticketId: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.service.getTicketNotes(tenantId, ticketId, userId);
  }

  @Post('notes')
  @ApiOperation({ summary: 'Create a note' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Note created' })
  async createNote(
    @Request() req: any,
    @Param('ticketId') ticketId: string,
    @Body() body: CreateNoteRequest,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const note = await this.service.createNote(tenantId, ticketId, userId, body);

    // Broadcast via Socket.IO
    this.collabGateway.broadcastNoteCreated(ticketId, note);

    return note;
  }

  @Patch('notes/:noteId')
  @ApiOperation({ summary: 'Update a note' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Note updated' })
  async updateNote(
    @Request() req: any,
    @Param('ticketId') ticketId: string,
    @Param('noteId') noteId: string,
    @Body() body: UpdateNoteRequest,
  ) {
    const userId = req.user.id;

    const note = await this.service.updateNote(noteId, userId, body);

    // Broadcast via Socket.IO
    this.collabGateway.broadcastNoteUpdated(ticketId, note);

    return note;
  }

  @Delete('notes/:noteId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a note' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Note deleted' })
  async deleteNote(
    @Request() req: any,
    @Param('ticketId') ticketId: string,
    @Param('noteId') noteId: string,
  ) {
    const userId = req.user.id;

    await this.service.deleteNote(noteId, userId);

    // Broadcast via Socket.IO
    this.collabGateway.broadcastNoteDeleted(ticketId, noteId);
  }

  @Post('notes/:noteId/reactions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add or remove reaction to a note' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Reaction toggled' })
  async addNoteReaction(
    @Request() req: any,
    @Param('ticketId') ticketId: string,
    @Param('noteId') noteId: string,
    @Body() body: AddNoteReactionRequest,
  ) {
    const userId = req.user.id;

    const result = await this.service.addNoteReaction(noteId, userId, body);

    // Broadcast reaction change
    const room = `ticket:${ticketId}`;
    if (result.action === 'added') {
      this.collabGateway.broadcastReactionAdded(room, {
        noteId,
        ...result.reaction,
      });
    } else {
      this.collabGateway.broadcastReactionRemoved(room, result.reactionId, noteId);
    }

    return result;
  }

  // ======== Subtasks/Checklist ========

  @Get('subtasks')
  @ApiOperation({ summary: 'Get all subtasks for a ticket' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of subtasks' })
  async getSubtasks(@Request() req: any, @Param('ticketId') ticketId: string) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;
    return this.service.getSubtasks(tenantId, ticketId, userId);
  }

  @Post('subtasks')
  @ApiOperation({ summary: 'Create a subtask' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Subtask created' })
  async createSubtask(
    @Request() req: any,
    @Param('ticketId') ticketId: string,
    @Body() body: CreateSubtaskRequest,
  ) {
    const tenantId = req.user.tenantId;
    const userId = req.user.id;

    const subtask = await this.service.createSubtask(tenantId, ticketId, userId, body);

    // Broadcast via Socket.IO
    this.collabGateway.broadcastChecklistUpdated(ticketId, subtask);

    return subtask;
  }

  @Patch('subtasks/:subtaskId')
  @ApiOperation({ summary: 'Update a subtask' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Subtask updated' })
  async updateSubtask(
    @Request() req: any,
    @Param('ticketId') ticketId: string,
    @Param('subtaskId') subtaskId: string,
    @Body() body: UpdateSubtaskRequest,
  ) {
    const userId = req.user.id;

    const subtask = await this.service.updateSubtask(subtaskId, userId, body);

    // Broadcast via Socket.IO
    this.collabGateway.broadcastChecklistUpdated(ticketId, subtask);

    return subtask;
  }

  @Delete('subtasks/:subtaskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subtask' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Subtask deleted' })
  async deleteSubtask(
    @Request() req: any,
    @Param('ticketId') ticketId: string,
    @Param('subtaskId') subtaskId: string,
  ) {
    const userId = req.user.id;

    await this.service.deleteSubtask(subtaskId, userId);

    // Broadcast via Socket.IO
    this.collabGateway.server.to(`ticket:${ticketId}`).emit('subtask_deleted', {
      ticketId,
      subtaskId,
    });
  }
}

