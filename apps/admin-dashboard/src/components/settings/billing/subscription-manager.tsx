'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useBilling } from '@/lib/hooks/use-billing';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Loader2, Check, Sparkles } from 'lucide-react';
import { PlanComparisonTable } from './plan-comparison-table';

interface Plan {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  features: string[];
  isPopular?: boolean;
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
  limits?: {
    agents?: number;
    teams?: number;
    monthlyActiveContacts?: number;
    aiAgentCredits?: number | 'unlimited';
    aiAgents?: number;
    messagingChannels?: number;
    broadcastMessages?: number;
    knowledgeBaseUploads?: number;
    trainingUrls?: number;
    unlimitedAIUsage?: boolean;
  };
}

export function SubscriptionManager() {
  const t = useTranslations('settings.billing.subscription');
  const { plans: apiPlans, subscription, loading, error, subscribeToPlan } = useBilling();
  
  const [showChangePlanDialog, setShowChangePlanDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [subscribing, setSubscribing] = useState(false);

  // Convert API plans to UI format - ensure apiPlans is always an array
  const safeApiPlans = Array.isArray(apiPlans) ? apiPlans : [];
  const plans: Plan[] = safeApiPlans.reduce((acc, apiPlan) => {
    if (!apiPlan || typeof apiPlan !== 'object') return acc;
    
    // Extract plan ID from slug (e.g., 'professional-monthly' -> 'professional')
    const planId = apiPlan.id.split('-')[0];
    const price = apiPlan.unitAmount / 100; // Convert cents to dollars
    const isMonthly = apiPlan.interval === 'month';
    
    const existing = acc.find(p => p.id === planId);
    if (existing) {
      if (isMonthly) {
        existing.priceMonthly = price;
        existing.stripePriceIdMonthly = apiPlan.stripePriceId;
      } else {
        existing.priceYearly = price;
        existing.stripePriceIdYearly = apiPlan.stripePriceId;
      }
      // Merge limits if available
      if (apiPlan.limits) {
        existing.limits = { ...existing.limits, ...apiPlan.limits };
      }
    } else {
      acc.push({
        id: planId,
        name: apiPlan.name,
        priceMonthly: isMonthly ? price : 0,
        priceYearly: !isMonthly ? price : 0,
        currency: apiPlan.currency?.toUpperCase() || 'USD',
        features: Array.isArray(apiPlan.features) ? apiPlan.features : [],
        isPopular: apiPlan.isPopular || planId === 'professional',
        stripePriceIdMonthly: isMonthly ? apiPlan.stripePriceId : undefined,
        stripePriceIdYearly: !isMonthly ? apiPlan.stripePriceId : undefined,
        limits: apiPlan.limits,
      });
    }
    return acc;
  }, [] as Plan[]);

  const currentPlan = plans.find((p) => p.id === subscription?.planId || p.id === 'starter');

  const getStatusBadge = (status: string) => {
    const config = {
      active: { label: t('status.active'), color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
      trialing: { label: t('status.trialing'), color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
      past_due: { label: t('status.past_due'), color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' },
      canceled: { label: t('status.canceled'), color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' },
    };

    const statusConfig = config[status as keyof typeof config] || config.active;

    return (
      <Badge className={cn('text-xs', statusConfig.color)}>
        {statusConfig.label}
      </Badge>
    );
  };

  const handleChangePlan = async () => {
    if (!selectedPlan) return;

    const plan = plans.find(p => p.id === selectedPlan);
    if (!plan) return;

    const priceId = billingCycle === 'monthly' ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
    if (!priceId) {
      toast({
        title: 'Plan not available',
        description: `This billing cycle is not available for ${plan.name}`,
        variant: 'destructive',
      });
      return;
    }

    setSubscribing(true);
    try {
      await subscribeToPlan(priceId);
      // The redirect will happen, so we don't need to do anything else
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start checkout';
      toast({
        title: 'Checkout failed',
        description: message,
        variant: 'destructive',
      });
      setSubscribing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      const { stripeApi } = await import('@/lib/api/stripe-client');
      const returnUrl = `${window.location.origin}/dashboard/admin-settings?tab=billing`;
      const { url } = await stripeApi.createPortal(returnUrl);
      window.location.href = url;
    } catch (err) {
      toast({
        title: 'Failed to open billing portal',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(d);
  };

  const getPrice = (plan: Plan) => {
    return billingCycle === 'monthly' ? plan.priceMonthly : plan.priceYearly;
  };

  const getSavingsPercentage = () => {
    if (!currentPlan) return 0;
    const monthlyTotal = currentPlan.priceMonthly * 12;
    const yearlyTotal = currentPlan.priceYearly;
    if (!yearlyTotal || !monthlyTotal) return 0;
    return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
  };

  if (loading && !subscription) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96 mt-2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Current Subscription Card */}
      {subscription && currentPlan && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {t('currentPlan')}
                  {getStatusBadge(subscription.status)}
                </CardTitle>
                <CardDescription>
                  {subscription.currentPeriodEnd
                    ? t('renewsOn', { date: formatDate(subscription.currentPeriodEnd) })
                    : t('noActiveSubscription')}
                </CardDescription>
              </div>
              <Button onClick={() => setShowChangePlanDialog(true)}>
                <Icon name="trendingUp" className="w-4 h-4 mr-2" />
                {t('changePlan')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold">
                ${getPrice(currentPlan)}
              </span>
              <span className="text-muted-foreground">
                / {billingCycle === 'monthly' ? 'month' : 'year'}
              </span>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t('planFeatures')}</h4>
              <ul className="space-y-2">
                {currentPlan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm">
                    <Icon name="checkCircle" className="w-4 h-4 text-green-600" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowCancelDialog(true)}
              >
                {t('cancelSubscription')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {!subscription && (
        <Card>
          <CardHeader>
            <CardTitle>{t('noActivePlan')}</CardTitle>
            <CardDescription>{t('choosePlan')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setShowChangePlanDialog(true)}>
              {t('selectPlan')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Change Plan Dialog */}
      <Dialog open={showChangePlanDialog} onOpenChange={setShowChangePlanDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{t('changePlan')}</DialogTitle>
            <DialogDescription>
              {t('chooseNewPlan')}
            </DialogDescription>
          </DialogHeader>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-4 py-4">
            <Button
              variant={billingCycle === 'monthly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('monthly')}
            >
              {t('monthly')}
            </Button>
            <Button
              variant={billingCycle === 'yearly' ? 'default' : 'outline'}
              onClick={() => setBillingCycle('yearly')}
            >
              {t('yearly')}
              {billingCycle === 'yearly' && (
                <Badge variant="secondary" className="ml-2">
                  {t('save', { percentage: getSavingsPercentage() })}
                </Badge>
              )}
            </Button>
          </div>

          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="cards">Plan Cards</TabsTrigger>
              <TabsTrigger value="comparison">Compare Plans</TabsTrigger>
            </TabsList>
            
            <TabsContent value="cards">
              {/* Plans Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card
                    key={plan.id}
                    className={cn(
                      'cursor-pointer transition-all hover:shadow-xl relative',
                      selectedPlan === plan.id && 'ring-2 ring-primary shadow-lg',
                      plan.isPopular && 'border-2 border-primary shadow-md'
                    )}
                    onClick={() => setSelectedPlan(plan.id)}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="bg-primary text-primary-foreground px-3 py-1">
                          <Sparkles className="w-3 h-3 mr-1" />
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    <CardHeader className={cn('pb-4', plan.isPopular && 'pt-8')}>
                      <CardTitle className="text-2xl mb-2">{plan.name}</CardTitle>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-bold">${getPrice(plan)}</span>
                        <span className="text-muted-foreground text-sm">
                          /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                        </span>
                      </div>
                      {billingCycle === 'yearly' && plan.priceMonthly > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          ${plan.priceMonthly}/mo billed annually
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {plan.features.slice(0, 6).map((feature, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                        {plan.features.length > 6 && (
                          <li className="text-xs text-muted-foreground">
                            +{plan.features.length - 6} more features
                          </li>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="comparison">
              <PlanComparisonTable
                plans={plans.map(p => ({
                  id: p.id,
                  name: p.name,
                  priceMonthly: p.priceMonthly,
                  priceYearly: p.priceYearly,
                  features: {
                    agents: p.limits?.agents ?? 0,
                    teams: p.limits?.teams ?? 0,
                    monthlyActiveContacts: p.limits?.monthlyActiveContacts ?? 0,
                    aiAgentCredits: p.limits?.aiAgentCredits ?? 0,
                    aiAgents: p.limits?.aiAgents ?? 0,
                    messagingChannels: p.limits?.messagingChannels ?? 0,
                    broadcastMessages: p.limits?.broadcastMessages ?? 0,
                    knowledgeBaseUploads: p.limits?.knowledgeBaseUploads ?? 0,
                    trainingUrls: p.limits?.trainingUrls ?? 0,
                    unlimitedAIUsage: p.limits?.unlimitedAIUsage ?? false,
                    freeOnboarding: p.features.some(f => f.includes('FREE ONBOARDING')),
                  },
                  isPopular: p.isPopular,
                }))}
                billingCycle={billingCycle}
              />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowChangePlanDialog(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleChangePlan} disabled={!selectedPlan || subscribing}>
              {subscribing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t('processing')}
                </>
              ) : (
                t('confirmChange')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('cancelSubscriptionTitle')}</DialogTitle>
            <DialogDescription>
              {t('cancelSubscriptionDesc')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)}>
              {t('keepSubscription')}
            </Button>
            <Button variant="destructive" onClick={handleCancelSubscription}>
              {t('yesCancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
