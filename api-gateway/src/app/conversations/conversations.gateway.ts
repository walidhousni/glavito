import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Injectable, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';

@Injectable()
@WebSocketGateway({
  namespace: '/conversations',
  cors: {
    origin: (origin: string | undefined, cb: (err: Error | null, ok?: boolean) => void) => {
      const allowed = new Set([
        process.env.FRONTEND_URL || '',
        'http://localhost:3000',
        'http://localhost:3001',
        'http://localhost:3002',
        'http://localhost:3003',
        'http://localhost:3004',
        'http://localhost:3005',
      ]);
      if (!origin || allowed.has(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  },
})
export class ConversationsGateway {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(ConversationsGateway.name);
  // Optional singleton export for internal publishers
  static Instance: ConversationsGateway | null = null;

  afterInit(server: Server) {
    server.use((socket: Socket, next) => {
      try {
        const token = (socket.handshake.auth?.token as string) || (socket.handshake.headers?.authorization as string | undefined)?.replace(/^Bearer\s+/i, '');
        if (!token) return next(new Error('Unauthorized'));
        const secret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'change_me';
        const decoded = jwt.verify(token, secret) as { sub: string; tenantId: string; role?: string };
        (socket.data as { user?: { id: string; tenantId: string; role?: string } }).user = { id: decoded.sub, tenantId: decoded.tenantId, role: decoded.role };
        if (decoded.tenantId) socket.join(`tenant:${decoded.tenantId}`);
        if (decoded.role) socket.join(`role:${decoded.role}`);
        socket.join(`user:${decoded.sub}`);
        next();
      } catch (err: unknown) {
        const msg = (err as Error)?.message || String(err);
        this.logger.debug(`WS auth failed: ${msg}`);
        next(new Error('Unauthorized'));
      }
    });
    ConversationsGateway.Instance = this;
  }

  broadcast(event: string, payload: unknown, tenantId?: string, conversationId?: string) {
    if (conversationId) {
      this.server.to(`conversation:${conversationId}`).emit(event, payload);
      return;
    }
    if (tenantId) {
      this.server.to(`tenant:${tenantId}`).emit(event, payload);
    } else {
      this.server.emit(event, payload);
    }
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: { join: (room: string) => void }, @MessageBody() data: { room: string }) {
    if (!data?.room) return;
    const allowedPrefixes = [`tenant:`, `role:`, `user:`, `conversation:`];
    const isAllowed = allowedPrefixes.some((p) => data.room.startsWith(p));
    if (!isAllowed) return;
    client.join(data.room);
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: { leave: (room: string) => void }, @MessageBody() data: { room: string }) {
    if (!data?.room) return;
    client.leave(data.room);
  }
}

// Helper to allow DI-free broadcast in internal libs (best-effort only)
export const ConversationsGatewayInstance: ConversationsGateway | null = ConversationsGateway.Instance;


