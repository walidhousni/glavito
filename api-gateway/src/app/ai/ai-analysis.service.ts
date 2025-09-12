import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/database';
import {
  AnalyzeTicketRequest,
  AnalyzeTicketResponse,
  TicketAIAnalysis,
  AIAnalysisConfig,
} from '@glavito/shared-types';

@Injectable()
export class AIAnalysisService {
  private readonly logger = new Logger(AIAnalysisService.name);

  constructor(private readonly databaseService: DatabaseService) {}

  async analyzeTicket(
    tenantId: string,
    request: AnalyzeTicketRequest,
  ): Promise<AnalyzeTicketResponse> {
    const startTime = Date.now();
    
    try {
      // Get existing analysis or create new one
      let analysis = await this.databaseService.ticketAIAnalysis.findUnique({
        where: { ticketId: request.ticketId },
      });

      if (!analysis) {
        analysis = await this.databaseService.ticketAIAnalysis.create({
          data: {
            ticketId: request.ticketId,
            suggestedResponses: [],
            knowledgeBaseSuggestions: [],
            keyPhrases: [],
            entities: [],
            similarTickets: [],
            automationTriggers: [],
            metadata: {},
          },
        });
      }

      // Perform AI analysis based on request options
      const updatedAnalysis = await this.performAnalysis(
        analysis,
        request,
        tenantId,
      );

      const processingTime = Date.now() - startTime;
      const confidence = this.calculateOverallConfidence(updatedAnalysis);

      return {
        ticketId: request.ticketId,
        analysis: updatedAnalysis,
        processingTime,
        confidence,
      };
    } catch (error) {
      this.logger.error(
        `Failed to analyze ticket ${request.ticketId}:`,
        error.stack,
      );
      throw error;
    }
  }

  private async performAnalysis(
    analysis: any,
    request: AnalyzeTicketRequest,
    tenantId: string,
  ): Promise<TicketAIAnalysis> {
    const updates: Partial<TicketAIAnalysis> = {
      lastAnalyzedAt: new Date(),
      analysisVersion: '2.0',
    };

    // Classification analysis
    if (request.includeClassification) {
      updates.classification = await this.performClassification(
        request.content,
        tenantId,
      );
    }

    // Sentiment analysis
    if (request.includeSentiment) {
      updates.sentiment = await this.performSentimentAnalysis(
        request.content,
      );
    }

    // Priority prediction
    if (request.includePriority) {
      updates.priority = await this.predictPriority(
        request.content,
        analysis.classification,
        analysis.sentiment,
      );
    }

    // Response suggestions
    if (request.includeSuggestions) {
      updates.suggestedResponses = await this.generateResponseSuggestions(
        request.content,
        analysis.classification,
        tenantId,
      );
    }

    // Knowledge base suggestions
    if (request.includeKnowledgeBase) {
      updates.knowledgeBaseSuggestions = await this.getKnowledgeBaseSuggestions(
        request.content,
        analysis.classification,
        tenantId,
      );
    }

    // Additional AI features
    updates.languageDetection = await this.detectLanguage(request.content);
    updates.keyPhrases = await this.extractKeyPhrases(request.content);
    updates.entities = await this.extractEntities(request.content);
    updates.urgencyScore = await this.calculateUrgencyScore(request.content);
    updates.complexityScore = await this.calculateComplexityScore(request.content);
    updates.estimatedResolutionTime = await this.estimateResolutionTime(
      request.content,
      analysis.classification,
      analysis.complexityScore,
    );
    updates.similarTickets = await this.findSimilarTickets(
      request.ticketId,
      request.content,
      tenantId,
    );
    updates.escalationRecommendation = await this.generateEscalationRecommendation(
      analysis.urgencyScore,
      analysis.complexityScore,
      analysis.sentiment,
    );
    updates.automationTriggers = await this.identifyAutomationTriggers(
      request.content,
      analysis.classification,
      tenantId,
    );

    // Update the analysis in database
    const updatedAnalysis = await this.databaseService.ticketAIAnalysis.update({
      where: { ticketId: request.ticketId },
      data: updates,
    });

    return updatedAnalysis as TicketAIAnalysis;
  }

  private async performClassification(
    content: string,
    tenantId: string,
  ): Promise<{ category: string; subcategory: string; confidence: number }> {
    // Mock implementation - replace with actual AI model
    const categories = [
      { category: 'Technical', subcategory: 'Bug Report', confidence: 0.85 },
      { category: 'Billing', subcategory: 'Payment Issue', confidence: 0.75 },
      { category: 'General', subcategory: 'Question', confidence: 0.65 },
    ];

    // Simple keyword-based classification for demo
    const lowerContent = content.toLowerCase();
    if (lowerContent.includes('bug') || lowerContent.includes('error')) {
      return categories[0];
    } else if (lowerContent.includes('payment') || lowerContent.includes('billing')) {
      return categories[1];
    }
    return categories[2];
  }

  private async performSentimentAnalysis(
    content: string,
  ): Promise<{ score: number; label: string; confidence: number }> {
    // Mock implementation - replace with actual sentiment analysis
    const negativeWords = ['angry', 'frustrated', 'terrible', 'awful', 'hate'];
    const positiveWords = ['great', 'excellent', 'love', 'amazing', 'perfect'];
    
    const lowerContent = content.toLowerCase();
    const negativeCount = negativeWords.filter(word => lowerContent.includes(word)).length;
    const positiveCount = positiveWords.filter(word => lowerContent.includes(word)).length;
    
    let score = 0;
    let label = 'neutral';
    
    if (negativeCount > positiveCount) {
      score = -0.5 - (negativeCount * 0.2);
      label = 'negative';
    } else if (positiveCount > negativeCount) {
      score = 0.5 + (positiveCount * 0.2);
      label = 'positive';
    }
    
    return {
      score: Math.max(-1, Math.min(1, score)),
      label,
      confidence: 0.8,
    };
  }

  private async predictPriority(
    content: string,
    classification: any,
    sentiment: any,
  ): Promise<{ suggested: string; confidence: number; reasoning: string }> {
    let priority = 'medium';
    let confidence = 0.7;
    let reasoning = 'Based on content analysis';

    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap', 'immediately'];
    const lowerContent = content.toLowerCase();
    
    if (urgentKeywords.some(keyword => lowerContent.includes(keyword))) {
      priority = 'high';
      confidence = 0.9;
      reasoning = 'Contains urgent keywords';
    } else if (sentiment?.label === 'negative' && sentiment?.score < -0.5) {
      priority = 'high';
      confidence = 0.8;
      reasoning = 'Negative sentiment indicates urgency';
    } else if (classification?.category === 'Technical' && classification?.subcategory === 'Bug Report') {
      priority = 'medium';
      confidence = 0.75;
      reasoning = 'Technical issues require timely attention';
    }

    return { suggested: priority, confidence, reasoning };
  }

  private async generateResponseSuggestions(
    content: string,
    classification: any,
    tenantId: string,
  ): Promise<Array<{ content: string; confidence: number; type: 'template' | 'generated' }>> {
    // Mock implementation - replace with actual AI response generation
    const suggestions = [];
    
    if (classification?.category === 'Technical') {
      suggestions.push({
        content: 'Thank you for reporting this technical issue. Our development team will investigate and provide an update within 24 hours.',
        confidence: 0.8,
        type: 'template' as const,
      });
    } else if (classification?.category === 'Billing') {
      suggestions.push({
        content: 'I understand your billing concern. Let me review your account and get back to you with a resolution.',
        confidence: 0.85,
        type: 'template' as const,
      });
    } else {
      suggestions.push({
        content: 'Thank you for contacting us. I\'ll be happy to help you with your inquiry.',
        confidence: 0.7,
        type: 'generated' as const,
      });
    }
    
    return suggestions;
  }

  private async getKnowledgeBaseSuggestions(
    content: string,
    classification: any,
    tenantId: string,
  ): Promise<Array<{ articleId: string; title: string; relevanceScore: number; excerpt: string }>> {
    // Mock implementation - replace with actual knowledge base search
    return [
      {
        articleId: 'kb-001',
        title: 'Common Technical Issues and Solutions',
        relevanceScore: 0.85,
        excerpt: 'This article covers the most common technical issues...',
      },
    ];
  }

  private async detectLanguage(content: string): Promise<{ language: string; confidence: number }> {
    // Mock implementation - replace with actual language detection
    return { language: 'en', confidence: 0.95 };
  }

  private async extractKeyPhrases(content: string): Promise<string[]> {
    // Mock implementation - replace with actual key phrase extraction
    const words = content.toLowerCase().split(/\s+/);
    return words.filter(word => word.length > 4).slice(0, 5);
  }

  private async extractEntities(content: string): Promise<Array<{ text: string; type: string; confidence: number }>> {
    // Mock implementation - replace with actual entity extraction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emails = content.match(emailRegex) || [];
    
    return emails.map(email => ({
      text: email,
      type: 'email',
      confidence: 0.9,
    }));
  }

  private async calculateUrgencyScore(content: string): Promise<number> {
    const urgentKeywords = ['urgent', 'critical', 'emergency', 'asap', 'immediately', 'help'];
    const lowerContent = content.toLowerCase();
    const urgentCount = urgentKeywords.filter(keyword => lowerContent.includes(keyword)).length;
    
    return Math.min(1, urgentCount * 0.3);
  }

  private async calculateComplexityScore(content: string): Promise<number> {
    // Simple complexity based on content length and technical terms
    const technicalTerms = ['api', 'database', 'server', 'integration', 'configuration'];
    const lowerContent = content.toLowerCase();
    const techCount = technicalTerms.filter(term => lowerContent.includes(term)).length;
    
    const lengthScore = Math.min(1, content.length / 1000);
    const techScore = Math.min(1, techCount * 0.2);
    
    return (lengthScore + techScore) / 2;
  }

  private async estimateResolutionTime(
    content: string,
    classification: any,
    complexityScore: number,
  ): Promise<number> {
    // Base time in minutes
    let baseTime = 60; // 1 hour default
    
    if (classification?.category === 'Technical') {
      baseTime = 120; // 2 hours for technical issues
    } else if (classification?.category === 'Billing') {
      baseTime = 30; // 30 minutes for billing
    }
    
    // Adjust based on complexity
    const complexityMultiplier = 1 + (complexityScore || 0);
    
    return Math.round(baseTime * complexityMultiplier);
  }

  private async findSimilarTickets(
    ticketId: string,
    content: string,
    tenantId: string,
  ): Promise<Array<{ ticketId: string; similarity: number; reason: string }>> {
    // Mock implementation - replace with actual similarity search
    return [
      {
        ticketId: 'ticket-123',
        similarity: 0.75,
        reason: 'Similar keywords and classification',
      },
    ];
  }

  private async generateEscalationRecommendation(
    urgencyScore: number,
    complexityScore: number,
    sentiment: any,
  ): Promise<{ shouldEscalate: boolean; reason: string; suggestedAgent?: string; urgencyLevel: number }> {
    const urgencyLevel = Math.max(urgencyScore || 0, complexityScore || 0);
    const shouldEscalate = urgencyLevel > 0.7 || (sentiment?.label === 'negative' && sentiment?.score < -0.6);
    
    let reason = 'Standard handling appropriate';
    if (shouldEscalate) {
      reason = urgencyLevel > 0.7 ? 'High complexity/urgency detected' : 'Negative sentiment requires attention';
    }
    
    return {
      shouldEscalate,
      reason,
      urgencyLevel,
    };
  }

  private async identifyAutomationTriggers(
    content: string,
    classification: any,
    tenantId: string,
  ): Promise<Array<{ triggerId: string; confidence: number; action: string }>> {
    // Mock implementation - replace with actual automation trigger identification
    const triggers = [];
    
    if (classification?.category === 'Billing') {
      triggers.push({
        triggerId: 'billing-auto-response',
        confidence: 0.8,
        action: 'Send billing FAQ',
      });
    }
    
    return triggers;
  }

  private calculateOverallConfidence(analysis: TicketAIAnalysis): number {
    const confidenceValues = [
      analysis.classification?.confidence,
      analysis.sentiment?.confidence,
      analysis.priority?.confidence,
    ].filter(Boolean);
    
    if (confidenceValues.length === 0) return 0.5;
    
    return confidenceValues.reduce((sum, val) => sum + val, 0) / confidenceValues.length;
  }

  async getAnalysis(ticketId: string): Promise<TicketAIAnalysis | null> {
    return this.databaseService.ticketAIAnalysis.findUnique({
      where: { ticketId },
    }) as Promise<TicketAIAnalysis | null>;
  }

  async updateAnalysisConfig(
    tenantId: string,
    config: AIAnalysisConfig,
  ): Promise<void> {
    // Store AI analysis configuration for tenant
    await this.databaseService.integrationStatus.upsert({
      where: {
        tenantId_integrationType: {
          tenantId,
          integrationType: 'ai_analysis',
        },
      },
      update: {
        configuration: config,
        updatedAt: new Date(),
      },
      create: {
        tenantId,
        integrationType: 'ai_analysis',
        status: 'connected',
        configuration: config,
      },
    });
  }

  async getAnalysisConfig(tenantId: string): Promise<AIAnalysisConfig | null> {
    const integration = await this.databaseService.integrationStatus.findUnique({
      where: {
        tenantId_integrationType: {
          tenantId,
          integrationType: 'ai_analysis',
        },
      },
    });

    return integration?.configuration as AIAnalysisConfig || null;
  }
}