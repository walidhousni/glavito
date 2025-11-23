'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Icon } from '@/lib/icons';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { useBilling } from '@/lib/hooks/use-billing';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface UsageMetric {
  id: string;
  name: string;
  icon: keyof typeof import('@/lib/icons').icons;
  current: number;
  limit: number | string;
  unit: string;
  alertThreshold?: number;
}

export function UsageDashboard() {
  const t = useTranslations('settings.billing.usage');
  const { usage, loading, error, loadUsage, openBillingPortal } = useBilling();
  
  const [editingMetric, setEditingMetric] = useState<UsageMetric | null>(null);
  const [newThreshold, setNewThreshold] = useState<number>(80);

  useEffect(() => {
    loadUsage();
  }, [loadUsage]);

  // Convert usage data to metrics format
  const metrics: UsageMetric[] = usage && usage.limits ? [
    {
      id: 'api_calls',
      name: 'API Calls',
      icon: 'zap',
      current: usage.apiCalls || 0,
      limit: usage.limits.apiCalls || 0,
      unit: 'calls',
      alertThreshold: 80,
    },
    {
      id: 'storage',
      name: 'Storage',
      icon: 'database',
      current: usage.storage || 0,
      limit: usage.limits.storage || 0,
      unit: 'GB',
      alertThreshold: 90,
    },
    {
      id: 'seats',
      name: 'Team Seats',
      icon: 'users',
      current: usage.seats || 0,
      limit: usage.limits.agents || 0,
      unit: 'seats',
      alertThreshold: 100,
    },
    {
      id: 'messages',
      name: 'Messages Sent',
      icon: 'messageSquare',
      current: usage.messages || 0,
      limit: usage.limits.tickets || 10000,
      unit: 'messages',
      alertThreshold: 85,
    },
    {
      id: 'agents',
      name: 'Agents',
      icon: 'users',
      current: usage.agents || 0,
      limit: usage.limits.agents || 0,
      unit: 'agents',
      alertThreshold: 100,
    },
    {
      id: 'teams',
      name: 'Teams',
      icon: 'users',
      current: usage.teams || 0,
      limit: usage.limits.teams || 0,
      unit: 'teams',
      alertThreshold: 100,
    },
    {
      id: 'monthly_active_contacts',
      name: 'Monthly Active Contacts',
      icon: 'users',
      current: usage.monthlyActiveContacts || 0,
      limit: usage.limits.monthlyActiveContacts || 0,
      unit: 'contacts',
      alertThreshold: 85,
    },
    {
      id: 'ai_agents',
      name: 'AI Agents',
      icon: 'zap',
      current: usage.aiAgents || 0,
      limit: usage.limits.aiAgents || 0,
      unit: 'agents',
      alertThreshold: 85,
    },
    {
      id: 'messaging_channels',
      name: 'Messaging Channels',
      icon: 'messageSquare',
      current: usage.messagingChannels || 0,
      limit: usage.limits.messagingChannels || 0,
      unit: 'channels',
      alertThreshold: 85,
    },
    {
      id: 'broadcast_messages',
      name: 'Broadcast Messages',
      icon: 'messageSquare',
      current: usage.broadcastMessages || 0,
      limit: usage.limits.broadcastMessages || 0,
      unit: 'messages',
      alertThreshold: 85,
    },
  ] : [];

  const getUsagePercentage = (current: number, limit: number | string) => {
    if (limit === 0 || limit === -1 || limit === 'unlimited') return 0; // Unlimited or no limit
    if (typeof limit === 'number' && limit >= 999999) return 0;
    return Math.round((current / Number(limit)) * 100);
  };

  const getProgressColor = (percentage: number, alertThreshold = 80) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= alertThreshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatNumber = (num: number, unit: string) => {
    if (unit === 'GB') {
      return `${num.toFixed(2)} ${unit}`;
    }
    return `${num.toLocaleString()} ${unit}`;
  };

  const handleUpdateThreshold = () => {
    if (!editingMetric) return;

    toast({
      title: 'Alert threshold updated',
      description: `You'll be notified when usage reaches ${newThreshold}%`,
    });

    setEditingMetric(null);
  };

  const handleUpgrade = async () => {
    try {
      await openBillingPortal();
    } catch (err) {
      toast({
        title: 'Failed to open billing portal',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Usage Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {metrics.map((metric) => {
          const percentage = getUsagePercentage(metric.current, metric.limit);
          const IconComponent = Icon;
          const isUnlimited = metric.limit === -1 || metric.limit === 'unlimited' || (typeof metric.limit === 'number' && metric.limit >= 999999);

          return (
            <Card key={metric.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <IconComponent name={metric.icon} className="w-5 h-5 text-primary" />
                    </div>
                    <CardTitle className="text-base">{metric.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-bold">
                      {formatNumber(metric.current, '')}
                    </span>
                    <span className="text-sm text-muted-foreground ml-1">
                      {isUnlimited ? '' : ` / ${formatNumber(typeof metric.limit === 'number' ? metric.limit : 0, metric.unit)}`}
                    </span>
                  </div>
                  {!isUnlimited && (
                    <span
                      className={cn(
                        'text-sm font-medium',
                        percentage >= 100
                          ? 'text-red-600'
                          : percentage >= (metric.alertThreshold || 80)
                          ? 'text-yellow-600'
                          : 'text-green-600'
                      )}
                    >
                      {percentage}%
                    </span>
                  )}
                </div>

                {!isUnlimited && (
                  <div className="space-y-1">
                    <Progress
                      value={Math.min(percentage, 100)}
                      className={cn('h-2', getProgressColor(percentage, metric.alertThreshold))}
                    />
                    {percentage >= (metric.alertThreshold || 80) && (
                      <p className="text-xs text-muted-foreground">
                        {percentage >= 100
                          ? '⚠️ Limit reached - consider upgrading'
                          : `⚠️ Approaching limit (${metric.alertThreshold}% threshold)`}
                      </p>
                    )}
                  </div>
                )}

                {isUnlimited && (
                  <div className="text-sm text-muted-foreground">
                    Unlimited
                  </div>
                )}

                {!isUnlimited && (
                  <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      {formatNumber(Math.max(0, (typeof metric.limit === 'number' ? metric.limit : 0) - metric.current), metric.unit)} {t('remaining')}
                    </span>
                    {metric.alertThreshold && (
                      <span>Alert at {metric.alertThreshold}%</span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Usage Alerts Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icon name="bell" className="w-5 h-5" />
            {t('usageAlerts')}
          </CardTitle>
          <CardDescription>
            Configure alerts for when you approach usage limits
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics
              .filter((m) => {
                const pct = getUsagePercentage(m.current, m.limit);
                return pct >= (m.alertThreshold || 80) && (typeof m.limit === 'number' && m.limit < 999999);
              })
              .map((metric) => (
                <div
                  key={metric.id}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Icon name="alertCircle" className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <p className="text-sm font-medium">{metric.name} Alert</p>
                      <p className="text-xs text-muted-foreground">
                        Currently at {getUsagePercentage(metric.current, metric.limit)}% of limit
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleUpgrade}>
                    Upgrade Plan
                  </Button>
                </div>
              ))}

            {metrics.filter((m) => {
              const pct = getUsagePercentage(m.current, m.limit);
              return pct >= (m.alertThreshold || 80) && (typeof m.limit === 'number' && m.limit < 999999);
            }).length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Icon name="checkCircle" className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p className="text-sm">All usage within normal limits</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Threshold Dialog */}
      {editingMetric && (
        <Dialog open={!!editingMetric} onOpenChange={() => setEditingMetric(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Configure Alert Threshold</DialogTitle>
              <DialogDescription>
                Set the usage percentage that triggers an alert for {editingMetric.name}
              </DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="threshold">Alert Threshold (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  value={newThreshold}
                  onChange={(e) => setNewThreshold(parseInt(e.target.value) || 80)}
                />
                <p className="text-xs text-muted-foreground">
                  You&apos;ll receive an alert when usage reaches this percentage
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Current: {formatNumber(editingMetric.current, editingMetric.unit)}</span>
                    <span>Limit: {formatNumber(typeof editingMetric.limit === 'number' ? editingMetric.limit : 0, editingMetric.unit)}</span>
                  </div>
                  <Progress value={getUsagePercentage(editingMetric.current, editingMetric.limit)} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>0%</span>
                    <span className="text-yellow-600">Alert at {newThreshold}%</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingMetric(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateThreshold}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
