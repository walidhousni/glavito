/* eslint-disable no-useless-catch */
/**
 * Onboarding Controller
 * Handles HTTP endpoints for the onboarding system
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
import { ProgressTrackingService } from './progress-tracking.service';
import { ConnectionTestingService, TestConfiguration } from './connection-testing.service';
import { OnboardingGateway } from './onboarding.gateway';
import type {
  OnboardingSession,
  OnboardingProgress,
  OnboardingStep,
  StepConfiguration,
  StepResult,
  CompletionResult,
  StartOnboardingRequest,
  UpdateStepRequest,
  OnboardingType,
  OnboardingRole,
  TenantSetupStatus,
  AgentWelcomeStatus,
  AgentInvitationContext,
  PaymentSetupRequest,
} from '@glavito/shared-types';

@ApiTags('onboarding')
@Controller('onboarding')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OnboardingController {
  private readonly logger = new Logger(OnboardingController.name);

  constructor(
    private readonly onboardingService: OnboardingService,
    private readonly progressTrackingService: ProgressTrackingService,
    private readonly connectionTestingService: ConnectionTestingService,
    private readonly onboardingGateway: OnboardingGateway,
  ) {}

  @Post('start')
  @ApiOperation({ summary: 'Start a new onboarding session' })
  @ApiResponse({ status: 201, description: 'Onboarding session started successfully' })
  async startOnboarding(
    @Request() req: { user: any },
    @Body() request?: StartOnboardingRequest
  ): Promise<OnboardingSession> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      const tenantId = req.user?.tenantId as string;
      this.logger.log(`Starting onboarding for user: ${userId}, tenant: ${tenantId}`);

      const session = await this.onboardingService.startOnboarding(userId, tenantId, request);

      // Broadcast session start to connected clients
      this.onboardingGateway.server
        .to(`user:${userId}`)
        .emit('onboarding_started', {
          sessionId: session.id,
          currentStep: session.currentStep,
          timestamp: new Date(),
        });

      return session;
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to start onboarding: ${message}`);
      throw new HttpException(
        `Failed to start onboarding: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Get onboarding session details' })
  @ApiResponse({ status: 200, description: 'Session details retrieved successfully' })
  async getSession(@Param('sessionId') sessionId: string): Promise<OnboardingSession> {
    try {
      return await this.onboardingService.getSessionById(sessionId);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get session: ${message}`);
      throw new HttpException(
        `Failed to get session: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('progress/:sessionId')
  @ApiOperation({ summary: 'Get onboarding progress' })
  @ApiResponse({ status: 200, description: 'Progress retrieved successfully' })
  async getProgress(@Param('sessionId') sessionId: string): Promise<OnboardingProgress> {
    try {
      return await this.onboardingService.getOnboardingProgress(sessionId);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get progress: ${message}`);
      throw new HttpException(
        `Failed to get progress: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current onboarding status for the authenticated user' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getStatus(@Request() req: { user: any }): Promise<{ session: OnboardingSession; progress: OnboardingProgress }> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      const tenantId = req.user?.tenantId as string;
      return await this.onboardingService.getOnboardingStatus(userId, tenantId);
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get status: ${message}`);
      throw new HttpException(
        `Failed to get status: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Put('step/:sessionId/:stepId')
  @ApiOperation({ summary: 'Update step progress' })
  @ApiResponse({ status: 200, description: 'Step updated successfully' })
  async updateStep(
    @Param('sessionId') sessionId: string,
    @Param('stepId') stepId: OnboardingStep,
    @Body() data: Record<string, unknown>,
    @Request() req: { user: any }
  ): Promise<StepResult> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      this.logger.log(`Updating step ${stepId} for session: ${sessionId}`);

      const result = await this.onboardingService.updateStepProgress(sessionId, stepId, data);

      if (result.success) {
        // Broadcast step completion to connected clients
        this.onboardingGateway.broadcastStepCompleted(
          sessionId,
          userId,
          stepId,
          result.nextStep
        );
      } else {
        // Broadcast validation errors
        this.onboardingGateway.broadcastValidationError(
          sessionId,
          userId,
          result.errors || []
        );
      }

      return result;
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update step: ${message}`);
      throw new HttpException(
        `Failed to update step: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Alias to support frontend client that sends stepId in the body instead of URL
  @Put('step/:sessionId')
  @ApiOperation({ summary: 'Update step progress (body stepId variant)' })
  @ApiResponse({ status: 200, description: 'Step updated successfully' })
  async updateStepBody(
    @Param('sessionId') sessionId: string,
    @Body() body: UpdateStepRequest,
    @Request() req: { user: any }
  ): Promise<StepResult> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      const { stepId, data } = body as { stepId: OnboardingStep; data: Record<string, unknown> };
      this.logger.log(`Updating step ${stepId} for session: ${sessionId} (body variant)`);

      const result = await this.onboardingService.updateStepProgress(sessionId, stepId, data);

      if (result.success) {
        this.onboardingGateway.broadcastStepCompleted(sessionId, userId, stepId, result.nextStep);
      } else {
        this.onboardingGateway.broadcastValidationError(sessionId, userId, result.errors || []);
      }

      return result;
    } catch (error: unknown) {
      // Auto-recover if session was not active; try resume then retry once
      if (error instanceof HttpException && /not active|paused/i.test(error.message)) {
        try {
          await this.onboardingService.resumeOnboarding(sessionId);
          const { stepId, data } = body as { stepId: OnboardingStep; data: Record<string, unknown> };
          const retry = await this.onboardingService.updateStepProgress(sessionId, stepId, data);
          return retry;
        } catch (retryErr) {
          throw retryErr;
        }
      }
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update step: ${message}`);
      throw new HttpException(
        `Failed to update step: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('step/:stepId/configuration')
  @ApiOperation({ summary: 'Get step configuration' })
  @ApiResponse({ status: 200, description: 'Step configuration retrieved successfully' })
  async getStepConfiguration(@Param('stepId') stepId: OnboardingStep): Promise<StepConfiguration> {
    try {
      return await this.onboardingService.getStepConfiguration(stepId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get step configuration: ${message}`);
      throw new HttpException(
        `Failed to get step configuration: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Alias to match frontend client path `/onboarding/step/:stepId/config`
  @Get('step/:stepId/config')
  @ApiOperation({ summary: 'Get step configuration (alias)' })
  @ApiResponse({ status: 200, description: 'Step configuration retrieved successfully' })
  async getStepConfigurationAlias(@Param('stepId') stepId: OnboardingStep): Promise<StepConfiguration> {
    try {
      return await this.onboardingService.getStepConfiguration(stepId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get step configuration: ${message}`);
      throw new HttpException(
        `Failed to get step configuration: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('pause/:sessionId')
  @ApiOperation({ summary: 'Pause onboarding session' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  async pauseOnboarding(@Param('sessionId') sessionId: string): Promise<{ success: boolean }> {
    try {
      await this.onboardingService.pauseOnboarding(sessionId);
      return { success: true };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to pause onboarding: ${message}`);
      throw new HttpException(
        `Failed to pause onboarding: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Allow PUT for idempotent pause from client
  @Put('pause/:sessionId')
  @ApiOperation({ summary: 'Pause onboarding session (PUT alias)' })
  @ApiResponse({ status: 200, description: 'Session paused successfully' })
  async pauseOnboardingPut(@Param('sessionId') sessionId: string): Promise<{ success: boolean }> {
    return this.pauseOnboarding(sessionId);
  }

  @Post('resume/:sessionId')
  @ApiOperation({ summary: 'Resume onboarding session' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  async resumeOnboarding(@Param('sessionId') sessionId: string): Promise<OnboardingSession> {
    try {
      return await this.onboardingService.resumeOnboarding(sessionId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to resume onboarding: ${message}`);
      throw new HttpException(
        `Failed to resume onboarding: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Allow PUT for idempotent resume from client
  @Put('resume/:sessionId')
  @ApiOperation({ summary: 'Resume onboarding session (PUT alias)' })
  @ApiResponse({ status: 200, description: 'Session resumed successfully' })
  async resumeOnboardingPut(@Param('sessionId') sessionId: string): Promise<OnboardingSession> {
    return this.resumeOnboarding(sessionId);
  }

  @Post('complete/:sessionId')
  @ApiOperation({ summary: 'Complete onboarding session' })
  @ApiResponse({ status: 200, description: 'Onboarding completed successfully' })
  async completeOnboarding(
    @Param('sessionId') sessionId: string,
    @Request() req: { user: any },
    @Query('force') force?: string
  ): Promise<CompletionResult> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      this.logger.log(`Completing onboarding for session: ${sessionId}`);

      const forceFlag = String(force || '').toLowerCase() === 'true';
      const result = await this.onboardingService.completeOnboarding(sessionId, forceFlag);

      if (result.success) {
        // Broadcast completion to connected clients
        this.onboardingGateway.broadcastOnboardingCompleted(
          sessionId,
          userId,
          result.summary
        );
      }

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to complete onboarding: ${message}`);
      throw new HttpException(
        `Failed to complete onboarding: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('test-connections/:sessionId')
  @ApiOperation({ summary: 'Test multiple connections' })
  @ApiResponse({ status: 200, description: 'Connection tests completed' })
  async testConnections(
    @Param('sessionId') sessionId: string,
    @Body() configurations: TestConfiguration[],
    @Request() req: { user: any }
  ) {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      this.logger.log(`Testing ${configurations.length} connections for session: ${sessionId}`);

      const results = await this.connectionTestingService.testConnections(sessionId, configurations);

      // Broadcast test results to connected clients
      for (const result of results) {
        this.onboardingGateway.broadcastConnectionTest(sessionId, userId, result.channel, result);
      }

      return {
        success: true,
        results,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to test connections: ${message}`);
      throw new HttpException(
        `Failed to test connections: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('test-connection/:sessionId')
  @ApiOperation({ summary: 'Test a single connection' })
  @ApiResponse({ status: 200, description: 'Connection test completed' })
  async testSingleConnection(
    @Param('sessionId') sessionId: string,
    @Body() configuration: import('./connection-testing.service').TestConfiguration,
    @Request() req: { user: any }
  ) {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      this.logger.log(`Testing ${configuration.channel} connection for session: ${sessionId}`);

      const result = await this.connectionTestingService.testSingleConnection(sessionId, configuration);

      // Broadcast test result to connected clients
      this.onboardingGateway.broadcastConnectionTest(sessionId, userId, result.channel, result);

      return {
        success: true,
        result,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to test connection: ${message}`);
      throw new HttpException(
        `Failed to test connection: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get onboarding statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStatistics(
    @Request() req: { user: { tenantId: string } },
    @Query('tenantId') tenantId?: string
  ) {
    try {
      // Use tenant from JWT if not provided in query
      const targetTenantId = tenantId || req.user.tenantId;
      
      return await this.progressTrackingService.getOnboardingStatistics(targetTenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get statistics: ${message}`);
      throw new HttpException(
        `Failed to get statistics: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('validate-step/:stepId')
  @ApiOperation({ summary: 'Validate step data' })
  @ApiResponse({ status: 200, description: 'Step validation completed' })
  async validateStep(
    @Param('stepId') stepId: OnboardingStep,
    @Query('sessionId') sessionId: string,
    @Body() data: Record<string, unknown>
  ) {
    try {
      return await this.progressTrackingService.validateStepCompletion(sessionId, stepId, data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to validate step: ${message}`);
      throw new HttpException(
        `Failed to validate step: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('connection-history/:sessionId')
  @ApiOperation({ summary: 'Get connection test history' })
  @ApiResponse({ status: 200, description: 'Connection test history retrieved successfully' })
  async getConnectionHistory(@Param('sessionId') sessionId: string) {
    try {
      return await this.connectionTestingService.getConnectionTestHistory(sessionId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get connection history: ${message}`);
      throw new HttpException(
        `Failed to get connection history: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('validate-connection-config')
  @ApiOperation({ summary: 'Validate connection configuration' })
  @ApiResponse({ status: 200, description: 'Configuration validation completed' })
  async validateConnectionConfig(
    @Body() request: { channel: string; config: Record<string, unknown> }
  ) {
    try {
      return this.connectionTestingService.validateConnectionConfig(request.channel, request.config);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to validate connection config: ${message}`);
      throw new HttpException(
        `Failed to validate connection config: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('session-clients/:sessionId')
  @ApiOperation({ summary: 'Get connected clients count for session' })
  @ApiResponse({ status: 200, description: 'Client count retrieved successfully' })
  async getSessionClientCount(@Param('sessionId') sessionId: string) {
    try {
      const clientCount = this.onboardingGateway.getSessionClientCount(sessionId);
      return {
        sessionId,
        connectedClients: clientCount,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get session client count: ${message}`);
      throw new HttpException(
        `Failed to get session client count: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('user-clients/:userId')
  @ApiOperation({ summary: 'Get connected clients count for user' })
  @ApiResponse({ status: 200, description: 'Client count retrieved successfully' })
  async getUserClientCount(@Param('userId') userId: string) {
    try {
      const clientCount = this.onboardingGateway.getUserClientCount(userId);
      return {
        userId,
        connectedClients: clientCount,
        timestamp: new Date(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get user client count: ${message}`);
      throw new HttpException(
        `Failed to get user client count: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Two-Tier Onboarding Endpoints

  @Get('type')
  @ApiOperation({ summary: 'Get onboarding type and role for current user' })
  @ApiResponse({ status: 200, description: 'Onboarding type retrieved successfully' })
  async getOnboardingType(@Request() req: { user: any }): Promise<{
    type: OnboardingType;
    role: OnboardingRole;
    isTenantOwner: boolean;
  }> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      const tenantId = req.user?.tenantId as string;
      return await this.onboardingService.getOnboardingType(userId, tenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get onboarding type: ${message}`);
      throw new HttpException(
        `Failed to get onboarding type: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('tenant-setup/status')
  @ApiOperation({ summary: 'Get tenant setup status' })
  @ApiResponse({ status: 200, description: 'Tenant setup status retrieved successfully' })
  async getTenantSetupStatus(@Request() req: { user: any }): Promise<TenantSetupStatus> {
    try {
      const tenantId = req.user?.tenantId as string;
      return await this.onboardingService.getTenantSetupStatus(tenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get tenant setup status: ${message}`);
      throw new HttpException(
        `Failed to get tenant setup status: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('agent-welcome/status/:userId')
  @ApiOperation({ summary: 'Get agent welcome status' })
  @ApiResponse({ status: 200, description: 'Agent welcome status retrieved successfully' })
  async getAgentWelcomeStatus(@Param('userId') userId: string): Promise<AgentWelcomeStatus> {
    try {
      return await this.onboardingService.getAgentWelcomeStatus(userId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get agent welcome status: ${message}`);
      throw new HttpException(
        `Failed to get agent welcome status: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('agent-welcome/start')
  @ApiOperation({ summary: 'Start agent welcome onboarding' })
  @ApiResponse({ status: 201, description: 'Agent welcome onboarding started successfully' })
  async startAgentWelcome(
    @Request() req: { user: any },
    @Body() context: AgentInvitationContext
  ): Promise<OnboardingSession> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      const tenantId = req.user?.tenantId as string;
      this.logger.log(`Starting agent welcome onboarding for user: ${userId}`);

      const session = await this.onboardingService.startAgentWelcome(userId, tenantId, context);

      // Broadcast session start to connected clients
      this.onboardingGateway.server
        .to(`user:${userId}`)
        .emit('agent_welcome_started', {
          sessionId: session.id,
          currentStep: session.currentStep,
          timestamp: new Date(),
        });

      return session;
    } catch (error: unknown) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to start agent welcome: ${message}`);
      throw new HttpException(
        `Failed to start agent welcome: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('tenant-setup/complete')
  @ApiOperation({ summary: 'Complete tenant setup' })
  @ApiResponse({ status: 200, description: 'Tenant setup completed successfully' })
  async completeTenantSetup(@Request() req: { user: any }): Promise<{ success: boolean; message: string }> {
    try {
      const userId = req.user?.id ?? req.user?.userId;
      const tenantId = req.user?.tenantId as string;
      this.logger.log(`Completing tenant setup for tenant: ${tenantId}`);

      const result = await this.onboardingService.completeTenantSetup(tenantId, userId);

      // Broadcast tenant setup completion
      this.onboardingGateway.server
        .to(`tenant:${tenantId}`)
        .emit('tenant_setup_completed', {
          tenantId,
          completedBy: userId,
          completedAt: new Date(),
        });

      return result;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to complete tenant setup: ${message}`);
      throw new HttpException(
        `Failed to complete tenant setup: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('step/:stepId/config')
  @ApiOperation({ summary: 'Get step configuration with type support' })
  @ApiResponse({ status: 200, description: 'Step configuration retrieved successfully' })
  async getStepConfigurationWithType(
    @Param('stepId') stepId: OnboardingStep,
    @Query('type') type?: OnboardingType
  ): Promise<StepConfiguration> {
    try {
      return await this.onboardingService.getStepConfiguration(stepId, type);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get step configuration: ${message}`);
      throw new HttpException(
        `Failed to get step configuration: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // Payment Integration Endpoints

  @Post('payment/setup')
  @ApiOperation({ summary: 'Setup payment integration during onboarding' })
  @ApiResponse({ status: 201, description: 'Payment setup created successfully' })
  async setupPayment(
    @Request() req: { user: any },
    @Body() request: PaymentSetupRequest
  ) {
    try {
      const { tenantId } = req.user;
      return await this.onboardingService.setupPaymentIntegration(tenantId, request);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to setup payment: ${message}`);
      throw new HttpException(
        `Failed to setup payment: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('payment/status')
  @ApiOperation({ summary: 'Get payment status during onboarding' })
  @ApiResponse({ status: 200, description: 'Payment status retrieved successfully' })
  async getPaymentStatus(@Request() req: { user: any }) {
    try {
      const { tenantId } = req.user;
      return await this.onboardingService.getPaymentStatus(tenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get payment status: ${message}`);
      throw new HttpException(
        `Failed to get payment status: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post('payment/account-link')
  @ApiOperation({ summary: 'Create account onboarding link during onboarding' })
  @ApiResponse({ status: 201, description: 'Account onboarding link created successfully' })
  async createPaymentAccountLink(@Request() req: { user: any }) {
    try {
      const { tenantId } = req.user;
      return await this.onboardingService.createPaymentAccountLink(tenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create payment account link: ${message}`);
      throw new HttpException(
        `Failed to create payment account link: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('payment/account')
  @ApiOperation({ summary: 'Get Stripe account during onboarding' })
  @ApiResponse({ status: 200, description: 'Stripe account information retrieved successfully' })
  async getStripeAccount(@Request() req: { user: any }) {
    try {
      const { tenantId } = req.user;
      return await this.onboardingService.getStripeAccount(tenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get Stripe account: ${message}`);
      throw new HttpException(
        `Failed to get Stripe account: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('payment/billing-config')
  @ApiOperation({ summary: 'Get billing configuration during onboarding' })
  @ApiResponse({ status: 200, description: 'Billing configuration retrieved successfully' })
  async getBillingConfiguration(@Request() req: { user: any }) {
    try {
      const { tenantId } = req.user;
      return await this.onboardingService.getBillingConfiguration(tenantId);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to get billing configuration: ${message}`);
      throw new HttpException(
        `Failed to get billing configuration: ${message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}