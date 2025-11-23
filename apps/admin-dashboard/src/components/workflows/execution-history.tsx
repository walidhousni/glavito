'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Download,
  Filter,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface FlowRun {
  id: string;
  flowId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt?: string;
  durationMs?: number;
  errorMessage?: string;
  input: any;
  output?: any;
  events?: FlowEvent[];
}

interface FlowEvent {
  id: string;
  nodeKey?: string;
  eventType: string;
  severity: 'info' | 'warning' | 'error';
  message?: string;
  data?: any;
  timestamp: string;
}

interface ExecutionHistoryProps {
  flowId?: string;
  tenantId?: string;
  onRetry?: (runId: string) => void;
}

export function ExecutionHistory({ flowId, tenantId, onRetry }: ExecutionHistoryProps) {
  const [runs, setRuns] = useState<FlowRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRun, setSelectedRun] = useState<FlowRun | null>(null);
  const [expandedRuns, setExpandedRuns] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list');

  useEffect(() => {
    loadRuns();
  }, [flowId, statusFilter]);

  const loadRuns = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const data = await workflowsApi.getExecutions(flowId, { status: statusFilter !== 'all' ? statusFilter : undefined });
      
      // Mock data for demonstration
      const mockRuns: FlowRun[] = [
        {
          id: 'run-1',
          flowId: flowId || 'flow-1',
          status: 'completed',
          startedAt: new Date(Date.now() - 3600000).toISOString(),
          completedAt: new Date(Date.now() - 3500000).toISOString(),
          durationMs: 1240,
          input: { customerId: 'cust-123' },
          output: { success: true },
          events: [
            {
              id: 'evt-1',
              nodeKey: 'node-1',
              eventType: 'node_enter',
              severity: 'info',
              message: 'Entered trigger node',
              timestamp: new Date(Date.now() - 3600000).toISOString(),
            },
            {
              id: 'evt-2',
              nodeKey: 'node-2',
              eventType: 'node_exit',
              severity: 'info',
              message: 'Completed create ticket action',
              timestamp: new Date(Date.now() - 3500000).toISOString(),
            },
          ],
        },
        {
          id: 'run-2',
          flowId: flowId || 'flow-1',
          status: 'failed',
          startedAt: new Date(Date.now() - 7200000).toISOString(),
          completedAt: new Date(Date.now() - 7100000).toISOString(),
          durationMs: 850,
          errorMessage: 'Channel ID not found',
          input: { customerId: 'cust-456' },
          events: [
            {
              id: 'evt-3',
              nodeKey: 'node-1',
              eventType: 'node_enter',
              severity: 'info',
              message: 'Entered trigger node',
              timestamp: new Date(Date.now() - 7200000).toISOString(),
            },
            {
              id: 'evt-4',
              nodeKey: 'node-2',
              eventType: 'error',
              severity: 'error',
              message: 'Channel ID not found',
              timestamp: new Date(Date.now() - 7100000).toISOString(),
            },
          ],
        },
        {
          id: 'run-3',
          flowId: flowId || 'flow-1',
          status: 'running',
          startedAt: new Date(Date.now() - 300000).toISOString(),
          input: { customerId: 'cust-789' },
          events: [
            {
              id: 'evt-5',
              nodeKey: 'node-1',
              eventType: 'node_enter',
              severity: 'info',
              message: 'Entered trigger node',
              timestamp: new Date(Date.now() - 300000).toISOString(),
            },
          ],
        },
      ];
      
      setRuns(mockRuns);
    } catch (error) {
      console.error('Failed to load execution history:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (runId: string) => {
    setExpandedRuns(prev => {
      const next = new Set(prev);
      if (next.has(runId)) {
        next.delete(runId);
      } else {
        next.add(runId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'running':
        return <Clock className="w-5 h-5 text-blue-600 animate-pulse" />;
      case 'cancelled':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      case 'failed':
        return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'running':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'cancelled':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const handleRetry = (runId: string) => {
    if (onRetry) {
      onRetry(runId);
    }
  };

  const handleExport = () => {
    const json = JSON.stringify(runs, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-executions-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Execution History
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            View and debug workflow runs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[150px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="running">Running</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm" onClick={loadRuns}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* View Toggle */}
      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList>
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="timeline">Timeline View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-4">
          <ScrollArea className="h-[600px]">
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading...</div>
              ) : runs.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No executions found</p>
                  </CardContent>
                </Card>
              ) : (
                runs.map(run => {
                  const isExpanded = expandedRuns.has(run.id);
                  return (
                    <Card key={run.id} className="overflow-hidden">
                      <div
                        className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => toggleExpand(run.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-0.5">
                              {isExpanded ? (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                {getStatusIcon(run.status)}
                                <Badge className={cn(getStatusColor(run.status))}>
                                  {run.status}
                                </Badge>
                                <span className="text-sm text-gray-500">
                                  {format(new Date(run.startedAt), 'MMM dd, yyyy HH:mm:ss')}
                                </span>
                                {run.durationMs && (
                                  <span className="text-sm text-gray-500">
                                    ({run.durationMs}ms)
                                  </span>
                                )}
                              </div>
                              {run.errorMessage && (
                                <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                                  {run.errorMessage}
                                </p>
                              )}
                            </div>
                          </div>
                          {run.status === 'failed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRetry(run.id);
                              }}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Retry
                            </Button>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4">
                          {/* Input/Output */}
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Input
                              </h4>
                              <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                {JSON.stringify(run.input, null, 2)}
                              </pre>
                            </div>
                            {run.output && (
                              <div>
                                <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Output
                                </h4>
                                <pre className="text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700 overflow-x-auto">
                                  {JSON.stringify(run.output, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>

                          {/* Events Log */}
                          {run.events && run.events.length > 0 && (
                            <div>
                              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                Execution Log
                              </h4>
                              <div className="space-y-2">
                                {run.events.map(event => (
                                  <div
                                    key={event.id}
                                    className="flex items-start gap-2 text-xs bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700"
                                  >
                                    <span className="text-gray-400 font-mono whitespace-nowrap">
                                      {format(new Date(event.timestamp), 'HH:mm:ss.SSS')}
                                    </span>
                                    <span className={cn('font-semibold', getSeverityColor(event.severity))}>
                                      {event.eventType}
                                    </span>
                                    {event.nodeKey && (
                                      <span className="text-gray-500">@{event.nodeKey}</span>
                                    )}
                                    <span className="flex-1 text-gray-700 dark:text-gray-300">
                                      {event.message}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="p-12 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4" />
              <p>Timeline view coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ExecutionHistory;

