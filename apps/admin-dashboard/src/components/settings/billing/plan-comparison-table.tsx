'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlanComparisonTableProps {
  plans: Array<{
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly: number;
    features: Record<string, string | number | boolean>;
    isPopular?: boolean;
  }>;
  billingCycle: 'monthly' | 'yearly';
}

export function PlanComparisonTable({ plans, billingCycle }: PlanComparisonTableProps) {
  // Define feature rows based on plan limits
  const featureRows = [
    { key: 'agents', label: 'Agents', format: (v: number) => v === -1 ? 'Unlimited' : v.toString() },
    { key: 'teams', label: 'Teams', format: (v: number) => v === -1 ? 'Unlimited' : v.toString() },
    { key: 'monthlyActiveContacts', label: 'Monthly Active Contacts (MACs)', format: (v: number) => v === -1 ? 'Unlimited' : v.toLocaleString() },
    { key: 'aiAgentCredits', label: 'AI Agent Credits', format: (v: number | string) => v === 'unlimited' || v === -1 ? 'Unlimited' : v.toLocaleString() },
    { key: 'aiAgents', label: 'AI Agents', format: (v: number) => v === -1 ? 'Unlimited' : v.toString() },
    { key: 'messagingChannels', label: 'Messaging Channels', format: (v: number) => v === -1 ? 'Unlimited' : v.toString() },
    { key: 'broadcastMessages', label: 'Broadcast Messages', format: (v: number) => v === -1 ? 'Unlimited' : v.toLocaleString() },
    { key: 'knowledgeBaseUploads', label: 'Knowledge Base Uploads', format: (v: number) => v === -1 ? 'Unlimited' : v.toString() },
    { key: 'trainingUrls', label: 'Training URLs', format: (v: number) => v === -1 ? 'Unlimited' : v.toString() },
    { key: 'unlimitedAIUsage', label: 'Unlimited AI Usage', format: (v: boolean) => v ? 'Yes' : 'No' },
    { key: 'freeOnboarding', label: 'FREE ONBOARDING SUPPORT', format: (v: boolean) => v ? 'Yes' : 'No' },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Plan Comparison</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-4 font-semibold">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} className={cn(
                    "text-center p-4 font-semibold",
                    plan.isPopular && "bg-primary/5"
                  )}>
                    <div className="flex flex-col items-center gap-2">
                      <span>{plan.name}</span>
                      {plan.isPopular && (
                        <Badge className="bg-primary text-primary-foreground">Most Popular</Badge>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureRows.map((row, idx) => (
                <tr key={row.key} className={cn(
                  "border-b",
                  idx % 2 === 0 && "bg-muted/20"
                )}>
                  <td className="p-4 font-medium">{row.label}</td>
                  {plans.map((plan) => {
                    const value = plan.features[row.key];
                    const displayValue = (row.format as any)(value);
                    const hasFeature = value !== undefined && value !== null && value !== false && value !== 0;
                    
                    return (
                      <td key={plan.id} className={cn(
                        "text-center p-4",
                        plan.isPopular && "bg-primary/5"
                      )}>
                        {hasFeature ? (
                          <div className="flex items-center justify-center gap-2">
                            <Check className="w-4 h-4 text-green-600" />
                            <span>{displayValue}</span>
                          </div>
                        ) : (
                          <X className="w-4 h-4 text-muted-foreground mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

