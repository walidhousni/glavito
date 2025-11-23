import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';

@Injectable()
@WebSocketGateway({
  namespace: '/tickets',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class TicketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  private readonly logger = new Logger(TicketsGateway.name);
  private readonly tenantAgentPresence: Map<string, Set<string>> = new Map();

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const token = (socket.handshake.auth?.token as string) || (socket.handshake.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '');
        if (!token) {
          return next(new Error('Unauthorized'));
        }
        const secret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'change_me';
        const decoded = jwt.verify(token, secret) as { sub: string; tenantId: string; role?: 'admin' | 'agent' };
        (socket as any).user = { id: decoded.sub, tenantId: decoded.tenantId, role: decoded.role };
        // Auto-join tenant and role rooms
        if (decoded.tenantId) socket.join(`tenant:${decoded.tenantId}`);
        if (decoded.role) socket.join(`role:${decoded.role}`);
        socket.join(`user:${decoded.sub}`);
        next();
      } catch (err) {
        this.logger.debug(`WS auth failed: ${String((err as any)?.message || err)}`);
        next(new Error('Unauthorized'));
      }
    });
  }

  broadcast(event: string, payload: any, tenantId?: string) {
    if (tenantId && event === 'ticket.updated' && payload.changes?.slaStatus === 'breached') {
      this.broadcastSlaBreach(payload.ticketId, { breaches: ['resolution'], level: 1 }, tenantId);
    }
    if (tenantId) {
      this.server.to(`tenant:${tenantId}`).emit(event, payload);
    } else {
      this.server.emit(event, payload);
    }
  }

  broadcastSlaBreach(ticketId: string, details: { breaches: string[]; level: number }, tenantId: string) {
    const payload = { event: 'sla.breach', ticketId, details, timestamp: new Date().toISOString() };
    this.server.to(`ticket:${ticketId}`).emit('sla.breach', payload);
    this.server.to(`tenant:${tenantId}`).emit('sla.breach', payload); // Also tenant-wide
  }

  // Lifecycle hooks for presence tracking
  handleConnection(client: any) {
    try {
      const user = (client as any).user || (client?.data?.user as { id: string; tenantId: string; role?: 'admin' | 'agent' } | undefined);
      if (!user?.tenantId) return;
      if (user.role === 'agent') {
        const set = this.tenantAgentPresence.get(user.tenantId) || new Set<string>();
        set.add(user.id);
        this.tenantAgentPresence.set(user.tenantId, set);
        this.broadcast('presence.agents', { tenantId: user.tenantId, activeAgents: set.size }, user.tenantId);
      }
    } catch { /* noop */ }
  }

  handleDisconnect(client: any) {
    try {
      const user = (client as any).user || (client?.data?.user as { id: string; tenantId: string; role?: 'admin' | 'agent' } | undefined);
      if (!user?.tenantId) return;
      if (user.role === 'agent') {
        const set = this.tenantAgentPresence.get(user.tenantId) || new Set<string>();
        set.delete(user.id);
        this.tenantAgentPresence.set(user.tenantId, set);
        this.broadcast('presence.agents', { tenantId: user.tenantId, activeAgents: set.size }, user.tenantId);
      }
    } catch { /* noop */ }
  }

  getActiveAgents(tenantId: string | undefined): number {
    if (!tenantId) return 0;
    return this.tenantAgentPresence.get(tenantId)?.size || 0;
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: any, @MessageBody() data: { room: string }) {
    if (!data?.room) return;
    const allowedPrefixes = [`tenant:`, `role:`, `user:`, `ticket:`];
    const isAllowed = allowedPrefixes.some((p) => data.room.startsWith(p));
    if (!isAllowed) return; // deny arbitrary joins
    client.join(data.room);
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: any, @MessageBody() data: { room: string }) {
    if (!data?.room) return;
    client.leave(data.room);
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: any,
    @MessageBody() data: { ticketId: string; isTyping: boolean },
  ) {
    try {
      const user = (client as any).user as { id: string; tenantId: string } | undefined;
      if (!user || !data?.ticketId) return;
      const room = `ticket:${data.ticketId}`;
      const payload = { ticketId: data.ticketId, userId: user.id, isTyping: !!data.isTyping };
      this.server.to(room).emit('ticket.typing', payload);
    } catch (_e) { /* noop */ }
  }
}


