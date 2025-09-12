'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useCrmStore } from '../../../../lib/store/crm-store';
import type { DealItem, LeadItem } from '../../../../lib/api/crm-client';
import { CreateLeadDialog } from '@/components/crm/create-lead-dialog';
import { CreateDealDialog } from '@/components/crm/create-deal-dialog';
import { CustomerSegmentCard } from '@/components/customers/customer-segment-card';
import { AdvancedSearch } from '@/components/crm/advanced-search';
import {
  Users,
  Plus,
  MoreHorizontal,
  Mail,
  Phone,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  // TrendingDown,
  Star,
  Eye,
  // Edit,
  // Trash2,
  Target,
  Zap,
  BarChart3,
  // ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  Download,
  Settings
} from 'lucide-react';
import { SegmentDialog } from '@/components/crm/segment-dialog';
import { crmApi } from '@/lib/api/crm-client';
import { useToast } from '@/components/ui/toast';
import { WorkflowPickerDialog } from '@/components/crm/workflow-picker-dialog';
import { CampaignDialog } from '@/components/crm/campaign-dialog';
import { SegmentDetailsDialog } from '@/components/crm/segment-details-dialog';
import { cn } from '@/lib/utils';

export default function CrmHubPage() {
  const t = useTranslations('crm');
  const { push } = useToast();
  const [tab, setTab] = useState<'leads' | 'pipeline' | 'segments' | 'analytics'>('leads');
  const { isLoading, leads, deals, segments, fetchInitial, moveDeal, rescoreLead, refreshSegments, pipelineAnalytics, salesForecast, fetchPipelineAnalytics, fetchSalesForecast } = useCrmStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<
    'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST' | null
  >(null);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [segmentDialogOpen, setSegmentDialogOpen] = useState(false);
  const [editSegment, setEditSegment] = useState<{ id: string; name: string; description?: string } | null>(null);
  const [workflowPickerForSegId, setWorkflowPickerForSegId] = useState<string | null>(null);
  const [lastTriggeredMap, setLastTriggeredMap] = useState<Record<string, string>>({});
  const [campaignForSeg, setCampaignForSeg] = useState<{ id: string; name: string } | null>(null);
  const [detailsForSeg, setDetailsForSeg] = useState<{ id: string; name: string } | null>(null);
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);

  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // Remove the old lead query effect since we're using advanced search now

  useEffect(() => {
    if (tab === 'analytics') {
      void fetchPipelineAnalytics();
      void fetchSalesForecast(30);
    }
  }, [tab, fetchPipelineAnalytics, fetchSalesForecast]);

  // Calculate stats for overview
  const stats = {
    totalLeads: leads.length,
    qualifiedLeads: (leads as LeadItem[]).filter((l) => (Number((l as unknown as { score?: number }).score ?? 0)) > 70).length,
    totalDeals: deals.length,
    wonDeals: deals.filter(d => d.stage === 'WON').length,
    totalValue: deals.reduce((sum, d) => sum + (d.valueAmount || 0), 0),
    conversionRate: leads.length > 0 ? Math.round((deals.filter(d => d.stage === 'WON').length / leads.length) * 100) : 0
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'NEW': return <Star className="h-4 w-4" />;
      case 'QUALIFIED': return <CheckCircle2 className="h-4 w-4" />;
      case 'PROPOSAL': return <BarChart3 className="h-4 w-4" />;
      case 'NEGOTIATION': return <Target className="h-4 w-4" />;
      case 'WON': return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'LOST': return <AlertCircle className="h-4 w-4 text-red-600" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'NEW': return 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300';
      case 'QUALIFIED': return 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-300';
      case 'PROPOSAL': return 'bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-950 dark:border-purple-800 dark:text-purple-300';
      case 'NEGOTIATION': return 'bg-orange-50 border-orange-200 text-orange-700 dark:bg-orange-950 dark:border-orange-800 dark:text-orange-300';
      case 'WON': return 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300';
      case 'LOST': return 'bg-red-50 border-red-200 text-red-700 dark:bg-red-950 dark:border-red-800 dark:text-red-300';
      default: return 'bg-gray-50 border-gray-200 text-gray-700 dark:bg-gray-950 dark:border-gray-800 dark:text-gray-300';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800 p-6">
        <div className="space-y-8 animate-fade-in">
          {/* Header Section */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
                {t('title')}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                {t('subtitle')}
              </p>
            </div>
            
            {/* Global Search */}
            <div className="w-full lg:w-96">
              <AdvancedSearch
                placeholder="Search across all CRM data..."
                showFilters={true}
                showSavedSearches={true}
                onResultClick={(result) => {
                  // Handle global search result clicks
                  if (result.type === 'lead') {
                    const lead = leads.find((l: LeadItem) => l.id === result.id);
                    if (lead) {
                      setSelectedLead(lead);
                      setLeadDetailOpen(true);
                    }
                  } else if (result.type === 'deal') {
                    push('Deal details feature coming soon', 'info');
                  } else if (result.type === 'customer') {
                    push('Customer details feature coming soon', 'info');
                  } else if (result.type === 'segment') {
                    push('Segment details feature coming soon', 'info');
                  }
                }}
                className="w-full"
              />
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Button 
                variant="outline" 
                className="border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                onClick={() => setTab('analytics')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Button>
              <DropdownMenu open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
                    <Plus className="h-4 w-4 mr-2" />
                    Quick Actions
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={() => { setCreateOpen(true); setQuickActionsOpen(false); }}>
                    <Users className="h-4 w-4 mr-2" />
                    Create Lead
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setCreateDealOpen(true); setQuickActionsOpen(false); }}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Create Deal
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setEditSegment(null); setSegmentDialogOpen(true); setQuickActionsOpen(false); }}>
                    <Target className="h-4 w-4 mr-2" />
                    Create Segment
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { setTab('analytics'); setQuickActionsOpen(false); }}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View Analytics
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { setTab('pipeline'); setQuickActionsOpen(false); }}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    View Pipeline
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => { 
                    // Export functionality
                    push('Export feature coming soon', 'info');
                    setQuickActionsOpen(false);
                  }}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Data
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => { 
                    // Settings functionality
                    push('Settings feature coming soon', 'info');
                    setQuickActionsOpen(false);
                  }}>
                    <Settings className="h-4 w-4 mr-2" />
                    CRM Settings
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
        </div>
      </div>

          {/* Stats Overview */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="dashboard-card group">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-400/5 dark:to-indigo-400/5 pointer-events-none" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Total Leads</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.totalLeads}</p>
                    <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full mt-2 w-fit">
                      <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">+12% this month</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-card group">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5 dark:from-emerald-400/5 dark:to-green-400/5 pointer-events-none" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Qualified Leads</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.qualifiedLeads}</p>
                    <div className="flex items-center space-x-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 rounded-full mt-2 w-fit">
                      <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                        {stats.totalLeads > 0 ? Math.round((stats.qualifiedLeads / stats.totalLeads) * 100) : 0}% qualified
                      </span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg group-hover:shadow-emerald-500/25 transition-all duration-300">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-card group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-violet-500/5 dark:from-purple-400/5 dark:to-violet-400/5 pointer-events-none" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Pipeline Value</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(stats.totalValue)}</p>
                    <div className="flex items-center space-x-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded-full mt-2 w-fit">
                      <DollarSign className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">{stats.totalDeals} active deals</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-purple-500 to-violet-600 rounded-xl shadow-lg group-hover:shadow-purple-500/25 transition-all duration-300">
                    <BarChart3 className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="dashboard-card group">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-400/5 dark:to-orange-400/5 pointer-events-none" />
              <CardContent className="p-6 relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Conversion Rate</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{stats.conversionRate}%</p>
                    <div className="flex items-center space-x-1 px-2 py-1 bg-amber-100 dark:bg-amber-900/30 rounded-full mt-2 w-fit">
                      <Zap className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">{stats.wonDeals} won deals</span>
                    </div>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg group-hover:shadow-amber-500/25 transition-all duration-300">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Card className="dashboard-card">
          <Tabs value={tab} onValueChange={(v) => {
            const nv = v as 'leads' | 'pipeline' | 'segments' | 'analytics';
            setTab(nv);
            if (nv === 'segments') void refreshSegments();
            }} className="w-full">
              <div className="border-b bg-slate-50/50 dark:bg-slate-800/50 px-6 py-4">
                <TabsList className="grid grid-cols-4 w-full max-w-2xl bg-white dark:bg-slate-800 shadow-sm">
                  <TabsTrigger value="leads" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Users className="h-4 w-4 mr-2" />
                    {t('tabs.leads')}
                  </TabsTrigger>
                  <TabsTrigger value="pipeline" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('tabs.pipeline')}
                  </TabsTrigger>
                  <TabsTrigger value="segments" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <Target className="h-4 w-4 mr-2" />
                    {t('tabs.segments') || 'Segments'}
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    {t('tabs.analytics', { default: 'Analytics' })}
                  </TabsTrigger>
            </TabsList>
              </div>

              <TabsContent value="leads" className="p-6 space-y-6">
                {/* Leads Header */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div className="flex-1 max-w-2xl">
                    <AdvancedSearch
                      placeholder={t('searchLeadsPlaceholder')}
                      showFilters={true}
                      showSavedSearches={true}
                      onResultClick={(result) => {
                        if (result.type === 'lead') {
                          // Find the lead in our current leads and open detail
                          const lead = leads.find((l: LeadItem) => l.id === result.id);
                          if (lead) {
                            setSelectedLead(lead);
                            setLeadDetailOpen(true);
                          }
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                  <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" onClick={() => setCreateOpen(true)}>
                    <Plus className="h-4 w-4" />
                    {t('actions.createLead')}
                  </Button>
              </div>

                {/* Leads Grid */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {(leads as LeadItem[]).map((lead) => {
                    const score = Number((lead as unknown as { score?: number }).score ?? 0);
                    const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase();

                    return (
                  <Card
                    key={lead.id}
                        className="group relative overflow-hidden border-0 shadow-soft hover:shadow-lift transition-all duration-300 cursor-pointer bg-white dark:bg-gray-800"
                    onClick={() => {
                      setSelectedLead(lead);
                      setLeadDetailOpen(true);
                    }}
                  >
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 border-2 border-gray-100 dark:border-gray-700">
                                <AvatarImage src="" />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                  {lead.firstName} {lead.lastName}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{lead.company}</p>
                              </div>
                            </div>
                            <Badge variant={score > 70 ? "default" : score > 40 ? "secondary" : "outline"} className="text-xs">
                              {score > 70 ? "Hot" : score > 40 ? "Warm" : "Cold"}
                            </Badge>
                          </div>

                          <div className="space-y-3">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{lead.email}</span>
                            </div>

                            {(!!(lead as unknown as { phone?: string })?.phone) && (
                              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                <Phone className="h-4 w-4" />
                                <span>{String((lead as unknown as { phone?: string }).phone)}</span>
                              </div>
                            )}

                            <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
                              <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-2">
                                <span>Lead Score</span>
                                <span className="font-medium">{score}/100</span>
                              </div>
                              <Progress value={score} className="h-2" />
                            </div>
                          </div>

                          <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => {
                                  setSelectedLead(lead);
                                  setLeadDetailOpen(true);
                                }}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  void rescoreLead(lead.id);
                                  push('Lead rescored', 'success');
                                }}>
                                  <RefreshCw className="h-4 w-4 mr-2" />
                                  Rescore Lead
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => {
                                  push('Convert to deal feature coming soon', 'info');
                                }}>
                                  <BarChart3 className="h-4 w-4 mr-2" />
                                  Convert to Deal
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => {
                                  push('Delete lead feature coming soon', 'info');
                                }} className="text-red-600">
                                  <AlertCircle className="h-4 w-4 mr-2" />
                                  Delete Lead
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                    </CardContent>
                  </Card>
                    );
                  })}

                {!isLoading && leads.length === 0 && (
                    <div className="col-span-full">
                      <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <Users className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No leads yet</h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">Get started by creating your first lead</p>
                          <Button onClick={() => setCreateOpen(true)} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Lead
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                )}
              </div>
            </TabsContent>

              <TabsContent value="pipeline" className="p-6 space-y-6">
                {/* Pipeline Header */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Sales Pipeline</h2>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Drag and drop deals between stages</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => {
                          void fetchInitial();
                          push('Pipeline refreshed', 'success');
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                      </Button>
                      <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" onClick={() => setCreateDealOpen(true)}>
                        <Plus className="h-4 w-4" />
                        {t('actions.createDeal')}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Pipeline Search */}
                  <div className="max-w-md">
                    <AdvancedSearch
                      placeholder="Search deals..."
                      showFilters={true}
                      showSavedSearches={false}
                      onResultClick={(result) => {
                        if (result.type === 'deal') {
                          // Handle deal click - could open deal details
                          push('Deal details feature coming soon', 'info');
                        }
                      }}
                      className="w-full"
                    />
                  </div>
                </div>

                {/* Pipeline Board */}
              <ScrollArea className="w-full">
                  <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-6 gap-6 pb-4 min-w-max">
                    {(['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const).map((stage) => {
                      const stageDeals = (deals as DealItem[]).filter((d) => d.stage === stage);
                      const stageValue = stageDeals.reduce((sum, d) => sum + (d.valueAmount || 0), 0);

                      return (
                    <div
                      key={stage}
                          className={cn(
                            "flex flex-col min-w-[280px] bg-gray-50 dark:bg-gray-800 rounded-xl border-2 border-dashed transition-all duration-200",
                            dragOverStage === stage
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 shadow-lg'
                              : 'border-gray-200 dark:border-gray-700'
                          )}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDragEnter={() => setDragOverStage(stage)}
                      onDragLeave={() => setDragOverStage((cur) => (cur === stage ? null : cur))}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData('text/plain');
                        if (id) moveDeal(id, stage);
                        setDraggingId(null);
                        setDragOverStage(null);
                      }}
                    >
                          {/* Stage Header */}
                          <div className={cn("flex items-center justify-between p-4 rounded-t-xl", getStageColor(stage))}>
                            <div className="flex items-center gap-2">
                              {getStageIcon(stage)}
                              <span className="font-semibold text-sm">{t(`stages.${stage.toLowerCase()}`)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="text-xs">
                                {stageDeals.length}
                              </Badge>
                              {stageValue > 0 && (
                                <span className="text-xs font-medium">
                                  {formatCurrency(stageValue)}
                                </span>
                              )}
                            </div>
                      </div>

                          {/* Deals List */}
                          <div className="flex-1 p-4 space-y-3 min-h-[200px]">
                            {stageDeals.map((deal) => (
                          <Card
                            key={deal.id}
                                className={cn(
                                  "group relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-all duration-200 cursor-grab active:cursor-grabbing bg-white dark:bg-gray-900",
                                  draggingId === deal.id && 'opacity-50 rotate-2 scale-105'
                                )}
                            draggable
                            onDragStart={(e) => {
                              setDraggingId(deal.id);
                              e.dataTransfer.setData('text/plain', deal.id);
                              e.dataTransfer.effectAllowed = 'move';
                            }}
                            onDragEnd={() => setDraggingId(null)}
                          >
                                <CardContent className="p-4">
                                  <div className="space-y-3">
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 line-clamp-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {deal.name || deal.title || 'Untitled Deal'}
                                      </h4>
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MoreHorizontal className="h-3 w-3" />
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                          <DropdownMenuItem onClick={() => {
                                            push('View deal details feature coming soon', 'info');
                                          }}>
                                            <Eye className="h-3 w-3 mr-2" />
                                            View Details
                                          </DropdownMenuItem>
                                          <DropdownMenuItem onClick={() => {
                                            push('Edit deal feature coming soon', 'info');
                                          }}>
                                            <Settings className="h-3 w-3 mr-2" />
                                            Edit Deal
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem onClick={() => {
                                            push('Delete deal feature coming soon', 'info');
                                          }} className="text-red-600">
                                            <AlertCircle className="h-3 w-3 mr-2" />
                                            Delete Deal
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>

                                    {deal.valueAmount && (
                                      <div className="flex items-center gap-1 text-sm font-semibold text-green-600 dark:text-green-400">
                                        <DollarSign className="h-3 w-3" />
                                        {formatCurrency(deal.valueAmount)}
                                      </div>
                                    )}

                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                      <div className="flex items-center gap-1">
                                        <Calendar className="h-3 w-3" />
                                        <span>2 days ago</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        <span>5 days left</span>
                                      </div>
                                    </div>
                                  </div>
                            </CardContent>
                          </Card>
                        ))}

                            {stageDeals.length === 0 && (
                              <div className="flex flex-col items-center justify-center py-8 text-center">
                                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-full mb-3">
                                  {getStageIcon(stage)}
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {stage === 'NEW' ? 'Drop new deals here' : `No ${stage.toLowerCase()} deals`}
                                </p>
                              </div>
                        )}
                      </div>
                    </div>
                      );
                    })}
                </div>
              </ScrollArea>
            </TabsContent>

              <TabsContent value="segments" className="p-6 space-y-6">
                {/* Segments Header */}
                <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Customer Segments</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Organize and target your customers effectively</p>
                  </div>
                  <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200" onClick={() => { setEditSegment(null); setSegmentDialogOpen(true); }}>
                    <Plus className="h-4 w-4" />
                    {t('segments.create')}
                  </Button>
              </div>

                {/* Segments Grid */}
                <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                {segments.map((seg) => (
                  <CustomerSegmentCard
                    key={seg.id}
                    segment={{
                      id: seg.id,
                      name: seg.name,
                      description: seg.description || '',
                      customerCount: seg.customerCount || 0,
                      averageValue: seg.averageValue || 0,
                      growthRate: typeof seg.monthlyGrowth === 'number' ? seg.monthlyGrowth : 0,
                      color:
                          (seg.monthlyGrowth ?? 0) > 10 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300' :
                            (seg.monthlyGrowth ?? 0) > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300' :
                              (seg.monthlyGrowth ?? 0) > -5 ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300' :
                                'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300',
                      icon: Users,
                    }}
                    onClick={() => { setEditSegment({ id: seg.id, name: seg.name, description: seg.description }); setSegmentDialogOpen(true); }}
                    onExport={async (format) => {
                      try {
                        const res = await crmApi.exportSegment(seg.id, format);
                        if (res.format === 'csv') {
                          const blob = new Blob([res.data as string], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${seg.name || 'segment'}.csv`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        } else {
                          const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${seg.name || 'segment'}.json`;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          URL.revokeObjectURL(url);
                        }
                        push('Export ready', 'success');
                      } catch {
                        push('Export failed', 'error');
                      }
                    }}
                    onTriggerWorkflow={() => setWorkflowPickerForSegId(seg.id)}
                      onViewDetails={() => setDetailsForSeg({ id: seg.id, name: seg.name })}
                      onSendCampaign={() => setCampaignForSeg({ id: seg.id, name: seg.name })}
                    lastTriggeredAt={lastTriggeredMap[seg.id] || null}
                  />
                ))}

                {!isLoading && segments.length === 0 && (
                    <div className="col-span-full">
                      <Card className="border-2 border-dashed border-gray-200 dark:border-gray-700">
                        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                          <Target className="h-12 w-12 text-gray-400 mb-4" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No segments yet</h3>
                          <p className="text-gray-500 dark:text-gray-400 mb-4">Create customer segments to organize and target your audience</p>
                          <Button onClick={() => { setEditSegment(null); setSegmentDialogOpen(true); }} className="gap-2">
                            <Plus className="h-4 w-4" />
                            Create Segment
                          </Button>
                        </CardContent>
                      </Card>
                    </div>
                )}
              </div>
            </TabsContent>

              <TabsContent value="analytics" className="p-6 space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="dashboard-card group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 dark:from-blue-400/5 dark:to-indigo-400/5 pointer-events-none" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" />
                        {t('analytics.pipelineOverview', { default: 'Pipeline Overview' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!pipelineAnalytics ? (
                        <div className="skeleton h-28 rounded" />
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('analytics.weightedPipeline', { default: 'Weighted Pipeline' })}</div>
                              <div className="text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(pipelineAnalytics.weightedPipeline)}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('analytics.winRate', { default: 'Win Rate' })}</div>
                              <div className="text-2xl font-semibold text-slate-900 dark:text-white">{Math.round((pipelineAnalytics.winRate || 0) * 100)}%</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('analytics.avgCycle', { default: 'Avg Sales Cycle (days)' })}</div>
                              <div className="text-2xl font-semibold text-slate-900 dark:text-white">{Math.round(pipelineAnalytics.avgCycleDays || 0)}</div>
                            </div>
                          </div>
                          <div className="mt-2">
                            <div className="text-sm font-medium mb-2">{t('analytics.byStage', { default: 'Deals by Stage' })}</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {pipelineAnalytics.stages.map(s => (
                                <div key={s.stage} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                  <span className="font-medium">{t(`stages.${s.stage.toLowerCase()}`)}</span>
                                  <span className="text-gray-600 dark:text-gray-300">{s.count} • {formatCurrency(s.totalValue)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="dashboard-card group">
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-400/5 dark:to-orange-400/5 pointer-events-none" />
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" />
                        {t('analytics.salesForecast', { default: 'Sales Forecast (30d)' })}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!salesForecast ? (
                        <div className="skeleton h-28 rounded" />
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('analytics.totalForecast', { default: 'Total Forecast' })}</div>
                              <div className="text-2xl font-semibold text-slate-900 dark:text-white">{formatCurrency(salesForecast.totalPredicted)}</div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                              <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">{t('analytics.days', { default: 'Days' })}</div>
                              <div className="text-2xl font-semibold text-slate-900 dark:text-white">{salesForecast.periodDays}</div>
                            </div>
                          </div>
                          <div className="mt-2 space-y-2">
                            <div className="text-sm font-medium">{t('analytics.nextDays', { default: 'Next Days' })}</div>
                            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-auto pr-1">
                              {salesForecast.predictions.slice(0, 10).map(p => (
                                <div key={p.date} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
                                  <span className="font-medium">{p.date}</span>
                                  <span className="text-gray-600 dark:text-gray-300">{formatCurrency(p.predictedRevenue)} • {Math.round(p.confidence * 100)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
        </CardContent>
      </Card>
    </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
    <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} />
    <CreateDealDialog open={createDealOpen} onOpenChange={setCreateDealOpen} />
    <SegmentDialog open={segmentDialogOpen} onOpenChange={setSegmentDialogOpen} segment={editSegment} />
      <SegmentDetailsDialog
        open={!!detailsForSeg}
        onOpenChange={(v) => { if (!v) setDetailsForSeg(null); }}
        segmentId={detailsForSeg?.id || ''}
        segmentName={detailsForSeg?.name}
      />
      <CampaignDialog
        open={!!campaignForSeg}
        onOpenChange={(v) => { if (!v) setCampaignForSeg(null); }}
        segmentId={campaignForSeg?.id || ''}
        segmentName={campaignForSeg?.name}
      />
    <WorkflowPickerDialog
      open={!!workflowPickerForSegId}
      onOpenChange={(v) => { if (!v) setWorkflowPickerForSegId(null); }}
      onConfirm={async (workflowId) => {
        if (!workflowPickerForSegId) return;
        try {
          const res = await crmApi.triggerWorkflowForSegment(workflowPickerForSegId, workflowId);
          push(`Triggered ${res.triggered} executions`, 'success');
          setLastTriggeredMap((m) => ({ ...m, [workflowPickerForSegId]: new Date().toLocaleString() }));
        } catch {
          push('Failed to trigger workflow', 'error');
        }
      }}
    />

      {/* Lead Detail Dialog */}
    <Dialog open={leadDetailOpen} onOpenChange={setLeadDetailOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader className="pb-6">
            <div className="flex items-center gap-4">
              {!!selectedLead && (
                <>
                  <Avatar className="h-16 w-16 border-2 border-gray-100 dark:border-gray-700">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                      {`${selectedLead.firstName?.[0] || ''}${selectedLead.lastName?.[0] || ''}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {`${selectedLead.firstName ?? ''} ${selectedLead.lastName ?? ''}`.trim()}
          </DialogTitle>
                    <DialogDescription className="text-gray-500 dark:text-gray-400 mt-1">
                      {selectedLead.company} • Lead Profile
                    </DialogDescription>
                  </div>
                  <Badge variant={Number((selectedLead as unknown as { score?: number }).score ?? 0) > 70 ? "default" : Number((selectedLead as unknown as { score?: number }).score ?? 0) > 40 ? "secondary" : "outline"}>
                    {Number((selectedLead as unknown as { score?: number }).score ?? 0) > 70 ? "Hot Lead" : Number((selectedLead as unknown as { score?: number }).score ?? 0) > 40 ? "Warm Lead" : "Cold Lead"}
                  </Badge>
                </>
              )}
            </div>
        </DialogHeader>

          {!!selectedLead && (
            <div className="space-y-6">
              {/* Contact Information */}
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-0 bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Contact Information
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Mail className="h-3 w-3" />
                        <span>{selectedLead.email}</span>
                      </div>
                      {!!(selectedLead as unknown as { phone?: string })?.phone && (
                        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                          <Phone className="h-3 w-3" />
                          <span>{String((selectedLead as unknown as { phone?: string }).phone)}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                        <Building2 className="h-3 w-3" />
                        <span>{selectedLead.company}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gray-50 dark:bg-gray-800">
                  <CardContent className="p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Lead Score
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-300">Current Score</span>
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{Number((selectedLead as unknown as { score?: number }).score ?? 0)}/100</span>
                      </div>
                      <Progress value={Number((selectedLead as unknown as { score?: number }).score ?? 0)} className="h-3" />
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Last updated 2 hours ago
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Activity Timeline */}
              <Card className="border-0 bg-gray-50 dark:bg-gray-800">
                <CardContent className="p-4">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Recent Activity
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 text-sm">
                      <div className="p-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                        <Plus className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-gray-100">Lead created</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">2 days ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <div className="p-1 bg-green-100 dark:bg-green-900 rounded-full">
                        <Mail className="h-3 w-3 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-gray-100">Email opened</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">1 day ago</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <div className="p-1 bg-purple-100 dark:bg-purple-900 rounded-full">
                        <Eye className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <p className="text-gray-900 dark:text-gray-100">Visited pricing page</p>
                        <p className="text-gray-500 dark:text-gray-400 text-xs">6 hours ago</p>
                      </div>
              </div>
            </div>
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Button className="gap-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                  <Plus className="h-4 w-4" />
                  {t('actions.createDeal')}
                </Button>
                <Button variant="outline" className="gap-2">
                  <Mail className="h-4 w-4" />
                  Send Email
                </Button>
                <Button variant="outline" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Call
                </Button>
                <Button variant="secondary" className="gap-2" onClick={() => selectedLead && rescoreLead(selectedLead.id)}>
                  <RefreshCw className="h-4 w-4" />
                  Rescore
                </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}


