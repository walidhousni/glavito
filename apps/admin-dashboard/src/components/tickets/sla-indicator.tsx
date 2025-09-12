'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SLAIndicatorProps {
  slaInstance?: {
    status: string;
    firstResponseDue?: string;
    firstResponseAt?: string;
    resolutionDue?: string;
    resolutionAt?: string;
    breachCount?: number;
  };
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function SLAIndicator({ slaInstance, size = 'sm', showText = false }: SLAIndicatorProps) {
  if (!slaInstance) {
    return null;
  }

  const now = new Date();
  const isOverdue = slaInstance.resolutionDue && new Date(slaInstance.resolutionDue) < now && !slaInstance.resolutionAt;
  const isAtRisk = slaInstance.resolutionDue && 
    new Date(slaInstance.resolutionDue).getTime() - now.getTime() < 2 * 60 * 60 * 1000 && // Less than 2 hours
    !slaInstance.resolutionAt;
  const isCompleted = slaInstance.status === 'completed' || slaInstance.resolutionAt;
  const isBreached = slaInstance.status === 'breached' || slaInstance.breachCount > 0;

  const getVariant = () => {
    if (isBreached || isOverdue) return 'destructive';
    if (isAtRisk) return 'secondary';
    if (isCompleted) return 'default';
    return 'outline';
  };

  const getIcon = () => {
    const iconSize = size === 'sm' ? 'h-3 w-3' : size === 'md' ? 'h-4 w-4' : 'h-5 w-5';
    
    if (isBreached || isOverdue) return <AlertTriangle className={cn(iconSize, 'text-red-500')} />;
    if (isAtRisk) return <Clock className={cn(iconSize, 'text-orange-500')} />;
    if (isCompleted) return <CheckCircle className={cn(iconSize, 'text-green-500')} />;
    return <Timer className={cn(iconSize, 'text-blue-500')} />;
  };

  const getText = () => {
    if (isBreached || isOverdue) return 'Breached';
    if (isAtRisk) return 'At Risk';
    if (isCompleted) return 'Met';
    return 'On Track';
  };

  const getTimeRemaining = () => {
    if (!slaInstance.resolutionDue || isCompleted) return null;
    
    const timeLeft = new Date(slaInstance.resolutionDue).getTime() - now.getTime();
    if (timeLeft < 0) return 'Overdue';
    
    const hours = Math.floor(timeLeft / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="flex items-center gap-1">
      <Badge variant={getVariant()} className={cn(
        'flex items-center gap-1',
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        size === 'md' && 'text-sm px-2 py-1',
        size === 'lg' && 'text-base px-3 py-1.5'
      )}>
        {getIcon()}
        {showText && <span>{getText()}</span>}
      </Badge>
      {size !== 'sm' && (
        <span className={cn(
          'text-gray-500',
          size === 'md' ? 'text-xs' : 'text-sm'
        )}>
          {getTimeRemaining()}
        </span>
      )}
    </div>
  );
}

export function SLAStatusBadge({ status, breachCount }: { status: string; breachCount?: number }) {
  const getVariant = () => {
    switch (status) {
      case 'breached': return 'destructive';
      case 'completed': return 'default';
      case 'paused': return 'secondary';
      case 'active': return 'outline';
      default: return 'outline';
    }
  };

  const getIcon = () => {
    switch (status) {
      case 'breached': return <AlertTriangle className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      case 'paused': return <Clock className="h-3 w-3" />;
      case 'active': return <Timer className="h-3 w-3" />;
      default: return <Timer className="h-3 w-3" />;
    }
  };

  return (
    <Badge variant={getVariant()} className="flex items-center gap-1 text-xs">
      {getIcon()}
      <span className="capitalize">{status}</span>
      {breachCount > 0 && (
        <span className="ml-1 bg-red-500 text-white rounded-full px-1 text-xs">
          {breachCount}
        </span>
      )}
    </Badge>
  );
}