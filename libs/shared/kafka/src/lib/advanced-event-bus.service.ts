import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { 
  Kafka, 
  Producer, 
  Consumer, 
  Admin, 
  KafkaMessage,
  logLevel
} from 'kafkajs';
import { v4 as uuidv4 } from 'uuid';
import type {
  DomainEvent,
  EventBus,
  EventSubscription,
  EventHandler,
  KafkaTopicConfig,
  KafkaStreamConfig
} from '@glavito/shared-types';

@Injectable()
export class AdvancedEventBusService implements EventBus, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AdvancedEventBusService.name);
  private kafka: Kafka;
  private producer: Producer;
  private admin: Admin;
  private consumers: Map<string, Consumer> = new Map();
  private subscriptions: Map<string, EventSubscription> = new Map();
  private isConnected = false;
  private readonly serviceName: string;
  private readonly kafkaEnabled: boolean;

  // Topic configurations for the advanced ticket system
  private readonly topicConfigs: KafkaTopicConfig[] = [
    // Conversation topics
    {
      name: 'conversation-events',
      partitions: 6,
      replicationFactor: 3,
      configs: {
        'retention.ms': '604800000', // 7 days
        'compression.type': 'snappy',
        'cleanup.policy': 'delete'
      }
    },
    // Ticket topics
    {
      name: 'ticket-events',
      partitions: 6,
      replicationFactor: 3,
      configs: {
        'retention.ms': '2592000000', // 30 days
        'compression.type': 'snappy',
        'cleanup.policy': 'delete'
      }
    },
    // Customer topics
    {
      name: 'customer-events',
      partitions: 4,
      replicationFactor: 3,
      configs: {
        'retention.ms': '7776000000', // 90 days
        'compression.type': 'snappy',
        'cleanup.policy': 'delete'
      }
    },
    // AI Analysis topics
    {
      name: 'ai-analysis-events',
      partitions: 8,
      replicationFactor: 3,
      configs: {
        'retention.ms': '1209600000', // 14 days
        'compression.type': 'lz4',
        'cleanup.policy': 'delete'
      }
    },
    // Workflow topics
    {
      name: 'workflow-events',
      partitions: 4,
      replicationFactor: 3,
      configs: {
        'retention.ms': '2592000000', // 30 days
        'compression.type': 'snappy',
        'cleanup.policy': 'delete'
      }
    },
    // SLA topics
    {
      name: 'sla-events',
      partitions: 2,
      replicationFactor: 3,
      configs: {
        'retention.ms': '7776000000', // 90 days
        'compression.type': 'snappy',
        'cleanup.policy': 'delete'
      }
    },
    // Analytics topics
    {
      name: 'analytics-events',
      partitions: 12,
      replicationFactor: 3,
      configs: {
        'retention.ms': '31536000000', // 1 year
        'compression.type': 'lz4',
        'cleanup.policy': 'delete'
      }
    },
    // Integration topics
    {
      name: 'integration-events',
      partitions: 4,
      replicationFactor: 3,
      configs: {
        'retention.ms': '2592000000', // 30 days
        'compression.type': 'snappy',
        'cleanup.policy': 'delete'
      }
    },
    // Dead letter queue
    {
      name: 'dead-letter-queue',
      partitions: 2,
      replicationFactor: 3,
      configs: {
        'retention.ms': '7776000000', // 90 days
        'compression.type': 'snappy',
        'cleanup.policy': 'delete'
      }
    }
  ];

  constructor(private readonly configService: ConfigService) {
    this.serviceName = this.configService.get<string>('SERVICE_NAME', 'glavito-service');
    const enabledEnv = this.configService.get<string>('ENABLE_KAFKA');
    this.kafkaEnabled = enabledEnv === undefined ? true : enabledEnv === 'true' || enabledEnv === '1';
    
    this.kafka = new Kafka({
      clientId: `${this.serviceName}-${uuidv4()}`,
      brokers: this.getBrokers(),
      connectionTimeout: 10000,
      authenticationTimeout: 5000,
      reauthenticationThreshold: 10000,
      requestTimeout: 30000,
      enforceRequestTimeout: true,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        factor: 2,
        multiplier: 2,
        restartOnFailure: async (e: Error) => {
          this.logger.error('Kafka client restarting due to error:', e);
          return true;
        }
      },
      ssl: this.getSSLConfig(),
      ...(this.getSASLConfig() ? { sasl: this.getSASLConfig() } : {}),
      logLevel: this.getLogLevel(),
      logCreator: () => ({ namespace, level, label, log }) => {
        const { message, ...extra } = log;
        this.logger.log(`[${namespace}] ${message}`, extra);
      }
    });

    this.producer = this.kafka.producer({
      maxInFlightRequests: 5,
      idempotent: true,
      transactionTimeout: 30000,
      allowAutoTopicCreation: false,


      retry: {
        initialRetryTime: 100,
        retries: 5,
        maxRetryTime: 30000,
        factor: 2
      }
    });

    this.admin = this.kafka.admin();
  }

  async onModuleInit() {
    if (!this.kafkaEnabled) {
      this.logger.warn('Kafka is disabled by configuration (ENABLE_KAFKA=false). Skipping initialization.');
      return;
    }

    try {
      await this.connectKafka();
      if (this.isConnected) {
        await this.createTopics();
        this.logger.log('Advanced Event Bus initialized successfully');
      } else {
        this.logger.warn('Kafka connection not established. Event bus will operate in degraded mode.');
      }
    } catch (error) {
      this.logger.error('Failed to initialize Advanced Event Bus:', error);
      // Do not throw to allow the app to continue without Kafka
    }
  }

  async onModuleDestroy() {
    try {
      await this.disconnectAll();
      this.logger.log('Advanced Event Bus destroyed successfully');
    } catch (error) {
      this.logger.error('Error destroying Advanced Event Bus:', error);
    }
  }

  async publish(event: DomainEvent): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Event bus not connected. Dropping event ${event.eventType}`);
      return;
    }

    const topic = this.getTopicForEvent(event);
    const key = this.generatePartitionKey(event);

    try {
      await this.producer.send({
        topic,
        messages: [{
          key,
          value: JSON.stringify(event),
          headers: this.createHeaders(event),
          timestamp: event.timestamp.getTime().toString()
        }]
      });

      this.logger.debug(`Published event ${event.eventType} to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Failed to publish event ${event.eventType}:`, error as Error);
      // Fail open in dev: try once to (re)create topics then drop
      try { await this.createTopics(); } catch (e) { this.logger.warn('Topic creation attempt failed', e as Error); }
      return;
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn(`Event bus not connected. Dropping batch of ${events.length} events`);
      return;
    }

    if (events.length === 0) {
      return;
    }

    // Group events by topic for efficient batch publishing
    const eventsByTopic = new Map<string, DomainEvent[]>();
    
    for (const event of events) {
      const topic = this.getTopicForEvent(event);
      if (!eventsByTopic.has(topic)) {
        eventsByTopic.set(topic, []);
      }
      eventsByTopic.get(topic)!.push(event);
    }

    try {
      const promises = Array.from(eventsByTopic.entries()).map(([topic, topicEvents]) => {
        const messages = topicEvents.map(event => ({
          key: this.generatePartitionKey(event),
          value: JSON.stringify(event),
          headers: this.createHeaders(event),
          timestamp: event.timestamp.getTime().toString()
        }));

        return this.producer.send({ topic, messages });
      });

      await Promise.all(promises);
      this.logger.debug(`Published batch of ${events.length} events`);
    } catch (error) {
      this.logger.error('Failed to publish event batch:', error as Error);
      try { await this.createTopics(); } catch (e) { this.logger.warn('Topic creation attempt failed (batch)', e as Error); }
      return;
    }
  }

  async subscribe(subscription: EventSubscription): Promise<void> {
    if (this.subscriptions.has(subscription.id)) {
      throw new Error(`Subscription ${subscription.id} already exists`);
    }

    const consumer = this.kafka.consumer({
      groupId: `${this.serviceName}-${subscription.id}`,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxWaitTimeInMs: 5000,
      allowAutoTopicCreation: false,
      retry: {
        initialRetryTime: 100,
        retries: 8,
        maxRetryTime: 30000,
        factor: 2
      }
    });

    try {
      await consumer.connect();
      await consumer.subscribe({ 
        topics: subscription.topics,
        fromBeginning: false 
      });

      await consumer.run({
        partitionsConsumedConcurrently: 3,
        eachMessage: async ({ topic, partition, message, heartbeat }) => {
          try {
            await this.processMessage(message, subscription.handler, heartbeat);
          } catch (error) {
            this.logger.error(`Error processing message from ${topic}:${partition}:`, error);
            await this.handleProcessingError(message, error as Error, topic);
          }
        }
      });

      this.consumers.set(subscription.id, consumer);
      this.subscriptions.set(subscription.id, subscription);
      
      this.logger.log(`Subscribed to topics: ${subscription.topics.join(', ')}`);
    } catch (error) {
      this.logger.error(`Failed to create subscription ${subscription.id}:`, error);
      await consumer.disconnect();
      throw error;
    }
  }

  async unsubscribe(subscriptionId: string): Promise<void> {
    const consumer = this.consumers.get(subscriptionId);
    if (!consumer) {
      throw new Error(`Subscription ${subscriptionId} not found`);
    }

    try {
      await consumer.disconnect();
      this.consumers.delete(subscriptionId);
      this.subscriptions.delete(subscriptionId);
      
      this.logger.log(`Unsubscribed from subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to unsubscribe ${subscriptionId}:`, error);
      throw error;
    }
  }

  async createStream(config: KafkaStreamConfig): Promise<void> {
    // Create a consumer for the input topic and producer for output topic
    const streamId = `stream-${config.inputTopic}-${config.outputTopic}`;
    
    const streamSubscription: EventSubscription = {
      id: streamId,
      topics: [config.inputTopic],
      handler: {
        handle: async (event: DomainEvent) => {
          try {
            const outputEvents = await config.processor.process(event);
            if (outputEvents.length > 0) {
              // Publish processed events to output topic
              for (const outputEvent of outputEvents) {
                await this.producer.send({
                  topic: config.outputTopic,
                  messages: [{
                    key: this.generatePartitionKey(outputEvent),
                    value: JSON.stringify(outputEvent),
                    headers: this.createHeaders(outputEvent),
                    timestamp: outputEvent.timestamp.getTime().toString()
                  }]
                });
              }
            }
          } catch (error) {
            this.logger.error(`Stream processing error for ${streamId}:`, error);
            throw error;
          }
        }
      },
      isActive: true
    };

    await this.subscribe(streamSubscription);
    this.logger.log(`Created stream from ${config.inputTopic} to ${config.outputTopic}`);
  }

  // Health check method
  async getHealth(): Promise<{
    connected: boolean;
    topics: string[];
    subscriptions: number;
    consumers: number;
  }> {
    return {
      connected: this.isConnected,
      topics: this.topicConfigs.map(config => config.name),
      subscriptions: this.subscriptions.size,
      consumers: this.consumers.size
    };
  }

  private async connectKafka(): Promise<void> {
    try {
      await this.admin.connect();
      await this.producer.connect();
      this.isConnected = true;
      this.logger.log('Connected to Kafka cluster');
    } catch (error) {
      this.logger.error('Failed to connect to Kafka:', error);
      throw error;
    }
  }

  private async createTopics(): Promise<void> {
    try {
      // Determine broker count to calibrate replication factor and partitions for dev clusters
      const cluster = await this.admin.describeCluster();
      const brokersCount = Array.isArray((cluster as any)?.brokers) ? (cluster as any).brokers.length : 1;
      const isProd = ((process.env['NODE_ENV'] || '') as string).toLowerCase() === 'production';
      const defaultPartitions = Number(process.env['KAFKA_PARTITIONS'] || (isProd ? 3 : 1));
      const defaultRF = Math.max(1, Math.min(brokersCount || 1, Number(process.env['KAFKA_REPLICATION_FACTOR'] || (isProd ? 2 : 1))));

      const existingTopics = await this.admin.listTopics();
      const topicsToCreate = this.topicConfigs.filter(
        config => !existingTopics.includes(config.name)
      );

      if (topicsToCreate.length > 0) {
        await this.admin.createTopics({
          topics: topicsToCreate.map((config) => {
            const entries = Object.entries((config.configs ?? {}) as Record<string, string>) as Array<[string, string]>;
            const numPartitions = Number(process.env[`KAFKA_PARTITIONS_${config.name.toUpperCase().replace(/-/g,'_')}`] || defaultPartitions || config.partitions || 1);
            const replicationFactor = Number(process.env[`KAFKA_RF_${config.name.toUpperCase().replace(/-/g,'_')}`] || defaultRF || config.replicationFactor || 1);
            return {
              topic: config.name,
              numPartitions,
              replicationFactor,
              configEntries: entries.map(([key, value]) => ({ name: key, value: String(value) })),
            } as any;
          }),
        });

        this.logger.log(`Created topics: ${topicsToCreate.map(t => t.name).join(', ')}`);
      }
    } catch (error) {
      this.logger.error('Failed to create topics:', error);
      // Do not rethrow to avoid crashing non-critical paths
    }
  }

  private async disconnectAll(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    // Disconnect all consumers
    for (const [id, consumer] of Array.from(this.consumers.entries())) {
      disconnectPromises.push(
        consumer.disconnect().catch(error => 
          this.logger.error(`Error disconnecting consumer ${id}:`, error)
        )
      );
    }

    // Disconnect producer and admin
    disconnectPromises.push(
      this.producer.disconnect().catch(error => 
        this.logger.error('Error disconnecting producer:', error)
      )
    );

    disconnectPromises.push(
      this.admin.disconnect().catch(error => 
        this.logger.error('Error disconnecting admin:', error)
      )
    );

    await Promise.all(disconnectPromises);
    this.isConnected = false;
    this.consumers.clear();
    this.subscriptions.clear();
  }

  private async processMessage(
    message: KafkaMessage, 
    handler: EventHandler,
    heartbeat: () => Promise<void>
  ): Promise<void> {
    if (!message.value) {
      this.logger.warn('Received null message value, skipping');
      return;
    }

    try {
      const event = JSON.parse(message.value.toString()) as DomainEvent;
      
      // Validate event structure
      if (!this.isValidEvent(event)) {
        this.logger.warn('Received invalid event structure, skipping');
        return;
      }

      // Send heartbeat to prevent session timeout
      await heartbeat();

      // Process the event
      await handler.handle(event);
      
      this.logger.debug(`Processed event ${event.eventType} (${event.eventId})`);
    } catch (error) {
      this.logger.error('Error processing message:', error);
      throw error;
    }
  }

  private async handleProcessingError(
    message: KafkaMessage,
    error: Error,
    originalTopic: string
  ): Promise<void> {
    try {
      // Send failed message to dead letter queue
      await this.producer.send({
        topic: 'dead-letter-queue',
        messages: [{
          key: message.key?.toString() || 'unknown',
          value: message.value,
          headers: {
            ...message.headers,
            'original-topic': originalTopic,
            'error-message': error.message,
            'error-timestamp': new Date().toISOString(),
            'processing-attempts': '1' // Could be enhanced with retry logic
          }
        }]
      });
    } catch (dlqError) {
      this.logger.error('Failed to send message to dead letter queue:', dlqError);
    }
  }

  private getTopicForEvent(event: DomainEvent): string {
    const topicMap: Record<string, string> = {
      'conversation': 'conversation-events',
      'ticket': 'ticket-events',
      'customer': 'customer-events',
      'ai-analysis': 'ai-analysis-events',
      'workflow': 'workflow-events',
      'sla': 'sla-events',
      'analytics': 'analytics-events',
      'integration': 'integration-events'
    };

    return topicMap[event.aggregateType] || 'conversation-events';
  }

  private generatePartitionKey(event: DomainEvent): string {
    // Use tenant ID and aggregate ID for consistent partitioning
    return `${event.tenantId}-${event.aggregateId}`;
  }

  private createHeaders(event: DomainEvent): Record<string, string> {
    return {
      'event-type': event.eventType,
      'aggregate-type': event.aggregateType,
      'aggregate-id': event.aggregateId,
      'tenant-id': event.tenantId,
      'event-version': event.version,
      'source': event.metadata.source,
      ...(event.correlationId && { 'correlation-id': event.correlationId }),
      ...(event.causationId && { 'causation-id': event.causationId }),
      ...(event.metadata.traceId && { 'trace-id': event.metadata.traceId }),
      ...(event.metadata.userId && { 'user-id': event.metadata.userId })
    };
  }

  private isValidEvent(event: any): event is DomainEvent {
    return (
      event &&
      typeof event.eventId === 'string' &&
      typeof event.eventType === 'string' &&
      typeof event.aggregateId === 'string' &&
      typeof event.aggregateType === 'string' &&
      typeof event.tenantId === 'string' &&
      event.eventData &&
      event.metadata &&
      event.timestamp
    );
  }

  private getBrokers(): string[] {
    const brokers = this.configService.get<string>('KAFKA_BROKERS', 'localhost:9092');
    return brokers.split(',').map(broker => broker.trim());
  }

  private getSSLConfig() {
    const sslEnabled = this.configService.get<boolean>('KAFKA_SSL_ENABLED', false);
    if (!sslEnabled) return undefined;

    return {
      rejectUnauthorized: this.configService.get<boolean>('KAFKA_SSL_REJECT_UNAUTHORIZED', true),
      ca: this.configService.get<string>('KAFKA_SSL_CA'),
      key: this.configService.get<string>('KAFKA_SSL_KEY'),
      cert: this.configService.get<string>('KAFKA_SSL_CERT')
    };
  }

  private getSASLConfig() {
    const mechanism = this.configService.get<string>('KAFKA_SASL_MECHANISM');
    if (!mechanism) return undefined;

    const username = this.configService.get<string>('KAFKA_SASL_USERNAME', '');
    const password = this.configService.get<string>('KAFKA_SASL_PASSWORD', '');

    if (mechanism === 'plain') {
      return { mechanism: 'plain' as const, username, password };
    } else if (mechanism === 'scram-sha-256') {
      return { mechanism: 'scram-sha-256' as const, username, password };
    } else if (mechanism === 'scram-sha-512') {
      return { mechanism: 'scram-sha-512' as const, username, password };
    }
    
    return undefined;
  }

  private getLogLevel() {
    const level = this.configService.get<string>('KAFKA_LOG_LEVEL', 'WARN');
    const levelMap: Record<string, number> = {
      'NOTHING': logLevel.NOTHING,
      'ERROR': logLevel.ERROR,
      'WARN': logLevel.WARN,
      'INFO': logLevel.INFO,
      'DEBUG': logLevel.DEBUG
    };
    return levelMap[level] || logLevel.WARN;
  }
}