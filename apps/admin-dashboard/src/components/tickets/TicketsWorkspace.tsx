'use client';

import React from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { TicketsView } from './tickets-view';
import { knowledgeApi } from '@/lib/api/knowledge-client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Settings,
  AlertTriangle,
  Clock,
  MessageSquare,
  Brain,
  Filter,
  Plus,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
  Star,
  BookOpen,
  HelpCircle,
  Lightbulb
} from 'lucide-react';
import { ConversationPanel } from './ConversationPanel';
import { conversationsApi } from '@/lib/api/conversations-client';

type KBItem = { id: string; title?: string; question?: string; snippet?: string; answer?: string; updatedAt?: string };

export function TicketsWorkspace({ openTicketId }: { openTicketId?: string } = {}) {
  const search = useSearchParams();
  const router = useRouter();
  const openNew = (search?.get('new') || '').toLowerCase() === 'true';
  const [kbQuery, setKbQuery] = React.useState('');
  const [kbLoading, setKbLoading] = React.useState(false);
  const [kbArticles, setKbArticles] = React.useState<KBItem[]>([]);
  const [kbFaqs, setKbFaqs] = React.useState<KBItem[]>([]);
  const [selectedConversationId, setSelectedConversationId] = React.useState<string | undefined>(undefined);
  const [selectedTicketId, setSelectedTicketId] = React.useState<string | undefined>(undefined);
  const [selectedChannel, setSelectedChannel] = React.useState<{ type?: string; name?: string } | undefined>(undefined);

  const runKbSearch = React.useCallback(async () => {
    if (!kbQuery.trim()) {
      setKbArticles([]);
      setKbFaqs([]);
      return;
    }

    setKbLoading(true);
    try {
      const res = await knowledgeApi.search(kbQuery, 8, { semantic: true });
      console.log('kb search results', res);
      setKbArticles(Array.isArray(res.articles) ? (res.articles as unknown as KBItem[]) : []);
      setKbFaqs(Array.isArray(res.faqs) ? (res.faqs as unknown as KBItem[]) : []);
    } catch {
      setKbArticles([]);
      setKbFaqs([]);
    } finally {
      setKbLoading(false);
    }
  }, [kbQuery]);

  React.useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (kbQuery.trim()) {
        runKbSearch();
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [kbQuery, runKbSearch]);

  // Open specific ticket from URL param or prop
  React.useEffect(() => {
    const id = openTicketId || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('ticket') || undefined : undefined);
    if (!id) return;
    (async () => {
      try {
        const list = await conversationsApi.list({ ticketId: id, limit: 1 });
        const conv = Array.isArray(list)
          ? (list[0] as { id?: string; channel?: { type?: string; name?: string } })
          : ((list as unknown) as { items?: Array<{ id?: string; channel?: { type?: string; name?: string } }> })?.items?.[0];
        const convId = conv?.id as string | undefined;
        setSelectedConversationId(convId || undefined);
        setSelectedTicketId(id);
        setSelectedChannel(conv?.channel || undefined);
        if (!convId) {
          try {
            const { ticketsApi } = await import('@/lib/api/tickets-client');
            const t = await ticketsApi.get(id as string);
            const ch = t?.channel ? { type: t.channel.type as string | undefined, name: t.channel.name as string | undefined } : undefined;
            if (ch) setSelectedChannel(ch);
          } catch { /* noop */ }
        }
      } catch {
        setSelectedConversationId(undefined);
        setSelectedTicketId(id);
        try {
          const { ticketsApi } = await import('@/lib/api/tickets-client');
          const t = await ticketsApi.get(id as string);
          const ch = t?.channel ? { type: t.channel.type as string | undefined, name: t.channel.name as string | undefined } : undefined;
          setSelectedChannel(ch);
        } catch { setSelectedChannel(undefined); }
      }
    })();
  }, [openTicketId]);

  return (
    <div className="h-[calc(100vh-80px)] flex bg-gradient-to-br from-slate-50/50 via-white to-blue-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 overflow-hidden">
      {/* Left Sidebar: Tickets */}
      <div className="w-96 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 flex flex-col shadow-2xl">
        {/* Enhanced Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-white via-slate-50/30 to-white dark:from-slate-900 dark:via-slate-800/30 dark:to-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  Support Tickets
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage customer conversations</p>
              </div>
            </div>
            <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all rounded-xl" onClick={() => {
              try {
                const url = new URL(window.location.href)
                url.searchParams.set('new', 'true')
                router.push(url.pathname + url.search)
              } catch {
                // no-op
              }
            }}>
              <Plus className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>

          {/* Enhanced Stats */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <SlaBadges />
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200/60 dark:border-blue-800/60">
              <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <div className="text-xs">
                <div className="font-semibold text-blue-700 dark:text-blue-300">+12%</div>
                <div className="text-blue-600 dark:text-blue-400">This week</div>
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border border-emerald-200/60 dark:border-emerald-800/60">
              <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <div className="text-xs">
                <div className="font-semibold text-emerald-700 dark:text-emerald-300">24</div>
                <div className="text-emerald-600 dark:text-emerald-400">Active</div>
              </div>
            </div>
          </div>

          {/* Enhanced Search */}
          <div className="relative group">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 dark:group-focus-within:text-blue-400 transition-colors" />
            <Input
              placeholder="Search tickets, customers, or content..."
              className="pl-11 pr-12 bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 rounded-xl h-12 text-sm focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 focus:border-blue-400 dark:focus:border-blue-500 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 dark:hover:bg-slate-800/90 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
            <Button
              size="sm"
              variant="ghost"
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
            >
              <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </Button>
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/40 cursor-pointer transition-colors rounded-lg">
              <Zap className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
            <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/40 cursor-pointer transition-colors rounded-lg">
              Unassigned
            </Badge>
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/40 cursor-pointer transition-colors rounded-lg">
              My tickets
            </Badge>
          </div>
        </div>

        {/* Ticket List */}
        <div className="flex-1 overflow-y-auto">
          <TicketsView
            mode="admin"
            compact
            openCreate={openNew}
            onSelectTicket={async (ticketId) => {
              try {
                const list = await conversationsApi.list({ ticketId, limit: 1 });
                const conv = Array.isArray(list) ? (list[0] as { id?: string; channel?: { type?: string; name?: string } }) : list?.items?.[0];
                const convId = conv?.id as string | undefined;
                setSelectedConversationId(convId || undefined);
                setSelectedTicketId(ticketId);
                setSelectedChannel(conv?.channel || undefined);

                if (!convId) {
                  try {
                    const { ticketsApi } = await import('@/lib/api/tickets-client');
                    const t = await ticketsApi.get(ticketId as string);
                    const ch = t?.channel ? { type: t.channel.type as string | undefined, name: t.channel.name as string | undefined } : undefined;
                    if (ch) setSelectedChannel(ch);
                  } catch {
                    // best-effort only
                  }
                }
              } catch {
                setSelectedConversationId(undefined);
                setSelectedTicketId(ticketId);
                try {
                  const { ticketsApi } = await import('@/lib/api/tickets-client');
                  const t = await ticketsApi.get(ticketId as string);
                  const ch = t?.channel ? { type: t.channel.type as string | undefined, name: t.channel.name as string | undefined } : undefined;
                  setSelectedChannel(ch);
                } catch {
                  setSelectedChannel(undefined);
                }
              }
            }}
          />
        </div>
      </div>

      {/* Center: Conversation */}
      <div className="flex-1 flex flex-col bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm">
        {(selectedConversationId || selectedTicketId) ? (
          <ConversationPanel conversationId={selectedConversationId} ticketId={selectedTicketId} channel={selectedChannel} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md animate-fade-in">
              <div className="relative mb-8">
                <div className="w-32 h-32 bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                  <MessageSquare className="h-16 w-16 text-blue-500" />
                </div>
                <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
              </div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-3">Ready to help customers</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                Select a ticket from the sidebar to start a conversation and provide amazing customer support
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button variant="outline" size="sm" className="rounded-xl">
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Guide
                </Button>
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl" onClick={() => {
                  try {
                    const url = new URL(window.location.href)
                    url.searchParams.set('new', 'true')
                    router.push(url.pathname + url.search)
                  } catch {
                    // no-op
                  }
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Ticket
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar: Knowledge Base */}
      <div className="w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l border-slate-200/50 dark:border-slate-700/50 flex flex-col shadow-2xl">
        {/* Enhanced Knowledge Header */}
        <div className="p-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-white via-emerald-50/30 to-white dark:from-slate-900 dark:via-emerald-950/30 dark:to-slate-900">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 via-teal-600 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center">
                  <Sparkles className="h-2 w-2 text-white" />
                </div>
              </div>
              <div>
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
                  AI Knowledge
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">Smart assistance & resources</p>
              </div>
            </div>
            <Button size="icon" variant="ghost" className="h-9 w-9 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-xl transition-all">
              <Settings className="h-4 w-4" />
            </Button>
          </div>

          {/* Enhanced Search */}
          <div className="relative group mb-4">
            <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-emerald-500 dark:group-focus-within:text-emerald-400 transition-colors" />
            <Input
              value={kbQuery}
              onChange={(e) => setKbQuery(e.target.value)}
              placeholder="Ask anything or search knowledge..."
              className="pl-11 bg-white/80 dark:bg-slate-800/80 border-slate-200/60 dark:border-slate-700/60 rounded-xl h-12 text-sm focus:ring-2 focus:ring-emerald-500/20 dark:focus:ring-emerald-400/20 focus:border-emerald-400 dark:focus:border-emerald-500 shadow-sm backdrop-blur-sm transition-all hover:bg-white/90 dark:hover:bg-slate-800/90 focus:bg-white dark:focus:bg-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-500 dark:placeholder:text-slate-400"
            />
            {kbLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="h-9 text-xs border-emerald-200/60 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all rounded-xl">
              <Lightbulb className="h-3 w-3 mr-1" />
              Suggest
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-xs border-blue-200/60 dark:border-blue-800/60 hover:bg-blue-50 dark:hover:bg-blue-950/30 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 transition-all rounded-xl">
              <Star className="h-3 w-3 mr-1" />
              Popular
            </Button>
          </div>
        </div>

        {/* Knowledge Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {kbLoading && (
            <div className="text-center py-8 animate-fade-in">
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Brain className="h-6 w-6 text-emerald-500 animate-pulse" />
              </div>
              <div className="text-sm text-slate-500">Searching knowledge base...</div>
            </div>
          )}

          {/* Articles */}
          {kbArticles.map((a) => (
            <div
              key={`kb-${a.id}`}
              className="group p-4 rounded-2xl border border-slate-200/60 bg-white/90 hover:bg-white hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm hover:border-orange-200"
              onClick={() => {
                const text = [a.title, a.snippet].filter(Boolean).join('\n');
                window.dispatchEvent(new CustomEvent('glavito:composer-insert', { detail: { text } }));
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-orange-100 to-amber-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate group-hover:text-orange-600 transition-colors leading-tight">{a.title}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Badge variant="secondary" className="bg-orange-50 text-orange-600 text-[10px] px-2 py-0.5">
                      Article
                    </Badge>
                    <span>•</span>
                    <span>{a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : 'Recently'}</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{a.snippet}</div>
            </div>
          ))}

          {/* FAQs */}
          {kbFaqs.map((f) => (
            <div
              key={`faq-${f.id}`}
              className="group p-4 rounded-2xl border border-slate-200/60 bg-white/90 hover:bg-white hover:shadow-xl cursor-pointer transition-all duration-300 hover:-translate-y-1 backdrop-blur-sm hover:border-blue-200"
              onClick={() => {
                const text = [f.question, f.answer].filter(Boolean).join('\n');
                window.dispatchEvent(new CustomEvent('glavito:composer-insert', { detail: { text } }));
              }}
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 text-sm truncate group-hover:text-blue-600 transition-colors leading-tight">{f.question}</div>
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                    <Badge variant="secondary" className="bg-blue-50 text-blue-600 text-[10px] px-2 py-0.5">
                      FAQ
                    </Badge>
                    <span>•</span>
                    <span>Recently updated</span>
                  </div>
                </div>
              </div>
              <div className="text-xs text-slate-600 line-clamp-3 leading-relaxed">{f.answer}</div>
            </div>
          ))}

          {/* Empty State */}
          {!kbLoading && kbArticles.length === 0 && kbFaqs.length === 0 && !kbQuery && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-100 to-teal-100 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-lg">
                <Brain className="h-10 w-10 text-emerald-500" />
              </div>
              <h4 className="text-lg font-semibold text-slate-700 mb-2">AI-Powered Knowledge</h4>
              <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                Search for articles, FAQs, or ask questions to get instant help for your customers
              </p>
              <div className="space-y-2">
                <Button variant="outline" size="sm" className="w-full justify-start text-left rounded-xl" onClick={() => setKbQuery('password reset')}>
                  <Search className="h-4 w-4 mr-2" />
                  How to reset password?
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-left rounded-xl" onClick={() => setKbQuery('billing')}>
                  <Search className="h-4 w-4 mr-2" />
                  Billing and payments
                </Button>
                <Button variant="outline" size="sm" className="w-full justify-start text-left rounded-xl" onClick={() => setKbQuery('account setup')}>
                  <Search className="h-4 w-4 mr-2" />
                  Account setup guide
                </Button>
              </div>
            </div>
          )}

          {/* No Results */}
          {!kbLoading && kbArticles.length === 0 && kbFaqs.length === 0 && kbQuery && (
            <div className="text-center py-12 animate-fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <div className="text-sm font-medium text-slate-600 mb-2">No results found</div>
              <div className="text-xs text-slate-500 mb-4">Try different keywords or browse popular topics</div>
              <Button variant="outline" size="sm" className="rounded-xl" onClick={() => setKbQuery('')}>
                <Lightbulb className="h-4 w-4 mr-2" />
                Browse All
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SlaBadges() {
  const [stats, setStats] = React.useState<{ overdue?: number; slaAtRisk?: number } | null>(null)
  React.useEffect(() => {
    let mounted = true
    import('@/lib/api/tickets-client').then(async ({ ticketsApi }) => {
      try {
        const s: { overdue?: number; slaAtRisk?: number } = await ticketsApi.stats()
        if (mounted) setStats({ overdue: s?.overdue || 0, slaAtRisk: s?.slaAtRisk || 0 })
      } catch {
        if (mounted) setStats({ overdue: 0, slaAtRisk: 0 })
      }
    })
    return () => { mounted = false }
  }, [])
  const overdue = stats?.overdue || 0
  const atRisk = stats?.slaAtRisk || 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 text-red-700 dark:text-red-300 border border-red-200/60 dark:border-red-800/60 shadow-sm backdrop-blur-sm">
        <AlertTriangle className="h-3.5 w-3.5" />
        <span className="font-medium">{overdue}</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 text-amber-700 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60 shadow-sm backdrop-blur-sm">
        <Clock className="h-3.5 w-3.5" />
        <span className="font-medium">{atRisk}</span>
      </div>
    </div>
  )
}


