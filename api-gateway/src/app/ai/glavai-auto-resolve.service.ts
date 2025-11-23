import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WalletService } from '../wallet/wallet.service';
import { calculateAITokenCost } from '../wallet/pricing.config';

export interface AutoResolveResult {
  success: boolean;
  resolved: boolean;
  confidence: number;
  intent?: string;
  category?: string;
  responseSent: boolean;
  responseMessageId?: string;
  reason?: string;
}

@Injectable()
export class GlavaiAutoResolveService {
  private readonly logger = new Logger(GlavaiAutoResolveService.name);
  private aiService: any;

  constructor(
    private readonly db: DatabaseService,
    private readonly walletService: WalletService,
  ) {
    // Lazy load AI service
    this.loadAIService();
  }

  private async loadAIService() {
    try {
      const aiModule = await import('@glavito/shared-ai');
      // Get AI service from module or inject it properly
      this.aiService = aiModule.AIIntelligenceService;
    } catch (e) {
      this.logger.warn('Failed to load AI service:', e);
    }
  }

  /**
   * Attempt to auto-resolve a conversation or ticket based on AI analysis
   */
  async attemptAutoResolve(params: {
    tenantId: string;
    conversationId?: string;
    ticketId?: string;
    content: string;
    channelType?: string;
    customerId?: string;
  }): Promise<AutoResolveResult> {
    const { tenantId, conversationId, ticketId, content, channelType, customerId } = params;

    try {
      // Get tenant configuration
      const config = await this.db.aISettings.findUnique({
        where: { tenantId },
      });

      const configAny = config as any;
      if (!configAny?.autoResolveEnabled) {
        return {
          success: false,
          resolved: false,
          confidence: 0,
          responseSent: false,
          reason: 'Auto-resolve is disabled for this tenant',
        };
      }

      const threshold = configAny.autoResolveConfidenceThreshold ?? 0.85;
      const allowedChannels = Array.isArray(configAny.autoResolveChannels)
        ? configAny.autoResolveChannels
        : [];
      const autoSendResponse = configAny.autoResolveSendResponse ?? true;

      // Check channel restriction
      if (
        allowedChannels.length > 0 &&
        channelType &&
        !allowedChannels.includes(channelType)
      ) {
        return {
          success: false,
          resolved: false,
          confidence: 0,
          responseSent: false,
          reason: `Channel ${channelType} not allowed for auto-resolve`,
        };
      }

      // Get conversation context for better analysis
      let previousMessages: string[] = [];
      if (conversationId) {
        try {
          const messages = await this.db.message.findMany({
            where: { conversationId },
            orderBy: { createdAt: 'desc' },
            take: 5,
            select: { content: true, senderType: true },
          });
          previousMessages = messages
            .reverse()
            .map((m) => `${m.senderType}: ${m.content}`)
            .slice(0, -1); // Exclude current message
        } catch (e) {
          this.logger.warn(`Failed to fetch previous messages: ${String(e)}`);
        }
      }

      // Perform AI analysis
      if (!this.aiService) {
        await this.loadAIService();
      }
      if (!this.aiService) {
        return {
          success: false,
          resolved: false,
          confidence: 0,
          responseSent: false,
          reason: 'AI service not available',
        };
      }

      // Calculate and deduct AI tokens
      const tokenCost = calculateAITokenCost('auto_resolve', content.length);
      const deductionResult = await this.walletService.deductAITokens(
        tenantId,
        tokenCost,
        'auto_resolve',
        conversationId || ticketId || `auto_resolve_${Date.now()}`,
        `Auto-resolve attempt for ${conversationId || ticketId}`,
      );

      if (!deductionResult.success) {
        return {
          success: false,
          resolved: false,
          confidence: 0,
          responseSent: false,
          reason: `Insufficient AI tokens: ${deductionResult.error || 'Unknown error'}`,
        };
      }

      const analysis = await this.aiService.analyzeContent({
        content,
        context: {
          tenantId,
          conversationId,
          customerId,
          channelType,
          previousMessages,
        },
        analysisTypes: [
          'intent_classification',
          'sentiment_analysis',
          'urgency_detection',
          'response_generation',
        ] as any,
      });

      const intent = analysis.results.intentClassification?.primaryIntent;
      const category = analysis.results.intentClassification?.category;
      const confidence = analysis.confidence || 0;
      const sentiment = analysis.results.sentimentAnalysis?.sentiment;
      const urgencyLevel = analysis.results.urgencyDetection?.urgencyLevel;

      // Check if this is a routine query that can be auto-resolved
      const routineIntents = [
        'faq',
        'information_request',
        'password_reset',
        'order_status',
        'account_info',
        'general_inquiry',
      ];

      const isRoutineQuery =
        intent &&
        (routineIntents.includes(intent.toLowerCase()) ||
          intent.toLowerCase().includes('faq') ||
          intent.toLowerCase().includes('info'));

      // Don't auto-resolve if:
      // - Confidence is below threshold
      // - Not a routine query
      // - Negative sentiment (may need human attention)
      // - High urgency
      if (
        confidence < threshold ||
        !isRoutineQuery ||
        sentiment === 'negative' ||
        urgencyLevel === 'high' ||
        urgencyLevel === 'critical'
      ) {
        return {
          success: true,
          resolved: false,
          confidence,
          intent,
          category,
          responseSent: false,
          reason: `Confidence ${confidence} below threshold ${threshold} or not routine query`,
        };
      }

      // Generate response
      const responseResult = await this.aiService.generateAutoReply?.({
        content,
        previousMessages,
        context: {
          tenantId,
          conversationId,
          channelType,
        },
      });

      let responseMessageId: string | undefined;
      let responseSent = false;

      // Send response if configured - use direct database operations to avoid circular deps
      if (autoSendResponse && responseResult.answer && conversationId) {
        try {
          // Find or use a system user ID (look for first admin user or use 'bot' like autopilot)
          let systemUserId = 'bot'; // Default fallback
          try {
            const adminUser = await this.db.user.findFirst({
              where: { tenantId, role: { in: ['admin', 'super_admin'] } },
              select: { id: true },
            });
            if (adminUser) systemUserId = adminUser.id;
          } catch {
            // Use 'bot' as fallback
          }

          // Create message directly
          const message = await this.db.message.create({
            data: {
              conversationId,
              senderId: systemUserId,
              senderType: 'system',
              content: responseResult.answer,
              messageType: 'text',
              metadata: {
                glavai: true,
                autoResolved: true,
                confidence: responseResult.confidence,
                intent: responseResult.intent,
              } as any,
          },
          });
          responseMessageId = message.id;
          responseSent = true;

          // Update conversation updatedAt
          await this.db.conversation.update({
            where: { id: conversationId },
            data: {
              updatedAt: new Date(),
            },
          });
        } catch (e) {
          this.logger.error(`Failed to send auto-resolve response: ${String(e)}`);
          // Continue with resolution even if response send fails
        }
      }

      // Resolve conversation or ticket directly
      if (conversationId) {
        try {
          const conv = await this.db.conversation.findUnique({
            where: { id: conversationId },
            select: { metadata: true },
          });
          const existingMetadata = (conv as any)?.metadata || {};
          await this.db.conversation.update({
            where: { id: conversationId },
            data: {
              status: 'closed',
              metadata: {
                ...existingMetadata,
                autoResolved: true,
                resolvedBy: 'glavai',
                resolvedAt: new Date().toISOString(),
                confidence,
                intent,
              } as any,
            },
          });
        } catch (e) {
          this.logger.error(`Failed to resolve conversation: ${String(e)}`);
        }
      }

      if (ticketId) {
        try {
          await this.db.ticket.update({
            where: { id: ticketId },
            data: {
              status: 'resolved',
              resolvedAt: new Date(),
            },
          });
        } catch (e) {
          this.logger.error(`Failed to resolve ticket: ${String(e)}`);
        }
      }

      // Log auto-resolution
      try {
        await (this.db as any).aIAutoResolution.create({
          data: {
            tenantId,
            conversationId,
            ticketId,
            confidence,
            intent,
            category,
            responseSent,
            responseMessageId,
            metadata: {
              sentiment,
              urgencyLevel,
              responseText: responseResult.answer,
            },
          },
        });
      } catch (e) {
        this.logger.warn(`Failed to log auto-resolution: ${String(e)}`);
      }

      // Publish event
      try {
        // Event publishing would go here if event bus is available
        this.logger.log(
          `GLAVAI auto-resolved ${conversationId || ticketId} with confidence ${confidence}`,
        );
      } catch (e) {
        // Non-fatal
      }

      return {
        success: true,
        resolved: true,
        confidence,
        intent,
        category,
        responseSent,
        responseMessageId,
      };
    } catch (error) {
      this.logger.error(`Auto-resolve failed: ${String(error)}`);
      return {
        success: false,
        resolved: false,
        confidence: 0,
        responseSent: false,
        reason: `Error: ${String((error as Error)?.message || error)}`,
      };
    }
  }

  /**
   * Get auto-resolve statistics for a tenant
   */
  async getAutoResolveStats(
    tenantId: string,
    timeRange?: { from: Date; to: Date },
  ): Promise<{
    totalAttempts: number;
    successfulResolutions: number;
    successRate: number;
    averageConfidence: number;
    byIntent: Array<{ intent: string; count: number; successRate: number }>;
  }> {
    const from = timeRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = timeRange?.to || new Date();

    try {
      const resolutions = await (this.db as any).aIAutoResolution.findMany({
        where: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          confidence: true,
          intent: true,
          responseSent: true,
        },
      });

      const total = resolutions.length;
      const successful = resolutions.filter((r: any) => r.responseSent).length;
      const avgConfidence =
        total > 0
          ? resolutions.reduce((sum: number, r: any) => sum + (r.confidence || 0), 0) / total
          : 0;

      // Group by intent
      const intentMap = new Map<string, { total: number; successful: number }>();
      for (const r of resolutions) {
        const intent = (r.intent as string) || 'unknown';
        const current = intentMap.get(intent) || { total: 0, successful: 0 };
        current.total += 1;
        if (r.responseSent) current.successful += 1;
        intentMap.set(intent, current);
      }

      const byIntent = Array.from(intentMap.entries()).map(([intent, stats]) => ({
        intent,
        count: stats.total,
        successRate: stats.total > 0 ? stats.successful / stats.total : 0,
      }));

      return {
        totalAttempts: total,
        successfulResolutions: successful,
        successRate: total > 0 ? successful / total : 0,
        averageConfidence: avgConfidence,
        byIntent,
      };
    } catch (error) {
      this.logger.error(`Failed to get auto-resolve stats: ${String(error)}`);
      return {
        totalAttempts: 0,
        successfulResolutions: 0,
        successRate: 0,
        averageConfidence: 0,
        byIntent: [],
      };
    }
  }
}

