'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Play, 
  Pause,
  Eye,
  Edit,
  Trash2,
  Copy,
  BarChart3,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Zap,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Workflow {
  id: string;
  definition: {
    name: string;
    description: string;
    status: 'active' | 'inactive' | 'draft';
    category: string;
    tags: string[];
    version: string;
    createdBy: string;
  };
  isActive: boolean;
  lastExecutedAt?: Date;
  executionCount: number;
  averageExecutionTime: number;
  successRate: number;
  createdAt: Date;
  updatedAt: Date;
  // Additional fields for better display
  nodeCount?: number;
  connectionCount?: number;
  lastExecutionStatus?: string;
  errorCount?: number;
}

interface WorkflowListProps {
  workflows: Workflow[];
  loading: boolean;
  onRefresh: () => void;
  onCreateWorkflow: () => void;
  onEditWorkflow: (workflow: Workflow) => void;
  onDeleteWorkflow: (workflowId: string) => void;
  onToggleWorkflow: (workflowId: string, active: boolean) => void;
  onExecuteWorkflow: (workflowId: string) => void;
  onViewAnalytics: (workflowId: string) => void;
}

export function WorkflowList({
  workflows,
  loading,
  onRefresh,
  onCreateWorkflow,
  onEditWorkflow,
  onDeleteWorkflow,
  onToggleWorkflow,
  onExecuteWorkflow,
  onViewAnalytics
}: WorkflowListProps) {
  const t = useTranslations('workflows');
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Filter workflows based on search and filters
  const filteredWorkflows = workflows.filter(workflow => {
    const matchesSearch = workflow.definition.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workflow.definition.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || workflow.definition.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || workflow.definition.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get unique categories for filter
  const categories = Array.from(new Set(workflows.map(w => w.definition.category)));

  const getStatusColor = (
    status: 'active' | 'inactive' | 'draft' | string
  ) => {
    const colors: Record<'active' | 'inactive' | 'draft', string> = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      draft: 'bg-yellow-100 text-yellow-800',
    };
    return (colors as Record<string, string>)[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4" />;
      case 'inactive':
        return <Pause className="h-4 w-4" />;
      case 'draft':
        return <Edit className="h-4 w-4" />;
      default:
        return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const formatExecutionTime = (milliseconds: number) => {
    if (milliseconds < 1000) return `${milliseconds}ms`;
    if (milliseconds < 60000) return `${(milliseconds / 1000).toFixed(1)}s`;
    return `${(milliseconds / 60000).toFixed(1)}m`;
  };

  const formatSuccessRate = (rate: number) => {
    return `${(rate * 100).toFixed(1)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Workflows</h2>
          <p className="text-muted-foreground">
            Manage and monitor your automated workflows
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            {t('list.reload')}
          </Button>
          <Button onClick={onCreateWorkflow}>
            <Plus className="h-4 w-4 mr-2" />
            {t('list.createWorkflow')}
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder={t('list.search')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder={t('list.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('list.all')}</SelectItem>
                <SelectItem value="active">{t('list.active')}</SelectItem>
                <SelectItem value="inactive">{t('list.inactive')}</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder={t('list.category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('list.all')}</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Workflows Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWorkflows.map((workflow) => (
          <Card key={workflow.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg font-semibold truncate">
                    {workflow.definition.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {workflow.definition.description}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onRefresh()}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onExecuteWorkflow(workflow.id)}>
                      <Play className="mr-2 h-4 w-4" />
                      Execute
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEditWorkflow(workflow)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onViewAnalytics(workflow.id)}>
                      <BarChart3 className="mr-2 h-4 w-4" />
                      Analytics
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => onToggleWorkflow(workflow.id, !workflow.isActive)}
                    >
                      {workflow.isActive ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <Play className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDeleteWorkflow(workflow.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status and Category */}
              <div className="flex items-center justify-between">
                <Badge className={cn("flex items-center space-x-1", getStatusColor(workflow.definition.status))}>
                  {getStatusIcon(workflow.definition.status)}
                  <span className="capitalize">{workflow.definition.status}</span>
                </Badge>
                <Badge variant="outline">
                  {workflow.definition.category.replace('_', ' ')}
                </Badge>
              </div>

              {/* Tags */}
              {workflow.definition.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {workflow.definition.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {workflow.definition.tags.length > 3 && (
                    <Badge variant="secondary" className="text-xs">
                      +{workflow.definition.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center text-muted-foreground">
                    <Zap className="h-3 w-3 mr-1" />
                    Executions
                  </div>
                  <div className="font-medium">{workflow.executionCount}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-muted-foreground">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Success Rate
                  </div>
                  <div className="font-medium">{formatSuccessRate(workflow.successRate)}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    Avg Time
                  </div>
                  <div className="font-medium">{formatExecutionTime(workflow.averageExecutionTime)}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center text-muted-foreground">
                    <Eye className="h-3 w-3 mr-1" />
                    Version
                  </div>
                  <div className="font-medium">v{workflow.definition.version}</div>
                </div>
              </div>

              {/* Last Execution */}
              {workflow.lastExecutedAt && (
                <div className="text-xs text-muted-foreground">
                  Last executed: {new Date(workflow.lastExecutedAt).toLocaleDateString()}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onExecuteWorkflow(workflow.id)}
                  className="flex-1"
                >
                  <Play className="h-3 w-3 mr-1" />
                  Execute
                </Button>
                <Link href={`/${locale}/dashboard/workflows/${workflow.id}`}>
                  <Button size="sm" variant="outline">
                    <Eye className="h-3 w-3" />
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onViewAnalytics(workflow.id)}
                >
                  <BarChart3 className="h-3 w-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredWorkflows.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('list.noneFound', { fallback: 'No workflows found' })}</h3>
            <p className="text-muted-foreground mb-4">
              {searchQuery || statusFilter !== 'all' || categoryFilter !== 'all'
                ? t('list.noneMatch', { fallback: 'No workflows match your current filters.' })
                : t('list.getStarted', { fallback: 'Get started by creating your first workflow.' })}
            </p>
            {(!searchQuery && statusFilter === 'all' && categoryFilter === 'all') && (
              <Button onClick={onCreateWorkflow}>
                <Plus className="h-4 w-4 mr-2" />
                {t('list.createWorkflow')}
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-full mt-2"></div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <div className="h-6 bg-muted rounded w-16"></div>
                  <div className="h-6 bg-muted rounded w-20"></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-muted rounded flex-1"></div>
                  <div className="h-8 bg-muted rounded w-12"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}