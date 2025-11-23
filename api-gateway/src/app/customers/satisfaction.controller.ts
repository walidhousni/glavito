import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, PermissionsGuard } from '@glavito/shared-auth';
import { Roles, Permissions } from '@glavito/shared-auth';
import { CustomerSatisfactionService, SatisfactionSurveyRequest, SatisfactionResponse } from './customer-satisfaction.service';

@ApiTags('Customer Satisfaction')
@Controller('satisfaction')
export class SatisfactionController {
  constructor(
    private readonly satisfactionService: CustomerSatisfactionService,
  ) {}

  @Post('surveys/email')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'agent')
  @Permissions('customers.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send satisfaction survey via email' })
  @ApiResponse({ status: 201, description: 'Email survey sent successfully' })
  async sendEmailSurvey(
    @Body() request: Omit<SatisfactionSurveyRequest, 'tenantId'>,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.satisfactionService.sendEmailSurvey({
      ...request,
      tenantId,
      channel: 'email',
    });
  }

  @Post('surveys/whatsapp')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'agent')
  @Permissions('customers.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send satisfaction survey via WhatsApp Flow' })
  @ApiResponse({ status: 201, description: 'WhatsApp Flow survey sent successfully' })
  async sendWhatsAppSurvey(
    @Body() request: Omit<SatisfactionSurveyRequest, 'tenantId'>,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.satisfactionService.sendWhatsAppFlowSurvey({
      ...request,
      tenantId,
      channel: 'whatsapp',
    });
  }

  // Typeform webhook (public)
  @Post('typeform/webhook')
  @ApiOperation({ summary: 'Receive Typeform webhook for satisfaction surveys (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  async typeformWebhook(
    @Body()
    body: {
      form_response?: {
        hidden?: Record<string, string>;
        answers?: Array<{ field?: { id?: string; ref?: string }; type?: string; number?: number; text?: string }>; // minimal subset
      };
      surveyId?: string; // fallback
      rating?: number; // fallback
      comment?: string; // fallback
    },
  ) {
    // Try to extract surveyId from hidden fields or body
    const surveyId = body?.form_response?.hidden?.surveyId || body?.surveyId;
    if (!surveyId) {
      return { success: false, error: 'Missing surveyId' };
    }

    let rating: number | undefined = body?.rating;
    let comment: string | undefined = body?.comment;
    const customAnswers: Record<string, unknown> = {};

    try {
      const answers = body?.form_response?.answers || [];
      for (const a of answers) {
        const key = a?.field?.ref || a?.field?.id || 'q';
        if (a?.type === 'number' && typeof a.number === 'number' && rating === undefined) {
          rating = a.number;
        } else if (a?.type === 'text' && typeof a.text === 'string' && !comment) {
          comment = a.text;
        } else {
          customAnswers[key] = (a as any)[a?.type || 'value'];
        }
      }
    } catch { /* ignore parsing issues */ }

    // Clamp rating to 1-5 if provided
    if (typeof rating === 'number') {
      rating = Math.max(1, Math.min(5, Math.round(rating)));
    }

    await this.satisfactionService.processSurveyResponse(
      surveyId,
      typeof rating === 'number' ? rating : 5,
      comment,
      customAnswers,
    );
    return { success: true };
  }

  @Post('surveys/:surveyId/response')
  @ApiOperation({ summary: 'Submit survey response (public endpoint)' })
  @ApiResponse({ status: 200, description: 'Survey response recorded successfully' })
  async submitSurveyResponse(
    @Param('surveyId') surveyId: string,
    @Body() response: {
      rating: number;
      comment?: string;
      customAnswers?: Record<string, unknown>;
    },
  ): Promise<SatisfactionResponse> {
    return this.satisfactionService.processSurveyResponse(
      surveyId,
      response.rating,
      response.comment,
      response.customAnswers,
    );
  }

  @Get('surveys/customer/:customerId')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'agent')
  @Permissions('customers.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get customer satisfaction surveys' })
  @ApiResponse({ status: 200, description: 'Customer surveys retrieved successfully' })
  async getCustomerSurveys(
    @Param('customerId') customerId: string,
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId;
    return this.satisfactionService.getCustomerSurveys(tenantId, customerId);
  }

  @Get('analytics')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin')
  @Permissions('analytics.read')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get satisfaction survey analytics' })
  @ApiResponse({ status: 200, description: 'Survey analytics retrieved successfully' })
  async getSurveyAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('channel') channel?: string,
    @Query('surveyType') surveyType?: string,
    @Req() req?: any,
  ) {
    const tenantId = req?.user?.tenantId;
    const filters: any = {};

    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (channel) filters.channel = channel;
    if (surveyType) filters.surveyType = surveyType;

    return this.satisfactionService.getSurveyAnalytics(tenantId, filters);
  }

  @Post('surveys/segment')
  @UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('admin', 'agent')
  @Permissions('customers.update')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send satisfaction survey to a segment/list' })
  @ApiResponse({ status: 201, description: 'Surveys sent to segment successfully' })
  async sendSurveyToSegment(
    @Body() request: {
      segmentId: string;
      channel: 'email' | 'whatsapp';
      surveyType?: 'post_resolution' | 'periodic' | 'manual';
      customQuestions?: Array<{
        id: string;
        question: string;
        type: 'rating' | 'text' | 'choice';
        required?: boolean;
        options?: string[];
      }>;
    },
    @Req() req: any,
  ) {
    const tenantId = req?.user?.tenantId;
    // Get customers from segment
    const segmentMembers = await this.satisfactionService.getSegmentMembers(tenantId, request.segmentId);
    
    const results = await Promise.allSettled(
      segmentMembers.map((customerId: string) =>
        request.channel === 'whatsapp'
          ? this.satisfactionService.sendWhatsAppFlowSurvey({
              tenantId,
              customerId,
              channel: 'whatsapp',
              surveyType: request.surveyType || 'manual',
              customQuestions: request.customQuestions,
            })
          : this.satisfactionService.sendEmailSurvey({
              tenantId,
              customerId,
              channel: 'email',
              surveyType: request.surveyType || 'manual',
              customQuestions: request.customQuestions,
            })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return {
      success: true,
      total: segmentMembers.length,
      successful,
      failed,
      results: results.map((r, idx) => ({
        customerId: segmentMembers[idx],
        status: r.status === 'fulfilled' ? 'sent' : 'failed',
        error: r.status === 'rejected' ? (r.reason as Error)?.message : undefined,
      })),
    };
  }

  @Get('surveys/:surveyId')
  @ApiOperation({ summary: 'Get survey details (public endpoint for survey page)' })
  @ApiResponse({ status: 200, description: 'Survey details retrieved successfully' })
  async getSurveyDetails(@Param('surveyId') surveyId: string) {
    return this.satisfactionService.getSurveyDetailsPublic(surveyId)
  }
}