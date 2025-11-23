'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign,
  MoreHorizontal,
  Eye,
  MessageSquare,
  Target,
  Download
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface CustomerSegmentCardProps {
  segment: {
    id: string;
    name: string;
    description: string;
    customerCount: number;
    averageValue: number;
    growthRate: number;
    color: string;
    icon: React.ComponentType<{ className?: string }>;
  };
  onClick?: () => void;
  onExport?: (format: 'json' | 'csv') => void;
  onTriggerWorkflow?: () => void;
  onViewDetails?: () => void;
  onSendCampaign?: () => void;
  lastTriggeredAt?: Date | string | null;
}

export function CustomerSegmentCard({ segment, onClick, onExport, onTriggerWorkflow, onViewDetails, onSendCampaign, lastTriggeredAt }: CustomerSegmentCardProps) {
  const t = useTranslations('customers');
  const Icon = segment.icon;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const getGrowthIcon = (rate: number) => {
    return rate > 0 ? TrendingUp : TrendingDown;
  };

  return (
    <Card 
      className="cursor-pointer group transition-all hover:shadow-md"
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`${segment.name} segment with ${segment.customerCount} customers`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{segment.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{segment.description}</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); if (onViewDetails) { onViewDetails(); } else if (onClick) { onClick(); } }}>
                <Eye className="mr-2 h-4 w-4" />
                {t('viewDetails', { default: 'View details' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExport?.('json'); }}>
                <Download className="mr-2 h-4 w-4" />
                {t('exportData', { default: 'Export data' })} JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onExport?.('csv'); }}>
                <Download className="mr-2 h-4 w-4" />
                {t('exportData', { default: 'Export data' })} CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSendCampaign?.(); }}>
                <MessageSquare className="mr-2 h-4 w-4" />
                {t('sendCampaign', { default: 'Send campaign' })}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onTriggerWorkflow?.(); }}>
                <Target className="mr-2 h-4 w-4" />
                {t('createAutomation', { default: 'Create automation' })}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Users className="h-3 w-3" />
              <span>{t('segments.customers')}</span>
            </div>
            <div className="text-lg font-semibold">{segment.customerCount.toLocaleString()}</div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <DollarSign className="h-3 w-3" />
              <span>{t('segments.avgValue')}</span>
            </div>
            <div className="text-lg font-semibold">{formatCurrency(segment.averageValue)}</div>
          </div>
        </div>

        {/* Growth Rate */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{t('segments.monthlyGrowth')}</span>
            <Badge variant={segment.growthRate > 0 ? "default" : "destructive"}>
              {React.createElement(getGrowthIcon(segment.growthRate), {
                className: "h-3 w-3 mr-1"
              })}
              {segment.growthRate > 0 ? '+' : ''}{segment.growthRate}%
            </Badge>
          </div>
        </div>

        {/* Segment Health Indicator */}
        <div className="pt-3 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">{t('segments.segmentHealth')}</span>
            <Badge 
              variant={
                segment.growthRate > 10 ? "default" :
                segment.growthRate > 0 ? "secondary" :
                segment.growthRate > -10 ? "outline" :
                "destructive"
              }
            >
              {segment.growthRate > 10 ? t('excellent') :
               segment.growthRate > 0 ? t('good') :
               segment.growthRate > -10 ? t('attention') :
               t('critical')}
            </Badge>
          </div>
          {lastTriggeredAt && (
            <div className="text-xs text-muted-foreground flex items-center gap-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span>Last triggered: {typeof lastTriggeredAt === 'string' ? lastTriggeredAt : new Date(lastTriggeredAt).toLocaleString()}</span>
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              if (onViewDetails) onViewDetails(); else if (onClick) onClick();
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            {t('segments.viewCustomers')}
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onSendCampaign?.();
            }}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {t('segments.createCampaign')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}