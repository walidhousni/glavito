import { Injectable, Logger } from '@nestjs/common';
import type {
  DomainEvent,
  StreamProcessor,
  MessageReceivedEvent,
  MessageAnalyzedEvent,
  CustomerSentimentAnalyzedEvent,
  TicketCreatedEvent
} from '@glavito/shared-types';
import { v4 as uuidv4 } from 'uuid';

// Mock AI service interface - in real implementation, this would be injected
// interface AIService {
//   analyzeMessage(content: string, context?: any): Promise<any>;
//   analyzeCustomerSentiment(customerId: string, conversationHistory: any[]): Promise<any>;
//   classifyTicket(ticketData: any): Promise<any>;
// }

@Injectable()
export class AIStreamProcessor implements StreamProcessor {
  private readonly logger = new Logger(AIStreamProcessor.name);

  // In real implementation, inject actual AI service
  constructor(
    // private readonly aiService: AIService
  ) {}

  async process(event: DomainEvent): Promise<DomainEvent[]> {
    const outputEvents: DomainEvent[] = [];

    try {
      switch (event.eventType) {
        case 'conversation.message.received':
          outputEvents.push(...await this.processMessageReceived(event as MessageReceivedEvent));
          break;
        
        case 'ticket.created':
          outputEvents.push(...await this.processTicketCreated(event as TicketCreatedEvent));
          break;
        
        default:
          // No AI processing needed for this event type
          break;
      }
    } catch (error) {
      this.logger.error(`Error processing AI analysis for event ${event.eventType}:`, error);
      // Don't throw - we don't want to break the stream
    }

    return outputEvents;
  }

  private async processMessageReceived(event: MessageReceivedEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const { eventData, tenantId } = event;

    // Skip AI analysis for system messages or non-text messages initially
    if (eventData.senderType === 'system' || eventData.messageType !== 'text') {
      return events;
    }

    try {
      // Perform AI analysis on the message
      const analysis = await this.performMessageAnalysis(eventData.content, {
        conversationId: eventData.conversationId,
        channel: eventData.channel,
        senderType: eventData.senderType
      });

      // Create message analyzed event
      const messageAnalyzedEvent: MessageAnalyzedEvent = {
        eventId: uuidv4(),
        eventType: 'ai.message.analyzed',
        aggregateId: eventData.messageId,
        aggregateType: 'ai-analysis',
        tenantId,
        timestamp: new Date(),
        version: '1.0',
        correlationId: event.eventId,
        eventData: {
          messageId: eventData.messageId,
          conversationId: eventData.conversationId,
          analysis
        },
        metadata: {
          source: 'ai-stream-processor',
          traceId: event.metadata.traceId,
          userId: event.metadata.userId
        }
      };

      events.push(messageAnalyzedEvent);

      // If this is a customer message with negative sentiment, trigger customer sentiment analysis
      if (eventData.senderType === 'customer' && analysis.sentiment.score < -0.3) {
        const customerSentimentEvent = await this.analyzeCustomerSentiment(
          eventData.conversationId,
          tenantId,
          event.timestamp,
          event.eventId
        );
        if (customerSentimentEvent) {
          events.push(customerSentimentEvent);
        }
      }

    } catch (error) {
      this.logger.error(`Failed to analyze message ${eventData.messageId}:`, error);
    }

    return events;
  }

  private async processTicketCreated(event: TicketCreatedEvent): Promise<DomainEvent[]> {
    const events: DomainEvent[] = [];
    const { eventData, tenantId } = event;

    try {
      // Perform AI classification on the ticket
      const analysis = await this.performTicketClassification({
        subject: eventData.subject,
        description: eventData.description,
        channel: eventData.channel,
        priority: eventData.priority
      });

      // Create ticket analyzed event (extending the message analyzed event structure)
      const ticketAnalyzedEvent: MessageAnalyzedEvent = {
        eventId: uuidv4(),
        eventType: 'ai.message.analyzed', // Reusing the same event type for consistency
        aggregateId: eventData.ticketId,
        aggregateType: 'ai-analysis',
        tenantId,
        timestamp: new Date(),
        version: '1.0',
        correlationId: event.eventId,
        eventData: {
          messageId: eventData.ticketId, // Using ticket ID as message ID
          conversationId: eventData.ticketId, // Using ticket ID as conversation ID
          analysis
        },
        metadata: {
          source: 'ai-stream-processor',
          traceId: event.metadata.traceId,
          userId: event.metadata.userId
        }
      };

      events.push(ticketAnalyzedEvent);

    } catch (error) {
      this.logger.error(`Failed to analyze ticket ${eventData.ticketId}:`, error);
    }

    return events;
  }

  private async analyzeCustomerSentiment(
    conversationId: string,
    tenantId: string,
    timestamp: Date,
    correlationId: string
  ): Promise<CustomerSentimentAnalyzedEvent | null> {
    try {
      // In real implementation, fetch conversation history and customer data
      const sentimentAnalysis = await this.performCustomerSentimentAnalysis(conversationId);

      return {
        eventId: uuidv4(),
        eventType: 'ai.customer.sentiment.analyzed',
        aggregateId: conversationId,
        aggregateType: 'ai-analysis',
        tenantId,
        timestamp: new Date(),
        version: '1.0',
        correlationId,
        eventData: {
          customerId: 'customer-id', // Would be extracted from conversation
          conversationId,
          overallSentiment: sentimentAnalysis.overallSentiment,
          churnRisk: sentimentAnalysis.churnRisk
        },
        metadata: {
          source: 'ai-stream-processor'
        }
      };
    } catch (error) {
      this.logger.error(`Failed to analyze customer sentiment for conversation ${conversationId}:`, error);
      return null;
    }
  }

  // Mock AI analysis methods - replace with actual AI service calls
  private async performMessageAnalysis(content: string, context: any): Promise<any> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Mock analysis results
    return {
      intent: {
        primary: this.mockIntentClassification(content),
        confidence: 0.85,
        alternatives: [
          { intent: 'billing_inquiry', confidence: 0.12 },
          { intent: 'general_question', confidence: 0.03 }
        ]
      },
      sentiment: {
        score: this.mockSentimentScore(content),
        label: this.mockSentimentLabel(content),
        confidence: 0.92
      },
      emotions: [
        { emotion: 'neutral', confidence: 0.6 },
        { emotion: 'concern', confidence: 0.3 },
        { emotion: 'frustration', confidence: 0.1 }
      ],
      entities: this.mockEntityExtraction(content),
      language: {
        code: 'en',
        confidence: 0.99
      },
      urgency: {
        score: this.mockUrgencyScore(content),
        level: this.mockUrgencyLevel(content)
      },
      category: {
        primary: 'support',
        confidence: 0.88,
        subcategory: 'technical_issue'
      },
      suggestedResponses: [
        {
          response: "I understand your concern. Let me help you with that right away.",
          confidence: 0.85,
          type: 'template'
        }
      ],
      knowledgeBaseSuggestions: [
        {
          articleId: 'kb-001',
          title: 'How to resolve common technical issues',
          relevanceScore: 0.78
        }
      ]
    };
  }

  private async performTicketClassification(ticketData: any): Promise<any> {
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 150));

    const content = `${ticketData.subject} ${ticketData.description}`;
    
    return {
      intent: {
        primary: this.mockIntentClassification(content),
        confidence: 0.82
      },
      sentiment: {
        score: this.mockSentimentScore(content),
        label: this.mockSentimentLabel(content),
        confidence: 0.89
      },
      emotions: [
        { emotion: 'concern', confidence: 0.7 },
        { emotion: 'neutral', confidence: 0.3 }
      ],
      entities: this.mockEntityExtraction(content),
      language: {
        code: 'en',
        confidence: 0.95
      },
      urgency: {
        score: this.mockUrgencyScore(content),
        level: this.mockUrgencyLevel(content)
      },
      category: {
        primary: 'support',
        confidence: 0.91,
        subcategory: this.mockCategoryClassification(content)
      }
    };
  }

  private async performCustomerSentimentAnalysis(conversationId: string): Promise<any> {
    // Simulate customer sentiment analysis
    await new Promise(resolve => setTimeout(resolve, 200));

    return {
      overallSentiment: {
        score: -0.2,
        trend: 'declining',
        riskLevel: 'medium'
      },
      churnRisk: {
        score: 0.35,
        factors: ['negative_sentiment', 'multiple_issues', 'long_resolution_time'],
        recommendations: [
          'Prioritize this customer for immediate attention',
          'Consider escalating to senior agent',
          'Follow up within 24 hours'
        ]
      }
    };
  }

  // Mock helper methods
  private mockIntentClassification(content: string): string {
    const intents = ['technical_support', 'billing_inquiry', 'general_question', 'complaint', 'feature_request'];
    if (content.toLowerCase().includes('bill') || content.toLowerCase().includes('payment')) {
      return 'billing_inquiry';
    }
    if (content.toLowerCase().includes('bug') || content.toLowerCase().includes('error')) {
      return 'technical_support';
    }
    if (content.toLowerCase().includes('angry') || content.toLowerCase().includes('frustrated')) {
      return 'complaint';
    }
    return intents[Math.floor(Math.random() * intents.length)];
  }

  private mockSentimentScore(content: string): number {
    // Simple keyword-based sentiment scoring
    const positiveWords = ['good', 'great', 'excellent', 'happy', 'satisfied'];
    const negativeWords = ['bad', 'terrible', 'awful', 'angry', 'frustrated', 'disappointed'];
    
    let score = 0;
    const words = content.toLowerCase().split(' ');
    
    for (const word of words) {
      if (positiveWords.includes(word)) score += 0.3;
      if (negativeWords.includes(word)) score -= 0.4;
    }
    
    return Math.max(-1, Math.min(1, score));
  }

  private mockSentimentLabel(content: string): 'negative' | 'neutral' | 'positive' {
    const score = this.mockSentimentScore(content);
    if (score > 0.1) return 'positive';
    if (score < -0.1) return 'negative';
    return 'neutral';
  }

  private mockUrgencyScore(content: string): number {
    const urgentWords = ['urgent', 'emergency', 'critical', 'asap', 'immediately'];
    const words = content.toLowerCase().split(' ');
    
    for (const word of words) {
      if (urgentWords.includes(word)) return 0.9;
    }
    
    return Math.random() * 0.6; // Random score between 0 and 0.6
  }

  private mockUrgencyLevel(content: string): 'low' | 'medium' | 'high' | 'critical' {
    const score = this.mockUrgencyScore(content);
    if (score > 0.8) return 'critical';
    if (score > 0.6) return 'high';
    if (score > 0.3) return 'medium';
    return 'low';
  }

  private mockEntityExtraction(content: string): Array<{
    type: string;
    value: string;
    confidence: number;
    start: number;
    end: number;
  }> {
    const entities = [];
    
    // Simple email extraction
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    let match;
    while ((match = emailRegex.exec(content)) !== null) {
      entities.push({
        type: 'email',
        value: match[0],
        confidence: 0.95,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    // Simple phone number extraction
    const phoneRegex = /\b\d{3}-\d{3}-\d{4}\b/g;
    while ((match = phoneRegex.exec(content)) !== null) {
      entities.push({
        type: 'phone',
        value: match[0],
        confidence: 0.90,
        start: match.index,
        end: match.index + match[0].length
      });
    }
    
    return entities;
  }

  private mockCategoryClassification(content: string): string {
    if (content.toLowerCase().includes('login') || content.toLowerCase().includes('password')) {
      return 'authentication';
    }
    if (content.toLowerCase().includes('payment') || content.toLowerCase().includes('billing')) {
      return 'billing';
    }
    if (content.toLowerCase().includes('bug') || content.toLowerCase().includes('error')) {
      return 'technical_issue';
    }
    return 'general';
  }
}