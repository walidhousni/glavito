'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  AlertTriangle,
  ArrowUpDown,
  Eye,
  Edit,
  UserPlus,
  RefreshCw,
  Bookmark,
  Trash2,
  MessageSquare,
  Instagram,
  Mail
} from 'lucide-react';
import { useTickets } from '@/lib/hooks/use-tickets';
import { useTicketsWebSocket } from '@/lib/hooks/use-tickets-websocket';
import { useAuthStore } from '@/lib/store/auth-store';
import { TicketCard } from '@/components/tickets/ticket-card';
import { TicketFilters } from '@/components/tickets/ticket-filters';
import { TicketStats } from '@/components/tickets/ticket-stats';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import { BulkActionsBar } from '@/components/tickets/bulk-actions-bar';
import { TicketDetailsDialog } from '@/components/tickets/ticket-details-dialog';
import { cn } from '@/lib/utils';
import { ticketsApi } from '@/lib/api/tickets-client';

export interface TicketsViewProps {
  mode: 'admin' | 'agent';
  onSelectTicket?: (id: string) => void;
  compact?: boolean;
  openCreate?: boolean; // when true, open create ticket dialog
}

type BasicTicket = { id: string; status: string } & Record<string, unknown>;

type TicketStatus = 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';
type TicketFiltersState = {
  status: TicketStatus[];
  priority: TicketPriority[];
  assignedAgentId: string;
  customerId: string;
  channelId: string;
  teamId: string;
  tags: string[];
  dateFrom: string;
  dateTo: string;
  overdue: boolean;
  unassigned: boolean;
  slaAtRisk: boolean;
};

export function TicketsView({ mode, onSelectTicket, compact = false, openCreate = false }: TicketsViewProps) {
  const { success, error: toastError, info } = useToast();
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const [view, setView] = useState<'list' | 'kanban' | 'table'>('list');
  const [selectedTickets, setSelectedTickets] = useState<string[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  // Open create dialog when requested externally
  React.useEffect(() => {
    if (openCreate) setShowCreateDialog(true);
  }, [openCreate]);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const defaultFilters: TicketFiltersState = mode === 'agent'
    ? {
        status: [],
        priority: [],
        assignedAgentId: '',
        customerId: '',
        channelId: '',
        teamId: '',
        tags: [],
        dateFrom: '',
        dateTo: '',
        overdue: false,
        unassigned: false,
        slaAtRisk: false,
      }
    : {
        status: [],
        priority: [],
        assignedAgentId: '',
        customerId: '',
        channelId: '',
        teamId: '',
        tags: [],
        dateFrom: '',
        dateTo: '',
        overdue: false,
        unassigned: false,
        slaAtRisk: false,
      };

  const [filters, setFilters] = useState<TicketFiltersState>(defaultFilters);
  const [pagination, setPagination] = useState({ page: 1, limit: 20 });
  const [savedSearches, setSavedSearches] = useState<Array<{ id: string; name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; updatedAt?: string }>>([]);
  const [semantic, setSemantic] = useState<boolean>(true);

  const memoFilters = useMemo(() => ({ ...filters, search: searchQuery }), [filters, searchQuery]);
  const memoPagination = useMemo(() => ({ ...pagination, sortBy, sortOrder }), [pagination, sortBy, sortOrder]);

  const {
    tickets,
    stats,
    loading,
    refetch,
    // createTicket,
    bulkAction,
    facets,
    capabilities,
  } = useTickets({
    filters: memoFilters,
    pagination: memoPagination,
    semantic,
  });

  const { user } = useAuthStore();
  const onTicketsEvent = useCallback(() => { refetch(); }, [refetch]);
  useTicketsWebSocket({ tenantId: user?.tenantId, onEvent: onTicketsEvent });

  // Listen for create success events to refresh and optionally select
  React.useEffect(() => {
    const handler = (e: Event) => {
      const id = (e as CustomEvent)?.detail?.id as string | undefined;
      refetch();
      if (id && onSelectTicket) onSelectTicket(id);
    };
    window.addEventListener('glavito:tickets:refetch' as any, handler as any);
    return () => window.removeEventListener('glavito:tickets:refetch' as any, handler as any);
  }, [refetch, onSelectTicket]);

  // Default agent view: show tickets assigned to me
  React.useEffect(() => {
    if (mode === 'agent' && user?.id && !filters.assignedAgentId) {
      setFilters(prev => ({ ...prev, assignedAgentId: user.id }));
    }
  }, [mode, user?.id, filters.assignedAgentId]);

  const handleSelectTicket = (ticketId: string, selected: boolean) => {
    if (selected) setSelectedTickets(prev => [...prev, ticketId]);
    else setSelectedTickets(prev => prev.filter(id => id !== ticketId));
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) setSelectedTickets((tickets?.data as Array<{ id: string }> | undefined)?.map((t) => t.id) || []);
    else setSelectedTickets([]);
  };

  const handleBulkAction = async (action: string, params?: Record<string, unknown>) => {
    if (selectedTickets.length === 0) return;
    // Fallback for AI-specific actions not handled by server bulk endpoint
    if (action === 'ai_analyze') {
      try {
        await Promise.all(selectedTickets.map((id) => ticketsApi.analyzeNow(id)));
        setSelectedTickets([]);
        refetch();
        success(t('bulkAnalyzeSuccess', { count: selectedTickets.length }));
      } catch {
        toastError(t('bulkAnalyzeError'));
      }
      return;
    }
    if (action === 'ai_auto_assign') {
      try {
        await Promise.all(selectedTickets.map((id) => ticketsApi.autoAssign(id)));
        setSelectedTickets([]);
        refetch();
        success(t('bulkAssignSuccess', { count: selectedTickets.length }));
      } catch {
        toastError(t('bulkAssignError'));
      }
      return;
    }
    await bulkAction({ action, ticketIds: selectedTickets, params });
    setSelectedTickets([]);
    refetch();
    success(`Bulk action applied: ${action} on ${selectedTickets.length} ticket(s)`);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPagination(prev => ({ ...prev, page: 1 }));
    // Debounced suggestions
    if (!query || query.trim().length < 2) {
      setShowSuggestions(false);
      setSuggestions(null);
      if (suggestTimeout) clearTimeout(suggestTimeout);
      setSuggestTimeout(null);
      return;
    }
    if (suggestTimeout) clearTimeout(suggestTimeout);
    const t = setTimeout(async () => {
      try {
        const s = await ticketsApi.suggest(query);
        setSuggestions(s);
        setShowSuggestions(Boolean(s?.subjects?.length || s?.tags?.length || s?.customers?.length));
      } catch {
        setShowSuggestions(false);
        setSuggestions(null);
      }
    }, 200);
    setSuggestTimeout(t as unknown as number);
  };

  const handleFilterChange = (newFilters: TicketFiltersState) => {
    setFilters(newFilters);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSort = (field: string) => {
    if (sortBy === field) setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortOrder('desc'); }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<{ subjects: string[]; tags: string[]; customers: Array<{ id: string; name?: string; email?: string; company?: string }> } | null>(null);
  const [suggestTimeout, setSuggestTimeout] = useState<number | null>(null);

  // Quick facet helpers
  const topTags = useMemo(() => {
    if (!facets?.tags) return [] as string[];
    return Object.entries(facets.tags)
      .sort((a, b) => (b[1] as number) - (a[1] as number))
      .slice(0, 10)
      .map(([tag]) => tag);
  }, [facets]);

  const toggleStatus = (status: TicketStatus) => {
    setFilters(prev => {
      const list = prev.status || [];
      const next: TicketStatus[] = list.includes(status) ? list.filter(s => s !== status) : [...list, status];
      return { ...prev, status: next };
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const togglePriority = (priority: TicketPriority) => {
    setFilters(prev => {
      const list = prev.priority || [];
      const next: TicketPriority[] = list.includes(priority) ? list.filter(p => p !== priority) : [...list, priority];
      return { ...prev, priority: next };
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const toggleTag = (tag: string) => {
    setFilters(prev => {
      const list = prev.tags || [];
      const next: string[] = list.includes(tag) ? list.filter(t => t !== tag) : [...list, tag];
      return { ...prev, tags: next };
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const processedTickets = useMemo(() => tickets?.data || [], [tickets?.data]);

  // Load saved searches (best-effort)
  React.useEffect(() => {
    (async () => {
      try {
        const list = await ticketsApi.listSavedSearches();
        setSavedSearches(list as Array<{ id: string; name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; updatedAt?: string }>);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const handleSaveSearch = async () => {
    const name = prompt(t('saved.saveAs'));
    if (!name) return;
    try {
      await ticketsApi.createSavedSearch({ name, query: searchQuery, filters: filters as Record<string, unknown>, semantic });
      const list = await ticketsApi.listSavedSearches();
      setSavedSearches(list as Array<{ id: string; name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; updatedAt?: string }>);
      success(`Saved search created: ${name}`);
    } catch {
      toastError('Failed to save search');
    }
  };

  const applySavedSearch = (s: { id: string; name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean }) => {
    setSearchQuery(s.query || '');
    if (s.filters) setFilters(s.filters as unknown as typeof filters);
    if (typeof s.semantic === 'boolean') setSemantic(s.semantic);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const deleteSavedSearch = async (id: string) => {
    try {
      await ticketsApi.deleteSavedSearch(id);
      const list = await ticketsApi.listSavedSearches();
      setSavedSearches(list as Array<{ id: string; name: string; query?: string; filters?: Record<string, unknown>; semantic?: boolean; updatedAt?: string }>);
      info('Saved search deleted');
    } catch {
      toastError('Failed to delete saved search');
    }
  };

  const clearAll = () => {
    setFilters({
      status: [],
      priority: [],
      assignedAgentId: '',
      customerId: '',
      channelId: '',
      teamId: '',
      tags: [],
      dateFrom: '',
      dateTo: '',
      overdue: false,
      unassigned: false,
      slaAtRisk: false
    });
    setSearchQuery('');
    setPagination({ page: 1, limit: pagination.limit });
  };

  return (
    <div className="space-y-6">
      {!compact && (
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <p className="text-muted-foreground">{t('subtitle')}</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
              {t('refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={clearAll}>
              {tCommon('clear')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSaveSearch}>
              {t('save')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Bookmark className="h-4 w-4 mr-2" />
                  {t('saved.button')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {savedSearches.length === 0 ? (
                  <DropdownMenuItem disabled>{t('saved.none')}</DropdownMenuItem>
                ) : (
                  savedSearches.map((s) => (
                    <div key={s.id} className="flex items-center justify-between px-2 py-1">
                      <button className="text-left text-sm hover:underline" onClick={() => applySavedSearch(s)}>
                        {s.name}
                      </button>
                      <button className="text-red-500" onClick={() => deleteSavedSearch(s.id)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant={semantic ? 'default' : 'outline'} size="sm" onClick={() => setSemantic((v) => !v)}>
              {semantic ? t('saved.semanticOn') : t('saved.semanticOff')}
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-2" />
              {t('createTicket')}
            </Button>
          </div>
        </div>
      )}

      {!compact && capabilities.canViewStats && <TicketStats stats={stats} />}

      {!compact && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder={t('searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="pl-10"
                  />
                  {showSuggestions && (
                    <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-sm">
                      <div className="max-h-72 overflow-auto py-2 text-sm">
                        {suggestions?.subjects?.length ? (
                          <div className="px-3 py-1 font-medium text-muted-foreground">{t('suggestions.subjects')}</div>
                        ) : null}
                        {suggestions?.subjects?.map((s) => (
                          <div key={`s-${s}`} className="px-3 py-1 hover:bg-muted cursor-pointer" onMouseDown={() => { setSearchQuery(s); setShowSuggestions(false); setPagination(prev => ({ ...prev, page: 1 })); }}>
                            {s}
                          </div>
                        ))}
                        {suggestions?.tags?.length ? (
                          <div className="px-3 py-1 mt-2 font-medium text-muted-foreground">{t('suggestions.tags')}</div>
                        ) : null}
                        {suggestions?.tags?.map((tag) => (
                          <div key={`t-${tag}`} className="px-3 py-1 hover:bg-muted cursor-pointer" onMouseDown={() => { toggleTag(tag); setShowSuggestions(false); }}>
                            #{tag}
                          </div>
                        ))}
                        {suggestions?.customers?.length ? (
                          <div className="px-3 py-1 mt-2 font-medium text-muted-foreground">{t('suggestions.customers')}</div>
                        ) : null}
                        {suggestions?.customers?.map((c) => (
                          <div key={`c-${c.id}`} className="px-3 py-1 hover:bg-muted cursor-pointer" onMouseDown={() => { setFilters(prev => ({ ...prev, customerId: c.id })); setShowSuggestions(false); setPagination(prev => ({ ...prev, page: 1 })); }}>
                            <div className="flex items-center justify-between">
                              <span className="truncate mr-2">{c.name || c.email || c.company || c.id}</span>
                              {c.email ? <span className="text-muted-foreground">{c.email}</span> : null}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className={cn(showFilters && 'bg-muted')}>
                <Filter className="h-4 w-4 mr-2" />
                {t('filtersLabel')}
              </Button>
              <Select value={view} onValueChange={(v) => setView(v as 'list' | 'kanban' | 'table')}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="list">{t('listView')}</SelectItem>
                  <SelectItem value="kanban">{t('kanbanView')}</SelectItem>
                  <SelectItem value="table">{t('tableView')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showFilters && (
              <div className="mt-4 pt-4 border-t">
                <TicketFilters filters={filters} onChange={handleFilterChange} />
              </div>
            )}

            {/* Saved searches chips */}
            {savedSearches.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {savedSearches.slice(0, 6).map((s) => (
                  <Badge key={`chip-${s.id}`} variant="outline" className="cursor-pointer" onClick={() => applySavedSearch(s)}>
                    <Bookmark className="h-3 w-3 mr-1" />
                    {s.name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Quick facets */}
            <div className="mt-4 pt-4 border-t">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {(['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const).map((s: TicketStatus) => (
                  <Badge key={`facet-status-${s}`} variant={filters.status?.includes(s) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleStatus(s)}>
                    {t(`status.${s}`)}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {(['low', 'medium', 'high', 'urgent', 'critical'] as const).map((p: TicketPriority) => (
                  <Badge key={`facet-priority-${p}`} variant={filters.priority?.includes(p) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => togglePriority(p)}>
                    {t(`priority.${p}`)}
                  </Badge>
                ))}
              </div>
              {topTags.length ? (
                <div className="flex flex-wrap items-center gap-2">
                  {topTags.map((tag) => (
                    <Badge key={`facet-tag-${tag}`} variant={filters.tags?.includes(tag) ? 'default' : 'outline'} className="cursor-pointer" onClick={() => toggleTag(tag)}>
                      #{tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}

      {selectedTickets.length > 0 && (
        <>
          <BulkActionsBar selectedCount={selectedTickets.length} onAction={handleBulkAction} onClear={() => setSelectedTickets([])} canDelete={capabilities.canDelete} />
          <div className="flex items-center gap-2">
            <Button size="sm" variant="default" onClick={() => handleBulkAction('ai_analyze')}>
              {t('aiAnalyze')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleBulkAction('ai_auto_assign')}>
              {t('aiAutoAssign')}
            </Button>
          </div>
        </>
      )}

      <div className="space-y-4">
        {view === 'list' && (
          <div className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <div className="flex items-center px-6 py-3 border-b bg-muted/50">
                  <div className="flex items-center space-x-4 flex-1">
                    {!compact && (
                      <Checkbox
                        checked={selectedTickets.length === processedTickets.length && processedTickets.length > 0}
                        onCheckedChange={(v) => handleSelectAll(!!v)}
                      />
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleSort('subject')} className="font-medium">
                      {t('subject')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center space-x-8">
                    <Button variant="ghost" size="sm" onClick={() => handleSort('status')} className="w-24">
                      {t('statusLabel')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('priority')} className="w-24">
                      {t('priorityLabel')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('assignedAgent')} className="w-32">
                      {t('assignee')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleSort('createdAt')} className="w-32">
                      {t('created')}
                      <ArrowUpDown className="ml-2 h-4 w-4" />
                    </Button>
                    <div className="w-12"></div>
                  </div>
                </div>

                <div className="divide-y divide-gray-50">
                  {processedTickets.map((ticket) => (
                    <div 
                      key={ticket.id} 
                      className={cn(
                        "flex items-center px-4 py-3 hover:bg-blue-50/50 transition-colors cursor-pointer group border-l-2 border-transparent hover:border-blue-500",
                        compact && "px-3 py-2"
                      )}
                      onClick={() => { onSelectTicket ? onSelectTicket(ticket.id) : setSelectedTicket(ticket.id); }}
                    >
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {!compact && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selectedTickets.includes(ticket.id)}
                              onCheckedChange={(v) => handleSelectTicket(ticket.id, !!v)}
                            />
                          </div>
                        )}
                        
                        {/* Channel indicator */}
                        <div className="flex-shrink-0">
                          {(() => {
                            const type = ((ticket as unknown) as { channel?: { type?: string } })?.channel?.type || 'whatsapp';
                            if (type === 'whatsapp') return (
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </div>
                            );
                            if (type === 'instagram') return (
                              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                <Instagram className="h-4 w-4 text-purple-600" />
                              </div>
                            );
                            if (type === 'email') return (
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <Mail className="h-4 w-4 text-blue-600" />
                              </div>
                            );
                            return (
                              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                                <MessageSquare className="h-4 w-4 text-green-600" />
                              </div>
                            );
                          })()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 min-w-0">
                              <h3 className={cn(
                                "font-medium truncate text-gray-900 group-hover:text-blue-600",
                                compact ? "text-sm" : "text-base"
                              )}>
                                #{ticket.id?.slice(-4) || '0001'} {ticket.subject}
                              </h3>
                              {ticket.slaInstance?.breachCount > 0 && (
                                <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <span className="text-xs text-gray-500">
                                {new Date(ticket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {!compact && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100">
                                      <MoreHorizontal className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectTicket ? onSelectTicket(ticket.id) : setSelectedTicket(ticket.id); }}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      {t('view')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Edit className="mr-2 h-4 w-4" />
                                      {t('edit')}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <UserPlus className="mr-2 h-4 w-4" />
                                      {t('assign')}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-xs text-gray-600">
                              {ticket.customer?.firstName} {ticket.customer?.lastName}
                            </span>
                            
                            {/* Priority indicator */}
                            <div className={cn(
                              "px-2 py-0.5 rounded-full text-xs font-medium",
                              ticket.priority === 'high' ? "bg-orange-100 text-orange-700" :
                              ticket.priority === 'medium' ? "bg-yellow-100 text-yellow-700" :
                              "bg-gray-100 text-gray-700"
                            )}>
                              {t(`priority.${ticket.priority}`)}
                            </div>

                            {/* System Login Failure badge from the image */}
                            {ticket.subject?.toLowerCase().includes('login') && (
                              <Badge variant="destructive" className="text-xs bg-red-500 text-white">
                                5
                              </Badge>
                            )}
                          </div>

                          {!compact && (
                            <p className="text-xs text-gray-500 truncate mt-1">
                              {ticket.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {view === 'kanban' && (
          <div className="grid grid-cols-5 gap-6">
            {(['open', 'in_progress', 'waiting', 'resolved', 'closed'] as const).map((status) => (
              <Card key={status} className="h-fit">
                <CardContent className="space-y-3 p-4">
                  <div className="flex items-center justify-between">
                    <Badge>{t(`status.${status}`)}</Badge>
                    <span className="text-muted-foreground">{(processedTickets as BasicTicket[]).filter(t => t.status === status).length}</span>
                  </div>
                  {(processedTickets as BasicTicket[]).filter((ticket: BasicTicket) => ticket.status === status).map((ticket: BasicTicket) => (
                    <TicketCard
                      key={ticket.id}
                      ticket={ticket}
                      onSelect={(selected) => handleSelectTicket(ticket.id, selected)}
                      selected={selectedTickets.includes(ticket.id)}
                      onClick={() => setSelectedTicket(ticket.id)}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {tickets && tickets.totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t('showingResults', {
                  start: (pagination.page - 1) * pagination.limit + 1,
                  end: Math.min(pagination.page * pagination.limit, tickets.total),
                  total: tickets.total
                })}
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))} disabled={pagination.page === 1}>
                  {t('previous')}
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, tickets.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <Button key={page} variant={pagination.page === page ? 'default' : 'outline'} size="sm" onClick={() => setPagination(prev => ({ ...prev, page }))}>
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button variant="outline" size="sm" onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))} disabled={pagination.page === tickets.totalPages}>
                  {t('next')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <CreateTicketDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSuccess={() => {
          setShowCreateDialog(false);
          refetch();
        }}
      />

      {!onSelectTicket && selectedTicket && (
        <TicketDetailsDialog
          ticketId={selectedTicket}
          open={!!selectedTicket}
          onOpenChange={(open) => !open && setSelectedTicket(null)}
        />
      )}
    </div>
  );
}


