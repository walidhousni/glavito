import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AdvancedEventBusService } from '@glavito/shared-kafka';
import {
  ConversationStartedEvent,
  MessageReceivedEvent,
  MessageSentEvent,
  ChannelMessage,
  ProcessedMessage,
  ConversationThread,
  ConversationContext,
  ConversationEvent,
  ChannelAdapter,
  ChannelType
} from '@glavito/shared-types';
import { WhatsAppAdapter } from './adapters/whatsapp-adapter';
import { InstagramAdapter } from './adapters/instagram-adapter';
import { EmailAdapter } from './adapters/email-adapter';
import { v4 as uuidv4 } from 'uuid';

// Interfaces moved to shared types

@Injectable()
export class ConversationOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(ConversationOrchestratorService.name);
  private readonly channelAdapters = new Map<ChannelType, ChannelAdapter>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: AdvancedEventBusService,
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly emailAdapter: EmailAdapter
  ) {}

  async onModuleInit() {
    // Register channel adapters
    this.channelAdapters.set('whatsapp' as any, this.whatsappAdapter);
    this.channelAdapters.set('instagram' as any, this.instagramAdapter);
    this.channelAdapters.set('email' as any, this.emailAdapter as any);
    
    this.logger.log('Conversation Orchestrator initialized with channel adapters');
  }

  async ingestMessage(channelMessage: ChannelMessage, tenantId: string): Promise<ProcessedMessage> {
    try {
      // Find or create conversation
      const conversation = await this.findOrCreateConversation(channelMessage, tenantId);
      
      // Find or create customer
      await this.findOrCreateCustomer(channelMessage, tenantId);
      
      // Normalize message content
      const normalizedContent = await this.normalizeMessageContent(channelMessage);
      
      // Create processed message
      const processedMessage: ProcessedMessage = {
        ...channelMessage,
        conversationId: conversation.id,
        // customerId: customer.id, // Removed as it doesn't exist in ProcessedMessage type
        normalizedContent,
        threadingContext: await this.determineThreadingContext(channelMessage, conversation.id),
        processingMetadata: {
           processedAt: new Date(),
           processingVersion: '1.0',
           channelAdapter: channelMessage.channel || 'unknown',
           normalizationApplied: ['content-cleanup', 'format-standardization'],
           validationResults: []
         }
      };

      // Save message to database
      await this.saveMessage(processedMessage, tenantId);

      // Update conversation metadata
      await this.updateConversationMetadata(conversation.id, {
        lastMessageAt: channelMessage.timestamp,
        messageCount: { increment: 1 }
      });

      // Publish message received event
      await this.publishMessageReceivedEvent(processedMessage, tenantId);

      this.logger.debug(`Processed message ${channelMessage.id} for conversation ${conversation.id}`);
      return processedMessage;

    } catch (error) {
      this.logger.error(`Failed to ingest message ${channelMessage.id}:`, error);
      throw error;
    }
  }

  async sendMessage(
    conversationId: string,
    agentId: string,
    content: string,
    messageType: string,
    tenantId: string,
    options?: {
      templateId?: string;
      templateParams?: Record<string, string>;
      attachments?: any[];
    }
  ): Promise<ProcessedMessage> {
    try {
      // Get conversation details
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Create outgoing message
      const messageId = uuidv4();
      const message: ProcessedMessage = {
        id: messageId,
        conversationId,
        // customerId: conversation.customerId, // Removed as it doesn't exist in ProcessedMessage type
        senderId: agentId,
        senderType: 'agent',
        content,
        normalizedContent: content, // For agent messages, content is already normalized
        messageType: messageType as any,
        timestamp: new Date(),
        metadata: {
          templateId: options?.templateId,
          templateParams: options?.templateParams,
          attachments: options?.attachments
        },
        processingMetadata: {
           processedAt: new Date(),
           processingVersion: '1.0',
           channelAdapter: 'agent',
           normalizationApplied: ['content-cleanup', 'format-standardization'],
           validationResults: []
         }
      };

      // Save message to database
      await this.saveMessage(message, tenantId);

      // Update conversation
      await this.updateConversationMetadata(conversationId, {
        lastMessageAt: message.timestamp,
        messageCount: { increment: 1 }
      });

      // Publish message sent event
      await this.publishMessageSentEvent(message, tenantId);

      this.logger.debug(`Sent message ${messageId} in conversation ${conversationId}`);
      return message;

    } catch (error) {
      this.logger.error(`Failed to send message in conversation ${conversationId}:`, error);
      throw error;
    }
  }

  async createConversationThread(
    customerId: string,
    channelId: string,
    tenantId: string,
    options?: {
      subject?: string;
      priority?: string;
      assignedAgentId?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    }
  ): Promise<ConversationThread> {
    try {
      const conversationId = uuidv4();
      
      const conversation = await this.prisma['conversation'].create({
        data: {
          id: conversationId,
          tenantId,
          customerId,
          channelId,
          subject: options?.subject,
          status: 'active',
          metadata: {
            priority: options?.priority || 'medium',
            assignedAgentId: options?.assignedAgentId,
            tags: options?.tags || [],
            ...options?.metadata
          }
        }
      });

      // Publish conversation started event
      await this.publishConversationStartedEvent(conversation, tenantId);

      const thread: ConversationThread = {
        id: conversation.id,
        tenantId: conversation.tenantId,
        customerId: conversation.customerId,
        channelId: conversation.channelId,
        subject: conversation.subject || undefined,
        status: conversation.status as any,
        priority: (conversation.metadata as any)?.priority || 'medium',
        assignedAgentId: (conversation.metadata as any)?.assignedAgentId,
        tags: (conversation.metadata as any)?.tags || [],
        metadata: conversation.metadata as Record<string, any>,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        lastMessageAt: undefined
      };

      this.logger.debug(`Created conversation thread ${conversationId}`);
      return thread;

    } catch (error) {
      this.logger.error(`Failed to create conversation thread:`, error);
      throw error;
    }
  }

  async mergeConversations(conversationIds: string[], tenantId: string): Promise<ConversationThread> {
    try {
      if (conversationIds.length < 2) {
        throw new Error('At least 2 conversations are required for merging');
      }

      // Get all conversations
      const conversations = await this.prisma['conversation'].findMany({
        where: {
          id: { in: conversationIds },
          tenantId
        },
        include: {
          messages: true
        }
      });

      if (conversations.length !== conversationIds.length) {
        throw new Error('Some conversations not found');
      }

      // Determine primary conversation (most recent or with most messages)
      const primaryConversation = conversations.reduce((primary: any, current: any) => {
        const primaryMessageCount = primary.messages?.length || 0;
        const currentMessageCount = current.messages?.length || 0;
        
        if (currentMessageCount > primaryMessageCount) return current;
        if (currentMessageCount === primaryMessageCount && current.updatedAt > primary.updatedAt) return current;
        return primary;
      });

      // Merge conversations in transaction
      const mergedConversation = await this.prisma['$transaction'](async (tx: any) => {
        // Move all messages to primary conversation
        for (const conversation of conversations) {
          if (conversation.id !== primaryConversation.id) {
            await tx.message.updateMany({
              where: { conversationId: conversation.id },
              data: { conversationId: primaryConversation.id }
            });

            // Mark conversation as merged
            await tx.conversation.update({
              where: { id: conversation.id },
              data: {
                status: 'closed',
                metadata: {
                  ...(conversation.metadata as any),
                  mergedInto: primaryConversation.id,
                  mergedAt: new Date()
                }
              }
            });
          }
        }

        // Update primary conversation metadata
        const allTags = [...new Set(conversations.flatMap((c: any) => (c.metadata as any)?.tags || []))];
        const mergedMetadata = {
          ...(primaryConversation.metadata as any),
          tags: allTags,
          mergedFrom: conversationIds.filter(id => id !== primaryConversation.id),
          mergedAt: new Date()
        };

        return await tx['conversation'].update({
          where: { id: primaryConversation.id },
          data: {
            metadata: mergedMetadata,
            updatedAt: new Date()
          }
        });
      });

      const thread: ConversationThread = {
        id: mergedConversation.id,
        tenantId: mergedConversation.tenantId,
        customerId: mergedConversation.customerId,
        channelId: mergedConversation.channelId,
        subject: mergedConversation.subject || undefined,
        status: mergedConversation.status as any,
        priority: (mergedConversation.metadata as any)?.priority || 'medium',
        assignedAgentId: (mergedConversation.metadata as any)?.assignedAgentId,
        tags: (mergedConversation.metadata as any)?.tags || [],
        metadata: mergedConversation.metadata as Record<string, any>,
        createdAt: mergedConversation.createdAt,
        updatedAt: mergedConversation.updatedAt
      };

      this.logger.debug(`Merged ${conversationIds.length} conversations into ${primaryConversation.id}`);
      return thread;

    } catch (error) {
      this.logger.error(`Failed to merge conversations:`, error);
      throw error;
    }
  }

  async getConversationContext(conversationId: string): Promise<ConversationContext> {
    try {
      const conversation = await this.prisma['conversation'].findUnique({
        where: { id: conversationId },
        include: {
          customer: true,
          channel: true,
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      });

      if (!conversation) {
        throw new Error(`Conversation ${conversationId} not found`);
      }

      // Build comprehensive context
      const context: ConversationContext = {
        conversationId,
        customerId: conversation.customerId,
        customerProfile: {
          id: conversation.customer.id,
          name: `${conversation.customer.firstName || ''} ${conversation.customer.lastName || ''}`.trim(),
          email: conversation.customer.email || undefined,
          phone: conversation.customer.phone || undefined,
          tags: [],
          customFields: {},
          communicationPreferences: {},
          behaviorProfile: {}
        } as any,
        conversationHistory: {
          messageCount: conversation.messages.length,
          // Calculate average response time, etc.
        } as any,
        channelContext: {
          channel: conversation.channel.type as any,
          channelName: conversation.channel.name || '',
          channelConfig: conversation.channel.config as Record<string, any>,
          channelCapabilities: {
            supportsAttachments: true,
            supportedAttachmentTypes: ['image', 'document'],
            supportsLocation: false,
            supportsContacts: false,
            supportsTemplates: false
          } as any,
          channelSpecificData: conversation.channel.config as Record<string, any>
        },
        businessContext: {
          // Add related tickets, purchase history, etc.
        } as any,
        aiContext: {
          // Add AI-derived insights
        }
      };

      return context;

    } catch (error) {
      this.logger.error(`Failed to get conversation context for ${conversationId}:`, error);
      throw error;
    }
  }

  async updateConversationContext(
    conversationId: string,
    context: Partial<ConversationContext>
  ): Promise<void> {
    try {
      // Update conversation metadata with context information
      await this.prisma['conversation'].update({
        where: { id: conversationId },
        data: {
          metadata: { context: context } as any,
          updatedAt: new Date()
        }
      });

      this.logger.debug(`Updated context for conversation ${conversationId}`);

    } catch (error) {
      this.logger.error(`Failed to update conversation context for ${conversationId}:`, error);
      throw error;
    }
  }

  async broadcastMessage(conversationId: string, message: ProcessedMessage): Promise<void> {
    try {
      // In a real implementation, this would broadcast to WebSocket connections
      // For now, we'll just log and potentially publish an event
      
      this.logger.debug(`Broadcasting message ${message.id} to conversation ${conversationId}`);
      
      // Could publish a real-time event here for WebSocket subscribers
      // await this.eventBus.publish(realTimeMessageEvent);

    } catch (error) {
      this.logger.error(`Failed to broadcast message ${message.id}:`, error);
      throw error;
    }
  }

  async notifyAgents(conversationId: string, event: ConversationEvent): Promise<void> {
    try {
      // Get assigned agents for the conversation
      const conversation = await this.getConversation(conversationId);
      if (!conversation) return;

      // In a real implementation, send notifications to agents
      this.logger.debug(`Notifying agents about ${(event as any).type} in conversation ${conversationId}`);

      // Could integrate with notification service here
      // await this.notificationService.notifyAgents(agentIds, event);

    } catch (error) {
      this.logger.error(`Failed to notify agents for conversation ${conversationId}:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async findOrCreateConversation(
    channelMessage: ChannelMessage,
    tenantId: string
  ): Promise<any> {
    // If message has conversationId, try to find existing conversation
    if (channelMessage.conversationId) {
      const existing = await this.prisma['conversation'].findUnique({
        where: { id: channelMessage.conversationId }
      });
      if (existing) return existing;
    }

    // Find customer first to link conversation
    const customer = await this.findOrCreateCustomer(channelMessage, tenantId);
    
    // Find channel
    const channel = await this.prisma['channel'].findFirst({
      where: {
        tenantId,
        type: channelMessage.channel,
        isActive: true
      }
    });

    if (!channel) {
      throw new Error(`Channel ${channelMessage.channel} not found for tenant ${tenantId}`);
    }

    // Create new conversation
    return await this.prisma['conversation'].create({
      data: {
        id: uuidv4(),
        tenantId,
        customerId: customer.id,
        channelId: channel.id,
        status: 'active',
        metadata: {
          initiatedBy: channelMessage.senderType,
          channel: channelMessage.channel
        }
      }
    });
  }

  private async findOrCreateCustomer(channelMessage: ChannelMessage, tenantId: string): Promise<any> {
    // Try to find customer by sender ID (could be phone, email, etc.)
    let customer = await this.prisma['customer'].findFirst({
      where: {
        tenantId,
        OR: [
          { email: channelMessage.senderId },
          { phone: channelMessage.senderId }
        ]
      }
    });

    if (!customer) {
      // Create new customer
      customer = await this.prisma['customer'].create({
        data: {
          id: uuidv4(),
          tenantId,
          // Determine if senderId is email or phone
          ...(channelMessage.senderId.includes('@') 
            ? { email: channelMessage.senderId }
            : { phone: channelMessage.senderId }
          ),
          customFields: {
            source: channelMessage.channel,
            firstContact: channelMessage.timestamp
          }
        }
      });
    }

    return customer;
  }

  private async normalizeMessageContent(channelMessage: ChannelMessage): Promise<string> {
    let normalized = channelMessage.content;

    // Remove channel-specific formatting
    switch (channelMessage.channel) {
      case 'whatsapp':
        // Remove WhatsApp formatting like *bold*, _italic_
        normalized = normalized.replace(/[*_~]/g, '');
        break;
      case 'email':
        // Remove email signatures, quoted text, etc.
        normalized = this.cleanEmailContent(normalized);
        break;
      case 'instagram':
        // Handle Instagram-specific content
        normalized = this.cleanInstagramContent(normalized);
        break;
    }

    // General cleanup
    normalized = normalized.trim();
    
    return normalized;
  }

  private cleanEmailContent(content: string): string {
    // Remove common email signatures and quoted text
    const lines = content.split('\n');
    const cleanLines = [];
    
    for (const line of lines) {
      // Skip quoted lines (starting with >)
      if (line.trim().startsWith('>')) continue;
      
      // Skip signature lines
      if (line.includes('--') || line.includes('Sent from')) break;
      
      cleanLines.push(line);
    }
    
    return cleanLines.join('\n').trim();
  }

  private cleanInstagramContent(content: string): string {
    // Remove Instagram-specific elements like @mentions, #hashtags for processing
    // but keep them in the original content
    return content.trim();
  }

  private async determineThreadingContext(
    channelMessage: ChannelMessage,
    conversationId: string
  ): Promise<any> {
    // Determine if this message is part of a thread
    const channelMessageAny = channelMessage as any;
    if (channelMessageAny['replyToMessageId']) {
      return {
        parentMessageId: channelMessageAny['replyToMessageId'],
        isThreadStart: false
      };
    }

    return {
      isThreadStart: true
    };
  }

  private async saveMessage(message: ProcessedMessage, tenantId: string): Promise<void> {
    const messageAny = message as any;
    await this.prisma['message'].create({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderType: message.senderType,
        content: message.content,
        messageType: messageAny['messageType'] || 'text',
        metadata: {
          normalizedContent: message.normalizedContent,
          channelMessageId: messageAny['channelMessageId'],
          attachments: messageAny['attachments'],
          location: messageAny['location'],
          threadingContext: messageAny['threadingContext'],
          ...message.metadata
        },
        createdAt: message.timestamp
      }
    });
  }

  private async updateConversationMetadata(
    conversationId: string,
    updates: any
  ): Promise<void> {
    await this.prisma['conversation'].update({
      where: { id: conversationId },
      data: {
        ...updates,
        updatedAt: new Date()
      }
    });
  }

  private async getConversation(conversationId: string): Promise<any> {
    return await this.prisma['conversation'].findUnique({
      where: { id: conversationId },
      include: {
        customer: true,
        channel: true
      }
    });
  }

  // Event publishing methods

  private async publishMessageReceivedEvent(
    message: ProcessedMessage,
    tenantId: string
  ): Promise<void> {
    const messageAny = message as any;
    const event: MessageReceivedEvent = {
      eventId: uuidv4(),
      eventType: 'conversation.message.received',
      aggregateId: message.conversationId,
      aggregateType: 'conversation',
      tenantId,
      timestamp: new Date(),
      version: '1.0',
      eventData: {
        conversationId: message.conversationId,
        messageId: message.id,
        senderId: message.senderId,
        senderType: message.senderType as any,
        content: message.content,
        messageType: messageAny['messageType'] || 'text',
        channel: messageAny['channel'],
        channelMessageId: messageAny['channelMessageId'],
        attachments: messageAny['attachments'],
        replyToMessageId: messageAny['replyToMessageId'],
        isForwarded: messageAny['isForwarded'],
        location: messageAny['location']
      },
      metadata: {
        source: 'conversation-orchestrator',
        userId: message.senderType === 'agent' ? message.senderId : undefined
      }
    };

    await this.eventBus.publish(event);
  }

  private async publishMessageSentEvent(
    message: ProcessedMessage,
    tenantId: string
  ): Promise<void> {
    const messageAny = message as any;
    const event: MessageSentEvent = {
      eventId: uuidv4(),
      eventType: 'conversation.message.sent',
      aggregateId: message.conversationId,
      aggregateType: 'conversation',
      tenantId,
      timestamp: new Date(),
      version: '1.0',
      eventData: {
        conversationId: message.conversationId,
        messageId: message.id,
        agentId: message.senderId,
        content: message.content,
        messageType: messageAny['messageType'] || 'text',
        channel: messageAny['channel'],
        deliveryStatus: 'sent',
        templateId: message.metadata?.['templateId'],
        templateParams: message.metadata?.['templateParams']
      },
      metadata: {
        source: 'conversation-orchestrator',
        userId: message.senderId
      }
    };

    await this.eventBus.publish(event);
  }

  private async publishConversationStartedEvent(
    conversation: any,
    tenantId: string
  ): Promise<void> {
    const event: ConversationStartedEvent = {
      eventId: uuidv4(),
      eventType: 'conversation.started',
      aggregateId: conversation.id,
      aggregateType: 'conversation',
      tenantId,
      timestamp: new Date(),
      version: '1.0',
      eventData: {
        conversationId: conversation.id,
        customerId: conversation.customerId,
        channel: conversation.channelId,
        initiatedBy: (conversation.metadata as any)?.initiatedBy || 'customer',
        context: conversation.metadata as Record<string, any>
      },
      metadata: {
        source: 'conversation-orchestrator'
      }
    };

    await this.eventBus.publish(event);
  }
}