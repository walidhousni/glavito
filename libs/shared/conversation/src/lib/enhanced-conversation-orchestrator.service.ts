import { Injectable, Logger, OnModuleInit, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AdvancedEventBusService } from '@glavito/shared-kafka';
import {
  ConversationStartedEvent,
  MessageReceivedEvent,
  MessageSentEvent,
  ConversationAssignedEvent,
  ChannelMessage,
  ProcessedMessage,
  ConversationThread,
  ConversationContext,
  CreateConversationDto,
  UpdateConversationDto,
  SendMessageDto,
  IngestMessageDto,
  MergeConversationsDto,
  AssignConversationDto,
  ConversationFilterDto,
  ConversationListResponseDto,
  ConversationDetailResponseDto,
  ApiResponse,
  ChannelAdapter,
  ChannelType,
  OutgoingMessage,
  MessageDeliveryResult,
  WebhookPayload
} from '@glavito/shared-types';
import { WhatsAppAdapter } from './adapters/whatsapp-adapter';
import { InstagramAdapter } from './adapters/instagram-adapter';
import { EmailAdapter } from './adapters/email-adapter';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class EnhancedConversationOrchestratorService implements OnModuleInit {
  private readonly logger = new Logger(EnhancedConversationOrchestratorService.name);
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
    this.channelAdapters.set(ChannelType.WHATSAPP, this.whatsappAdapter);
    this.channelAdapters.set(ChannelType.INSTAGRAM, this.instagramAdapter);
    this.channelAdapters.set(ChannelType.EMAIL, this.emailAdapter as ChannelAdapter);
    
    this.logger.log('Enhanced Conversation Orchestrator initialized with channel adapters');
  }

  // Main message ingestion method
  async ingestMessage(dto: IngestMessageDto): Promise<ApiResponse<ProcessedMessage>> {
    try {
      const { channelMessage, tenantId } = dto;
      
      // Validate channel message
      const validationResult = this.validateChannelMessage(channelMessage);
      if (!validationResult.isValid) {
        throw new BadRequestException(validationResult.errors);
      }

      // Find or create conversation
      const conversation = await this.findOrCreateConversation(channelMessage, tenantId);
      
      // Find or create customer
      await this.findOrCreateCustomer(channelMessage, tenantId);
      
      // Auto ticket linking/creation per channel
      if (!conversation.ticketId) {
        const openStatuses = ['open', 'pending', 'in_progress', 'waiting'];
        const recentThreshold = new Date(Date.now() - 6 * 60 * 60 * 1000); // last 6h
        const existingTicket = await (this.prisma['ticket'] as any).findFirst({
          where: {
            tenantId,
            customerId: conversation.customerId,
            status: { in: openStatuses },
            updatedAt: { gte: recentThreshold }
          },
          orderBy: { updatedAt: 'desc' }
        });

        let ticketId = existingTicket?.id as string | undefined;
        if (!ticketId) {
          // Create new ticket
          const subject = (channelMessage.content || '').slice(0, 80) || `${(channelMessage as any).channel} message`;
          const description = channelMessage.content || subject;
          const created = await (this.prisma['ticket'] as any).create({
            data: {
              tenantId,
              customerId: conversation.customerId,
              channelId: conversation.channelId,
              subject,
              description,
              status: 'open',
              priority: 'medium',
              tags: [(channelMessage as any).channel].filter(Boolean)
            }
          });
          ticketId = created.id as string;
        }

        await (this.prisma['conversation'] as any).update({
          where: { id: conversation.id },
          data: { ticketId }
        });
        conversation.ticketId = ticketId;
      }

      // Dedupe by provider channel message id
      const providerMessageId = (channelMessage as any).whatsappData?.messageId
        || (channelMessage as any).instagramData?.messageId
        || (channelMessage as any).emailData?.messageId;
      if (providerMessageId) {
        const existing = await (this.prisma['messageAdvanced'] as any).findFirst({
          where: { channelMessageId: providerMessageId }
        });
        if (existing) {
          const processed = this.mapToProcessedMessage(existing);
          this.logger.debug(`Duplicate provider message ${providerMessageId} skipped`);
          return { success: true, data: processed };
        }
      }

      // Normalize message content
      const normalizedContent = await this.normalizeMessageContent(channelMessage);
      
      // Email threading correlation: map In-Reply-To to generic replyToMessageId for threading
      try {
        const chAny = channelMessage as any;
        if (chAny?.channel === 'email' && chAny?.emailData?.inReplyTo && !chAny.replyToMessageId) {
          chAny.replyToMessageId = chAny.emailData.inReplyTo;
        }
      } catch {
        // best-effort only
      }

      // Create processed message
      const processedMessage: ProcessedMessage = {
        ...channelMessage,
        conversationId: conversation.id,
        normalizedContent,
        threadingContext: await this.determineThreadingContext(channelMessage, conversation.id),
        processingMetadata: {
          processedAt: new Date(),
          processingVersion: '2.0',
          channelAdapter: channelMessage.channel,
          normalizationApplied: ['content_cleanup', 'emoji_normalization'],
          validationResults: []
        }
      };

      // Save message to database
      await this.saveProcessedMessage(processedMessage, tenantId);

      // Update conversation metrics
      await this.updateConversationMetrics(conversation.id, processedMessage);

      // AI Autopilot (non-blocking best-effort): publish a request for downstream AI worker
      try {
        const cfg = await (this.prisma as any).aISettings.findUnique({ where: { tenantId } });
        const mode = (cfg?.mode || 'off') as 'off'|'draft'|'auto';
        if (mode !== 'off' && processedMessage.senderType === 'customer') {
          const allowedChannels: string[] = Array.isArray(cfg?.allowedChannels) ? cfg.allowedChannels : [];
          const channelType = (channelMessage as any)?.channel;
          if (!allowedChannels.length || allowedChannels.includes(channelType)) {
            // Simple per-conversation rate limit using event logs in the last hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const requestsLastHour = await (this.prisma['conversationEventLog'] as any).count({
              where: { conversationId: conversation.id, eventType: { in: ['autopilot.request', 'autopilot.sent'] }, createdAt: { gte: oneHourAgo } }
            });
            if (typeof cfg?.maxAutoRepliesPerHour === 'number' && requestsLastHour >= cfg.maxAutoRepliesPerHour) {
              throw new Error('autopilot_rate_limited');
            }
            const prior = await this.prisma['message'].findMany({
              where: { conversationId: conversation.id },
              orderBy: { createdAt: 'desc' },
              take: 10,
              select: { content: true }
            }) as Array<{ content: string }>;
            const previous = prior.reverse().map(m => m.content);
            await (this.eventBus as any).publishTicketEvent?.({
              eventType: 'conversation.autopilot.request',
              tenantId,
              timestamp: new Date().toISOString(),
              data: {
                conversationId: conversation.id,
                ticketId: conversation.ticketId,
                messageId: (processedMessage as any).id,
                content: processedMessage.content,
                previousMessages: previous,
                channelType,
                mode,
                minConfidence: cfg?.minConfidence ?? 0.7
              }
            });
            // Log in DB for observability
            await (this.prisma['conversationEventLog'] as any).create({
              data: {
                conversationId: conversation.id,
                eventType: 'autopilot.request',
                eventData: { channelType, mode, minConfidence: cfg?.minConfidence ?? 0.7 }
              }
            });
          }
        }
      } catch { /* noop */ }

      // Publish message received event
      await this.publishMessageReceivedEvent(processedMessage, tenantId);

      this.logger.debug(`Processed message ${channelMessage.id} for conversation ${conversation.id}`);
      
      return {
        success: true,
        data: processedMessage
      };

    } catch (error) {
      this.logger.error('Failed to ingest message:', error);
      return {
        success: false,
        error: {
          code: 'MESSAGE_INGESTION_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  }

  // Send message through appropriate channel
  async sendMessage(conversationId: string, dto: SendMessageDto, tenantId: string, agentId: string): Promise<ApiResponse<MessageDeliveryResult>> {
    try {
      // Get conversation details
      const conversation = await this.getConversationById(conversationId, tenantId);
      if (!conversation) {
        throw new NotFoundException(`Conversation ${conversationId} not found`);
      }

      // Get channel adapter
      const channelAdapter = this.getChannelAdapter(conversation.channel.type as ChannelType);
      
      // Create outgoing message with channel-aware recipient resolution
      const recipientId = (() => {
        const channel = (conversation.channel?.type || '').toString().toLowerCase();
        const customer = conversation.customer || {};
        if (channel === 'instagram') {
          return (customer.customFields as any)?.instagramId || customer.customerId || customer.id;
        }
        if (channel === 'whatsapp') {
          const phone: string = (customer.phone || '').toString();
          const digits = phone.replace(/\D/g, '');
          return digits || phone || customer.customerId || customer.id;
        }
        return customer.email || customer.customerId || customer.id;
      })();

      const outgoingMessage: OutgoingMessage = {
        content: dto.content,
        messageType: dto.messageType,
        recipientId,
        attachments: dto.attachments,
        templateId: dto.templateId,
        templateParams: dto.templateParams,
        replyToMessageId: dto.replyToMessageId,
        metadata: dto.metadata
      };

      // Validate message
      const validationResults = channelAdapter.validateMessage(outgoingMessage);
      const hasErrors = validationResults.some((result: any) => !result.isValid);
      
      if (hasErrors) {
        const errors = validationResults
          .filter((r: any) => !r.isValid)
          .map((r: any) => r.errors?.[0] || 'Validation error');
        throw new BadRequestException(`Message validation failed: ${errors.join(', ')}`);
      }

      // Send message through channel adapter
      const deliveryResult = await channelAdapter.sendMessage(conversationId, outgoingMessage);

      // Create processed message for our records
      const processedMessage: ProcessedMessage = {
        id: uuidv4(),
        conversationId,
        senderId: agentId,
        senderType: 'agent',
        content: dto.content,
        messageType: dto.messageType,
        timestamp: new Date(),
        normalizedContent: dto.content,
        threadingContext: {
          isThreadStart: false,
          parentMessageId: dto.replyToMessageId
        },
        processingMetadata: {
          processedAt: new Date(),
          processingVersion: '2.0',
          channelAdapter: conversation.channel.type,
          normalizationApplied: [],
          validationResults
        }
      };

      // Attach channel and provider message id for downstream linking
      (processedMessage as any).channel = conversation.channel.type;
      (processedMessage as any).channelMessageId = deliveryResult.channelMessageId;
      (processedMessage as any).metadata = {
        ...(processedMessage as any).metadata,
        deliveryStatus: deliveryResult.status,
        provider: conversation.channel.type,
      };

      // Save message to database
      await this.saveProcessedMessage(processedMessage, tenantId);

      // Update conversation metrics
      await this.updateConversationMetrics(conversationId, processedMessage);

      // Publish message sent event
      await this.publishMessageSentEvent(processedMessage, tenantId);

      return {
        success: true,
        data: deliveryResult
      };

    } catch (error) {
      this.logger.error(`Failed to send message in conversation ${conversationId}:`, error);
      return {
        success: false,
        error: {
          code: 'MESSAGE_SEND_FAILED',
          message: (error as Error).message || 'Message delivery failed'
        }
      };
    }
  }

  // Create new conversation
  async createConversation(dto: CreateConversationDto, tenantId: string): Promise<ApiResponse<ConversationThread>> {
    try {
      const conversationId = uuidv4();
      
      const conversation = await (this.prisma['conversationAdvanced'] as any).create({
        data: {
          id: conversationId,
          tenantId,
          customerId: dto.customerId,
          channelId: dto.channelId,
          subject: dto.subject,
          status: 'active',
          priority: dto.priority || 'medium',
          assignedAgentId: dto.assignedAgentId,
          teamId: dto.teamId,
          tags: dto.tags || [],
          metadata: {
            ...dto.metadata,
            createdBy: 'system',
            source: 'api'
          }
        }
      });

      // Publish conversation started event (best-effort)
      try {
        await this.publishConversationStartedEvent(conversation, tenantId);
      } catch (e) {
        this.logger.warn(`Event publish failed for conversation.started (${(e as Error).message})`);
      }

      const thread = this.mapToConversationThread(conversation);

      return {
        success: true,
        data: thread
      };

    } catch (error) {
      this.logger.error('Failed to create conversation:', error);
      return {
        success: false,
        error: {
          code: 'CONVERSATION_CREATION_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  }

  // Update conversation
  async updateConversation(conversationId: string, dto: UpdateConversationDto, tenantId: string): Promise<ApiResponse<ConversationThread>> {
    try {
      const conversation = await (this.prisma['conversationAdvanced'] as any).update({
        where: {
          id: conversationId,
          tenantId
        },
        data: {
          subject: dto.subject,
          status: dto.status,
          priority: dto.priority,
          assignedAgentId: dto.assignedAgentId,
          teamId: dto.teamId,
          tags: dto.tags,
          metadata: {
            ...dto.metadata,
            updatedAt: new Date()
          },
          updatedAt: new Date()
        },
        include: {
          customer: true,
          channel: true,
          assignedAgent: true,
          team: true
        }
      });

      // Log conversation event
      await this.logConversationEvent(conversationId, 'conversation_updated', {
        changes: dto,
        updatedAt: new Date()
      });

      const thread = this.mapToConversationThread(conversation);

      return {
        success: true,
        data: thread
      };

    } catch (error) {
      this.logger.error(`Failed to update conversation ${conversationId}:`, error);
      return {
        success: false,
        error: {
          code: 'CONVERSATION_UPDATE_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  }

  // Get conversations with filtering and pagination
  async getConversations(filter: ConversationFilterDto, tenantId: string): Promise<ApiResponse<ConversationListResponseDto>> {
    try {
      const {
        status,
        priority,
        channelType,
        assignedAgentId,
        teamId,
        tags,
        customerId,
        dateRange,
        search,
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = filter;

      const skip = (page - 1) * limit;

      // Build where clause
      const whereClause: any = {
        tenantId
      };

      if (status?.length) {
        whereClause.status = { in: status };
      }

      if (priority?.length) {
        whereClause.priority = { in: priority };
      }

      if (channelType?.length) {
        whereClause.channel = {
          type: { in: channelType }
        };
      }

      if (assignedAgentId) {
        whereClause.assignedAgentId = assignedAgentId;
      }

      if (teamId) {
        whereClause.teamId = teamId;
      }

      if (customerId) {
        whereClause.customerId = customerId;
      }

      if (tags?.length) {
        whereClause.tags = {
          hasSome: tags
        };
      }

      if (dateRange) {
        whereClause.createdAt = {
          gte: dateRange.startDate,
          lte: dateRange.endDate
        };
      }

      if (search) {
        whereClause.OR = [
          { subject: { contains: search, mode: 'insensitive' } },
          { customer: { firstName: { contains: search, mode: 'insensitive' } } },
          { customer: { lastName: { contains: search, mode: 'insensitive' } } },
          { customer: { email: { contains: search, mode: 'insensitive' } } }
        ];
      }

      // Get conversations and total count
      const [conversations, total] = await Promise.all([
        (this.prisma['conversationAdvanced'] as any).findMany({
          where: whereClause,
          include: {
            customer: true,
            channel: true,
            assignedAgent: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            },
            team: {
              select: {
                id: true,
                name: true
              }
            },
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: {
                id: true,
                content: true,
                senderType: true,
                messageType: true,
                createdAt: true
              }
            },
            aiAnalysis: true
          },
          orderBy: { [sortBy]: sortOrder },
          skip,
          take: limit
        }),
        this.prisma['conversationAdvanced'].count({ where: whereClause })
      ]);

      const threads = conversations.map((conv: any) => this.mapToConversationThread(conv));

      const response: ConversationListResponseDto = {
        conversations: threads,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        },
        filters: filter
      };

      return {
        success: true,
        data: response
      };

    } catch (error) {
      this.logger.error('Failed to get conversations:', error);
      return {
        success: false,
        error: {
          code: 'CONVERSATIONS_FETCH_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  }

  // Get conversation details with full context
  async getConversationDetails(conversationId: string, tenantId: string): Promise<ApiResponse<ConversationDetailResponseDto>> {
    try {
      const conversation = await (this.prisma['conversationAdvanced'] as any).findUnique({
        where: {
          id: conversationId,
          tenantId
        },
        include: {
          customer: true,
          channel: true,
          assignedAgent: true,
          team: true,
          messages: {
            orderBy: { createdAt: 'asc' },
            include: {
              attachments: true,
              aiAnalysis: true
            }
          },
          participants: true,
          notes: {
            include: {
              author: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            }
          },
          aiAnalysis: true,
          events: {
            orderBy: { createdAt: 'desc' },
            take: 50
          }
        }
      });

      if (!conversation) {
        throw new NotFoundException(`Conversation ${conversationId} not found`);
      }

      // Build conversation context
      const context = await this.buildConversationContext(conversation);

      // Map messages
      const messages = (conversation as any).messages.map((msg: any) => this.mapToProcessedMessage(msg));

      // Build participants list
        const participants: Array<{id: string; name: string; type: 'customer' | 'agent'; avatar?: string}> = [
          {
            id: (conversation as any).customer.id,
            name: `${(conversation as any).customer.firstName || ''} ${(conversation as any).customer.lastName || ''}`.trim() || 'Unknown Customer',
            type: 'customer' as const,
            avatar: undefined
          }
        ];
        
        if ((conversation as any).assignedAgent) {
          participants.push({
            id: (conversation as any).assignedAgent.id,
            name: `${(conversation as any).assignedAgent.firstName} ${(conversation as any).assignedAgent.lastName}`,
            type: 'agent' as const,
            avatar: (conversation as any).assignedAgent.avatar
          });
        }

      const response: ConversationDetailResponseDto = {
        conversation: this.mapToConversationThread(conversation),
        messages,
        context,
        participants
      };

      return {
        success: true,
        data: response
      };

    } catch (error) {
      this.logger.error(`Failed to get conversation details for ${conversationId}:`, error);
      return {
        success: false,
        error: {
          code: 'CONVERSATION_DETAILS_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  } 
 // Merge multiple conversations
  async mergeConversations(dto: MergeConversationsDto, tenantId: string): Promise<ApiResponse<ConversationThread>> {
    try {
      const { conversationIds, primaryConversationId, mergeReason } = dto;

      if (conversationIds.length < 2) {
        throw new BadRequestException('At least 2 conversations are required for merging');
      }

      // Get all conversations
      const conversations = await (this.prisma['conversationAdvanced'] as any).findMany({
        where: {
          id: { in: conversationIds },
          tenantId
        },
        include: {
          messages: true,
          customer: true,
          channel: true
        }
      });

      if (conversations.length !== conversationIds.length) {
        throw new NotFoundException('Some conversations not found');
      }

      // Determine primary conversation
      const primaryConversation = primaryConversationId 
        ? conversations.find((c: any) => c.id === primaryConversationId)
        : conversations.reduce((primary: any, current: any) => {
            const primaryMessageCount = primary.messages?.length || 0;
            const currentMessageCount = current.messages?.length || 0;
            
            if (currentMessageCount > primaryMessageCount) return current;
            if (currentMessageCount === primaryMessageCount && current.updatedAt > primary.updatedAt) return current;
            return primary;
          });

      if (!primaryConversation) {
        throw new BadRequestException('Primary conversation not found');
      }

      // Perform merge in transaction
      const mergedConversation = await (this.prisma['$transaction'] as any)(async (tx: any) => {
        // Move all messages to primary conversation
        for (const conversation of conversations) {
          if (conversation.id !== primaryConversation!.id) {
            await tx['messageAdvanced'].updateMany({
              where: { conversationId: conversation.id },
              data: { conversationId: primaryConversation!.id }
            });

            // Move participants
            await tx['conversationParticipant'].updateMany({
              where: { conversationId: conversation.id },
              data: { conversationId: primaryConversation!.id }
            });

            // Move notes
            await tx['conversationNote'].updateMany({
              where: { conversationId: conversation.id },
              data: { conversationId: primaryConversation!.id }
            });

            // Mark conversation as merged
            await tx['conversationAdvanced'].update({
              where: { id: conversation.id },
              data: {
                status: 'closed',
                closedAt: new Date(),
                closeReason: 'merged',
                metadata: {
                  ...(conversation.metadata as any),
                  mergedInto: primaryConversation!.id,
                  mergedAt: new Date(),
                  mergeReason
                }
              }
            });
          }
        }

        // Update primary conversation metadata
        const allTags = Array.from(new Set(conversations.flatMap((c: any) => c.tags)));
        const totalMessages = conversations.reduce((sum: number, c: any) => sum + c.messageCount, 0);

        return await (tx['conversationAdvanced'] as any).update({
          where: { id: primaryConversation!.id },
          data: {
            tags: allTags,
            messageCount: totalMessages,
            metadata: {
              ...(primaryConversation!.metadata as any),
              mergedFrom: conversationIds.filter((id: string) => id !== primaryConversation!.id),
              mergedAt: new Date(),
              mergeReason
            },
            updatedAt: new Date()
          },
          include: {
            customer: true,
            channel: true,
            assignedAgent: true,
            team: true
          }
        });
      });

      // Log merge event
      await this.logConversationEvent(primaryConversation.id, 'conversations_merged', {
        mergedConversations: conversationIds,
        mergeReason,
        mergedAt: new Date()
      });

      const thread = this.mapToConversationThread(mergedConversation);

      return {
        success: true,
        data: thread
      };

    } catch (error) {
      this.logger.error('Failed to merge conversations:', error);
      return {
        success: false,
        error: {
          code: 'CONVERSATION_MERGE_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  }

  // Assign conversation to agent or team
  async assignConversation(conversationId: string, dto: AssignConversationDto, tenantId: string, assignedBy: string): Promise<ApiResponse<ConversationThread>> {
    try {
      const updateData: any = {
        updatedAt: new Date()
      };

      if (dto.agentId) {
        updateData.assignedAgentId = dto.agentId;
      }

      if (dto.teamId) {
        updateData.teamId = dto.teamId;
      }

      if (dto.priority) {
        updateData.priority = dto.priority;
      }

      const conversation = await (this.prisma['conversationAdvanced'] as any).update({
        where: {
          id: conversationId,
          tenantId
        },
        data: updateData,
        include: {
          customer: true,
          channel: true,
          assignedAgent: true,
          team: true
        }
      });

      // Create assignment record
      if (dto.agentId || dto.teamId) {
        await this.prisma['conversationTransfer'].create({
          data: {
            conversationId,
            toAgentId: dto.agentId,
            toTeamId: dto.teamId,
            transferredBy: assignedBy,
            reason: dto.assignmentReason || 'Manual assignment',
            transferType: 'assignment',
            status: 'completed',
            completedAt: new Date()
          }
        });
      }

      // Log assignment event
      await this.logConversationEvent(conversationId, 'conversation_assigned', {
        agentId: dto.agentId,
        teamId: dto.teamId,
        assignedBy,
        reason: dto.assignmentReason,
        assignedAt: new Date()
      });

      // Publish assignment event
      await this.publishConversationAssignedEvent(conversation, tenantId, assignedBy);

      const thread = this.mapToConversationThread(conversation);

      return {
        success: true,
        data: thread
      };

    } catch (error) {
      this.logger.error(`Failed to assign conversation ${conversationId}:`, error);
      return {
        success: false,
        error: {
          code: 'CONVERSATION_ASSIGNMENT_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  } 
 // Process webhook from channel
  async processWebhook(webhook: WebhookPayload, tenantId: string): Promise<ApiResponse<ProcessedMessage>> {
    try {
      const channelAdapter = this.getChannelAdapter(webhook.source);
      
      // Process webhook through channel adapter
      const channelMessage = await channelAdapter.receiveMessage(webhook);
      
      // Ingest the message
      return await this.ingestMessage({ channelMessage, tenantId });
      
    } catch (error) {
      this.logger.error(`Failed to process webhook from ${webhook.source}:`, error);
      return {
        success: false,
        error: {
          code: 'WEBHOOK_PROCESSING_FAILED',
          message: (error as Error).message || 'Unknown error occurred'
        }
      };
    }
  }

  // Helper methods
  private getChannelAdapter(channelType: ChannelType): ChannelAdapter {
    const adapter = this.channelAdapters.get(channelType);
    if (!adapter) {
      throw new BadRequestException(`Channel adapter not found for ${channelType}`);
    }
    return adapter;
  }

  private validateChannelMessage(message: ChannelMessage): { isValid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!message.id) errors.push('Message ID is required');
    if (!message.senderId) errors.push('Sender ID is required');
    if (!message.content && !(message as any).attachments?.length) errors.push('Message must have content or attachments');
    if (!message.channel) errors.push('Channel is required');
    if (!message.timestamp) errors.push('Timestamp is required');

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  private async findOrCreateConversation(channelMessage: ChannelMessage, tenantId: string): Promise<any> {
    // Try to find existing conversation
    if (channelMessage.conversationId) {
      const existing = await this.prisma['conversationAdvanced'].findUnique({
        where: { id: channelMessage.conversationId }
      });
      if (existing) return existing;
    }

    // Find customer first
    const customer = await this.findOrCreateCustomer(channelMessage, tenantId);
    
    // Find channel
    const channel = await this.prisma['channelAdvanced'].findFirst({
      where: {
        tenantId,
        type: channelMessage.channel,
        isActive: true
      }
    });

    if (!channel) {
      throw new BadRequestException(`Channel ${channelMessage.channel} not found for tenant ${tenantId}`);
    }

    // Create new conversation
    return await this.prisma['conversationAdvanced'].create({
      data: {
        id: uuidv4(),
        tenantId,
        customerId: customer.id,
        channelId: channel.id,
        status: 'active',
        priority: 'medium',
        messageCount: 0,
        metadata: {
          initiatedBy: channelMessage.senderType,
          channel: channelMessage.channel,
          source: 'webhook'
        }
      }
    });
  }

  private async findOrCreateCustomer(channelMessage: ChannelMessage, tenantId: string): Promise<any> {
    // Try to find customer by sender ID or channel-specific identity mapping
    const whereClause: any = {
      tenantId,
      OR: [
        { email: channelMessage.senderId },
        { phone: channelMessage.senderId }
      ]
    };
    if ((channelMessage as any).channel === 'instagram') {
      whereClause.OR.push({ customFields: { path: ['instagramId'], equals: channelMessage.senderId } });
    }
    if ((channelMessage as any).channel === 'whatsapp') {
      // Normalize phone numeric only for matching
      const numeric = channelMessage.senderId.replace(/\D/g, '');
      if (numeric) {
        whereClause.OR.push({ phone: numeric });
      }
    }
    let customer = await this.prisma['customerAdvanced'].findFirst({ where: whereClause }).catch(() => null);

    if (!customer) {
      // Create new customer with channel-specific identity mapping
      const isEmail = channelMessage.senderId.includes('@');
      const baseData: any = {
        id: uuidv4(),
        tenantId,
        customFields: {
          source: (channelMessage as any).channel,
          firstContact: channelMessage.timestamp
        }
      };
      if (isEmail) {
        baseData.email = channelMessage.senderId;
      } else if ((channelMessage as any).channel === 'instagram') {
        baseData.customFields.instagramId = channelMessage.senderId;
      } else {
        baseData.phone = channelMessage.senderId;
      }
      customer = await this.prisma['customerAdvanced'].create({ data: baseData });
    }

    return customer;
  }

  private async normalizeMessageContent(channelMessage: ChannelMessage): Promise<string> {
    let normalized = channelMessage.content;

    // Remove channel-specific formatting
    switch (channelMessage.channel) {
      case 'whatsapp':
        normalized = normalized.replace(/[*_~]/g, '');
        break;
      case 'email':
        normalized = this.cleanEmailContent(normalized);
        break;
      case 'instagram':
        normalized = this.cleanInstagramContent(normalized);
        break;
    }

    return normalized.trim();
  }

  private cleanEmailContent(content: string): string {
    const lines = (content || '').split('\n')
    const clean: string[] = []
    let reachedSignature = false
    for (const raw of lines) {
      const line = raw || ''
      if (line.trim().startsWith('>')) continue // strip quoted replies
      if (!reachedSignature) {
        const lower = line.toLowerCase()
        if (
          lower.startsWith('--') ||
          lower.includes('sent from my') ||
          lower.includes('confidentiality notice') ||
          lower.includes('please consider the environment') ||
          lower.includes('this message and any attachments')
        ) {
          reachedSignature = true
          continue
        }
      }
      if (!reachedSignature) clean.push(line)
    }
    return clean.join('\n').trim()
  }

  private cleanInstagramContent(content: string): string {
    return content.trim();
  }

  private async determineThreadingContext(channelMessage: ChannelMessage, conversationId: string): Promise<any> {
    if ((channelMessage as any).replyToMessageId) {
      return {
        parentMessageId: (channelMessage as any).replyToMessageId,
        isThreadStart: false
      };
    }

    return {
      isThreadStart: true
    };
  }

  private async saveProcessedMessage(message: ProcessedMessage, tenantId: string): Promise<void> {
    await this.prisma['messageAdvanced'].create({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        senderId: message.senderId,
        senderType: message.senderType,
        content: message.content,
        normalizedContent: message.normalizedContent,
        messageType: message.messageType,
        channel: (message as any).channel || 'web',
         channelMessageId: (message as any).channelMessageId,
        channelData: (message as any).whatsappData || (message as any).instagramData || (message as any).emailData || {},
        threadId: message.threadingContext?.threadId,
        parentMessageId: message.threadingContext?.parentMessageId,
        threadDepth: message.threadingContext?.threadDepth || 0,
        locationData: (message as any).location,
        contactData: (message as any).contact,
        templateId: (message as any).templateId,
        templateParams: (message as any).templateParams,
        metadata: message.metadata || {},
        createdAt: message.timestamp
      }
    });

    // Save attachments if any
    if ((message as any).attachments?.length) {
      for (const attachment of (message as any).attachments) {
        await this.prisma['messageAttachment'].create({
          data: {
            id: attachment.id,
            messageId: message.id,
            type: attachment.type,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: attachment.size,
            url: attachment.url,
            channelMediaId: (attachment as any).whatsappMediaId || (attachment as any).instagramMediaId,
            metadata: {}
          }
        });
      }
    }
  }

  private async updateConversationMetrics(conversationId: string, message: ProcessedMessage): Promise<void> {
    const updateData: any = {
      lastMessageAt: message.timestamp,
      messageCount: { increment: 1 },
      updatedAt: new Date()
    };

    if (message.senderType === 'agent') {
      updateData.agentResponseCount = { increment: 1 };
    } else if (message.senderType === 'customer') {
      updateData.customerResponseCount = { increment: 1 };
    }

    await this.prisma['conversationAdvanced'].update({
      where: { id: conversationId },
      data: updateData
    });
  }

  private async getConversationById(conversationId: string, tenantId: string): Promise<any> {
    const conv = await (this.prisma['conversationAdvanced'] as any).findUnique({
      where: {
        id: conversationId,
        tenantId
      }
    });
    if (!conv) return null;
    // Load related entities manually since ConversationAdvanced has no relations in schema
    const [customer, channel, assignedAgent, team] = await Promise.all([
      (this.prisma['customerAdvanced'] as any).findUnique?.({ where: { id: (conv as any).customerId } }).catch(() => null),
      (this.prisma['channelAdvanced'] as any).findUnique?.({ where: { id: (conv as any).channelId } }).catch(() => null),
      (this.prisma['user'] as any).findUnique?.({ where: { id: (conv as any).assignedAgentId } }).catch(() => null),
      (this.prisma['team'] as any).findUnique?.({ where: { id: (conv as any).teamId } }).catch(() => null)
    ]);
    return { ...conv, customer, channel, assignedAgent, team };
  }

  private mapToConversationThread(conversation: any): ConversationThread {
    return {
      id: conversation.id,
      tenantId: conversation.tenantId,
      customerId: conversation.customerId,
      channelId: conversation.channelId,
      subject: conversation.subject,
      status: conversation.status,
      priority: conversation.priority,
      assignedAgentId: conversation.assignedAgentId,
      teamId: conversation.teamId,
      tags: conversation.tags,
      metadata: conversation.metadata,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
      closedAt: conversation.closedAt,
      closedBy: conversation.closedBy,
      closeReason: conversation.closeReason
    };
  }

  private mapToProcessedMessage(message: any): ProcessedMessage {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderType: message.senderType,
      content: message.content,
      normalizedContent: message.normalizedContent,
      messageType: message.messageType,
      timestamp: message.createdAt,
      threadingContext: {
        threadId: message.threadId,
        parentMessageId: message.parentMessageId,
        threadDepth: message.threadDepth,
        isThreadStart: message.threadDepth === 0
      },
      processingMetadata: {
        processedAt: message.createdAt,
        processingVersion: '2.0',
        channelAdapter: message.channel,
        normalizationApplied: [],
        validationResults: []
      }
    };
  }

  private async buildConversationContext(conversation: any): Promise<ConversationContext> {
    // This would be a comprehensive context builder
    // For now, returning a basic structure
    return {
      conversationId: conversation.id,
      customerId: conversation.customerId,
      customerProfile: {
        id: conversation.customer.id,
        name: `${conversation.customer.firstName || ''} ${conversation.customer.lastName || ''}`.trim(),
        email: conversation.customer.email,
        phone: conversation.customer.phone,
        company: conversation.customer.company,
        preferredLanguage: conversation.customer.preferredLanguage,
        timezone: conversation.customer.timezone,
        vipStatus: conversation.customer.isVip,
        tags: conversation.customer.tags || [],
        customFields: conversation.customer.customFields || {},
        communicationPreferences: {
          preferredChannels: conversation.customer.preferredChannels || [],
          doNotDisturb: conversation.customer.doNotDisturb,
          notificationSettings: {
            email: true,
            sms: false,
            push: true
          }
        },
        behaviorProfile: {
          averageResponseTime: conversation.customer.averageResponseTime,
          communicationStyle: conversation.customer.communicationStyle,
          escalationTendency: 'low'
        }
      },
      conversationHistory: {
        totalConversations: conversation.customer.totalConversations || 0,
        totalMessages: conversation.customer.totalMessages || 0,
        averageResolutionTime: conversation.customer.averageResponseTime,
        satisfactionRatings: [],
        averageSatisfactionRating: conversation.customer.satisfactionScore,
        lastInteractionDate: conversation.customer.lastInteractionAt,
        frequentIssues: [],
        preferredAgents: [],
        escalationHistory: []
      },
      channelContext: {
        channel: conversation.channel.type,
        channelName: conversation.channel.name,
        channelConfig: conversation.channel.config || {},
        channelCapabilities: this.getChannelAdapter(conversation.channel.type).getSupportedFeatures(),
        channelSpecificData: {}
      },
      businessContext: {
        accountValue: conversation.customer.accountValue,
        contractType: conversation.customer.contractType,
        supportTier: conversation.customer.supportTier,
        relatedTickets: [],
        relatedOrders: [],
        purchaseHistory: [],
        supportHistory: {
          totalTickets: 0,
          resolvedTickets: 0,
          commonIssueTypes: []
        }
      },
      aiContext: conversation.aiAnalysis ? {
        currentAnalysis: {
          intent: conversation.aiAnalysis.primaryIntent,
          intentConfidence: conversation.aiAnalysis.intentConfidence,
          sentiment: conversation.aiAnalysis.sentimentScore,
          urgency: conversation.aiAnalysis.urgencyScore,
          category: conversation.aiAnalysis.category,
          subcategory: conversation.aiAnalysis.subcategory,
          detectedLanguage: conversation.aiAnalysis.detectedLanguage,
          translationRequired: conversation.aiAnalysis.translationRequired
        },
        predictions: {
          resolutionTime: conversation.aiAnalysis.resolutionTimePrediction,
          satisfactionScore: conversation.aiAnalysis.satisfactionPrediction,
          escalationProbability: conversation.aiAnalysis.escalationProbability,
          churnRisk: conversation.aiAnalysis.churnRiskScore
        },
        suggestions: {
          suggestedResponses: conversation.aiAnalysis.suggestedResponses || [],
          suggestedActions: conversation.aiAnalysis.recommendedActions || [],
          knowledgeBaseSuggestions: conversation.aiAnalysis.relevantKnowledge || [],
          expertSuggestions: conversation.aiAnalysis.expertSuggestions || []
        }
      } : undefined,
      agentContext: conversation.assignedAgent ? {
        agentId: conversation.assignedAgent.id,
        agentName: `${conversation.assignedAgent.firstName} ${conversation.assignedAgent.lastName}`,
        agentSkills: [],
        agentLanguages: [],
        currentWorkload: 0,
        maxConcurrentConversations: 10,
        assignmentContext: {
          assignedAt: new Date(),
          assignedBy: 'system',
          assignmentReason: 'auto-assignment',
          isAutoAssigned: true
        }
      } : undefined
    };
  }

  private async logConversationEvent(conversationId: string, eventType: string, eventData: any): Promise<void> {
    await this.prisma['conversationEventLog'].create({
      data: {
        conversationId,
        eventType,
        eventData,
        triggeredByType: 'system'
      }
    });
  }

  // Event publishing methods
  private async publishMessageReceivedEvent(message: ProcessedMessage, tenantId: string): Promise<void> {
    // Map message type to allowed values for MessageReceivedEvent
    const allowedMessageTypes = ['text', 'image', 'video', 'audio', 'document', 'location'] as const;
    const messageType = allowedMessageTypes.includes(message.messageType as any) 
      ? message.messageType as 'text' | 'image' | 'video' | 'audio' | 'document' | 'location'
      : 'text';

    // Map sender type to allowed values for MessageReceivedEvent
    const senderType = message.senderType === 'bot' ? 'system' : message.senderType as 'customer' | 'agent' | 'system';

    const channelForEvent = (message as any).channel || 'web'

    const event: MessageReceivedEvent = {
      eventId: uuidv4(),
      eventType: 'conversation.message.received',
      aggregateId: message.conversationId,
      aggregateType: 'conversation',
      tenantId,
      timestamp: new Date(),
      version: '2.0',
      eventData: {
        conversationId: message.conversationId,
        messageId: message.id,
        senderId: message.senderId,
        senderType,
        content: message.content,
        messageType,
        channel: channelForEvent
      },
      metadata: {
        source: 'enhanced-conversation-orchestrator',
        userId: message.senderType === 'agent' ? message.senderId : undefined
      }
    };

    try { await this.eventBus.publish(event); } catch (e) { this.logger.warn(`Publish message.received failed: ${(e as Error).message}`); }
  }

  private async publishMessageSentEvent(message: ProcessedMessage, tenantId: string): Promise<void> {
    // Map message type to allowed values for MessageSentEvent
    const allowedMessageTypes = ['text', 'image', 'video', 'audio', 'document', 'template'] as const;
    const messageType = allowedMessageTypes.includes(message.messageType as any) 
      ? message.messageType as 'text' | 'image' | 'video' | 'audio' | 'document' | 'template'
      : 'text';

    const event: MessageSentEvent = {
      eventId: uuidv4(),
      eventType: 'conversation.message.sent',
      aggregateId: message.conversationId,
      aggregateType: 'conversation',
      tenantId,
      timestamp: new Date(),
      version: '2.0',
      eventData: {
        conversationId: message.conversationId,
        messageId: message.id,
        agentId: message.senderId,
        content: message.content,
        messageType,
        channel: (message as any).channel || 'web',
        deliveryStatus: 'sent'
      },
      metadata: {
        source: 'enhanced-conversation-orchestrator',
        userId: message.senderId
      }
    };

    try { await this.eventBus.publish(event); } catch (e) { this.logger.warn(`Publish message.sent failed: ${(e as Error).message}`); }
  }

  private async publishConversationStartedEvent(conversation: any, tenantId: string): Promise<void> {
    const event: ConversationStartedEvent = {
      eventId: uuidv4(),
      eventType: 'conversation.started',
      aggregateId: conversation.id,
      aggregateType: 'conversation',
      tenantId,
      timestamp: new Date(),
      version: '2.0',
      eventData: {
        conversationId: conversation.id,
        customerId: conversation.customerId,
        channel: conversation.channelId,
        initiatedBy: (conversation.metadata as any)?.initiatedBy || 'customer',
        context: conversation.metadata
      },
      metadata: {
        source: 'enhanced-conversation-orchestrator'
      }
    };

    try { await this.eventBus.publish(event); } catch (e) { this.logger.warn(`Publish conversation.started failed: ${(e as Error).message}`); }
  }

  private async publishConversationAssignedEvent(conversation: any, tenantId: string, assignedBy: string): Promise<void> {
    const event: ConversationAssignedEvent = {
      eventId: uuidv4(),
      eventType: 'conversation.assigned',
      aggregateId: conversation.id,
      aggregateType: 'conversation',
      tenantId,
      timestamp: new Date(),
      version: '2.0',
      eventData: {
        conversationId: conversation.id,
        agentId: conversation.assignedAgentId,
        assignedBy,
        previousAgentId: undefined
      },
      metadata: {
        source: 'enhanced-conversation-orchestrator',
        userId: assignedBy
      }
    };

    try { await this.eventBus.publish(event); } catch (e) { this.logger.warn(`Publish conversation.assigned failed: ${(e as Error).message}`); }
  }
}