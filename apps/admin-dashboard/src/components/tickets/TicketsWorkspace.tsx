'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ConversationList } from './ConversationList';
import { ConversationThread } from './ConversationThread';
import { CustomerProfile } from './CustomerProfile';
import { TicketCollabPanel } from './ticket-collab-panel';
import TeamView from '@/components/teams/team-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  Users,
  Brain,
  Settings,
  Zap,
  Loader2,
  MessageSquare,
  LayoutGrid,
  ListFilter,
  Inbox
} from 'lucide-react';
import { useTicketsWebSocket } from '@/lib/hooks/use-tickets-websocket';
import { useAuthStore } from '@/lib/store/auth-store';
import { conversationsApi } from '@/lib/api/conversations-client';
import { aiApi } from '@/lib/api/ai-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AITriageSettings } from './ai-triage-settings';
import { RoutingSuggestionsPanel } from './routing-suggestions-panel';
import { ticketsApi } from '@/lib/api/tickets-client';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface TicketsWorkspaceProps {
  openTicketId?: string;
  mode?: 'admin' | 'agent';
}

export function TicketsWorkspace({ openTicketId, mode = 'admin' }: TicketsWorkspaceProps) {
  const t = useTranslations('tickets');
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();
  
  // State management
  const [selectedConversationId, setSelectedConversationId] = useState<string | undefined>(openTicketId);
  const [selectedTicketId, setSelectedTicketId] = useState<string | undefined>(undefined);
  const [activeChannelTab, setActiveChannelTab] = useState<'social' | 'all'>('all');
  const [filters, setFilters] = useState({
    status: [] as string[],
    channel: [] as string[],
    assignedAgentId: mode === 'agent' ? user?.id : undefined,
  });

  // Unified inbox state (advanced conversations)
  const [inbox, setInbox] = useState<Array<{ id: string; status?: string | null; updatedAt?: string | Date; lastMessageAt?: string | Date }>>([]);
  const [inboxLoading, setInboxLoading] = useState<boolean>(true);
  const [inboxError, setInboxError] = useState<string | null>(null);

  // Minimal refetch hook removed; call fetchInbox directly

  // WebSocket for real-time updates
  useTicketsWebSocket({
    tenantId: user?.tenantId,
    onEvent: () => {
      // Best-effort refresh inbox
      void fetchInbox();
    },
  });

  // Handle URL params
  useEffect(() => {
    const ticketParam = searchParams?.get('ticket');
    if (ticketParam) {
      setSelectedTicketId(ticketParam);
    }
  }, [searchParams]);

  // Handle conversation selection
  const handleSelectConversation = (conversationId: string, ticketId?: string) => {
    setSelectedConversationId(conversationId);
    setSelectedTicketId(ticketId);
    
    // Load ticket data if ticketId is available
    if (ticketId) {
      ticketsApi.get(ticketId).then(() => {
        // Ticket data loaded
      }).catch(() => {
        // Error loading ticket
      });
    }
    
    try {
      window.dispatchEvent(new CustomEvent('glavito:conversation:active', { detail: { conversationId } }));
    } catch { /* noop */ }
  };

  // Fetch unified inbox conversations
  const fetchInbox = useCallback(async () => {
    try {
      setInboxLoading(true);
      setInboxError(null);
      const statusParam = Array.isArray(filters.status) && filters.status.length > 0 ? String(filters.status[0]) : undefined;
      
      // Handle channel filtering based on active tab
      let channelParam: string | undefined = undefined;
      if (activeChannelTab === 'social') {
        // Request both WhatsApp and Instagram channels
        channelParam = 'whatsapp,instagram';
      } else if (Array.isArray(filters.channel) && filters.channel.length > 0) {
        channelParam = String(filters.channel[0]);
      }
      
      console.log('[INBOX] Fetching with filters:', { statusParam, channelParam, activeChannelTab, filters });
      
      const res = await conversationsApi.getUnifiedInbox({
        page: 1,
        limit: 50,
        status: statusParam,
        channel: channelParam,
        assignedTo: filters.assignedAgentId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        teamId: (filters as any).teamId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        search: (filters as any).search,
      });
      
      console.log('[INBOX] Raw response:', res);
      
      // Simplified response unwrapping
      const responseData = res?.data ?? res;
      const items = Array.isArray(responseData?.conversations) 
        ? responseData.conversations 
        : Array.isArray(responseData) 
        ? responseData 
        : [];
      
      console.log('[INBOX] Parsed items:', items, 'Count:', items.length);
      
      setInbox(items);
    } catch (e) {
      console.error('Failed to load inbox', e);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const msg = (e as any)?.response?.status === 401
        ? 'You are not authenticated. Please sign in.'
        : ((e as Error)?.message || 'Failed to load inbox');
      setInboxError(msg);
      setInbox([]);
    } finally {
      setInboxLoading(false);
    }
  }, [filters, activeChannelTab]);

  useEffect(() => {
    void fetchInbox();
  }, [fetchInbox]);

  // Listen to TeamView filter events
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const detail = (e as CustomEvent<any>).detail || {};
        setFilters(prev => ({
          ...prev,
          ...(detail.teamId !== undefined ? { teamId: detail.teamId } : {}),
          ...(detail.assignedAgentId !== undefined ? { assignedAgentId: detail.assignedAgentId || undefined } : {}),
        }));
          } catch { /* noop */ }
    };
    window.addEventListener('glavito:tickets:filters', handler as EventListener);
    return () => window.removeEventListener('glavito:tickets:filters', handler as EventListener);
  }, []);

  const derivedStats = React.useMemo(() => {
    const counts = { open: 0, waiting: 0, snoozed: 0, overdue: 0, resolved: 0 } as Record<string, number>;
    for (const c of inbox) {
      const st = String(c?.status || '').toLowerCase();
      if (st === 'active') counts.open += 1;
      else if (st === 'waiting') counts.waiting += 1;
      else if (st === 'snoozed') counts.snoozed += 1;
      else if (st === 'closed' || st === 'resolved') counts.resolved += 1;
    }
    return counts;
  }, [inbox]);

  // Autopilot mode (tenant-wide)
  const [aiMode, setAiMode] = useState<'off'|'draft'|'auto'>('off');
  const [showTriageSettings, setShowTriageSettings] = useState(false);
  
  const loadAutopilot = useCallback(async () => {
    try {
      const cfg = await aiApi.getAutopilotConfig();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = (cfg && typeof cfg === 'object') ? ((cfg as { data?: unknown } as any).data ?? cfg) : cfg;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mode = (data as any)?.mode as 'off'|'draft'|'auto' | undefined;
      if (mode) setAiMode(mode);
    } catch { /* noop */ }
  }, []);
  
  useEffect(() => { void loadAutopilot(); }, [loadAutopilot]);

  const handleTriageSettingsSaved = () => {
    setShowTriageSettings(false);
    void loadAutopilot(); // Reload to reflect changes
  };

  if (inboxLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a]">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (inboxError) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#0f172a]">
        <div className="text-center space-y-4 max-w-md">
          <p className="text-sm text-slate-500 dark:text-slate-400">{inboxError}</p>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => { void fetchInbox(); }}
            className="h-9 text-xs border-slate-200 dark:border-slate-800 shadow-sm"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#f8fafc] dark:bg-[#0f172a]">
      {/* Header Controls */}
      <div className="border-b border-slate-200 dark:border-slate-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20">
              <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">AI Triage</span>
              <div className="flex items-center gap-2">
                <Badge
                  variant={aiMode === 'auto' ? 'default' : aiMode === 'draft' ? 'secondary' : 'outline'}
                  className={cn(
                    "text-[10px] h-4 px-1.5 border-0 font-medium",
                    aiMode === 'auto'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : aiMode === 'draft'
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  )}
                >
                  {aiMode === 'auto' ? 'Active' : aiMode === 'draft' ? 'Draft Mode' : 'Off'}
                </Badge>
              </div>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
          
          <Dialog open={showTriageSettings} onOpenChange={setShowTriageSettings}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 px-3 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                <Settings className="h-3.5 w-3.5 mr-2" />
                Configure
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-0 shadow-2xl rounded-2xl">
              <AITriageSettings onClose={handleTriageSettingsSaved} />
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 rounded-lg p-1">
            <Badge variant="outline" className="text-[10px] h-6 px-2.5 border-0 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 shadow-sm">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5" />
              Open {derivedStats.open}
            </Badge>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
            <Badge variant="outline" className="text-[10px] h-6 px-2.5 border-0 bg-transparent text-slate-500 dark:text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-1.5" />
              Waiting {derivedStats.waiting}
            </Badge>
            <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1" />
            <Badge variant="outline" className="text-[10px] h-6 px-2.5 border-0 bg-transparent text-slate-500 dark:text-slate-400">
              <div className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-1.5" />
              Snoozed {derivedStats.snoozed}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Left Panel - Conversation List */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/50">
          {/* Team View header */}
          <TeamView />
          <ConversationList
            conversations={inbox}
            stats={derivedStats}
            filters={filters}
            onFiltersChange={(newFilters) => {
              setFilters(prev => ({
                ...prev,
                ...newFilters,
                assignedAgentId: newFilters.assignedAgentId ?? prev.assignedAgentId,
              }));
            }}
            selectedConversationId={selectedConversationId}
            onSelectConversation={handleSelectConversation}
            mode={mode}
            activeChannelTab={activeChannelTab}
            onChannelTabChange={(tab) => {
              setActiveChannelTab(tab);
              // Trigger refetch when tab changes
              setTimeout(() => {
                void fetchInbox();
              }, 0);
            }}
          />
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-slate-100 dark:bg-slate-900 w-1.5 border-l border-r border-slate-200 dark:border-slate-800/50" />

        {/* Middle Panel - Conversation Thread */}
        <ResizablePanel defaultSize={50} minSize={30} className="bg-slate-50/50 dark:bg-slate-900/50">
          {selectedConversationId ? (
            <ConversationThread
              conversationId={selectedConversationId}
              ticketId={selectedTicketId}
              onClose={() => {
                setSelectedConversationId(undefined);
                setSelectedTicketId(undefined);
              }}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8">
              <div className="text-center max-w-md space-y-6">
                <div className="relative w-24 h-24 mx-auto">
                  <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-pulse" />
                  <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/50 dark:to-indigo-950/50 flex items-center justify-center border border-blue-100 dark:border-blue-900">
                    <MessageSquare className="w-10 h-10 text-blue-500 dark:text-blue-400" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{t('selectConversation')}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('selectConversationDescription')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-slate-100 dark:bg-slate-900 w-1.5 border-l border-r border-slate-200 dark:border-slate-800/50" />

        {/* Right Panel - Customer Profile & Collaboration */}
        <ResizablePanel defaultSize={25} minSize={20} maxSize={35} className="bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800/50">
          {selectedConversationId && selectedTicketId ? (
            <div className="h-full flex flex-col bg-white dark:bg-slate-950">
              <Tabs defaultValue="profile" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 rounded-none border-b border-slate-200 dark:border-slate-800/50 h-12 bg-white dark:bg-slate-950 p-0">
                  <TabsTrigger 
                    value="profile" 
                    className="text-xs h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:bg-blue-50/50 dark:data-[state=active]:bg-blue-950/20 transition-all"
                  >
                    <User className="w-3.5 h-3.5 mr-2" />
                    Profile
                  </TabsTrigger>
                  <TabsTrigger 
                    value="collab" 
                    className="text-xs h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-green-500 data-[state=active]:text-green-600 dark:data-[state=active]:text-green-400 data-[state=active]:bg-green-50/50 dark:data-[state=active]:bg-green-950/20 transition-all"
                  >
                    <Users className="w-3.5 h-3.5 mr-2" />
                    Collab
                  </TabsTrigger>
                  <TabsTrigger 
                    value="routing" 
                    className="text-xs h-12 rounded-none border-b-2 border-transparent data-[state=active]:border-purple-500 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 data-[state=active]:bg-purple-50/50 dark:data-[state=active]:bg-purple-950/20 transition-all"
                  >
                    <Zap className="w-3.5 h-3.5 mr-2" />
                    Routing
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="profile" className="flex-1 m-0 overflow-hidden">
                  <CustomerProfile
                    conversationId={selectedConversationId}
                    ticketId={selectedTicketId}
                  />
                </TabsContent>
                <TabsContent value="collab" className="flex-1 m-0 overflow-hidden">
                  <TicketCollabPanel ticketId={selectedTicketId} />
                </TabsContent>
                <TabsContent value="routing" className="flex-1 m-0 overflow-auto p-4">
                  <RoutingSuggestionsPanel
                    ticketId={selectedTicketId}
                    onAssign={async (agentId: string) => {
                      try {
                        await ticketsApi.assign(selectedTicketId, agentId);
                        success(t('ticketAssigned') || 'Ticket assigned successfully');
                        // Refresh inbox to reflect changes
                        void fetchInbox();
                      } catch (error) {
                        toastError(error instanceof Error ? error.message : t('assignmentFailed') || 'Failed to assign ticket');
                        throw error;
                      }
                    }}
                    onAutoAssign={async () => {
                      try {
                        await ticketsApi.autoAssign(selectedTicketId);
                        success(t('ticketAutoAssigned') || 'Ticket auto-assigned successfully');
                        // Refresh inbox to reflect changes
                        void fetchInbox();
                      } catch (error) {
                        toastError(error instanceof Error ? error.message : t('autoAssignmentFailed') || 'Failed to auto-assign ticket');
                        throw error;
                      }
                    }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : selectedConversationId ? (
            <CustomerProfile
              conversationId={selectedConversationId}
              ticketId={selectedTicketId}
            />
          ) : (
            <div className="h-full flex items-center justify-center p-8 bg-slate-50/30 dark:bg-slate-900/30">
              <div className="text-center max-w-xs space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto border border-slate-200 dark:border-slate-700">
                  <User className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {t('customerProfilePlaceholder')}
                </p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}

