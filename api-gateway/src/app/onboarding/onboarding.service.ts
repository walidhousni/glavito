import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { ProgressTrackingService } from './progress-tracking.service';
import { StripeService, StripeAccountSetupRequest, BillingConfigurationRequest } from '../stripe/stripe.service';
import {
    OnboardingSession,
    OnboardingProgress,
    OnboardingStep,
    StepConfiguration,
    StepResult,
    CompletionResult,
    StartOnboardingRequest,
    OnboardingType,
    OnboardingRole,
    TenantSetupStep,
    AgentWelcomeStep,
    TenantSetupStatus,
    AgentWelcomeStatus,
    TenantSetupStepConfiguration,
    AgentWelcomeStepConfiguration
} from '@glavito/shared-types';

@Injectable()
export class OnboardingService {

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly progressTrackingService: ProgressTrackingService,
        private readonly stripeService: StripeService
    ) { }

    // Tenant Setup Step Configurations
    private readonly tenantSetupConfigurations: Record<TenantSetupStep, TenantSetupStepConfiguration> = {
        [TenantSetupStep.WELCOME]: {
            id: TenantSetupStep.WELCOME,
            title: 'Welcome to Glavito',
            description: 'Set up your ticketing platform for your organization',
            isRequired: true,
            estimatedTime: 2,
            dependencies: [],
            validationRules: {},
            category: 'setup'
        },
        [TenantSetupStep.ORGANIZATION_SETUP]: {
            id: TenantSetupStep.ORGANIZATION_SETUP,
            title: 'Organization Setup',
            description: 'Configure your company information and branding',
            isRequired: true,
            estimatedTime: 10,
            dependencies: [TenantSetupStep.WELCOME],
            validationRules: {
                companyName: { required: true, minLength: 2 },
                primaryColor: { required: true, pattern: '^#[0-9A-Fa-f]{6}$' }
            },
            category: 'setup'
        },
        [TenantSetupStep.CHANNEL_CONFIGURATION]: {
            id: TenantSetupStep.CHANNEL_CONFIGURATION,
            title: 'Channel Configuration',
            description: 'Set up WhatsApp, Instagram, and Email channels',
            isRequired: false,
            estimatedTime: 15,
            dependencies: [TenantSetupStep.ORGANIZATION_SETUP],
            validationRules: {},
            category: 'integration'
        },
        [TenantSetupStep.AI_CONFIGURATION]: {
            id: TenantSetupStep.AI_CONFIGURATION,
            title: 'AI & Automation',
            description: 'Configure AI features and N8N workflows',
            isRequired: false,
            estimatedTime: 12,
            dependencies: [TenantSetupStep.CHANNEL_CONFIGURATION],
            validationRules: {},
            category: 'integration'
        },
        [TenantSetupStep.KNOWLEDGE_BASE]: {
            id: TenantSetupStep.KNOWLEDGE_BASE,
            title: 'Knowledge Base',
            description: 'Create FAQ articles and help content',
            isRequired: false,
            estimatedTime: 20,
            dependencies: [TenantSetupStep.ORGANIZATION_SETUP],
            validationRules: {},
            category: 'configuration'
        },
        [TenantSetupStep.PAYMENT_SETUP]: {
            id: TenantSetupStep.PAYMENT_SETUP,
            title: 'Payment Setup',
            description: 'Configure Stripe payment processing',
            isRequired: false,
            estimatedTime: 8,
            dependencies: [TenantSetupStep.ORGANIZATION_SETUP],
            validationRules: {},
            category: 'integration'
        },
        [TenantSetupStep.TEAM_MANAGEMENT]: {
            id: TenantSetupStep.TEAM_MANAGEMENT,
            title: 'Team Management',
            description: 'Invite agents and configure permissions',
            isRequired: false,
            estimatedTime: 10,
            dependencies: [TenantSetupStep.ORGANIZATION_SETUP],
            validationRules: {},
            category: 'configuration'
        },
        [TenantSetupStep.WORKFLOW_CONFIGURATION]: {
            id: TenantSetupStep.WORKFLOW_CONFIGURATION,
            title: 'Workflow Configuration',
            description: 'Set up ticket workflows and SLA rules',
            isRequired: false,
            estimatedTime: 15,
            dependencies: [TenantSetupStep.TEAM_MANAGEMENT],
            validationRules: {},
            category: 'configuration'
        },
        [TenantSetupStep.CUSTOMER_PORTAL]: {
            id: TenantSetupStep.CUSTOMER_PORTAL,
            title: 'Customer Portal',
            description: 'Customize your customer-facing portal',
            isRequired: false,
            estimatedTime: 8,
            dependencies: [TenantSetupStep.KNOWLEDGE_BASE],
            validationRules: {},
            category: 'configuration'
        },
        [TenantSetupStep.DATA_IMPORT]: {
            id: TenantSetupStep.DATA_IMPORT,
            title: 'Data Import',
            description: 'Import existing customer and ticket data',
            isRequired: false,
            estimatedTime: 25,
            dependencies: [TenantSetupStep.ORGANIZATION_SETUP],
            validationRules: {},
            category: 'optional'
        },
        [TenantSetupStep.ANALYTICS_SETUP]: {
            id: TenantSetupStep.ANALYTICS_SETUP,
            title: 'Analytics Setup',
            description: 'Configure reporting and analytics',
            isRequired: false,
            estimatedTime: 10,
            dependencies: [TenantSetupStep.WORKFLOW_CONFIGURATION],
            validationRules: {},
            category: 'configuration'
        }
    };

    // Agent Welcome Step Configurations
    private readonly agentWelcomeConfigurations: Record<AgentWelcomeStep, AgentWelcomeStepConfiguration> = {
        [AgentWelcomeStep.WELCOME]: {
            id: AgentWelcomeStep.WELCOME,
            title: 'Welcome to the Team!',
            description: 'Get started with your new role as a support agent',
            isRequired: true,
            estimatedTime: 3,
            dependencies: [],
            validationRules: {},
            category: 'welcome'
        },
        [AgentWelcomeStep.PROFILE_SETUP]: {
            id: AgentWelcomeStep.PROFILE_SETUP,
            title: 'Complete Your Profile',
            description: 'Set up your agent profile and preferences',
            isRequired: true,
            estimatedTime: 5,
            dependencies: [AgentWelcomeStep.WELCOME],
            validationRules: {
                displayName: { required: true, minLength: 2 },
                timezone: { required: true }
            },
            category: 'setup'
        },
        [AgentWelcomeStep.TEAM_ASSIGNMENT]: {
            id: AgentWelcomeStep.TEAM_ASSIGNMENT,
            title: 'Team Assignment',
            description: 'Learn about your team and assigned responsibilities',
            isRequired: true,
            estimatedTime: 4,
            dependencies: [AgentWelcomeStep.PROFILE_SETUP],
            validationRules: {},
            category: 'setup'
        },
        [AgentWelcomeStep.PERMISSIONS_OVERVIEW]: {
            id: AgentWelcomeStep.PERMISSIONS_OVERVIEW,
            title: 'Permissions Overview',
            description: 'Understand what you can access and do in the system',
            isRequired: true,
            estimatedTime: 3,
            dependencies: [AgentWelcomeStep.TEAM_ASSIGNMENT],
            validationRules: {},
            category: 'training'
        },
        [AgentWelcomeStep.FEATURE_TOUR]: {
            id: AgentWelcomeStep.FEATURE_TOUR,
            title: 'Feature Tour',
            description: 'Explore the key features you\'ll use daily',
            isRequired: true,
            estimatedTime: 8,
            dependencies: [AgentWelcomeStep.PERMISSIONS_OVERVIEW],
            validationRules: {},
            category: 'training'
        },
        [AgentWelcomeStep.TEST_TICKET]: {
            id: AgentWelcomeStep.TEST_TICKET,
            title: 'Test Ticket Assignment',
            description: 'Practice with a sample ticket to get familiar',
            isRequired: true,
            estimatedTime: 10,
            dependencies: [AgentWelcomeStep.FEATURE_TOUR],
            validationRules: {},
            category: 'training'
        },
        [AgentWelcomeStep.NOTIFICATION_PREFERENCES]: {
            id: AgentWelcomeStep.NOTIFICATION_PREFERENCES,
            title: 'Notification Preferences',
            description: 'Configure how you want to be notified about tickets',
            isRequired: false,
            estimatedTime: 3,
            dependencies: [AgentWelcomeStep.TEST_TICKET],
            validationRules: {},
            category: 'setup'
        },
        [AgentWelcomeStep.QUICK_START]: {
            id: AgentWelcomeStep.QUICK_START,
            title: 'Quick Start Guide',
            description: 'Get ready to start handling real tickets',
            isRequired: true,
            estimatedTime: 5,
            dependencies: [AgentWelcomeStep.NOTIFICATION_PREFERENCES],
            validationRules: {},
            category: 'training'
        }
    };

    async getOnboardingStatus(
        userId: string,
        tenantId: string
    ): Promise<{ session: OnboardingSession; progress: OnboardingProgress }> {
        const existingSession = await this.databaseService.onboardingSession.findUnique({
            where: { userId_tenantId: { userId, tenantId } }
        });

        // Determine onboarding type and role
        const tenant = await this.databaseService.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const isTenantOwner = tenant.ownerId === userId;
        
        const type = isTenantOwner ? OnboardingType.TENANT_SETUP : OnboardingType.AGENT_WELCOME;
        const role = isTenantOwner ? OnboardingRole.TENANT_ADMIN : OnboardingRole.AGENT;
        const initialStep = isTenantOwner ? TenantSetupStep.WELCOME : AgentWelcomeStep.WELCOME;

        const sessionEntity = existingSession ?? (await this.databaseService.onboardingSession.create({
            data: {
                userId,
                tenantId,
                type: type as string,
                role: role as string,
                currentStep: initialStep,
                completedSteps: [],
                stepData: {},
                status: 'active',
                estimatedCompletion: new Date(Date.now() + 2 * 60 * 60 * 1000)
            }
        }));

        const session = this.mapToOnboardingSession(sessionEntity);
        const progress = await this.getOnboardingProgress(session.id);

        return { session, progress };
    }

    async startOnboarding(
        userId: string,
        tenantId: string,
        request?: StartOnboardingRequest
    ): Promise<OnboardingSession> {
        // Check if onboarding session already exists
        const existingSession = await this.databaseService.onboardingSession.findUnique({
            where: { userId_tenantId: { userId, tenantId } }
        });

        if (existingSession && existingSession.status !== 'completed') {
            // Resume existing session
            return this.mapToOnboardingSession(existingSession);
        }

        // Determine onboarding type and role
        const tenant = await this.databaseService.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            throw new Error('Tenant not found');
        }

        const isTenantOwner = tenant.ownerId === userId;
        const type = isTenantOwner ? OnboardingType.TENANT_SETUP : OnboardingType.AGENT_WELCOME;
        const role = isTenantOwner ? OnboardingRole.TENANT_ADMIN : OnboardingRole.AGENT;
        const initialStep = isTenantOwner ? TenantSetupStep.WELCOME : AgentWelcomeStep.WELCOME;

        // Create new onboarding session
        const estimatedCompletion = new Date();
        estimatedCompletion.setHours(estimatedCompletion.getHours() + 2); // 2 hours estimated

        const session = await this.databaseService.onboardingSession.create({
            data: {
                userId,
                tenantId,
                type: type as string,
                role: role as string,
                currentStep: initialStep,
                completedSteps: [],
                stepData: {},
                status: 'active',
                estimatedCompletion,
                metadata: {
                    userAgent: request?.context?.existingTools?.join(',') || '',
                    industry: request?.context?.industry || '',
                    companySize: request?.context?.companySize || ''
                }
            }
        });

        // Track session start
        await this.progressTrackingService.updateProgress(session.id, initialStep as string);

        return this.mapToOnboardingSession(session);
    }

    async getOnboardingProgress(sessionId: string): Promise<OnboardingProgress> {
        const session = await this.databaseService.onboardingSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new NotFoundException('Onboarding session not found');
        }

        // Determine which configuration to use based on session type
        const sessionType = (session as Record<string, unknown>).type as OnboardingType || OnboardingType.TENANT_SETUP;
        const configs = sessionType === OnboardingType.TENANT_SETUP 
            ? this.tenantSetupConfigurations 
            : this.agentWelcomeConfigurations;

        const totalSteps = Object.keys(configs).length;
        const completedSteps = session.completedSteps.length;
        const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

        // Calculate estimated time remaining
        const remainingSteps = Object.values(configs)
            .filter(step => !session.completedSteps.includes(step.id))
            .reduce((total, step) => total + step.estimatedTime, 0);

        const nextStep = this.getNextRecommendedStep(
            session.currentStep as OnboardingStep,
            session.completedSteps as OnboardingStep[],
            sessionType
        );
        
        console.log('Onboarding Progress Debug:', {
            sessionId,
            currentStep: session.currentStep,
            completedSteps: session.completedSteps,
            sessionType,
            nextStep,
            totalSteps: Object.keys(configs).length
        });

        // Only show "Onboarding complete" if all required steps are completed
        const requiredSteps = Object.values(configs).filter(step => step.isRequired);
        const completedRequiredSteps = requiredSteps.filter(step => session.completedSteps.includes(step.id));
        const allRequiredStepsCompleted = completedRequiredSteps.length === requiredSteps.length;
        
        const nextRecommendedAction = nextStep 
            ? `Complete ${((configs as Record<string, unknown>)[nextStep] as { title?: string })?.title || 'Step'}`
            : allRequiredStepsCompleted 
                ? 'Onboarding complete' 
                : 'Complete required steps to continue';

        return {
            totalSteps,
            completedSteps,
            currentStep: session.currentStep as OnboardingStep,
            progressPercentage,
            estimatedTimeRemaining: remainingSteps,
            nextRecommendedAction,
            type: sessionType,
            role: (session as Record<string, unknown>).role as OnboardingRole || OnboardingRole.TENANT_ADMIN
        };
    }

    async getSessionById(sessionId: string): Promise<OnboardingSession> {
        const session = await this.databaseService.onboardingSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new NotFoundException('Onboarding session not found');
        }

        return this.mapToOnboardingSession(session);
    }

    async updateStepProgress(
        sessionId: string,
        stepId: OnboardingStep,
        data: Record<string, unknown>
    ): Promise<StepResult> {
        const session = await this.databaseService.onboardingSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new NotFoundException('Onboarding session not found');
        }

        if (session.status !== 'active') {
            // Auto-resume if the session is paused or abandoned
            if (session.status === 'paused' || session.status === 'abandoned') {
                await this.databaseService.onboardingSession.update({
                    where: { id: sessionId },
                    data: { status: 'active', lastActivityAt: new Date() }
                });
            } else if (session.status === 'completed') {
                // Idempotent behavior: treat step update as no-op success
                return {
                    success: true,
                    data,
                    nextStep: undefined
                };
            } else {
                // For any other unexpected status, attempt to reactivate
                await this.databaseService.onboardingSession.update({
                    where: { id: sessionId },
                    data: { status: 'active', lastActivityAt: new Date() }
                });
            }
        }

        // Validate step transition
        const sessionType = (session as Record<string, unknown>).type as OnboardingType || OnboardingType.TENANT_SETUP;
        const configs = sessionType === OnboardingType.TENANT_SETUP 
            ? this.tenantSetupConfigurations 
            : this.agentWelcomeConfigurations;
        const stepConfig = (configs as Record<string, unknown>)[stepId];
        if (!stepConfig) {
            throw new BadRequestException('Invalid step ID');
        }

        // Check dependencies
        const missingDependencies = (stepConfig as { dependencies?: OnboardingStep[] }).dependencies?.filter(
            (dep: OnboardingStep) => !session.completedSteps.includes(dep)
        ) || [];

        if (missingDependencies.length > 0) {
            throw new BadRequestException(
                `Missing dependencies: ${missingDependencies.join(', ')}`
            );
        }

        // Validate step data
        const validationErrors = this.validateStepData(stepId, data, sessionType);
        if (validationErrors.length > 0) {
            return {
                success: false,
                errors: validationErrors
            };
        }

        // Update session
        const updatedStepData = { ...(session.stepData as Record<string, unknown>), [stepId]: data };
        const updatedCompletedSteps = session.completedSteps.includes(stepId)
            ? session.completedSteps
            : [...session.completedSteps, stepId];

        // If we're completing the current step, find the next step
        // If we're completing a different step, keep the current step
        const nextStep = (stepId === session.currentStep) 
            ? this.getNextRecommendedStep(stepId, updatedCompletedSteps as OnboardingStep[], sessionType)
            : session.currentStep as OnboardingStep;
            
        console.log('Step Completion Debug:', {
            sessionId,
            stepId,
            currentStep: session.currentStep,
            completedSteps: updatedCompletedSteps,
            nextStep,
            isCurrentStep: stepId === session.currentStep
        });

        await this.databaseService.onboardingSession.update({
            where: { id: sessionId },
            data: {
                currentStep: nextStep || stepId,
                completedSteps: updatedCompletedSteps,
                stepData: updatedStepData as any,
                lastActivityAt: new Date()
            }
        });

        // Handle special step processing
        if (stepId === TenantSetupStep.PAYMENT_SETUP) {
            try {
                const paymentResult = await this.handlePaymentStepCompletion(session.tenantId, data);
                console.log('Payment step completion result:', paymentResult);
            } catch (error) {
                console.error('Payment step completion failed:', error);
                // Don't fail the step completion, just log the error
            }
        }

        // Track step progress
        await this.progressTrackingService.updateProgress(sessionId, stepId);

        return {
            success: true,
            data,
            nextStep: nextStep || undefined
        };
    }

    async pauseOnboarding(sessionId: string): Promise<void> {
        const session = await this.databaseService.onboardingSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new NotFoundException('Onboarding session not found');
        }

        await this.databaseService.onboardingSession.update({
            where: { id: sessionId },
            data: {
                status: 'paused',
                lastActivityAt: new Date()
            }
        });
    }

    async resumeOnboarding(sessionId: string): Promise<OnboardingSession> {
        const session = await this.databaseService.onboardingSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new NotFoundException('Onboarding session not found');
        }

        if (session.status !== 'paused') {
            throw new BadRequestException('Session is not paused');
        }

        const updatedSession = await this.databaseService.onboardingSession.update({
            where: { id: sessionId },
            data: {
                status: 'active',
                lastActivityAt: new Date()
            }
        });

        return this.mapToOnboardingSession(updatedSession);
    }

    async completeOnboarding(sessionId: string, force = false): Promise<CompletionResult> {
        const session = await this.databaseService.onboardingSession.findUnique({
            where: { id: sessionId }
        });

        if (!session) {
            throw new NotFoundException('Onboarding session not found');
        }

        // Check if required steps are completed
        const sessionType = (session as Record<string, unknown>).type as OnboardingType || OnboardingType.TENANT_SETUP;
        const configs = sessionType === OnboardingType.TENANT_SETUP 
            ? this.tenantSetupConfigurations 
            : this.agentWelcomeConfigurations;
        const requiredSteps = Object.values(configs)
            .filter(step => step.isRequired)
            .map(step => step.id);

        const missingRequiredSteps = requiredSteps.filter(
            step => !session.completedSteps.includes(step)
        );

        if (missingRequiredSteps.length > 0 && !force) {
            throw new BadRequestException(
                `Missing required steps: ${missingRequiredSteps.join(', ')}`
            );
        }

        const completedAt = new Date();
        const totalTime = Math.round(
            (completedAt.getTime() - session.startedAt.getTime()) / (1000 * 60)
        ); // in minutes

        // Update session
        await this.databaseService.onboardingSession.update({
            where: { id: sessionId },
            data: {
                status: 'completed',
                completedAt,
                lastActivityAt: completedAt
            }
        });

        // Mark tenant onboarding as complete
        await this.databaseService.tenant.update({
            where: { id: session.tenantId },
            data: { onboardingComplete: true }
        });

        // Session completion is tracked automatically by the progress service

        // Get enabled features from step data
        const featuresEnabled = this.extractEnabledFeatures(session.stepData as Record<string, unknown>);

        return {
            success: true,
            completedAt,
            summary: {
                totalTime,
                stepsCompleted: session.completedSteps.length,
                featuresEnabled,
                type: sessionType,
                role: (session as Record<string, unknown>).role as OnboardingRole || OnboardingRole.TENANT_ADMIN
            }
        };
    }

    async getStepConfiguration(stepId: OnboardingStep, type?: OnboardingType): Promise<StepConfiguration> {
        const configs = type === OnboardingType.TENANT_SETUP 
            ? this.tenantSetupConfigurations 
            : this.agentWelcomeConfigurations;
        const config = (configs as Record<string, unknown>)[stepId];
        if (!config) {
            throw new NotFoundException('Step configuration not found');
        }
        return config as StepConfiguration;
    }

    private mapToOnboardingSession(session: Record<string, unknown>): OnboardingSession {
        return {
            id: session.id as string,
            userId: session.userId as string,
            tenantId: session.tenantId as string,
            type: (session.type as OnboardingType) || OnboardingType.TENANT_SETUP,
            role: (session.role as OnboardingRole) || OnboardingRole.TENANT_ADMIN,
            currentStep: session.currentStep as OnboardingStep,
            completedSteps: session.completedSteps as OnboardingStep[],
            stepData: session.stepData as Record<string, unknown>,
            status: session.status as 'active' | 'completed' | 'paused' | 'abandoned',
            startedAt: session.startedAt as Date,
            lastActivityAt: session.lastActivityAt as Date,
            completedAt: session.completedAt as Date | undefined,
            estimatedCompletion: session.estimatedCompletion as Date | undefined,
            metadata: session.metadata as Record<string, unknown>
        };
    }

    private getNextRecommendedStep(
        currentStep: OnboardingStep,
        completedSteps: OnboardingStep[],
        type?: OnboardingType
    ): OnboardingStep | null {
        const configs = type === OnboardingType.TENANT_SETUP 
            ? this.tenantSetupConfigurations 
            : this.agentWelcomeConfigurations;
            
        // Get all available steps that haven't been completed
        const availableSteps = Object.values(configs)
            .filter(step => !completedSteps.includes(step.id))
            .filter(step => {
                // Check if all dependencies are met
                const stepConfig = step as { dependencies?: OnboardingStep[] };
                return (stepConfig.dependencies || []).every((dep: OnboardingStep) => completedSteps.includes(dep));
            });

        // If current step is not completed, prioritize it
        if (!completedSteps.includes(currentStep)) {
            const currentStepConfig = (configs as Record<string, unknown>)[currentStep];
            if (currentStepConfig) {
                const stepConfig = currentStepConfig as { dependencies?: OnboardingStep[] };
                const dependenciesMet = (stepConfig.dependencies || []).every((dep: OnboardingStep) => completedSteps.includes(dep));
                if (dependenciesMet) {
                    return currentStep;
                }
            }
        }

        // Prioritize required steps first
        const requiredSteps = availableSteps.filter(step => step.isRequired);
        if (requiredSteps.length > 0) {
            return requiredSteps[0].id;
        }

        // Then optional steps
        if (availableSteps.length > 0) {
            return availableSteps[0].id;
        }

        // If no steps are available, check if we should continue with the current step
        if (!completedSteps.includes(currentStep)) {
            return currentStep;
        }

        return null;
    }

    private validateStepData(stepId: OnboardingStep, data: Record<string, unknown>, type?: OnboardingType): string[] {
        const errors: string[] = [];
        const configs = type === OnboardingType.TENANT_SETUP 
            ? this.tenantSetupConfigurations 
            : this.agentWelcomeConfigurations;
        const rules = ((configs as Record<string, unknown>)[stepId] as { validationRules?: Record<string, unknown> })?.validationRules || {};

        for (const [field, rule] of Object.entries(rules)) {
            const value = data[field];
            const ruleObj = rule as { required?: boolean; minLength?: number; pattern?: string };

            if (ruleObj.required && (!value || value.toString().trim() === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            if (value && ruleObj.minLength && value.toString().length < ruleObj.minLength) {
                errors.push(`${field} must be at least ${ruleObj.minLength} characters`);
            }

            if (value && ruleObj.pattern && !new RegExp(ruleObj.pattern).test(value.toString())) {
                errors.push(`${field} format is invalid`);
            }
        }

        return errors;
    }

    // New methods for two-tier system

    async getTenantSetupStatus(tenantId: string): Promise<TenantSetupStatus> {
        const tenant = await this.databaseService.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        const isCompleted = tenant.onboardingComplete || false;
        const completedAt = tenant.setupCompletedAt;
        const completedBy = tenant.setupCompletedBy || undefined;

        // Get all tenant setup sessions
        const sessions = await this.databaseService.onboardingSession.findMany({
            where: { 
                tenantId, 
                type: OnboardingType.TENANT_SETUP as string,
                status: 'completed'
            }
        });

        const allSteps = Object.keys(TenantSetupStep) as TenantSetupStep[];
        const completedSteps = sessions.flatMap(s => s.completedSteps as TenantSetupStep[]);
        const uniqueCompletedSteps = Array.from(new Set(completedSteps));
        const missingSteps = allSteps.filter(step => !uniqueCompletedSteps.includes(step));
        
        const progressPercentage = Math.round((uniqueCompletedSteps.length / allSteps.length) * 100);

        return {
            isCompleted,
            completedAt: completedAt ? new Date(completedAt) : undefined,
            completedBy,
            completedSteps: uniqueCompletedSteps,
            missingSteps,
            progressPercentage
        };
    }

    async getAgentWelcomeStatus(userId: string): Promise<AgentWelcomeStatus> {
        // Find the most recent agent welcome session for this user
        const session = await this.databaseService.onboardingSession.findFirst({
            where: { 
                userId,
                type: OnboardingType.AGENT_WELCOME as string
            },
            orderBy: { startedAt: 'desc' }
        });

        if (!session) {
            return {
                isCompleted: false,
                completedSteps: [],
                missingSteps: Object.values(AgentWelcomeStep),
                progressPercentage: 0,
                permissions: []
            };
        }

        const isCompleted = session.status === 'completed';
        const completedSteps = session.completedSteps as AgentWelcomeStep[];
        const allSteps = Object.values(AgentWelcomeStep);
        const missingSteps = allSteps.filter(step => !completedSteps.includes(step));
        const progressPercentage = Math.round((completedSteps.length / allSteps.length) * 100);

        // Get user permissions
        const permissions = await this.getUserPermissions();

        return {
            isCompleted,
            completedAt: session.completedAt || undefined,
            completedSteps,
            missingSteps,
            progressPercentage,
            assignedTeam: (session.stepData as Record<string, unknown>)?.teamId as string,
            permissions
        };
    }

    async completeTenantSetup(tenantId: string, completedBy: string): Promise<{ success: boolean; message: string }> {
        const completedAt = new Date();
        
        await this.databaseService.tenant.update({
            where: { id: tenantId },
            data: {
                onboardingComplete: true,
                setupCompletedAt: completedAt,
                setupCompletedBy: completedBy
            }
        });

        return {
            success: true,
            message: 'Tenant setup completed successfully'
        };
    }

    async getOnboardingType(userId: string, tenantId: string): Promise<{
        type: OnboardingType;
        role: OnboardingRole;
        isTenantOwner: boolean;
    }> {
        const tenant = await this.databaseService.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) {
            throw new NotFoundException('Tenant not found');
        }

        const isTenantOwner = tenant.ownerId === userId;
        const type = isTenantOwner ? OnboardingType.TENANT_SETUP : OnboardingType.AGENT_WELCOME;
        const role = isTenantOwner ? OnboardingRole.TENANT_ADMIN : OnboardingRole.AGENT;

        return {
            type,
            role,
            isTenantOwner
        };
    }

    async startAgentWelcome(
        userId: string, 
        tenantId: string, 
        context?: { invitedBy?: string; teamId?: string; permissions?: string[] }
    ): Promise<OnboardingSession> {
        // Check if tenant setup is complete
        const tenantStatus = await this.getTenantSetupStatus(tenantId);
        if (!tenantStatus.isCompleted) {
            throw new BadRequestException('Tenant setup must be completed before agents can be onboarded');
        }

        // Check if agent welcome already exists
        const existingSession = await this.databaseService.onboardingSession.findUnique({
            where: { userId_tenantId: { userId, tenantId } }
        });

        if (existingSession) {
            return this.mapToOnboardingSession(existingSession);
        }

        // Create new agent welcome session
        const session = await this.databaseService.onboardingSession.create({
            data: {
                userId,
                tenantId,
                type: OnboardingType.AGENT_WELCOME as string,
                role: OnboardingRole.AGENT as string,
                currentStep: AgentWelcomeStep.WELCOME,
                completedSteps: [],
                stepData: {
                    invitedBy: context?.invitedBy,
                    teamId: context?.teamId,
                    permissions: context?.permissions || []
                },
                status: 'active',
                estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
            }
        });

        return this.mapToOnboardingSession(session);
    }

    private getUserPermissions(): Promise<string[]> {
        // This would integrate with your existing permission system
        // For now, return basic permissions
        return Promise.resolve(['tickets:read', 'tickets:write', 'customers:read']);
    }


    private extractEnabledFeatures(stepData: Record<string, unknown>): string[] {
        const features: string[] = [];

        // Extract features from tenant setup steps
        if (stepData[TenantSetupStep.CHANNEL_CONFIGURATION]) {
            const channels = stepData[TenantSetupStep.CHANNEL_CONFIGURATION] as Record<string, unknown>;
            const whatsapp = channels?.whatsapp as Record<string, unknown>;
            const instagram = channels?.instagram as Record<string, unknown>;
            const email = channels?.email as Record<string, unknown>;

            if (whatsapp?.enabled) features.push('WhatsApp Integration');
            if (instagram?.enabled) features.push('Instagram Integration');
            if (email?.enabled) features.push('Email Integration');
        }

        if (stepData[TenantSetupStep.AI_CONFIGURATION]) {
            const ai = stepData[TenantSetupStep.AI_CONFIGURATION] as Record<string, unknown>;
            if (ai?.ticketClassification) features.push('AI Ticket Classification');
            if (ai?.sentimentAnalysis) features.push('Sentiment Analysis');
            if (ai?.autoResponse) features.push('Auto Response');
        }

        if (stepData[TenantSetupStep.PAYMENT_SETUP]) {
            features.push('Stripe Payment Processing');
        }

        if (stepData[TenantSetupStep.KNOWLEDGE_BASE]) {
            features.push('Knowledge Base');
        }

        if (stepData[TenantSetupStep.WORKFLOW_CONFIGURATION]) {
            features.push('Custom Workflows');
        }

        return features;
    }

    // Payment Integration Methods

    /**
     * Setup payment integration for tenant during onboarding
     */
    async setupPaymentIntegration(
        tenantId: string,
        request: {
            stripeAccount: StripeAccountSetupRequest;
            billingConfiguration: BillingConfigurationRequest;
        }
    ): Promise<{
        success: boolean;
        stripeAccount: Record<string, unknown>;
        onboardingUrl: string;
        message: string;
    }> {
        try {
            // Create Stripe account (if needed)
            const stripeAccount = await this.stripeService.createStripeAccount(
                tenantId,
                request.stripeAccount
            );

            // Apply billing configuration
            await this.stripeService.setupBillingConfiguration(
                tenantId,
                request.billingConfiguration
            );

            // Create an onboarding link
            const accountLink = await this.stripeService.createAccountLink(tenantId);

            return {
                success: true,
                stripeAccount: stripeAccount as unknown as Record<string, unknown>,
                onboardingUrl: accountLink.url,
                message: 'Payment integration initialized'
            };
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Failed to setup payment integration: ${message}`);
        }
    }

    /**
     * Handle payment step completion during onboarding
     */
    async handlePaymentStepCompletion(
        tenantId: string,
        stepData: Record<string, unknown>
    ): Promise<{ success: boolean; message: string; onboardingUrl?: string }> {
        try {
            const setupType = stepData.setupType as string;

            if (setupType === 'skip') {
                return {
                    success: true,
                    message: 'Payment setup skipped'
                };
            }

            if (setupType === 'manual') {
                return {
                    success: true,
                    message: 'Manual payment setup selected'
                };
            }

            if (setupType === 'stripe') {
                const stripeAccount = stepData.stripeAccount as StripeAccountSetupRequest;
                const billingConfiguration = stepData.billingConfiguration as BillingConfigurationRequest;

                if (!stripeAccount || !billingConfiguration) {
                    throw new BadRequestException('Stripe account and billing configuration are required');
                }

                const result = await this.setupPaymentIntegration(tenantId, {
                    stripeAccount,
                    billingConfiguration
                });

                return {
                    success: true,
                    message: result.message,
                    onboardingUrl: result.onboardingUrl
                };
            }

            throw new BadRequestException('Invalid payment setup type');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            throw new BadRequestException(`Failed to handle payment step: ${message}`);
        }
    }

    /**
     * Get payment status for tenant
     */
    async getPaymentStatus(tenantId: string) {
        return this.stripeService.getPaymentStatus(tenantId);
    }

    /**
     * Create account onboarding link
     */
    async createPaymentAccountLink(tenantId: string) {
        return this.stripeService.createAccountLink(tenantId);
    }

    /**
     * Get Stripe account information
     */
    async getStripeAccount(tenantId: string) {
        return this.stripeService.getStripeAccount(tenantId);
    }

    /**
     * Get billing configuration
     */
    async getBillingConfiguration(tenantId: string) {
        return this.stripeService.getBillingConfiguration(tenantId);
    }
}