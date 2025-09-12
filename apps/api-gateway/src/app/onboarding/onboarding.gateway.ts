import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { OnListener } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProgressUpdateEvent, OnboardingMilestoneEvent } from './progress-tracking.service';

interface AuthenticatedSocket extends Socket {
    userId?: string;
    tenantId?: string;
}

@WebSocketGateway({
    namespace: '/onboarding',
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
    },
})
export class OnboardingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private connectedClients = new Map<string, AuthenticatedSocket>();

    async handleConnection(client: AuthenticatedSocket) {
        try {
            // Extract user info from JWT token
            const token = client.handshake.auth.token || client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                client.disconnect();
                return;
            }

            // In a real implementation, verify JWT token and extract user info
            // For now, we'll mock this
            const userInfo = await this.verifyToken(token);

            if (!userInfo) {
                client.disconnect();
                return;
            }

            client.userId = userInfo.userId;
            client.tenantId = userInfo.tenantId;

            // Store client connection
            this.connectedClients.set(client.id, client);

            // Join user-specific room
            client.join(`user:${client.userId}`);
            client.join(`tenant:${client.tenantId}`);

            console.log(`Client connected: ${client.id} (User: ${client.userId})`);

            // Send initial connection confirmation
            client.emit('connected', {
                message: 'Connected to onboarding updates',
                userId: client.userId,
                tenantId: client.tenantId,
            });

        } catch (error) {
            console.error('Connection error:', error);
            client.disconnect();
        }
    }

    handleDisconnect(client: AuthenticatedSocket) {
        this.connectedClients.delete(client.id);
        console.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('join_session')
    handleJoinSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: string }
    ) {
        if (!client.userId) {
            client.emit('error', { message: 'Not authenticated' });
            return;
        }

        // Join session-specific room
        client.join(`session:${data.sessionId}`);

        client.emit('session_joined', {
            sessionId: data.sessionId,
            message: 'Joined session updates',
        });

        console.log(`Client ${client.id} joined session: ${data.sessionId}`);
    }

    @SubscribeMessage('leave_session')
    handleLeaveSession(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: string }
    ) {
        client.leave(`session:${data.sessionId}`);

        client.emit('session_left', {
            sessionId: data.sessionId,
            message: 'Left session updates',
        });

        console.log(`Client ${client.id} left session: ${data.sessionId}`);
    }

    @SubscribeMessage('get_progress')
    async handleGetProgress(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { sessionId: string }
    ) {
        if (!client.userId) {
            client.emit('error', { message: 'Not authenticated' });
            return;
        }

        try {
            // In a real implementation, fetch current progress from database
            const progress = await this.getCurrentProgress(data.sessionId, client.userId);

            client.emit('progress_update', {
                sessionId: data.sessionId,
                progress,
                timestamp: new Date(),
            });
        } catch (error) {
            client.emit('error', {
                message: 'Failed to get progress',
                error: error.message,
            });
        }
    }

    // Event listeners for broadcasting updates
    @OnListener('onboarding.progress.updated')
    handleProgressUpdate(event: ProgressUpdateEvent) {
        // Broadcast to all clients in the session
        this.server.to(`session:${event.sessionId}`).emit('progress_update', {
            sessionId: event.sessionId,
            step: event.step,
            progress: event.progress,
            timestamp: event.timestamp,
        });

        // Also broadcast to user-specific room
        this.server.to(`user:${event.userId}`).emit('progress_update', {
            sessionId: event.sessionId,
            step: event.step,
            progress: event.progress,
            timestamp: event.timestamp,
        });

        console.log(`Broadcasting progress update for session: ${event.sessionId}`);
    }

    @OnListener('onboarding.milestone.reached')
    handleMilestoneReached(event: OnboardingMilestoneEvent) {
        // Broadcast milestone to all clients in the session
        this.server.to(`session:${event.sessionId}`).emit('milestone_reached', {
            sessionId: event.sessionId,
            milestone: event.milestone,
            progress: event.progress,
            timestamp: event.timestamp,
        });

        // Also broadcast to user-specific room
        this.server.to(`user:${event.userId}`).emit('milestone_reached', {
            sessionId: event.sessionId,
            milestone: event.milestone,
            progress: event.progress,
            timestamp: event.timestamp,
        });

        console.log(`Broadcasting milestone for session: ${event.sessionId}, milestone: ${event.milestone}`);
    }

    // Broadcast step validation errors
    broadcastValidationError(sessionId: string, userId: string, errors: string[]) {
        this.server.to(`session:${sessionId}`).emit('validation_error', {
            sessionId,
            errors,
            timestamp: new Date(),
        });

        this.server.to(`user:${userId}`).emit('validation_error', {
            sessionId,
            errors,
            timestamp: new Date(),
        });
    }

    // Broadcast step completion success
    broadcastStepCompleted(sessionId: string, userId: string, step: string, nextStep?: string) {
        this.server.to(`session:${sessionId}`).emit('step_completed', {
            sessionId,
            step,
            nextStep,
            timestamp: new Date(),
        });

        this.server.to(`user:${userId}`).emit('step_completed', {
            sessionId,
            step,
            nextStep,
            timestamp: new Date(),
        });
    }

    // Broadcast onboarding completion
    broadcastOnboardingCompleted(sessionId: string, userId: string, summary: any) {
        this.server.to(`session:${sessionId}`).emit('onboarding_completed', {
            sessionId,
            summary,
            timestamp: new Date(),
        });

        this.server.to(`user:${userId}`).emit('onboarding_completed', {
            sessionId,
            summary,
            timestamp: new Date(),
        });
    }

    // Broadcast connection test results
    broadcastConnectionTest(sessionId: string, userId: string, channel: string, result: any) {
        this.server.to(`session:${sessionId}`).emit('connection_test_result', {
            sessionId,
            channel,
            result,
            timestamp: new Date(),
        });

        this.server.to(`user:${userId}`).emit('connection_test_result', {
            sessionId,
            channel,
            result,
            timestamp: new Date(),
        });
    }

    // Get connected clients count for a session
    getSessionClientCount(sessionId: string): number {
        const room = this.server.sockets.adapter.rooms.get(`session:${sessionId}`);
        return room ? room.size : 0;
    }

    // Get connected clients count for a user
    getUserClientCount(userId: string): number {
        const room = this.server.sockets.adapter.rooms.get(`user:${userId}`);
        return room ? room.size : 0;
    }

    private async verifyToken(token: string): Promise<{ userId: string; tenantId: string } | null> {
        try {
            // In a real implementation, verify JWT token
            // For now, we'll mock this

            // Mock token verification
            if (token === 'mock-jwt-token') {
                return {
                    userId: 'user-1',
                    tenantId: 'tenant-1',
                };
            }

            // In real implementation:
            // const decoded = jwt.verify(token, process.env.JWT_SECRET);
            // return { userId: decoded.sub, tenantId: decoded.tenantId };

            return null;
        } catch (error) {
            console.error('Token verification failed:', error);
            return null;
        }
    }

    private async getCurrentProgress(sessionId: string, userId: string): Promise<any> {
        // In a real implementation, fetch from database
        // For now, return mock data
        return {
            totalSteps: 11,
            completedSteps: 3,
            currentStep: 'channel_configuration',
            progressPercentage: 27,
            estimatedTimeRemaining: 45,
            nextRecommendedAction: 'Complete Channel Configuration',
        };
    }
}