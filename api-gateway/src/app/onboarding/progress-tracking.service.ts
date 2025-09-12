/**
 * Progress Tracking Service
 * Handles onboarding progress tracking, milestone calculation, and event emission
 */

import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface ProgressUpdateEvent {
  sessionId: string;
  userId: string;
  tenantId: string;
  step: string;
  progress: {
    totalSteps: number;
    completedSteps: number;
    progressPercentage: number;
    estimatedTimeRemaining: number;
  };
  timestamp: Date;
}

export interface OnboardingMilestoneEvent {
  sessionId: string;
  userId: string;
  tenantId: string;
  milestone: string;
  progress: {
    totalSteps: number;
    completedSteps: number;
    progressPercentage: number;
  };
  timestamp: Date;
}

export interface StepValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  nextStep?: string;
}

@Injectable()
export class ProgressTrackingService {
  private readonly logger = new Logger(ProgressTrackingService.name);

  // Define the complete onboarding flow
  private readonly ONBOARDING_STEPS = [
    'welcome',
    'organization_setup',
    'channel_configuration',
    'ai_configuration',
    'knowledge_base',
    'payment_setup',
    'team_management',
    'workflow_configuration',
    'customer_portal',
    'data_import',
    'analytics_setup',
  ];

  // Define milestone points (step numbers where milestones are reached)
  private readonly MILESTONE_POINTS = [3, 6, 9, 11]; // 25%, 50%, 75%, 100%

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Controller adapter: get progress by tenant (uses latest active session)
   */
  async getOnboardingProgress(tenantId: string) {
    const session = await this.databaseService.onboardingSession.findFirst({
      where: { tenantId, status: { in: ['active', 'paused'] } },
      orderBy: { lastActivityAt: 'desc' },
    });
    if (!session) {
      const base = this.calculateProgress(0);
      return {
        sessionId: undefined,
        currentStep: 'welcome',
        completedSteps: [],
        totalSteps: base.totalSteps,
        progressPercentage: base.progressPercentage,
        estimatedTimeRemaining: base.estimatedTimeRemaining,
        milestones: this.calculateMilestones(0),
        nextRecommendedAction: this.getNextRecommendedAction('welcome'),
      } as any;
    }
    return this.getCurrentProgress(session.id);
  }

  async getDetailedProgress(tenantId: string) {
    const session = await this.databaseService.onboardingSession.findFirst({
      where: { tenantId, status: { in: ['active', 'paused'] } },
      orderBy: { lastActivityAt: 'desc' },
    });
    if (!session) return { sessions: [], progress: this.calculateProgress(0) } as any;
    const current = await this.getCurrentProgress(session.id);
    return { sessions: [session], progress: current };
  }

  async completeStep(tenantId: string, stepId: string, userId: string, data?: any) {
    const session = await this.getOrCreateSession(tenantId, userId);
    await this.updateProgress(session.id, stepId);
    return this.getCurrentProgress(session.id);
  }

  async skipStep(tenantId: string, stepId: string, userId: string, reason?: string) {
    const session = await this.getOrCreateSession(tenantId, userId);
    // For skip, we still mark as completed but can log reason in metadata
    await this.updateProgress(session.id, stepId);
    await this.databaseService.onboardingSession.update({
      where: { id: session.id },
      data: { metadata: { ...(session as any).metadata, skipReasons: { ...(session as any).metadata?.skipReasons, [stepId]: reason } } as any },
    });
    return this.getCurrentProgress(session.id);
  }

  async updateStepProgress(tenantId: string, stepId: string, userId: string, _progressData: any) {
    const session = await this.getOrCreateSession(tenantId, userId);
    await this.updateProgress(session.id, stepId);
    return this.getCurrentProgress(session.id);
  }

  async getCurrentSession(tenantId: string) {
    return this.databaseService.onboardingSession.findFirst({
      where: { tenantId, status: { in: ['active', 'paused'] } },
      orderBy: { lastActivityAt: 'desc' },
    });
  }

  async pauseOnboarding(tenantId: string, userId: string) {
    const session = await this.getOrCreateSession(tenantId, userId);
    return this.databaseService.onboardingSession.update({ where: { id: session.id }, data: { status: 'paused', lastActivityAt: new Date() } });
  }

  async resumeOnboarding(tenantId: string, userId: string) {
    const session = await this.getOrCreateSession(tenantId, userId);
    return this.databaseService.onboardingSession.update({ where: { id: session.id }, data: { status: 'active', lastActivityAt: new Date() } });
  }

  async resetOnboarding(tenantId: string, userId: string) {
    const session = await this.getOrCreateSession(tenantId, userId);
    return this.databaseService.onboardingSession.update({
      where: { id: session.id },
      data: { currentStep: 'welcome', completedSteps: [], stepData: {}, status: 'active', lastActivityAt: new Date() },
    });
  }

  async getMilestones(tenantId: string) {
    const progress = await this.getOnboardingProgress(tenantId);
    return progress.milestones;
  }

  async achieveMilestone(_tenantId: string, _milestoneId: string, _userId: string) {
    // Milestones are computed; acknowledge without state change
    return { success: true };
  }

  async getProgressAnalytics(tenantId: string, _period?: string) {
    return this.getOnboardingStatistics(tenantId);
  }

  async getCompletionRateAnalytics(tenantId: string, _period?: string) {
    const stats = await this.getOnboardingStatistics(tenantId);
    return { completionRate: stats.completionRate, totalSessions: stats.totalSessions };
  }

  async getDropOffAnalytics(tenantId: string) {
    const sessions = await this.databaseService.onboardingSession.findMany({ where: { tenantId } });
    const counts: Record<string, number> = {};
    sessions.forEach(s => { const step = s.currentStep as string; counts[step] = (counts[step] || 0) + 1; });
    return counts;
  }

  async getTimeToCompleteAnalytics(tenantId: string, _period?: string) {
    const sessions = await this.databaseService.onboardingSession.findMany({ where: { tenantId, status: 'completed' } });
    const times = sessions.map(s => ((s.completedAt!.getTime() - s.startedAt.getTime()) / 60000) | 0);
    const avg = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
    return { averageMinutes: avg, samples: times.length };
  }

  async getProgressNotifications(_tenantId: string) {
    return [];
  }

  async markNotificationsAsRead(_tenantId: string, _notificationIds: string[]) {
    return { success: true };
  }

  async scheduleReminder(_tenantId: string, _userId: string, _reminderData: any) {
    return { success: true };
  }

  async exportProgressData(tenantId: string, _options: { format?: string; period?: string }) {
    const stats = await this.getOnboardingStatistics(tenantId);
    return { exportedAt: new Date(), stats };
  }

  async generateProgressReport(tenantId: string, _options: { type?: string; period?: string }) {
    const stats = await this.getOnboardingStatistics(tenantId);
    return { generatedAt: new Date(), stats };
  }

  private async getOrCreateSession(tenantId: string, userId: string) {
    const existing = await this.databaseService.onboardingSession.findFirst({
      where: { tenantId, userId, status: { in: ['active', 'paused'] } },
      orderBy: { lastActivityAt: 'desc' },
    });
    if (existing) return existing;
    return this.databaseService.onboardingSession.create({
      data: { tenantId, userId, currentStep: 'welcome', completedSteps: [], stepData: {}, status: 'active' },
    });
  }
  /**
   * Update progress for an onboarding session
   */
  async updateProgress(sessionId: string, completedStep: string): Promise<void> {
    try {
      const session = await this.databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
        include: { user: true, tenant: true },
      });

      if (!session) {
        throw new Error('Onboarding session not found');
      }

      // Add step to completed steps if not already present
      const completedSteps = [...new Set([...session.completedSteps, completedStep])];
      const currentStepIndex = this.ONBOARDING_STEPS.indexOf(completedStep);
      const nextStepIndex = currentStepIndex + 1;
      const nextStep = nextStepIndex < this.ONBOARDING_STEPS.length 
        ? this.ONBOARDING_STEPS[nextStepIndex] 
        : null;

      // Update session
      await this.databaseService.onboardingSession.update({
        where: { id: sessionId },
        data: {
          completedSteps,
          currentStep: nextStep || completedStep,
          lastActivityAt: new Date(),
        },
      });

      // Calculate progress
      const progress = this.calculateProgress(completedSteps.length);

      // Emit progress update event
      this.eventEmitter.emit('onboarding.progress.updated', {
        sessionId,
        userId: session.userId,
        tenantId: session.tenantId,
        step: completedStep,
        progress,
        timestamp: new Date(),
      } as ProgressUpdateEvent);

      // Check for milestone achievements
      await this.checkMilestones(sessionId, session.userId, session.tenantId, completedSteps.length);

      this.logger.log(`Progress updated for session ${sessionId}: ${completedSteps.length}/${this.ONBOARDING_STEPS.length} steps completed`);
    } catch (error) {
      this.logger.error(`Failed to update progress: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Get current progress for a session
   */
  async getCurrentProgress(sessionId: string) {
    try {
      const session = await this.databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
        include: { user: true, tenant: true },
      });

      if (!session) {
        throw new Error('Onboarding session not found');
      }

      const completedSteps = session.completedSteps.length;
      const progress = this.calculateProgress(completedSteps);

      return {
        sessionId: session.id,
        currentStep: session.currentStep,
        completedSteps: session.completedSteps,
        totalSteps: progress.totalSteps,
        progressPercentage: progress.progressPercentage,
        estimatedTimeRemaining: progress.estimatedTimeRemaining,
        milestones: this.calculateMilestones(completedSteps),
        nextRecommendedAction: this.getNextRecommendedAction(session.currentStep as string),
      } as any;
    } catch (error) {
      this.logger.error(`Failed to get current progress: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * Validate step completion
   */
  async validateStepCompletion(
    sessionId: string,
    step: string,
    data: any
  ): Promise<StepValidationResult> {
    try {
      const session = await this.databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
        include: { user: true, tenant: true },
      });

      if (!session) {
        return {
          isValid: false,
          errors: ['Onboarding session not found'],
          warnings: [],
        };
      }

      // Validate based on step type
      const validationResult = await this.validateStepData(step, data, session);

      if (validationResult.isValid) {
        // Determine next step
        const currentStepIndex = this.ONBOARDING_STEPS.indexOf(step);
        const nextStepIndex = currentStepIndex + 1;
        validationResult.nextStep = nextStepIndex < this.ONBOARDING_STEPS.length 
          ? this.ONBOARDING_STEPS[nextStepIndex] 
          : undefined;
      }

      return validationResult;
    } catch (error) {
      this.logger.error(`Failed to validate step completion: ${error instanceof Error ? error.message : String(error)}`);
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : String(error)}`],
        warnings: [],
      };
    }
  }

  /**
   * Get onboarding statistics for analytics
   */
  async getOnboardingStatistics(tenantId?: string) {
    try {
      const whereClause = tenantId ? { tenantId } : {};

      const [totalSessions, completedSessions, averageCompletionTime] = await Promise.all([
        this.databaseService.onboardingSession.count({ where: whereClause }),
        this.databaseService.onboardingSession.count({
          where: {
            ...whereClause,
            status: 'completed',
          },
        }),
        this.calculateAverageCompletionTime(tenantId),
      ]);

      const completionRate = totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0;

      // Get step completion statistics
      const stepStats = await this.getStepCompletionStatistics(tenantId);

      return {
        totalSessions,
        completedSessions,
        completionRate: Math.round(completionRate * 100) / 100,
        averageCompletionTime,
        stepStatistics: stepStats,
      };
    } catch (error) {
      this.logger.error(`Failed to get onboarding statistics: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  // Private helper methods

  private calculateProgress(completedSteps: number) {
    const totalSteps = this.ONBOARDING_STEPS.length;
    const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
    
    // Calculate estimated time remaining based on average step completion time
    const averageStepTime = 5; // minutes per step
    const remainingSteps = totalSteps - completedSteps;
    const estimatedTimeRemaining = remainingSteps * averageStepTime;

    return {
      totalSteps,
      completedSteps,
      progressPercentage,
      estimatedTimeRemaining,
    };
  }

  private async checkMilestones(
    sessionId: string,
    userId: string,
    tenantId: string,
    completedSteps: number
  ): Promise<void> {
    // Check if we've reached a milestone
    if (this.MILESTONE_POINTS.includes(completedSteps)) {
      const milestone = this.getMilestoneTitle(completedSteps);
      const progress = this.calculateProgress(completedSteps);

      this.eventEmitter.emit('onboarding.milestone.reached', {
        sessionId,
        userId,
        tenantId,
        milestone,
        progress,
        timestamp: new Date(),
      } as OnboardingMilestoneEvent);

      this.logger.log(`Milestone reached for session ${sessionId}: ${milestone}`);
    }
  }

  private calculateMilestones(completedSteps: number) {
    const totalSteps = this.ONBOARDING_STEPS.length;
    
    return this.MILESTONE_POINTS.map(point => ({
      step: point,
      percentage: Math.round((point / totalSteps) * 100),
      isReached: completedSteps >= point,
      title: this.getMilestoneTitle(point),
    }));
  }

  private getMilestoneTitle(step: number): string {
    const totalSteps = this.ONBOARDING_STEPS.length;
    const percentage = Math.round((step / totalSteps) * 100);
    
    if (percentage === 25) return 'Getting Started';
    if (percentage === 50) return 'Halfway There';
    if (percentage === 75) return 'Almost Done';
    if (percentage === 100) return 'Completed';
    return `${percentage}% Complete`;
  }

  private getNextRecommendedAction(currentStep: string): string {
    const stepActions = {
      'welcome': 'Get started with your organization setup',
      'organization_setup': 'Configure your company information',
      'channel_configuration': 'Connect your communication channels',
      'ai_configuration': 'Set up AI-powered features',
      'knowledge_base': 'Create your knowledge base',
      'payment_setup': 'Configure payment processing',
      'team_management': 'Invite your team members',
      'workflow_configuration': 'Set up automated workflows',
      'customer_portal': 'Customize your customer portal',
      'data_import': 'Import your existing data',
      'analytics_setup': 'Configure analytics and reporting',
    };

    return stepActions[currentStep as keyof typeof stepActions] || 'Continue with the next step';
  }

  private async validateStepData(
    step: string,
    data: any,
    session: any
  ): Promise<StepValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (step) {
      case 'organization_setup':
        if (!data.companyName) errors.push('Company name is required');
        if (!data.industry) errors.push('Industry is required');
        if (!data.companySize) errors.push('Company size is required');
        break;

      case 'channel_configuration':
        if (!data.channels || data.channels.length === 0) {
          errors.push('At least one communication channel must be configured');
        }
        break;

      case 'ai_configuration':
        if (!data.aiProvider) errors.push('AI provider selection is required');
        if (!data.features || data.features.length === 0) {
          warnings.push('No AI features selected - you can configure these later');
        }
        break;

      case 'payment_setup':
        if (!data.stripeAccountId && !data.skipPaymentSetup) {
          errors.push('Payment setup is required or must be explicitly skipped');
        }
        break;

      case 'team_management':
        if (!data.teamMembers || data.teamMembers.length === 0) {
          warnings.push('No team members invited - you can add them later');
        }
        break;

      default:
        // Basic validation for other steps
        if (!data || Object.keys(data).length === 0) {
          warnings.push('Step completed without configuration - you can update settings later');
        }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private async calculateAverageCompletionTime(tenantId?: string): Promise<number> {
    try {
      const whereClause = {
        ...(tenantId && { tenantId }),
        status: 'completed',
        completedAt: { not: null },
      };

      const completedSessions = await this.databaseService.onboardingSession.findMany({
        where: whereClause,
        select: {
          startedAt: true,
          completedAt: true,
        },
      });

      if (completedSessions.length === 0) return 0;

      const totalTime = completedSessions.reduce((sum, session) => {
        const startTime = session.startedAt.getTime();
        const endTime = session.completedAt!.getTime();
        return sum + (endTime - startTime);
      }, 0);

      // Return average time in minutes
      return Math.round(totalTime / completedSessions.length / (1000 * 60));
    } catch (error) {
      this.logger.error(`Failed to calculate average completion time: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  private async getStepCompletionStatistics(tenantId?: string) {
    try {
      const whereClause = tenantId ? { tenantId } : {};

      const sessions = await this.databaseService.onboardingSession.findMany({
        where: whereClause,
        select: {
          completedSteps: true,
          status: true,
        },
      });

      const stepStats = this.ONBOARDING_STEPS.map(step => {
        const completedCount = sessions.filter(session => 
          session.completedSteps.includes(step)
        ).length;
        
        const completionRate = sessions.length > 0 
          ? (completedCount / sessions.length) * 100 
          : 0;

        return {
          step,
          completedCount,
          completionRate: Math.round(completionRate * 100) / 100,
        };
      });

      return stepStats;
    } catch (error) {
      this.logger.error(`Failed to get step completion statistics: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }
}