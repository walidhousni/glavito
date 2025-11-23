import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
@WebSocketGateway({
  namespace: '/calls',
  cors: {
    origin: (origin, cb) => {
      // Dev-friendly: allow localhost admin ports and env FRONTEND_URL
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
export class CallsGateway {
  private readonly logger = new Logger(CallsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  private authenticate(client: Socket): { userId: string; tenantId: string } | null {
    const token = (client.handshake.auth as any)?.token || (client.handshake.headers as any)?.authorization?.replace('Bearer ', '');
    if (!token) return null;
    try {
      const secret = this.config.get<string>('AUTH_JWT_SECRET') || this.config.get<string>('JWT_SECRET') || 'change_me';
      const payload: any = this.jwt.verify(token, { secret });
      return { userId: payload.sub, tenantId: payload.tenantId };
    } catch (e) {
      this.logger.warn('Invalid WS auth token');
      return null;
    }
  }

  @SubscribeMessage('join-call')
  handleJoinCall(@ConnectedSocket() client: Socket, @MessageBody() data: { callId: string }) {
    const auth = this.authenticate(client);
    if (!auth || !data?.callId) return;
    client.join(`call:${data.callId}`);
  }

  @SubscribeMessage('leave-call')
  handleLeaveCall(@ConnectedSocket() client: Socket, @MessageBody() data: { callId: string }) {
    const auth = this.authenticate(client);
    if (!auth || !data?.callId) return;
    client.leave(`call:${data.callId}`);
  }

  // WebRTC signaling messages
  @SubscribeMessage('signal')
  handleSignal(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: { callId: string; type: 'offer' | 'answer' | 'candidate'; data: any; to?: string }
  ) {
    const auth = this.authenticate(client);
    if (!auth || !payload?.callId) return;
    if (payload.to) {
      this.server.to(payload.to).emit('signal', { from: client.id, ...payload });
    } else {
      this.server.to(`call:${payload.callId}`).emit('signal', { from: client.id, ...payload });
    }
  }

  @SubscribeMessage('mute')
  handleMute(@ConnectedSocket() client: Socket, @MessageBody() payload: { callId: string; muted: boolean }) {
    const auth = this.authenticate(client);
    if (!auth || !payload?.callId) return;
    this.server.to(`call:${payload.callId}`).emit('peer-muted', { peerId: client.id, muted: payload.muted });
  }

  @SubscribeMessage('toggle-video')
  handleToggleVideo(@ConnectedSocket() client: Socket, @MessageBody() payload: { callId: string; enabled: boolean }) {
    const auth = this.authenticate(client);
    if (!auth || !payload?.callId) return;
    this.server.to(`call:${payload.callId}`).emit('peer-video', { peerId: client.id, enabled: payload.enabled });
  }

  broadcastCallEvent(event: string, payload: any, callId: string) {
    this.server.to(`call:${callId}`).emit(event, payload);
  }
}


