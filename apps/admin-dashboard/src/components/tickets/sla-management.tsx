'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Timer, 
  TrendingUp, 
  Settings,
  Plus,
  Edit,
  Trash2,
  Play,
  Pause
} from 'lucide-react';
import api from '@/lib/api/config';
import { SLAIndicator, SLAStatusBadge } from './sla-indicator';
import { cn } from '@/lib/utils';

interface SLAManagementProps {
  ticketId?: string;
  compact?: boolean;
}

type SLAMetrics = {
  totalSLAs?: number;
  activeSLAs?: number;
  breachedSLAs?: number;
  resolutionCompliance?: number;
  firstResponseCompliance?: number;
  averageFirstResponseTime?: number;
  averageResolutionTime?: number;
};
type SLAPolicy = { id: string; name: string; description?: string; priority?: string; isActive?: boolean };
type SLAInstance = {
  status: string;
  firstResponseDue?: string;
  firstResponseAt?: string;
  resolutionDue?: string;
  resolutionAt?: string;
  breachCount?: number;
};

export function SLAManagement({ ticketId, compact = false }: SLAManagementProps) {
  const [slaMetrics, setSlaMetrics] = useState<SLAMetrics | null>(null);
  const [slaPolicies, setSlaPolicies] = useState<SLAPolicy[]>([]);
  const [ticketSlaInstance, setTicketSlaInstance] = useState<SLAInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'instance'>('overview');

  // Not provided by useTickets; call backend directly
  const getSLAMetrics = async (): Promise<SLAMetrics> => {
    const res = await api.get('/sla/metrics');
    return (res as any)?.data?.data ?? res.data;
  };
  const getSLAPolicies = async (): Promise<SLAPolicy[]> => {
    const res = await api.get('/sla/policies');
    return (res as any)?.data?.data ?? res.data;
  };
  const getSLAInstance = async (id: string): Promise<SLAInstance | null> => {
    const res = await api.get(`/sla/tickets/${id}/instance`);
    return (res as any)?.data?.data ?? res.data;
  };
  const checkSLABreaches = async () => {
    const res = await api.post('/sla/check-breaches', {});
    return (res as any)?.data?.data ?? res.data;
  };

  // Load SLA data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [metrics, policies] = await Promise.all([
          getSLAMetrics(),
          getSLAPolicies()
        ]);
        setSlaMetrics(metrics);
        setSlaPolicies(policies);

        if (ticketId) {
          const instance = await getSLAInstance(ticketId);
          setTicketSlaInstance(instance);
          setActiveTab('instance');
        }
      } catch (error) {
        console.error('Failed to load SLA data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [ticketId, getSLAMetrics, getSLAPolicies, getSLAInstance]);

  const handleCheckBreaches = async () => {
    try {
      await checkSLABreaches();
      // Reload metrics after checking breaches
      const metrics = await getSLAMetrics();
      setSlaMetrics(metrics);
    } catch (error) {
      console.error('Failed to check SLA breaches:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <div className="text-sm text-gray-500">Loading SLA data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', compact && 'space-y-2')}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          {ticketId && <TabsTrigger value="instance">Current Ticket</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* SLA Metrics Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-600" />
                SLA Performance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {slaMetrics ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{slaMetrics.totalSLAs || 0}</div>
                      <div className="text-sm text-gray-500">Total SLAs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{slaMetrics.activeSLAs || 0}</div>
                      <div className="text-sm text-gray-500">Active</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">{slaMetrics.breachedSLAs || 0}</div>
                      <div className="text-sm text-gray-500">Breached</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {slaMetrics.resolutionCompliance?.toFixed(1) || '0'}%
                      </div>
                      <div className="text-sm text-gray-500">Compliance</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Resolution Compliance</span>
                        <span>{slaMetrics.resolutionCompliance?.toFixed(1) || '0'}%</span>
                      </div>
                      <Progress value={slaMetrics.resolutionCompliance || 0} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>First Response Compliance</span>
                        <span>{slaMetrics.firstResponseCompliance?.toFixed(1) || '0'}%</span>
                      </div>
                      <Progress value={slaMetrics.firstResponseCompliance || 0} className="h-2" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                      <div className="text-sm text-gray-500">Avg First Response</div>
                      <div className="text-lg font-semibold">
                        {Math.round(slaMetrics.averageFirstResponseTime || 0)} min
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Avg Resolution</div>
                      <div className="text-lg font-semibold">
                        {Math.round((slaMetrics.averageResolutionTime || 0) / 60)} hrs
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">No SLA metrics available</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                onClick={handleCheckBreaches}
                className="w-full"
                variant="outline"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Check SLA Breaches
              </Button>
              <Button 
                className="w-full"
                variant="outline"
              >
                <Settings className="h-4 w-4 mr-2" />
                Configure Business Hours
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SLA Policies</CardTitle>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  New Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {slaPolicies.length > 0 ? (
                <div className="space-y-3">
                  {slaPolicies.map((policy) => (
                    <div key={policy.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{policy.name}</div>
                        <div className="text-sm text-gray-500">{policy.description}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            {policy.priority}
                          </Badge>
                          <Badge variant={policy.isActive ? 'default' : 'secondary'} className="text-xs">
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-sm">No SLA policies configured</div>
                  <Button className="mt-2" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Policy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {ticketId && (
          <TabsContent value="instance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-600" />
                  Ticket SLA Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {ticketSlaInstance ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Status</span>
                      <SLAStatusBadge 
                        status={ticketSlaInstance.status} 
                        breachCount={ticketSlaInstance.breachCount}
                      />
                    </div>

                    <div className="space-y-3">
                      {ticketSlaInstance.firstResponseDue && (
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">First Response</span>
                            {ticketSlaInstance.firstResponseAt ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <Timer className="h-4 w-4 text-orange-600" />
                            )}
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Due: {new Date(ticketSlaInstance.firstResponseDue).toLocaleString()}</div>
                            {ticketSlaInstance.firstResponseAt && (
                              <div className="text-green-600">
                                Responded: {new Date(ticketSlaInstance.firstResponseAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {ticketSlaInstance.resolutionDue && (
                        <div className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Resolution</span>
                            <SLAIndicator 
                              slaInstance={ticketSlaInstance} 
                              size="md" 
                              showText 
                            />
                          </div>
                          <div className="text-xs text-gray-500 space-y-1">
                            <div>Due: {new Date(ticketSlaInstance.resolutionDue).toLocaleString()}</div>
                            {ticketSlaInstance.resolutionAt && (
                              <div className="text-green-600">
                                Resolved: {new Date(ticketSlaInstance.resolutionAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-4 border-t">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        disabled={ticketSlaInstance.status === 'paused'}
                      >
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        disabled={ticketSlaInstance.status !== 'paused'}
                      >
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <div className="text-sm">No SLA policy applied to this ticket</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}