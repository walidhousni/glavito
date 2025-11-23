'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  FaCheckCircle,
  FaExclamationCircle,
  FaTimesCircle,
  FaClock,
  FaSpinner,
  FaCog,
  FaSync,
  FaTrash,
  FaExternalLinkAlt,
  FaEllipsisV,
  FaChartBar,
  FaExclamationTriangle,
  FaWifi,
} from 'react-icons/fa';
import { getIntegrationIcon, getIntegrationColor } from '@/lib/icons/integration-icons';
import { OAuthConnectButton } from './oauth-connect-button';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Optional date-fns import
let formatDistanceToNow: ((date: Date, options?: { addSuffix?: boolean }) => string) | null = null;
try {
  formatDistanceToNow = require('date-fns').formatDistanceToNow;
} catch {
  // date-fns not installed, use fallback
}

interface IntegrationCardProps {
  provider: string;
  name: string;
  description: string;
  category: string;
  badges?: string[];
  isConnected: boolean;
  status?: 'connected' | 'syncing' | 'error' | 'disabled' | 'pending';
  healthStatus?: 'healthy' | 'degraded' | 'down' | 'maintenance';
  lastSync?: string | Date;
  lastError?: string;
  syncProgress?: {
    progress: number;
    totalRecords?: number;
    processedRecords?: number;
    entity?: string;
    status?: 'running' | 'completed' | 'failed';
    error?: string;
  };
  onConnect?: () => void;
  onConfigure?: () => void;
  onSync?: () => void;
  onDisable?: () => void;
  onViewDocs?: () => void;
  onTestConnection?: () => void;
  onViewLogs?: () => void;
}

export function IntegrationCard({
  provider,
  name,
  description,
  category,
  badges = [],
  isConnected,
  status = 'pending',
  healthStatus,
  lastSync,
  lastError,
  syncProgress,
  onConnect,
  onConfigure,
  onSync,
  onDisable,
  onViewDocs,
  onTestConnection,
  onViewLogs,
}: IntegrationCardProps) {
  const { toast } = useToast();
  const IconComponent = getIntegrationIcon(provider);
  const iconColor = getIntegrationColor(provider);

  const getStatusConfig = () => {
    switch (status) {
      case 'connected':
        return {
          icon: FaCheckCircle,
          label: 'Connected',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          borderColor: 'border-green-200 dark:border-green-800',
          pulse: false,
        };
      case 'syncing':
        return {
          icon: FaSpinner,
          label: 'Syncing...',
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          pulse: true,
        };
      case 'error':
        return {
          icon: FaTimesCircle,
          label: 'Error',
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          borderColor: 'border-red-200 dark:border-red-800',
          pulse: false,
        };
      case 'disabled':
        return {
          icon: FaExclamationCircle,
          label: 'Disabled',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
          pulse: false,
        };
      default:
        return {
          icon: FaClock,
          label: 'Not Connected',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          borderColor: 'border-border',
          pulse: false,
        };
    }
  };

  const getHealthConfig = () => {
    if (!healthStatus) return null;
    switch (healthStatus) {
      case 'healthy':
        return {
          icon: FaWifi,
          label: 'Healthy',
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-50 dark:bg-green-950/20',
          pulse: false,
        };
      case 'degraded':
        return {
          icon: FaExclamationTriangle,
          label: 'Degraded',
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
          pulse: false,
        };
      case 'down':
        return {
          icon: FaWifi,
          label: 'Down',
          color: 'text-red-600 dark:text-red-400 opacity-50',
          bgColor: 'bg-red-50 dark:bg-red-950/20',
          pulse: false,
        };
      case 'maintenance':
        return {
          icon: FaCog,
          label: 'Maintenance',
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          pulse: false,
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusConfig();
  const healthConfig = getHealthConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <Card className={cn(
      "group relative transition-all hover:shadow-md border",
      status === 'syncing' && "border-blue-200 dark:border-blue-800",
      status === 'error' && "border-red-200 dark:border-red-800",
    )}>
      {/* Status indicator bar */}
      <div
        className={cn(
          "absolute top-0 left-0 right-0 h-0.5 transition-colors",
          statusConfig.borderColor
        )}
      />

      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-3">
          {/* Icon */}
          <div className="relative flex-shrink-0">
            <div className="relative h-12 w-12 rounded-lg bg-muted p-2 flex items-center justify-center">
              <IconComponent
                className="h-full w-full"
                size={40}
                color={iconColor}
              />
            </div>
            
            {/* Status badge overlay */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "absolute -bottom-1 -right-1 rounded-full p-1 bg-background border",
                    statusConfig.bgColor
                  )}>
                    <StatusIcon
                      className={cn(
                        "h-3.5 w-3.5",
                        statusConfig.color,
                        statusConfig.pulse && "animate-spin"
                      )}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{statusConfig.label}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Health badge */}
            {healthConfig && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className={cn(
                      "absolute -top-1 -left-1 rounded-full p-1 bg-background border",
                      healthConfig.bgColor
                    )}>
                      <healthConfig.icon
                        className={cn(
                          "h-3 w-3",
                          healthConfig.color
                        )}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Health: {healthConfig.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>

          {/* Title and category */}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold truncate">{name}</CardTitle>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge variant="outline" className="text-xs">
                {category}
              </Badge>
              {badges.slice(0, 2).map((badge) => (
                <Badge key={badge} variant="secondary" className="text-xs">
                  {badge}
                </Badge>
              ))}
            </div>
          </div>

          {/* Quick actions menu */}
          {isConnected && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <FaEllipsisV className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onSync && (
                  <DropdownMenuItem onClick={onSync} disabled={status === 'syncing'}>
                    <FaSync className="h-4 w-4 mr-2" />
                    Sync Now
                  </DropdownMenuItem>
                )}
                {onTestConnection && (
                  <DropdownMenuItem onClick={onTestConnection}>
                    <FaChartBar className="h-4 w-4 mr-2" />
                    Test Connection
                  </DropdownMenuItem>
                )}
                {onViewLogs && (
                  <DropdownMenuItem onClick={onViewLogs}>
                    <FaExternalLinkAlt className="h-4 w-4 mr-2" />
                    View Logs
                  </DropdownMenuItem>
                )}
                {onConfigure && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onConfigure}>
                      <FaCog className="h-4 w-4 mr-2" />
                      Configure
                    </DropdownMenuItem>
                  </>
                )}
                {onDisable && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onDisable} className="text-destructive">
                      <FaTrash className="h-4 w-4 mr-2" />
                      Disable
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <CardDescription className="mt-3 line-clamp-2 text-sm">
          {description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-4 space-y-3">
        {/* Sync progress bar */}
        {syncProgress && syncProgress.status === 'running' && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Syncing {syncProgress.entity || 'data'}...</span>
              <span>{syncProgress.progress}%</span>
            </div>
            <Progress value={syncProgress.progress} className="h-2" />
            {syncProgress.totalRecords && (
              <div className="text-xs text-muted-foreground">
                {syncProgress.processedRecords || 0} / {syncProgress.totalRecords} records
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {lastError && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800">
            <FaExclamationCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700 dark:text-red-300 line-clamp-2">{lastError}</p>
          </div>
        )}

        {/* Last sync info */}
        {isConnected && lastSync && status !== 'syncing' && !syncProgress && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FaClock className="h-3 w-3" />
            <span>
              Last synced {typeof lastSync === 'string' 
                ? lastSync 
                : formatDistanceToNow 
                  ? formatDistanceToNow(new Date(lastSync), { addSuffix: true })
                  : new Date(lastSync).toLocaleString()}
            </span>
          </div>
        )}

        {/* Status message */}
        {!syncProgress && (
          <div className={cn("flex items-center gap-2 text-sm font-medium", statusConfig.color)}>
            <StatusIcon className={cn("h-4 w-4", statusConfig.pulse && "animate-spin")} />
            <span>{statusConfig.label}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex flex-wrap gap-2">
        {!isConnected ? (
          <>
            <div className="flex-1">
              <OAuthConnectButton
                provider={provider}
                providerName={name}
                onSuccess={() => {
                  onConnect?.();
                }}
                onError={(error) => {
                  toast({
                    title: 'Connection failed',
                    description: error || 'Failed to connect integration',
                    variant: 'destructive',
                  });
                }}
              >
                <Button size="sm" className="w-full">
                  Connect
                </Button>
              </OAuthConnectButton>
            </div>
            {onViewDocs && (
              <Button onClick={onViewDocs} size="sm" variant="outline">
                <FaExternalLinkAlt className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <>
            {onSync && status !== 'syncing' && (
              <Button onClick={onSync} size="sm" variant="outline" className="flex-1">
                <FaSync className="h-4 w-4 mr-1" />
                Sync Now
              </Button>
            )}
            {onConfigure && (
              <Button onClick={onConfigure} size="sm" variant="outline">
                <FaCog className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </CardFooter>
    </Card>
  );
}
