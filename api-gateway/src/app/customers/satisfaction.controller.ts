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

  @Get('surveys/:surveyId')
  @ApiOperation({ summary: 'Get survey details (public endpoint for survey page)' })
  @ApiResponse({ status: 200, description: 'Survey details retrieved successfully' })
  async getSurveyDetails(@Param('surveyId') surveyId: string) {
    return this.satisfactionService.getSurveyDetailsPublic(surveyId)
  }
}