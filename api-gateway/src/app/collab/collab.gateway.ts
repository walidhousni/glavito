/**
 * Collaboration Gateway
 * Real-time collaboration via Socket.IO for tickets and team rooms
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '@glavito/shared-database';
import { JoinRoomDto } from './dto/join-room.dto';
import { TypingDto } from './dto/typing.dto';
import { PresenceUpdateDto } from './dto/presence.dto';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  tenantId?: string;
  user?: {
    id: string;
    tenantId: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

@WebSocketGateway({
  namespace: '/collab',
  cors: {
    origin: process.env.FRONTEND_URL || '*',
    credentials: true,
  },
})
export class CollabGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(CollabGateway.name);
  private readonly activeUsers = new Map<string, Set<string>>(); // room -> Set<userId>
  private readonly userRooms = new Map<string, Set<string>>(); // socketId -> Set<roomId>
  private readonly rateLimits = new Map<string, { count: number; resetAt: number }>(); // socketId -> rate limit info

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly db: DatabaseService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Extract token from handshake auth or query
      const token = client.handshake.auth?.token || client.handshake.query?.token;
      
      if (!token) {
        throw new UnauthorizedException('No token provided');
      }

      // Verify JWT
      const payload = await this.jwtService.verifyAsync(token as string, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // Fetch user from database
      const user = await this.db.user.findUnique({
        where: { id: payload.sub || payload.id },
        select: {
          id: true,
          tenantId: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          status: true,
        },
      });

      if (!user || user.status !== 'active') {
        throw new UnauthorizedException('Invalid user');
      }

      // Attach user info to socket
      client.userId = user.id;
      client.tenantId = user.tenantId;
      client.user = user;

      // Initialize user rooms
      this.userRooms.set(client.id, new Set());

      // Join user's personal room
      const userRoom = `user:${user.id}`;
      client.join(userRoom);

      this.logger.log(
        `Client connected: ${client.id} (${user.email}) to room ${userRoom}`
      );

      // Notify about connection
      client.emit('connected', {
        userId: user.id,
        connectedAt: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Connection failed: ${error.message}`);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    const rooms = this.userRooms.get(client.id);
    if (rooms) {
      // Remove user from all active users sets
      rooms.forEach((room) => {
        const users = this.activeUsers.get(room);
        if (users && client.userId) {
          users.delete(client.userId);
          // Broadcast presence update
          this.server.to(room).emit('presence_changed', {
            room,
            userId: client.userId,
            status: 'offline',
            activeUsers: Array.from(users),
          });
        }
      });
    }

    this.userRooms.delete(client.id);
    this.rateLimits.delete(client.id);
    
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    if (!client.userId || !client.tenantId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Check rate limit
    if (!this.checkRateLimit(client.id)) {
      return { success: false, error: 'Rate limit exceeded' };
    }

    try {
      // Validate and authorize room access
      const canJoin = await this.canJoinRoom(
        client.userId,
        client.tenantId,
        dto.room,
      );

      if (!canJoin) {
        return { success: false, error: 'Not authorized to join room' };
      }

      // Join the room
      client.join(dto.room);
      
      // Track room membership
      const userRooms = this.userRooms.get(client.id) || new Set();
      userRooms.add(dto.room);
      this.userRooms.set(client.id, userRooms);

      // Track active users in room
      const activeUsers = this.activeUsers.get(dto.room) || new Set();
      activeUsers.add(client.userId);
      this.activeUsers.set(dto.room, activeUsers);

      // Broadcast to room that user joined
      this.server.to(dto.room).emit('user_joined', {
        room: dto.room,
        userId: client.userId,
        user: {
          id: client.user?.id,
          firstName: client.user?.firstName,
          lastName: client.user?.lastName,
          email: client.user?.email,
        },
        activeUsers: Array.from(activeUsers),
        joinedAt: new Date().toISOString(),
      });

      this.logger.log(`User ${client.userId} joined room: ${dto.room}`);

      return {
        success: true,
        room: dto.room,
        activeUsers: Array.from(activeUsers),
      };
    } catch (error) {
      this.logger.error(`Failed to join room: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: JoinRoomDto,
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    client.leave(dto.room);

    // Remove from tracking
    const userRooms = this.userRooms.get(client.id);
    if (userRooms) {
      userRooms.delete(dto.room);
    }

    const activeUsers = this.activeUsers.get(dto.room);
    if (activeUsers) {
      activeUsers.delete(client.userId);
    }

    // Broadcast user left
    this.server.to(dto.room).emit('user_left', {
      room: dto.room,
      userId: client.userId,
      activeUsers: activeUsers ? Array.from(activeUsers) : [],
      leftAt: new Date().toISOString(),
    });

    this.logger.log(`User ${client.userId} left room: ${dto.room}`);

    return { success: true };
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: TypingDto,
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Broadcast typing indicator to room (except sender)
    client.to(dto.room).emit('typing_indicator', {
      room: dto.room,
      userId: client.userId,
      user: {
        firstName: client.user?.firstName,
        lastName: client.user?.lastName,
      },
      isTyping: true,
    });

    return { success: true };
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: TypingDto,
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    client.to(dto.room).emit('typing_indicator', {
      room: dto.room,
      userId: client.userId,
      isTyping: false,
    });

    return { success: true };
  }

  @SubscribeMessage('presence_update')
  async handlePresenceUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: PresenceUpdateDto,
  ) {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    // Broadcast presence change to room
    this.server.to(dto.room).emit('presence_changed', {
      room: dto.room,
      userId: client.userId,
      status: dto.status,
      updatedAt: new Date().toISOString(),
    });

    return { success: true };
  }

  /**
   * Broadcast note created event to ticket room
   */
  broadcastNoteCreated(ticketId: string, note: any) {
    const room = `ticket:${ticketId}`;
    this.server.to(room).emit('note_created', { ticketId, note });
  }

  /**
   * Broadcast note updated event to ticket room
   */
  broadcastNoteUpdated(ticketId: string, note: any) {
    const room = `ticket:${ticketId}`;
    this.server.to(room).emit('note_updated', { ticketId, note });
  }

  /**
   * Broadcast note deleted event to ticket room
   */
  broadcastNoteDeleted(ticketId: string, noteId: string) {
    const room = `ticket:${ticketId}`;
    this.server.to(room).emit('note_deleted', { ticketId, noteId });
  }

  /**
   * Broadcast reaction added event
   */
  broadcastReactionAdded(room: string, reaction: any) {
    this.server.to(room).emit('reaction_added', reaction);
  }

  /**
   * Broadcast reaction removed event
   */
  broadcastReactionRemoved(room: string, reactionId: string, targetId: string) {
    this.server.to(room).emit('reaction_removed', { reactionId, targetId });
  }

  /**
   * Broadcast checklist updated event
   */
  broadcastChecklistUpdated(ticketId: string, subtask: any) {
    const room = `ticket:${ticketId}`;
    this.server.to(room).emit('checklist_updated', { ticketId, subtask });
  }

  /**
   * Broadcast message created event to team room
   */
  broadcastMessageCreated(channelId: string, message: any) {
    const room = `team:${channelId}`;
    this.server.to(room).emit('message_created', { channelId, message });
  }

  /**
   * Send mention notification to user
   */
  notifyMention(userId: string, notification: any) {
    const room = `user:${userId}`;
    this.server.to(room).emit('mention_notify', notification);
  }

  /**
   * Check if user can join a room
   */
  private async canJoinRoom(
    userId: string,
    tenantId: string,
    room: string,
  ): Promise<boolean> {
    const [roomType, roomId] = room.split(':');

    if (!roomType || !roomId) {
      return false;
    }

    switch (roomType) {
      case 'user':
        // User can join their own room or admin can join any user room in tenant
        return roomId === userId;

      case 'ticket':
        // Check if user has access to the ticket
        const ticket = await this.db.ticket.findFirst({
          where: {
            id: roomId,
            tenantId,
          },
        });
        return !!ticket;

      case 'team':
        // Check if room is an internal channel and user is participant
        const channel = await this.db.internalChannel.findFirst({
          where: {
            id: roomId,
            tenantId,
            participants: {
              some: {
                userId,
              },
            },
          },
        });
        return !!channel;

      default:
        return false;
    }
  }

  /**
   * Simple rate limiting: max 10 events per second per socket
   */
  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const limit = this.rateLimits.get(socketId);

    if (!limit || limit.resetAt < now) {
      this.rateLimits.set(socketId, { count: 1, resetAt: now + 1000 });
      return true;
    }

    if (limit.count >= 10) {
      return false;
    }

    limit.count++;
    return true;
  }
}

