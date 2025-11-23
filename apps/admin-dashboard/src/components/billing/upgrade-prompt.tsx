'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Sparkles, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBilling } from '@/lib/hooks/use-billing';

interface UpgradePromptProps {
  onDismiss?: () => void;
  className?: string;
}

export function UpgradePrompt({ onDismiss, className }: UpgradePromptProps) {
  const router = useRouter();
  const { subscription, usage, loading } = useBilling();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if user has dismissed this prompt
    const dismissedKey = `upgrade-prompt-dismissed-${subscription?.planId || 'starter'}`;
    const isDismissed = localStorage.getItem(dismissedKey) === 'true';
    setDismissed(isDismissed);
  }, [subscription?.planId]);

  const handleDismiss = () => {
    const dismissedKey = `upgrade-prompt-dismissed-${subscription?.planId || 'starter'}`;
    localStorage.setItem(dismissedKey, 'true');
    setDismissed(true);
    onDismiss?.();
  };

  const handleUpgrade = () => {
    router.push('/dashboard/admin-settings?tab=billing');
  };

  // Don't show if dismissed, loading, or on business plan
  if (dismissed || loading || subscription?.planId === 'business') {
    return null;
  }

  // Check if user is on free/starter plan
  const isFreePlan = !subscription || subscription.planId === 'starter' || subscription.status === 'canceled';

  // Check if limits are approaching (80%+ usage)
  const isApproachingLimit = usage && usage.limits ? (() => {
    const checks = [
      usage.agents >= (usage.limits.agents * 0.8),
      usage.teams >= ((usage.limits.teams || 0) * 0.8),
      usage.monthlyActiveContacts >= ((usage.limits.monthlyActiveContacts || 0) * 0.8),
    ];
    return checks.some(Boolean);
  })() : false;

  // Don't show if not free plan and not approaching limits
  if (!isFreePlan && !isApproachingLimit) {
    return null;
  }

  const suggestedPlan = subscription?.planId === 'starter' ? 'Professional' : 'Business';

  return (
    <Card className={cn(
      'border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 relative overflow-hidden',
      className
    )}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
      <div className="relative p-4 md:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-lg">
                {isFreePlan ? 'Upgrade to unlock more features' : 'You\'re approaching your limits'}
              </h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {isFreePlan 
                ? `Upgrade to ${suggestedPlan} plan to get more agents, teams, and advanced features.`
                : 'Consider upgrading to avoid hitting your plan limits.'}
            </p>
            <div className="flex items-center gap-3">
              <Button onClick={handleUpgrade} size="sm" className="bg-primary hover:bg-primary/90">
                <TrendingUp className="w-4 h-4 mr-2" />
                Upgrade Now
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="text-muted-foreground hover:text-foreground"
              >
                Maybe later
              </Button>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 flex-shrink-0"
            onClick={handleDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

