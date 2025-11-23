import { 
  Controller, 
  Post, 
  Patch,
  Get, 
  Body, 
  Param, 
  Query, 
  UseGuards,
  Request
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentTenant, CurrentUser } from '@glavito/shared-auth'
import { AIIntelligenceService, AIAnalysisRequest, AIAnalysisResult } from '@glavito/shared-ai';
import { AIOrchestratorService } from './ai-orchestrator.service';
import { DatabaseService } from '@glavito/shared-database';
import { GlavaiAutoResolveService } from './glavai-auto-resolve.service';
import { GlavaiInsightsService } from './glavai-insights.service';
import { WalletService } from '../wallet/wallet.service';
import { calculateAITokenCost } from '../wallet/pricing.config';

export class AnalyzeContentDto {
  content!: string;
  context?: {
    conversationId?: string;
    customerId?: string;
    callId?: string;
    tenantId?: string;
    channelType?: string;
    previousMessages?: string[];
  };
  analysisTypes!: string[];
}

export class TrainModelDto {
  modelType!: string;
  trainingData!: any[];
}

export class AIInsightsQueryDto {
  timeRange?: {
    from: string;
    to: string;
  };
}

@ApiTags('AI Intelligence')
@Controller('ai')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AIController {
  constructor(
    private readonly aiService: AIIntelligenceService,
    private readonly db: DatabaseService,
    private readonly orchestrator: AIOrchestratorService,
    private readonly autoResolveService: GlavaiAutoResolveService,
    private readonly insightsService: GlavaiInsightsService,
    private readonly walletService: WalletService,
  ) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze content with AI' })
  @ApiResponse({ status: 200, description: 'Content analyzed successfully' })
  async analyzeContent(
    @Body() dto: AnalyzeContentDto,
    @Request() req: any,
    @CurrentTenant() tenantId?: string,
  ): Promise<AIAnalysisResult> {
    const effectiveTenantId = tenantId || req?.user?.tenantId || dto.context?.tenantId;
    
    if (!effectiveTenantId) {
      throw new Error('Tenant ID is required for AI analysis');
    }

    const request: AIAnalysisRequest = {
      content: dto.content,
      context: {
        ...dto.context,
        tenantId: effectiveTenantId,
      },
      analysisTypes: dto.analysisTypes as any[]
    };

    // Calculate token cost
    const tokenCost = calculateAITokenCost(
      'ai_analysis',
      dto.content.length,
      dto.analysisTypes,
    );

    // Deduct tokens before analysis
    const deductionResult = await this.walletService.deductAITokens(
      effectiveTenantId,
      tokenCost,
      'ai_analysis',
      `analysis_${Date.now()}`,
      `AI analysis: ${dto.analysisTypes.join(', ')}`,
    );

    if (!deductionResult.success) {
      throw new Error(`Insufficient AI tokens: ${deductionResult.error || 'Unknown error'}`);
    }

    try {
      const result = await this.aiService.analyzeContent(request);
      
      // Store token cost in result metadata
      (result as any).tokenCost = tokenCost;
      (result as any).remainingBalance = deductionResult.balance;
      
      return result;
    } catch (error) {
      // Refund tokens if analysis fails
      await this.walletService.addAITokens(
        effectiveTenantId,
        tokenCost,
        'refund',
        `Refund for failed AI analysis`,
      ).catch((err) => {
        // Log but don't fail if refund fails
        console.error('Failed to refund AI tokens:', err);
      });
      throw error;
    }
  }

  @Post('route-intent')
  @ApiOperation({ summary: 'Analyze content and execute tool calls based on intent' })
  async routeIntent(@Body() body: { content: string; context?: any }, @Request() req: any, @CurrentTenant() tenantId?: string) {
    const ctx = { ...(body?.context || {}), tenantId: (body?.context?.tenantId || tenantId || req?.user?.tenantId) };
    const result = await this.orchestrator.routeIntent({ content: body.content, context: ctx });
    return { success: true, data: result };
  }

  @Post('train-model')
  @ApiOperation({ summary: 'Train custom AI model' })
  @ApiResponse({ status: 201, description: 'Model training started' })
  async trainModel(
    @Body() dto: TrainModelDto,
    @Request() req: any
  ): Promise<{ modelId: string }> {
    const modelId = await this.aiService.trainCustomModel(
      dto.modelType,
      dto.trainingData.map(data => ({ ...data, tenantId: req.user.tenantId }))
    );

    return { modelId };
  }

  @Get('models/:modelId/status')
  @ApiOperation({ summary: 'Get model training status' })
  @ApiResponse({ status: 200, description: 'Model status retrieved' })
  async getModelStatus(@Param('modelId') modelId: string) {
    return await this.aiService.getModelStatus(modelId);
  }

  // --- Autopilot config ---
  @Get('autopilot/config')
  async getAutopilot(@Request() req: any) {
    const cfg = await (this.db as any).aISettings.findUnique({ where: { tenantId: req.user.tenantId } });
    return { success: true, data: cfg || { mode: 'off', minConfidence: 0.7, maxAutoRepliesPerHour: 10, allowedChannels: [], guardrails: {} } };
  }

  @Post('autopilot/config')
  async setAutopilot(@Body() body: { mode?: 'off'|'draft'|'auto'; minConfidence?: number; maxAutoRepliesPerHour?: number; allowedChannels?: string[]; guardrails?: any }, @Request() req: any) {
    // Basic RBAC: admin only
    if (!req?.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
      return { success: false, error: 'forbidden' };
    }
    const data: any = {};
    if (body.mode) data.mode = body.mode;
    if (typeof body.minConfidence === 'number') data.minConfidence = body.minConfidence;
    if (typeof body.maxAutoRepliesPerHour === 'number') data.maxAutoRepliesPerHour = body.maxAutoRepliesPerHour;
    if (Array.isArray(body.allowedChannels)) data.allowedChannels = body.allowedChannels;
    if (body.guardrails) data.guardrails = body.guardrails;
    const upserted = await (this.db as any).aISettings.upsert({
      where: { tenantId: req.user.tenantId },
      create: { tenantId: req.user.tenantId, mode: 'off', minConfidence: 0.7, maxAutoRepliesPerHour: 10, allowedChannels: [], guardrails: {}, ...data },
      update: data,
    });
    return { success: true, data: upserted };
  }

  @Patch('autopilot/config')
  async patchAutopilot(@Body() body: { mode?: 'off'|'draft'|'auto'; minConfidence?: number; maxAutoRepliesPerHour?: number; allowedChannels?: string[]; guardrails?: any }, @Request() req: any) {
    if (!req?.user || (req.user.role !== 'admin' && req.user.role !== 'manager')) {
      return { success: false, error: 'forbidden' };
    }
    const data: any = {};
    if (body.mode) data.mode = body.mode;
    if (typeof body.minConfidence === 'number') data.minConfidence = body.minConfidence;
    if (typeof body.maxAutoRepliesPerHour === 'number') data.maxAutoRepliesPerHour = body.maxAutoRepliesPerHour;
    if (Array.isArray(body.allowedChannels)) data.allowedChannels = body.allowedChannels;
    if (body.guardrails) data.guardrails = body.guardrails;
    const upserted = await (this.db as any).aISettings.upsert({
      where: { tenantId: req.user.tenantId },
      create: { tenantId: req.user.tenantId, mode: 'off', minConfidence: 0.7, maxAutoRepliesPerHour: 10, allowedChannels: [], guardrails: {}, ...data },
      update: data,
    });
    return { success: true, data: upserted };
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get AI insights and analytics' })
  @ApiResponse({ status: 200, description: 'AI insights retrieved' })
  async getAIInsights(
    @Query() query: any,
    @CurrentTenant() tenantId: string
  ) {
    try {
      // Support both nested timeRange object and flattened timeRange[from]/timeRange[to] query params
      const fromParam = query?.timeRange?.from || query?.['timeRange[from]']
      const toParam = query?.timeRange?.to || query?.['timeRange[to]']
      const timeRange = (fromParam && toParam) ? {
        from: new Date(fromParam),
        to: new Date(toParam)
      } : {
        from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: new Date()
      };
      const insights = await this.aiService.getAIInsights(tenantId, timeRange);
      return { success: true, data: insights };
    } catch (error) {
      // Fail-soft: return zeros instead of 500
      return {
        success: false,
        data: {
          totalAnalyses: 0,
          averageConfidence: 0,
          modelsActive: 0,
          topIntents: [],
          sentimentTrends: [],
          performanceMetrics: { accuracy: 0, responseTime: 0, successRate: 0 },
        }
      }
    }
  }

  @Get('analyses/recent')
  @ApiOperation({ summary: 'List recent AI analyses' })
  @ApiResponse({ status: 200, description: 'Recent analyses retrieved' })
  async getRecentAnalyses(
    @CurrentTenant() tenantId: string,
    @Query('limit') limit?: string,
    @Query('agentId') agentId?: string
  ) {
    try {
      const take = Math.min(100, Math.max(1, parseInt(limit || '20', 10)))
      // If agent filter provided, filter by calls the agent participated in OR conversations assigned to the agent
      if (agentId) {
        const [agentCalls, agentConvsAdv] = await Promise.all([
          // Calls where agent is a participant
          (this.db as any).call.findMany({
            where: { tenantId, participants: { some: { userId: agentId } } },
            select: { id: true },
          }).catch(() => []),
          // Advanced conversations assigned to the agent (direct field or metadata)
          (this.db as any).conversationAdvanced?.findMany?.({
            where: {
              tenantId,
              OR: [
                { assignedAgentId: agentId },
                { metadata: { path: ['assignedAgentId'], equals: agentId } },
              ],
            },
            select: { id: true },
          }).catch(() => []),
        ])
        const callIds = Array.isArray(agentCalls) ? agentCalls.map((c: any) => c.id) : []
        const conversationIds = Array.isArray(agentConvsAdv) ? agentConvsAdv.map((c: any) => c.id) : []

        const items = await (this.db as any).aIAnalysisResult.findMany({
          where: {
            tenantId,
            OR: [
              callIds.length ? { callId: { in: callIds } } : undefined,
              conversationIds.length ? { conversationId: { in: conversationIds } } : undefined,
            ].filter(Boolean),
          },
          orderBy: { createdAt: 'desc' },
          take,
        }).catch(() => [])

        const mapped = Array.isArray(items)
          ? items.map((it: any) => ({
              id: it.id,
              tenantId: it.tenantId,
              conversationId: it.conversationId,
              customerId: it.customerId,
              content: it.content,
              results: it.results,
              processingTime: it.processingTime,
              confidence: it.confidence,
              createdAt: it.createdAt,
            }))
          : []
        return { success: true, data: mapped }
      }
      // No agent filter: fallback to service helper
        const items = await this.aiService.getRecentAnalyses(tenantId, take)
      return { success: true, data: items }
    } catch (error) {
      return { success: false, data: [] }
    }
  }

  @Post('analyze/conversation/:conversationId')
  @ApiOperation({ summary: 'Analyze entire conversation with AI' })
  @ApiResponse({ status: 200, description: 'Conversation analyzed successfully' })
  async analyzeConversation(
    @Param('conversationId') conversationId: string,
    @Body() body: { analysisTypes: string[] },
    @Request() req: any
  ): Promise<AIAnalysisResult> {
    // This would fetch the conversation and analyze all messages
    // For now, return a placeholder
    const request: AIAnalysisRequest = {
      content: 'Conversation analysis placeholder',
      context: {
        conversationId,
      },
      analysisTypes: body.analysisTypes as any[]
    };

    return await this.aiService.analyzeContent(request);
  }

  @Post('analyze/call/:callId')
  @ApiOperation({ summary: 'Analyze a call transcript with Sales Coaching AI' })
  @ApiResponse({ status: 200, description: 'Call analyzed successfully' })
  async analyzeCall(
    @Param('callId') callId: string,
    @Body() body: { transcript: string },
    @Request() req: any
  ): Promise<AIAnalysisResult> {
    const request: AIAnalysisRequest = {
      content: body.transcript,
      context: {
        callId,
      },
      analysisTypes: ['sales_coaching'] as any[]
    };

    return await this.aiService.analyzeContent(request);
  }

  @Get('coaching/latest')
  @ApiOperation({ summary: 'Get latest coaching analysis by callId or conversationId' })
  async getLatestCoaching(
    @Query('callId') callId: string | undefined,
    @Query('conversationId') conversationId: string | undefined,
    @CurrentTenant() tenantId: string
  ) {
    const data = await (this.aiService as any).getLatestCoachingAnalysis(tenantId, { callId, conversationId });
    return { success: true, data };
  }

  @Get('coaching/trends')
  @ApiOperation({ summary: 'Get coaching trends over time' })
  async getCoachingTrends(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant() tenantId?: string
  ) {
    const range = { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
    const data = await (this.aiService as any).getCoachingTrends(tenantId as string, range);
    return { success: true, data };
  }

  @Get('coaching/recommendations')
  @ApiOperation({ summary: 'Get aggregated coaching recommendations' })
  async getCoachingRecommendations(
    @Query('limit') limit?: string,
    @CurrentTenant() tenantId?: string
  ) {
    const lim = Math.min(50, Math.max(1, parseInt(limit || '10', 10)));
    const data = await (this.aiService as any).getCoachingRecommendations(tenantId as string, lim);
    return { success: true, data };
  }

  @Post('coaching/actions/log')
  @ApiOperation({ summary: 'Log execution of a coaching action' })
  async logCoachingAction(
    @Body() body: { agentUserId?: string; action: string; context?: any; conversationId?: string; callId?: string; coachingAnalysisId?: string },
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { sub?: string }
  ) {
    const data = await (this.aiService as any).logCoachingAction({
      tenantId,
      agentUserId: body.agentUserId || user?.sub,
      action: body.action,
      context: body.context,
      conversationId: body.conversationId,
      callId: body.callId,
      coachingAnalysisId: body.coachingAnalysisId,
    })
    return { success: true, data }
  }

  @Get('coaching/effectiveness')
  @ApiOperation({ summary: 'Get coaching effectiveness score for an agent' })
  async getCoachingEffectiveness(
    @Query('agentId') agentId: string,
    @Query('windowDays') windowDays = '30',
    @CurrentTenant() tenantId: string,
    @CurrentUser() user: { sub?: string }
  ) {
    const data = await (this.aiService as any).getCoachingEffectiveness(tenantId, agentId || (user?.sub as string), parseInt(windowDays || '30', 10))
    return { success: true, data }
  }

  @Post('suggestions/response')
  @ApiOperation({ summary: 'Get AI response suggestions' })
  @ApiResponse({ status: 200, description: 'Response suggestions generated' })
  async getResponseSuggestions(
    @Body() body: { content: string; context?: any; actions?: { improveTone?: boolean; tone?: string; fixGrammar?: boolean; format?: 'paragraph'|'bullets'|'email'|'whatsapp' } },
    @Request() req: any
  ) {
    const request: AIAnalysisRequest = {
      content: body.content,
      context: {
        ...body.context,
      },
      analysisTypes: ['response_generation', 'knowledge_suggestions']
    };

    const result = await this.aiService.analyzeContent(request);
    let rewritten: { text?: string } | undefined;
    let corrected: { text?: string } | undefined;
    if (body?.actions?.improveTone) {
      rewritten = await (this.aiService as any).rewriteText({ content: body.content, tone: body.actions.tone, format: body.actions.format });
    }
    if (body?.actions?.fixGrammar) {
      corrected = await (this.aiService as any).fixGrammar({ content: body.content });
    }
    
    return {
      responses: result.results.responseGeneration?.suggestedResponses || [],
      templates: result.results.responseGeneration?.templates || [],
      knowledgeArticles: result.results.knowledgeSuggestions?.articles || [],
      faqs: result.results.knowledgeSuggestions?.faqs || [],
      rewrite: rewritten?.text,
      grammarFix: corrected?.text
    };
  }

  @Post('summarize/thread')
  @ApiOperation({ summary: 'Summarize a conversation thread' })
  async summarizeThread(
    @Body() body: { messages: Array<{ content: string; senderType?: string }>; maxBullets?: number },
    @Request() req: any
  ) {
    const result = await (this.aiService as any).summarizeThread({ messages: body.messages || [], maxBullets: body.maxBullets });
    return { success: true, data: result };
  }

  @Post('kb/suggest')
  @ApiOperation({ summary: 'Suggest knowledge base content for a query' })
  async suggestKnowledge(
    @Body() body: { query: string },
    @CurrentTenant() tenantId: string
  ) {
    const data = await (this.aiService as any)['suggestKnowledge'](body.query, { tenantId });
    return { success: true, data };
  }

  @Post('predict/escalation')
  @ApiOperation({ summary: 'Predict if conversation needs escalation' })
  @ApiResponse({ status: 200, description: 'Escalation prediction completed' })
  async predictEscalation(
    @Body() body: { content: string; context?: any },
    @Request() req: any
  ) {
    const request: AIAnalysisRequest = {
      content: body.content,
      context: {
        ...body.context,
      },
      analysisTypes: ['escalation_prediction', 'urgency_detection', 'sentiment_analysis']
    };

    const result = await this.aiService.analyzeContent(request);
    
    return {
      escalation: result.results.escalationPrediction,
      urgency: result.results.urgencyDetection,
      sentiment: result.results.sentimentAnalysis
    };
  }

  @Post('autopilot/reply')
  @ApiOperation({ summary: 'Generate and optionally auto-send a reply based on tenant guardrails' })
  async autopilotReply(
    @Body() body: { conversationId: string; content: string; channelType?: string },
    @CurrentTenant() tenantId: string,
    @Request() req: any
  ) {
    const agentUserId = req?.user?.id || req?.user?.sub;
    const result = await this.orchestrator.autopilotReply({
      tenantId,
      conversationId: body.conversationId,
      content: body.content,
      channelType: body.channelType,
      agentUserId,
    });
    return { success: true, data: result };
  }

  @Post('feedback')
  @ApiOperation({ summary: 'Submit AI feedback (accept/reject, category, notes)' })
  async feedback(
    @Body() body: { analysisId?: string; conversationId?: string; accepted: boolean; category?: string; notes?: string },
    @CurrentTenant() tenantId: string
  ) {
    try {
      await (this.db as any).eventStore.create({
        data: {
          eventId: `ai_feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          eventType: 'ai.feedback',
          eventVersion: '1',
          aggregateId: body.conversationId || body.analysisId || tenantId,
          aggregateType: 'AI',
          aggregateVersion: 1,
          eventData: {
            analysisId: body.analysisId,
            conversationId: body.conversationId,
            accepted: body.accepted,
            category: body.category,
            notes: body.notes,
          },
          metadata: { tenantId },
          timestamp: new Date(),
        }
      });
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  }

  @Post('assess/churn-risk')
  @ApiOperation({ summary: 'Assess customer churn risk' })
  @ApiResponse({ status: 200, description: 'Churn risk assessment completed' })
  async assessChurnRisk(
    @Body() body: { content: string; customerId: string; context?: any },
    @Request() req: any
  ) {
    const request: AIAnalysisRequest = {
      content: body.content,
      context: {
        ...body.context,
        customerId: body.customerId,
      },
      analysisTypes: ['churn_risk_assessment', 'satisfaction_prediction', 'sentiment_analysis']
    };

    const result = await this.aiService.analyzeContent(request);
    
    return {
      churnRisk: result.results.churnRiskAssessment,
      satisfactionPrediction: result.results.satisfactionPrediction,
      sentiment: result.results.sentimentAnalysis
    };
  }

  @Post('triage')
  @ApiOperation({ summary: 'Perform comprehensive triage on ticket/message content' })
  @ApiResponse({ status: 200, description: 'Triage analysis completed' })
  async performTriage(
    @Body() body: {
      ticketId?: string;
      conversationId?: string;
      content?: string;
      subject?: string;
      channel?: string;
    },
    @Request() req: any,
    @CurrentTenant() tenantId?: string
  ) {
    try {
      let content = body.content;
      let subject = body.subject;
      let channel = body.channel;

      // If ticketId provided, fetch ticket content
      if (body.ticketId) {
        const ticket = await this.db.ticket.findUnique({
          where: { id: body.ticketId },
          select: {
            subject: true,
            description: true,
            channel: { select: { type: true } },
            customer: {
              select: {
                tickets: { select: { id: true } },
                createdAt: true,
              },
            },
          },
        });

        if (ticket) {
          content = `${ticket.subject || ''}\n${ticket.description || ''}`.trim();
          subject = ticket.subject || undefined;
          channel = (ticket.channel as any)?.type;
        }
      }

      // If conversationId provided, fetch recent messages
      if (body.conversationId && !content) {
        const messages = await (this.db as any).messageAdvanced?.findMany?.({
          where: { conversationId: body.conversationId },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { content: true, senderType: true },
        });

        if (messages && messages.length > 0) {
          const customerMessages = messages.filter((m: any) => m.senderType === 'customer');
          content = customerMessages.map((m: any) => m.content).join('\n');
        }
      }

      if (!content) {
        return { error: 'No content to analyze' };
      }

      // Perform triage
      const triageResult = await (this.aiService as any).performTriage({
        content,
        subject,
        channel,
      });

      return {
        success: true,
        triage: triageResult,
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  @Get('autopilot/config')
  @ApiOperation({ summary: 'Get autopilot configuration for current tenant' })
  @ApiResponse({ status: 200, description: 'Autopilot configuration retrieved' })
  async getAutopilotConfig(
    @CurrentTenant() tenantId?: string
  ) {
    try {
      if (!tenantId) {
        return { mode: 'off', minConfidence: 0.7, allowedChannels: [] };
      }

      const config = await (this.db as any).aISettings?.findUnique?.({
        where: { tenantId },
        select: {
          autopilotMode: true,
          minConfidence: true,
          allowedChannels: true,
        },
      });

      return {
        mode: config?.autopilotMode || 'off',
        minConfidence: config?.minConfidence || 0.7,
        allowedChannels: config?.allowedChannels || [],
      };
    } catch (error) {
      return { mode: 'off', minConfidence: 0.7, allowedChannels: [] };
    }
  }

  @Patch('autopilot/config')
  @ApiOperation({ summary: 'Update autopilot configuration' })
  @ApiResponse({ status: 200, description: 'Autopilot configuration updated' })
  async updateAutopilotConfig(
    @Body() body: {
      mode?: 'off' | 'draft' | 'auto';
      minConfidence?: number;
      allowedChannels?: string[];
    },
    @CurrentTenant() tenantId?: string
  ) {
    try {
      if (!tenantId) {
        return { success: false, error: 'Tenant ID required' };
      }

      const updateData: any = {};
      if (body.mode !== undefined) updateData.autopilotMode = body.mode;
      if (body.minConfidence !== undefined) updateData.minConfidence = body.minConfidence;
      if (body.allowedChannels !== undefined) updateData.allowedChannels = body.allowedChannels;

      await (this.db as any).aISettings?.upsert?.({
        where: { tenantId },
        create: {
          tenantId,
          autopilotMode: body.mode || 'off',
          minConfidence: body.minConfidence || 0.7,
          allowedChannels: body.allowedChannels || [],
        },
        update: updateData,
      });

      return {
        success: true,
        config: {
          mode: body.mode,
          minConfidence: body.minConfidence,
          allowedChannels: body.allowedChannels,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: String(error),
      };
    }
  }

  // --- GLAVAI Endpoints ---

  @Post('glavai/auto-resolve/:conversationId')
  @ApiOperation({ summary: 'Manually trigger auto-resolve for a conversation (testing)' })
  @ApiResponse({ status: 200, description: 'Auto-resolve attempt completed' })
  async triggerAutoResolve(
    @Param('conversationId') conversationId: string,
    @Body() body: { ticketId?: string; content: string; channelType?: string; customerId?: string },
    @CurrentTenant() tenantId: string,
  ) {
    const result = await this.autoResolveService.attemptAutoResolve({
      tenantId,
      conversationId,
      ticketId: body.ticketId,
      content: body.content,
      channelType: body.channelType,
      customerId: body.customerId,
    });
    return { success: true, data: result };
  }

  @Get('glavai/insights')
  @ApiOperation({ summary: 'Get comprehensive AI insights for dashboard' })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  async getInsights(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant() tenantId: string,
  ) {
    const timeRange = from && to
      ? { from: new Date(from), to: new Date(to) }
      : undefined;
    const insights = await this.insightsService.getComprehensiveInsights(tenantId, timeRange);
    return { success: true, data: insights };
  }

  @Get('glavai/insights/widget')
  @ApiOperation({ summary: 'Get lightweight widget data for dashboard' })
  @ApiResponse({ status: 200, description: 'Widget data retrieved successfully' })
  async getInsightsWidget(@CurrentTenant() tenantId: string) {
    const widgetData = await this.insightsService.getWidgetData(tenantId);
    return { success: true, data: widgetData };
  }

  @Get('glavai/config')
  @ApiOperation({ summary: 'Get GLAVAI configuration for current tenant' })
  @ApiResponse({ status: 200, description: 'Configuration retrieved' })
  async getGlavaiConfig(@CurrentTenant() tenantId: string) {
    const config = await this.db.aISettings.findUnique({
      where: { tenantId },
      select: {
        autoResolveEnabled: true,
        autoResolveConfidenceThreshold: true,
        autoResolveChannels: true,
        autoResolveSendResponse: true,
        glavaiTheme: true,
      },
    });
    return {
      success: true,
      data: {
        autoResolveEnabled: config?.autoResolveEnabled ?? false,
        autoResolveConfidenceThreshold: config?.autoResolveConfidenceThreshold ?? 0.85,
        autoResolveChannels: Array.isArray(config?.autoResolveChannels)
          ? config.autoResolveChannels
          : [],
        autoResolveSendResponse: config?.autoResolveSendResponse ?? true,
        glavaiTheme: config?.glavaiTheme || {},
      },
    };
  }

  @Post('glavai/config')
  @ApiOperation({ summary: 'Update GLAVAI configuration' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateGlavaiConfig(
    @Body()
    body: {
      autoResolveEnabled?: boolean;
      autoResolveConfidenceThreshold?: number;
      autoResolveChannels?: string[];
      autoResolveSendResponse?: boolean;
      glavaiTheme?: Record<string, unknown>;
    },
    @CurrentTenant() tenantId: string,
  ) {
    const updateData: any = {};
    if (body.autoResolveEnabled !== undefined)
      updateData.autoResolveEnabled = body.autoResolveEnabled;
    if (body.autoResolveConfidenceThreshold !== undefined)
      updateData.autoResolveConfidenceThreshold = body.autoResolveConfidenceThreshold;
    if (body.autoResolveChannels !== undefined)
      updateData.autoResolveChannels = body.autoResolveChannels;
    if (body.autoResolveSendResponse !== undefined)
      updateData.autoResolveSendResponse = body.autoResolveSendResponse;
    if (body.glavaiTheme !== undefined) updateData.glavaiTheme = body.glavaiTheme;

    await this.db.aISettings.upsert({
      where: { tenantId },
      create: {
        tenantId,
        ...updateData,
      },
      update: updateData,
    });

    return { success: true, message: 'GLAVAI configuration updated' };
  }

  @Get('glavai/auto-resolve/stats')
  @ApiOperation({ summary: 'Get auto-resolve statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved' })
  async getAutoResolveStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @CurrentTenant() tenantId: string,
  ) {
    const timeRange = from && to
      ? { from: new Date(from), to: new Date(to) }
      : undefined;
    const stats = await this.autoResolveService.getAutoResolveStats(tenantId, timeRange);
    return { success: true, data: stats };
  }

  @Post('glavai/copilot/suggestions')
  @ApiOperation({ summary: 'Get AI Copilot suggestions for a conversation' })
  @ApiResponse({ status: 200, description: 'Suggestions retrieved' })
  async getCopilotSuggestions(
    @Body()
    body: {
      conversationId: string;
      context?: {
        recentMessages?: string[];
        customerInfo?: Record<string, unknown>;
      };
    },
    @CurrentTenant() tenantId: string,
  ) {
    try {
      // Get conversation messages for context
      const messages = await this.db.message.findMany({
        where: { conversationId: body.conversationId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { content: true, senderType: true },
      });

      const recentMessages = messages
        .reverse()
        .map((m) => `${m.senderType}: ${m.content}`)
        .slice(0, -1); // Exclude last message if it's the current one

      const lastCustomerMessage = messages
        .filter((m) => m.senderType === 'customer')
        .pop()?.content || '';

      // Get knowledge suggestions
      const knowledgeResult = await this.aiService.analyzeContent({
        content: lastCustomerMessage,
        context: {
          tenantId,
          conversationId: body.conversationId,
          previousMessages: recentMessages,
        },
        analysisTypes: ['knowledge_suggestions', 'response_generation'] as any,
      });

      // Get conversation summary if multiple messages
      let summary: string | undefined;
      if (messages.length > 3) {
        try {
          const summaryResult = await (this.aiService as any).summarizeThread?.({
            messages: messages.slice(-20).map((m) => ({
              content: m.content,
              senderType: m.senderType,
            })),
            maxBullets: 5,
          });
          summary = summaryResult?.short;
        } catch {
          // Ignore summary errors
        }
      }

      // Map response suggestions to match frontend expectations
      const responseSuggestions = (knowledgeResult.results.responseGeneration?.suggestedResponses || []).map((r: any) => ({
        text: r.response || r.text || '',
        tone: r.tone || 'professional',
        confidence: r.confidence || 0.8,
        response: r.response || r.text || '',
      }));

      // Map templates to match frontend expectations
      const templates = (knowledgeResult.results.responseGeneration?.templates || []).map((t: any) => ({
        id: t.templateId || t.id || `template_${Date.now()}`,
        name: t.title || t.name || 'Template',
        content: t.content || '',
        templateId: t.templateId || t.id,
        title: t.title || t.name,
        relevanceScore: t.relevanceScore || 0.8,
      }));

      return {
        success: true,
        data: {
          knowledgeArticles:
            knowledgeResult.results.knowledgeSuggestions?.articles || [],
          faqs: knowledgeResult.results.knowledgeSuggestions?.faqs || [],
          responseSuggestions,
          templates,
          summary,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: String((error as Error)?.message || error),
      };
    }
  }

  @Post('glavai/copilot/summarize')
  @ApiOperation({ summary: 'Summarize a conversation thread' })
  @ApiResponse({ status: 200, description: 'Summary generated' })
  async summarizeConversation(
    @Body() body: { conversationId: string },
    @CurrentTenant() tenantId: string,
  ) {
    try {
      const messages = await this.db.message.findMany({
        where: { conversationId: body.conversationId },
        orderBy: { createdAt: 'asc' },
        take: 50,
        select: { content: true, senderType: true },
      });

      const summaryResult = await (this.aiService as any).summarizeThread?.({
        messages: messages.map((m) => ({
          content: m.content,
          senderType: m.senderType,
        })),
        maxBullets: 8,
      });

      return {
        success: true,
        data: {
          short: summaryResult?.short || '',
          bullets: summaryResult?.bullets || [],
        },
      };
    } catch (error) {
      return {
        success: false,
        error: String((error as Error)?.message || error),
      };
    }
  }

  @Get('glavai/insights/alerts')
  @ApiOperation({ summary: 'Get active AI insight alerts' })
  @ApiResponse({ status: 200, description: 'Alerts retrieved' })
  async getActiveAlerts(
    @Query('limit') limit?: string,
    @CurrentTenant() tenantId: string,
  ) {
    const alertLimit = limit ? parseInt(limit, 10) : 50;
    const alerts = await this.insightsService.getActiveAlerts(tenantId, alertLimit);
    return { success: true, data: alerts };
  }
}