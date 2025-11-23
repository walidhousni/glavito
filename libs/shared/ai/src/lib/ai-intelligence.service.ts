import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '@glavito/shared-database';
import { AdvancedEventBusService } from '@glavito/shared-kafka';
import OpenAI from 'openai';
import { buildPrompt } from './prompt-templates';
import Anthropic from '@anthropic-ai/sdk';
import axios, { AxiosInstance } from 'axios';

export interface AIAnalysisRequest {
  content: string;
  context?: {
    conversationId?: string;
    customerId?: string;
    tenantId?: string;
    callId?: string;
    channelType?: string;
    previousMessages?: string[];
    customerHistory?: any;
  };
  analysisTypes: AIAnalysisType[];
}

export type AIAnalysisType = 
  | 'intent_classification'
  | 'sentiment_analysis' 
  | 'urgency_detection'
  | 'language_detection'
  | 'entity_extraction'
  | 'response_generation'
  | 'knowledge_suggestions'
  | 'escalation_prediction'
  | 'satisfaction_prediction'
  | 'churn_risk_assessment'
  | 'sales_coaching';

export interface AIAnalysisResult {
  analysisId: string;
  content: string;
  results: {
    intentClassification?: IntentClassificationResult;
    sentimentAnalysis?: SentimentAnalysisResult;
    urgencyDetection?: UrgencyDetectionResult;
    languageDetection?: LanguageDetectionResult;
    entityExtraction?: EntityExtractionResult;
    responseGeneration?: ResponseGenerationResult;
    knowledgeSuggestions?: KnowledgeSuggestionsResult;
    escalationPrediction?: EscalationPredictionResult;
    satisfactionPrediction?: SatisfactionPredictionResult;
    churnRiskAssessment?: ChurnRiskAssessmentResult;
    salesCoaching?: CoachingAnalysisResult;
  };
  processingTime: number;
  confidence: number;
  timestamp: Date;
}

export interface CoachingAnalysisResult {
  summary: string;
  metrics: {
    wordCount: number;
    estimatedQuestions: number;
    fillerWordRate: number; // 0..1
    clarityScore: number; // 0..1
    sentimentBalance: number; // 0..1
    callStructure: {
      intro: boolean;
      discovery: boolean;
      valueProposition: boolean;
      nextSteps: boolean;
    };
  };
  strengths: string[];
  improvements: string[];
  recommendedActions: string[];
}

export interface IntentClassificationResult {
  primaryIntent: string;
  confidence: number;
  secondaryIntents: Array<{ intent: string; confidence: number }>;
  category: string;
  subcategory?: string;
}

export interface SentimentAnalysisResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1 to 1
  confidence: number;
  emotions: Array<{ emotion: string; intensity: number }>;
  trend?: 'improving' | 'stable' | 'declining';
}

export interface UrgencyDetectionResult {
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  urgencyScore: number; // 0 to 1
  indicators: string[];
  reasoning: string;
}

export interface LanguageDetectionResult {
  language: string;
  confidence: number;
  translationRequired: boolean;
  suggestedTranslation?: string;
}

export interface EntityExtractionResult {
  entities: Array<{
    type: string;
    value: string;
    confidence: number;
    startIndex: number;
    endIndex: number;
  }>;
  keyPhrases: string[];
  topics: string[];
}

export interface ResponseGenerationResult {
  suggestedResponses: Array<{
    response: string;
    tone: 'professional' | 'friendly' | 'empathetic' | 'technical';
    confidence: number;
    reasoning: string;
  }>;
  templates: Array<{
    templateId: string;
    title: string;
    content: string;
    relevanceScore: number;
  }>;
}

export interface KnowledgeSuggestionsResult {
  articles: Array<{
    id: string;
    title: string;
    snippet: string;
    relevanceScore: number;
    url?: string;
  }>;
  faqs: Array<{
    id: string;
    question: string;
    answer: string;
    relevanceScore: number;
  }>;
}

export interface EscalationPredictionResult {
  shouldEscalate: boolean;
  escalationProbability: number;
  reasoning: string;
  suggestedActions: string[];
  recommendedAgent?: {
    agentId: string;
    name: string;
    expertise: string[];
    availabilityScore: number;
  };
}

export interface SatisfactionPredictionResult {
  predictedSatisfaction: number; // 1 to 5
  confidence: number;
  factors: Array<{
    factor: string;
    impact: number;
    description: string;
  }>;
}

export interface ChurnRiskAssessmentResult {
  churnRisk: 'low' | 'medium' | 'high' | 'critical';
  churnProbability: number; // 0 to 1
  riskFactors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
  interventionSuggestions: string[];
}

@Injectable()
export class AIIntelligenceService {
  private readonly logger = new Logger(AIIntelligenceService.name);
  private openai!: OpenAI;
  private anthropic!: Anthropic;
  private dashscopeClient!: AxiosInstance;
  private readonly aiProvider: 'openai' | 'anthropic' | 'dashscope' | 'both';
  private readonly dashscopeModel: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly eventBus: AdvancedEventBusService
  ) {
    this.aiProvider = this.configService.get<'openai' | 'anthropic' | 'dashscope' | 'both'>('AI_PROVIDER', 'dashscope');
    this.dashscopeModel = this.configService.get<string>('DASHSCOPE_MODEL', 'qwen-turbo');
    
    // Initialize OpenAI
    const openaiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (openaiKey) {
      this.openai = new OpenAI({
        apiKey: openaiKey,
      });
    }

    // Initialize Anthropic
    const anthropicKey = this.configService.get<string>('ANTHROPIC_API_KEY');
    if (anthropicKey) {
      this.anthropic = new Anthropic({
        apiKey: anthropicKey,
      });
    }

    // Initialize DashScope (Alibaba Cloud)
    const dashscopeKey = this.configService.get<string>('DASHSCOPE_API_KEY');
    if (dashscopeKey) {
      this.dashscopeClient = axios.create({
        baseURL: 'https://dashscope.aliyuncs.com/api/v1',
        headers: {
          'Authorization': `Bearer ${dashscopeKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      });
      this.logger.log(`DashScope client initialized with model: ${this.dashscopeModel}`);
    }

    this.logger.log(`AI Intelligence Service initialized with provider: ${this.aiProvider}`);
  }

  // Lightweight heuristic lead scoring; can be replaced by model later
  async computeLeadScore(lead: {
    email?: string;
    company?: string;
    phone?: string;
    source?: string;
    tags?: string[];
    lastActivityAt?: Date | null;
    createdAt?: Date | null;
  }, context?: { interactionsLast30d?: number; ticketsCount?: number }): Promise<{
    score: number;
    factors: Array<{ name: string; weight: number; value: any; contribution: number }>;
    reasoning: string;
  }> {
    const factors: Array<{ name: string; weight: number; value: any; contribution: number }> = [];

    // Base score
    let score = 50;

    // Company present
    if (lead.company && lead.company.trim().length > 0) {
      const c = 10; factors.push({ name: 'company_present', weight: c, value: true, contribution: c }); score += c;
    } else {
      const c = -5; factors.push({ name: 'company_missing', weight: c, value: false, contribution: c }); score += c;
    }

    // Phone present
    if (lead.phone && lead.phone.trim().length >= 8) {
      const c = 10; factors.push({ name: 'phone_present', weight: c, value: true, contribution: c }); score += c;
    }

    // Email quality
    if (lead.email) {
      const email = lead.email.toLowerCase();
      const personalDomains = ['gmail.com','yahoo.com','hotmail.com','outlook.com'];
      const domain = email.includes('@') ? email.split('@')[1] : '';
      if (domain && !personalDomains.includes(domain)) {
        const c = 10; factors.push({ name: 'business_email_domain', weight: c, value: domain, contribution: c }); score += c;
      } else {
        const c = -5; factors.push({ name: 'personal_email_domain', weight: c, value: domain || null, contribution: c }); score += c;
      }
    } else {
      const c = -10; factors.push({ name: 'email_missing', weight: c, value: null, contribution: c }); score += c;
    }

    // Source weighting
    const source = (lead.source || '').toLowerCase();
    const sourceWeights: Record<string, number> = {
      website: 10,
      referral: 15,
      campaign: 8,
      webinar: 6,
      event: 6,
    };
    if (source) {
      const w = sourceWeights[source] ?? 3;
      factors.push({ name: 'source', weight: w, value: source, contribution: w }); score += w;
    } else {
      const c = -3; factors.push({ name: 'source_missing', weight: c, value: null, contribution: c }); score += c;
    }

    // Tag enrichment
    if (Array.isArray(lead.tags) && lead.tags.length > 0) {
      const c = Math.min(lead.tags.length * 2, 8);
      factors.push({ name: 'tags', weight: c, value: lead.tags, contribution: c }); score += c;
    }

    // Activity recency
    const now = Date.now();
    const last = lead.lastActivityAt ? new Date(lead.lastActivityAt).getTime() : (lead.createdAt ? new Date(lead.createdAt).getTime() : now);
    const days = Math.max(0, Math.floor((now - last) / (1000 * 60 * 60 * 24)));
    const recency = days <= 3 ? 12 : days <= 7 ? 8 : days <= 14 ? 4 : days <= 30 ? 1 : -5;
    factors.push({ name: 'recency_days', weight: recency, value: days, contribution: recency }); score += recency;

    // Interactions
    const interactions = Math.max(0, context?.interactionsLast30d ?? 0);
    const interactionsContribution = Math.min(12, interactions * 2);
    if (interactionsContribution) {
      factors.push({ name: 'interactions_30d', weight: interactionsContribution, value: interactions, contribution: interactionsContribution });
      score += interactionsContribution;
    }

    // Clamp score
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    const reasoning = 'Heuristic lead score based on company/email quality, contactability, source, recent activity, and interactions.';

    return { score: finalScore, factors, reasoning };
  }

  // Customer health scoring heuristic (0-100) with churn risk
  async computeCustomerHealth(params: { tenantId: string; customerId: string }): Promise<{
    healthScore: number;
    churnRisk: 'low' | 'medium' | 'high' | 'critical';
    factors: Array<{ name: string; weight: number; value: any; contribution: number }>;
    reasoning: string;
  }> {
    const { tenantId, customerId } = params;
    const factors: Array<{ name: string; weight: number; value: any; contribution: number }> = [];
    let score = 60; // base

    // Fetch metrics (best-effort)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [conv30, openTickets, resolvedTickets, cssAvg] = await Promise.all([
      this.prisma['conversation'].count({ where: { tenantId, customerId, updatedAt: { gte: since30d } } }).catch(() => 0),
      this.prisma['ticket'].count({ where: { tenantId, customerId, status: { in: ['open','pending','in_progress','waiting'] } } }).catch(() => 0),
      this.prisma['ticket'].count({ where: { tenantId, customerId, status: { in: ['resolved','closed'] } } }).catch(() => 0),
      (this.prisma as any)['customerSatisfactionSurvey']?.aggregate?.({ where: { customerId }, _avg: { rating: true } }).then((r: any) => r?._avg?.rating || null).catch(() => null),
    ]);

    // Interactions last 30d
    const convContribution = Math.min(15, conv30 * 3);
    score += convContribution; factors.push({ name: 'interactions_30d', weight: convContribution, value: conv30, contribution: convContribution });

    // Ticket load
    const openPenalty = Math.min(20, openTickets * 5);
    score -= openPenalty; factors.push({ name: 'open_tickets', weight: -openPenalty, value: openTickets, contribution: -openPenalty });
    const resolvedBoost = Math.min(10, Math.floor(resolvedTickets / 2));
    score += resolvedBoost; factors.push({ name: 'resolved_tickets', weight: resolvedBoost, value: resolvedTickets, contribution: resolvedBoost });

    // CSAT average (1-5)
    if (typeof cssAvg === 'number') {
      const csatScaled = Math.max(0, Math.min(100, Math.round(((cssAvg - 1) / 4) * 100)));
      const csatContribution = Math.round((csatScaled - 50) / 5); // -10..+10
      score += csatContribution; factors.push({ name: 'csat_avg', weight: csatContribution, value: cssAvg, contribution: csatContribution });
    }

    // Clamp
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));
    const churnRisk: 'low' | 'medium' | 'high' | 'critical' = finalScore >= 75 ? 'low' : finalScore >= 55 ? 'medium' : finalScore >= 35 ? 'high' : 'critical';
    const reasoning = 'Heuristic health score based on recent interactions, open vs resolved tickets, and satisfaction.';
    return { healthScore: finalScore, churnRisk, factors, reasoning };
  }

  /** Returns true if OpenAI client is available */
  hasOpenAI(): boolean {
    return !!this.openai;
  }

  /** Compute text embedding (OpenAI). Returns empty array if provider not configured. */
  async computeEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.openai) return [];
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      });
      const vector = response.data?.[0]?.embedding as number[] | undefined;
      return Array.isArray(vector) ? vector : [];
    } catch (error) {
      this.logger.error('computeEmbedding failed:', error);
      return [];
    }
  }

  /**
   * Comprehensive triage analysis for tickets/messages using DashScope LLM.
   * Returns structured predictions: intent, category, priority, urgency, entities, language.
   */
  async performTriage(params: {
    content: string;
    subject?: string;
    channel?: string;
    customerHistory?: { ticketCount?: number; lastInteractionDays?: number };
  }): Promise<{
    intent: string;
    category: string;
    subcategory?: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    entities: Array<{ type: string; value: string; confidence: number }>;
    language: string;
    confidence: number;
    reasoning: string;
  }> {
    const startTime = Date.now();
    try {
      // Redact PII before sending to LLM
      const { redacted, mappings } = this.redactPII(params.content);
      const subjectText = params.subject ? `Subject: ${params.subject}\n` : '';
      const channelText = params.channel ? `Channel: ${params.channel}\n` : '';
      const historyText = params.customerHistory
        ? `Customer History: ${params.customerHistory.ticketCount || 0} tickets, last interaction ${params.customerHistory.lastInteractionDays || 'unknown'} days ago\n`
        : '';

      const prompt = `${subjectText}${channelText}${historyText}
Content: ${redacted}

Analyze this customer message and provide a structured JSON response with the following fields:
{
  "intent": "primary intent (e.g., billing_question, technical_issue, refund_request, complaint, praise, feature_request)",
  "category": "main category (e.g., billing, technical, shipping, product_info, account_management)",
  "subcategory": "optional subcategory for more granularity",
  "priority": "one of: low, medium, high, urgent",
  "urgencyLevel": "one of: low, medium, high, critical",
  "entities": [{"type": "order_id|email|phone|product|date", "value": "extracted value", "confidence": 0.0-1.0}],
  "language": "ISO 639-1 language code (e.g., en, fr, ar, zh)",
  "confidence": 0.0-1.0,
  "reasoning": "brief explanation of the classification"
}

Respond ONLY with valid JSON, no markdown or additional text.`;

      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);

      // Restore PII in entities if present
      if (parsed.entities && Array.isArray(parsed.entities)) {
        parsed.entities = parsed.entities.map((e: any) => ({
          ...e,
          value: this.restorePII(e.value, mappings),
        }));
      }

      const processingTime = Date.now() - startTime;
      this.logger.log(`Triage completed in ${processingTime}ms with confidence ${parsed.confidence}`);

      return {
        intent: parsed.intent || 'unknown',
        category: parsed.category || 'general',
        subcategory: parsed.subcategory,
        priority: parsed.priority || 'medium',
        urgencyLevel: parsed.urgencyLevel || 'medium',
        entities: parsed.entities || [],
        language: parsed.language || 'en',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reasoning: parsed.reasoning || 'Automated triage analysis',
      };
    } catch (error) {
      this.logger.error('Triage analysis failed:', error);
      // Fallback to heuristic
      return {
        intent: 'unknown',
        category: 'general',
        priority: this.detectUrgencyHeuristic(params.content),
        urgencyLevel: 'medium',
        entities: [],
        language: 'en',
        confidence: 0.3,
        reasoning: 'Fallback heuristic due to AI provider error',
      };
    }
  }

  /** Simple PII redaction: replace emails, phones, order IDs with placeholders */
  private redactPII(text: string): { redacted: string; mappings: Map<string, string> } {
    const mappings = new Map<string, string>();
    let redacted = text;
    let counter = 0;

    // Email
    redacted = redacted.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, (match) => {
      const placeholder = `EMAIL_${++counter}`;
      mappings.set(placeholder, match);
      return placeholder;
    });

    // Phone (simple patterns)
    redacted = redacted.replace(/\b(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, (match) => {
      const placeholder = `PHONE_${++counter}`;
      mappings.set(placeholder, match);
      return placeholder;
    });

    // Order IDs (pattern: #ORD123456 or ORD-123456)
    redacted = redacted.replace(/\b(#?ORD-?[A-Z0-9]{6,})\b/gi, (match) => {
      const placeholder = `ORDER_${++counter}`;
      mappings.set(placeholder, match);
      return placeholder;
    });

    return { redacted, mappings };
  }

  /** Restore PII placeholders with original values */
  private restorePII(text: string, mappings: Map<string, string>): string {
    let restored = text;
    mappings.forEach((original, placeholder) => {
      restored = restored.replace(new RegExp(placeholder, 'g'), original);
    });
    return restored;
  }

  /** Heuristic priority detection based on keywords */
  private detectUrgencyHeuristic(content: string): 'low' | 'medium' | 'high' | 'urgent' {
    const lower = content.toLowerCase();
    const urgentKeywords = ['urgent', 'asap', 'emergency', 'immediately', 'critical', 'down', 'broken', 'not working'];
    const highKeywords = ['soon', 'important', 'issue', 'problem', 'error', 'failed', 'cannot', 'can\'t'];

    if (urgentKeywords.some((kw) => lower.includes(kw))) return 'urgent';
    if (highKeywords.some((kw) => lower.includes(kw))) return 'high';
    return 'medium';
  }

  async analyzeContent(request: AIAnalysisRequest): Promise<AIAnalysisResult> {
    const startTime = Date.now();
    const analysisId = this.generateAnalysisId();

    try {
      this.logger.debug(`Starting AI analysis: ${analysisId}`);

      const results: AIAnalysisResult['results'] = {};

      // Run analyses in parallel for better performance
      const analysisPromises = request.analysisTypes.map(async (type) => {
        try {
          switch (type) {
            case 'intent_classification':
              results.intentClassification = await this.classifyIntent(request.content, request.context);
              break;
            case 'sentiment_analysis':
              results.sentimentAnalysis = await this.analyzeSentiment(request.content, request.context);
              break;
            case 'urgency_detection':
              results.urgencyDetection = await this.detectUrgency(request.content, request.context);
              break;
            case 'language_detection':
              results.languageDetection = await this.detectLanguage(request.content);
              break;
            case 'entity_extraction':
              results.entityExtraction = await this.extractEntities(request.content);
              break;
            case 'response_generation':
              results.responseGeneration = await this.generateResponses(request.content, request.context);
              break;
            case 'knowledge_suggestions':
              results.knowledgeSuggestions = await this.suggestKnowledge(request.content, request.context);
              break;
            case 'escalation_prediction':
              results.escalationPrediction = await this.predictEscalation(request.content, request.context);
              break;
            case 'satisfaction_prediction':
              results.satisfactionPrediction = await this.predictSatisfaction(request.content, request.context);
              break;
            case 'churn_risk_assessment':
              results.churnRiskAssessment = await this.assessChurnRisk(request.content, request.context);
              break;
            case 'sales_coaching':
              results.salesCoaching = await this.analyzeSalesCoaching(request.content, request.context);
              break;
          }
        } catch (error) {
          this.logger.error(`Failed to run ${type} analysis:`, error);
        }
      });

      await Promise.all(analysisPromises);

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(results);

      const analysisResult: AIAnalysisResult = {
        analysisId,
        content: request.content,
        results,
        processingTime,
        confidence,
        timestamp: new Date()
      };

      // Store analysis result
      await this.storeAnalysisResult(analysisResult, request.context);

      // Publish analysis completed event
      await this.publishAnalysisEvent(analysisResult, request.context);

      this.logger.debug(`AI analysis completed: ${analysisId} in ${processingTime}ms`);

      return analysisResult;

    } catch (error) {
      this.logger.error(`AI analysis failed: ${analysisId}`, error);
      throw error;
    }
  }

  /** Generate an autopilot reply with optional actions/templates for channels */
  public async generateAutoReply(params: { content: string; previousMessages?: string[]; context?: { tenantId?: string; conversationId?: string; channelType?: string } }): Promise<{ intent?: string; answer: string; confidence: number; messageType?: 'text' | 'template'; templateId?: string; templateParams?: Record<string, string>; actions?: Array<{ type: string; payload?: Record<string, unknown>; summary?: string }>; language?: string }> {
    const start = Date.now();
    try {
      const analysis = await this.analyzeContent({
        content: params.content,
        context: {
          ...params.context,
          previousMessages: params.previousMessages || [],
        },
        analysisTypes: ['intent_classification','response_generation','language_detection'] as any,
      });
      const intent = analysis.results.intentClassification?.primaryIntent || 'general';
      const lang = analysis.results.languageDetection?.language || 'en';
      const suggestions = analysis.results.responseGeneration?.suggestedResponses || [];
      const best = suggestions[0]?.response || params.content; // fall back to echo
      const confidence = Number(analysis.confidence || 0.7);
      // Minimal template hinting: prefer template for WhatsApp if available in suggestions.templates
      const templates = analysis.results.responseGeneration?.templates || [];
      const template = templates[0];
      const messageType = template ? 'template' : 'text';
      const templateId = template?.templateId;
      const templateParams = template ? { ...this.pickTemplateParams(template.content, params.content) } : undefined;
      // Very light action extraction heuristic (replace with LLM tool-calls later)
      const actions: Array<{ type: string; payload?: Record<string, unknown>; summary?: string }> = [];
      const lower = params.content.toLowerCase();
      if (/track.*order/.test(lower)) {
        const m = params.content.match(/(\d{6,})/);
        actions.push({ type: 'order.track', payload: { trackingNumber: m?.[1] } });
      }
      if (/place.*order/.test(lower)) {
        const skuMatch = params.content.match(/sku[:\s]?([a-z0-9\-]+)/i);
        const qtyMatch = params.content.match(/(\d+)\s*(pcs|pieces|units)?/i);
        actions.push({ type: 'order.place', payload: { sku: skuMatch?.[1], quantity: Number(qtyMatch?.[1] || 1) } });
      }
      return {
        intent,
        answer: best,
        confidence,
        messageType,
        templateId,
        templateParams,
        actions,
        language: lang,
      };
    } catch (error) {
      this.logger.error('generateAutoReply failed:', error);
      return { intent: 'general', answer: params.content, confidence: 0.5, messageType: 'text' };
    } finally {
      void start;
    }
  }

  private pickTemplateParams(templateContent: string, userText: string): Record<string, string> {
    try {
      const matches = Array.from(String(templateContent || '').matchAll(/\{\{(\d+)\}\}/g));
      if (!matches.length) return {};
      const values = (userText || '').split(/[,.;\n]/).map(s => s.trim()).filter(Boolean);
      const params: Record<string, string> = {};
      for (let i = 0; i < matches.length; i++) params[matches[i][1]] = values[i] || '';
      return params;
    } catch { return {}; }
  }

  private async classifyIntent(content: string, context?: any): Promise<IntentClassificationResult> {
    try {
      const prompt = buildPrompt('intentClassification', {
        content,
        previousMessages: context?.previousMessages,
        locale: context?.locale,
      });

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Intent classification failed:', error);
      return {
        primaryIntent: 'unknown',
        confidence: 0.1,
        secondaryIntents: [],
        category: 'general'
      };
    }
  }

  private async analyzeSentiment(content: string, context?: any): Promise<SentimentAnalysisResult> {
    try {
      const prompt = `
        Analyze the sentiment and emotions in this customer message:
        
        Message: "${content}"
        ${context?.customerHistory ? `Customer history: ${JSON.stringify(context.customerHistory)}` : ''}
        
        Provide detailed sentiment analysis including emotions and trend if historical data is available.
        
        Respond in JSON format:
        {
          "sentiment": "positive|negative|neutral",
          "score": 0.7,
          "confidence": 0.9,
          "emotions": [{"emotion": "frustration", "intensity": 0.8}],
          "trend": "improving|stable|declining"
        }
      `;

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Sentiment analysis failed:', error);
      return {
        sentiment: 'neutral',
        score: 0,
        confidence: 0.1,
        emotions: []
      };
    }
  }

  private async detectUrgency(content: string, context?: any): Promise<UrgencyDetectionResult> {
    try {
      const prompt = `
        Analyze the urgency level of this customer message:
        
        Message: "${content}"
        Channel: ${context?.channelType || 'unknown'}
        
        Look for urgency indicators like:
        - Time-sensitive language (urgent, ASAP, immediately)
        - Business impact (can't work, losing money, critical)
        - Emotional intensity (frustrated, angry, desperate)
        - Escalation threats (cancel, lawyer, complaint)
        
        Respond in JSON format:
        {
          "urgencyLevel": "low|medium|high|critical",
          "urgencyScore": 0.8,
          "indicators": ["time_sensitive", "business_impact"],
          "reasoning": "Customer mentions critical business impact and needs immediate resolution"
        }
      `;

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Urgency detection failed:', error);
      return {
        urgencyLevel: 'medium',
        urgencyScore: 0.5,
        indicators: [],
        reasoning: 'Unable to determine urgency'
      };
    }
  }

  private async detectLanguage(content: string): Promise<LanguageDetectionResult> {
    try {
      const prompt = `
        Detect the language of this text and determine if translation is needed:
        
        Text: "${content}"
        
        Respond in JSON format:
        {
          "language": "en|es|fr|de|ar|etc",
          "confidence": 0.95,
          "translationRequired": false,
          "suggestedTranslation": "English translation if needed"
        }
      `;

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Language detection failed:', error);
      return {
        language: 'en',
        confidence: 0.5,
        translationRequired: false
      };
    }
  }

  private async extractEntities(content: string): Promise<EntityExtractionResult> {
    try {
      const prompt = `
        Extract entities, key phrases, and topics from this text:
        
        Text: "${content}"
        
        Extract:
        - Named entities (person, organization, location, product, etc.)
        - Key phrases that are important for support
        - Main topics discussed
        
        Respond in JSON format:
        {
          "entities": [
            {
              "type": "product",
              "value": "iPhone 12",
              "confidence": 0.9,
              "startIndex": 10,
              "endIndex": 19
            }
          ],
          "keyPhrases": ["login issue", "mobile app", "password reset"],
          "topics": ["authentication", "mobile", "troubleshooting"]
        }
      `;

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Entity extraction failed:', error);
      return {
        entities: [],
        keyPhrases: [],
        topics: []
      };
    }
  }

  /** Summarize a conversation thread */
  public async summarizeThread(params: { messages: Array<{ content: string; senderType?: string }>; maxBullets?: number }): Promise<{ short: string; bullets: string[] }> {
    try {
      const normalized = (params.messages || []).slice(-30).map(m => ({
        role: (m.senderType || 'user'),
        text: m.content || ''
      }));
      const prompt = buildPrompt('threadSummary', { messages: normalized, maxBullets: params.maxBullets || 5 });
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      return {
        short: String(parsed.short || '').slice(0, 200),
        bullets: Array.isArray(parsed.bullets) ? parsed.bullets.slice(0, 8) : []
      };
    } catch (error) {
      this.logger.error('summarizeThread failed:', error);
      return { short: 'Summary unavailable.', bullets: [] };
    }
  }

  /** Rewrite content with target tone/format */
  public async rewriteText(params: { content: string; tone?: string; format?: 'paragraph' | 'bullets' | 'email' | 'whatsapp' }): Promise<{ text: string }> {
    try {
      const prompt = buildPrompt('rewriteTone', { content: params.content, tone: params.tone, format: params.format });
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      return { text: String(parsed.text || params.content) };
    } catch (error) {
      this.logger.error('rewriteText failed:', error);
      return { text: params.content };
    }
  }

  /** Grammar and clarity fix */
  public async fixGrammar(params: { content: string; language?: string }): Promise<{ text: string }> {
    try {
      const prompt = buildPrompt('grammarFix', { content: params.content, language: params.language });
      const response = await this.callAI(prompt);
      const parsed = JSON.parse(response);
      return { text: String(parsed.text || params.content) };
    } catch (error) {
      this.logger.error('fixGrammar failed:', error);
      return { text: params.content };
    }
  }

  private async generateResponses(content: string, context?: any): Promise<ResponseGenerationResult> {
    try {
      const prompt = buildPrompt('responseSuggestions', {
        content,
        toneHints: context?.toneHints,
        contextNote: context?.contextNote,
      });

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Response generation failed:', error);
      return {
        suggestedResponses: [],
        templates: []
      };
    }
  }

  private async suggestKnowledge(content: string, context?: any): Promise<KnowledgeSuggestionsResult> {
    try {
      // Text prefilter
      const pre = await this.prisma['knowledgeBase'].findMany({
        where: {
          tenantId: context?.tenantId,
          isPublished: true,
          OR: [
            { title: { contains: content, mode: 'insensitive' } },
            { content: { contains: content, mode: 'insensitive' } },
            { tags: { hasSome: content.split(' ').slice(0, 5) } }
          ]
        },
        take: 20,
        orderBy: { viewCount: 'desc' }
      });

      // Get relevant FAQ articles
      const faqs = await this.prisma['faqArticle'].findMany({
        where: {
          tenantId: context?.tenantId,
          isPublished: true,
          OR: [
            { title: { contains: content, mode: 'insensitive' } },
            { content: { contains: content, mode: 'insensitive' } }
          ]
        },
        take: 3,
        orderBy: { viewCount: 'desc' }
      });

      // Optional vector ranking (best-effort)
      let ranked = pre;
      try {
        const queryVec = await this.computeEmbedding(content);
        if (Array.isArray(queryVec) && queryVec.length) {
          const withScore = pre.map((a: any) => {
            const vec = Array.isArray(a.aiEmbedding) ? a.aiEmbedding : undefined;
            let score = 0;
            if (Array.isArray(vec) && vec.length === queryVec.length) {
              // cosine similarity
              let dot = 0, ql = 0, al = 0;
              for (let i = 0; i < vec.length; i++) { const v = Number(vec[i] || 0); const q = Number(queryVec[i] || 0); dot += v*q; ql += q*q; al += v*v; }
              score = (dot / (Math.sqrt(ql) * Math.sqrt(al) || 1)) || 0;
            }
            return { ...a, _score: score };
          });
          ranked = withScore.sort((a: any, b: any) => (b._score || 0) - (a._score || 0)).slice(0, 5);
        } else {
          ranked = pre.slice(0, 5);
        }
      } catch (e) {
        ranked = pre.slice(0, 5);
      }

      return {
        articles: ranked.map((article: any) => ({
          id: article.id,
          title: article.title,
          snippet: article.content.substring(0, 200) + '...',
          relevanceScore: typeof article._score === 'number' ? Math.max(0, Math.min(1, Number(article._score.toFixed(3)))) : 0.8,
        })),
        faqs: faqs.map((faq: any) => ({
          id: faq.id,
          question: faq.title,
          answer: faq.content,
          relevanceScore: 0.7
        }))
      };
    } catch (error) {
      this.logger.error('Knowledge suggestions failed:', error);
      return {
        articles: [],
        faqs: []
      };
    }
  }

  private async predictEscalation(content: string, context?: any): Promise<EscalationPredictionResult> {
    try {
      const prompt = `
        Analyze if this customer message should be escalated and predict escalation probability:
        
        Message: "${content}"
        ${context?.customerHistory ? `Customer history: Previous escalations, satisfaction scores` : ''}
        
        Consider factors:
        - Complexity of the issue
        - Customer frustration level
        - Previous escalation history
        - Technical complexity
        - Business impact
        
        Respond in JSON format:
        {
          "shouldEscalate": true,
          "escalationProbability": 0.8,
          "reasoning": "High complexity technical issue with frustrated customer",
          "suggestedActions": ["Assign to senior agent", "Priority handling"],
          "recommendedAgent": {
            "agentId": "agent_123",
            "name": "Senior Agent",
            "expertise": ["technical", "billing"],
            "availabilityScore": 0.9
          }
        }
      `;

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Escalation prediction failed:', error);
      return {
        shouldEscalate: false,
        escalationProbability: 0.3,
        reasoning: 'Unable to determine escalation need',
        suggestedActions: []
      };
    }
  }

  private async predictSatisfaction(content: string, context?: any): Promise<SatisfactionPredictionResult> {
    try {
      const prompt = `
        Predict customer satisfaction based on this message and context:
        
        Message: "${content}"
        ${context?.customerHistory ? `Previous satisfaction scores and interactions` : ''}
        
        Analyze factors that influence satisfaction:
        - Tone and sentiment
        - Issue complexity
        - Response time expectations
        - Previous experience
        
        Respond in JSON format:
        {
          "predictedSatisfaction": 3.5,
          "confidence": 0.8,
          "factors": [
            {
              "factor": "response_time",
              "impact": -0.5,
              "description": "Customer expects quick resolution"
            }
          ]
        }
      `;

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Satisfaction prediction failed:', error);
      return {
        predictedSatisfaction: 3.0,
        confidence: 0.1,
        factors: []
      };
    }
  }

  private async assessChurnRisk(content: string, context?: any): Promise<ChurnRiskAssessmentResult> {
    try {
      const prompt = `
        Assess churn risk based on this customer message and context:
        
        Message: "${content}"
        ${context?.customerHistory ? `Customer value, tenure, previous issues` : ''}
        
        Analyze churn risk factors:
        - Cancellation mentions
        - Competitor references
        - Frustration level
        - Issue frequency
        - Customer value
        
        Respond in JSON format:
        {
          "churnRisk": "high",
          "churnProbability": 0.7,
          "riskFactors": [
            {
              "factor": "cancellation_threat",
              "weight": 0.8,
              "description": "Customer mentioned canceling service"
            }
          ],
          "interventionSuggestions": [
            "Immediate manager escalation",
            "Retention offer",
            "Priority support"
          ]
        }
      `;

      const response = await this.callAI(prompt);
      return JSON.parse(response);
    } catch (error) {
      this.logger.error('Churn risk assessment failed:', error);
      return {
        churnRisk: 'low',
        churnProbability: 0.2,
        riskFactors: [],
        interventionSuggestions: []
      };
    }
  }

  private async analyzeSalesCoaching(content: string, context?: any): Promise<CoachingAnalysisResult> {
    try {
      // If we have an AI provider, request a structured coaching analysis; otherwise, fall back to heuristics
      const prompt = `
        You are a sales coach. Analyze the following call transcript and produce actionable coaching feedback.
        Provide a concise summary, quantitative metrics, strengths, improvements, and recommended actions.

        Transcript:
        """
        ${content}
        """

        Respond in JSON with this shape:
        {
          "summary": string,
          "metrics": {
            "wordCount": number,
            "estimatedQuestions": number,
            "fillerWordRate": number,
            "clarityScore": number,
            "sentimentBalance": number,
            "callStructure": { "intro": boolean, "discovery": boolean, "valueProposition": boolean, "nextSteps": boolean }
          },
          "strengths": string[],
          "improvements": string[],
          "recommendedActions": string[]
        }
      `;

      try {
        const response = await this.callAI(prompt);
        return JSON.parse(response);
      } catch (_e) { void 0; }

      // Heuristic fallback if AI provider unavailable
      const text = (content || '').toLowerCase();
      const words = text.split(/\s+/).filter(Boolean);
      const wordCount = words.length;
      const questionMarks = (content.match(/\?/g) || []).length;
      const fillerWords = ['um', 'uh', 'like', 'you know', 'actually'];
      const fillerCount = fillerWords.reduce((sum, w) => sum + (text.split(w).length - 1), 0);
      const fillerWordRate = Math.min(1, wordCount > 0 ? fillerCount / Math.max(1, wordCount / 20) : 0);
      const positives = ['great','good','thanks','help','glad','awesome','perfect','value','benefit'];
      const negatives = ['angry','upset','problem','issue','bad','cancel','concern'];
      const posHits = positives.reduce((a,w)=>a+(text.split(w).length-1),0);
      const negHits = negatives.reduce((a,w)=>a+(text.split(w).length-1),0);
      const sentimentBalance = Math.max(0, Math.min(1, (posHits + 1) / (posHits + negHits + 2)));
      const clarityScore = Math.max(0, Math.min(1, 1 - fillerWordRate * 0.6));
      const callStructure = {
        intro: /hello|hi|thanks for/.test(text),
        discovery: /pain|challenge|goal|use case|requirements?/.test(text),
        valueProposition: /value|benefit|solution|we can|our product/.test(text),
        nextSteps: /next steps|follow up|schedule|trial|demo|meeting/.test(text)
      };

      const strengths: string[] = [];
      if (questionMarks >= 3) strengths.push('Good discovery with multiple questions');
      if (sentimentBalance > 0.6) strengths.push('Positive tone maintained');
      if (callStructure.valueProposition) strengths.push('Value proposition communicated');

      const improvements: string[] = [];
      if (fillerWordRate > 0.3) improvements.push('Reduce filler words for clearer delivery');
      if (!callStructure.nextSteps) improvements.push('Define explicit next steps at end of call');
      if (questionMarks < 3) improvements.push('Ask more discovery questions to uncover needs');

      const recommendedActions = [
        'Prepare a checklist to cover intro, discovery, value, next steps',
        'Practice concise phrasing to lower filler words',
        'Send a follow-up email with recap and scheduled next step'
      ];

      return {
        summary: 'Automated coaching: focus on discovery and clear next steps.',
        metrics: { wordCount, estimatedQuestions: questionMarks, fillerWordRate, clarityScore, sentimentBalance, callStructure },
        strengths,
        improvements,
        recommendedActions,
      };
    } catch (error) {
      this.logger.error('Sales coaching analysis failed:', error);
      return {
        summary: 'Insufficient data for analysis',
        metrics: { wordCount: 0, estimatedQuestions: 0, fillerWordRate: 0, clarityScore: 0, sentimentBalance: 0.5, callStructure: { intro: false, discovery: false, valueProposition: false, nextSteps: false } },
        strengths: [],
        improvements: [],
        recommendedActions: [],
      };
    }
  }
  public async callAI(prompt: string): Promise<string> {
    try {
      if ((this.aiProvider === 'dashscope' || this.aiProvider === 'both') && this.dashscopeClient) {
        const response = await this.dashscopeClient.post('/services/aigc/text-generation/generation', {
          model: this.dashscopeModel,
          input: {
            messages: [
              {
                role: 'system',
                content: 'You are an AI assistant specialized in customer service analysis. Always respond with valid JSON.'
              },
              {
                role: 'user',
                content: prompt
              }
            ]
          },
          parameters: {
            result_format: 'message',
            temperature: 0.3,
            max_tokens: 1000
          }
        });

        return response.data?.output?.choices?.[0]?.message?.content || '{}';
      }

      if (this.aiProvider === 'openai' && this.openai) {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are an AI assistant specialized in customer service analysis. Always respond with valid JSON.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        });

        return response.choices[0]?.message?.content || '{}';
      }

      if (this.aiProvider === 'anthropic' && this.anthropic) {
        const response = await this.anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 1000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        return response.content[0]?.type === 'text' ? response.content[0].text : '{}';
      }

      throw new Error('No AI provider configured');
    } catch (error) {
      this.logger.error('AI API call failed:', error);
      throw error;
    }
  }

  private calculateOverallConfidence(results: AIAnalysisResult['results']): number {
    const confidenceValues: number[] = [];
    
    Object.values(results).forEach(result => {
      if (result && 'confidence' in result) {
        confidenceValues.push((result as any).confidence as number);
      }
    });

    return confidenceValues.length > 0 
      ? confidenceValues.reduce((sum, conf) => sum + conf, 0) / confidenceValues.length
      : 0.5;
  }

  private async storeAnalysisResult(result: AIAnalysisResult, context?: any): Promise<void> {
    try {
      // Store in database for future reference and training
      const createData: any = {
          id: result.analysisId,
          content: result.content,
          results: result.results as any,
          processingTime: result.processingTime,
          confidence: result.confidence,
          conversationId: context?.conversationId,
          customerId: context?.customerId,
          tenantId: context?.tenantId,
          createdAt: result.timestamp
      };
      if (context?.callId) createData.callId = context.callId;
      await this.prisma['aIAnalysisResult'].create({ data: createData });
    } catch (error) {
      this.logger.error('Failed to store analysis result:', error);
    }
  }

  private async publishAnalysisEvent(result: AIAnalysisResult, context?: any): Promise<void> {
    try {
      const event = {
        eventId: `ai-analysis-${result.analysisId}`,
        eventType: 'ai.analysis.completed',
        aggregateId: result.analysisId,
        aggregateType: 'AIAnalysis',
        tenantId: context?.tenantId || 'default',
        version: '1',
        timestamp: result.timestamp,
        eventData: {
          analysisId: result.analysisId,
          conversationId: context?.conversationId,
          customerId: context?.customerId,
          results: result.results,
          confidence: result.confidence
        },
        metadata: {
          source: 'ai-intelligence-service',
          version: '1.0'
        }
      };
      
      await this.eventBus.publish(event);
    } catch (error) {
      this.logger.error('Failed to publish analysis event:', error);
    }
  }

  private generateAnalysisId(): string {
    return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Training and model management methods
  async trainCustomModel(modelType: string, trainingData: any[]): Promise<string> {
    try {
      this.logger.log(`Starting custom model training: ${modelType}`);
      
      // Store training job
      const trainingJob = await this.prisma['aIModel'].create({
        data: {
          id: this.generateAnalysisId(),
          tenantId: trainingData[0]?.tenantId || 'global',
          name: `custom_${modelType}_${Date.now()}`,
          type: modelType,
          status: 'training',
          configuration: { modelType, dataSize: trainingData.length },
          trainingData: trainingData as any
        }
      });

      // Simulate training process (in real implementation, this would be async)
      setTimeout(async () => {
        await this.prisma['aIModel'].update({
          where: { id: trainingJob.id },
          data: {
            status: 'ready',
            accuracy: 0.85 + Math.random() * 0.1, // Simulated accuracy
            version: '1.0'
          }
        });
      }, 5000);

      return trainingJob.id;
    } catch (error) {
      this.logger.error('Model training failed:', error);
      throw error;
    }
  }

  async getModelStatus(modelId: string): Promise<any> {
    return await this.prisma['aIModel'].findUnique({
      where: { id: modelId }
    });
  }

  async getAIInsights(tenantId: string, timeRange: { from: Date; to: Date }): Promise<any> {
    try {
      const [items, models] = await Promise.all([
        this.prisma['aIAnalysisResult'].findMany({
          where: {
            tenantId,
            createdAt: { gte: timeRange.from, lte: timeRange.to },
          },
          select: { id: true, confidence: true, results: true, createdAt: true, processingTime: true },
          orderBy: { createdAt: 'asc' },
          take: 2000, // cap for safety
        }),
        this.prisma['aIModel'].findMany({ where: { tenantId, isActive: true } }),
      ]);

      const totalAnalyses = items.length;
      const avgConfidence = totalAnalyses
        ? items.reduce((s: number, it: any) => s + (Number(it.confidence) || 0), 0) / totalAnalyses
        : 0;
      const avgResponseTime = totalAnalyses
        ? Math.round(items.reduce((s: number, it: any) => s + (Number(it.processingTime) || 0), 0) / totalAnalyses)
        : 0;

      // Top intents from intentClassification.primaryIntent
      const intentCounts = new Map<string, number>();
      for (const it of items) {
        try {
          const res: any = it.results || {};
          const primary = res?.intentClassification?.primaryIntent as string | undefined;
          if (primary) intentCounts.set(primary, (intentCounts.get(primary) || 0) + 1);
        } catch { /* ignore */ }
      }
      const intentsArray = Array.from(intentCounts.entries()).map(([intent, count]) => ({ intent, count }));
      const intentsTotal = intentsArray.reduce((s, r) => s + r.count, 0) || 1;
      const topIntents = intentsArray
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map(r => ({ intent: r.intent, count: r.count, percentage: Math.round((r.count / intentsTotal) * 1000) / 10 }));

      // Sentiment trends by day
      const trendMap = new Map<string, { positive: number; negative: number; neutral: number }>();
      for (const it of items) {
        const d = new Date(it.createdAt);
        const day = d.toISOString().slice(0, 10);
        const bucket = trendMap.get(day) || { positive: 0, negative: 0, neutral: 0 };
        const res: any = it.results || {};
        const sentiment = res?.sentimentAnalysis?.sentiment as ('positive'|'negative'|'neutral'|undefined);
        if (sentiment && sentiment in bucket) {
          (bucket as any)[sentiment] += 1;
        } else {
          bucket.neutral += 1; // default bucket if missing
        }
        trendMap.set(day, bucket);
      }
      const sentimentTrends = Array.from(trendMap.entries())
        .map(([date, v]) => ({ date, positive: v.positive, negative: v.negative, neutral: v.neutral }))
        .sort((a, b) => a.date.localeCompare(b.date));

      return {
        totalAnalyses,
        averageConfidence: Number(avgConfidence.toFixed(3)),
        modelsActive: models.length,
        topIntents,
        sentimentTrends,
        performanceMetrics: {
          accuracy: 0.87, // placeholder until model metrics are stored
          responseTime: avgResponseTime,
          successRate: 0.95, // placeholder until we define success criteria
        },
      };
    } catch (error) {
      this.logger.error('Failed to get AI insights:', error);
      return {
        totalAnalyses: 0,
        averageConfidence: 0,
        modelsActive: 0,
        topIntents: [],
        sentimentTrends: [],
        performanceMetrics: { accuracy: 0, responseTime: 0, successRate: 0 },
      };
    }
  }

  async getRecentAnalyses(tenantId: string, limit = 20): Promise<Array<{
    id: string;
    tenantId?: string | null;
    conversationId?: string | null;
    customerId?: string | null;
    content: string;
    results: unknown;
    processingTime: number;
    confidence: number;
    createdAt: Date;
  }>> {
    try {
      const items = await this.prisma['aIAnalysisResult'].findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' },
        take: Math.min(100, Math.max(1, limit)),
      })
      return items.map((it: any) => ({
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
    } catch (error) {
      this.logger.error('Failed to fetch recent analyses:', error)
      return []
    }
  }
}

// Extend service with coaching retrieval helpers
declare module './ai-intelligence.service' {
  interface AIIntelligenceService {
    getLatestCoachingAnalysis(tenantId: string, params: { callId?: string; conversationId?: string }): Promise<any | null>;
    getCoachingTrends(tenantId: string, range?: { from?: Date; to?: Date }): Promise<{ byDay: Array<{ date: string; clarityScore?: number; fillerWordRate?: number; sentimentBalance?: number }>; totals: { count: number; avgClarity?: number; avgFillerRate?: number; avgSentimentBalance?: number } }>
    getCoachingRecommendations(tenantId: string, limit?: number): Promise<{ strengths: Array<{ text: string; count: number }>; improvements: Array<{ text: string; count: number }>; actions: Array<{ text: string; count: number }> }>
    logCoachingAction(payload: { tenantId: string; agentUserId?: string; action: string; context?: any; conversationId?: string; callId?: string; coachingAnalysisId?: string }): Promise<{ id: string }>
    getCoachingEffectiveness(tenantId: string, agentId: string, windowDays?: number): Promise<{ windowDays: number; score: number; metrics: { clarityDelta?: number; fillerDelta?: number; sentimentDelta?: number; samples: number } }>
  }
}

AIIntelligenceService.prototype.getLatestCoachingAnalysis = async function (this: AIIntelligenceService, tenantId: string, params: { callId?: string; conversationId?: string }) {
  const where: any = { tenantId };
  if (params.callId) where.callId = params.callId;
  if (params.conversationId) where.conversationId = params.conversationId;
  const rows: any[] = await (this as any).prisma['aIAnalysisResult'].findMany({ where, orderBy: { createdAt: 'desc' }, take: 10 });
  for (const r of rows) {
    const coaching = (r.results || {})['salesCoaching'];
    if (coaching) return { id: r.id, createdAt: r.createdAt, coaching };
  }
  return null;
}

AIIntelligenceService.prototype.getCoachingTrends = async function (this: AIIntelligenceService, tenantId: string, range?: { from?: Date; to?: Date }) {
  const from = range?.from || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = range?.to || new Date();
  const rows: any[] = await (this as any).prisma['aIAnalysisResult'].findMany({ where: { tenantId, createdAt: { gte: from, lte: to } }, orderBy: { createdAt: 'asc' }, take: 1000 });
  const dayMap = new Map<string, { n: number; clarity: number; filler: number; sentiment: number }>();
  const total = { n: 0, clarity: 0, filler: 0, sentiment: 0 };
  for (const r of rows) {
    const coaching = (r.results || {})['salesCoaching'];
    const metrics = coaching?.metrics;
    if (!metrics) continue;
    const d = new Date(r.createdAt);
    const key = d.toISOString().slice(0, 10);
    const clarity = Number(metrics.clarityScore ?? 0);
    const filler = Number(metrics.fillerWordRate ?? 0);
    const sentiment = Number(metrics.sentimentBalance ?? 0);
    const prev = dayMap.get(key) || { n: 0, clarity: 0, filler: 0, sentiment: 0 };
    prev.n += 1; prev.clarity += clarity; prev.filler += filler; prev.sentiment += sentiment;
    dayMap.set(key, prev);
    total.n += 1; total.clarity += clarity; total.filler += filler; total.sentiment += sentiment;
  }
  const byDay = Array.from(dayMap.entries()).map(([date, agg]) => ({ date, clarityScore: agg.n ? +(agg.clarity / agg.n).toFixed(3) : undefined, fillerWordRate: agg.n ? +(agg.filler / agg.n).toFixed(3) : undefined, sentimentBalance: agg.n ? +(agg.sentiment / agg.n).toFixed(3) : undefined })).sort((a,b)=>a.date.localeCompare(b.date));
  const totals = { count: total.n, avgClarity: total.n ? +(total.clarity / total.n).toFixed(3) : undefined, avgFillerRate: total.n ? +(total.filler / total.n).toFixed(3) : undefined, avgSentimentBalance: total.n ? +(total.sentiment / total.n).toFixed(3) : undefined };
  return { byDay, totals };
}

AIIntelligenceService.prototype.getCoachingRecommendations = async function (this: AIIntelligenceService, tenantId: string, limit = 10) {
  const rows: any[] = await (this as any).prisma['aIAnalysisResult'].findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 500 });
  const strengths = new Map<string, number>();
  const improvements = new Map<string, number>();
  const actions = new Map<string, number>();
  for (const r of rows) {
    const coaching = (r.results || {})['salesCoaching'];
    if (!coaching) continue;
    for (const s of (coaching.strengths || [])) strengths.set(s, (strengths.get(s) || 0) + 1);
    for (const s of (coaching.improvements || [])) improvements.set(s, (improvements.get(s) || 0) + 1);
    for (const s of (coaching.recommendedActions || [])) actions.set(s, (actions.get(s) || 0) + 1);
  }
  const toArr = (m: Map<string, number>) => Array.from(m.entries()).map(([text, count]) => ({ text, count })).sort((a,b)=>b.count-a.count).slice(0, limit);
  return { strengths: toArr(strengths), improvements: toArr(improvements), actions: toArr(actions) };
}

AIIntelligenceService.prototype.logCoachingAction = async function (this: AIIntelligenceService, payload: { tenantId: string; agentUserId?: string; action: string; context?: any; conversationId?: string; callId?: string; coachingAnalysisId?: string }) {
  const data: any = {
    tenantId: payload.tenantId,
    agentUserId: payload.agentUserId || 'self',
    action: payload.action,
    context: payload.context || {},
    conversationId: payload.conversationId,
    callId: payload.callId,
    coachingAnalysisId: payload.coachingAnalysisId,
  }
  const row = await (this as any).prisma['coachingActionLog'].create({ data })
  return { id: row.id as string }
}

AIIntelligenceService.prototype.getCoachingEffectiveness = async function (this: AIIntelligenceService, tenantId: string, agentId: string, windowDays = 30) {
  const to = new Date()
  const from = new Date(Date.now() - Math.max(7, Math.min(365, windowDays)) * 24 * 60 * 60 * 1000)
  // Pull coaching analyses in window
  const analyses: any[] = await (this as any).prisma['aIAnalysisResult'].findMany({
    where: { tenantId, createdAt: { gte: from, lte: to } },
    orderBy: { createdAt: 'asc' },
    take: 1000,
  })
  const points: Array<{ t: number; clarity?: number; filler?: number; sentiment?: number }> = []
  for (const r of analyses) {
    const coaching = (r.results || {})['salesCoaching']
    const metrics = coaching?.metrics
    if (!metrics) continue
    points.push({ t: new Date(r.createdAt).getTime(), clarity: Number(metrics.clarityScore ?? 0), filler: Number(metrics.fillerWordRate ?? 0), sentiment: Number(metrics.sentimentBalance ?? 0) })
  }
  if (!points.length) return { windowDays, score: 0, metrics: { samples: 0 } }
  const mid = from.getTime() + (to.getTime() - from.getTime()) / 2
  const first = points.filter(p => p.t <= mid)
  const second = points.filter(p => p.t > mid)
  const avg = (arr: typeof points, key: 'clarity'|'filler'|'sentiment') => arr.length ? arr.reduce((s,p)=>s+(p[key] ?? 0),0)/arr.length : undefined
  const clarityDelta = (avg(second,'clarity') ?? 0) - (avg(first,'clarity') ?? 0)
  const fillerDelta = (avg(first,'filler') ?? 0) - (avg(second,'filler') ?? 0) // lower is better
  const sentimentDelta = (avg(second,'sentiment') ?? 0) - (avg(first,'sentiment') ?? 0)
  const scoreRaw = Math.max(0, Math.min(1, (0.5*(clarityDelta||0)) + (0.3*(fillerDelta||0)) + (0.2*(sentimentDelta||0))))
  const score = Math.round(scoreRaw * 100)
  return { windowDays, score, metrics: { clarityDelta, fillerDelta, sentimentDelta, samples: points.length } }
}