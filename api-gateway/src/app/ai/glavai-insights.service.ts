import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { WalletService } from '../wallet/wallet.service';
import { calculateAITokenCost } from '../wallet/pricing.config';

export interface SentimentTrend {
  date: string;
  positive: number;
  negative: number;
  neutral: number;
}

export interface EscalationAlert {
  id: string;
  conversationId?: string;
  ticketId?: string;
  customerId?: string;
  probability: number;
  reasoning: string;
  urgencyLevel: string;
  createdAt: Date;
}

export interface IntentDistribution {
  intent: string;
  count: number;
  percentage: number;
  category: string;
}

export interface KnowledgeUsage {
  articleId: string;
  title: string;
  suggestionCount: number;
  viewCount: number;
  helpfulRate: number;
}

@Injectable()
export class GlavaiInsightsService {
  private readonly logger = new Logger(GlavaiInsightsService.name);
  private aiService: any;

  constructor(
    private readonly db: DatabaseService,
    private readonly walletService: WalletService,
  ) {
    this.loadAIService();
  }

  private async loadAIService() {
    try {
      const aiModule = await import('@glavito/shared-ai');
      this.aiService = aiModule.AIIntelligenceService;
    } catch (e) {
      this.logger.warn('Failed to load AI service:', e);
    }
  }

  /**
   * Get sentiment trends over time
   */
  async getSentimentTrends(
    tenantId: string,
    timeRange?: { from: Date; to: Date },
  ): Promise<SentimentTrend[]> {
    const from = timeRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = timeRange?.to || new Date();

    try {
      const analyses = await this.db.aIAnalysisResult.findMany({
        where: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          createdAt: true,
          results: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      // Group by day
      const dayMap = new Map<string, { positive: number; negative: number; neutral: number }>();

      for (const analysis of analyses) {
        const date = new Date(analysis.createdAt);
        const dayKey = date.toISOString().slice(0, 10);
        const bucket = dayMap.get(dayKey) || { positive: 0, negative: 0, neutral: 0 };

        const sentiment = (analysis.results as any)?.sentimentAnalysis?.sentiment;
        if (sentiment === 'positive') bucket.positive += 1;
        else if (sentiment === 'negative') bucket.negative += 1;
        else bucket.neutral += 1;

        dayMap.set(dayKey, bucket);
      }

      return Array.from(dayMap.entries())
        .map(([date, counts]) => ({
          date,
          ...counts,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    } catch (error) {
      this.logger.error(`Failed to get sentiment trends: ${String(error)}`);
      return [];
    }
  }

  /**
   * Get proactive escalation predictions
   */
  async getEscalationPredictions(
    tenantId: string,
    timeRange?: { from: Date; to: Date },
    limit = 20,
  ): Promise<EscalationAlert[]> {
    const from = timeRange?.from || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const to = timeRange?.to || new Date();

    try {
      // Get recent analyses with escalation predictions
      const analyses = await this.db.aIAnalysisResult.findMany({
        where: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          id: true,
          conversationId: true,
          customerId: true,
          results: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 500, // Get more to filter
      });

      const alerts: EscalationAlert[] = [];

      for (const analysis of analyses) {
        const escalation = (analysis.results as any)?.escalationPrediction;
        if (!escalation || !escalation.shouldEscalate) continue;

        const urgency = (analysis.results as any)?.urgencyDetection?.urgencyLevel || 'medium';
        const probability = escalation.escalationProbability || 0;

        // Only include high-probability escalations
        if (probability >= 0.6) {
          // Try to find associated ticket
          let ticketId: string | undefined;
          if (analysis.conversationId) {
            try {
              const conv = await this.db.conversation.findUnique({
                where: { id: analysis.conversationId },
                select: { ticketId: true },
              });
              ticketId = (conv as any)?.ticketId;
            } catch {
              // Ignore
            }
          }

          alerts.push({
            id: analysis.id,
            conversationId: analysis.conversationId || undefined,
            ticketId,
            customerId: analysis.customerId || undefined,
            probability,
            reasoning: escalation.reasoning || 'High escalation probability detected',
            urgencyLevel: urgency,
            createdAt: analysis.createdAt,
          });
        }
      }

      // Sort by probability descending and limit
      return alerts.sort((a, b) => b.probability - a.probability).slice(0, limit);
    } catch (error) {
      this.logger.error(`Failed to get escalation predictions: ${String(error)}`);
      return [];
    }
  }

  /**
   * Get intent distribution
   */
  async getIntentDistribution(
    tenantId: string,
    timeRange?: { from: Date; to: Date },
  ): Promise<IntentDistribution[]> {
    const from = timeRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = timeRange?.to || new Date();

    try {
      const analyses = await this.db.aIAnalysisResult.findMany({
        where: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          results: true,
        },
      });

      const intentCounts = new Map<
        string,
        { count: number; category: string }
      >();

      for (const analysis of analyses) {
        const intent = (analysis.results as any)?.intentClassification?.primaryIntent;
        const category = (analysis.results as any)?.intentClassification?.category || 'general';

        if (intent) {
          const current = intentCounts.get(intent) || { count: 0, category };
          current.count += 1;
          intentCounts.set(intent, current);
        }
      }

      const total = analyses.length;
      return Array.from(intentCounts.entries())
        .map(([intent, data]) => ({
          intent,
          count: data.count,
          percentage: total > 0 ? (data.count / total) * 100 : 0,
          category: data.category,
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      this.logger.error(`Failed to get intent distribution: ${String(error)}`);
      return [];
    }
  }

  /**
   * Get knowledge base usage statistics
   */
  async getKnowledgeUsage(
    tenantId: string,
    timeRange?: { from: Date; to: Date },
  ): Promise<KnowledgeUsage[]> {
    const from = timeRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const to = timeRange?.to || new Date();

    try {
      // Get analyses with knowledge suggestions
      const analyses = await this.db.aIAnalysisResult.findMany({
        where: {
          tenantId,
          createdAt: { gte: from, lte: to },
        },
        select: {
          results: true,
        },
      });

      const articleMap = new Map<
        string,
        { title: string; suggestionCount: number }
      >();

      for (const analysis of analyses) {
        const knowledge = (analysis.results as any)?.knowledgeSuggestions;
        if (!knowledge?.articles) continue;

        for (const article of knowledge.articles) {
          const current = articleMap.get(article.id) || {
            title: article.title,
            suggestionCount: 0,
          };
          current.suggestionCount += 1;
          articleMap.set(article.id, current);
        }
      }

      // Get view counts and helpful rates from knowledge base
      const articleIds = Array.from(articleMap.keys());
      const kbArticles = await this.db.knowledgeBase.findMany({
        where: {
          tenantId,
          id: { in: articleIds },
        },
        select: {
          id: true,
          title: true,
          viewCount: true,
          helpfulCount: true,
        },
      });

      const kbMap = new Map(
        kbArticles.map((a) => [
          a.id,
          {
            viewCount: a.viewCount || 0,
            helpfulCount: a.helpfulCount || 0,
          },
        ]),
      );

      return Array.from(articleMap.entries())
        .map(([articleId, data]) => {
          const kb = kbMap.get(articleId) || { viewCount: 0, helpfulCount: 0 };
          const helpfulRate =
            kb.viewCount > 0 ? kb.helpfulCount / kb.viewCount : 0;

          return {
            articleId,
            title: data.title,
            suggestionCount: data.suggestionCount,
            viewCount: kb.viewCount,
            helpfulRate,
          };
        })
        .sort((a, b) => b.suggestionCount - a.suggestionCount)
        .slice(0, 20); // Top 20
    } catch (error) {
      this.logger.error(`Failed to get knowledge usage: ${String(error)}`);
      return [];
    }
  }

  /**
   * Get comprehensive insights for dashboard
   */
  async getComprehensiveInsights(
    tenantId: string,
    timeRange?: { from: Date; to: Date },
  ): Promise<{
    sentimentTrends: SentimentTrend[];
    escalationAlerts: EscalationAlert[];
    intentDistribution: IntentDistribution[];
    knowledgeUsage: KnowledgeUsage[];
    summary: {
      totalAnalyses: number;
      avgConfidence: number;
      escalationRiskCount: number;
      topIntent: string;
    };
  }> {
      if (!this.aiService) {
        await this.loadAIService();
      }

      // Calculate and deduct AI tokens for insights generation
      const tokenCost = calculateAITokenCost('insights', 0); // Insights are aggregated
      await this.walletService.deductAITokens(
        tenantId,
        tokenCost,
        'insights',
        `insights_${Date.now()}`,
        'Comprehensive AI insights generation',
      ).catch(() => {
        // If deduction fails, continue but log
        this.logger.warn('Failed to deduct AI tokens for insights, continuing anyway');
      });

      const [sentimentTrends, escalationAlerts, intentDistribution, knowledgeUsage, aiInsights] =
      await Promise.all([
        this.getSentimentTrends(tenantId, timeRange),
        this.getEscalationPredictions(tenantId, timeRange, 10),
        this.getIntentDistribution(tenantId, timeRange),
        this.getKnowledgeUsage(tenantId, timeRange),
        this.aiService?.getAIInsights?.(tenantId, {
          from: timeRange?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          to: timeRange?.to || new Date(),
        }) || Promise.resolve({ totalAnalyses: 0, averageConfidence: 0 }),
      ]);

    const topIntent = intentDistribution[0]?.intent || 'unknown';

    return {
      sentimentTrends,
      escalationAlerts,
      intentDistribution,
      knowledgeUsage,
      summary: {
        totalAnalyses: aiInsights.totalAnalyses || 0,
        avgConfidence: aiInsights.averageConfidence || 0,
        escalationRiskCount: escalationAlerts.length,
        topIntent,
      },
    };
  }

  /**
   * Create proactive alert for escalation risk or other insights
   */
  async createAlert(params: {
    tenantId: string;
    alertType: 'escalation_risk' | 'sentiment_trend' | 'anomaly' | 'auto_resolve_failed';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description?: string;
    conversationId?: string;
    ticketId?: string;
    customerId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<string> {
    try {
      const alert = await (this.db as any).aiInsightAlert.create({
        data: {
          tenantId: params.tenantId,
          alertType: params.alertType,
          severity: params.severity,
          title: params.title,
          description: params.description,
          conversationId: params.conversationId,
          ticketId: params.ticketId,
          customerId: params.customerId,
          metadata: params.metadata || {},
        },
      });
      return alert.id;
    } catch (error) {
      this.logger.error(`Failed to create alert: ${String(error)}`);
      throw error;
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(
    tenantId: string,
    limit = 50,
  ): Promise<Array<{
    id: string;
    alertType: string;
    severity: string;
    title: string;
    description?: string;
    conversationId?: string;
    ticketId?: string;
    createdAt: Date;
  }>> {
    try {
      const alerts = await (this.db as any).aiInsightAlert.findMany({
        where: {
          tenantId,
          acknowledged: false,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
      return alerts.map((a: any) => ({
        id: a.id,
        alertType: a.alertType,
        severity: a.severity,
        title: a.title,
        description: a.description,
        conversationId: a.conversationId,
        ticketId: a.ticketId,
        createdAt: a.createdAt,
      }));
    } catch (error) {
      this.logger.error(`Failed to get active alerts: ${String(error)}`);
      return [];
    }
  }

  /**
   * Get lightweight widget data
   */
  async getWidgetData(tenantId: string): Promise<{
    autoResolvesToday: number;
    escalationAlerts: number;
    avgConfidence: number;
    sentimentSnapshot: { positive: number; negative: number; neutral: number };
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const [autoResolutions, escalationAlerts, recentAnalyses] = await Promise.all([
        // Auto-resolves today
        (this.db as any).aIAutoResolution?.count?.({
          where: {
            tenantId,
            createdAt: { gte: today, lt: tomorrow },
            responseSent: true,
          },
        }).catch(() => 0),
        // Escalation alerts (unacknowledged)
        (this.db as any).aiInsightAlert?.count?.({
          where: {
            tenantId,
            acknowledged: false,
            alertType: 'escalation_risk',
            createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          },
        }).catch(() => 0),
        // Recent analyses for sentiment snapshot
        this.db.aIAnalysisResult.findMany({
          where: {
            tenantId,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
          select: {
            results: true,
            confidence: true,
          },
          take: 100,
        }),
      ]);

      const sentimentSnapshot = { positive: 0, negative: 0, neutral: 0 };
      let totalConfidence = 0;

      for (const analysis of recentAnalyses) {
        const sentiment = (analysis.results as any)?.sentimentAnalysis?.sentiment;
        if (sentiment === 'positive') sentimentSnapshot.positive += 1;
        else if (sentiment === 'negative') sentimentSnapshot.negative += 1;
        else sentimentSnapshot.neutral += 1;

        totalConfidence += analysis.confidence || 0;
      }

      const avgConfidence =
        recentAnalyses.length > 0 ? totalConfidence / recentAnalyses.length : 0;

      return {
        autoResolvesToday: autoResolutions || 0,
        escalationAlerts: escalationAlerts || 0,
        avgConfidence,
        sentimentSnapshot,
      };
    } catch (error) {
      this.logger.error(`Failed to get widget data: ${String(error)}`);
      return {
        autoResolvesToday: 0,
        escalationAlerts: 0,
        avgConfidence: 0,
        sentimentSnapshot: { positive: 0, negative: 0, neutral: 0 },
      };
    }
  }
}

