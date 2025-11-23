import { Injectable, NotFoundException, Logger, Optional, Inject } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface SatisfactionSurveyRequest {
  tenantId: string;
  customerId: string;
  ticketId?: string;
  conversationId?: string;
  channel: 'email' | 'whatsapp' | 'web';
  surveyType?: 'post_resolution' | 'periodic' | 'manual';
  customQuestions?: Array<{
    id: string;
    question: string;
    type: 'rating' | 'text' | 'choice';
    required?: boolean;
    options?: string[];
  }>;
  metadata?: Record<string, unknown>;
}

export interface SatisfactionResponse {
  surveyId: string;
  rating: number;
  comment?: string;
  customAnswers?: Record<string, unknown>;
  respondedAt: Date;
}

export interface WhatsAppFlowSurvey {
  flowId: string;
  surveyData: {
    questions: Array<{
      id: string;
      text: string;
      type: 'rating' | 'text' | 'choice';
      options?: string[];
    }>;
  };
}

@Injectable()
export class CustomerSatisfactionService {
  private readonly logger = new Logger(CustomerSatisfactionService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Optional() @Inject('EVENT_PUBLISHER') private readonly eventPublisher?: { emit?: (event: string, payload: Record<string, unknown>) => void },
  ) {}

  /**
   * Send satisfaction survey via email
   */
  async sendEmailSurvey(request: SatisfactionSurveyRequest): Promise<{ surveyId: string; emailSent: boolean }> {
    try {
      // Create survey record
      const survey = await this.createSurveyRecord({
        ...request,
        channel: 'email',
      });

      // Get customer details
      const customer = await this.databaseService.customer.findUnique({
        where: { id: request.customerId },
        select: { email: true, firstName: true, lastName: true },
      });

      if (!customer?.email) {
        throw new Error('Customer email not found');
      }

      // Generate survey link
      const surveyUrl = this.generateSurveyUrl(survey.id, request.tenantId);

      // Send email via your email service
      const emailSent = await this.sendSurveyEmail({
        to: customer.email,
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Valued Customer',
        surveyUrl,
        tenantId: request.tenantId,
        ticketId: request.ticketId,
      });

      // Update survey with delivery info
      await this.databaseService.customerSatisfactionSurvey.update({
        where: { id: survey.id },
        data: {
          sentAt: new Date(),
          metadata: {
            ...((survey.metadata as any) || {}),
            emailDelivered: emailSent,
            surveyUrl,
          },
        },
      });

      // Create system message in conversation when survey is sent
      await this.createSurveySentMessage(request.tenantId, request.customerId, request.conversationId, survey.id, 'email').catch((err) => {
        this.logger.warn('Failed to create survey sent message:', err);
      });

      this.logger.log(`Email survey sent to customer ${request.customerId}, survey ID: ${survey.id}`);

      return {
        surveyId: survey.id,
        emailSent,
      };
    } catch (error) {
      this.logger.error('Failed to send email survey:', error);
      throw error;
    }
  }

  /**
   * Send satisfaction survey via WhatsApp Flow
   */
  async sendWhatsAppFlowSurvey(request: SatisfactionSurveyRequest): Promise<{ surveyId: string; flowSent: boolean }> {
    try {
      // Create survey record
      const survey = await this.createSurveyRecord({
        ...request,
        channel: 'whatsapp',
      });

      // Get customer phone
      const customer = await this.databaseService.customer.findUnique({
        where: { id: request.customerId },
        select: { phone: true, firstName: true, lastName: true },
      });

      if (!customer?.phone) {
        throw new Error('Customer phone number not found');
      }

      // Create WhatsApp Flow for survey
      const flow = await this.createWhatsAppSurveyFlow(request, survey.id);

      // Send flow via WhatsApp
      const flowSent = await this.sendWhatsAppFlow({
        phoneNumber: customer.phone,
        flowId: flow.flowId,
        customerName: `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || 'Valued Customer',
        tenantId: request.tenantId,
      });

      // Update survey with delivery info
      await this.databaseService.customerSatisfactionSurvey.update({
        where: { id: survey.id },
        data: {
          sentAt: new Date(),
          metadata: {
            ...((survey.metadata as any) || {}),
            whatsappFlowId: flow.flowId,
            flowDelivered: flowSent,
          },
        },
      });

      // Create system message in conversation when survey is sent
      await this.createSurveySentMessage(request.tenantId, request.customerId, request.conversationId, survey.id, 'whatsapp').catch((err) => {
        this.logger.warn('Failed to create survey sent message:', err);
      });

      this.logger.log(`WhatsApp Flow survey sent to customer ${request.customerId}, survey ID: ${survey.id}`);

      return {
        surveyId: survey.id,
        flowSent,
      };
    } catch (error) {
      this.logger.error('Failed to send WhatsApp Flow survey:', error);
      throw error;
    }
  }

  /**
   * Process survey response
   */
  async processSurveyResponse(
    surveyId: string,
    rating: number,
    comment?: string,
    customAnswers?: Record<string, unknown>
  ): Promise<SatisfactionResponse> {
    try {
      const survey = await this.databaseService.customerSatisfactionSurvey.findFirst({
        where: { id: surveyId },
      });

      if (!survey) {
        throw new NotFoundException('Survey not found');
      }

      // Update survey with response
      const updatedSurvey = await this.databaseService.customerSatisfactionSurvey.update({
        where: { id: surveyId },
        data: {
          rating,
          comment,
          respondedAt: new Date(),
          metadata: {
            ...((survey.metadata as any) || {}),
            customAnswers: customAnswers || {},
            responseReceived: true,
          },
        },
      });

      // Create timeline event if ticket is associated
      if (survey.ticketId) {
        try {
          await this.databaseService.ticketTimelineEvent.create({
            data: {
              ticketId: survey.ticketId,
              eventType: 'satisfaction_survey_completed',
              description: `Customer rated satisfaction: ${rating}/5${comment ? ` - "${comment}"` : ''}`,
              newValue: { rating, comment, surveyId },
            },
          });
        } catch (error) {
          this.logger.warn('Failed to create timeline event for satisfaction survey:', error);
        }
      }

      // Create system message in conversation showing survey response
      const tenantId = (survey as any)?.tenantId as string | undefined;
      const customerId = (survey as any)?.customerId as string | undefined;
      const conversationId = (survey as any)?.conversationId as string | undefined;
      const channel = (survey as any)?.channel as string | undefined;
      
      if (tenantId && customerId) {
        await this.createSurveyResponseMessage(
          tenantId,
          customerId,
          conversationId,
          surveyId,
          rating,
          comment,
          customAnswers,
          channel || 'whatsapp'
        ).catch((err) => {
          this.logger.warn('Failed to create survey response message:', err);
        });
      }

      this.logger.log(`Survey response processed: ${surveyId}, rating: ${rating}`);

      // Emit notifications (best-effort)
      try {
        this.eventPublisher?.emit?.('survey.response', {
          eventType: 'survey.response',
          surveyId,
          tenantId,
          customerId,
          rating,
          comment,
          respondedAt: updatedSurvey.respondedAt,
        })
        if (typeof rating === 'number' && rating <= 2) {
          this.eventPublisher?.emit?.('csat.low_rating_received', {
            eventType: 'csat.low_rating_received',
            surveyId,
            tenantId,
            customerId,
            rating,
            comment,
            timestamp: new Date().toISOString(),
          })
        }
      } catch (emitErr) {
        this.logger.warn('Failed to emit survey notifications', emitErr as any)
      }

      return {
        surveyId,
        rating,
        comment,
        customAnswers,
        respondedAt: updatedSurvey.respondedAt!,
      };
    } catch (error) {
      this.logger.error('Failed to process survey response:', error);
      throw error;
    }
  }

  /**
   * Get segment members (customer IDs)
   */
  async getSegmentMembers(tenantId: string, segmentId: string): Promise<string[]> {
    const memberships = await this.databaseService.customerSegmentMembership.findMany({
      where: { 
        segmentId,
        segment: { tenantId },
      },
      select: { customerId: true },
    });
    return memberships.map(m => m.customerId);
  }

  /**
   * Get customer surveys
   */
  async getCustomerSurveys(tenantId: string, customerId: string): Promise<any[]> {
    return this.databaseService.customerSatisfactionSurvey.findMany({
      where: { tenantId, customerId },
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          select: { id: true, subject: true, status: true },
        },
      },
    });
  }

  /**
   * Get survey analytics
   */
  async getSurveyAnalytics(tenantId: string, filters?: {
    startDate?: Date;
    endDate?: Date;
    channel?: string;
    surveyType?: string;
  }) {
    const where: any = { tenantId };

    if (filters?.startDate || filters?.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = filters.startDate;
      if (filters.endDate) where.createdAt.lte = filters.endDate;
    }

    if (filters?.channel) {
      where.channel = filters.channel;
    }

    if (filters?.surveyType) {
      where.surveyType = filters.surveyType;
    }

    const surveys = await this.databaseService.customerSatisfactionSurvey.findMany({
      where,
      select: {
        id: true,
        rating: true,
        comment: true,
        channel: true,
        surveyType: true,
        sentAt: true,
        respondedAt: true,
        createdAt: true,
      },
    });

    const totalSent = surveys.length;
    const totalResponded = surveys.filter(s => s.respondedAt).length;
    const responseRate = totalSent > 0 ? (totalResponded / totalSent) * 100 : 0;

    const ratings = surveys.filter(s => s.respondedAt).map(s => s.rating);
    const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0;

    const ratingDistribution = {
      1: ratings.filter(r => r === 1).length,
      2: ratings.filter(r => r === 2).length,
      3: ratings.filter(r => r === 3).length,
      4: ratings.filter(r => r === 4).length,
      5: ratings.filter(r => r === 5).length,
    };

    const channelBreakdown = surveys.reduce((acc, survey) => {
      acc[survey.channel] = (acc[survey.channel] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // NPS-style score on 1-5 scale: 4-5 = promoters, 3 = passive, 1-2 = detractors
    let promoters = 0; let passives = 0; let detractors = 0;
    for (const r of ratings) {
      if (r >= 4) promoters += 1; else if (r === 3) passives += 1; else detractors += 1;
    }
    const npsBase = ratings.length || 1;
    const nps = ((promoters - detractors) / npsBase) * 100;

    // Channel averages
    const channelAverages: Array<{ channel: string; averageScore: number; responseCount: number }> = [];
    try {
      const byChannel = new Map<string, { sum: number; count: number }>();
      for (const s of surveys) {
        if (!s.respondedAt) continue;
        const key = s.channel || 'unknown';
        const cur = byChannel.get(key) || { sum: 0, count: 0 };
        cur.sum += s.rating || 0;
        cur.count += 1;
        byChannel.set(key, cur);
      }
      for (const [channel, agg] of byChannel.entries()) {
        channelAverages.push({ channel, averageScore: agg.count ? Math.round((agg.sum / agg.count) * 100) / 100 : 0, responseCount: agg.count });
      }
    } catch { /* noop */ }

    // Simple channel trends by day (responses)
    const channelTrends: Array<{ channel: string; points: Array<{ date: string; value: number }> }> = [];
    try {
      const map = new Map<string, Map<string, number>>();
      for (const s of surveys) {
        if (!s.respondedAt) continue;
        const day = new Date(s.respondedAt).toISOString().slice(0, 10);
        const chan = s.channel || 'unknown';
        if (!map.has(chan)) map.set(chan, new Map());
        const byDay = map.get(chan)!;
        byDay.set(day, (byDay.get(day) || 0) + 1);
      }
      for (const [chan, byDay] of map.entries()) {
        const points = Array.from(byDay.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([date, value]) => ({ date, value }));
        channelTrends.push({ channel: chan, points });
      }
    } catch { /* noop */ }

    return {
      totalSent,
      totalResponded,
      responseRate: Math.round(responseRate * 100) / 100,
      averageRating: Math.round(averageRating * 100) / 100,
      ratingDistribution,
      channelBreakdown,
      // Extended metrics
      nps: Math.round(nps * 100) / 100,
      channelAverages,
      channelTrends,
      surveys: surveys.slice(0, 50), // Latest 50 for detailed view
    };
  }

  /**
   * Public survey details helper (used by controller)
   */
  async getSurveyDetailsPublic(surveyId: string) {
    try {
      const survey = await this.databaseService.customerSatisfactionSurvey.findFirst({
        where: { id: surveyId },
        select: {
          id: true,
          surveyType: true,
          metadata: true,
          respondedAt: true,
          customer: { select: { firstName: true, lastName: true } },
          ticket: { select: { id: true, subject: true } },
        },
      })

      if (!survey) {
        return { error: 'Survey not found or expired' }
      }

      if (survey.respondedAt) {
        return { error: 'Survey already completed' }
      }

      return {
        surveyId: survey.id,
        surveyType: survey.surveyType,
        questions: (survey.metadata as any)?.questions || [],
        customer: survey.customer,
        ticket: survey.ticket,
      }
    } catch (error) {
      this.logger.error('Failed to load survey details', error as any)
      return { error: 'Failed to load survey' }
    }
  }

  /**
   * Create survey record in database
   */
  private async createSurveyRecord(request: SatisfactionSurveyRequest) {
    const questions = request.customQuestions || this.getDefaultQuestions(request.surveyType);
    
    return this.databaseService.customerSatisfactionSurvey.create({
      data: {
        tenantId: request.tenantId,
        customerId: request.customerId,
        ticketId: request.ticketId,
        conversationId: request.conversationId,
        channel: request.channel,
        surveyType: request.surveyType || 'post_resolution',
        rating: 0, // Will be updated when response is received
        metadata: {
          questions,
          ...request.metadata,
        },
      },
    });
  }

  /**
   * Generate survey URL for email
   */
  private generateSurveyUrl(surveyId: string, tenantId: string): string {
    const baseUrl = this.configService.get<string>('APP_URL', 'https://app.glavito.com');
    return `${baseUrl}/survey/${surveyId}?tenant=${tenantId}`;
  }

  /**
   * Send survey email
   */
  private async sendSurveyEmail(params: {
    to: string;
    customerName: string;
    surveyUrl: string;
    tenantId: string;
    ticketId?: string;
  }): Promise<boolean> {
    try {
      // Get tenant branding
      const tenant = await this.databaseService.tenant.findUnique({
        where: { id: params.tenantId },
        select: { name: true, brandingConfig: true },
      });

      const companyName = tenant?.name || 'Support Team';
      const brandingConfig = (tenant?.brandingConfig as any) || {};

      // Email template
      const emailHtml = this.generateSurveyEmailTemplate({
        customerName: params.customerName,
        companyName,
        surveyUrl: params.surveyUrl,
        ticketId: params.ticketId,
        brandingConfig,
      });

      // Send via your email service (implement based on your email provider)
      const emailService = this.configService.get<string>('EMAIL_SERVICE', 'sendgrid');
      
      if (emailService === 'sendgrid') {
        return this.sendViaSendGrid({
          to: params.to,
          subject: `How was your experience with ${companyName}?`,
          html: emailHtml,
        });
      }

      // Fallback or other email services
      this.logger.warn(`Email service ${emailService} not implemented, marking as sent`);
      return true;
    } catch (error) {
      this.logger.error('Failed to send survey email:', error);
      return false;
    }
  }

  /**
   * Create WhatsApp Flow for survey using Meta Flows API
   * Reference: https://developers.facebook.com/blog/post/2024/03/06/creating-surveys-with-whatsapp-flows/
   */
  private async createWhatsAppSurveyFlow(
    request: SatisfactionSurveyRequest,
    surveyId: string
  ): Promise<WhatsAppFlowSurvey> {
    const questions = request.customQuestions || this.getDefaultQuestions(request.surveyType);

    const whatsappConfig = {
      accessToken: this.configService.get<string>('WHATSAPP_ACCESS_TOKEN'),
      businessAccountId: this.configService.get<string>('WHATSAPP_BUSINESS_ACCOUNT_ID') || 
                         this.configService.get<string>('WHATSAPP_BUSINESS_ID'), // Fallback for legacy env var name
      baseUrl: this.configService.get<string>('WHATSAPP_API_BASE_URL', 'https://graph.facebook.com/v18.0'),
    };

    if (!whatsappConfig.accessToken || !whatsappConfig.businessAccountId) {
      this.logger.warn('WhatsApp configuration missing, cannot create Flow');
      throw new Error('WhatsApp Business Account ID and Access Token are required');
    }

    try {
      // Step 1: Create Flow via Flows API
      // POST /{business-account-id}/flows
      const flowName = `survey_${surveyId.substring(0, 8)}_${Date.now()}`;
      const createFlowUrl = `${whatsappConfig.baseUrl}/${whatsappConfig.businessAccountId}/flows`;
      
      // Create form-urlencoded payload
      const flowCreationPayload = new URLSearchParams();
      flowCreationPayload.append('name', flowName);
      flowCreationPayload.append('categories', JSON.stringify(['SURVEY']));
      
      const createFlowResponse = await firstValueFrom(
        this.httpService.post(
          createFlowUrl,
          flowCreationPayload.toString(),
          {
            headers: {
              'Authorization': `Bearer ${whatsappConfig.accessToken}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )
      );

      const flowId = createFlowResponse.data?.id;
      if (!flowId) {
        throw new Error('Failed to create Flow: No flow ID returned');
      }

      this.logger.log(`Flow created with ID: ${flowId}`);

      // Step 2: Create Flow JSON structure according to WhatsApp Flows spec
      // Reference: https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson
    const flowJson = {
      version: "3.0",
      screens: [
        {
          id: "SURVEY_SCREEN",
          title: "Customer Satisfaction Survey",
            data: {
              // Store surveyId in screen data for reference
              surveyId: surveyId,
            },
          layout: {
            type: "SingleColumnLayout",
            children: [
              {
                type: "TextHeading",
                text: "How was your experience?"
              },
              {
                type: "TextBody",
                text: "We'd love to hear your feedback to help us improve our service."
              },
              ...questions.map((q, index) => this.createFlowQuestion(q, index)),
              {
                type: "Footer",
                label: "Submit Survey",
                "on-click-action": {
                  name: "complete",
                  payload: {
                      surveyId: surveyId,
                    ...questions.reduce((acc, q, index) => {
                        // Reference form fields using ${form.fieldName} syntax
                      acc[`answer_${index}`] = `\${form.answer_${index}}`;
                      return acc;
                    }, {} as Record<string, string>)
                  }
                }
              }
            ]
          }
        }
      ]
    };

      // Step 3: Upload Flow JSON as asset
      const uploadAssetsUrl = `${whatsappConfig.baseUrl}/${flowId}/assets`;
      
      // Use form-data for multipart upload
      let FormData: any;
      try {
        FormData = require('form-data');
      } catch {
        // Fallback: use native FormData if available (Node 18+)
        FormData = globalThis.FormData || require('form-data');
      }
      
      const formData = new FormData();
      formData.append('name', 'flow.json');
      formData.append('asset_type', 'FLOW_JSON');
      formData.append('file', Buffer.from(JSON.stringify(flowJson, null, 2)), {
        filename: 'flow.json',
        contentType: 'application/json',
      });

      const formHeaders = formData.getHeaders ? formData.getHeaders() : {};
      await firstValueFrom(
        this.httpService.post(uploadAssetsUrl, formData, {
          headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            ...formHeaders,
          },
        })
      );

      this.logger.log(`Flow JSON uploaded for Flow ID: ${flowId}`);

      // Step 4: Publish Flow
      const publishFlowUrl = `${whatsappConfig.baseUrl}/${flowId}/publish`;
      await firstValueFrom(
        this.httpService.post(
          publishFlowUrl,
          {},
          {
            headers: {
              'Authorization': `Bearer ${whatsappConfig.accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        )
      );

      this.logger.log(`Flow published: ${flowId}`);

    return {
      flowId,
      surveyData: {
        questions: questions.map(q => {
          const base = { id: q.id, text: q.question, type: q.type } as { id: string; text: string; type: 'rating' | 'text' | 'choice'; options?: string[] }
          if (q.type === 'choice' && 'options' in q && Array.isArray((q as any).options)) {
            base.options = (q as any).options as string[]
          }
          return base
        }),
      },
    };
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to create WhatsApp Flow';
      this.logger.error(`Failed to create WhatsApp Flow: ${errorMessage}`, error?.response?.data);
      throw new Error(`WhatsApp Flow creation failed: ${errorMessage}`);
    }
  }

  /**
   * Send WhatsApp Flow via interactive message
   * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/guides/flows/send-flow
   */
  private async sendWhatsAppFlow(params: {
    phoneNumber: string;
    flowId: string;
    customerName: string;
    tenantId: string;
  }): Promise<boolean> {
    try {
      const whatsappConfig = {
        accessToken: this.configService.get<string>('WHATSAPP_ACCESS_TOKEN'),
        phoneNumberId: this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID'),
        baseUrl: this.configService.get<string>('WHATSAPP_API_BASE_URL', 'https://graph.facebook.com/v18.0'),
      };

      if (!whatsappConfig.accessToken || !whatsappConfig.phoneNumberId) {
        this.logger.warn('WhatsApp configuration missing, cannot send Flow');
        throw new Error('WhatsApp Phone Number ID and Access Token are required');
      }

      // Normalize phone number (remove non-digits, ensure country code)
      const normalizedPhone = params.phoneNumber.replace(/\D/g, '');

      const url = `${whatsappConfig.baseUrl}/${whatsappConfig.phoneNumberId}/messages`;

      // Generate unique flow token for this survey instance
      // Flow token can be used to pass data to the flow, encoded as base64url
      const flowToken = Buffer.from(JSON.stringify({ 
        timestamp: Date.now(),
      })).toString('base64url');

      const payload = {
        messaging_product: 'whatsapp',
        to: normalizedPhone,
        type: 'interactive',
        interactive: {
          type: 'flow',
          header: {
            type: 'text',
            text: 'Customer Satisfaction Survey'
          },
          body: {
            text: `Hi ${params.customerName}! We'd love to get your feedback on your recent experience with us.`
          },
          footer: {
            text: 'Click below to start the survey'
          },
          action: {
            name: 'flow',
            parameters: {
              flow_message_version: '3',
              flow_token: flowToken,
              flow_id: params.flowId,
              flow_cta: 'Start Survey',
              flow_action: 'navigate',
              flow_action_payload: {
                screen: 'SURVEY_SCREEN'
              }
            }
          }
        }
      };

      const response = await firstValueFrom(
        this.httpService.post(url, payload, {
          headers: {
            'Authorization': `Bearer ${whatsappConfig.accessToken}`,
            'Content-Type': 'application/json',
          },
        })
      );

      const messageId = response.data?.messages?.[0]?.id;
      this.logger.log(`WhatsApp Flow sent successfully. Message ID: ${messageId}, Flow ID: ${params.flowId}`);
      return true;
    } catch (error: any) {
      const errorMessage = error?.response?.data?.error?.message || error?.message || 'Failed to send WhatsApp Flow';
      const errorCode = error?.response?.data?.error?.code;
      this.logger.error(`Failed to send WhatsApp Flow: ${errorMessage} (Code: ${errorCode})`, error?.response?.data);
      throw new Error(`WhatsApp Flow send failed: ${errorMessage}`);
    }
  }

  /**
   * Generate default survey questions
   */
  private getDefaultQuestions(surveyType?: string) {
    const baseQuestions = [
      {
        id: 'overall_satisfaction',
        question: 'How satisfied are you with our service?',
        type: 'rating' as const,
        required: true,
      },
      {
        id: 'recommendation',
        question: 'How likely are you to recommend us to others?',
        type: 'rating' as const,
        required: true,
      },
      {
        id: 'feedback',
        question: 'Any additional feedback or suggestions?',
        type: 'text' as const,
        required: false,
      },
    ];

    if (surveyType === 'post_resolution') {
      return [
        {
          id: 'resolution_satisfaction',
          question: 'How satisfied are you with how we resolved your issue?',
          type: 'rating' as const,
          required: true,
        },
        ...baseQuestions,
      ];
    }

    return baseQuestions;
  }

  /**
   * Create flow question component
   */
  private createFlowQuestion(question: any, index: number) {
    const baseComponent = {
      name: `answer_${index}`,
      required: question.required || false,
    };

    switch (question.type) {
      case 'rating':
        return {
          type: 'RadioButtonsGroup',
          ...baseComponent,
          label: question.question,
          'data-source': [
            { id: '0', title: '1 - Very Poor' },
            { id: '1', title: '2 - Poor' },
            { id: '2', title: '3 - Average' },
            { id: '3', title: '4 - Good' },
            { id: '4', title: '5 - Excellent' },
          ],
        };

      case 'choice':
        return {
          type: 'RadioButtonsGroup',
          ...baseComponent,
          label: question.question,
          'data-source': (question.options || []).map((option: string, i: number) => ({
            id: i.toString(),
            title: option,
          })),
        };

      case 'text':
      default:
        return {
          type: 'TextInput',
          ...baseComponent,
          label: question.question,
          'input-type': 'text',
        };
    }
  }

  /**
   * Generate survey email template
   */
  private generateSurveyEmailTemplate(params: {
    customerName: string;
    companyName: string;
    surveyUrl: string;
    ticketId?: string;
    brandingConfig: any;
  }): string {
    const primaryColor = params.brandingConfig?.colors?.primary || '#3B82F6';
    const logoUrl = params.brandingConfig?.logoUrl || '';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Customer Satisfaction Survey</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background-color: white; }
        .header { background: linear-gradient(135deg, ${primaryColor}, ${primaryColor}dd); padding: 40px 30px; text-align: center; }
        .logo { max-height: 50px; margin-bottom: 20px; }
        .header h1 { color: white; margin: 0; font-size: 28px; font-weight: 600; }
        .content { padding: 40px 30px; }
        .content h2 { color: #1f2937; margin: 0 0 20px 0; font-size: 24px; }
        .content p { color: #6b7280; line-height: 1.6; margin: 0 0 20px 0; }
        .cta-button { display: inline-block; background: ${primaryColor}; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
        .footer { background-color: #f9fafb; padding: 30px; text-align: center; color: #9ca3af; font-size: 14px; }
        .rating-preview { display: flex; justify-content: center; gap: 10px; margin: 20px 0; }
        .star { font-size: 24px; color: #fbbf24; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${logoUrl ? `<img src="${logoUrl}" alt="${params.companyName}" class="logo">` : ''}
            <h1>How was your experience?</h1>
        </div>
        
        <div class="content">
            <h2>Hi ${params.customerName}!</h2>
            
            <p>Thank you for choosing ${params.companyName}. We hope we were able to help you successfully${params.ticketId ? ` with your recent support request (#${params.ticketId})` : ''}.</p>
            
            <p>Your feedback is incredibly valuable to us and helps us improve our service. Could you take just 2 minutes to share your experience?</p>
            
            <div class="rating-preview">
                <span class="star">⭐</span>
                <span class="star">⭐</span>
                <span class="star">⭐</span>
                <span class="star">⭐</span>
                <span class="star">⭐</span>
            </div>
            
            <div style="text-align: center;">
                <a href="${params.surveyUrl}" class="cta-button">Take Survey (2 minutes)</a>
            </div>
            
            <p style="font-size: 14px; color: #9ca3af;">This survey will expire in 7 days. If you have any immediate concerns, please contact our support team directly.</p>
        </div>
        
        <div class="footer">
            <p>Thank you for being a valued customer!</p>
            <p>${params.companyName} Support Team</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  /**
   * Find or get conversation ID for customer and channel
   */
  private async findOrGetConversationId(
    tenantId: string,
    customerId: string,
    channel: 'whatsapp' | 'email',
    existingConversationId?: string | null
  ): Promise<string | null> {
    try {
      // If conversationId is provided, verify it exists
      if (existingConversationId) {
        const conv = await this.databaseService.conversation.findFirst({
          where: {
            id: existingConversationId,
            tenantId,
            customerId,
          },
        });
        if (conv) return conv.id;
      }

      // Find most recent active conversation for this customer and channel
      const channelRecord = await this.databaseService.channel.findFirst({
        where: {
          tenantId,
          type: channel,
          isActive: true,
        },
      });

      if (!channelRecord) {
        this.logger.warn(`No active ${channel} channel found for tenant ${tenantId}`);
        return null;
      }

      const conversation = await this.databaseService.conversation.findFirst({
        where: {
          tenantId,
          customerId,
          channelId: channelRecord.id,
          status: { in: ['active', 'waiting'] },
        },
        orderBy: { updatedAt: 'desc' },
      });

      return conversation?.id || null;
    } catch (error) {
      this.logger.warn('Failed to find conversation:', error);
      return null;
    }
  }

  /**
   * Create system message when survey is sent
   */
  private async createSurveySentMessage(
    tenantId: string,
    customerId: string,
    conversationId: string | undefined | null,
    surveyId: string,
    channel: 'whatsapp' | 'email'
  ): Promise<void> {
    try {
      const convId = await this.findOrGetConversationId(tenantId, customerId, channel, conversationId);
      if (!convId) {
        this.logger.debug(`No conversation found for survey ${surveyId}, skipping message creation`);
        return;
      }

      const channelName = channel === 'whatsapp' ? 'WhatsApp' : 'Email';
      const content = `📋 Customer Satisfaction Survey sent via ${channelName}\n\nSurvey ID: ${surveyId.substring(0, 8)}...`;

      await this.databaseService.message.create({
        data: {
          conversationId: convId,
          senderId: 'system',
          senderType: 'system',
          content,
          messageType: 'text',
          metadata: {
            surveyId,
            surveyEvent: 'sent',
            channel,
          },
        },
      });

      this.logger.debug(`Survey sent message created in conversation ${convId}`);
    } catch (error) {
      this.logger.warn('Failed to create survey sent message:', error);
    }
  }

  /**
   * Create system message when survey response is received
   */
  private async createSurveyResponseMessage(
    tenantId: string,
    customerId: string,
    conversationId: string | undefined | null,
    surveyId: string,
    rating: number,
    comment?: string,
    customAnswers?: Record<string, unknown>,
    channel = 'whatsapp'
  ): Promise<void> {
    try {
      const convId = await this.findOrGetConversationId(
        tenantId,
        customerId,
        channel === 'whatsapp' ? 'whatsapp' : 'email',
        conversationId
      );
      if (!convId) {
        this.logger.debug(`No conversation found for survey ${surveyId}, skipping response message creation`);
        return;
      }

      // Format survey response message
      const stars = '⭐'.repeat(rating);
      const emptyStars = '☆'.repeat(5 - rating);
      const parts = [
        `📋 Customer Satisfaction Survey Response`,
        ``,
        `Rating: ${stars}${emptyStars} ${rating}/5`,
      ];

      if (comment) {
        parts.push(``, `Comment: "${comment}"`);
      }

      // Add custom answers if available
      if (customAnswers && Object.keys(customAnswers).length > 0) {
        const questions = await this.databaseService.customerSatisfactionSurvey.findFirst({
          where: { id: surveyId },
          select: { metadata: true },
        });
        const surveyMetadata = (questions?.metadata as any) || {};
        const surveyQuestions = surveyMetadata.questions || [];

        const customAnswersList: string[] = [];
        Object.entries(customAnswers).forEach(([key, value]) => {
          if (key.startsWith('answer_')) {
            const questionIndex = parseInt(key.replace('answer_', ''));
            const question = surveyQuestions[questionIndex];
            const questionText = question?.question || `Question ${questionIndex + 1}`;
            
            // Format value based on type
            let formattedValue = String(value);
            if (question?.type === 'rating' && typeof value === 'string' && /^\d+$/.test(value)) {
              const ratingValue = parseInt(value) + 1; // Convert 0-4 to 1-5
              formattedValue = `${ratingValue}/5 ⭐`;
            }
            
            customAnswersList.push(`• ${questionText}: ${formattedValue}`);
          }
        });

        if (customAnswersList.length > 0) {
          parts.push(``, `Additional Responses:`, ...customAnswersList);
        }
      }

      parts.push(``, `✅ Thank you for your feedback!`);

      const content = parts.join('\n');

      await this.databaseService.message.create({
        data: {
          conversationId: convId,
          senderId: 'system',
          senderType: 'system',
          content,
          messageType: 'text',
          metadata: {
            surveyId,
            surveyEvent: 'response_received',
            rating,
            comment,
            customAnswers: customAnswers || {},
            channel,
          } as any,
        },
      });

      this.logger.debug(`Survey response message created in conversation ${convId}`);
    } catch (error) {
      this.logger.warn('Failed to create survey response message:', error);
    }
  }

  /**
   * Send email via SendGrid
   */
  private async sendViaSendGrid(params: {
    to: string;
    subject: string;
    html: string;
  }): Promise<boolean> {
    try {
      const sendgridApiKey = this.configService.get<string>('SENDGRID_API_KEY');
      const fromEmail = this.configService.get<string>('FROM_EMAIL', 'noreply@glavito.com');

      if (!sendgridApiKey) {
        this.logger.warn('SendGrid API key not configured, marking email as sent');
        return true;
      }

      const payload = {
        personalizations: [{ to: [{ email: params.to }] }],
        from: { email: fromEmail },
        subject: params.subject,
        content: [{ type: 'text/html', value: params.html }],
      };

      await firstValueFrom(
        this.httpService.post('https://api.sendgrid.com/v3/mail/send', payload, {
          headers: {
            'Authorization': `Bearer ${sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
        })
      );

      return true;
    } catch (error) {
      this.logger.error('SendGrid email failed:', error);
      return false;
    }
  }
}