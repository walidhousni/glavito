'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { teamApi } from '@/lib/api/team';
import {
  FaUsers,
  FaPlus,
  FaEnvelope,
  FaPhone,
  FaBuilding,
  FaCalendarAlt,
  FaDollarSign,
  FaChartLine,
  FaStar,
  FaEye,
  FaEdit,
  FaTrash,
  FaBullseye,
  FaBolt,
  FaChartBar,
  FaClock,
  FaCheckCircle,
  FaExclamationCircle,
  FaSync,
  FaChevronDown,
  FaDownload,
  FaCog,
  FaGripVertical
} from 'react-icons/fa';
import { MdMoreHoriz } from 'react-icons/md';
import { SegmentDialog } from '@/components/crm/segment-dialog';
import { crmApi } from '@/lib/api/crm-client';
import { useToast } from '@/components/ui/toast';
import { WorkflowPickerDialog } from '@/components/crm/workflow-picker-dialog';
import { CampaignDialog } from '@/components/crm/campaign-dialog';
import { marketingApi } from '@/lib/api/marketing-client';
import { SegmentDetailsDialog } from '@/components/crm/segment-details-dialog';
import { cn } from '@/lib/utils';
import { AnimatedCounter } from '@/components/crm/animated-counter';
import { AIInsightsWidget } from '@/components/crm/ai-insights-widget';
import { EnhancedTimeline } from '@/components/crm/enhanced-timeline';
import { LeadsTable } from '@/components/crm/leads-table';
import { PipelineBoard } from '@/components/crm/pipeline-board';
import { motion } from 'framer-motion';
import Image from 'next/image';

export default function CrmHubPage() {
  const t = useTranslations('crm');
  const { push } = useToast();
  const [tab, setTab] = useState<'leads' | 'pipeline' | 'segments' | 'analytics'>('leads');
  const { isLoading, leads, deals, segments, fetchInitial, moveDeal, rescoreLead, refreshSegments, pipelineAnalytics, salesForecast, fetchPipelineAnalytics, fetchSalesForecast } = useCrmStore();
  const [createOpen, setCreateOpen] = useState(false);
  const [createDealOpen, setCreateDealOpen] = useState(false);
  const [dealPrefill, setDealPrefill] = useState<{ name?: string; description?: string; value?: number; currency?: string; pipelineId?: string; stage?: 'NEW'|'QUALIFIED'|'PROPOSAL'|'NEGOTIATION'|'WON'|'LOST'; customerId?: string } | undefined>(undefined);
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
  const [selectedSearch, setSelectedSearch] = useState<Array<{ id: string; type: string }>>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [owners, setOwners] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedOwner, setSelectedOwner] = useState<string>('');
  const [leadsView, setLeadsView] = useState<'grid' | 'table'>('grid');
  const [pipelineView, setPipelineView] = useState<'kanban' | 'board'>('kanban');

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
      case 'NEW': return <FaStar className="h-4 w-4" />;
      case 'QUALIFIED': return <FaCheckCircle className="h-4 w-4" />;
      case 'PROPOSAL': return <FaChartBar className="h-4 w-4" />;
      case 'NEGOTIATION': return <FaBullseye className="h-4 w-4" />;
      case 'WON': return <FaCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'LOST': return <FaExclamationCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default: return <FaClock className="h-4 w-4" />;
    }
  };

  const STAGE_COLORS = {
    NEW: { bg: 'from-blue-500 to-cyan-500', icon: 'FQrA6ic36VQu', border: 'border-blue-500' },
    QUALIFIED: { bg: 'from-purple-500 to-pink-500', icon: 'xuvGCOXi8Wyg', border: 'border-purple-500' },
    PROPOSAL: { bg: 'from-amber-500 to-orange-500', icon: '9730', border: 'border-amber-500' },
    NEGOTIATION: { bg: 'from-green-500 to-emerald-500', icon: 'LPcVNr4g0oyz', border: 'border-green-500' },
    WON: { bg: 'from-emerald-600 to-green-600', icon: '2073', border: 'border-emerald-600' },
    LOST: { bg: 'from-slate-500 to-gray-500', icon: '112259', border: 'border-slate-500' },
  } as const;

  // color mapping handled inline where needed

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <>
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex flex-col gap-4">
          {/* Modern Header with Glass Morphism */}
          <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-4 backdrop-blur-xl bg-white/80 dark:bg-slate-900/80 border-b border-border/40 shadow-sm">
            <div className="flex flex-col gap-6 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                      <Image src="https://img.icons8.com/?size=28&id=xuvGCOXi8Wyg" alt="CRM" width={24} height={24} className="brightness-0 invert" />
                    </div>
                    <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {t('title')}
                </h1>
                      <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Image src="https://img.icons8.com/?size=16&id=12438" alt="" width={14} height={14} className="opacity-60" />
                  {t('subtitle')}
                </p>
                    </div>
                  </div>
              </div>
              
              {/* Real-time stats ticker */}
              <motion.div 
                  className="flex items-center gap-4"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                  <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10">
                          <Image src="https://img.icons8.com/?size=20&id=12438" alt="Leads" width={18} height={18} />
                        </div>
                        <div>
                  <AnimatedCounter value={stats.totalLeads} className="text-2xl font-bold text-blue-600 dark:text-blue-400" />
                          <p className="text-xs text-muted-foreground">{t('stats.leads', { default: 'Total Leads' })}</p>
                </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                          <Image src="https://img.icons8.com/?size=20&id=xuvGCOXi8Wyg" alt="Deals" width={18} height={18} />
                        </div>
                        <div>
                  <AnimatedCounter value={stats.totalDeals} className="text-2xl font-bold text-purple-600 dark:text-purple-400" />
                          <p className="text-xs text-muted-foreground">{t('stats.deals', { default: 'Active Deals' })}</p>
                </div>
                </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-green-500/10">
                          <FaDollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
                        <div>
                          <AnimatedCounter value={formatCurrency(stats.totalValue)} className="text-xl font-bold text-green-600 dark:text-green-400" />
                          <p className="text-xs text-muted-foreground">{t('stats.pipeline', { default: 'Pipeline Value' })}</p>
          </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
            </div>

              {/* Header Actions */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              {/* Global Search */}
              <div className="flex-1 max-w-md">
                <AdvancedSearch
                  placeholder={t('searchPlaceholder')}
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
                      push(t('messages.dealDetailsComingSoon'), 'info');
                    } else if (result.type === 'customer') {
                      push(t('messages.customerDetailsComingSoon'), 'info');
                    } else if (result.type === 'segment') {
                      push(t('messages.segmentDetailsComingSoon'), 'info');
                    }
                  }}
                  className="w-full"
                  onResultSelect={(results) => setSelectedSearch(results.map(r => ({ id: r.id, type: r.type })))}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTab('analytics')}
                    className="gap-2"
                >
                    <Image src="https://img.icons8.com/?size=16&id=wdfmkgweCGDk" alt="Analytics" width={14} height={14} />
                  {t('tabs.analytics')}
                </Button>
                <DropdownMenu open={quickActionsOpen} onOpenChange={setQuickActionsOpen}>
                  <DropdownMenuTrigger asChild>
                      <Button size="sm" className="gap-2 h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm">
                        <FaPlus className="h-3.5 w-3.5" />
                      {t('quickActions.title')}
                        <FaChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => { setCreateOpen(true); setQuickActionsOpen(false); }} className="text-xs">
                        <FaUsers className="h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-400" />
                      {t('quickActions.createLead')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setCreateDealOpen(true); setQuickActionsOpen(false); }} className="text-xs">
                        <FaChartBar className="h-3.5 w-3.5 mr-2 text-purple-600 dark:text-purple-400" />
                      {t('quickActions.createDeal')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setEditSegment(null); setSegmentDialogOpen(true); setQuickActionsOpen(false); }} className="text-xs">
                      <FaBullseye className="h-3.5 w-3.5 mr-2 text-green-600 dark:text-green-400" />
                      {t('quickActions.createSegment')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => { setTab('analytics'); setQuickActionsOpen(false); }} className="text-xs">
                      <FaChartLine className="h-3.5 w-3.5 mr-2 text-orange-600 dark:text-orange-400" />
                      {t('quickActions.viewAnalytics')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => { setTab('pipeline'); setQuickActionsOpen(false); }} className="text-xs">
                      <FaChartBar className="h-3.5 w-3.5 mr-2 text-purple-600 dark:text-purple-400" />
                      {t('quickActions.viewPipeline')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => {
                      // Export functionality
                      push(t('messages.exportComingSoon'), 'info');
                      setQuickActionsOpen(false);
                    }} className="text-xs">
                      <FaDownload className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      {t('quickActions.exportData')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                      // Settings functionality
                      push(t('messages.settingsComingSoon'), 'info');
                      setQuickActionsOpen(false);
                    }} className="text-xs">
                      <FaCog className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                      {t('quickActions.crmSettings')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Actions Bar */}
          {selectedSearch.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 p-3 rounded-lg border bg-muted/30">
              <div className="text-sm">{t('bulkActions.selected', { count: selectedSearch.length })}</div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={async () => {
                  try {
                    setAssignOpen(true);
                    const users = await teamApi.getAvailableUsers();
                    setOwners(users.map((u: { id: string; email: string; firstName?: string; lastName?: string }) => ({ id: String(u.id), name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email })));
                  } catch { /* noop */ }
                }}>{t('bulkActions.assignOwner')}</Button>
                <Button size="sm" onClick={() => {
                  const seg = selectedSearch.find(x => x.type === 'segment');
                  if (!seg) { push(t('messages.selectSegment'), 'info'); return; }
                  const found = segments.find(s => s.id === seg.id);
                  setCampaignForSeg(found ? { id: found.id, name: found.name } : { id: seg.id, name: 'Segment' });
                }}>{t('bulkActions.startCampaign')}</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedSearch([])}>{t('bulkActions.clear')}</Button>
              </div>
              {assignOpen && (
                <div className="flex items-center gap-2 ml-auto">
                  <Select value={selectedOwner} onValueChange={setSelectedOwner}>
                    <SelectTrigger className="h-9 w-60">
                      <SelectValue placeholder={t('bulkActions.selectOwner')} />
                    </SelectTrigger>
                    <SelectContent>
                      {owners.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button size="sm" onClick={async () => {
                    if (!selectedOwner) return;
                    const ops: Array<Promise<unknown>> = selectedSearch.map(sel => {
                      if (sel.type === 'lead') return crmApi.updateLead(sel.id, { assignedUserId: selectedOwner });
                      if (sel.type === 'deal') return crmApi.updateDeal(sel.id, { assignedUserId: selectedOwner });
                      return Promise.resolve();
                    });
                    try { await Promise.allSettled(ops); push(t('messages.assignmentUpdated'), 'success'); } catch { push(t('messages.assignmentFailed'), 'error'); }
                    setAssignOpen(false);
                    setSelectedOwner('');
                  }}>{t('bulkActions.apply')}</Button>
                </div>
              )}
            </div>
          )}

          {/* Additional Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-950/20 dark:to-cyan-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FaBullseye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  {t('stats.qualifiedLeads')}
                </CardTitle>
                <div className="p-1.5 rounded-lg bg-blue-500/10">
                  <FaBullseye className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.qualifiedLeads}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <FaCheckCircle className="mr-1 h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                  {stats.totalLeads > 0 ? Math.round((stats.qualifiedLeads / stats.totalLeads) * 100) : 0}% {t('stats.qualified')}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50/50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FaChartLine className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  {t('stats.conversionRate')}
                </CardTitle>
                <div className="p-1.5 rounded-lg bg-purple-500/10">
                  <FaChartLine className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.conversionRate}%</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <FaBolt className="mr-1 h-3 w-3 text-amber-500 dark:text-amber-400" />
                  {stats.wonDeals} {t('stats.wonDeals')}
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50/50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FaDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  {t('stats.wonDeals')}
                </CardTitle>
                <div className="p-1.5 rounded-lg bg-emerald-500/10">
                  <FaCheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.wonDeals}</div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <FaDollarSign className="mr-1 h-3 w-3 text-green-500 dark:text-green-400" />
                  {formatCurrency(deals.filter(d => d.stage === 'WON').reduce((sum, d) => sum + (d.valueAmount || 0), 0))} {t('stats.won', { default: 'won' })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <Tabs value={tab} onValueChange={(v) => {
            const nv = v as 'leads' | 'pipeline' | 'segments' | 'analytics';
            setTab(nv);
            if (nv === 'segments') void refreshSegments();
          }} className="w-full">
            <div className="flex items-center justify-between border-b border-border/50 pb-2">
              <TabsList className="grid w-full grid-cols-4 lg:w-[700px] bg-transparent h-auto p-0 gap-1">
                <TabsTrigger 
                  value="leads" 
                  className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-muted-foreground hover:text-foreground transition-colors border-0"
                >
                  <FaUsers className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium">{t('tabs.leads')}</span>
                  {stats.totalLeads > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {stats.totalLeads}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="pipeline" 
                  className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-950/30 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 text-muted-foreground hover:text-foreground transition-colors border-0"
                >
                  <FaChartBar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium">{t('tabs.pipeline')}</span>
                  {stats.totalDeals > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      {stats.totalDeals}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="segments" 
                  className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-green-50 dark:data-[state=active]:bg-green-950/30 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 text-muted-foreground hover:text-foreground transition-colors border-0"
                >
                  <FaBullseye className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium">{t('tabs.segments') || 'Segments'}</span>
                  {segments.length > 0 && (
                    <Badge variant="secondary" className="h-4 px-1.5 text-[10px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      {segments.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="analytics" 
                  className="flex flex-col items-center gap-1.5 px-4 py-2.5 rounded-lg data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground transition-colors border-0"
                >
                  <FaChartLine className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-medium">{t('tabs.analytics', { default: 'Analytics' })}</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="leads" className="space-y-4">
              {/* Leads Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex-1 max-w-md">
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
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 text-xs border-0 shadow-sm">
                        <FaEye className="h-3.5 w-3.5 mr-2" />
                        {leadsView === 'grid' ? 'Grid View' : 'Table View'}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => setLeadsView('grid')} className="text-xs">
                        Grid View
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLeadsView('table')} className="text-xs">
                        Table View
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button onClick={() => setCreateOpen(true)} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm">
                    <FaPlus className="h-3.5 w-3.5 mr-2" />
                    {t('actions.createLead')}
                  </Button>
                </div>
              </div>

              {/* Leads View - Grid or Table */}
              {leadsView === 'table' ? (
                <LeadsTable
                  data={leads as LeadItem[]}
                  isLoading={isLoading}
                  onViewLead={(lead) => {
                    setSelectedLead(lead);
                    setLeadDetailOpen(true);
                  }}
                  onRescore={async (leadIds) => {
                    for (const id of leadIds) {
                      await rescoreLead(id);
                    }
                    push(t('messages.leadRescored'), 'success');
                  }}
                  onAssign={async (leadIds, userId) => {
                    if (!userId) return;
                    const ops = leadIds.map(id => crmApi.updateLead(id, { assignedUserId: userId }));
                    try {
                      await Promise.allSettled(ops);
                      push(t('messages.assignmentUpdated'), 'success');
                    } catch {
                      push(t('messages.assignmentFailed'), 'error');
                    }
                  }}
                />
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {(leads as LeadItem[]).map((lead, index) => {
                  const score = Number((lead as unknown as { score?: number }).score ?? 0);
                  const initials = `${lead.firstName?.[0] || ''}${lead.lastName?.[0] || ''}`.toUpperCase();

                  return (
                    <motion.div
                      key={lead.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      whileHover={{ y: -4 }}
                    >
                      <Card
                        className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                        onClick={() => {
                          setSelectedLead(lead);
                          setLeadDetailOpen(true);
                        }}
                      >
                        {/* AI Score Badge with gradient */}
                        <div className="absolute top-2 right-2 z-10">
                          <Badge className={cn(
                            "backdrop-blur-sm",
                            score > 70 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                            score > 40 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                            "bg-gradient-to-r from-slate-500 to-gray-500"
                          )}>
                            <Image src={`https://img.icons8.com/?size=16&id=FQrA6ic36VQu`} alt="" width={12} height={12} className="mr-1 brightness-0 invert" />
                            {score}/100 {score > 70 ? '🔥' : ''}
                          </Badge>
                        </div>
                        
                        {/* Gradient background effect */}
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <CardHeader className="pb-3 relative">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12 ring-2 ring-primary/20 ring-offset-2">
                                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${lead.email}`} />
                                <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                                  {initials}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <CardTitle className="text-lg group-hover:text-primary transition-colors flex items-center gap-2">
                                  {lead.firstName} {lead.lastName}
                                  {lead.source === 'linkedin' && (
                                    <Image src="https://img.icons8.com/?size=16&id=xuvGCOXi8Wyg" alt="LinkedIn" width={16} height={16} />
                                  )}
                                </CardTitle>
                                <CardDescription className="flex items-center gap-2">
                                  <FaBuilding className="h-3 w-3" />
                                  {lead.company}
                                </CardDescription>
                              </div>
                            </div>
                          </div>
                        </CardHeader>

                      <CardContent className="relative space-y-4">
                        {/* Contact info with Icons8 */}
                        <div className="grid grid-cols-2 gap-3">
                          <a className="flex items-center gap-2 text-sm hover:text-primary transition-colors" href={`mailto:${encodeURIComponent(lead.email)}`} onClick={(e)=> e.stopPropagation()}>
                            <Image src="https://img.icons8.com/?size=16&id=LPcVNr4g0oyz" alt="Email" width={16} height={16} className="opacity-70" />
                            <span className="truncate">{lead.email}</span>
                          </a>
                          {(!!(lead as unknown as { phone?: string })?.phone) && (
                            <a className="flex items-center gap-2 text-sm hover:text-primary transition-colors" href={`tel:${encodeURIComponent(String((lead as unknown as { phone?: string }).phone || ''))}`} onClick={(e)=> e.stopPropagation()}>
                              <Image src="https://img.icons8.com/?size=16&id=9730" alt="Phone" width={16} height={16} className="opacity-70" />
                              <span>{String((lead as unknown as { phone?: string }).phone)}</span>
                            </a>
                          )}
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">{t('leadScore')}</span>
                            <span className="font-medium">{score}/100</span>
                          </div>
                          <Progress value={score} className="h-2" />
                        </div>
                      </CardContent>

                      <CardFooter className="pt-0">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0">
                              <MdMoreHoriz className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setSelectedLead(lead);
                              setLeadDetailOpen(true);
                            }} className="text-xs">
                              <FaEye className="h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-400" />
                              {t('actions.viewDetails')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              void rescoreLead(lead.id);
                              push(t('messages.leadRescored'), 'success');
                            }} className="text-xs">
                              <FaSync className="h-3.5 w-3.5 mr-2 text-orange-600 dark:text-orange-400" />
                              {t('actions.rescoreLead')}
                            </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              setDealPrefill({
                                name: `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim() || 'New Deal',
                                description: `Deal for ${lead.company || lead.email}`,
                                value: Number((lead as unknown as { score?: number }).score || 0) * 10,
                                currency: 'USD',
                                stage: 'NEW',
                              });
                              setCreateDealOpen(true);
                            }} className="text-xs">
                              <FaChartBar className="h-3.5 w-3.5 mr-2 text-purple-600 dark:text-purple-400" />
                              {t('actions.convertToDeal')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={(e) => {
                              e.stopPropagation();
                              push(t('messages.deleteLeadComingSoon'), 'info');
                            }} className="text-xs text-red-600 dark:text-red-400">
                              <FaTrash className="h-3.5 w-3.5 mr-2" />
                              {t('actions.deleteLead')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </CardFooter>
                    </Card>
                  </motion.div>
                  );
                })}

                {!isLoading && leads.length === 0 && (
                  <div className="col-span-full">
                    <Card className="border-2 border-dashed border-border/50">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                          <FaUsers className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle className="mb-2">{t('empty.leads')}</CardTitle>
                        <CardDescription className="mb-4">{t('empty.leadsDescription')}</CardDescription>
                        <Button onClick={() => setCreateOpen(true)} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm">
                          <FaPlus className="h-3.5 w-3.5 mr-2" />
                          {t('actions.createLead')}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
              )}
            </TabsContent>

            <TabsContent value="pipeline" className="space-y-4">
              {/* Pipeline Header */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <h2 className="text-xl font-semibold tracking-tight">{t('pipeline.title')}</h2>
                    <p className="text-muted-foreground">{t('pipeline.subtitle')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9 text-xs border-0 shadow-sm">
                          <FaEye className="h-3.5 w-3.5 mr-2" />
                          {pipelineView === 'kanban' ? 'Kanban View' : 'Board View'}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => setPipelineView('kanban')} className="text-xs">
                          Kanban View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setPipelineView('board')} className="text-xs">
                          Board View
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        void fetchInitial();
                        push(t('messages.pipelineRefreshed'), 'success');
                      }}
                      className="h-9 text-xs border-0 shadow-sm"
                    >
                      <FaSync className="h-3.5 w-3.5 mr-2" />
                      {t('pipeline.refresh')}
                    </Button>
                    <Button size="sm" onClick={() => setCreateDealOpen(true)} className="h-9 text-xs bg-purple-600 hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-700 border-0 shadow-sm">
                      <FaPlus className="h-3.5 w-3.5 mr-2" />
                      {t('actions.createDeal')}
                    </Button>
                  </div>
                </div>

                {/* Pipeline Search */}
                <div className="max-w-md">
                  <AdvancedSearch
                    placeholder={t('pipeline.searchPlaceholder')}
                    showFilters={true}
                    showSavedSearches={false}
                    onResultClick={(result) => {
                      if (result.type === 'deal') {
                        // Handle deal click - could open deal details
                        push(t('messages.dealDetailsComingSoon'), 'info');
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              {/* Pipeline Board */}
              {pipelineView === 'board' ? (
                <PipelineBoard
                  deals={deals as DealItem[]}
                  stages={[
                    { id: 'NEW', name: t('stages.new') },
                    { id: 'QUALIFIED', name: t('stages.qualified') },
                    { id: 'PROPOSAL', name: t('stages.proposal') },
                    { id: 'NEGOTIATION', name: t('stages.negotiation') },
                    { id: 'WON', name: t('stages.won') },
                    { id: 'LOST', name: t('stages.lost') },
                  ]}
                  isLoading={isLoading}
                  onDealMove={(dealId, newStage) => moveDeal(dealId, newStage as 'NEW' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'WON' | 'LOST')}
                  onDealClick={(deal) => push(t('messages.dealDetailsComingSoon'), 'info')}
                  onDealEdit={(deal) => push(t('messages.dealDetailsComingSoon'), 'info')}
                  onDealDelete={(dealId) => push(t('messages.deleteLeadComingSoon'), 'info')}
                />
              ) : (
                <ScrollArea className="w-full">
                <div className="flex gap-4 pb-4">
                  {(['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const).map((stage) => {
                    const stageDeals = (deals as DealItem[]).filter((d) => d.stage === stage);
                    const stageValue = stageDeals.reduce((sum, d) => sum + (d.valueAmount || ((d as { value?: number }).value ?? 0)), 0);
                    const stageConfig = STAGE_COLORS[stage];

                    return (
                      <motion.div
                        key={stage}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={cn(
                          "flex flex-col min-w-[320px] rounded-xl transition-all duration-300",
                          dragOverStage === stage && 'ring-2 ring-primary ring-offset-2 scale-105'
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
                        {/* Enhanced Stage Header with Gradient */}
                        <div className={cn(
                          "flex items-center justify-between p-4 rounded-t-xl shadow-lg text-white",
                          `bg-gradient-to-r ${stageConfig.bg}`
                        )}>
                          <div className="flex items-center gap-2">
                            <Image 
                              src={`https://img.icons8.com/?size=24&id=${stageConfig.icon}`}
                              alt={stage}
                              width={20}
                              height={20}
                              className="brightness-0 invert"
                            />
                            <h3 className="font-bold text-sm">{t(`stages.${stage.toLowerCase()}`)}</h3>
                            <Badge variant="secondary" className="bg-white/20 text-white border-0">
                              {stageDeals.length}
                            </Badge>
                          </div>
                          {stageValue > 0 && (
                            <span className="text-sm font-bold">
                              {formatCurrency(stageValue)}
                            </span>
                          )}
                        </div>

                        {/* Deals List */}
                        <div className="flex-1 p-3 space-y-3 min-h-[400px] bg-muted/30 rounded-b-xl">
                          {stageDeals.map((deal, idx) => (
                            <motion.div
                              key={deal.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.05 }}
                            >
                              <div
                                draggable
                                onDragStart={(e: React.DragEvent) => {
                                  setDraggingId(deal.id);
                                  e.dataTransfer.setData('text/plain', deal.id);
                                  e.dataTransfer.effectAllowed = 'move';
                                }}
                                onDragEnd={() => setDraggingId(null)}
                                className="cursor-move"
                              >
                              <Card
                                className={cn(
                                  "group border-l-4 hover:shadow-xl transition-all duration-300",
                                  stageConfig.border,
                                  draggingId === deal.id && 'opacity-50 rotate-2 scale-105'
                                )}
                              >
                                <CardHeader className="pb-2">
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-2 flex-1">
                                      <FaGripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                                      <CardTitle className="text-sm line-clamp-2 group-hover:text-primary transition-colors">
                                        {deal.name || deal.title || 'Untitled Deal'}
                                      </CardTitle>
                                    </div>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <MdMoreHoriz className="h-3 w-3" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        push(t('messages.dealDetailsComingSoon'), 'info');
                                      }} className="text-xs">
                                        <FaEye className="h-3.5 w-3.5 mr-2 text-blue-600 dark:text-blue-400" />
                                        {t('actions.viewDetails')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        push(t('messages.dealDetailsComingSoon'), 'info');
                                      }} className="text-xs">
                                        <FaEdit className="h-3.5 w-3.5 mr-2 text-orange-600 dark:text-orange-400" />
                                        {t('actions.editDeal')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        push(t('messages.deleteLeadComingSoon'), 'info');
                                      }} className="text-xs text-red-600 dark:text-red-400">
                                        <FaTrash className="h-3.5 w-3.5 mr-2" />
                                        {t('actions.deleteDeal')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </CardHeader>

                              <CardContent className="pt-2 space-y-3">
                                {deal.valueAmount && (
                                  <div className="flex items-center gap-1 text-base font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                                    <FaDollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    {formatCurrency(deal.valueAmount)}
                                  </div>
                                )}

                                {/* AI Win Probability Placeholder */}
                                <div className="p-2 rounded-lg bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-medium flex items-center gap-1">
                                      <Image src="https://img.icons8.com/?size=12&id=FQrA6ic36VQu" alt="AI" width={10} height={10} />
                                      Win Probability
                                    </span>
                                    <span className="text-xs font-bold text-purple-600">
                                      {Math.min(95, 60 + Math.floor(Math.random() * 30))}%
                                    </span>
                                  </div>
                                  <Progress value={Math.min(95, 60 + Math.floor(Math.random() * 30))} className="h-1" />
                                </div>

                                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
                                  <div className="flex items-center gap-1">
                                    <FaCalendarAlt className="h-3 w-3" />
                                    <span>{t('timeFormat.daysAgo', { count: 2 })}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <FaClock className="h-3 w-3" />
                                    <span>{t('timeFormat.daysLeft', { count: 5 })}</span>
                                  </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex items-center gap-2 pt-2 border-t border-border/50 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button size="sm" variant="ghost" className="flex-1 h-7 text-xs">
                                    <FaEye className="h-3 w-3 mr-1" />
                                    View
                                  </Button>
                                  <Button size="sm" variant="ghost" className="h-7 text-xs">
                                    <FaEnvelope className="h-3 w-3 mr-1" />
                                    Email
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </motion.div>
                          ))}

                          {stageDeals.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-8 text-center">
                              <div className="p-3 bg-muted rounded-full mb-3">
                                {getStageIcon(stage)}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {stage === 'NEW' ? t('pipeline.dropNewDeals') : t('pipeline.noDealsInStage', { stage: stage.toLowerCase() })}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
              )}
            </TabsContent>

            <TabsContent value="segments" className="space-y-4">
              {/* Segments Header */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h2 className="text-xl font-semibold tracking-tight">{t('segments.title')}</h2>
                  <p className="text-muted-foreground">{t('segments.subtitle')}</p>
                </div>
                <Button onClick={() => { setEditSegment(null); setSegmentDialogOpen(true); }} className="h-9 text-xs bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 border-0 shadow-sm">
                  <FaPlus className="h-3.5 w-3.5 mr-2" />
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
                      icon: FaUsers,
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
                    <Card className="border-2 border-dashed border-border/50">
                      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center mb-4">
                          <FaBullseye className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <CardTitle className="mb-2">{t('empty.segments')}</CardTitle>
                        <CardDescription className="mb-4">{t('empty.segmentsDescription')}</CardDescription>
                        <Button onClick={() => { setEditSegment(null); setSegmentDialogOpen(true); }} className="h-9 text-xs bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 border-0 shadow-sm">
                          <FaPlus className="h-3.5 w-3.5 mr-2" />
                          {t('segments.create')}
                        </Button>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6 mt-6">
              {/* AI Insights Widget */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <AIInsightsWidget />
              </motion.div>

              <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 rounded-lg bg-blue-500/10">
                        <FaChartBar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      {t('analytics.pipelineOverview', { default: 'Pipeline Overview' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!pipelineAnalytics ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="skeleton h-12 w-12 rounded-full" />
                          <div className="skeleton h-4 w-32 rounded" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-3 gap-4">
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl p-4 border border-blue-200/50">
                            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <FaDollarSign className="h-3 w-3" />
                              {t('analytics.weightedPipeline', { default: 'Weighted Pipeline' })}
                          </div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(pipelineAnalytics.weightedPipeline)}</div>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 rounded-xl p-4 border border-purple-200/50">
                            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <FaChartLine className="h-3 w-3" />
                              {t('analytics.winRate', { default: 'Win Rate' })}
                          </div>
                            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round((pipelineAnalytics.winRate || 0) * 100)}%</div>
                        </div>
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-xl p-4 border border-green-200/50">
                            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <FaClock className="h-3 w-3" />
                              {t('analytics.avgCycle', { default: 'Avg Cycle' })}
                              </div>
                            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{Math.round(pipelineAnalytics.avgCycleDays || 0)}d</div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <FaChartBar className="h-4 w-4" />
                            {t('analytics.byStage', { default: 'Deals by Stage' })}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {pipelineAnalytics.stages.map(s => {
                              const stageConfig = STAGE_COLORS[s.stage as keyof typeof STAGE_COLORS];
                              return (
                                <Card key={s.stage} className={cn("border-l-4", stageConfig?.border || "border-gray-300")}>
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-medium text-muted-foreground">{t(`stages.${s.stage.toLowerCase()}`)}</span>
                                      <Badge variant="secondary" className="text-xs">{s.count}</Badge>
                                    </div>
                                    <div className="text-lg font-bold">{formatCurrency(s.totalValue)}</div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-3 text-lg">
                      <div className="p-2 rounded-lg bg-purple-500/10">
                        <Image src="https://img.icons8.com/?size=20&id=TrendingUp" alt="Forecast" width={18} height={18} />
                      </div>
                      {t('analytics.salesForecast', { default: 'Sales Forecast (30d)' })}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {!salesForecast ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                          <div className="skeleton h-12 w-12 rounded-full" />
                          <div className="skeleton h-4 w-32 rounded" />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20 rounded-xl p-4 border border-emerald-200/50">
                            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <FaDollarSign className="h-3 w-3" />
                              {t('analytics.totalForecast', { default: 'Total Forecast' })}
                          </div>
                            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(salesForecast.totalPredicted || 0)}</div>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 rounded-xl p-4 border border-blue-200/50">
                            <div className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-1">
                              <FaCalendarAlt className="h-3 w-3" />
                              {t('analytics.days', { default: 'Period' })}
                        </div>
                            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{salesForecast.periodDays || 30}d</div>
                              </div>
                          </div>
                        <div className="space-y-3">
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <FaChartLine className="h-4 w-4" />
                            {t('analytics.nextDays', { default: 'Upcoming Predictions' })}
                        </div>
                          <ScrollArea className="h-[280px] pr-4">
                            <div className="space-y-2">
                              {(!salesForecast.predictions || !Array.isArray(salesForecast.predictions) || salesForecast.predictions.length === 0) ? (
                                <div className="text-center py-8 text-muted-foreground text-sm">
                                  {t('analytics.noPredictions', { default: 'No predictions available yet' })}
                                </div>
                              ) : (
                                salesForecast.predictions.slice(0, 10).map((p, idx) => (
                                <Card key={p.date} className="border-0 bg-muted/50 hover:bg-muted transition-colors">
                                  <CardContent className="p-3">
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <span className="text-sm font-medium">{p.date}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <span className="text-sm font-semibold">{formatCurrency(p.predictedRevenue)}</span>
                                        <Badge variant="outline" className="text-xs">
                                          {Math.round(p.confidence * 100)}%
                                        </Badge>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                                ))
                              )}
                            </div>
                          </ScrollArea>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Dialogs */}
      <CreateLeadDialog open={createOpen} onOpenChange={setCreateOpen} />
      <CreateDealDialog open={createDealOpen} onOpenChange={setCreateDealOpen} prefill={dealPrefill} />
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

      {/* Enhanced Lead Detail Dialog */}
      <Dialog open={leadDetailOpen} onOpenChange={setLeadDetailOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader className="pb-4">
            <div className="flex items-center gap-4">
              {!!selectedLead && (
                <>
                  <Avatar className="h-16 w-16 ring-4 ring-primary/20 ring-offset-2">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${selectedLead.email}`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                      {`${selectedLead.firstName?.[0] || ''}${selectedLead.lastName?.[0] || ''}`.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {`${selectedLead.firstName ?? ''} ${selectedLead.lastName ?? ''}`.trim()}
                    </DialogTitle>
                    <DialogDescription className="text-sm flex items-center gap-2 mt-1">
                      <FaBuilding className="h-3 w-3" />
                      {selectedLead.company} • {t('leadDetails.title')}
                    </DialogDescription>
                  </div>
                  <Badge className={cn(
                    "h-8 px-3",
                    Number((selectedLead as unknown as { score?: number }).score ?? 0) > 70 ? "bg-gradient-to-r from-green-500 to-emerald-500" :
                    Number((selectedLead as unknown as { score?: number }).score ?? 0) > 40 ? "bg-gradient-to-r from-amber-500 to-orange-500" :
                    "bg-gradient-to-r from-slate-500 to-gray-500"
                  )}>
                    <Image src="https://img.icons8.com/?size=16&id=FQrA6ic36VQu" alt="AI" width={12} height={12} className="mr-1 brightness-0 invert" />
                    {Number((selectedLead as unknown as { score?: number }).score ?? 0)}/100
                    {Number((selectedLead as unknown as { score?: number }).score ?? 0) > 70 ? ' 🔥' : ''}
                  </Badge>
                </>
              )}
            </div>
          </DialogHeader>

          {!!selectedLead && (
            <div className="grid grid-cols-3 gap-6 h-[calc(90vh-140px)]">
              {/* Left Sidebar: Lead Info & Quick Actions */}
              <div className="space-y-4 overflow-y-auto pr-2">
                {/* Lead Score Card */}
                <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20">
                  <CardContent className="p-4">
                    <h4 className="font-semibold mb-4 flex items-center gap-2">
                      <Image src="https://img.icons8.com/?size=20&id=FQrA6ic36VQu" alt="AI" width={18} height={18} />
                      {t('leadDetails.leadScore')}
                    </h4>
                    <div className="relative w-32 h-32 mx-auto mb-4">
                      <svg className="w-full h-full" viewBox="0 0 100 100">
                        <circle
                          className="text-gray-200 stroke-current"
                          strokeWidth="10"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                        />
                        <circle
                          className="text-primary stroke-current"
                          strokeWidth="10"
                          strokeLinecap="round"
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          strokeDasharray={`${2 * Math.PI * 40 * (Number((selectedLead as unknown as { score?: number }).score ?? 0) / 100)} ${2 * Math.PI * 40}`}
                          transform="rotate(-90 50 50)"
                        />
                        <text
                          x="50"
                          y="50"
                          className="text-2xl font-bold"
                          textAnchor="middle"
                          dy=".3em"
                        >
                          {Number((selectedLead as unknown as { score?: number }).score ?? 0)}
                        </text>
                      </svg>
                    </div>
                    <Button size="sm" variant="outline" className="w-full h-9 text-xs border-0 shadow-sm" onClick={() => rescoreLead(selectedLead.id)}>
                      <FaSync className="h-3.5 w-3.5 mr-2" />
                      {t('leadDetails.actions.rescore')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Contact Info Card */}
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-4 space-y-3">
                    <h4 className="font-semibold mb-3">{t('leadDetails.contactInfo')}</h4>
                    <a href={`mailto:${selectedLead.email}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                      <FaEnvelope className="h-4 w-4 opacity-70" />
                      <span className="truncate">{selectedLead.email}</span>
                    </a>
                    {!!selectedLead.phone && (
                      <a href={`tel:${selectedLead.phone}`} className="flex items-center gap-2 text-sm hover:text-primary transition-colors">
                        <FaPhone className="h-4 w-4 opacity-70" />
                        <span>{String(selectedLead.phone)}</span>
                      </a>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FaBuilding className="h-4 w-4" />
                      <span>{selectedLead.company}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="space-y-2">
                  <Button className="w-full h-9 text-xs bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 border-0 shadow-sm" onClick={() => {
                    setDealPrefill({
                      name: `${selectedLead?.firstName ?? ''} ${selectedLead?.lastName ?? ''}`.trim() || 'New Deal',
                      description: `Deal for ${selectedLead?.company || selectedLead?.email}`,
                      value: Number((selectedLead as unknown as { score?: number }).score || 0) * 10,
                      currency: 'USD',
                      stage: 'NEW',
                      customerId: undefined,
                    });
                    setCreateDealOpen(true);
                    setLeadDetailOpen(false);
                  }}>
                    <FaBolt className="h-3.5 w-3.5 mr-2" />
                    {t('leadDetails.actions.createDeal')}
                  </Button>
                  <Button variant="outline" className="w-full h-9 text-xs border-0 shadow-sm" onClick={() => selectedLead && window.open(`mailto:${encodeURIComponent(selectedLead.email)}`)}>
                    <FaEnvelope className="h-3.5 w-3.5 mr-2" />
                    {t('leadDetails.actions.sendEmail')}
                  </Button>
                  <Button variant="outline" className="w-full h-9 text-xs border-0 shadow-sm" onClick={() => selectedLead && selectedLead.phone && window.open(`tel:${encodeURIComponent(String(selectedLead.phone))}`)}>
                    <FaPhone className="h-3.5 w-3.5 mr-2" />
                    {t('leadDetails.actions.call')}
                  </Button>
                </div>
              </div>

              {/* Right: Tabbed Content */}
              <div className="col-span-2">
                <Tabs defaultValue="timeline" className="h-full flex flex-col">
                  <TabsList className="w-full grid grid-cols-3">
                    <TabsTrigger value="timeline">{t('leadDetails.timeline', { default: 'Timeline' })}</TabsTrigger>
                    <TabsTrigger value="activity">{t('leadDetails.activity', { default: 'Activity' })}</TabsTrigger>
                    <TabsTrigger value="campaigns">{t('leadDetails.campaigns', { default: 'Campaigns' })}</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="timeline" className="flex-1 mt-4 overflow-y-auto">
                    <EnhancedTimeline leadId={selectedLead.id} />
                  </TabsContent>
                  
                  <TabsContent value="activity" className="flex-1 mt-4">
                    <LeadActivityTimeline leadId={selectedLead.id} />
                  </TabsContent>
                  
                  <TabsContent value="campaigns" className="flex-1 mt-4 overflow-y-auto">
                    <Card className="border-0 shadow-lg">
                      <CardContent className="p-4">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <FaBullseye className="h-4 w-4" />
                          {t('leadDetails.campaignTouchpoints', { default: 'Campaign Touchpoints' })}
                        </h4>
                        <TouchpointsList customerId={(selectedLead as unknown as Record<string, unknown>)?.customerId as string | undefined} />
                      </CardContent>
                    </Card>
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function TouchpointsList({ customerId }: { customerId?: string }) {
  const t = useTranslations('crm');
  const [rows, setRows] = useState<Array<{ id: string; campaignId: string; campaignName?: string; channel: string; status: string; sentAt?: string; openedAt?: string; clickedAt?: string }>>([])
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    let cancelled = false
    if (!customerId) { setRows([]); return }
    ;(async () => {
      try {
        setLoading(true)
        const list = await marketingApi.touchpointsForCustomer(customerId)
        if (!cancelled) { setRows(list || []) }
      } finally { if (!cancelled) setLoading(false) }
    })()
    return () => { cancelled = true }
  }, [customerId])
  if (loading && rows.length === 0) return <div className="skeleton h-10 rounded" />
  if (!rows.length) return <div className="text-sm text-muted-foreground">{t('leadDetails.noCampaignActivity')}</div>
  return (
    <div className="space-y-2">
      {rows.slice(0, 5).map(tp => (
        <div key={tp.id} className="flex items-center justify-between rounded border px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded ${tp.status === 'failed' ? 'bg-red-100 text-red-700' : tp.status === 'opened' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700'}`}>{tp.status}</span>
            <span className="text-slate-600">{tp.campaignName || tp.campaignId}</span>
          </div>
          <div className="text-slate-500">{tp.channel}</div>
        </div>
      ))}
    </div>
  )
}

function LeadActivityTimeline({ leadId }: { leadId: string }) {
  const t = useTranslations('crm');
  const [rows, setRows] = useState<Array<{ id: string; type: string; description: string; metadata?: Record<string, unknown>; createdAt: string; userId?: string }>>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const [hasNext, setHasNext] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await crmApi.listLeadActivities(leadId, { page, limit: 20 });
        if (cancelled) return;
        const data = Array.isArray(res.data) ? res.data : [];
        setRows(prev => (page === 1 ? data : [...prev, ...data]));
        setHasNext(Boolean(res.pagination?.hasNext));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true };
  }, [leadId, page]);

  return (
    <Card className="border-0 bg-gray-50 dark:bg-gray-800">
      <CardContent className="p-4">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <FaClock className="h-4 w-4" />
          {t('leadDetails.recentActivity')}
        </h4>
        {rows.length === 0 && !loading && (
          <div className="text-sm text-muted-foreground">{t('leadDetails.noCampaignActivity')}</div>
        )}
        <div className="space-y-3">
          {rows.map((a) => (
            <div key={a.id} className="flex items-start gap-3">
              <div className="p-1 rounded-full bg-muted">
                <span className="block h-3 w-3 rounded-full bg-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-gray-100">
                  {mapActivityText(t, a)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(a.createdAt).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="pt-3">
          {hasNext && (
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={loading}>
              {t('common.viewAll')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function mapActivityText(t: ReturnType<typeof useTranslations>, a: { type: string; description: string; metadata?: Record<string, unknown> }) {
  const type = String(a.type || '').toUpperCase();
  if (type === 'EMAIL_SENT') return t('leadDetails.emailOpened');
  if (type === 'CALL_MADE') return t('leadDetails.call');
  if (type === 'MEETING_SCHEDULED') return t('leadDetails.visitedPricing');
  return a.description || t('leadDetails.recentActivity');
}


