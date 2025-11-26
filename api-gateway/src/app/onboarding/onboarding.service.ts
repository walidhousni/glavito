/**
 * Onboarding Service
 * Handles two-tier onboarding: Tenant Admin (8 steps) and Agent (5 steps)
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TemplatesService } from '../templates/templates.service';

export type OnboardingType = 'tenant_setup' | 'agent_welcome';
export type OnboardingRole = 'tenant_admin' | 'agent';

// Tenant Admin Steps
export const TENANT_STEPS = [
  'welcome',
  'industry',
  'stripe',
  'channels',
  'team',
  'knowledge-base',
  'ai-features',
  'workflows',
  'complete',
] as const;

// Agent Steps
export const AGENT_STEPS = [
  'profile',
  'tour',
  'sample-ticket',
  'knowledge-base-intro',
  'notifications',
] as const;

export type TenantStep = typeof TENANT_STEPS[number];
export type AgentStep = typeof AGENT_STEPS[number];
export type OnboardingStep = TenantStep | AgentStep;

export interface StartOnboardingRequest {
  type: OnboardingType;
  role: OnboardingRole;
  metadata?: Record<string, unknown>;
}

export interface UpdateStepRequest {
  stepId: OnboardingStep;
  data: Record<string, unknown>;
}

export interface OnboardingSession {
  id: string;
  userId: string;
  tenantId: string;
  type: OnboardingType;
  role: OnboardingRole;
  currentStep: string;
  completedSteps: string[];
  stepData: Record<string, unknown>;
  status: string;
  progress: number;
  startedAt: Date;
  lastActivityAt: Date;
  completedAt?: Date;
  estimatedCompletion?: Date;
}

@Injectable()
export class OnboardingService {
  private readonly logger = new Logger(OnboardingService.name);

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly eventEmitter: EventEmitter2,
    private readonly templatesService: TemplatesService,
  ) {}

  /**
   * Start onboarding session
   */
  async startOnboarding(
    userId: string,
    tenantId: string,
    request: StartOnboardingRequest
  ): Promise<OnboardingSession> {
    try {
      this.logger.log(`Starting onboarding for user ${userId}, type: ${request.type}, role: ${request.role}`);

      // Validate type
      if (request.type !== 'tenant_setup' && request.type !== 'agent_welcome') {
        throw new BadRequestException(`Invalid onboarding type: ${request.type}. Must be 'tenant_setup' or 'agent_welcome'`);
      }

      // Resolve tenantId if missing (fallback to user's tenant)
      let resolvedTenantId: string | undefined = tenantId;
      if (!resolvedTenantId) {
        const user = await this.databaseService.user.findUnique({ where: { id: userId }, select: { tenantId: true } });
        resolvedTenantId = (user?.tenantId as string | undefined);
      }
      if (!resolvedTenantId) {
        throw new BadRequestException('Missing tenant ID for user');
      }

      // Check if any session exists (including completed) to avoid unique constraint errors
      const existingAny = await this.databaseService.onboardingSession.findFirst({
        where: { userId, tenantId: resolvedTenantId },
        orderBy: { lastActivityAt: 'desc' },
      });

      if (existingAny) {
        if ((existingAny as any).status === 'completed') {
          this.logger.log(`Found completed onboarding session ${existingAny.id}, returning as-is`);
          return this.mapToSession(existingAny as any);
        }

        this.logger.log(`Resuming existing session ${existingAny.id} with type: ${(existingAny as any).type}`);
        const updated = await this.databaseService.onboardingSession.update({
          where: { id: existingAny.id },
          data: {
            status: 'active',
            lastActivityAt: new Date(),
          },
        });
        return this.mapToSession(updated);
      }

      // Create new session
      const steps = request.type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
      const firstStep = steps[0];

      this.logger.log(`Creating new session with type: ${request.type}, first step: ${firstStep}`);

      // Map role for database storage
      const dbRole = request.role === 'tenant_admin' ? 'tenant_admin' : 'agent';

      const session = await this.databaseService.onboardingSession.create({
        data: {
          userId,
          tenantId: resolvedTenantId,
          type: request.type,
          role: dbRole,
          currentStep: firstStep,
          completedSteps: [],
          stepData: {} as never,
          status: 'active',
          metadata: (request.metadata || {}) as never,
        },
      });

      this.eventEmitter.emit('onboarding:started', {
        sessionId: session.id,
        userId,
        tenantId: resolvedTenantId,
        type: request.type,
      });

      return this.mapToSession(session);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to start onboarding: ${message}`);
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to start onboarding');
    }
  }

  /**
   * Get onboarding status
   */
  async getOnboardingStatus(userId: string, tenantId: string): Promise<OnboardingSession | null> {
    const session = await this.databaseService.onboardingSession.findFirst({
      where: {
        userId,
        tenantId,
        status: { in: ['active', 'paused'] },
      },
      orderBy: { lastActivityAt: 'desc' },
    });

    if (!session) {
      // Check if onboarding was completed
      const completed = await this.databaseService.onboardingSession.findFirst({
        where: {
          userId,
          tenantId,
          status: 'completed',
        },
        orderBy: { completedAt: 'desc' },
      });

      if (completed) {
        return this.mapToSession(completed);
      }

      return null;
    }

    return this.mapToSession(session);
  }

  /**
   * Update step data
   */
  async updateStep(
    sessionId: string,
    request: UpdateStepRequest
  ): Promise<{ success: boolean; session: OnboardingSession }> {
    try {
      const session = await this.databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException('Onboarding session not found');
      }

      if (session.status !== 'active') {
        throw new BadRequestException(`Cannot update step: session is ${session.status}`);
      }

      // Validate step
      const steps = session.type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
      const stepsArray = steps as readonly string[];
      
      // Better error logging
      this.logger.debug(`Session type: ${session.type}, Step: ${request.stepId}, Valid steps: ${stepsArray.join(', ')}`);
      
      if (!stepsArray.includes(request.stepId)) {
        throw new BadRequestException(
          `Invalid step '${request.stepId}' for session type '${session.type}'. Valid steps: ${stepsArray.join(', ')}`
        );
      }

      // Update step data
      const currentStepData = (session.stepData as Record<string, unknown>) || {};
      const updatedStepData = {
        ...currentStepData,
        [request.stepId]: request.data,
      };

      // Add to completed steps if not already there
      const completedSteps = Array.isArray(session.completedSteps) ? session.completedSteps : [];
      const newCompletedSteps = completedSteps.includes(request.stepId)
        ? completedSteps
        : [...completedSteps, request.stepId];

      // Calculate next step
      const currentIndex = stepsArray.indexOf(request.stepId);
      const nextStep = currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : request.stepId;

      const updated = await this.databaseService.onboardingSession.update({
        where: { id: sessionId },
        data: {
          stepData: updatedStepData as never,
          completedSteps: newCompletedSteps,
          currentStep: nextStep,
          lastActivityAt: new Date(),
        },
      });

      this.eventEmitter.emit('onboarding:step-completed', {
        sessionId,
        userId: session.userId,
        tenantId: session.tenantId,
        stepId: request.stepId,
        progress: this.calculateProgress(newCompletedSteps.length, steps.length),
      });

      return {
        success: true,
        session: this.mapToSession(updated),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to update step: ${message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to update step');
    }
  }

  /**
   * Skip step
   */
  async skipStep(
    sessionId: string,
    stepId: OnboardingStep
  ): Promise<{ success: boolean; session: OnboardingSession }> {
    try {
      this.logger.log(`Skipping step ${stepId} for session ${sessionId}`);
      
      const session = await this.databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException('Onboarding session not found');
      }

      if (session.status !== 'active') {
        throw new BadRequestException(`Cannot skip step: session is ${session.status}`);
      }

      const steps = session.type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
      const stepsArray = steps as readonly string[];
      
      if (!stepsArray.includes(stepId)) {
        throw new BadRequestException(
          `Invalid step '${stepId}' for session type '${session.type}'. Valid steps: ${stepsArray.join(', ')}`
        );
      }
      
      const currentIndex = stepsArray.indexOf(stepId);
      const nextStep = currentIndex >= 0 && currentIndex < steps.length - 1 ? steps[currentIndex + 1] : stepId;

      // Mark step as skipped in stepData
      const currentStepData = (session.stepData as Record<string, unknown>) || {};
      const updatedStepData = {
        ...currentStepData,
        [stepId]: { skipped: true, skippedAt: new Date() },
      };

      const updated = await this.databaseService.onboardingSession.update({
        where: { id: sessionId },
        data: {
          currentStep: nextStep,
          stepData: updatedStepData as never,
          lastActivityAt: new Date(),
        },
      });

      this.eventEmitter.emit('onboarding:step-completed', {
        sessionId,
        userId: session.userId,
        tenantId: session.tenantId,
        stepId,
        progress: this.calculateProgress(session.completedSteps.length, steps.length),
      });

      return {
        success: true,
        session: this.mapToSession(updated),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to skip step: ${message}`);
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Failed to skip step');
    }
  }

  /**
   * Complete onboarding
   */
  async completeOnboarding(sessionId: string): Promise<{ success: boolean; message: string }> {
    try {
      const session = await this.databaseService.onboardingSession.findUnique({
        where: { id: sessionId },
      });

      if (!session) {
        throw new NotFoundException('Onboarding session not found');
      }

      await this.databaseService.onboardingSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
      });

      // Mark tenant onboarding as complete
      if (session.type === 'tenant_setup') {
        // Apply industry template if selected
        const industry = (session.stepData as any)?.industry?.selectedIndustry;
        if (industry) {
          try {
            // Find template by industry slug
            const templates = await this.templatesService.getTemplatesByIndustry(industry);
            if (templates.length > 0) {
              // Use the first available template for this industry for now
              // In the future, we might allow selecting specific sub-templates
              const templateId = templates[0].id;
              
              await this.templatesService.applyTemplate({
                tenantId: session.tenantId,
                templateId,
                userId: session.userId,
                applyCustomFields: true,
                applyWorkflows: true,
                applySLA: true,
                applyRouting: true,
                applyDashboards: true,
                applyAnalytics: true,
                applyPipelines: true,
                applyPortalTheme: true
              });
              
              this.logger.log(`Applied industry template ${industry} (${templateId}) for tenant ${session.tenantId}`);
            }
          } catch (error) {
            this.logger.error(`Failed to apply industry template: ${error}`);
            // Don't fail the whole onboarding completion if template application fails
            // Just log it and proceed
          }
        }

        await this.databaseService.tenant.update({
          where: { id: session.tenantId },
          data: {
            onboardingComplete: true,
            setupCompletedAt: new Date(),
            setupCompletedBy: session.userId,
          },
        });
      }

      this.eventEmitter.emit('onboarding:completed', {
        sessionId,
        userId: session.userId,
        tenantId: session.tenantId,
        type: session.type,
      });

      this.logger.log(`Onboarding completed for session ${sessionId}`);

      return {
        success: true,
        message: 'Onboarding completed successfully',
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to complete onboarding: ${message}`);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Failed to complete onboarding');
    }
  }

  /**
   * Pause onboarding
   */
  async pauseOnboarding(sessionId: string): Promise<{ success: boolean; message: string }> {
    await this.databaseService.onboardingSession.update({
      where: { id: sessionId },
      data: { status: 'paused' },
    });

    return {
      success: true,
      message: 'Onboarding paused',
    };
  }

  /**
   * Resume onboarding
   */
  async resumeOnboarding(sessionId: string): Promise<OnboardingSession> {
    const updated = await this.databaseService.onboardingSession.update({
      where: { id: sessionId },
      data: {
        status: 'active',
        lastActivityAt: new Date(),
      },
    });

    return this.mapToSession(updated);
  }

  /**
   * Determine onboarding type for user
   */
  async determineOnboardingType(
    userId: string,
    tenantId: string
  ): Promise<{
    type: OnboardingType;
    role: OnboardingRole;
    isTenantOwner: boolean;
  }> {
    const tenant = await this.databaseService.tenant.findUnique({
      where: { id: tenantId },
    });

    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    const isTenantOwner = tenant?.ownerId === userId;
    // Map 'admin' role to 'tenant_admin' for onboarding purposes
    const isAdmin = user?.role === 'admin' || user?.role === 'tenant_admin';

    if (isTenantOwner || (isAdmin && !tenant?.onboardingComplete)) {
      return {
        type: 'tenant_setup',
        role: 'tenant_admin',
        isTenantOwner,
      };
    }

    return {
      type: 'agent_welcome',
      role: 'agent',
      isTenantOwner: false,
    };
  }

  /**
   * Fix session type mismatch (for debugging/migration)
   */
  async fixSessionType(
    sessionId: string,
    type: string,
    role: string
  ): Promise<{ success: boolean; session: OnboardingSession }> {
    this.logger.warn(`Fixing session ${sessionId} type to: ${type}, role: ${role}`);

    // Validate type
    if (type !== 'tenant_setup' && type !== 'agent_welcome') {
      throw new BadRequestException(`Invalid type: ${type}. Must be 'tenant_setup' or 'agent_welcome'`);
    }

    const steps = type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
    const firstStep = steps[0];

    // Map role for database storage
    const dbRole = role === 'tenant_admin' ? 'tenant_admin' : 'agent';

    const updated = await this.databaseService.onboardingSession.update({
      where: { id: sessionId },
      data: {
        type,
        role: dbRole,
        currentStep: firstStep,
        completedSteps: [],
        stepData: {} as never,
        lastActivityAt: new Date(),
      },
    });

    return {
      success: true,
      session: this.mapToSession(updated),
    };
  }

  // Private helper methods

  private mapToSession(session: Record<string, unknown>): OnboardingSession {
    const steps = session.type === 'tenant_setup' ? TENANT_STEPS : AGENT_STEPS;
    const completedSteps = Array.isArray(session.completedSteps) ? session.completedSteps as string[] : [];
    const progress = this.calculateProgress(completedSteps.length, steps.length);

    // Map database role back to API role
    const dbRole = session.role as string;
    const apiRole: OnboardingRole = dbRole === 'tenant_admin' ? 'tenant_admin' : 'agent';

    return {
      id: session.id as string,
      userId: session.userId as string,
      tenantId: session.tenantId as string,
      type: session.type as OnboardingType,
      role: apiRole,
      currentStep: session.currentStep as string,
      completedSteps,
      stepData: (session.stepData as Record<string, unknown>) || {},
      status: session.status as string,
      progress,
      startedAt: session.startedAt as Date,
      lastActivityAt: session.lastActivityAt as Date,
      completedAt: (session.completedAt as Date | null) || undefined,
      estimatedCompletion: (session.estimatedCompletion as Date | null) || undefined,
    };
  }

  private calculateProgress(completed: number, total: number): number {
    return Math.round((completed / total) * 100);
  }
}
