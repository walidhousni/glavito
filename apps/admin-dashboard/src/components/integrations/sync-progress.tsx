'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaClock,
  FaTimes,
} from 'react-icons/fa';

interface SyncEntityProgress {
  entity: string;
  status: 'pending' | 'syncing' | 'completed' | 'error';
  imported?: number;
  updated?: number;
  skipped?: number;
  error?: string;
}

interface SyncProgressProps {
  provider: string;
  providerName: string;
  isOpen: boolean;
  onClose: () => void;
  onCancel?: () => void;
  progress: number;
  entities: SyncEntityProgress[];
  estimatedTime?: string;
}

export function SyncProgress({
  provider,
  providerName,
  isOpen,
  onClose,
  onCancel,
  progress,
  entities,
  estimatedTime,
}: SyncProgressProps) {
  if (!isOpen) return null;

  const totalImported = entities.reduce((sum, e) => sum + (e.imported || 0), 0);
  const totalErrors = entities.filter((e) => e.status === 'error').length;
  const isComplete = entities.every((e) => e.status === 'completed' || e.status === 'error');

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle>Syncing {providerName}</CardTitle>
              <p className="text-sm text-muted-foreground">
                {isComplete
                  ? `Sync completed - ${totalImported} records imported`
                  : `Syncing data from ${providerName}...`}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <FaTimes className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          {/* Overall progress */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Overall Progress</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-3" />
            {estimatedTime && !isComplete && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FaClock className="h-3 w-3" />
                <span>Estimated time remaining: {estimatedTime}</span>
              </div>
            )}
          </div>

          {/* Entity breakdown */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Entities</div>
            {entities.map((entity) => (
              <div
                key={entity.entity}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  {/* Status icon */}
                  {entity.status === 'completed' && (
                    <FaCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  )}
                  {entity.status === 'syncing' && (
                    <FaSpinner className="h-5 w-5 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
                  )}
                  {entity.status === 'error' && (
                    <FaTimesCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  )}
                  {entity.status === 'pending' && (
                    <FaClock className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  )}

                  {/* Entity name */}
                  <div className="space-y-1">
                    <div className="font-medium capitalize">{entity.entity}</div>
                    {entity.status === 'error' && entity.error && (
                      <div className="text-xs text-red-600 dark:text-red-400">{entity.error}</div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex gap-2">
                  {entity.imported !== undefined && entity.imported > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {entity.imported} imported
                    </Badge>
                  )}
                  {entity.updated !== undefined && entity.updated > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {entity.updated} updated
                    </Badge>
                  )}
                  {entity.skipped !== undefined && entity.skipped > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {entity.skipped} skipped
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          {isComplete && (
            <div className="mt-6 p-4 rounded-lg border bg-muted/50 space-y-3">
              <div className="font-medium text-sm">Sync Summary</div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Total Imported</div>
                  <div className="text-xl font-semibold text-green-600 dark:text-green-400">
                    {totalImported}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Errors</div>
                  <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                    {totalErrors}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Success Rate</div>
                  <div className="text-xl font-semibold">
                    {totalErrors === 0 ? '100' : Math.round(((entities.length - totalErrors) / entities.length) * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex justify-end gap-2">
            {!isComplete && onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel Sync
              </Button>
            )}
            {isComplete && (
              <Button onClick={onClose}>Close</Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

