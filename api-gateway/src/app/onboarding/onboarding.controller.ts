/**
 * Onboarding Controller
 * REST API endpoints for onboarding management
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OnboardingService } from './onboarding.service';
import type { StartOnboardingRequest, UpdateStepRequest, OnboardingStep } from './onboarding.service';

@ApiTags('onboarding')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @Post('start')
  @ApiOperation({ summary: 'Start new onboarding session' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Onboarding session started successfully',
  })
  async startOnboarding(@Request() req: any, @Body() request: StartOnboardingRequest) {
    const userId: string = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    const tenantId: string = req.user?.tenantId;
    
    console.log('[OnboardingController] Received start request:', {
      userId,
      tenantId,
      requestBody: request,
      userObject: req.user
    });
    
    if (!userId || !tenantId) {
      console.error('[OnboardingController] Missing userId or tenantId:', { userId, tenantId });
      throw new BadRequestException('Missing user ID or tenant ID');
    }
    
    if (!request || !request.type || !request.role) {
      console.error('[OnboardingController] Invalid request body:', request);
      throw new BadRequestException('Request must include type and role');
    }
    
    return this.onboardingService.startOnboarding(userId, tenantId, request);
  }

  @Get('status')
  @ApiOperation({ summary: 'Get current onboarding status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding status retrieved successfully',
  })
  async getOnboardingStatus(@Request() req: any) {
    const userId: string = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    const tenantId: string = req.user?.tenantId;
    const status = await this.onboardingService.getOnboardingStatus(userId, tenantId);
    
    return {
      data: status,
      hasActiveSession: status !== null && status.status === 'active',
    };
  }

  @Get('type')
  @ApiOperation({ summary: 'Determine onboarding type for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding type determined successfully',
  })
  async getOnboardingType(@Request() req: any) {
    const userId: string = req.user?.id ?? req.user?.userId ?? req.user?.sub;
    const tenantId: string = req.user?.tenantId;
    return this.onboardingService.determineOnboardingType(userId, tenantId);
  }

  @Put('step/:sessionId')
  @ApiOperation({ summary: 'Update step data and progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step updated successfully',
  })
  async updateStep(
    @Param('sessionId') sessionId: string,
    @Body() request: UpdateStepRequest
  ) {
    return this.onboardingService.updateStep(sessionId, request);
  }

  @Put('skip/:sessionId/:stepId')
  @ApiOperation({ summary: 'Skip a step' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step skipped successfully',
  })
  async skipStep(
    @Param('sessionId') sessionId: string,
    @Param('stepId') stepId: OnboardingStep
  ) {
    return this.onboardingService.skipStep(sessionId, stepId);
  }

  @Post('complete/:sessionId')
  @ApiOperation({ summary: 'Complete onboarding' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding completed successfully',
  })
  async completeOnboarding(
    @Param('sessionId') sessionId: string,
    @Query('force') force?: string
  ) {
    return this.onboardingService.completeOnboarding(sessionId);
  }

  @Put('pause/:sessionId')
  @ApiOperation({ summary: 'Pause onboarding session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding paused successfully',
  })
  async pauseOnboarding(@Param('sessionId') sessionId: string) {
    return this.onboardingService.pauseOnboarding(sessionId);
  }

  @Put('resume/:sessionId')
  @ApiOperation({ summary: 'Resume onboarding session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding resumed successfully',
  })
  async resumeOnboarding(@Param('sessionId') sessionId: string) {
    return this.onboardingService.resumeOnboarding(sessionId);
  }

  @Put('fix/:sessionId')
  @ApiOperation({ summary: 'Fix session type mismatch' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Session fixed successfully',
  })
  async fixSession(
    @Param('sessionId') sessionId: string,
    @Body() body: { type: string; role: string }
  ) {
    return this.onboardingService.fixSessionType(sessionId, body.type, body.role);
  }
}
