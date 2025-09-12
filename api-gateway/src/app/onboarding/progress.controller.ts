/**
 * Progress Controller
 * Handles onboarding progress tracking and analytics API endpoints
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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ProgressTrackingService } from './progress-tracking.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('progress')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('onboarding/progress')
export class ProgressController {
  constructor(private readonly progressTrackingService: ProgressTrackingService) {}

  // Progress Tracking
  @Get()
  @ApiOperation({ summary: 'Get onboarding progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding progress retrieved successfully',
  })
  async getProgress(@Request() req: any) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getOnboardingProgress(tenantId);
  }

  @Get('detailed')
  @ApiOperation({ summary: 'Get detailed progress information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Detailed progress retrieved successfully',
  })
  async getDetailedProgress(@Request() req: any) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getDetailedProgress(tenantId);
  }

  @Post('step/:stepId/complete')
  @ApiOperation({ summary: 'Mark step as completed' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step marked as completed successfully',
  })
  async completeStep(
    @Request() req: any,
    @Param('stepId') stepId: string,
    @Body() data?: any
  ) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.completeStep(tenantId, stepId, userId, data);
  }

  @Post('step/:stepId/skip')
  @ApiOperation({ summary: 'Skip step' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step skipped successfully',
  })
  async skipStep(
    @Request() req: any,
    @Param('stepId') stepId: string,
    @Body() reason?: { reason: string }
  ) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.skipStep(tenantId, stepId, userId, reason?.reason);
  }

  @Put('step/:stepId/update')
  @ApiOperation({ summary: 'Update step progress' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Step progress updated successfully',
  })
  async updateStepProgress(
    @Request() req: any,
    @Param('stepId') stepId: string,
    @Body() progressData: any
  ) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.updateStepProgress(tenantId, stepId, userId, progressData);
  }

  // Session Management
  @Get('session')
  @ApiOperation({ summary: 'Get current onboarding session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding session retrieved successfully',
  })
  async getCurrentSession(@Request() req: any) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getCurrentSession(tenantId);
  }

  @Post('session/pause')
  @ApiOperation({ summary: 'Pause onboarding session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding session paused successfully',
  })
  async pauseSession(@Request() req: any) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.pauseOnboarding(tenantId, userId);
  }

  @Post('session/resume')
  @ApiOperation({ summary: 'Resume onboarding session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding session resumed successfully',
  })
  async resumeSession(@Request() req: any) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.resumeOnboarding(tenantId, userId);
  }

  @Post('session/reset')
  @ApiOperation({ summary: 'Reset onboarding session' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Onboarding session reset successfully',
  })
  async resetSession(@Request() req: any) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.resetOnboarding(tenantId, userId);
  }

  // Milestones
  @Get('milestones')
  @ApiOperation({ summary: 'Get onboarding milestones' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestones retrieved successfully',
  })
  async getMilestones(@Request() req: any) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getMilestones(tenantId);
  }

  @Post('milestones/:milestoneId/achieve')
  @ApiOperation({ summary: 'Mark milestone as achieved' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone marked as achieved successfully',
  })
  async achieveMilestone(
    @Request() req: any,
    @Param('milestoneId') milestoneId: string
  ) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.achieveMilestone(tenantId, milestoneId, userId);
  }

  // Analytics
  @Get('analytics')
  @ApiOperation({ summary: 'Get progress analytics' })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress analytics retrieved successfully',
  })
  async getProgressAnalytics(
    @Request() req: any,
    @Query('period') period?: string
  ) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getProgressAnalytics(tenantId, period);
  }

  @Get('analytics/completion-rate')
  @ApiOperation({ summary: 'Get completion rate analytics' })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Completion rate analytics retrieved successfully',
  })
  async getCompletionRateAnalytics(
    @Request() req: any,
    @Query('period') period?: string
  ) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getCompletionRateAnalytics(tenantId, period);
  }

  @Get('analytics/drop-off')
  @ApiOperation({ summary: 'Get drop-off analytics' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Drop-off analytics retrieved successfully',
  })
  async getDropOffAnalytics(@Request() req: any) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getDropOffAnalytics(tenantId);
  }

  @Get('analytics/time-to-complete')
  @ApiOperation({ summary: 'Get time-to-complete analytics' })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Time-to-complete analytics retrieved successfully',
  })
  async getTimeToCompleteAnalytics(
    @Request() req: any,
    @Query('period') period?: string
  ) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getTimeToCompleteAnalytics(tenantId, period);
  }

  // Notifications and Reminders
  @Get('notifications')
  @ApiOperation({ summary: 'Get progress notifications' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress notifications retrieved successfully',
  })
  async getProgressNotifications(@Request() req: any) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getProgressNotifications(tenantId);
  }

  @Post('notifications/mark-read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Notifications marked as read successfully',
  })
  async markNotificationsAsRead(
    @Request() req: any,
    @Body() request: { notificationIds: string[] }
  ) {
    const { tenantId } = req.user;
    return this.progressTrackingService.markNotificationsAsRead(tenantId, request.notificationIds);
  }

  @Post('reminders/schedule')
  @ApiOperation({ summary: 'Schedule progress reminder' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Reminder scheduled successfully',
  })
  async scheduleReminder(
    @Request() req: any,
    @Body() reminderData: any
  ) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.scheduleReminder(tenantId, userId, reminderData);
  }

  // Export and Reporting
  @Get('export')
  @ApiOperation({ summary: 'Export progress data' })
  @ApiQuery({ name: 'format', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress data exported successfully',
  })
  async exportProgressData(
    @Request() req: any,
    @Query('format') format?: string,
    @Query('period') period?: string
  ) {
    const { tenantId } = req.user;
    return this.progressTrackingService.exportProgressData(tenantId, { format, period });
  }

  @Get('report')
  @ApiOperation({ summary: 'Generate progress report' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'period', required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress report generated successfully',
  })
  async generateProgressReport(
    @Request() req: any,
    @Query('type') type?: string,
    @Query('period') period?: string
  ) {
    const { tenantId } = req.user;
    return this.progressTrackingService.generateProgressReport(tenantId, { type, period });
  }

  // Health Check
  @Get('health')
  @ApiOperation({ summary: 'Get progress tracking health status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Health status retrieved successfully',
  })
  async getHealthStatus(@Request() req: any) {
    const { tenantId } = req.user;
    return this.progressTrackingService.getHealthStatus(tenantId);
  }

  // Bulk Operations
  @Post('bulk/complete')
  @ApiOperation({ summary: 'Complete multiple steps' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Steps completed successfully',
  })
  async completeMultipleSteps(
    @Request() req: any,
    @Body() request: { stepIds: string[]; data?: any }
  ) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.bulkCompleteSteps(tenantId, request.stepIds, userId, request.data);
  }

  @Post('bulk/skip')
  @ApiOperation({ summary: 'Skip multiple steps' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Steps skipped successfully',
  })
  async skipMultipleSteps(
    @Request() req: any,
    @Body() request: { stepIds: string[]; reason?: string }
  ) {
    const { tenantId, userId } = req.user;
    return this.progressTrackingService.bulkSkipSteps(tenantId, request.stepIds, userId, request.reason);
  }
}