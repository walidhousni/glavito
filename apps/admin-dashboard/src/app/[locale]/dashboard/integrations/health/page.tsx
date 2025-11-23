'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useIntegrationsStore } from '@/lib/store/integrations-store';
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Activity,
  Clock,
  TrendingUp,
  Zap,
  RefreshCw,
  Filter,
  Download,
  Search,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export default function IntegrationHealthPage() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const {
    healthStatuses,
    logs,
    logsLoading,
    fetchHealthStatuses,
    fetchLogs,
    getIntegrationHealth,
    testConnection,
  } = useIntegrationsStore();

  const [loading, setLoading] = useState(true);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    searchParams.get('integration') || null
  );
  const [logFilter, setLogFilter] = useState({
    status: '',
    action: '',
    search: '',
  });
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedHealth, setSelectedHealth] = useState<any>(null);

  useEffect(() => {
    loadHealthData();
  }, []);

  useEffect(() => {
    if (selectedIntegration) {
      fetchLogs({ integrationId: selectedIntegration, limit: 50 });
    }
  }, [selectedIntegration, fetchLogs]);

  // Poll health statuses every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchHealthStatuses();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchHealthStatuses]);

  const loadHealthData = async () => {
    try {
      setLoading(true);
      await fetchHealthStatuses();
      if (selectedIntegration) {
        await fetchLogs({ integrationId: selectedIntegration, limit: 50 });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Failed to load health data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async (integrationId: string) => {
    try {
      await getIntegrationHealth(integrationId);
      toast({
        title: 'Health check refreshed',
        description: 'Integration health status updated',
      });
    } catch (error: any) {
      toast({
        title: 'Refresh failed',
        description: error?.message,
        variant: 'destructive',
      });
    }
  };

  const handleTest = async (provider: string) => {
    try {
      await testConnection(provider);
      await fetchHealthStatuses();
      toast({
        title: 'Connection test completed',
        description: 'Check the status table for results',
      });
    } catch (error: any) {
      toast({
        title: 'Test failed',
        description: error?.message,
        variant: 'destructive',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500 animate-pulse" />;
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'maintenance':
        return <Activity className="h-5 w-5 text-gray-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, 'default' | 'destructive' | 'secondary'> = {
      healthy: 'default',
      degraded: 'secondary',
      down: 'destructive',
      maintenance: 'secondary',
    };
    return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
  };

  const getLogStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
    }
  };

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesStatus = !logFilter.status || log.status === logFilter.status;
      const matchesAction = !logFilter.action || log.action.toLowerCase().includes(logFilter.action.toLowerCase());
      const matchesSearch = !logFilter.search || 
        log.action.toLowerCase().includes(logFilter.search.toLowerCase()) ||
        log.errorMessage?.toLowerCase().includes(logFilter.search.toLowerCase());
      return matchesStatus && matchesAction && matchesSearch;
    });
  }, [logs, logFilter]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const healthyCount = healthStatuses.filter((h) => h.status === 'healthy').length;
  const degradedCount = healthStatuses.filter((h) => h.status === 'degraded').length;
  const downCount = healthStatuses.filter((h) => h.status === 'down').length;
  const avgUptime = healthStatuses.length > 0
    ? healthStatuses.reduce((acc, h) => acc + h.successRate, 0) / healthStatuses.length
    : 0;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Integration Health</h1>
          <p className="text-muted-foreground">
            Monitor the health and performance of your integrations
          </p>
        </div>
        <Button onClick={loadHealthData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Healthy</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthyCount}</div>
            <p className="text-xs text-muted-foreground">All systems operational</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Degraded</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{degradedCount}</div>
            <p className="text-xs text-muted-foreground">Experiencing issues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Down</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{downCount}</div>
            <p className="text-xs text-muted-foreground">Not responding</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgUptime.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Integration Status</CardTitle>
              <CardDescription>
                Real-time health status of all connected integrations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4 gap-2">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant={logFilter.status === '' ? 'default' : 'outline'} onClick={() => setLogFilter({ ...logFilter, status: '' })}>All</Button>
                  <Button size="sm" variant={logFilter.status === 'success' ? 'default' : 'outline'} onClick={() => setLogFilter({ ...logFilter, status: 'success' })}>Success</Button>
                  <Button size="sm" variant={logFilter.status === 'warning' ? 'default' : 'outline'} onClick={() => setLogFilter({ ...logFilter, status: 'warning' })}>Warning</Button>
                  <Button size="sm" variant={logFilter.status === 'error' ? 'default' : 'outline'} onClick={() => setLogFilter({ ...logFilter, status: 'error' })}>Error</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Input className="w-48" placeholder="Search provider..." onChange={(e) => {
                    // reuse search in logs filter to avoid new state
                    setLogFilter({ ...logFilter, search: e.target.value });
                  }} />
                </div>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Integration</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Success Rate</TableHead>
                    <TableHead>Last Check</TableHead>
                    <TableHead>Last Error</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {healthStatuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No integrations connected yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    healthStatuses.map((health) => (
                      <TableRow key={health.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(health.status)}
                            {health.integration?.provider || 'Unknown'}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(health.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={cn(
                                  "h-2 rounded-full transition-all",
                                  health.successRate >= 95 ? "bg-green-500" :
                                  health.successRate >= 80 ? "bg-yellow-500" : "bg-red-500"
                                )}
                                style={{ width: `${health.successRate}%` }}
                              />
                            </div>
                            <span className="text-sm">{health.successRate.toFixed(1)}%</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(health.lastCheck), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell>
                          {health.lastError ? (
                            <div className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                              {health.lastError}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedIntegration(health.integrationId);
                                setDetailModalOpen(true);
                                setSelectedHealth(health);
                              }}
                            >
                              View Details
                            </Button>
                            {health.integration?.provider && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleTest(health.integration!.provider)}
                              >
                                <Activity className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRefresh(health.integrationId)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Activity Logs</CardTitle>
                  <CardDescription>
                    Recent integration activity and sync operations
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search logs..."
                    value={logFilter.search}
                    onChange={(e) => setLogFilter({ ...logFilter, search: e.target.value })}
                    className="w-48"
                  />
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : filteredLogs.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {selectedIntegration ? 'No logs found' : 'Select an integration to view its activity logs'}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Error</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(log.createdAt), {
                              addSuffix: true,
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{log.action}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === 'success' ? 'default' : log.status === 'error' ? 'destructive' : 'secondary'}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {log.direction && (
                            <Badge variant="outline">{log.direction}</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.duration ? (
                            <div className="flex items-center gap-1">
                              <Zap className="h-3 w-3" />
                              {log.duration}ms
                            </div>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>
                          {log.recordsProcessed !== undefined && (
                            <div className="text-sm">
                              {log.recordsProcessed}
                              {log.recordsFailed !== undefined && log.recordsFailed > 0 && (
                                <span className="text-red-600 dark:text-red-400 ml-1">
                                  ({log.recordsFailed} failed)
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.errorMessage ? (
                            <div className="text-xs text-red-600 dark:text-red-400 max-w-xs truncate">
                              {log.errorMessage}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Integration Details</DialogTitle>
            <DialogDescription>
              Detailed health information for {selectedHealth?.integration?.provider}
            </DialogDescription>
          </DialogHeader>
          {selectedHealth && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(selectedHealth.status)}
                      {getStatusBadge(selectedHealth.status)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Success Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedHealth.successRate.toFixed(1)}%</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Error Count</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{selectedHealth.errorCount}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Avg Sync Time</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {selectedHealth.avgSyncTime ? `${selectedHealth.avgSyncTime}ms` : '-'}
                    </div>
                  </CardContent>
                </Card>
              </div>
              {selectedHealth.lastError && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Last Error</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-red-600 dark:text-red-400">{selectedHealth.lastError}</p>
                    {selectedHealth.lastErrorAt && (
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(selectedHealth.lastErrorAt), { addSuffix: true })}
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

