'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  Pause,
  BarChart3,
  Users,
  Target,
  Calendar
} from 'lucide-react';
import { useTickets } from '@/lib/hooks/use-tickets';
import { SLAManagement } from '@/components/tickets/sla-management';
import { cn } from '@/lib/utils';

export function SLADashboard() {
  const [activeTab, setActiveTab] = useState<'overview' | 'policies' | 'analytics' | 'settings'>('overview');
  const [slaMetrics, setSlaMetrics] = useState<any>(null);
  const [slaPolicies, setSlaPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePolicy, setShowCreatePolicy] = useState(false);

  const { 
    getSLAMetrics, 
    getSLAPolicies, 
    createSLAPolicy,
    updateSLAPolicy,
    deleteSLAPolicy,
    checkSLABreaches
  } = useTickets();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [metrics, policies] = await Promise.all([
          getSLAMetrics(),
          getSLAPolicies()
        ]);
        setSlaMetrics(metrics);
        setSlaPolicies(policies);
      } catch (error) {
        console.error('Failed to load SLA data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [getSLAMetrics, getSLAPolicies]);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-lg font-medium">Loading SLA Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SLA Management</h1>
          <p className="text-muted-foreground">Monitor and manage service level agreements</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => checkSLABreaches()}>
            <AlertTriangle className="h-4 w-4 mr-2" />
            Check Breaches
          </Button>
          <Button onClick={() => setShowCreatePolicy(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Policy
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total SLA Policies</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{slaMetrics?.totalSLAs || 0}</div>
            <p className="text-xs text-muted-foreground">
              {slaMetrics?.activeSLAs || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Compliance Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {slaMetrics?.resolutionCompliance?.toFixed(1) || '0'}%
            </div>
            <p className="text-xs text-muted-foreground">
              Resolution compliance
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SLA Breaches</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{slaMetrics?.breachedSLAs || 0}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Resolution Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((slaMetrics?.averageResolutionTime || 0) / 60)}h
            </div>
            <p className="text-xs text-muted-foreground">
              {Math.round(slaMetrics?.averageFirstResponseTime || 0)}m first response
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="policies">Policies</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Performance Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  SLA Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Resolution Compliance</span>
                      <span>{slaMetrics?.resolutionCompliance?.toFixed(1) || '0'}%</span>
                    </div>
                    <Progress value={slaMetrics?.resolutionCompliance || 0} className="h-3" />
                  </div>
                  
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>First Response Compliance</span>
                      <span>{slaMetrics?.firstResponseCompliance?.toFixed(1) || '0'}%</span>
                    </div>
                    <Progress value={slaMetrics?.firstResponseCompliance || 0} className="h-3" />
                  </div>

                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Performance by Priority</div>
                    <div className="space-y-2">
                      {['Critical', 'High', 'Medium', 'Low'].map((priority) => (
                        <div key={priority} className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">{priority}</Badge>
                          <span className="text-sm">95%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Breaches */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Recent SLA Breaches
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium text-sm">Ticket #TK-{1000 + i}</div>
                        <div className="text-xs text-muted-foreground">
                          Resolution time exceeded by 2h 15m
                        </div>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        Breached
                      </Badge>
                    </div>
                  ))}
                  {slaMetrics?.breachedSLAs === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      <div className="text-sm">No recent SLA breaches</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="policies" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>SLA Policies</CardTitle>
                <Button onClick={() => setShowCreatePolicy(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Policy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {slaPolicies.length > 0 ? (
                <div className="space-y-4">
                  {slaPolicies.map((policy) => (
                    <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-medium">{policy.name}</h3>
                          <Badge variant={policy.isActive ? 'default' : 'secondary'}>
                            {policy.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                          <Badge variant="outline" className="capitalize">
                            {policy.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {policy.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span>Response: {policy.targets?.responseTime || 60}min</span>
                          <span>Resolution: {policy.targets?.resolutionTime || 240}min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <Settings className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No SLA Policies</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first SLA policy to start tracking service levels
                  </p>
                  <Button onClick={() => setShowCreatePolicy(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Policy
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance by Team</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {['Support Team', 'Technical Team', 'Sales Team'].map((team) => (
                    <div key={team} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{team}</span>
                        <span>92%</span>
                      </div>
                      <Progress value={92} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>SLA Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                  <div className="text-sm">Chart visualization would go here</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Business Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select defaultValue="UTC">
                    <SelectTrigger>
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
                  <Label>Working Hours</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="09:00" />
                    <Input placeholder="17:00" />
                  </div>
                </div>

                <Button className="w-full">Save Business Hours</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>SLA Breach Alerts</Label>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>At-Risk Warnings</Label>
                    <input type="checkbox" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Daily Reports</Label>
                    <input type="checkbox" />
                  </div>
                </div>

                <Button className="w-full">Save Settings</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Policy Modal would go here */}
      {showCreatePolicy && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Create SLA Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Policy Name</Label>
                <Input placeholder="e.g., High Priority Support" />
              </div>
              
              <div className="space-y-2">
                <Label>Priority Level</Label>
                <Select>
                  <SelectTrigger>
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
                  <Label>Response Time (minutes)</Label>
                  <Input type="number" placeholder="60" />
                </div>
                <div className="space-y-2">
                  <Label>Resolution Time (minutes)</Label>
                  <Input type="number" placeholder="240" />
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1">Create Policy</Button>
                <Button variant="outline" onClick={() => setShowCreatePolicy(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}