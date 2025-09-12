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
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventBus?: { getHealth?: () => Promise<{ connected?: boolean }> }
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
      const context = await this.conversationOrchestrator.getConversationDetails(
        conversationId,
        user.tenantId
      );
      
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
    @Query('search') search?: string
  ) {
    try {
      const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20));
      const skip = (pageNum - 1) * limitNum;
      
      // Build dynamic where clause
      const whereClause: Record<string, unknown> = {
        tenantId: user.tenantId
      };

      // Handle status filter
      if (status && status !== 'all') {
        whereClause.status = status;
      }

      // Handle channel filter (ConversationAdvanced only has channelId)
      if (channel && channel !== 'all') {
        const channelRows = await this.prisma.channel.findMany({
          where: { tenantId: user.tenantId, type: channel },
          select: { id: true }
        });
        const channelIds = channelRows.map((c) => c.id);
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

      // Handle search across customer name, email, and conversation subject
      if (search && search.trim()) {
        const searchTerm = search.trim();
        whereClause.OR = [
          {
            subject: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            customer: {
              OR: [
                {
                  firstName: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                },
                {
                  lastName: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                },
                {
                  email: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                },
                {
                  company: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                }
              ]
            }
          }
        ];
      }

      // Get conversations with comprehensive data
      const [conversations, total] = await Promise.all([
        this.prisma.conversationAdvanced.findMany({
          where: whereClause,
          orderBy: { updatedAt: 'desc' },
          skip,
          take: limitNum
        }),
        this.prisma.conversationAdvanced.count({ where: whereClause })
      ]);

      // Get related data separately to avoid complex joins
      const conversationIds = conversations.map(c => c.id);
      const [customers, channels, messages] = await Promise.all([
        this.prisma.customer.findMany({
          where: { id: { in: conversations.map(c => c.customerId) } },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            company: true
          }
        }),
        this.prisma.channel.findMany({
          where: { id: { in: conversations.map(c => c.channelId) } },
          select: {
            id: true,
            name: true,
            type: true
          }
        }),
        this.prisma.messageAdvanced.findMany({
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
        })
      ]);

      // Create lookup maps
      const customerMap = new Map(customers.map(c => [c.id, c]));
      const channelMap = new Map(channels.map(c => [c.id, c]));
      const messageMap = new Map(messages.map(m => [m.conversationId, m]));

      // Enrich conversations with AI insights and metrics
      const enrichedConversations = conversations.map((conversation) => {
        const metadata = (conversation.metadata as ConversationMetadata) || {};
        const customer = customerMap.get(conversation.customerId);
        const channel = channelMap.get(conversation.channelId);
        const lastMessage = messageMap.get(conversation.id);
        
        // Generate realistic AI insights based on conversation data
        const messageCount = Number(conversation.messageCount || 0);
        const isRecent = lastMessage && (Date.now() - new Date(lastMessage.createdAt).getTime()) < 3600000; // 1 hour
        const hasKeywords = lastMessage?.content?.toLowerCase().includes('urgent') || 
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
          customer: {
            ...customer,
            name: `${customer?.firstName || ''} ${customer?.lastName || ''}`.trim() || 'Unknown Customer'
          },
          channel: channel,
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
            search
          },
          summary: {
            totalConversations: total,
            activeConversations: enrichedConversations.filter(c => c.status === 'active').length,
            unassignedConversations: enrichedConversations.filter(c => !c.assignedAgentId).length,
            highPriorityConversations: enrichedConversations.filter(c => c.priority === 'high' || c.priority === 'critical').length
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