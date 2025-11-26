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
  Download,
  ArrowRight
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card 
        className="cursor-pointer group relative overflow-hidden border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300"
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
        {/* Gradient Background Effect */}
        <div className={cn(
          "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
          "bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5"
        )} />

        <CardHeader className="pb-3 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={cn(
                "p-2.5 rounded-xl transition-colors duration-300",
                "bg-blue-50 dark:bg-blue-900/20 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30"
              )}>
                <Icon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {segment.name}
                </CardTitle>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                  {segment.description}
                </p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
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
        
        <CardContent className="space-y-5 relative z-10">
          {/* Key Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group-hover:border-blue-100 dark:group-hover:border-blue-900/30 transition-colors">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                <Users className="h-3.5 w-3.5" />
                <span>{t('segments.customers')}</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {segment.customerCount.toLocaleString()}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 group-hover:border-blue-100 dark:group-hover:border-blue-900/30 transition-colors">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{t('segments.avgValue')}</span>
              </div>
              <div className="text-xl font-bold text-slate-900 dark:text-white">
                {formatCurrency(segment.averageValue)}
              </div>
            </div>
          </div>

          {/* Growth Rate & Health */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <Badge 
                variant="outline" 
                className={cn(
                  "px-2 py-0.5 border-0",
                  segment.growthRate > 0 
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400" 
                    : "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                )}
              >
                {React.createElement(getGrowthIcon(segment.growthRate), {
                  className: "h-3 w-3 mr-1"
                })}
                {segment.growthRate > 0 ? '+' : ''}{segment.growthRate}%
              </Badge>
              <span className="text-xs text-slate-400 dark:text-slate-500">vs last month</span>
            </div>

            {lastTriggeredAt && (
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Active</span>
              </div>
            )}
          </div>

          {/* Quick Actions Overlay (visible on hover) */}
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-white via-white to-transparent dark:from-slate-900 dark:via-slate-900 translate-y-full group-hover:translate-y-0 transition-transform duration-300 flex gap-2">
            <Button 
              size="sm" 
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20"
              onClick={(e) => {
                e.stopPropagation();
                if (onViewDetails) onViewDetails(); else if (onClick) onClick();
              }}
            >
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {t('segments.viewCustomers')}
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                onSendCampaign?.();
              }}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
              Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}