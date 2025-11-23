'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { 
  Plus,
  Search,
  Zap, 
  Play, 
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  BarChart3,
  Pause,
  BookOpen,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { workflowsApi, FlowDTO } from '@/lib/api/workflows-client';
import { CreateWorkflowDialog } from '@/components/workflows/create-workflow-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<FlowDTO[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedWorkflows, setSelectedWorkflows] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [flowsData, statsData] = await Promise.all([
        workflowsApi.list(),
        workflowsApi.getStats()
      ]);
      // Normalize API response shapes to avoid runtime errors
      const flowsPayload: any = (flowsData as any)?.data ?? flowsData;
      const normalizedFlows: FlowDTO[] = Array.isArray(flowsPayload)
        ? flowsPayload
        : Array.isArray((flowsPayload as any)?.items)
          ? (flowsPayload as any).items
          : [];
      setWorkflows(normalizedFlows);

      const statsPayload: any = (statsData as any)?.data ?? statsData ?? {};
      setStats(statsPayload);
    } catch (error) {
      console.error('Failed to load workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = !searchQuery || 
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workflow.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (id: string) => {
    router.push(`/dashboard/workflows/${id}`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this workflow?')) {
      try {
        await workflowsApi.remove(id);
        loadData();
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      // TODO: Implement duplicate API
      console.log('Duplicate workflow:', id);
    } catch (error) {
      console.error('Failed to duplicate workflow:', error);
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    try {
      if (currentStatus === 'published') {
        await workflowsApi.unpublish(id);
      } else {
        await workflowsApi.publish(id);
      }
      loadData();
    } catch (error) {
      console.error('Failed to toggle workflow status:', error);
    }
  };

  const toggleWorkflowSelection = (id: string) => {
    setSelectedWorkflows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllWorkflows = () => {
    if (selectedWorkflows.size === filteredWorkflows.length) {
      setSelectedWorkflows(new Set());
    } else {
      setSelectedWorkflows(new Set(filteredWorkflows.map(w => w.id)));
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 space-y-6">
        {/* Header with Tabs */}
        <div className="space-y-4">
        <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">Flow Builder</h1>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  // TODO: Open step-by-step guide
                  console.log('Open guide');
                }}
                className="gap-2 text-sm"
              >
                <BookOpen className="w-4 h-4" />
                Step-by-step guide
              </Button>
          <Button
            onClick={() => setCreateOpen(true)}
                className="gap-2 text-sm"
          >
                <Plus className="w-4 h-4" />
                Create new flow
          </Button>
        </div>
                  </div>

          <Tabs defaultValue="listing" className="w-full">
            <TabsList className="h-10">
              <TabsTrigger value="listing" className="px-4">
                Listing
              </TabsTrigger>
              <TabsTrigger value="usage" className="px-4">
                Usage
              </TabsTrigger>
            </TabsList>

            <TabsContent value="listing" className="space-y-6 mt-6">

              {/* Summary Card */}
              {stats && (
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        ACTIVE FLOWS LIMIT
                      </p>
                      <p className="text-2xl font-bold text-foreground">
                        {stats?.publishedFlows || 0}/{stats?.totalFlows || 0}
                      </p>
                </div>
              </CardContent>
            </Card>
        )}

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Status: All</SelectItem>
                        <SelectItem value="published">Status: Published</SelectItem>
                        <SelectItem value="draft">Status: Draft</SelectItem>
                        <SelectItem value="archived">Status: Archived</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value="all" onValueChange={() => {
                      // TODO: Implement created by filter
                    }}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Created by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value="all" onValueChange={() => {
                      // TODO: Implement updated by filter
                    }}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Updated by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All users</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value="all" onValueChange={() => {
                      // TODO: Implement last updated filter
                    }}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Last updated" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="today">Today</SelectItem>
                        <SelectItem value="week">This week</SelectItem>
                        <SelectItem value="month">This month</SelectItem>
                      </SelectContent>
                    </Select>

                    {(statusFilter !== 'all') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setStatusFilter('all')}
                        className="text-xs"
                      >
                        Reset filter
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-muted-foreground">
                      Total: {filteredWorkflows.length} {filteredWorkflows.length === 1 ? 'flow' : 'flows'}
                    </p>
                    <div className="relative w-full max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                        placeholder="Search by flow name"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardContent>
        </Card>

              {/* Workflows Table */}
        {loading ? (
                <Card>
                <CardContent className="p-6">
                    <div className="space-y-4">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                      ))}
                    </div>
                </CardContent>
              </Card>
        ) : filteredWorkflows.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
                    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                      <Zap className="w-8 h-8 text-muted-foreground" />
              </div>
                    <h3 className="font-semibold text-lg text-foreground mb-2">
                No workflows found
              </h3>
                    <p className="text-muted-foreground mb-4">
                {searchQuery ? 'Try a different search term' : 'Get started by creating your first workflow'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Workflow
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
                <Card>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedWorkflows.size === filteredWorkflows.length && filteredWorkflows.length > 0}
                            onCheckedChange={toggleAllWorkflows}
                          />
                        </TableHead>
                        <TableHead>Flow name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Flow log</TableHead>
                        <TableHead>Created by</TableHead>
                        <TableHead>Last updated by</TableHead>
                        <TableHead>Last updated</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
            {filteredWorkflows.map(workflow => (
                        <TableRow
                key={workflow.id}
                          className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleEdit(workflow.id)}
              >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedWorkflows.has(workflow.id)}
                              onCheckedChange={() => toggleWorkflowSelection(workflow.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4 text-primary" />
                              <span className="font-medium">{workflow.name}</span>
                      </div>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={workflow.status === 'published' ? 'default' : 'secondary'}
                              className="uppercase"
                            >
                          {workflow.status}
                        </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                // TODO: Open flow log
                              }}
                              className="gap-2"
                            >
                              <FileText className="w-4 h-4" />
                              View
                            </Button>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(workflow.createdById)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm">
                                {workflow.createdById || 'System'}
                              </span>
                      </div>
                          </TableCell>
                          <TableCell>
                            {workflow.updatedById ? (
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                    {getInitials(workflow.updatedById)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm">{workflow.updatedById}</span>
                    </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {new Date(workflow.updatedAt).toLocaleDateString('en-GB', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(workflow.id)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDuplicate(workflow.id)}>
                          <Copy className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleToggleStatus(workflow.id, workflow.status)}>
                          {workflow.status === 'published' ? (
                            <><Pause className="w-4 h-4 mr-2" />Pause</>
                          ) : (
                            <><Play className="w-4 h-4 mr-2" />Activate</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                                  onClick={() => handleDelete(workflow.id)}
                                  className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {filteredWorkflows.length > 0 && (
                    <div className="flex items-center justify-center p-4 border-t">
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" disabled>
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-sm text-muted-foreground px-4">
                          Page 1 of 1
                        </span>
                        <Button variant="outline" size="sm" disabled>
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                  </div>
                    </div>
                  )}
                </Card>
              )}

            </TabsContent>

            <TabsContent value="usage" className="mt-6">
              <Card>
                <CardContent className="p-12 text-center">
                  <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg text-foreground mb-2">
                    Usage Analytics
                  </h3>
                  <p className="text-muted-foreground">
                    Usage statistics and analytics will be displayed here
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          </div>
      </div>

      <CreateWorkflowDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => {
          setCreateOpen(false);
          router.push(`/dashboard/workflows/${id}`);
        }}
      />
    </div>
  );
}

