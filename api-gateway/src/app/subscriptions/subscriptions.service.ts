import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type { AuthSubscription } from '@glavito/shared-auth';
import { UsageTrackingService } from '../usage/usage-tracking.service';
import type { Prisma } from '@prisma/client';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  priceYearly: number; // Yearly price (with discount)
  currency: string;
  features: string[];
  limits: {
    agents: number; // -1 for unlimited
    customers: number; // -1 for unlimited
    tickets: number; // -1 for unlimited
    storage: number; // in MB, -1 for unlimited
    apiCalls: number; // -1 for unlimited
    monthlyActiveContacts: number; // MACs limit, -1 for unlimited
    aiAgentCredits: number | 'unlimited'; // AI agent credits per month
    aiAgents: number; // Number of AI agents allowed, -1 for unlimited
    messagingChannels: number; // Number of messaging channels, -1 for unlimited
    broadcastMessages: number; // Monthly broadcast message limit, -1 for unlimited
    knowledgeBaseUploads: number; // Files per agent, -1 for unlimited
    trainingUrls: number; // URLs per agent, -1 for unlimited
    characterLimits: number; // Characters from documents/URLs per agent, -1 for unlimited
    teams: number; // Number of teams allowed, -1 for unlimited
    users: number; // Number of users allowed, -1 for unlimited
  };
  unlimitedAIUsage?: boolean; // Flag for unlimited AI usage
  isPopular?: boolean; // Most popular badge
  isActive: boolean;
}

@Injectable()
export class SubscriptionService {
  private readonly plans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      priceYearly: 0,
      currency: 'USD',
      features: [
        'Up to 3 agents',
        'Up to 1 team',
        'Up to 1,000 MACs',
        'Basic ticketing',
        'Email support',
        'Basic analytics',
        'Up to 3 messaging channels',
      ],
      limits: {
        agents: 3,
        customers: 100,
        tickets: 1000,
        storage: 1024, // 1GB
        apiCalls: 10000,
        monthlyActiveContacts: 1000,
        aiAgentCredits: 1000,
        aiAgents: 1,
        messagingChannels: 3,
        broadcastMessages: 100,
        knowledgeBaseUploads: 5,
        trainingUrls: 3,
        characterLimits: 100000,
        teams: 1,
        users: 5,
      },
      isActive: true,
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 49,
      priceYearly: 452, // 23% discount: 49 * 12 * 0.77 = 452.76 ≈ 452
      currency: 'USD',
      features: [
        'Up to 10 agents',
        'Up to 5 teams',
        'Up to 10,000 MACs',
        'Advanced ticketing',
        'Priority email support',
        'Advanced analytics',
        'Custom integrations',
        'SSO support',
        'Up to 10 messaging channels',
        '5,000 AI agent credits/month',
        'Unlimited AI usage',
        'FREE ONBOARDING SUPPORT',
      ],
      limits: {
        agents: 10,
        customers: 1000,
        tickets: 10000,
        storage: 10240, // 10GB
        apiCalls: 100000,
        monthlyActiveContacts: 10000,
        aiAgentCredits: 5000,
        aiAgents: 5,
        messagingChannels: 10,
        broadcastMessages: 1000,
        knowledgeBaseUploads: 20,
        trainingUrls: 10,
        characterLimits: 500000,
        teams: 5,
        users: 20,
      },
      unlimitedAIUsage: true,
      isPopular: true,
      isActive: true,
    },
    {
      id: 'business',
      name: 'Business',
      price: 149,
      priceYearly: 1376, // 23% discount: 149 * 12 * 0.77 = 1376.76 ≈ 1376
      currency: 'USD',
      features: [
        'Unlimited agents',
        'Unlimited teams',
        'Unlimited MACs',
        'Enterprise features',
        '24/7 phone support',
        'Custom branding',
        'Advanced security',
        'API access',
        'Unlimited messaging channels',
        'Unlimited AI agent credits',
        'Unlimited AI usage',
        'FREE ONBOARDING SUPPORT',
      ],
      limits: {
        agents: -1, // unlimited
        customers: -1, // unlimited
        tickets: -1, // unlimited
        storage: 102400, // 100GB
        apiCalls: 1000000,
        monthlyActiveContacts: -1, // unlimited
        aiAgentCredits: 'unlimited',
        aiAgents: -1, // unlimited
        messagingChannels: -1, // unlimited
        broadcastMessages: -1, // unlimited
        knowledgeBaseUploads: -1, // unlimited
        trainingUrls: -1, // unlimited
        characterLimits: -1, // unlimited
        teams: -1, // unlimited
        users: -1, // unlimited
      },
      unlimitedAIUsage: true,
      isActive: true,
    },
  ];

  constructor(
    private readonly databaseService: DatabaseService,
    private readonly usageTracking: UsageTrackingService,
  ) {}

  async getAvailablePlans(): Promise<SubscriptionPlan[]> {
    return this.plans.filter(plan => plan.isActive);
  }

  async getPlanById(planId: string): Promise<SubscriptionPlan | undefined> {
    return this.plans.find(plan => plan.id === planId);
  }

  async getTenantSubscription(tenantId: string): Promise<AuthSubscription> {
    const subscription = await this.databaseService.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      // Create default starter subscription
      return this.createDefaultSubscription(tenantId);
    }

    return subscription as AuthSubscription;
  }

  async createSubscription(
    tenantId: string,
    planId: string,
    billingCycle: 'monthly' | 'yearly' = 'monthly',
  ): Promise<AuthSubscription> {
    const plan = this.plans.find(p => p.id === planId);
    if (!plan) {
      throw new BadRequestException('Invalid subscription plan');
    }

    const existingSubscription = await this.databaseService.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (existingSubscription && existingSubscription.status === 'active') {
      throw new BadRequestException('Active subscription already exists');
    }

    const price = billingCycle === 'yearly' ? plan.priceYearly : plan.price;

    const subscription = await this.databaseService.subscription.create({
      data: {
        tenantId,
        plan: planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd(billingCycle),
        metadata: {
          price,
          currency: plan.currency,
          billingCycle,
          features: plan.features,
          limits: plan.limits,
        } as Prisma.InputJsonValue,
      },
    });

    // Reflect plan on Tenant
    await this.databaseService.tenant.update({ where: { id: tenantId }, data: { plan: planId } });

    return subscription as AuthSubscription;
  }

  async updateSubscription(
    tenantId: string,
    newPlanId: string,
    billingCycle?: 'monthly' | 'yearly',
  ): Promise<AuthSubscription> {
    const currentSubscription = await this.databaseService.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!currentSubscription) {
      throw new NotFoundException('No subscription found');
    }

    const newPlan = this.plans.find(p => p.id === newPlanId);
    if (!newPlan) {
      throw new BadRequestException('Invalid subscription plan');
    }

    const effectiveBillingCycle = billingCycle || (currentSubscription as { metadata?: { billingCycle?: string } })?.metadata?.billingCycle || 'monthly';
    const price = effectiveBillingCycle === 'yearly' ? newPlan.priceYearly : newPlan.price;

    const updatedSubscription = await this.databaseService.subscription.update({
      where: { id: currentSubscription.id },
      data: {
        plan: newPlanId,
        metadata: {
          ...(currentSubscription as { metadata?: Record<string, unknown> })?.metadata,
          price,
          currency: newPlan.currency,
          billingCycle: effectiveBillingCycle,
          features: newPlan.features,
          limits: newPlan.limits,
        } as Prisma.InputJsonValue,
        updatedAt: new Date(),
      },
    });

    // Reflect updated plan on Tenant
    await this.databaseService.tenant.update({ where: { id: tenantId }, data: { plan: newPlanId } });

    return updatedSubscription as AuthSubscription;
  }

  async cancelSubscription(tenantId: string): Promise<AuthSubscription> {
    const subscription = await this.databaseService.subscription.findFirst({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    if (!subscription) {
      throw new NotFoundException('No subscription found');
    }

    const cancelled = await this.databaseService.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        canceledAt: new Date(),
        currentPeriodEnd: new Date(),
      },
    }) as unknown as AuthSubscription;

    // Revert tenant plan to starter when cancelled
    try {
      await this.databaseService.tenant.update({ where: { id: tenantId }, data: { plan: 'starter' } });
    } catch {
      // ignore
    }

    return cancelled;
  }

  async checkUsageLimits(
    tenantId: string,
    resource: 'agents' | 'customers' | 'tickets' | 'storage' | 'apiCalls' | 'teams' | 'users' | 'monthlyActiveContacts' | 'aiAgents' | 'messagingChannels' | 'broadcastMessages' | 'knowledgeBaseUploads' | 'trainingUrls' | 'characterLimits',
    currentUsage: number,
  ): Promise<{ allowed: boolean; limit: number | string; current: number; remaining: number | string; message?: string }> {
    const subscription = await this.getTenantSubscription(tenantId);
    const plan = this.plans.find(p => p.id === (subscription as { plan?: string })?.plan) || this.plans[0];
    const planLimits = plan.limits;
    
    const limit = (planLimits as Record<string, number | string>)[resource];
    
    // Handle unlimited cases
    if (limit === -1 || limit === 'unlimited') {
      return {
        allowed: true,
        limit: -1,
        current: currentUsage,
        remaining: -1,
      };
    }

    const numericLimit = typeof limit === 'number' ? limit : 0;
    const remaining = numericLimit - currentUsage;
    
    return {
      allowed: remaining > 0,
      limit: numericLimit,
      current: currentUsage,
      remaining,
      message: remaining <= 0 
        ? `You've reached your ${plan.name} plan limit of ${numericLimit} ${resource}. Upgrade to continue.`
        : undefined,
    };
  }

  async getUsageReport(tenantId: string): Promise<{
    subscription: AuthSubscription;
    usage: {
      agents: number;
      customers: number;
      tickets: number;
      storage: number;
      apiCalls: number;
      teams: number;
      users: number;
      monthlyActiveContacts: number;
      aiAgents: number;
      messagingChannels: number;
      broadcastMessages: number;
    };
    limits: Record<string, number | string>;
  }> {
    const subscription = await this.getTenantSubscription(tenantId);
    const plan = this.plans.find(p => p.id === (subscription as { plan?: string })?.plan) || this.plans[0];
    
    // Count actual usage
    const [agents, customers, tickets, teams, users, channels] = await Promise.all([
      this.databaseService.user.count({ where: { tenantId, role: 'agent' } }),
      this.databaseService.customer.count({ where: { tenantId } }),
      this.databaseService.ticket.count({ where: { tenantId } }),
      this.databaseService.team.count({ where: { tenantId } }),
      this.databaseService.user.count({ where: { tenantId } }),
      this.databaseService.channel.count({ where: { tenantId, isActive: true } }),
    ]);

    // Get real usage data from tracking service
    const [storageUsage, apiCalls] = await Promise.all([
      this.usageTracking.getStorageUsage(tenantId),
      this.usageTracking.getApiUsage(tenantId),
    ]);

    // Calculate monthly active contacts (MACs) - count unique customers with conversations in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const monthlyActiveContacts = await this.databaseService.conversation.groupBy({
      by: ['customerId'],
      where: {
        tenantId,
        createdAt: { gte: thirtyDaysAgo },
      },
      _count: { customerId: true },
    }).then(result => result.length);

    // Count AI agents (users with AI agent profiles)
    const aiAgents = await this.databaseService.user.count({
      where: {
        tenantId,
        role: 'agent',
        // Assuming AI agents have a specific flag or can be identified
        // This is a placeholder - adjust based on your actual schema
      },
    });

    // Broadcast messages count (would need to track this separately)
    const broadcastMessages = 0; // Placeholder - implement tracking

    const usage = {
      agents,
      customers,
      tickets,
      storage: Math.round(storageUsage / 1024 / 1024), // Convert bytes to MB
      apiCalls,
      teams,
      users,
      monthlyActiveContacts,
      aiAgents,
      messagingChannels: channels,
      broadcastMessages,
    };

    return {
      subscription,
      usage,
      limits: plan.limits as Record<string, number | string>,
    };
  }

  async getCurrentUsage(tenantId: string): Promise<Record<string, number>> {
    const report = await this.getUsageReport(tenantId);
    return report.usage;
  }

  private async createDefaultSubscription(tenantId: string): Promise<AuthSubscription> {
    const starterPlan = this.plans.find(p => p.id === 'starter');
    if (!starterPlan) {
      throw new Error('Starter plan not found');
    }
    
    const subscription = await this.databaseService.subscription.create({
      data: {
        tenantId,
        plan: 'starter',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.calculatePeriodEnd('monthly'),
        metadata: { price: 0, currency: 'USD', billingCycle: 'monthly', features: starterPlan.features, limits: starterPlan.limits } as Prisma.InputJsonValue,
      },
    });

    return subscription as AuthSubscription;
  }

  private calculatePeriodEnd(billingCycle: 'monthly' | 'yearly'): Date {
    const now = new Date();
    if (billingCycle === 'yearly') {
      return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
    }
    return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
}