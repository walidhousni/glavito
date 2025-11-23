'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaArrowUp,
  FaCog,
  FaPlus,
  FaEdit,
  FaTrash,
  FaChartBar,
  FaBullseye,
  FaCalendarAlt,
  FaEye,
  FaUsers,
  FaChartLine
} from 'react-icons/fa';
import { MdRefresh } from 'react-icons/md';
import { slaApi, SLAInstance } from '@/lib/api/sla-client';
import { cn } from '@/lib/utils';

interface SLAMetricsUI {
  totalSLAs: number;
  activeSLAs: number;
  breachedSLAs: number;
  averageFirstResponseTime: number;
  averageResolutionTime: number;
  firstResponseCompliance: number;
  resolutionCompliance: number;
}

export function SLADashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'analytics' | 'settings'>('overview');
  const [slaMetrics, setSlaMetrics] = useState<SLAMetricsUI | null>(null);
  const [slaPolicies, setSlaPolicies] = useState<Array<{ id: string; name: string; description?: string; isActive?: boolean; priority?: string; targets?: { responseTime?: number; resolutionTime?: number } }>>([]);
  const [breachedInstances, setBreachedInstances] = useState<SLAInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);
  const [newPolicyData, setNewPolicyData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    responseTime: 60,
    resolutionTime: 240
  });

  // Use SLA API client (keep local helpers minimal)
  const getSLAMetrics = useCallback(async () => slaApi.getMetrics(), []);
  const getSLAPolicies = useCallback(async () => slaApi.getPolicies(), []);
  const getBreachedInstances = useCallback(async () => {
    try {
      const instances = await slaApi.getInstances({ status: 'breached', limit: 10 });
      return instances || [];
    } catch {
      return [];
    }
  }, []);

  const checkSLABreaches = async () => {
    try {
      await slaApi.checkBreaches();
      // Reload data after checking breaches
      await loadData();
    } catch (error) {
      console.error('Failed to check breaches:', error);
    }
  };

  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [metrics, policies, breaches] = await Promise.all([
        getSLAMetrics(),
        getSLAPolicies(),
        getBreachedInstances()
      ]);
      setSlaMetrics(metrics);
      setSlaPolicies(policies);
      setBreachedInstances(breaches);
    } catch (error) {
      console.error('Failed to load SLA data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getSLAMetrics, getSLAPolicies, getBreachedInstances]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreatePolicy = async () => {
    try {
      await slaApi.createPolicy({
        name: newPolicyData.name,
        description: newPolicyData.description,
        priority: newPolicyData.priority,
        targets: {
          responseTime: newPolicyData.responseTime,
          resolutionTime: newPolicyData.resolutionTime
        },
        conditions: [],
        businessHours: {},
        holidays: [],
        escalationRules: [],
        notifications: []
      });
      setShowCreatePolicy(false);
      setNewPolicyData({
        name: '',
        description: '',
        priority: 'medium',
        responseTime: 60,
        resolutionTime: 240
      });
      await loadData();
    } catch (error) {
      console.error('Failed to create policy:', error);
    }
  };

  const handleDeletePolicy = async (id: string) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await slaApi.deletePolicy(id);
      await loadData();
    } catch (error) {
      console.error('Failed to delete policy:', error);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <Skeleton className="h-8 w-8 mb-3" />
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaBullseye className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">SLA Management</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[42px]">
            Monitor and manage service level agreements
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={checkSLABreaches}
            disabled={refreshing}
            className="h-9 px-4 text-xs border-0 shadow-sm"
          >
            <FaExclamationTriangle className="h-3.5 w-3.5 mr-2 text-orange-600 dark:text-orange-400" />
            Check Breaches
          </Button>
          <Button 
            onClick={() => setShowCreatePolicy(true)}
            className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
          >
            <FaPlus className="h-3.5 w-3.5 mr-2" />
            New Policy
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={loadData}
            disabled={refreshing}
            className="h-9 w-9 p-0"
          >
            <MdRefresh className={cn("h-4 w-4", refreshing && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                <FaBullseye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-foreground">{slaMetrics?.totalSLAs || 0}</div>
                <div className="text-xs text-muted-foreground">Total Policies</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {slaMetrics?.activeSLAs || 0} active
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <FaArrowUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                  {slaMetrics?.resolutionCompliance?.toFixed(1) || '0'}%
                </div>
                <div className="text-xs text-muted-foreground">Compliance Rate</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Resolution compliance
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50">
                <FaExclamationTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-red-600 dark:text-red-400">
                  {slaMetrics?.breachedSLAs || 0}
                </div>
                <div className="text-xs text-muted-foreground">SLA Breaches</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              Active breaches
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/50">
                <FaClock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="text-right">
                <div className="text-xl font-semibold text-foreground">
                  {Math.round((slaMetrics?.averageResolutionTime || 0) / 60)}h
                </div>
                <div className="text-xs text-muted-foreground">Avg Resolution</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(slaMetrics?.averageFirstResponseTime || 0)}m first response
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'policies' | 'analytics' | 'settings')} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 bg-transparent h-auto p-0 gap-1">
          <TabsTrigger
            value="overview"
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <FaEye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="text-xs font-medium">Overview</span>
          </TabsTrigger>
          <TabsTrigger
            value="policies"
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-950/30 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <FaBullseye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-medium">Policies</span>
          </TabsTrigger>
          <TabsTrigger
            value="analytics"
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-green-50 dark:data-[state=active]:bg-green-950/30 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <FaChartLine className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-xs font-medium">Analytics</span>
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground transition-colors border-0"
          >
            <FaCog className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <span className="text-xs font-medium">Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                    <FaChartBar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">SLA Performance Trends</h3>
                    <p className="text-xs text-muted-foreground">Compliance metrics overview</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground">Resolution Compliance</span>
                      <span className="font-semibold text-foreground">{slaMetrics?.resolutionCompliance?.toFixed(1) || '0'}%</span>
                    </div>
                    <Progress value={slaMetrics?.resolutionCompliance || 0} className="h-2" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-foreground">First Response Compliance</span>
                      <span className="font-semibold text-foreground">{slaMetrics?.firstResponseCompliance?.toFixed(1) || '0'}%</span>
                    </div>
                    <Progress value={slaMetrics?.firstResponseCompliance || 0} className="h-2" />
                  </div>

                  <div className="pt-4 border-t border-border/50">
                    <div className="text-xs font-medium text-muted-foreground mb-3">Performance by Priority</div>
                    <div className="space-y-2.5">
                      {['critical', 'high', 'medium', 'low'].map((priority) => {
                        // Calculate compliance by priority from policies
                        const priorityPolicies = slaPolicies.filter(p => p.priority?.toLowerCase() === priority);
                        const compliance = priorityPolicies.length > 0 ? slaMetrics?.resolutionCompliance || 0 : 0;
                        return (
                          <div key={priority} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                            <Badge variant="outline" className="text-xs capitalize border-0 bg-background">
                              {priority}
                            </Badge>
                            <span className="text-sm font-semibold text-foreground">{compliance.toFixed(1)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Breaches */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50">
                    <FaExclamationTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Recent SLA Breaches</h3>
                    <p className="text-xs text-muted-foreground">Active breach instances</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2.5">
                  {breachedInstances.length > 0 ? (
                    breachedInstances.map((instance) => {
                      const resolutionOverdue = instance.resolutionDue && new Date(instance.resolutionDue) < new Date() && !instance.resolutionAt;
                      const responseOverdue = instance.firstResponseDue && new Date(instance.firstResponseDue) < new Date() && !instance.firstResponseAt;
                      const overdueTime = resolutionOverdue 
                        ? Math.round((new Date().getTime() - new Date(instance.resolutionDue).getTime()) / (1000 * 60))
                        : responseOverdue
                        ? Math.round((new Date().getTime() - new Date(instance.firstResponseDue).getTime()) / (1000 * 60))
                        : 0;
                      const hours = Math.floor(overdueTime / 60);
                      const minutes = overdueTime % 60;
                      
                      return (
                        <div key={instance.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-foreground mb-1">
                              Ticket #{instance.ticketId.slice(0, 8)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {resolutionOverdue 
                                ? `Resolution time exceeded by ${hours}h ${minutes}m`
                                : responseOverdue
                                ? `First response time exceeded by ${hours}h ${minutes}m`
                                : 'SLA breached'}
                            </div>
                          </div>
                          <Badge variant="destructive" className="text-xs border-0 bg-red-600 dark:bg-red-700">
                            Breached
                          </Badge>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 text-muted-foreground">
                      <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg flex items-center justify-center mb-3 mx-auto">
                        <FaCheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="text-sm font-medium text-foreground mb-1">No recent SLA breaches</div>
                      <div className="text-xs">All tickets are within SLA targets</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                    <FaBullseye className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-semibold">SLA Policies</CardTitle>
                    <p className="text-xs text-muted-foreground">Manage service level agreements</p>
                  </div>
                </div>
                <Button 
                  onClick={() => setShowCreatePolicy(true)}
                  className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
                >
                  <FaPlus className="h-3.5 w-3.5 mr-2" />
                  Create Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {slaPolicies.length > 0 ? (
                <div className="space-y-3">
                  {slaPolicies.map((policy) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const targets = (policy.targets as any) || {};
                    return (
                      <div key={policy.id} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card hover:bg-muted/30 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <h3 className="font-semibold text-sm text-foreground">{policy.name}</h3>
                            <Badge 
                              variant={policy.isActive ? 'default' : 'secondary'}
                              className="text-xs border-0"
                            >
                              {policy.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize border-0 bg-muted">
                              {policy.priority || 'medium'}
                            </Badge>
                          </div>
                          {policy.description && (
                            <p className="text-xs text-muted-foreground mb-2.5 line-clamp-1">
                              {policy.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FaClock className="h-3 w-3" />
                              Response: {targets.responseTime || 60}min
                            </span>
                            <span className="flex items-center gap-1">
                              <FaCheckCircle className="h-3 w-3" />
                              Resolution: {targets.resolutionTime || 240}min
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <FaEdit className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <FaCog className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            className="h-8 w-8 p-0 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                            onClick={() => handleDeletePolicy(policy.id)}
                          >
                            <FaTrash className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-purple-50 dark:bg-purple-950/50 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <FaBullseye className="h-8 w-8 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">No SLA Policies</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                    Create your first SLA policy to start tracking service levels
                  </p>
                  <Button 
                    onClick={() => setShowCreatePolicy(true)}
                    className="h-9 px-4 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
                  >
                    <FaPlus className="h-3.5 w-3.5 mr-2" />
                    Create First Policy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50">
                    <FaUsers className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Performance by Team</h3>
                    <p className="text-xs text-muted-foreground">Team compliance rates</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {['Support Team', 'Technical Team', 'Sales Team'].map((team) => {
                    // Use overall compliance as placeholder - would need team-specific data from backend
                    const compliance = slaMetrics?.resolutionCompliance || 0;
                    return (
                      <div key={team} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground font-medium">{team}</span>
                          <span className="font-semibold text-foreground">{compliance.toFixed(1)}%</span>
                        </div>
                        <Progress value={compliance} className="h-2" />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50">
                    <FaChartLine className="h-4 w-4 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">SLA Trends</h3>
                    <p className="text-xs text-muted-foreground">Historical performance</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-center py-10 text-muted-foreground">
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-950/50 rounded-lg flex items-center justify-center mb-4 mx-auto">
                    <FaChartLine className="h-8 w-8 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="text-sm font-medium text-foreground mb-1">Chart visualization</div>
                  <div className="text-xs">Trend analysis will be displayed here</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50">
                    <FaCalendarAlt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Business Hours</h3>
                    <p className="text-xs text-muted-foreground">Configure working hours</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Timezone</Label>
                  <Select defaultValue="UTC">
                    <SelectTrigger className="h-9 border-0 shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="EST">Eastern Time</SelectItem>
                      <SelectItem value="PST">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium">Working Hours</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="09:00" className="h-9 border-0 shadow-sm" />
                    <Input placeholder="17:00" className="h-9 border-0 shadow-sm" />
                  </div>
                </div>

                <Button className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm">
                  Save Business Hours
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50">
                    <FaCog className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground">Notification Settings</h3>
                    <p className="text-xs text-muted-foreground">Alert preferences</p>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <Label className="text-sm font-medium text-foreground">SLA Breach Alerts</Label>
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <Label className="text-sm font-medium text-foreground">At-Risk Warnings</Label>
                    <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-border" />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <Label className="text-sm font-medium text-foreground">Daily Reports</Label>
                    <input type="checkbox" className="h-4 w-4 rounded border-border" />
                  </div>
                </div>

                <Button className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm">
                  Save Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Policy Dialog */}
      <Dialog open={showCreatePolicy} onOpenChange={setShowCreatePolicy}>
        <DialogContent className="max-w-md p-0 gap-0 bg-background border-0 shadow-xl rounded-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <DialogTitle className="text-lg font-semibold text-foreground">Create SLA Policy</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Policy Name</Label>
              <Input 
                placeholder="e.g., High Priority Support" 
                value={newPolicyData.name}
                onChange={(e) => setNewPolicyData({ ...newPolicyData, name: e.target.value })}
                className="h-9 border-0 shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-medium">Description</Label>
              <Input 
                placeholder="Policy description (optional)" 
                value={newPolicyData.description}
                onChange={(e) => setNewPolicyData({ ...newPolicyData, description: e.target.value })}
                className="h-9 border-0 shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-medium">Priority Level</Label>
              <Select 
                value={newPolicyData.priority}
                onValueChange={(value) => setNewPolicyData({ ...newPolicyData, priority: value })}
              >
                <SelectTrigger className="h-9 border-0 shadow-sm">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Response Time (min)</Label>
                <Input 
                  type="number" 
                  placeholder="60" 
                  value={newPolicyData.responseTime}
                  onChange={(e) => setNewPolicyData({ ...newPolicyData, responseTime: parseInt(e.target.value) || 60 })}
                  className="h-9 border-0 shadow-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Resolution Time (min)</Label>
                <Input 
                  type="number" 
                  placeholder="240" 
                  value={newPolicyData.resolutionTime}
                  onChange={(e) => setNewPolicyData({ ...newPolicyData, resolutionTime: parseInt(e.target.value) || 240 })}
                  className="h-9 border-0 shadow-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button 
                className="flex-1 h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
                onClick={handleCreatePolicy}
                disabled={!newPolicyData.name}
              >
                Create Policy
              </Button>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreatePolicy(false);
                  setNewPolicyData({
                    name: '',
                    description: '',
                    priority: 'medium',
                    responseTime: 60,
                    resolutionTime: 240
                  });
                }}
                className="h-9 text-xs border-0 shadow-sm"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}