/**
 * Onboarding Gateway
 * WebSocket gateway for real-time onboarding progress updates
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  },
  namespace: '/onboarding',
})
export class OnboardingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OnboardingGateway.name);
  private userSessions = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSessions.set(userId, client.id);
      this.logger.log(`User ${userId} connected to onboarding gateway`);
    }
  }

  handleDisconnect(client: Socket) {
    const userId = Array.from(this.userSessions.entries())
      .find(([, socketId]) => socketId === client.id)?.[0];
    
    if (userId) {
      this.userSessions.delete(userId);
      this.logger.log(`User ${userId} disconnected from onboarding gateway`);
    }
  }

  @SubscribeMessage('join-session')
  handleJoinSession(client: Socket, payload: { sessionId: string; userId: string }) {
    client.join(`session:${payload.sessionId}`);
    this.logger.log(`User ${payload.userId} joined session ${payload.sessionId}`);
    return { event: 'joined', data: { sessionId: payload.sessionId } };
  }

  @SubscribeMessage('leave-session')
  handleLeaveSession(client: Socket, payload: { sessionId: string }) {
    client.leave(`session:${payload.sessionId}`);
    return { event: 'left', data: { sessionId: payload.sessionId } };
  }

  // Event handlers for emitting to clients

  @OnEvent('onboarding:started')
  handleOnboardingStarted(payload: {
    sessionId: string;
    userId: string;
    tenantId: string;
    type: string;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('onboarding:started', payload);
    this.emitToUser(payload.userId, 'onboarding:started', payload);
  }

  @OnEvent('onboarding:step-completed')
  handleStepCompleted(payload: {
    sessionId: string;
    userId: string;
    tenantId: string;
    stepId: string;
    progress: number;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('onboarding:step-completed', payload);
    this.emitToUser(payload.userId, 'onboarding:step-completed', payload);
  }

  @OnEvent('onboarding:completed')
  handleOnboardingCompleted(payload: {
    sessionId: string;
    userId: string;
    tenantId: string;
    type: string;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('onboarding:completed', payload);
    this.emitToUser(payload.userId, 'onboarding:completed', payload);
  }

  @OnEvent('onboarding:progress')
  handleProgressUpdate(payload: {
    sessionId: string;
    progress: number;
    currentStep: string;
  }) {
    this.server.to(`session:${payload.sessionId}`).emit('onboarding:progress', payload);
  }

  // Helper to emit to specific user
  private emitToUser(userId: string, event: string, data: Record<string, unknown>) {
    const socketId = this.userSessions.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }
}
