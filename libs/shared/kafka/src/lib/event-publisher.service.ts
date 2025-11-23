import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Kafka, Producer, Consumer } from 'kafkajs';

export interface EventPayload {
  eventType: string;
  tenantId: string;
  userId?: string;
  timestamp: string;
  data: any;
  metadata?: {
    ip?: string;
    userAgent?: string;
    version?: string;
  };
}

export interface UserEvent extends EventPayload {
  eventType: 
    | 'user.registered' 
    | 'user.login' 
    | 'user.logout' 
    | 'user.password_changed' 
    | 'user.email_verified' 
    | 'user.profile_updated' 
    | 'user.deleted';
  data: {
    userId: string;
    email: string;
    role?: string;
    previousEmail?: string;
    previousRole?: string;
  };
}

export interface AuthEvent extends EventPayload {
  eventType: 
    | 'auth.login_attempt' 
    | 'auth.login_success' 
    | 'auth.login_failure' 
    | 'auth.logout_all' 
    | 'auth.session_expired';
  data: {
    email?: string;
    userId?: string;
    reason?: string;
    ip: string;
    userAgent: string;
  };
}

export interface TenantEvent extends EventPayload {
  eventType: 
    | 'tenant.created' 
    | 'tenant.updated' 
    | 'tenant.deleted' 
    | 'tenant.member_added' 
    | 'tenant.member_removed' 
    | 'tenant.member_role_changed';
  data: {
    tenantId: string;
    tenantName?: string;
    memberId?: string;
    memberEmail?: string;
    memberRole?: string;
    previousRole?: string;
  };
}

export interface InvitationEvent extends EventPayload {
  eventType: 
    | 'invitation.sent' 
    | 'invitation.accepted' 
    | 'invitation.declined' 
    | 'invitation.cancelled' 
    | 'invitation.expired';
  data: {
    invitationId: string;
    email: string;
    role: string;
    invitedBy: string;
    tenantId: string;
  };
}

export interface TicketEvent extends EventPayload {
  eventType:
    | 'ticket.created'
    | 'ticket.updated'
    | 'ticket.assigned'
    | 'ticket.auto_assigned'
    | 'ticket.resolved'
    | 'ticket.reopened'
    | 'ticket.note_added'
    | 'ticket.tags_updated';
  data: {
    ticketId: string;
    tenantId: string;
    changes?: Record<string, any>;
    assignedAgentId?: string | null;
    status?: string;
    priority?: string;
    noteId?: string;
    tags?: string[];
  } & Record<string, any>;
}

export interface MarketingEventPayload extends EventPayload {
  eventType: 'marketing.delivery.sent' | 'marketing.delivery.failed' | 'marketing.campaign.launched' | 'marketing.campaign.created' | 'marketing.campaign.updated';
  data: {
    deliveryId?: string;
    campaignId: string;
    variantId?: string;
    customerId?: string;
    channel?: string;
    error?: string;
    deliveries?: number;
    changes?: string[];
  };
}

export interface WorkflowEventPayload extends EventPayload {
  eventType: string; // e.g., 'marketing.delivery.sent'
  data: Record<string, any>;
}

@Injectable()
export class EventPublisherService implements OnModuleInit, OnModuleDestroy {
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;
  private isConnected = false;
  private readonly kafkaEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const enabledEnv = this.configService.get<string>('ENABLE_KAFKA');
    this.kafkaEnabled = enabledEnv === undefined ? true : enabledEnv === 'true' || enabledEnv === '1';
    this.kafka = new Kafka({
      clientId: 'glavito-auth-service',
      brokers: this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092').split(','),
      connectionTimeout: 3000,
      authenticationTimeout: 1000,
      reauthenticationThreshold: 10000,
      ssl: this.configService.get<boolean>('KAFKA_SSL', false),
      sasl: this.getSASLConfig(),
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 1,
      idempotent: true,
      transactionTimeout: 30000,
    });

    this.consumer = this.kafka.consumer({
      groupId: 'glavito-auth-consumer',
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
    });
  }

  async onModuleInit() {
    if (!this.kafkaEnabled) {
      console.warn('Kafka is disabled by configuration (ENABLE_KAFKA=false). Skipping connection.');
      return;
    }
    try {
      await this.producer.connect();
      await this.consumer.connect();
      this.isConnected = true;
      console.log('Kafka producer and consumer connected');
    } catch (error) {
      console.error('Failed to connect to Kafka:', error);
      this.isConnected = false;
    }
  }

  async onModuleDestroy() {
    try {
      await this.producer.disconnect();
      await this.consumer.disconnect();
      this.isConnected = false;
      console.log('Kafka producer and consumer disconnected');
    } catch (error) {
      console.error('Error disconnecting from Kafka:', error);
    }
  }

  async publishUserEvent(event: UserEvent): Promise<void> {
    await this.publishEvent('user-events', event);
  }

  async publishAuthEvent(event: AuthEvent): Promise<void> {
    await this.publishEvent('auth-events', event);
  }

  async publishTenantEvent(event: TenantEvent): Promise<void> {
    await this.publishEvent('tenant-events', event);
  }

  async publishInvitationEvent(event: InvitationEvent): Promise<void> {
    await this.publishEvent('invitation-events', event);
  }

  async publishTicketEvent(event: TicketEvent): Promise<void> {
    await this.publishEvent('ticket-events', event);
  }

  async publishMarketingEvent(event: MarketingEventPayload): Promise<void> {
    await this.publishEvent('marketing-events', event);
  }

  async publishWorkflowEvent(event: WorkflowEventPayload): Promise<void> {
    await this.publishEvent('workflow-events', event);
  }

  private async publishEvent(topic: string, event: EventPayload): Promise<void> {
    if (!this.isConnected) {
      console.warn('Kafka not connected, skipping event publishing');
      return;
    }

    try {
      await this.producer.send({
        topic,
        messages: [
          {
            key: `${event.tenantId}-${event.userId || 'system'}`,
            value: JSON.stringify(event),
            headers: {
              'event-type': event.eventType,
              'tenant-id': event.tenantId,
              'timestamp': event.timestamp,
            },
          },
        ],
      });
    } catch (error) {
      console.error(`Failed to publish event to ${topic}:`, error);
      // In production, you might want to implement retry logic or dead letter queue
    }
  }

  async publishUserRegistered(userId: string, email: string, tenantId: string, metadata?: any): Promise<void> {
    await this.publishUserEvent({
      eventType: 'user.registered',
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        userId,
        email,
      },
      metadata,
    });
  }

  async publishUserLogin(userId: string, email: string, tenantId: string, metadata?: any): Promise<void> {
    await this.publishUserEvent({
      eventType: 'user.login',
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        userId,
        email,
      },
      metadata,
    });
  }

  async publishUserLogout(userId: string, email: string, tenantId: string, metadata?: any): Promise<void> {
    await this.publishUserEvent({
      eventType: 'user.logout',
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        userId,
        email,
      },
      metadata,
    });
  }

  async publishAuthLoginAttempt(email: string, tenantId: string, success: boolean, reason?: string, metadata?: any): Promise<void> {
    await this.publishAuthEvent({
      eventType: success ? 'auth.login_success' : 'auth.login_failure',
      tenantId,
      timestamp: new Date().toISOString(),
      data: {
        email,
        reason,
        ip: metadata?.ip || 'unknown',
        userAgent: metadata?.userAgent || 'unknown',
      },
      metadata,
    });
  }

  async publishTenantCreated(tenantId: string, tenantName: string, userId: string, metadata?: any): Promise<void> {
    await this.publishTenantEvent({
      eventType: 'tenant.created',
      tenantId,
      userId,
      timestamp: new Date().toISOString(),
      data: {
        tenantId,
        tenantName,
      },
      metadata,
    });
  }

  async publishTenantMemberAdded(tenantId: string, memberId: string, memberEmail: string, role: string, metadata?: any): Promise<void> {
    await this.publishTenantEvent({
      eventType: 'tenant.member_added',
      tenantId,
      userId: memberId,
      timestamp: new Date().toISOString(),
      data: {
        tenantId,
        memberId,
        memberEmail,
        memberRole: role,
      },
      metadata,
    });
  }

  async publishInvitationSent(invitationId: string, email: string, role: string, invitedBy: string, tenantId: string, metadata?: any): Promise<void> {
    await this.publishInvitationEvent({
      eventType: 'invitation.sent',
      tenantId,
      userId: invitedBy,
      timestamp: new Date().toISOString(),
      data: {
        invitationId,
        email,
        role,
        invitedBy,
        tenantId,
      },
      metadata,
    });
  }

  async publishInvitationAccepted(invitationId: string, email: string, tenantId: string, acceptedBy: string, role: string, invitedBy: string, metadata?: any): Promise<void> {
    await this.publishInvitationEvent({
      eventType: 'invitation.accepted',
      tenantId,
      userId: acceptedBy,
      timestamp: new Date().toISOString(),
      data: {
        invitationId,
        email,
        role,
        invitedBy,
        tenantId,
      },
      metadata,
    });
  }

  async subscribeToEvents(topics: string[], handler: (event: EventPayload) => Promise<void>): Promise<void> {
    if (!this.isConnected) {
      console.warn('Kafka not connected, skipping subscription');
      return;
    }

    try {
      await this.consumer.subscribe({ topics, fromBeginning: false });

      await this.consumer.run({
          eachMessage: async ({ message }) => {
            try {
              if (!message.value) {
                console.warn('Received null message value, skipping');
                return;
              }
              const event = JSON.parse(message.value.toString()) as EventPayload;
              await handler(event);
            } catch (error) {
              console.error('Error processing message:', error);
            }
          },
        });
    } catch (error) {
      console.error('Failed to subscribe to events:', error);
    }
  }

  async getHealth(): Promise<{
    connected: boolean;
    topics: string[];
  }> {
    return {
      connected: this.isConnected,
      topics: ['user-events', 'auth-events', 'tenant-events', 'invitation-events', 'ticket-events', 'workflow-events', 'marketing-events'],
    };
  }

  private getSASLConfig() {
    const mechanism = this.configService.get<string>('KAFKA_SASL_MECHANISM');
    const username = this.configService.get<string>('KAFKA_SASL_USERNAME');
    const password = this.configService.get<string>('KAFKA_SASL_PASSWORD');

    if (!mechanism || !username || !password) {
      return undefined;
    }

    if (mechanism === 'plain') {
      return {
        mechanism: 'plain' as const,
        username,
        password,
      };
    } else if (mechanism === 'scram-sha-256') {
      return {
        mechanism: 'scram-sha-256' as const,
        username,
        password,
      };
    } else if (mechanism === 'scram-sha-512') {
      return {
        mechanism: 'scram-sha-512' as const,
        username,
        password,
      };
    }

    return undefined;
  }
}