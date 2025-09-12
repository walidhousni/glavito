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
import { AIIntelligenceService, AIAnalysisRequest, AIAnalysisResult } from '@glavito/shared-ai';
import { DatabaseService } from '@glavito/shared-database';

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
  constructor(private readonly aiService: AIIntelligenceService, private readonly db: DatabaseService) {}

  @Post('analyze')
  @ApiOperation({ summary: 'Analyze content with AI' })
  @ApiResponse({ status: 200, description: 'Content analyzed successfully' })
  async analyzeContent(
    @Body() dto: AnalyzeContentDto,
    @Request() req: any
  ): Promise<AIAnalysisResult> {
    const request: AIAnalysisRequest = {
      content: dto.content,
      context: {
        ...dto.context,
      },
      analysisTypes: dto.analysisTypes as any[]
    };

    return await this.aiService.analyzeContent(request);
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
    @Request() req: any
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
      const insights = await this.aiService.getAIInsights(req.user.tenantId, timeRange);
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
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('agentId') agentId?: string
  ) {
    try {
      const take = Math.min(100, Math.max(1, parseInt(limit || '20', 10)))
      // If agent filter provided, filter by calls the agent participated in OR conversations assigned to the agent
      if (agentId) {
        const tenantId = req.user.tenantId
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
      const items = await this.aiService.getRecentAnalyses(req.user.tenantId, take)
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
    @Request() req: any
  ) {
    const data = await (this.aiService as any).getLatestCoachingAnalysis(req.user.tenantId, { callId, conversationId });
    return { success: true, data };
  }

  @Get('coaching/trends')
  @ApiOperation({ summary: 'Get coaching trends over time' })
  async getCoachingTrends(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Request() req?: any
  ) {
    const range = { from: from ? new Date(from) : undefined, to: to ? new Date(to) : undefined };
    const data = await (this.aiService as any).getCoachingTrends(req.user.tenantId, range);
    return { success: true, data };
  }

  @Get('coaching/recommendations')
  @ApiOperation({ summary: 'Get aggregated coaching recommendations' })
  async getCoachingRecommendations(
    @Query('limit') limit?: string,
    @Request() req?: any
  ) {
    const lim = Math.min(50, Math.max(1, parseInt(limit || '10', 10)));
    const data = await (this.aiService as any).getCoachingRecommendations(req.user.tenantId, lim);
    return { success: true, data };
  }

  @Post('coaching/actions/log')
  @ApiOperation({ summary: 'Log execution of a coaching action' })
  async logCoachingAction(
    @Body() body: { agentUserId?: string; action: string; context?: any; conversationId?: string; callId?: string; coachingAnalysisId?: string },
    @Request() req: any
  ) {
    const data = await (this.aiService as any).logCoachingAction({
      tenantId: req.user.tenantId,
      agentUserId: body.agentUserId || req.user.sub,
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
    @Request() req: any
  ) {
    const data = await (this.aiService as any).getCoachingEffectiveness(req.user.tenantId, agentId || req.user.sub, parseInt(windowDays || '30', 10))
    return { success: true, data }
  }

  @Post('suggestions/response')
  @ApiOperation({ summary: 'Get AI response suggestions' })
  @ApiResponse({ status: 200, description: 'Response suggestions generated' })
  async getResponseSuggestions(
    @Body() body: { content: string; context?: any },
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
    
    return {
      responses: result.results.responseGeneration?.suggestedResponses || [],
      templates: result.results.responseGeneration?.templates || [],
      knowledgeArticles: result.results.knowledgeSuggestions?.articles || [],
      faqs: result.results.knowledgeSuggestions?.faqs || []
    };
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
}