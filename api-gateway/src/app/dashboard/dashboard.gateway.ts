import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { DashboardService } from './dashboard.service';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    tenantId: string;
    role?: string;
  };
}

@Injectable()
@WebSocketGateway({
  namespace: '/dashboard',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class DashboardGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;
  
  private readonly logger = new Logger(DashboardGateway.name);
  private metricsInterval: NodeJS.Timeout | null = null;

  constructor(private readonly dashboardService: DashboardService) {}

  afterInit(server: Server) {
    // Middleware for authentication
    server.use((socket: any, next) => {
      try {
        const token = socket.handshake.auth?.token || 
          socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');
        
        if (!token) {
          return next(new Error('Unauthorized'));
        }

        const secret = process.env.JWT_SECRET || process.env.AUTH_JWT_SECRET || 'change_me';
        const decoded = jwt.verify(token, secret) as {
          sub: string;
          tenantId: string;
          role?: string;
        };

        socket.user = {
          id: decoded.sub,
          tenantId: decoded.tenantId,
          role: decoded.role,
        };

        // Auto-join user and tenant rooms
        socket.join(`user:${decoded.sub}`);
        socket.join(`tenant:${decoded.tenantId}`);
        
        next();
      } catch (err) {
        this.logger.debug(`Dashboard WS auth failed: ${err}`);
        next(new Error('Unauthorized'));
      }
    });

    // Start broadcasting real-time metrics every 5 seconds
    this.startMetricsBroadcast();
    
    this.logger.log('Dashboard WebSocket gateway initialized');
  }

  handleConnection(client: AuthenticatedSocket) {
    const user = client.user;
    if (user) {
      this.logger.log(`Dashboard client connected: ${user.id}`);
      
      // Send initial metrics
      this.sendMetricsToClient(client);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const user = client.user;
    if (user) {
      this.logger.log(`Dashboard client disconnected: ${user.id}`);
    }
  }

  /**
   * Send real-time metrics to a specific client
   */
  private async sendMetricsToClient(client: AuthenticatedSocket) {
    try {
      const user = client.user;
      if (!user) return;

      const metrics = await this.dashboardService.getRealTimeMetrics(
        user.tenantId,
        user.id,
      );

      client.emit('metrics.updated', metrics);
    } catch (error) {
      this.logger.error(`Failed to send metrics to client: ${error}`);
    }
  }

  /**
   * Broadcast metrics to all connected clients periodically
   */
  private startMetricsBroadcast() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    this.metricsInterval = setInterval(async () => {
      try {
        // Get all connected sockets
        const sockets = await this.server.fetchSockets();
        
        // Group by tenant for efficiency
        const tenantClients = new Map<string, AuthenticatedSocket[]>();
        
        for (const socket of sockets) {
          const authSocket = socket as unknown as AuthenticatedSocket;
          const tenantId = authSocket.user?.tenantId;
          
          if (tenantId) {
            if (!tenantClients.has(tenantId)) {
              tenantClients.set(tenantId, []);
            }
            tenantClients.get(tenantId)!.push(authSocket);
          }
        }

        // Fetch and broadcast metrics per tenant
        for (const [tenantId, clients] of tenantClients.entries()) {
          try {
            const metrics = await this.dashboardService.getRealTimeMetrics(tenantId);
            
            for (const client of clients) {
              client.emit('metrics.updated', metrics);
            }
          } catch (error) {
            this.logger.error(`Failed to broadcast metrics for tenant ${tenantId}: ${error}`);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to broadcast metrics: ${error}`);
      }
    }, 5000); // Every 5 seconds
  }

  /**
   * Broadcast SLA alert to tenant
   */
  broadcastSLAAlert(tenantId: string, alert: {
    ticketId: string;
    type: 'warning' | 'breach';
    message: string;
    dueAt: string;
  }) {
    this.server.to(`tenant:${tenantId}`).emit('sla.alert', alert);
  }

  /**
   * Broadcast goal achieved to user
   */
  broadcastGoalAchieved(userId: string, achievement: {
    goalId: string;
    metric: string;
    target: number;
    achieved: number;
  }) {
    this.server.to(`user:${userId}`).emit('goal.achieved', achievement);
  }

  /**
   * Broadcast agent presence update
   */
  broadcastAgentPresence(tenantId: string, presence: {
    userId: string;
    status: string;
    availability: string;
  }) {
    this.server.to(`tenant:${tenantId}`).emit('agents.presence', presence);
  }

  /**
   * Handle manual metrics refresh request
   */
  @SubscribeMessage('refresh.metrics')
  async handleRefreshMetrics(@ConnectedSocket() client: AuthenticatedSocket) {
    await this.sendMetricsToClient(client);
  }

  /**
   * Handle subscribe to specific metric
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (data.room) {
      client.join(data.room);
      this.logger.log(`Client ${client.user?.id} subscribed to ${data.room}`);
    }
  }

  /**
   * Handle unsubscribe from specific metric
   */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { room: string },
  ) {
    if (data.room) {
      client.leave(data.room);
      this.logger.log(`Client ${client.user?.id} unsubscribed from ${data.room}`);
    }
  }

  onModuleDestroy() {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}
