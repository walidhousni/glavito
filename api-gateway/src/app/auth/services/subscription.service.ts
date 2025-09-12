import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import type { AuthSubscription } from '@glavito/shared-auth';
import { UsageTrackingService } from '../../usage/usage-tracking.service';

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  limits: {
    agents: number;
    customers: number;
    tickets: number;
    storage: number; // in MB
    apiCalls: number;
  };
  isActive: boolean;
}

@Injectable()
export class SubscriptionService {
  private readonly plans: SubscriptionPlan[] = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      currency: 'USD',
      features: [
        'Up to 3 agents',
        'Basic ticketing',
        'Email support',
        'Basic analytics',
      ],
      limits: {
        agents: 3,
        customers: 100,
        tickets: 1000,
        storage: 1024, // 1GB
        apiCalls: 10000,
      },
      isActive: true,
    },
    {
      id: 'professional',
      name: 'Professional',
      price: 49,
      currency: 'USD',
      features: [
        'Up to 10 agents',
        'Advanced ticketing',
        'Priority email support',
        'Advanced analytics',
        'Custom integrations',
        'SSO support',
      ],
      limits: {
        agents: 10,
        customers: 1000,
        tickets: 10000,
        storage: 10240, // 10GB
        apiCalls: 100000,
      },
      isActive: true,
    },
    {
      id: 'business',
      name: 'Business',
      price: 149,
      currency: 'USD',
      features: [
        'Unlimited agents',
        'Enterprise features',
        '24/7 phone support',
        'Custom branding',
        'Advanced security',
        'API access',
      ],
      limits: {
        agents: -1, // unlimited
        customers: -1, // unlimited
        tickets: -1, // unlimited
        storage: 102400, // 100GB
        apiCalls: 1000000,
      },
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

    const price = billingCycle === 'yearly' ? plan.price * 12 * 0.8 : plan.price;

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
        } as Record<string, unknown>,
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
    const price = effectiveBillingCycle === 'yearly' ? newPlan.price * 12 * 0.8 : newPlan.price;

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
        } as Record<string, unknown>,
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
    resource: 'agents' | 'customers' | 'tickets' | 'storage' | 'apiCalls',
    currentUsage: number,
  ): Promise<{ allowed: boolean; limit: number; current: number; remaining: number }> {
    const subscription = await this.getTenantSubscription(tenantId);
    const planLimits = (this.plans.find(p => p.id === (subscription as { plan?: string })?.plan) || this.plans[0]).limits;
    
    const limit = (planLimits as Record<string, number>)[resource];
    if (limit === -1) { // unlimited
      return {
        allowed: true,
        limit: -1,
        current: currentUsage,
        remaining: -1,
      };
    }

    const remaining = limit - currentUsage;
    return {
      allowed: remaining > 0,
      limit,
      current: currentUsage,
      remaining,
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
    };
    limits: Record<string, number>;
  }> {
    const subscription = await this.getTenantSubscription(tenantId);
    const plan = this.plans.find(p => p.id === (subscription as { plan?: string })?.plan) || this.plans[0];
    
    // Count actual usage
    const [agents, customers, tickets] = await Promise.all([
      this.databaseService.user.count({ where: { tenantId } }),
      this.databaseService.customer.count({ where: { tenantId } }),
      this.databaseService.ticket.count({ where: { tenantId } }),
    ]);

    // Get real usage data from tracking service
    const [storageUsage, apiCalls] = await Promise.all([
      this.usageTracking.getStorageUsage(tenantId),
      this.usageTracking.getApiUsage(tenantId),
    ]);

    const usage = {
      agents,
      customers,
      tickets,
      storage: Math.round(storageUsage / 1024 / 1024), // Convert bytes to MB
      apiCalls,
    };

    return {
      subscription,
      usage,
      limits: plan.limits,
    };
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
        metadata: { price: 0, currency: 'USD', billingCycle: 'monthly', features: starterPlan.features, limits: starterPlan.limits } as Record<string, unknown>,
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