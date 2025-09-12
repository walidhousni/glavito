'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ticketsApi } from '@/lib/api/tickets-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { Link } from '@/i18n.config';
import { Ticket, Timer, CheckCircle2, AlertCircle, Plus, Search, MessageSquare, Instagram, Mail, Phone } from 'lucide-react';
import { conversationsApi } from '@/lib/api/conversations-client';
import { useConversationsWebSocket } from '@/lib/hooks/use-conversations-websocket';
import { ConversationPanel } from '@/components/tickets/ConversationPanel';
import { aiApi } from '@/lib/api/ai-client';
import type { AIInsightsDTO } from '@/lib/api/ai-client';
import { Brain } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { analyticsApi } from '@/lib/api/analytics-client';
import { Progress } from '@/components/ui/progress';
import { Customer360Profile } from '@/components/customers/customer-360-profile';
import { TicketDetailsDialog } from '@/components/tickets/ticket-details-dialog';
import { Textarea } from '@/components/ui/textarea';

export default function AgentDashboardPage() {
  const { user } = useAuthStore();
  const agentId = user?.id;
  const tAi = useTranslations('ai');

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [counts, setCounts] = React.useState<{ assigned: number; open: number; waiting: number; resolvedToday: number; urgent: number } | null>(null);

  // Unified Inbox state
  type InboxItem = {
    id: string;
    customerId: string;
    subject?: string;
    status: string;
    priority?: string;
    assignedAgentId?: string;
    channel?: { id: string; name: string; type: string };
    lastMessage?: { content?: string; createdAt?: string; senderType?: string };
    updatedAt?: string;
    messageCount?: number;
    unreadCount?: number;
    aiInsights?: { sentiment?: string; urgencyLevel?: string };
  };
  const [inboxLoading, setInboxLoading] = React.useState(false);
  const [inbox, setInbox] = React.useState<{ conversations: InboxItem[]; total: number; page: number; totalPages: number } | null>(null);
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | undefined>(undefined);
  const [filters, setFilters] = React.useState<{ search: string; status: string; channel: string; page: number }>(() => ({ search: '', status: 'all', channel: 'all', page: 1 }));
  const [aiInsights, setAiInsights] = React.useState<null | { totalAnalyses: number; averageConfidence: number; modelsActive: number }>(null)
  type AutopilotConfig = { mode: 'off'|'draft'|'auto'; minConfidence: number; maxAutoRepliesPerHour: number; allowedChannels?: string[]; guardrails?: Record<string, unknown> }
  const [autopilot, setAutopilot] = React.useState<null | Pick<AutopilotConfig, 'mode'|'minConfidence'|'maxAutoRepliesPerHour'>>(null)
  const [settingsOpen, setSettingsOpen] = React.useState(false)
  const [formMode, setFormMode] = React.useState<'off'|'draft'|'auto'>('off')
  const [formMinConf, setFormMinConf] = React.useState<number>(0.7)
  const [formMaxPerHour, setFormMaxPerHour] = React.useState<number>(10)
  type ChannelKey = 'whatsapp'|'instagram'|'email'|'web'|'voice'
  const [formChannels, setFormChannels] = React.useState<ChannelKey[]>([])
  const [saving, setSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState<string | null>(null)

  // Agent performance analytics
  const tPerf = useTranslations('performance')
  const [perf, setPerf] = React.useState<null | {
    metrics?: {
      ticketsHandled?: number
      averageResponseTime?: number
      averageResolutionTime?: number
      firstContactResolution?: number
      customerSatisfaction?: number
    }
    qualityScore?: number
    teamAverage?: { responseTime?: number; resolutionTime?: number; satisfaction?: number }
  }>(null)
  const [detailsLoading, setDetailsLoading] = React.useState(false)
  type ConversationContextPayload = {
    conversation?: { id: string; customerId?: string; subject?: string; status?: string; priority?: string }
    messages?: Array<{ id: string; content: string; createdAt: string }>
    context?: { customerId?: string; customerProfile?: { name?: string; email?: string; phone?: string } }
  } | null
  const [details, setDetails] = React.useState<ConversationContextPayload>(null)
  const [openCustomer360, setOpenCustomer360] = React.useState(false)
  const [openTicketDetails, setOpenTicketDetails] = React.useState(false)

  // Ticket quick actions state
  type TicketLite = { id: string; status?: string; priority?: string; tags?: string[] }
  const [ticketDetails, setTicketDetails] = React.useState<TicketLite | null>(null)
  const [noteText, setNoteText] = React.useState('')
  const [tagText, setTagText] = React.useState('')
  const [updatingStatus, setUpdatingStatus] = React.useState(false)
  const [updatingPriority, setUpdatingPriority] = React.useState(false)
  const [assigning, setAssigning] = React.useState(false)
  const [tagSaving, setTagSaving] = React.useState(false)
  const [noteSaving, setNoteSaving] = React.useState(false)
  const [snoozeUntil, setSnoozeUntil] = React.useState('')
  const [snoozeReason, setSnoozeReason] = React.useState('')
  const [snoozing, setSnoozing] = React.useState(false)

  // Helper to normalize list responses without using any
  const countFromList = React.useCallback((res: unknown): number => {
    if (Array.isArray(res)) return res.length
    if (res && typeof res === 'object' && 'total' in (res as Record<string, unknown>)) {
      const total = (res as { total?: number }).total
      return typeof total === 'number' ? total : 0
    }
    return 0
  }, [])
  const loadInbox = React.useCallback(async () => {
    setInboxLoading(true);
    try {
      const res = await conversationsApi.getUnifiedInbox({
        page: filters.page,
        limit: 20,
        status: filters.status !== 'all' ? filters.status : undefined,
        channel: filters.channel !== 'all' ? filters.channel : undefined,
        search: filters.search || undefined,
        // Optionally scope by agent: assignedTo: agentId,
      } as const);
      type Pagination = { page: number; total: number; totalPages: number };
      type InboxResponse = { conversations?: InboxItem[]; pagination?: Pagination };
      type ApiEnvelope = { success?: boolean; data?: InboxResponse };
      const data = res as unknown as InboxResponse | ApiEnvelope;
      const payload: InboxResponse = (data as ApiEnvelope).data ?? (data as InboxResponse);
      const conversations: InboxItem[] = Array.isArray(payload?.conversations) ? payload.conversations as InboxItem[] : [];
      const pagination: Pagination = payload?.pagination ?? { page: filters.page, total: conversations.length, totalPages: 1 };
      setInbox({ conversations, total: Number(pagination.total || conversations.length), page: Number(pagination.page || filters.page), totalPages: Number(pagination.totalPages || 1) });
      // Auto-select first conversation if none selected
      if (!selectedConversationId && conversations[0]?.id) setSelectedConversationId(conversations[0].id);
    } catch {
      // ignore
    } finally {
      setInboxLoading(false);
    }
  }, [filters.page, filters.status, filters.channel, filters.search, selectedConversationId]);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        // Compute basic agent metrics using existing endpoints
        const [assigned, open, waiting, urgent, resolvedToday] = await Promise.all([
          ticketsApi.list({ assignedAgentId: agentId, status: undefined, limit: 1, page: 1 }).then(countFromList).catch(() => 0),
          ticketsApi.list({ assignedAgentId: agentId, status: ['open', 'in_progress'], limit: 1, page: 1 }).then(countFromList).catch(() => 0),
          ticketsApi.list({ assignedAgentId: agentId, status: ['waiting'], limit: 1, page: 1 }).then(countFromList).catch(() => 0),
          ticketsApi.list({ assignedAgentId: agentId, priority: ['urgent', 'high'], limit: 1, page: 1 }).then(countFromList).catch(() => 0),
          ticketsApi.list({ assignedAgentId: agentId, status: ['resolved'], dateFrom: new Date(Date.now() - 24*60*60*1000).toISOString(), limit: 1, page: 1 }).then(countFromList).catch(() => 0),
        ]);
        if (!mounted) return;
        setCounts({ assigned, open, waiting, resolvedToday, urgent });
        // Load agent performance (soft-fail)
        analyticsApi.getAgentPerformance(agentId as string | undefined, '30d').then((p) => {
          if (p) setPerf(p as typeof perf)
        }).catch(() => undefined)
        // Load AI insights (soft-fail)
        aiApi.insights().then((i: AIInsightsDTO | undefined) => {
          if (i) setAiInsights({ totalAnalyses: Number(i.totalAnalyses ?? 0), averageConfidence: Number(i.averageConfidence ?? 0), modelsActive: Number(i.modelsActive ?? 0) })
        }).catch(() => undefined)
        // Load Autopilot config (soft-fail)
        aiApi.getAutopilotConfig().then((cfg: AutopilotConfig | undefined) => {
          if (cfg) setAutopilot({ mode: cfg.mode || 'off', minConfidence: Number(cfg.minConfidence ?? 0.7), maxAutoRepliesPerHour: Number(cfg.maxAutoRepliesPerHour ?? 10) })
        }).catch(() => undefined)
      } catch {
        if (!mounted) return;
        setError('Failed to load agent dashboard');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [agentId, countFromList]);

  // Load inbox on filters change
  React.useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Load detailed context for the selected conversation (customer + context)
  React.useEffect(() => {
    let cancelled = false
    async function run() {
      if (!selectedConversationId) { setDetails(null); return }
      try {
        setDetailsLoading(true)
        const ctx = await conversationsApi.getContextAdvanced(selectedConversationId)
        const payload = (ctx as { data?: ConversationContextPayload } | ConversationContextPayload)
        const normalized = (payload && typeof payload === 'object' && payload !== null && 'data' in (payload as Record<string, unknown>))
          ? (payload as { data?: ConversationContextPayload }).data
          : (payload as ConversationContextPayload)
        if (!cancelled) setDetails(normalized || null)
      } catch {
        if (!cancelled) setDetails(null)
      } finally {
        if (!cancelled) setDetailsLoading(false)
      }
    }
    void run()
    return () => { cancelled = true }
  }, [selectedConversationId])

  // Load ticket summary for quick actions when selection changes
  React.useEffect(() => {
    let cancelled = false
    async function run() {
      const selected = inbox?.conversations.find(c => c.id === selectedConversationId)
      const ticketId = (selected as { ticketId?: string } | undefined)?.ticketId
      if (!ticketId) { setTicketDetails(null); return }
      try {
        const t = await ticketsApi.get(ticketId)
        if (!cancelled && t) setTicketDetails({
          id: t.id,
          status: (t as { status?: string }).status,
          priority: (t as { priority?: string }).priority,
          tags: (t as { tags?: string[] }).tags,
          ...(t as { slaInstance?: { firstResponseDue?: string; firstResponseAt?: string | null; resolutionDue?: string; resolutionAt?: string | null; status?: string } }).slaInstance
            ? { sla: (t as { slaInstance?: { firstResponseDue?: string; firstResponseAt?: string | null; resolutionDue?: string; resolutionAt?: string | null; status?: string } }).slaInstance }
            : {}
        } as TicketLite & { sla?: { firstResponseDue?: string; firstResponseAt?: string | null; resolutionDue?: string; resolutionAt?: string | null; status?: string } })
      } catch {
        if (!cancelled) setTicketDetails({ id: ticketId })
      }
    }
    void run()
    return () => { cancelled = true }
  }, [inbox, selectedConversationId])

  // Quick action handlers
  const handleStatusChange = async (value: string) => {
    const t = ticketDetails; if (!t?.id) return
    try {
      setUpdatingStatus(true)
      await ticketsApi.update(t.id, { status: value })
      setTicketDetails({ ...t, status: value })
      void loadInbox()
    } finally { setUpdatingStatus(false) }
  }

  const handlePriorityChange = async (value: string) => {
    const t = ticketDetails; if (!t?.id) return
    try {
      setUpdatingPriority(true)
      await ticketsApi.update(t.id, { priority: value })
      setTicketDetails({ ...t, priority: value })
      void loadInbox()
    } finally { setUpdatingPriority(false) }
  }

  const handleAssignToMe = async () => {
    const t = ticketDetails; if (!t?.id || !user?.id) return
    try {
      setAssigning(true)
      await ticketsApi.assign(t.id, user.id)
      void loadInbox()
    } finally { setAssigning(false) }
  }

  const handleAutoAssign = async () => {
    const t = ticketDetails; if (!t?.id) return
    try {
      setAssigning(true)
      await ticketsApi.autoAssign(t.id)
      void loadInbox()
    } finally { setAssigning(false) }
  }

  const handleUnassign = async () => {
    const t = ticketDetails; if (!t?.id) return
    try {
      setAssigning(true)
      await ticketsApi.update(t.id, { assignedAgentId: null })
      void loadInbox()
    } finally { setAssigning(false) }
  }

  const handleAddTag = async () => {
    const t = ticketDetails; if (!t?.id || !user?.tenantId) return
    const tag = (tagText || '').trim(); if (!tag) return
    try {
      setTagSaving(true)
      await ticketsApi.updateTags(t.id, { add: [tag], tenantId: user.tenantId })
      setTicketDetails({ ...t, tags: Array.from(new Set([...(t.tags || []), tag])) })
      setTagText('')
      void loadInbox()
    } finally { setTagSaving(false) }
  }

  const handleRemoveTag = async (tag: string) => {
    const t = ticketDetails; if (!t?.id || !user?.tenantId) return
    try {
      setTagSaving(true)
      await ticketsApi.updateTags(t.id, { remove: [tag], tenantId: user.tenantId })
      setTicketDetails({ ...t, tags: (t.tags || []).filter(x => x !== tag) })
      void loadInbox()
    } finally { setTagSaving(false) }
  }

  const handleAddNote = async () => {
    const t = ticketDetails; if (!t?.id || !user?.tenantId || !user?.id) return
    const content = noteText.trim(); if (!content) return
    try {
      setNoteSaving(true)
      await ticketsApi.addNote(t.id, { content, userId: user.id, tenantId: user.tenantId, isPrivate: true })
      setNoteText('')
    } finally { setNoteSaving(false) }
  }

  const handleResolve = async () => {
    const t = ticketDetails; if (!t?.id) return
    await ticketsApi.resolve(t.id)
    setTicketDetails({ ...t, status: 'resolved' })
    void loadInbox()
  }

  const handleReopen = async () => {
    const t = ticketDetails; if (!t?.id) return
    await ticketsApi.reopen(t.id)
    setTicketDetails({ ...t, status: 'open' })
    void loadInbox()
  }

  const handleSnooze = async () => {
    const t = ticketDetails; if (!t?.id) return
    const until = snoozeUntil
    try {
      setSnoozing(true)
      if (!until) return
      await ticketsApi.snooze(t.id, { until, reason: snoozeReason || undefined })
      setSnoozeUntil('')
      setSnoozeReason('')
      void loadInbox()
    } finally {
      setSnoozing(false)
    }
  }

  // WS refresh on conversation/message events
  useConversationsWebSocket({
    autoConnect: true,
    onEvent: (payload) => {
      if (!payload) return;
      const evt = String(payload.event || '');
      if (evt.startsWith('conversation.') || evt === 'message.created') {
        // light refresh
        loadInbox();
      }
    }
  });

  return (
    <div className="min-h-screen gradient-bg-primary p-8 space-y-8">
      {/* AI Insights Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="premium-card gradient-bg-primary lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div className="flex items-center gap-3">
              <div className="metric-icon bg-gradient-to-br from-purple-500 to-indigo-600"><Brain className="h-6 w-6 text-white" /></div>
              <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{tAi('autopilot.title')}</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {autopilot && (
                <Badge variant="outline" className={`rounded-xl ${autopilot.mode === 'auto' ? 'border-emerald-300 text-emerald-700' : autopilot.mode === 'draft' ? 'border-amber-300 text-amber-700' : 'border-slate-300 text-slate-600'}`}>
                  {tAi('autopilot.mode')}: {autopilot.mode.toUpperCase()} • {tAi('autopilot.minConfidence')} {Math.round((autopilot.minConfidence||0)*100)}%
                </Badge>
              )}
              <Button variant="outline" className="rounded-xl" onClick={async () => {
                setSettingsOpen(true)
                try {
                  const cfg = await aiApi.getAutopilotConfig()
                  setFormMode((cfg?.mode as 'off'|'draft'|'auto') || 'off')
                  setFormMinConf(Number(cfg?.minConfidence ?? 0.7))
                  setFormMaxPerHour(Number(cfg?.maxAutoRepliesPerHour ?? 10))
                  const allowed = Array.isArray(cfg?.allowedChannels) ? (cfg.allowedChannels as string[]) : []
                  const filtered = (allowed || []).filter((c) => ['whatsapp','instagram','email','web','voice'].includes(c)) as ChannelKey[]
                  setFormChannels(filtered)
                } catch { /* ignore */ }
              }}>
                {tAi('autopilot.settings') || 'Settings'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/60">
                <div className="text-2xl font-bold text-purple-700">{aiInsights ? aiInsights.totalAnalyses : '—'}</div>
                <div className="text-xs text-purple-700 font-medium">{tAi('metrics.totalAnalyses')}</div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200/60">
                <div className="text-2xl font-bold text-emerald-700">{aiInsights ? Math.round((aiInsights.averageConfidence||0)*100)+'%' : '—'}</div>
                <div className="text-xs text-emerald-700 font-medium">{tAi('metrics.avgConfidence')}</div>
              </div>
              <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200/60">
                <div className="text-2xl font-bold text-blue-700">{aiInsights ? aiInsights.modelsActive : '—'}</div>
                <div className="text-xs text-blue-700 font-medium">{tAi('metrics.modelsActive')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Autopilot Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{tAi('autopilot.dialogTitle') || 'Autopilot Settings'}</DialogTitle>
            <DialogDescription>
              {tAi('autopilot.dialogDesc') || 'Configure AI autopilot behavior for conversations.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Mode */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{tAi('autopilot.modeLabel') || 'Mode'}</label>
              <select className="h-9 w-full rounded-xl border border-slate-200/60 bg-white/80 px-3 text-sm" value={formMode}
                onChange={(e) => setFormMode(e.target.value as 'off'|'draft'|'auto')}>
                <option value="off">{tAi('autopilot.off') || 'Off'}</option>
                <option value="draft">{tAi('autopilot.draft') || 'Draft (agent approves)'}</option>
                <option value="auto">{tAi('autopilot.auto') || 'Auto-send'}</option>
              </select>
            </div>
            {/* Min confidence */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{tAi('autopilot.minConfidenceLabel') || 'Minimum confidence'}</label>
              <div className="flex items-center gap-3">
                <Input type="number" min={0} max={1} step={0.01} value={Number.isFinite(formMinConf) ? formMinConf : 0.7} onChange={(e) => setFormMinConf(Math.max(0, Math.min(1, Number(e.target.value))))} className="w-32" />
                <span className="text-sm text-slate-600">{Math.round((formMinConf||0)*100)}%</span>
              </div>
            </div>
            {/* Max per hour */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{tAi('autopilot.maxRepliesLabel') || 'Max auto replies per hour'}</label>
              <Input type="number" min={0} max={120} step={1} value={Number.isFinite(formMaxPerHour) ? formMaxPerHour : 10} onChange={(e) => setFormMaxPerHour(Math.max(0, Math.min(120, Number(e.target.value))))} className="w-40" />
            </div>
            {/* Allowed channels */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{tAi('autopilot.allowedChannelsLabel') || 'Allowed channels'}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['whatsapp','instagram','email','web','voice'] as ChannelKey[]).map((ch) => (
                  <label key={ch} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={formChannels.includes(ch)} onCheckedChange={(v) => {
                      const on = v === true
                      setFormChannels((prev) => on ? Array.from(new Set(prev.concat(ch))) : prev.filter((c) => c !== ch))
                    }} />
                    <span className="capitalize">{tAi(`autopilot.channels.${ch}`) || ch}</span>
                  </label>
                ))}
              </div>
            </div>
            {saveError && <div className="text-sm text-red-600">{saveError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setSettingsOpen(false)}>{tAi('autopilot.close') || 'Close'}</Button>
            <Button className="rounded-xl" disabled={saving} onClick={async () => {
              try {
                setSaving(true)
                setSaveError(null)
                await aiApi.setAutopilotConfig({ mode: formMode, minConfidence: formMinConf, maxAutoRepliesPerHour: formMaxPerHour, allowedChannels: formChannels })
                setAutopilot({ mode: formMode, minConfidence: formMinConf, maxAutoRepliesPerHour: formMaxPerHour })
                setSettingsOpen(false)
              } catch {
                setSaveError(tAi('autopilot.error') || 'Failed to save settings')
              } finally {
                setSaving(false)
              }
            }}>{saving ? (tAi('autopilot.saving') || 'Saving...') : (tAi('autopilot.save') || 'Save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">My Agent Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Overview of your assigned work and priorities</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input className="pl-10 w-full sm:w-80 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm" placeholder="Search my tickets..." />
          </div>
          <Link href="/dashboard/tickets">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              New Ticket
            </Button>
          </Link>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="metric-card gradient-bg-secondary relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
              <div>
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Assigned to Me</CardTitle>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{loading ? '—' : (counts?.assigned ?? 0)}</div>
              </div>
              <div className="metric-icon bg-gradient-to-br from-blue-500 to-blue-600"><Ticket className="h-6 w-6 text-white" /></div>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="metric-card gradient-bg-secondary relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
              <div>
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Waiting on Customer</CardTitle>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{loading ? '—' : (counts?.waiting ?? 0)}</div>
              </div>
              <div className="metric-icon bg-gradient-to-br from-amber-500 to-orange-600"><Timer className="h-6 w-6 text-white" /></div>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="metric-card gradient-bg-secondary relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
              <div>
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Resolved Today</CardTitle>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{loading ? '—' : (counts?.resolvedToday ?? 0)}</div>
              </div>
              <div className="metric-icon bg-gradient-to-br from-emerald-500 to-green-600"><CheckCircle2 className="h-6 w-6 text-white" /></div>
            </CardHeader>
          </Card>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="metric-card gradient-bg-secondary relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-rose-500/5" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 relative">
              <div>
                <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Urgent</CardTitle>
                <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{loading ? '—' : (counts?.urgent ?? 0)}</div>
              </div>
              <div className="metric-icon bg-gradient-to-br from-red-500 to-rose-600"><AlertCircle className="h-6 w-6 text-white" /></div>
            </CardHeader>
          </Card>
        </motion.div>
      </div>

      {/* My Performance (agent-focused analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="premium-card gradient-bg-secondary lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{tPerf('performanceOverview') || 'Performance Overview'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-xs text-slate-500 mb-1">{tPerf('ticketsResolved')}</div>
              <div className="text-2xl font-semibold">{perf?.metrics?.ticketsHandled ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">{tPerf('responseTime')}</div>
              <div className="text-sm">{perf?.metrics?.averageResponseTime ? Math.round((perf.metrics.averageResponseTime/60))+' min' : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">{tPerf('satisfaction')}</div>
              <div className="text-sm">{perf?.metrics?.customerSatisfaction ? perf.metrics.customerSatisfaction.toFixed(2)+' / 5' : '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-2">Quality Score</div>
              <Progress value={Math.max(0, Math.min(100, Number(perf?.qualityScore ?? 0)))} />
            </div>
          </CardContent>
        </Card>
        <Card className="premium-card gradient-bg-secondary lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">{tPerf('recentTrends') || 'Recent Trends'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60">
                <div className="text-xs text-slate-500 mb-1">{tPerf('responseTrend')}</div>
                <div className="text-sm">{perf?.teamAverage?.responseTime ? Math.round((perf.teamAverage.responseTime/60))+' min (team avg)' : '—'}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60">
                <div className="text-xs text-slate-500 mb-1">{tPerf('satisfactionTrend')}</div>
                <div className="text-sm">{perf?.teamAverage?.satisfaction ? perf.teamAverage.satisfaction.toFixed(2)+' / 5 (team avg)' : '—'}</div>
              </div>
              <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60">
                <div className="text-xs text-slate-500 mb-1">{tPerf('dailyTicketVolume')}</div>
                <div className="text-sm">{counts?.resolvedToday ?? '—'} {tPerf('thisWeek')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="p-4 bg-red-50/80 dark:bg-red-950/20 backdrop-blur-sm border border-red-200/60 dark:border-red-800/60 rounded-xl shadow-lg">
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      {/* Unified Omnichannel Inbox */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: List and Filters */}
        <Card className="premium-card gradient-bg-primary lg:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span>Unified Inbox</span>
              <Badge variant="outline" className="rounded-xl">{inbox?.total ?? 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9 bg-white/80 dark:bg-slate-800/80"
                  placeholder="Search conversations..."
                  value={filters.search}
                  onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
                />
              </div>
              <Button variant="outline" onClick={() => loadInbox()} className="rounded-xl">Refresh</Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="h-9 rounded-xl border border-slate-200/60 bg-white/80 px-3 text-sm"
                value={filters.status}
                onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="waiting">Waiting</option>
                <option value="closed">Closed</option>
              </select>
              <select
                className="h-9 rounded-xl border border-slate-200/60 bg-white/80 px-3 text-sm"
                value={filters.channel}
                onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value, page: 1 }))}
              >
                <option value="all">All Channels</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="email">Email</option>
                <option value="web">Web</option>
                <option value="voice">Voice</option>
              </select>
            </div>

            <div className="divide-y divide-slate-200/60 rounded-xl overflow-hidden border border-slate-200/60 bg-white/70">
              {inboxLoading && (
                <div className="p-4 text-sm text-slate-500">Loading…</div>
              )}
              {!inboxLoading && (inbox?.conversations?.length ?? 0) === 0 && (
                <div className="p-6 text-sm text-slate-500">No conversations</div>
              )}
              {!inboxLoading && (inbox?.conversations || []).map((c) => (
                <button
                  key={c.id}
                  className={`w-full text-left p-4 hover:bg-slate-50 transition ${selectedConversationId === c.id ? 'bg-blue-50/70' : ''}`}
                  onClick={() => setSelectedConversationId(c.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg"
                      style={{ background: c.channel?.type === 'whatsapp' ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                        : c.channel?.type === 'instagram' ? 'linear-gradient(135deg,#ec4899,#8b5cf6)'
                        : c.channel?.type === 'email' ? 'linear-gradient(135deg,#3b82f6,#1d4ed8)'
                        : 'linear-gradient(135deg,#64748b,#475569)'
                      }}
                    >
                      {c.channel?.type === 'whatsapp' && <MessageSquare className="h-5 w-5" />}
                      {c.channel?.type === 'instagram' && <Instagram className="h-5 w-5" />}
                      {c.channel?.type === 'email' && <Mail className="h-5 w-5" />}
                      {c.channel?.type === 'voice' && <Phone className="h-5 w-5" />}
                      {!c.channel?.type && <MessageSquare className="h-5 w-5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-slate-800 truncate">{c.subject || 'No Subject'}</div>
                        <div className="text-[11px] text-slate-500 whitespace-nowrap">{c.updatedAt ? new Date(c.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </div>
                      <div className="text-xs text-slate-600 truncate mt-1">{c.lastMessage?.content || '—'}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant="outline" className="rounded-lg text-[10px]">{(c.status || 'active').replace(/_/g,' ')}</Badge>
                        {c.priority && <Badge variant="outline" className="rounded-lg text-[10px]">{c.priority}</Badge>}
                        {c.aiInsights?.urgencyLevel && (
                          <Badge className="rounded-lg text-[10px] bg-amber-100 text-amber-700 border border-amber-200/60">{String(c.aiInsights.urgencyLevel)}</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {inbox && inbox.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2 text-sm">
                <Button variant="outline" className="rounded-xl" disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: Math.max(1, f.page - 1) }))}>Prev</Button>
                <div className="text-slate-600">Page {inbox.page} / {inbox.totalPages}</div>
                <Button variant="outline" className="rounded-xl" disabled={filters.page >= (inbox.totalPages || 1)}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}>Next</Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Middle: Conversation */}
        <Card className="premium-card gradient-bg-primary lg:col-span-2">
          <CardContent className="p-0">
            {selectedConversationId ? (
              <ConversationPanel conversationId={selectedConversationId} />
            ) : (
              <div className="p-10 text-center text-slate-500">Select a conversation to view</div>
            )}
          </CardContent>
        </Card>

        {/* Right: Customer & Ticket Details */}
        <Card className="premium-card gradient-bg-secondary lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-slate-600 dark:text-slate-400">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(() => {
              const selected = inbox?.conversations.find(c => c.id === selectedConversationId)
              const ticketId = (selected as { ticketId?: string } | undefined)?.ticketId
              const customerId = selected?.customerId || details?.conversation?.customerId || details?.context?.customerId
              const customer = details?.context?.customerProfile
              return (
                <div className="space-y-4">
                  {/* Customer summary */}
                  <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60">
                    <div className="text-xs text-slate-500 mb-1">Customer</div>
                    {detailsLoading ? (
                      <div className="text-sm text-slate-500">Loading…</div>
                    ) : customerId ? (
                      <div className="space-y-1">
                        <div className="font-semibold text-slate-800">{customer?.name || '—'}</div>
                        <div className="text-xs text-slate-600">{customer?.email || '—'}</div>
                        <div className="text-xs text-slate-600">{customer?.phone || '—'}</div>
                        <div className="pt-2 flex gap-2">
                          <Button variant="outline" className="rounded-xl" onClick={() => setOpenCustomer360(true)}>Open 360</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500">No customer</div>
                    )}
                  </div>
                  {/* Ticket summary + quick actions */}
                  <div className="p-3 rounded-xl bg-white/70 border border-slate-200/60 space-y-3">
                    <div className="text-xs text-slate-500">Ticket</div>
                    {ticketId ? (
                      <>
                        <div className="space-y-1">
                          <div className="font-semibold text-slate-800 truncate">{selected?.subject || '—'}</div>
                          <div className="text-xs text-slate-600 flex gap-2">
                            <Badge variant="outline" className="rounded-lg text-[10px]">{(selected?.status || 'active').replace(/_/g,' ')}</Badge>
                            {selected?.priority && <Badge variant="outline" className="rounded-lg text-[10px]">{selected.priority}</Badge>}
                          </div>
                        </div>
                        {/* Quick assignment */}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="rounded-xl" disabled={assigning} onClick={handleAssignToMe}>Assign to me</Button>
                          <Button variant="outline" className="rounded-xl" disabled={assigning} onClick={handleAutoAssign}>Auto-assign</Button>
                          <Button variant="outline" className="rounded-xl" disabled={assigning} onClick={handleUnassign}>Unassign</Button>
                          <Button className="rounded-xl" onClick={() => setOpenTicketDetails(true)}>Open Details</Button>
                        </div>
                        {/* Status & Priority */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600">Status</label>
                            <select className="h-9 w-full rounded-xl border border-slate-200/60 bg-white/80 px-2 text-sm" value={ticketDetails?.status || ''} disabled={updatingStatus}
                              onChange={(e) => handleStatusChange(e.target.value)}>
                              <option value="">—</option>
                              <option value="open">Open</option>
                              <option value="in_progress">In Progress</option>
                              <option value="waiting">Waiting</option>
                              <option value="pending">Pending</option>
                              <option value="resolved">Resolved</option>
                              <option value="closed">Closed</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-600">Priority</label>
                            <select className="h-9 w-full rounded-xl border border-slate-200/60 bg-white/80 px-2 text-sm" value={ticketDetails?.priority || ''} disabled={updatingPriority}
                              onChange={(e) => handlePriorityChange(e.target.value)}>
                              <option value="">—</option>
                              <option value="low">Low</option>
                              <option value="medium">Medium</option>
                              <option value="high">High</option>
                              <option value="urgent">Urgent</option>
                              <option value="critical">Critical</option>
                            </select>
                          </div>
                        </div>
                        {/* SLA Info */}
                        {ticketDetails && (ticketDetails as unknown as { sla?: { firstResponseDue?: string; resolutionDue?: string } }).sla && (
                          <div className="rounded-xl bg-white/70 border border-slate-200/60 p-2 text-xs text-slate-600 space-y-1">
                            <div className="font-medium text-slate-700">SLA</div>
                            <div>First response due: {(ticketDetails as unknown as { sla?: { firstResponseDue?: string } }).sla?.firstResponseDue ? new Date(((ticketDetails as unknown as { sla?: { firstResponseDue?: string } }).sla?.firstResponseDue) as string).toLocaleString() : '—'}</div>
                            <div>Resolution due: {(ticketDetails as unknown as { sla?: { resolutionDue?: string } }).sla?.resolutionDue ? new Date(((ticketDetails as unknown as { sla?: { resolutionDue?: string } }).sla?.resolutionDue) as string).toLocaleString() : '—'}</div>
                          </div>
                        )}
                        {/* Resolve/Reopen */}
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" className="rounded-xl" onClick={handleResolve} disabled={ticketDetails?.status === 'resolved'}>Resolve</Button>
                          <Button variant="outline" className="rounded-xl" onClick={handleReopen} disabled={ticketDetails?.status !== 'resolved'}>Reopen</Button>
                        </div>
                        {/* Snooze */}
                        <div className="space-y-2">
                          <label className="text-xs text-slate-600">Snooze until</label>
                          <div className="flex items-center gap-2">
                            <Input type="datetime-local" value={snoozeUntil} onChange={(e) => setSnoozeUntil(e.target.value)} />
                            <Input placeholder="Reason (optional)" value={snoozeReason} onChange={(e) => setSnoozeReason(e.target.value)} />
                            <Button variant="outline" className="rounded-xl" disabled={snoozing || !snoozeUntil} onClick={handleSnooze}>Snooze</Button>
                          </div>
                        </div>
                        {/* Tags */}
                        <div className="space-y-2">
                          <label className="text-xs text-slate-600">Tags</label>
                          <div className="flex flex-wrap gap-2">
                            {(ticketDetails?.tags || []).map((tag) => (
                              <button key={tag} className="text-xs px-2 py-1 rounded-lg border border-slate-200/60 bg-white/80 hover:bg-slate-50"
                                onClick={() => handleRemoveTag(tag)} title="Remove tag">
                                {tag} ✕
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input placeholder="Add tag" value={tagText} onChange={(e) => setTagText(e.target.value)} className="flex-1" />
                            <Button variant="outline" className="rounded-xl" disabled={tagSaving || !tagText.trim()} onClick={handleAddTag}>Add</Button>
                          </div>
                        </div>
                        {/* Private note */}
                        <div className="space-y-2">
                          <label className="text-xs text-slate-600">Private note</label>
                          <Textarea rows={3} placeholder="Add an internal note" value={noteText} onChange={(e) => setNoteText(e.target.value)} />
                          <div className="flex justify-end">
                            <Button variant="outline" className="rounded-xl" disabled={noteSaving || !noteText.trim()} onClick={handleAddNote}>Add Note</Button>
                          </div>
                        </div>
                        {/* Watch ticket */}
                        <div>
                          <Button variant="outline" className="rounded-xl" onClick={async () => { try { if (!ticketId) return; await ticketsApi.addWatcher(ticketId); } catch { /* noop */ } }}>Watch</Button>
                        </div>
                      </>
                    ) : (
                      <div className="text-sm text-slate-500">No linked ticket</div>
                    )}
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Slide-in modals */}
      {(() => {
        const selected = inbox?.conversations.find(c => c.id === selectedConversationId)
        const ticketId = (selected as { ticketId?: string } | undefined)?.ticketId
        const customerId = selected?.customerId || details?.conversation?.customerId || details?.context?.customerId
        return (
          <>
            {customerId && (
              <Customer360Profile customerId={customerId} open={openCustomer360} onOpenChange={setOpenCustomer360} />
            )}
            {ticketId && (
              <TicketDetailsDialog ticketId={ticketId} open={openTicketDetails} onOpenChange={setOpenTicketDetails} />
            )}
          </>
        )
      })()}
    </div>
  );
}


