import { Injectable, Logger } from '@nestjs/common'
import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets'
import { Server } from 'socket.io'
import * as jwt from 'jsonwebtoken'

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server
  private readonly logger = new Logger(NotificationsGateway.name)

  afterInit(server: Server) {
    server.use((socket, next) => {
      try {
        const token = (socket.handshake.auth?.token as string) || (socket.handshake.headers['authorization'] as string)?.replace(/^Bearer\s+/i, '')
        if (!token) return next(new Error('Unauthorized'))
        const secret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'change_me'
        const decoded = jwt.verify(token, secret) as { sub: string; tenantId: string; role?: 'admin'|'agent' }
        ;(socket as any).user = { id: decoded.sub, tenantId: decoded.tenantId, role: decoded.role }
        // Auto join per-user and tenant rooms
        socket.join(`user:${decoded.sub}`)
        if (decoded.tenantId) socket.join(`tenant:${decoded.tenantId}`)
        next()
      } catch (err) {
        this.logger.debug(`WS auth failed: ${String((err as any)?.message || err)}`)
        next(new Error('Unauthorized'))
      }
    })
  }

  handleConnection(client: any) {
    // noop but useful for logs
    try { const u = (client as any).user; if (u?.id) this.logger.debug(`notif ws connected ${u.id}`) } catch {}
  }
  handleDisconnect(client: any) {
    try { const u = (client as any).user; if (u?.id) this.logger.debug(`notif ws disconnected ${u.id}`) } catch {}
  }

  emitToUser(userId: string, event: string, payload: unknown) {
    this.server.to(`user:${userId}`).emit(event, payload)
  }

  emitToTenant(tenantId: string, event: string, payload: unknown) {
    this.server.to(`tenant:${tenantId}`).emit(event, payload)
  }

  emitToRoom(room: string, event: string, payload: unknown) {
    this.server.to(room).emit(event, payload);
  }

  @SubscribeMessage('join')
  handleJoin(@ConnectedSocket() client: any, @MessageBody() body: { room: string }) {
    if (!body?.room) return
    const allowed = ['user:', 'tenant:']
    if (!allowed.some(p => body.room.startsWith(p))) return
    client.join(body.room)
  }

  @SubscribeMessage('leave')
  handleLeave(@ConnectedSocket() client: any, @MessageBody() body: { room: string }) {
    if (!body?.room) return
    client.leave(body.room)
  }
}


