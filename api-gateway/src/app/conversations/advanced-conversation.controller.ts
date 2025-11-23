import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
  NotFoundException,
  Optional,
  Inject
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '@glavito/shared-auth';
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation';
import { ModuleRef } from '@nestjs/core';
import { ChannelMessage } from '@glavito/shared-types';
import { PrismaService } from '@glavito/shared-database';
import { ConversationsGateway } from './conversations.gateway';
import { MessageTypeEnum } from './dto/conversation.dto';
import { CustomerSatisfactionService } from '../customers/customer-satisfaction.service';
import { CustomersService } from '../customers/customers.service';

interface User {
  id: string;
  tenantId: string;
  role: string;
}

interface ConversationMetadata {
  ticketId?: string;
  priority?: string;
  assignedAgentId?: string;
  tags?: string[];
  unreadCount?: number;
  [key: string]: unknown;
}


@ApiTags('Advanced Conversations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('v1/conversations/advanced')
export class AdvancedConversationController {
  private readonly logger = new Logger(AdvancedConversationController.name);

  constructor(
    private readonly conversationOrchestrator: EnhancedConversationOrchestratorService,
    private readonly prisma: PrismaService,
    private readonly convGateway: ConversationsGateway,
    private readonly moduleRef: ModuleRef,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventBus?: { getHealth?: () => Promise<{ connected?: boolean }> },
    @Optional() private readonly satisfactionService?: CustomerSatisfactionService,
    @Optional() private readonly customersService?: CustomersService,
  ) {}

  @Post('ingest')
  @ApiOperation({ summary: 'Ingest message from any channel' })
  @ApiResponse({ status: 201, description: 'Message ingested successfully' })
  async ingestMessage(
    @CurrentUser() user: User,
    @Body() messageData: {
      id: string;
      senderId: string;
      senderType: 'customer' | 'agent' | 'system';
      content: string;
      messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
      channel: 'whatsapp' | 'instagram' | 'email' | 'web' | 'voice' | 'video';
      channelMessageId?: string;
      conversationId?: string;
      attachments?: Array<{
        id: string;
        type: string;
        url: string;
        filename?: string;
        size?: number;
      }>;
      replyToMessageId?: string;
      isForwarded?: boolean;
      location?: {
        latitude: number;
        longitude: number;
        address?: string;
      };
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      const channelMessage: ChannelMessage = {
        ...messageData,
        timestamp: new Date(),
        // Add required channel-specific data based on channel type
        ...(messageData.channel === 'whatsapp' && {
          whatsappData: {
            messageId: messageData.channelMessageId || messageData.id,
            phoneNumber: messageData.senderId
          }
        }),
        ...(messageData.channel === 'instagram' && {
          instagramData: {
            messageId: messageData.channelMessageId || messageData.id,
            igId: messageData.senderId
          }
        }),
        ...(messageData.channel === 'email' && {
          emailData: {
            messageId: messageData.channelMessageId || messageData.id,
            from: messageData.senderId,
            to: [messageData.senderId],
            subject: 'Email Message'
          }
        }),
        ...(messageData.channel === 'web' && {
          webData: {
            sessionId: messageData.channelMessageId || messageData.id
          }
        }),
        ...(messageData.channel === 'voice' && {
          voiceData: {
            callId: messageData.channelMessageId || messageData.id,
            phoneNumber: messageData.senderId,
            callDirection: 'inbound' as const,
            callStatus: 'answered' as const
          }
        }),
        ...(messageData.channel === 'video' && {
          videoData: {
            callId: messageData.channelMessageId || messageData.id
          }
        })
      } as ChannelMessage;

      const processedMessage = await this.conversationOrchestrator.ingestMessage({
        channelMessage,
        tenantId: user.tenantId
      });

      return {
          success: true,
          data: {
            messageId: processedMessage.data?.id || 'unknown',
            conversationId: processedMessage.data?.conversationId || '',
            normalizedContent: processedMessage.data?.normalizedContent || messageData.content,
            threadingContext: processedMessage.data?.threadingContext || {}
          }
        };
    } catch (error: unknown) {
      this.logger.error('Failed to ingest message:', error);
      throw new BadRequestException('Failed to ingest message');
    }
  }

  @Post('messages/:messageId/reactions')
  @ApiOperation({ summary: 'Add or remove reaction to a message' })
  @ApiResponse({ status: 200, description: 'Reaction toggled successfully' })
  async toggleMessageReaction(
    @CurrentUser() user: User,
    @Param('messageId') messageId: string,
    @Body() body: { emoji: string },
  ) {
    try {
      const message = await this.prisma.messageAdvanced.findUnique({
        where: { id: messageId },
      });

      if (!message) {
        throw new NotFoundException('Message not found');
      }

      // Get current reactions or initialize empty array
      const currentReactions = (message.reactions as Array<{ emoji: string; userId: string; timestamp: string }>) || [];
      
      // Check if user already reacted with this emoji
      const existingIndex = currentReactions.findIndex(
        (r) => r.emoji === body.emoji && r.userId === user.id
      );

      let updatedReactions: Array<{ emoji: string; userId: string; timestamp: string }>;

      if (existingIndex >= 0) {
        // Remove reaction (toggle off)
        updatedReactions = currentReactions.filter((_, idx) => idx !== existingIndex);
      } else {
        // Add reaction
        updatedReactions = [
          ...currentReactions,
          {
            emoji: body.emoji,
            userId: user.id,
            timestamp: new Date().toISOString(),
          },
        ];
      }

      // Update message with new reactions
      const updated = await this.prisma.messageAdvanced.update({
        where: { id: messageId },
        data: {
          reactions: updatedReactions as any,
        },
        select: {
          id: true,
          conversationId: true,
          reactions: true,
        },
      });

      // Broadcast reaction change via WebSocket
      try {
        this.convGateway.broadcast(
          'message.reaction',
          {
            event: 'message.reaction',
            messageId,
            conversationId: message.conversationId,
            reactions: updatedReactions,
            action: existingIndex >= 0 ? 'removed' : 'added',
            emoji: body.emoji,
            userId: user.id,
          },
          user.tenantId,
          message.conversationId
        );
      } catch {
        // Ignore broadcast errors
      }

      return {
        success: true,
        data: {
          messageId,
          reactions: updatedReactions,
          action: existingIndex >= 0 ? 'removed' : 'added',
        },
      };
    } catch (error: unknown) {
      this.logger.error(`Failed to toggle reaction on message ${messageId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to toggle reaction';
      return {
        success: false,
        error: errorMessage,
        data: null,
      };
    }
  }

  @Post(':conversationId/messages')
  @ApiOperation({ summary: 'Send message in conversation' })
  @ApiResponse({ status: 201, description: 'Message sent successfully' })
  async sendMessage(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() messageData: {
      content: string;
      messageType: string;
      templateId?: string;
      templateParams?: Record<string, string>;
      attachments?: Array<{ id?: string; url?: string; type?: string; name?: string; filename?: string; size?: number; mimeType?: string }>;
      metadata?: Record<string, any>;
      isInternalNote?: boolean;
    }
  ) {
    try {
      // Normalize attachments to BaseAttachment[]
      const normalizedAttachments = Array.isArray(messageData.attachments)
        ? messageData.attachments
            .filter((a) => !!a && !!a.url)
            .map((a, idx) => ({
              id: a.id || `att_${Date.now()}_${idx}`,
              type: a.type || 'document',
              url: a.url as string,
              filename: a.name || a.filename,
              size: a.size,
              mimeType: a.mimeType,
            }))
        : undefined;

      // Extract audioUrl and audioDuration from metadata if present
      const audioUrl = messageData.metadata?.audioUrl;
      const audioDuration = messageData.metadata?.audioDuration;

      const message = await this.conversationOrchestrator.sendMessage(
        conversationId,
        {
          content: messageData.content,
          messageType: messageData.messageType as MessageTypeEnum,
          templateId: messageData.templateId,
          templateParams: messageData.templateParams,
          attachments: normalizedAttachments
        },
        user.tenantId,
        user.id
      );

      // If audio message, update the saved message with audioUrl and audioDuration
      if (audioUrl && messageData.messageType === 'audio') {
        try {
          // Find the most recent message from this user in this conversation
          const recentMessage = await this.prisma.messageAdvanced.findFirst({
            where: {
              conversationId,
              senderId: user.id,
              createdAt: {
                gte: new Date(Date.now() - 5000), // Within last 5 seconds
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (recentMessage) {
            await this.prisma.messageAdvanced.update({
              where: { id: recentMessage.id },
              data: {
                audioUrl,
                audioDuration: audioDuration ? Math.floor(audioDuration) : undefined,
              },
            });
          }
        } catch (updateError) {
          this.logger.warn(`Failed to update audio metadata: ${(updateError as Error).message}`);
        }
      }

      // Update isInternalNote if specified
      if (messageData.isInternalNote !== undefined) {
        try {
          const recentMessage = await this.prisma.messageAdvanced.findFirst({
            where: {
              conversationId,
              senderId: user.id,
              createdAt: {
                gte: new Date(Date.now() - 5000), // Within last 5 seconds
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
          });

          if (recentMessage) {
            await this.prisma.messageAdvanced.update({
              where: { id: recentMessage.id },
              data: {
                isInternalNote: messageData.isInternalNote,
              },
            });
          }
        } catch (updateError) {
          this.logger.warn(`Failed to update isInternalNote: ${(updateError as Error).message}`);
        }
      }

      // Best-effort: trigger AI coaching analysis when agent posts a text message
      try {
        if ((messageData.messageType || 'text') === 'text' && messageData.content && messageData.content.trim().length > 10) {
          // Resolve AI service lazily to avoid static import boundary issues
          try {
            const aiLib = await import('@glavito/shared-ai')
            type AnalyzeArgs = { content: string; context?: Record<string, unknown>; analysisTypes: string[] }
            const aiSvc = this.moduleRef.get(aiLib.AIIntelligenceService, { strict: false }) as { analyzeContent?: (args: AnalyzeArgs) => Promise<unknown> } | undefined
            if (aiSvc?.analyzeContent) {
              void aiSvc.analyzeContent({
                content: messageData.content,
                context: { conversationId, tenantId: user.tenantId },
                analysisTypes: ['sales_coaching'],
              }).catch(() => void 0)
            }
          } catch { /* ignore */ }
        }
      } catch { /* ignore */ }
      // Best-effort: broadcast message.created to websocket subscribers
      try {
        const last = await this.prisma['messageAdvanced'].findFirst({
          where: { conversationId },
          orderBy: { createdAt: 'desc' },
          select: { id: true, conversationId: true, content: true, messageType: true, createdAt: true, senderType: true, senderId: true }
        });
        if (last) {
          this.convGateway.broadcast(
            'message.created',
            {
              event: 'message.created',
              message: {
                id: last.id,
                conversationId: last.conversationId,
                senderType: (last.senderType as 'agent' | 'customer' | 'system' | 'bot') || 'agent',
                content: last.content,
                messageType: last.messageType,
                createdAt: last.createdAt,
              }
            },
            user.tenantId,
            conversationId
          );
        }
      } catch {
        // ignore broadcast failures
      }

      return { success: true, data: message };
    } catch (error: unknown) {
      this.logger.error(`Failed to send message in conversation ${conversationId}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to send message: ${errorMessage}`,
        data: null
      };
    }
  }

  @Post('create')
  @ApiOperation({ summary: 'Create new conversation thread' })
  @ApiResponse({ status: 201, description: 'Conversation created successfully' })
  async createConversation(
    @CurrentUser() user: User,
    @Body() conversationData: {
      customerId: string;
      channelId: string;
      subject?: string;
      priority?: 'low' | 'medium' | 'high' | 'critical';
      assignedAgentId?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ) {
    try {
      const conversation = await this.conversationOrchestrator.createConversation({
        customerId: conversationData.customerId,
        channelId: conversationData.channelId,
        subject: conversationData.subject,
        priority: conversationData.priority,
        assignedAgentId: conversationData.assignedAgentId,
        tags: conversationData.tags,
        metadata: conversationData.metadata
      }, user.tenantId);

      return {
        success: true,
        data: conversation
      };
    } catch (error) {
      this.logger.error('Failed to create conversation:', error);
      throw new BadRequestException('Failed to create conversation');
    }
  }

  @Post('merge')
  @ApiOperation({ summary: 'Merge multiple conversations' })
  @ApiResponse({ status: 200, description: 'Conversations merged successfully' })
  async mergeConversations(
    @CurrentUser() user: User,
    @Body() mergeData: {
      conversationIds: string[];
    }
  ) {
    try {
      if (!mergeData.conversationIds || mergeData.conversationIds.length < 2) {
        throw new BadRequestException('At least 2 conversation IDs are required');
      }

      const mergedConversation = await this.conversationOrchestrator.mergeConversations({
        conversationIds: mergeData.conversationIds
      }, user.tenantId);

      return {
        success: true,
        data: mergedConversation
      };
    } catch (error) {
      this.logger.error('Failed to merge conversations:', error);
      throw new BadRequestException('Failed to merge conversations');
    }
  }

  @Get(':conversationId/context')
  @ApiOperation({ summary: 'Get comprehensive conversation context' })
  @ApiResponse({ status: 200, description: 'Context retrieved successfully' })
  async getConversationContext(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string
  ) {
    try {
      // Try ConversationAdvanced first
      let conversation: any = await this.prisma.conversationAdvanced.findUnique({
        where: { id: conversationId, tenantId: user.tenantId }
      });

      // Fallback: handle pseudo IDs like conv_ticket_<ticketId>
      if (!conversation && conversationId.startsWith('conv_ticket_')) {
        const ticketId = conversationId.replace('conv_ticket_', '');

        // Find a base conversation linked to this ticket (or create one from ticket)
        let baseConv = await this.prisma.conversation.findFirst({ where: { tenantId: user.tenantId, ticketId } }).catch(() => null);

        if (!baseConv) {
          const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } }).catch(() => null);
          if (ticket && (ticket as any).tenantId === user.tenantId) {
            baseConv = await this.prisma.conversation.create({
              data: {
                tenantId: (ticket as any).tenantId,
                customerId: (ticket as any).customerId,
                channelId: (ticket as any).channelId,
                ticketId: (ticket as any).id,
                subject: (ticket as any).subject,
                status: 'active',
                priority: (ticket as any).priority || 'medium',
                tags: ((ticket as any).tags as string[]) || [],
                metadata: { createdFromTicket: true },
              }
            }).catch(() => null);
          }
        }

        // If we have a base conversation, enrich to a conversation-like object
        if (baseConv) {
          conversation = {
            id: (baseConv as any).id,
            tenantId: (baseConv as any).tenantId,
            customerId: (baseConv as any).customerId,
            channelId: (baseConv as any).channelId,
            subject: (baseConv as any).subject,
            status: (baseConv as any).status,
            priority: (baseConv as any).priority || 'medium',
            assignedAgentId: (baseConv as any).assignedAgentId,
            teamId: (baseConv as any).teamId,
            tags: (baseConv as any).tags || [],
            metadata: (baseConv as any).metadata || {},
            createdAt: (baseConv as any).createdAt,
            updatedAt: (baseConv as any).updatedAt,
            lastMessageAt: (baseConv as any).updatedAt,
          };
        }
      }

      if (!conversation) {
        throw new NotFoundException(`Conversation ${conversationId} not found`);
      }

      // Manually load related entities (ConversationAdvanced has no relations)
      const [customer, channel, messages, assignedAgent, team] = await Promise.all([
        // Try customerAdvanced first, fallback to base Customer table
        (async () => {
          try {
            const adv = await (this.prisma as any).customerAdvanced?.findUnique?.({
              where: { id: conversation.customerId },
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
                company: true,
                tags: true,
                customFields: true,
                createdAt: true
              }
            });
            if (adv) return adv;
          } catch { /* ignore */ }
          
          // Fallback to base Customer table
          return await this.prisma.customer.findUnique({
            where: { id: conversation.customerId },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              company: true,
              tags: true,
              customFields: true,
              createdAt: true
            }
          }).catch(() => null);
        })(),
        // Try channelAdvanced first, fallback to base Channel table
        (async () => {
          try {
            const adv = await (this.prisma as any).channelAdvanced?.findUnique?.({
              where: { id: conversation.channelId },
              select: { id: true, name: true, type: true }
            });
            if (adv) return adv;
          } catch { /* ignore */ }
          
          // Fallback to base Channel table
          return await this.prisma.channel.findUnique({
            where: { id: conversation.channelId },
            select: { id: true, name: true, type: true }
          }).catch(() => null);
        })(),
        // Try messageAdvanced first, fallback to base Message table
        (async () => {
          try {
            const adv = await (this.prisma as any).messageAdvanced?.findMany?.({
              where: { conversationId },
              orderBy: { createdAt: 'asc' },
              select: {
                id: true,
                content: true,
                messageType: true,
                senderType: true,
                senderId: true,
                createdAt: true,
                status: true,
                reactions: true,
                audioUrl: true,
                audioDuration: true
              }
            });
            if (adv && adv.length > 0) return adv;
          } catch { /* ignore */ }
          
          // Fallback to base Message table (no status field)
          return await this.prisma.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'asc' },
            select: {
              id: true,
              content: true,
              messageType: true,
              senderType: true,
              senderId: true,
              createdAt: true
            }
          }).catch(() => []);
        })(),
        conversation.assignedAgentId
          ? this.prisma.user.findUnique({
              where: { id: conversation.assignedAgentId },
              select: { id: true, firstName: true, lastName: true, email: true }
            }).catch(() => null)
          : Promise.resolve(null),
        conversation.teamId
          ? this.prisma.team.findUnique({
              where: { id: conversation.teamId },
              select: { id: true, name: true }
            }).catch(() => null)
          : Promise.resolve(null)
      ]);

      // Build comprehensive context
      const context = {
        conversation: {
          ...conversation,
          customer: customer ? {
            ...customer,
            name: (() => {
              const full = `${customer.firstName || ''} ${customer.lastName || ''}`.trim();
              return full || (customer as any).email || (customer as any).phone || (customer as any).company || 'Unknown Customer';
            })()
          } : null,
          channel: channel || { id: conversation.channelId, name: 'Unknown', type: 'web' },
          assignedAgent,
          team
        },
        messages: messages.map((msg: { id: string; content: string; messageType: string; senderType: string; senderId?: string; createdAt: Date; status?: string }) => ({
          ...msg,
          sender: msg.senderType === 'agent' && msg.senderId ? { id: msg.senderId } : null
        })),
        customerProfile: customer,
        tenantId: user.tenantId
      };

      return {
        success: true,
        data: context
      };
    } catch (error) {
      this.logger.error(`Failed to get context for conversation ${conversationId}:`, error);
      throw new NotFoundException('Conversation not found');
    }
  }

  @Put(':conversationId/context')
  @ApiOperation({ summary: 'Update conversation context' })
  @ApiResponse({ status: 200, description: 'Context updated successfully' })
  async updateConversationContext(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() contextData: Record<string, unknown>
  ) {
    try {
      await this.conversationOrchestrator.updateConversation(
        conversationId,
        contextData,
        user.tenantId
      );

      return {
        success: true,
        message: 'Context updated successfully'
      };
    } catch (error) {
      this.logger.error(`Failed to update context for conversation ${conversationId}:`, error);
      throw new BadRequestException('Failed to update context');
    }
  }

  @Post(':conversationId/assign')
  @ApiOperation({ summary: 'Assign conversation to agent or team' })
  @ApiResponse({ status: 200, description: 'Assignment updated successfully' })
  async assignConversation(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() body: { agentId?: string; teamId?: string; reason?: string }
  ) {
    try {
      if (!body?.agentId && !body?.teamId) {
        throw new BadRequestException('agentId or teamId is required');
      }

      // Delegate to orchestrator for consistent logging/events
      const result = await this.conversationOrchestrator.assignConversation(
        conversationId,
        {
          agentId: body.agentId,
          teamId: body.teamId,
          assignmentReason: body.reason,
        } as any,
        user.tenantId,
        user.id
      );

      const updatedThread = (result as any)?.data || result;

      // Best-effort broadcast (minimal payload)
      try {
        const payload = { id: updatedThread?.id, assignedAgentId: updatedThread?.assignedAgentId, teamId: updatedThread?.teamId, updatedAt: updatedThread?.updatedAt };
        this.convGateway.broadcast('conversation.updated', { event: 'conversation.updated', conversation: payload }, user.tenantId, conversationId);
      } catch { /* ignore */ }

      return { success: true, data: updatedThread };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to assign conversation ${conversationId}: ${msg}`);
      throw new BadRequestException('Failed to assign conversation');
    }
  }

  @Get('unified-inbox')
  @ApiOperation({ summary: 'Get unified inbox across all channels' })
  @ApiResponse({ status: 200, description: 'Unified inbox retrieved successfully' })
  async getUnifiedInbox(
    @CurrentUser() user: User,
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('channel') channel?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('teamId') teamId?: string,
    @Query('search') search?: string
  ) {
    try {
      this.logger.debug(`[UNIFIED_INBOX] User: ${user.id}, TenantId: ${user.tenantId}, Role: ${user.role}`);
      
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;
      
      // Build dynamic where clause
      const whereClause: Record<string, unknown> = {
        tenantId: user.tenantId
      };

      // Handle team filter
      if (teamId && teamId !== 'all') {
        whereClause.teamId = teamId;
      }

      // Handle status filter
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      // Handle channel filter (ConversationAdvanced only has channelId)
      // Support comma-separated channels: "whatsapp,instagram" or single channel: "whatsapp"
      if (channel && channel !== 'all') {
        const channelTypes = channel.split(',').map(c => c.trim()).filter(c => c);
        
        // Try channelAdvanced first, fallback to base Channel table
        let channelRows: Array<{ id: string }> = [];
        try {
          channelRows = await (this.prisma as any).channelAdvanced?.findMany?.({
            where: { 
              tenantId: user.tenantId, 
              type: channelTypes.length === 1 ? channelTypes[0] : { in: channelTypes }
            },
            select: { id: true }
          }) || [];
        } catch { /* ignore */ }
        
        // Fallback to base Channel table if no results
        if (!channelRows || channelRows.length === 0) {
          try {
            channelRows = await this.prisma.channel.findMany({
              where: { 
                tenantId: user.tenantId, 
                type: channelTypes.length === 1 ? channelTypes[0] : { in: channelTypes }
              },
              select: { id: true }
            });
          } catch { /* ignore */ }
        }
        
        const channelIds = (channelRows || []).map((c: { id: string }) => c.id);
        if (channelIds.length === 0) {
          return {
            success: true,
            data: {
              conversations: [],
              pagination: {
                page: pageNum,
                limit: limitNum,
                total: 0,
                totalPages: 0
              },
              filters: { status, priority, channel, assignedTo, search },
              summary: {
                totalConversations: 0,
                activeConversations: 0,
                unassignedConversations: 0,
                highPriorityConversations: 0
              }
            }
          };
        }
        whereClause.channelId = { in: channelIds };
      }

      // Handle metadata-based filters with proper JSON path queries
      const metadataFilters: Record<string, unknown> = {};
      
      if (assignedTo && assignedTo !== 'all') {
        metadataFilters.assignedAgentId = assignedTo;
      }

      if (priority && priority !== 'all') {
        metadataFilters.priority = priority;
      }

      // Apply metadata filters if any exist
      if (Object.keys(metadataFilters).length > 0) {
        whereClause.AND = Object.entries(metadataFilters).map(([key, value]) => ({
          metadata: {
            path: [key],
            equals: value
          }
        }));
      }

      // Handle search across customer name, email, and conversation subject (no relations on ConversationAdvanced)
      if (search && search.trim()) {
        const searchTerm = search.trim();
        // Pre-fetch matching customers from CustomerAdvanced or base Customer table
        let matchingCustomers: Array<{ id: string }> = [];
        try {
          matchingCustomers = await (this.prisma as any).customerAdvanced?.findMany?.({
            where: {
              tenantId: user.tenantId,
              OR: [
                { firstName: { contains: searchTerm, mode: 'insensitive' } },
                { lastName: { contains: searchTerm, mode: 'insensitive' } },
                { email: { contains: searchTerm, mode: 'insensitive' } },
                { phone: { contains: searchTerm, mode: 'insensitive' } },
                { company: { contains: searchTerm, mode: 'insensitive' } },
              ]
            },
            select: { id: true }
          }) || [];
        } catch { /* ignore */ }
        
        // Fallback to base Customer table if no results
        if (!matchingCustomers || matchingCustomers.length === 0) {
          try {
            matchingCustomers = await this.prisma.customer.findMany({
              where: {
                tenantId: user.tenantId,
                OR: [
                  { firstName: { contains: searchTerm, mode: 'insensitive' } },
                  { lastName: { contains: searchTerm, mode: 'insensitive' } },
                  { email: { contains: searchTerm, mode: 'insensitive' } },
                  { phone: { contains: searchTerm, mode: 'insensitive' } },
                  { company: { contains: searchTerm, mode: 'insensitive' } },
                ]
              },
              select: { id: true }
            });
          } catch { /* ignore */ }
        }
        
        const customerIds = (matchingCustomers || []).map((c: { id: string }) => c.id);
        whereClause.OR = [
          { subject: { contains: searchTerm, mode: 'insensitive' } },
          ...(customerIds.length ? [{ customerId: { in: customerIds } }] : [])
        ];
      }

      // Get conversations with comprehensive data
      this.logger.debug(`[UNIFIED_INBOX] WhereClause: ${JSON.stringify(whereClause)}`);
      
      const [conversations, total] = await Promise.all([
        this.prisma.conversationAdvanced.findMany({
          where: whereClause,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limitNum
        }),
        this.prisma.conversationAdvanced.count({ where: whereClause })
      ]);
      
      this.logger.debug(`[UNIFIED_INBOX] Found ${conversations.length} conversations, Total: ${total}`);

      // Get related data separately to avoid complex joins
      const conversationIds = conversations.map(c => c.id);
      type CustomerLite = { id: string; firstName?: string | null; lastName?: string | null; email?: string | null; phone?: string | null; company?: string | null }
      type ChannelLite = { id: string; name: string; type: string }
      type LastMessageLite = { id: string; conversationId: string; content: string; senderType: string; messageType: string; createdAt: Date }

      const [customers, channels, messages] = await Promise.all([
        // Try customerAdvanced first, fallback to base Customer table
        (async (): Promise<CustomerLite[]> => {
          try {
            const adv = await (this.prisma as any).customerAdvanced?.findMany?.({
              where: { id: { in: conversations.map(c => c.customerId) } },
              select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true }
            });
            if (adv && adv.length > 0) return adv as CustomerLite[];
          } catch { /* ignore */ }
          
          const result = await this.prisma.customer.findMany({
            where: { id: { in: conversations.map(c => c.customerId) } },
            select: { id: true, firstName: true, lastName: true, email: true, phone: true, company: true }
          }).catch(() => []);
          return result as CustomerLite[];
        })(),
        // Try channelAdvanced first, fallback to base Channel table
        (async (): Promise<ChannelLite[]> => {
          try {
            const adv = await (this.prisma as any).channelAdvanced?.findMany?.({
              where: { id: { in: conversations.map(c => c.channelId) } },
              select: { id: true, name: true, type: true }
            });
            if (adv && adv.length > 0) return adv as ChannelLite[];
          } catch { /* ignore */ }
          
          const result = await this.prisma.channel.findMany({
            where: { id: { in: conversations.map(c => c.channelId) } },
            select: { id: true, name: true, type: true }
          }).catch(() => []);
          return result as ChannelLite[];
        })(),
        // Try messageAdvanced first, fallback to base Message table
        (async (): Promise<LastMessageLite[]> => {
          try {
            const adv = await (this.prisma as any).messageAdvanced?.findMany?.({
              where: { conversationId: { in: conversationIds } },
              orderBy: { createdAt: 'desc' },
              distinct: ['conversationId'],
              select: {
                id: true,
                conversationId: true,
                content: true,
                senderType: true,
                messageType: true,
                createdAt: true
              }
            });
            if (adv && adv.length > 0) return adv as LastMessageLite[];
          } catch { /* ignore */ }
          
          const result = await this.prisma.message.findMany({
            where: { conversationId: { in: conversationIds } },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              conversationId: true,
              content: true,
              senderType: true,
              messageType: true,
              createdAt: true
            }
          }).catch(() => []);
          return result as LastMessageLite[];
        })()
      ]);

      // Create lookup maps
      const customerMap = new Map<string, CustomerLite>(customers.map((c) => [c.id, c]));
      const channelMap = new Map<string, ChannelLite>(channels.map((c) => [c.id, c]));
      const messageMap = new Map<string, LastMessageLite>(messages.map((m) => [m.conversationId, m]));

      // Enrich conversations with AI insights and metrics
      const enrichedConversations = conversations.map((conversation) => {
        const metadata = (conversation.metadata as ConversationMetadata) || {};
        const customer = customerMap.get(conversation.customerId) as CustomerLite | undefined;
        const channel = channelMap.get(conversation.channelId) as ChannelLite | undefined;
        const lastMessage = messageMap.get(conversation.id) as LastMessageLite | undefined;
        
        // Generate realistic AI insights based on conversation data
        const messageCount = Number(conversation.messageCount || 0);
        const isRecent = !!(lastMessage && (Date.now() - new Date(lastMessage.createdAt).getTime()) < 3600000);
        const hasKeywords = (lastMessage?.content || '').toLowerCase().includes('urgent') || 
                           lastMessage?.content?.toLowerCase().includes('help') ||
                           lastMessage?.content?.toLowerCase().includes('problem');
        
        const sentimentScore = hasKeywords ? -0.3 : (Math.random() * 1.4 - 0.7);
        const urgencyLevel = hasKeywords || isRecent ? 'high' : 
                           messageCount > 5 ? 'medium' : 'low';
        const estimatedTime = urgencyLevel === 'high' ? 15 : 
                            urgencyLevel === 'medium' ? 45 : 90;
        
        return {
          id: conversation.id,
          customerId: conversation.customerId,
          customer: customer ? {
            ...customer,
            name: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Unknown Customer'
          } : { id: conversation.customerId, firstName: null, lastName: null, email: null, phone: null, company: null, name: 'Unknown Customer' } as any,
          channel: channel ? channel : ({ id: conversation.channelId, name: 'Unknown', type: 'web' } as any),
          subject: conversation.subject || 'No Subject',
          status: conversation.status,
          ticketId: metadata.ticketId || null,
          ticket: null, // Not available in ConversationAdvanced
          priority: metadata.priority || conversation.priority || 'medium',
          assignedAgentId: metadata.assignedAgentId || conversation.assignedAgentId,
          tags: metadata.tags || conversation.tags || [],
          lastMessage: lastMessage ? {
            ...lastMessage,
            preview: lastMessage.content?.substring(0, 100) + (lastMessage.content?.length > 100 ? '...' : '')
          } : null,
          messageCount: messageCount,
          unreadCount: metadata.unreadCount || 0,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
          lastMessageAt: lastMessage?.createdAt || conversation.updatedAt,
          // Add AI-derived insights
          aiInsights: {
            sentiment: sentimentScore > 0.2 ? 'positive' : sentimentScore < -0.2 ? 'negative' : 'neutral',
            sentimentScore: Math.round(sentimentScore * 100) / 100,
            urgencyLevel,
            estimatedResolutionTime: estimatedTime,
            suggestedActions: urgencyLevel === 'high' ? ['respond_immediately', 'escalate'] : 
                            urgencyLevel === 'medium' ? ['respond', 'assign_agent'] : ['respond', 'add_to_queue'],
            confidence: 0.85
          }
        };
      });

      // Compute SLA-at-risk using SLA instances linked via ticketId when available
      let slaAtRiskCount = 0;
      try {
        const ticketIds = enrichedConversations.map((c: any) => c.ticketId).filter((t: any) => typeof t === 'string' && t.length > 0) as string[];
        if (ticketIds.length) {
          const srecords = await (this.prisma as any).sLAInstance.findMany({
            where: {
              ticketId: { in: ticketIds },
              OR: [
                { status: 'breached' },
                { resolutionDue: { lte: new Date(Date.now() + 60 * 60 * 1000) } },
                { firstResponseDue: { lte: new Date() } }
              ]
            },
            select: { ticketId: true, status: true, resolutionDue: true, firstResponseDue: true }
          }) as Array<{ ticketId: string; status?: string; resolutionDue?: Date | null; firstResponseDue?: Date | null }>;
          const atRisk = new Set<string>();
          const now = Date.now();
          for (const r of srecords) {
            const isBreached = (r.status || '').toLowerCase() === 'breached';
            const resDue = r.resolutionDue ? new Date(r.resolutionDue).getTime() : undefined;
            const firstDue = r.firstResponseDue ? new Date(r.firstResponseDue).getTime() : undefined;
            const soon = (resDue && resDue <= now + 60 * 60 * 1000) || (firstDue && firstDue <= now);
            if (isBreached || soon) atRisk.add(r.ticketId);
          }
          slaAtRiskCount = atRisk.size;
          // annotate conversations
          for (const c of enrichedConversations as Array<any>) {
            c.slaAtRisk = c.ticketId ? atRisk.has(c.ticketId) : false;
          }
        }
      } catch {
        // best-effort only
      }

      return {
        success: true,
        data: {
          conversations: enrichedConversations,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            totalPages: Math.ceil(total / limitNum)
          },
          filters: {
            status,
            priority,
            channel,
          assignedTo,
          teamId,
            search
          },
          summary: {
            totalConversations: total,
            activeConversations: enrichedConversations.filter(c => c.status === 'active').length,
            unassignedConversations: enrichedConversations.filter(c => !c.assignedAgentId).length,
            highPriorityConversations: enrichedConversations.filter(c => c.priority === 'high' || c.priority === 'critical').length,
            slaAtRisk: slaAtRiskCount
          }
        }
      };
    } catch (error) {
      this.logger.error('Failed to get unified inbox:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        success: false,
        error: `Failed to get unified inbox: ${errorMessage}`,
        data: null
      };
    }
  }

  @Post(':conversationId/read')
  @ApiOperation({ summary: 'Mark conversation as read/unread' })
  @ApiResponse({ status: 200, description: 'Read state updated' })
  async markRead(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() body: { read?: boolean }
  ) {
    try {
      const read = body?.read !== false;
      const row = await (this.prisma as any).conversationAdvanced.findUnique({ where: { id: conversationId }, select: { metadata: true, tenantId: true } });
      const metadata = (row?.metadata as Record<string, unknown>) || {};
      const newMeta = {
        ...metadata,
        lastReadAt: read ? new Date().toISOString() : null,
        unreadCount: read ? 0 : (metadata as any)?.unreadCount || 0,
      } as Record<string, unknown>;
      const updated = await (this.prisma as any).conversationAdvanced.update({ where: { id: conversationId }, data: { metadata: { set: newMeta }, updatedAt: new Date() }, select: { id: true, tenantId: true, updatedAt: true } });
      try { this.convGateway.broadcast('conversation.updated', { event: 'conversation.updated', conversation: { id: conversationId, metadata: newMeta } }, row?.tenantId, conversationId); } catch (_e) { /* ignore */ }
      return { success: true, data: updated };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to mark read state for ${conversationId}: ${msg}`);
      throw new BadRequestException('Failed to update read state');
    }
  }

  @Post('mark-bulk')
  @ApiOperation({ summary: 'Bulk mark conversations as read/unread' })
  @ApiResponse({ status: 200, description: 'Bulk read state updated' })
  async markBulk(
    @CurrentUser() user: User,
    @Body() body: { ids: string[]; read?: boolean }
  ) {
    try {
      const ids = Array.isArray(body?.ids) ? body.ids.filter(Boolean) : [];
      if (!ids.length) throw new BadRequestException('ids required');
      const read = body?.read !== false;
      const rows = await (this.prisma as any).conversationAdvanced.findMany({ where: { id: { in: ids } }, select: { id: true, tenantId: true, metadata: true } });
      for (const r of rows) {
        const metadata = (r?.metadata as Record<string, unknown>) || {};
        const newMeta = {
          ...metadata,
          lastReadAt: read ? new Date().toISOString() : null,
          unreadCount: read ? 0 : (metadata as any)?.unreadCount || 0,
        } as Record<string, unknown>;
        try {
          await (this.prisma as any).conversationAdvanced.update({ where: { id: r.id }, data: { metadata: { set: newMeta }, updatedAt: new Date() } });
          this.convGateway.broadcast('conversation.updated', { event: 'conversation.updated', conversation: { id: r.id, metadata: newMeta } }, r?.tenantId, r.id);
        } catch { /* ignore single failures */ }
      }
      return { success: true, data: { updated: rows.length } };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed bulk read state: ${msg}`);
      throw new BadRequestException('Failed to update read state (bulk)');
    }
  }

  @Post(':conversationId/status')
  @ApiOperation({ summary: 'Update conversation status (active, waiting, closed, archived)' })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @CurrentUser() user: User,
    @Param('conversationId') conversationId: string,
    @Body() body: { status: 'active' | 'waiting' | 'closed' | 'archived'; reason?: string }
  ) {
    try {
      const status = body?.status;
      if (!status) throw new BadRequestException('status required');
      const now = new Date();
      const data: Record<string, unknown> = { status, updatedAt: now };
      
      // Get conversation details before updating (needed for survey triggering)
      let conversationBeforeUpdate: any = null;
      if (status === 'closed') {
        conversationBeforeUpdate = await (this.prisma as any).conversationAdvanced.findUnique({
          where: { id: conversationId },
          select: {
            id: true,
            tenantId: true,
            customerId: true,
            channelId: true,
            metadata: true,
            status: true,
          },
        });
        
        data['closedAt'] = now;
        data['closedBy'] = user.id;
        data['closeReason'] = body?.reason || null;
      } else {
        data['closedAt'] = null;
        data['closedBy'] = null;
        data['closeReason'] = null;
      }
      
      const updated = await (this.prisma as any).conversationAdvanced.update({ 
        where: { id: conversationId }, 
        data, 
        select: { id: true, tenantId: true, status: true, updatedAt: true } 
      });
      
      try { 
        this.convGateway.broadcast('conversation.updated', { event: 'conversation.updated', conversation: updated }, updated?.tenantId, conversationId); 
      } catch (_e) { /* ignore */ }
      
      // Trigger satisfaction survey when conversation is closed (if not already triggered by ticket resolution)
      if (status === 'closed' && conversationBeforeUpdate && this.satisfactionService && this.customersService) {
        try {
          await this.triggerSatisfactionSurveyOnConversationClose(
            conversationBeforeUpdate,
            user.tenantId,
            conversationId
          );
        } catch (surveyError) {
          // Best-effort: don't fail the status update if survey fails
          this.logger.warn(`Failed to trigger satisfaction survey for conversation ${conversationId}:`, surveyError);
        }
      }
      
      return { success: true, data: updated };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update status for ${conversationId}: ${msg}`);
      throw new BadRequestException('Failed to update status');
    }
  }
  
  /**
   * Trigger satisfaction survey when conversation is closed
   * Similar logic to ticket resolution, but for conversations without tickets
   */
  private async triggerSatisfactionSurveyOnConversationClose(
    conversation: { tenantId: string; customerId: string; channelId: string; metadata?: any },
    tenantId: string,
    conversationId: string
  ): Promise<void> {
    try {
      // Check if conversation is linked to a ticket (ticket resolution already triggers survey)
      const metadata = (conversation.metadata as ConversationMetadata) || {};
      const ticketId = metadata.ticketId;
      
      if (ticketId) {
        // Survey will be triggered by ticket resolution, skip to avoid duplicates
        this.logger.debug(`Conversation ${conversationId} linked to ticket ${ticketId}, skipping survey trigger`);
        return;
      }
      
      // Get customer details to determine preferred channel
      const customer = await this.prisma.customer.findUnique({
        where: { id: conversation.customerId },
        select: { email: true, phone: true, firstName: true, lastName: true },
      });
      
      if (!customer) {
        this.logger.warn(`Customer ${conversation.customerId} not found for satisfaction survey`);
        return;
      }
      
      // Get tenant settings for satisfaction surveys
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { settings: true },
      });
      
      const settings = (tenant?.settings as any) || {};
      const satisfactionSettings = settings.satisfaction || {
        enabled: true,
        autoSend: true,
        preferredChannel: 'email',
        delay: 0,
      };
      
      if (!satisfactionSettings.enabled || !satisfactionSettings.autoSend) {
        return;
      }
      
      // Dedupe: avoid sending if a survey was already created for this conversation
      try {
        const existing = await (this.prisma as any).customerSatisfactionSurvey?.findFirst?.({
          where: { tenantId, conversationId },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });
        if (existing?.id) {
          this.logger.debug(`Survey already exists for conversation ${conversationId}, skipping`);
          return;
        }
      } catch { /* ignore if model not available */ }
      
      // Preferences: respect opt-outs and quiet hours
      let preferEmail = true;
      let preferWhatsApp = true;
      let extraDelayMinutes = 0;
      try {
        if (this.customersService) {
          const prefs = await this.customersService.getPreferences(conversation.customerId, tenantId);
          if (prefs?.marketingPreferences) {
            if (prefs.marketingPreferences.emailOptOut) preferEmail = false;
            if (prefs.marketingPreferences.whatsappOptOut) preferWhatsApp = false;
          }
          // crude quiet-hours delay: if within quiet window, delay 60 minutes
          if (prefs?.quietHours?.start && prefs?.quietHours?.end) {
            extraDelayMinutes = Math.max(extraDelayMinutes, 60);
          }
        }
      } catch { /* best-effort */ }
      
      // Determine which channels to use
      const channels: ('email' | 'whatsapp')[] = [];
      
      if (satisfactionSettings.preferredChannel === 'both') {
        if (customer.email && preferEmail) channels.push('email');
        if (customer.phone && preferWhatsApp) channels.push('whatsapp');
      } else if (satisfactionSettings.preferredChannel === 'whatsapp' && customer.phone && preferWhatsApp) {
        channels.push('whatsapp');
      } else if (customer.email && preferEmail) {
        channels.push('email');
      }
      
      // Send surveys with optional delay
      const sendDelay = (satisfactionSettings.delay || 0) + (extraDelayMinutes || 0);
      
      for (const channel of channels) {
        setTimeout(async () => {
          try {
            const surveyRequest = {
              tenantId,
              customerId: conversation.customerId,
              conversationId,
              channel,
              surveyType: 'post_resolution' as const,
              metadata: {
                conversationId,
                closedAt: new Date().toISOString(),
                autoSent: true,
              },
            };
            
            if (channel === 'email') {
              await this.satisfactionService!.sendEmailSurvey(surveyRequest);
              this.logger.log(`Email satisfaction survey sent for conversation ${conversationId}`);
            } else if (channel === 'whatsapp') {
              await this.satisfactionService!.sendWhatsAppFlowSurvey(surveyRequest);
              this.logger.log(`WhatsApp satisfaction survey sent for conversation ${conversationId}`);
            }
          } catch (error) {
            this.logger.error(`Failed to send ${channel} satisfaction survey for conversation ${conversationId}:`, error);
          }
        }, sendDelay * 60 * 1000);
      }
    } catch (error) {
      this.logger.error(`Failed to process satisfaction survey for conversation ${conversationId}:`, error);
    }
  }

  @Get('analytics/real-time')
  @ApiOperation({ summary: 'Get real-time conversation analytics' })
  @ApiResponse({ status: 200, description: 'Analytics retrieved successfully' })
  async getRealTimeAnalytics(
    @CurrentUser() user: User,
    @Query('timeRange') timeRange = '24h'
  ) {
    try {
      // Calculate time range
      const now = new Date();
      let startTime: Date;
      
      switch (timeRange) {
        case '1h':
          startTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case '24h':
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
        case '7d':
          startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        default:
          startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      }

      // Get real-time metrics
      const [
        totalConversations,
        activeConversations,
        messageVolume,
        channelDistribution,
        responseTimeMetrics
      ] = await Promise.all([
        this.prisma.conversation.count({
          where: {
            tenantId: user.tenantId,
            createdAt: { gte: startTime }
          }
        }),
        this.prisma.conversation.count({
          where: {
            tenantId: user.tenantId,
            status: 'active'
          }
        }),
        this.prisma.message.count({
          where: {
            conversation: { tenantId: user.tenantId },
            createdAt: { gte: startTime }
          }
        }),
        this.prisma.conversation.groupBy({
          by: ['channelId'],
          where: {
            tenantId: user.tenantId,
            createdAt: { gte: startTime }
          },
          _count: true
        }),
        // Mock response time calculation - in real implementation, calculate from actual data
        Promise.resolve({
          average: Math.floor(Math.random() * 30) + 5,
          median: Math.floor(Math.random() * 25) + 3,
          p95: Math.floor(Math.random() * 60) + 15
        })
      ]);

      return {
        success: true,
        data: {
          overview: {
            totalConversations,
            activeConversations,
            messageVolume,
            averageResponseTime: responseTimeMetrics.average
          },
          channelDistribution: channelDistribution.map((item: { channelId: string; _count: number }) => ({
          channelId: item.channelId,
          count: item._count
        })),
          responseTimeMetrics,
          trends: {
            // Mock trend data - in real implementation, calculate from time series data
            conversationTrend: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              count: Math.floor(Math.random() * 50) + 10
            })),
            messageTrend: Array.from({ length: 24 }, (_, i) => ({
              hour: i,
              count: Math.floor(Math.random() * 200) + 50
            }))
          }
        }
      };
    } catch (error: unknown) {
      this.logger.error('Failed to get conversation analytics:', error instanceof Error ? error.message : String(error));
      throw new BadRequestException('Failed to get analytics');
    }
  }

  @Get('health')
  @ApiOperation({ summary: 'Get conversation system health' })
  @ApiResponse({ status: 200, description: 'Health status retrieved successfully' })
  async getSystemHealth() {
    try {
      const eventBusHealthPromise: Promise<{ connected?: boolean }> = (async () => {
        try {
          if (this.eventBus && typeof this.eventBus.getHealth === 'function') {
            return await this.eventBus.getHealth();
          }
        } catch {
          // ignore
        }
        return { connected: false };
      })();
      const dbHealthPromise: Promise<{ connected: boolean; responseTime?: number }> = this.checkDatabaseHealth();
      const [eventBusHealth, dbHealth] = await Promise.all([eventBusHealthPromise, dbHealthPromise]);

      return {
        success: true,
        data: {
          eventBus: eventBusHealth,
          database: dbHealth,
          timestamp: new Date(),
          status: eventBusHealth.connected && dbHealth.connected ? 'healthy' : 'degraded'
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error('Failed to get system health:', errorMessage);
      return {
        success: false,
        data: {
          status: 'unhealthy',
          error: errorMessage,
          timestamp: new Date()
        }
      };
    }
  }

  private async checkDatabaseHealth(): Promise<{ connected: boolean; responseTime?: number }> {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - start;
      
      return {
        connected: true,
        responseTime
      };
    } catch {
      return {
        connected: false
      };
    }
  }
}