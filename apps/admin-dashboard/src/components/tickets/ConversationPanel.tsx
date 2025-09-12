'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Paperclip, Send, Phone, Instagram, Mail, Clock, MessageSquare, Brain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from '@/i18n.config';
import { useConversationsWebSocket } from '@/lib/hooks/use-conversations-websocket';
import { conversationsApi } from '@/lib/api/conversations-client';
import { ticketsApi } from '@/lib/api/tickets-client';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { CallPanel } from '@/components/calls/call-panel';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import AIResponseSuggestions from '@/components/ai/ai-response-suggestions';

export interface ConversationPanelProps {
  conversationId?: string;
  ticketId?: string;
  channel?: { type?: string; name?: string };
}

export function ConversationPanel({ conversationId, ticketId, channel }: ConversationPanelProps) {
  const t = useTranslations('tickets');
  const tc = useTranslations('common');
  const tcoach = useTranslations('coaching');
  const tconv = useTranslations('conversation');
  type SimpleMessage = { id: string; conversationId: string; senderType: 'agent' | 'customer' | 'system' | 'bot'; content: string; messageType: string; createdAt: string };
  const [currentConversationId, setCurrentConversationId] = React.useState<string | undefined>(conversationId);
  const [messages, setMessages] = React.useState<SimpleMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [text, setText] = React.useState('');
  const [details, setDetails] = React.useState<{ subject?: string; channel?: { type?: string; name?: string }; ticketId?: string; customerId?: string } | null>(null);
  const [ticketInfo, setTicketInfo] = React.useState<{ priority?: string; customerName?: string; status?: string } | null>(null);
  const [rtAnalytics, setRtAnalytics] = React.useState<{ overview?: { totalConversations: number; activeConversations: number; messageVolume: number; averageResponseTime: number } } | null>(null);
  const [coaching, setCoaching] = React.useState<null | {
    summary: string;
    metrics?: { clarityScore?: number; fillerWordRate?: number; sentimentBalance?: number };
    strengths?: string[];
    improvements?: string[];
    recommendedActions?: string[];
    createdAt?: string;
  }>(null);
  const [autopilotDraft, setAutopilotDraft] = React.useState<{ content: string; confidence?: number } | null>(null)
  const [autopilotWorking, setAutopilotWorking] = React.useState(false)
  const [kbSugArticles, setKbSugArticles] = React.useState<Array<{ id: string; title?: string; snippet?: string }>>([])
  const [kbSugFaqs, setKbSugFaqs] = React.useState<Array<{ id: string; question?: string; answer?: string }>>([])
  const [activeCallId, setActiveCallId] = React.useState<string | undefined>(undefined);
  const [callStarting, setCallStarting] = React.useState(false);
  const [satisfactionModalOpen, setSatisfactionModalOpen] = React.useState(false);
  type CoachingResult = {
    summary?: string;
    metrics?: { clarityScore?: number; fillerWordRate?: number; sentimentBalance?: number };
    strengths?: string[];
    improvements?: string[];
    recommendedActions?: string[];
  };

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!conversationId) return;
      setLoading(true);
      try {
        try {
          const d = await conversationsApi.get(conversationId);
          if (!cancelled) {
            setDetails({ subject: d?.subject, channel: d?.channel, ticketId: (d as any)?.ticketId, customerId: (d as any)?.customerId });
            const tId = (d as any)?.ticketId as string | undefined;
            if (tId) {
              try {
                const t = await ticketsApi.get(tId);
                if (!cancelled) {
                  const cn = t?.customer ? `${t.customer.firstName || ''} ${t.customer.lastName || ''}`.trim() : '';
                  setTicketInfo({ priority: (t as any)?.priority, status: (t as any)?.status, customerName: cn || t?.customer?.email || undefined });
                }
              } catch {
                /* ignore ticket load */
              }
            }
          }
        } catch {
          // ignore errors fetching details; messages still load
        }
        const list = await conversationsApi.getMessages(conversationId);
        if (!cancelled && Array.isArray(list) && list.length) {
          setMessages(list as SimpleMessage[]);
        }
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [conversationId]);

  // Fallback: if a ticketId is provided (no conversation found), fetch ticket info directly
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!ticketId) return;
        const t = await ticketsApi.get(ticketId);
        if (cancelled) return;
        const cn = t?.customer ? `${t.customer.firstName || ''} ${t.customer.lastName || ''}`.trim() : '';
        setTicketInfo({ priority: (t as any)?.priority, status: (t as any)?.status, customerName: cn || t?.customer?.email || undefined });
        // use ticket subject if conversation subject not available
        setDetails((prev) => ({
          subject: prev?.subject || (t as any)?.subject,
          channel: prev?.channel || (t as any)?.channel,
          ticketId: ticketId,
          customerId: (t as any)?.customerId,
        }));
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true };
  }, [ticketId]);

  useConversationsWebSocket({
    conversationId: currentConversationId,
    autoConnect: Boolean(currentConversationId),
    onEvent: (payload) => {
      if (!payload) return;
      if (payload.event === 'message.created' && payload?.message?.conversationId === currentConversationId) {
        const m = payload.message as SimpleMessage;
        setMessages((prev) => prev.concat(m));
      }
      if (payload.event === 'autopilot.request' && payload?.conversationId === currentConversationId) {
        // Best-effort: fetch suggestions locally to surface a draft for the agent
        (async () => {
          try {
            setAutopilotWorking(true)
            const { aiApi } = await import('@/lib/api/ai-client')
            const prior = messages.slice(-8).map(m => m.content)
            const res = await aiApi.getResponseSuggestions({ content: prior.join('\n'), context: { conversationId: currentConversationId, previousMessages: prior } })
            const best = (res?.responses || []).sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0]
            if (best?.response) setAutopilotDraft({ content: best.response, confidence: best.confidence })
          } catch (e) {
            // ignore
          } finally {
            setAutopilotWorking(false)
          }
        })()
      }
      if (payload.event === 'autopilot.drafted' && payload?.conversationId === currentConversationId) {
        if (payload?.content) setAutopilotDraft({ content: payload.content, confidence: payload.confidence })
        else setAutopilotWorking(false)
      }
      if (payload.event === 'autopilot.sent' && payload?.conversationId === currentConversationId) {
        setAutopilotDraft(null)
        setAutopilotWorking(false)
      }
    },
  });

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await conversationsApi.getRealtimeAnalytics('24h');
        if (!cancelled) setRtAnalytics(data);
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // When we ensure/create a conversation dynamically, load its details and messages
  React.useEffect(() => {
    let cancelled = false;
    async function loadByCurrent() {
      if (!currentConversationId) return;
      setLoading(true);
      try {
        try {
          const d = await conversationsApi.get(currentConversationId);
          if (!cancelled) {
            setDetails({ subject: d?.subject, channel: d?.channel, ticketId: (d as any)?.ticketId, customerId: (d as any)?.customerId });
            const tId = (d as any)?.ticketId as string | undefined;
            if (tId) {
              try {
                const t = await ticketsApi.get(tId);
                if (!cancelled) {
                  const cn = t?.customer ? `${t.customer.firstName || ''} ${t.customer.lastName || ''}`.trim() : '';
                  setTicketInfo({ priority: (t as any)?.priority, status: (t as any)?.status, customerName: cn || t?.customer?.email || undefined });
                }
              } catch {
                /* ignore ticket load */
              }
            }
          }
        } catch {
          // ignore errors fetching details; messages still load
        }
        const list = await conversationsApi.getMessages(currentConversationId);
        if (!cancelled && Array.isArray(list) && list.length) {
          setMessages(list as SimpleMessage[]);
        }
      } catch {
        if (!cancelled) setMessages([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadByCurrent();
    return () => { cancelled = true; };
  }, [currentConversationId]);

  const ensureConversation = React.useCallback(async (): Promise<string | undefined> => {
    if (currentConversationId) return currentConversationId;
    const tid = details?.ticketId || ticketId;
    if (!tid) return undefined;
    try {
      const list = await conversationsApi.list({ ticketId: tid, limit: 1 } as any);
      const conv = Array.isArray(list) ? list[0] : list?.items?.[0];
      if (conv?.id) {
        setCurrentConversationId(conv.id);
        return conv.id as string;
      }
    } catch {
      // ignore
    }
    // No conversation found: create one via advanced endpoint using ticket context
    try {
      const t = await ticketsApi.get(tid);
      const customerId = (t as any)?.customerId as string | undefined;
      const channelId = (t as any)?.channelId as string | undefined;
      if (!customerId || !channelId) return undefined;
      const created = await conversationsApi.create({ customerId, channelId, subject: (t as any)?.subject, priority: ((t as any)?.priority || 'medium') as any, metadata: { createdFromTicket: tid } });
      const newId = (created as any)?.id || (created as any)?.data?.id;
      if (newId) setCurrentConversationId(newId as string);
      return newId as string | undefined;
    } catch {
      return undefined;
    }
  }, [currentConversationId, details?.ticketId, ticketId]);

  const send = React.useCallback(async () => {
    if (!text.trim()) return;
    try {
      const convId = await ensureConversation();
      if (!convId) return;
      const optimistic: SimpleMessage = { id: `tmp_${Date.now()}`, conversationId: convId, senderType: 'agent', content: text, messageType: 'text', createdAt: new Date().toISOString() };
      setMessages((prev) => prev.concat(optimistic));
      const current = text;
      setText('');
      const res = await conversationsApi.sendMessage(convId, { content: current, messageType: 'text' });
      // Best-effort: refresh from advanced context to reflect normalized/saved message
      try {
        const ctx = await conversationsApi.getContextAdvanced(convId)
        const serverMessages = Array.isArray((ctx as any)?.messages) ? (ctx as any).messages : []
        if (serverMessages.length) setMessages(serverMessages as any)
      } catch { /* ignore */ }
    } catch {
      // already appended
    }
  }, [text, ensureConversation]);

  // Attachment handling
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const onAttachClick = React.useCallback(() => {
    fileInputRef.current?.click();
  }, []);
  const onFilesSelected = React.useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    try {
      const { conversationsApi } = await import('@/lib/api/conversations-client');
      const uploaded = await conversationsApi.uploadAttachment(file, 'conversation');
      const url = uploaded?.url || URL.createObjectURL(file);
      const optimistic: SimpleMessage = {
        id: `tmp_${Date.now()}`,
        conversationId: currentConversationId || conversationId || 'pending',
        senderType: 'agent',
        content: `${text ? text + '\n' : ''}[Attachment: ${file.name}]`,
        messageType: 'document',
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => prev.concat(optimistic));
      setText('');
      const convId = await ensureConversation();
      if (!convId) return;
      await conversationsApi.sendMessage(convId, {
        content: text || file.name,
        messageType: (file.type?.startsWith('image/') ? 'image' : file.type?.startsWith('video/') ? 'video' : file.type?.startsWith('audio/') ? 'audio' : 'document'),
        attachments: [{ url, filename: file.name, mimeType: file.type, size: file.size, type: 'document' }],
      });
    } catch (e) {
      console.error(e);
    }
  }, [conversationId, currentConversationId, text, ensureConversation]);

  // Handle click-to-insert from KB
  React.useEffect(() => {
    function handleInsert(e: CustomEvent<{ text?: string }>) {
      const detail = e.detail;
      if (detail?.text) setText((prev) => (prev ? prev + '\n' + detail.text : detail.text || ''));
    }
    const key = 'glavito:composer-insert';
    window.addEventListener(key, handleInsert as EventListener);
    return () => window.removeEventListener(key, handleInsert as EventListener);
  }, []);

  // GlavAI modal state and context
  const [glavAIOpen, setGlavAIOpen] = React.useState(false);
  const lastCustomerMessage = React.useMemo(() => {
    const last = [...messages].reverse().find((m) => m.senderType !== 'agent');
    return (last?.content || text || '');
  }, [messages, text]);

  return (
    <div className="h-full flex flex-col bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl">
      {/* Enhanced Header */}
      <div className="px-6 py-6 border-b border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-white via-blue-50/30 to-white dark:from-slate-900 dark:via-blue-950/30 dark:to-slate-900 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <span className="text-white font-bold text-sm">#{(currentConversationId || details?.ticketId || conversationId)?.slice(-4) || '0001'}</span>
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                </div>
          </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="font-bold text-slate-800 dark:text-slate-200 text-xl">Ticket #{(details?.ticketId || currentConversationId || conversationId)?.slice(-4) || '0001'}</h2>
                  <Badge className="flex items-center gap-2 px-3 py-1 rounded-xl bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200/60 shadow-sm">
            {(() => {
              const ch = channel?.type || details?.channel?.type;
              if (ch === 'whatsapp') return (<><MessageSquare className="h-3 w-3" /> WhatsApp</>);
              if (ch === 'instagram') return (<><Instagram className="h-3 w-3" /> Instagram</>);
              if (ch === 'email') return (<><Mail className="h-3 w-3" /> Email</>);
              return (<><MessageSquare className="h-3 w-3" /> WhatsApp</>);
            })()}
          </Badge>
        </div>
                <p className="text-slate-600 dark:text-slate-300 text-sm max-w-lg truncate leading-relaxed">
                  {details?.subject || ''}
                </p>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    {ticketInfo?.status ? String(ticketInfo.status).replace(/_/g,' ') : 'Active conversation'}
                  </span>
                  <span>•</span>
                  <span>Customer: {ticketInfo?.customerName || '-'}</span>
                  <span>•</span>
                  <span>Priority: {ticketInfo?.priority ? (ticketInfo.priority.charAt(0).toUpperCase() + ticketInfo.priority.slice(1)) : '-'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm border-blue-200/60 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all rounded-xl shadow-sm backdrop-blur-sm"
            disabled={!(currentConversationId || ticketId) || !!activeCallId || callStarting}
            onClick={async () => {
              if (activeCallId) return;
              try {
                setCallStarting(true);
                const { callsApi } = await import('@/lib/api/calls-client');
                const convId = await ensureConversation();
                if (!convId) throw new Error('No conversation');
                const call = await callsApi.create({ conversationId: convId, type: 'video' });
                setActiveCallId(call.id);
              } catch (e) {
                console.error(e);
              } finally {
                setCallStarting(false);
              }
            }}
          >
            <Phone className="h-4 w-4 mr-2" />
            {callStarting ? 'Starting…' : (activeCallId ? 'In call' : 'Start Call')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm border-amber-200/60 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all rounded-xl shadow-sm backdrop-blur-sm"
            onClick={async () => {
              try {
                if (!conversationId) return;
                const { ticketsApi } = await import('@/lib/api/tickets-client');
                const targetId = (details?.ticketId || conversationId) as string;
                // Quick snooze: 4 hours. Later: show dialog with presets/custom.
                const until = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString();
                await ticketsApi.snooze(targetId, { until });
              } catch (e) { console.error(e); }
            }}
          >
            <Clock className="h-4 w-4 mr-2" />
            Snooze
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm border-purple-200/60 hover:bg-purple-50 hover:border-purple-300 text-purple-600 hover:text-purple-700 transition-all rounded-xl shadow-sm backdrop-blur-sm"
            onClick={async () => {
              try {
                if (!conversationId) return;
                const { callsApi } = await import('@/lib/api/calls-client');
                const calls = await callsApi.list({ conversationId });
                const last = (Array.isArray(calls) && calls.length ? calls[0] : null) as { id: string; transcription?: string } | null;
                if (!last) return;
                const transcript = last.transcription || messages.map(m => m.content).join('\n');
                await callsApi.analyzeCall(last.id, transcript);
              } catch (e) {
                console.error(e);
              }
            }}
          >
            <Brain className="h-4 w-4 mr-2" />
            AI Coach
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-9 px-4 text-sm border-orange-200/60 hover:bg-orange-50 hover:border-orange-300 text-orange-600 hover:text-orange-700 transition-all rounded-xl shadow-sm backdrop-blur-sm"
            onClick={async () => {
              try {
                if (!conversationId) return;
                const { ticketsApi } = await import('@/lib/api/tickets-client');
                const targetId = (details?.ticketId || conversationId) as string;
                await ticketsApi.resolve(targetId);

                // Show satisfaction survey options
                setSatisfactionModalOpen(true);
              } catch (e) { console.error(e); }
            }}
          >
            Resolve
          </Button>
        </div>
      </div>

      {/* Inline Call Panel */}
      {activeCallId && (
        <div className="px-6 pt-3">
          <CallPanel callId={activeCallId} isCaller onEnd={() => setActiveCallId(undefined)} />
        </div>
      )}

      {/* Autopilot Draft Banner */}
      {(autopilotWorking || autopilotDraft) && (
        <div className="px-6 pt-3">
          <div className="rounded-2xl border border-emerald-200/60 bg-gradient-to-r from-emerald-50/80 to-green-50/80 p-4 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-sm font-semibold text-emerald-800 mb-1">AI Autopilot</div>
              <div className="text-xs text-emerald-700">
                {autopilotWorking ? 'Analyzing conversation to propose a draft…' : (autopilotDraft?.content || '')}
              </div>
            </div>
            {!autopilotWorking && autopilotDraft?.content && (
              <div className="flex items-center gap-2 ml-4">
                <Button variant="outline" size="sm" className="h-8 px-3 rounded-xl border-emerald-300/60 text-emerald-700" onClick={() => setText(prev => prev ? prev + '\n' + (autopilotDraft?.content || '') : (autopilotDraft?.content || ''))}>Insert</Button>
                <Button size="sm" className="h-8 px-3 rounded-xl bg-emerald-600 text-white" onClick={async () => {
                  if (!autopilotDraft?.content) return
                  setText(autopilotDraft.content)
                  await send()
                  setAutopilotDraft(null)
                }}>Send</Button>
                <Button variant="ghost" size="sm" className="h-8 px-3 rounded-xl" onClick={() => setAutopilotDraft(null)}>Dismiss</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-6 space-y-4 bg-gradient-to-b from-slate-50/20 to-white/80 dark:from-slate-800/20 dark:to-slate-900/80 backdrop-blur-sm">
        {loading && (
          <div className="text-center py-16 animate-fade-in">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center mb-6 mx-auto shadow-xl">
              <MessageSquare className="h-8 w-8 text-blue-500 animate-pulse" />
            </div>
            <div className="text-base font-medium text-slate-600 dark:text-slate-300 mb-2">Loading conversation...</div>
            <div className="text-sm text-slate-500 dark:text-slate-400">Please wait while we fetch the messages</div>
          </div>
        )}
        
        {!loading && messages.map((m, index) => (
          <div key={m.id} className={`flex ${m.senderType === 'agent' ? 'justify-end' : 'justify-start'} animate-slide-up`} style={{ animationDelay: `${index * 50}ms` }}>
            <div className="flex items-end gap-3 max-w-[80%]">
              {m.senderType === 'customer' && (
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-green-500 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg flex-shrink-0">
                  JS
                </div>
              )}
              <div className="flex flex-col">
                <div className={`rounded-2xl px-5 py-4 shadow-lg backdrop-blur-sm transition-all hover:shadow-xl ${m.senderType === 'agent'
                  ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                  : 'bg-white/95 dark:bg-slate-800/95 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200'
                  }`}>
                  <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">{m.content}</div>
                </div>
                <div className={`text-xs mt-2 px-2 ${m.senderType === 'agent' ? 'text-right text-blue-600 dark:text-blue-400' : 'text-left text-slate-500 dark:text-slate-400'
                }`}>
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {m.senderType === 'agent' && <span className="ml-2">✓✓</span>}
                </div>
              </div>
              {m.senderType === 'agent' && (
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white text-sm font-bold shadow-lg flex-shrink-0">
                  You
                </div>
              )}
            </div>
          </div>
        ))}
        
        {!loading && !messages.length && (
          <div className="text-center py-20 animate-fade-in">
            <div className="relative mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 via-purple-100 to-indigo-100 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
                <MessageSquare className="h-12 w-12 text-blue-500" />
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <div className="w-3 h-3 bg-white rounded-full animate-pulse"></div>
              </div>
            </div>
            <h3 className="text-xl font-bold text-slate-700 dark:text-slate-200 mb-3">Ready to start the conversation</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto leading-relaxed">
              This is the beginning of your conversation with the customer. Send a friendly message to get started.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" className="rounded-xl">
                Use Template
              </Button>
              <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl">
                Send Greeting
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced AI Coaching Panel */}
      {coaching && (
        <div className="px-6 pb-6">
          <Card className="border border-purple-200/60 bg-gradient-to-br from-purple-50/80 via-blue-50/60 to-indigo-50/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
            <CardHeader className="py-5 bg-gradient-to-r from-purple-500/10 to-blue-500/10">
              <CardTitle className="text-lg flex items-center gap-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain className="h-5 w-5 text-white" />
                </div>
                <div>
                  <span className="bg-gradient-to-r from-purple-700 to-indigo-700 bg-clip-text text-transparent font-bold">
                    AI Performance Coach
                  </span>
                  <p className="text-sm text-slate-500 font-normal mt-1">Real-time conversation insights</p>
                </div>
              </CardTitle>
          </CardHeader>
            <CardContent className="py-6">
              {/* Metrics Dashboard */}
              {coaching.metrics && (
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {typeof coaching.metrics.clarityScore === 'number' && (
                    <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/60">
                      <div className="text-2xl font-bold text-blue-700">{(coaching.metrics.clarityScore * 100).toFixed(0)}%</div>
                      <div className="text-xs text-blue-600 font-medium">Clarity</div>
                    </div>
                  )}
                  {typeof coaching.metrics.sentimentBalance === 'number' && (
                    <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200/60">
                      <div className="text-2xl font-bold text-emerald-700">{(coaching.metrics.sentimentBalance * 100).toFixed(0)}%</div>
                      <div className="text-xs text-emerald-600 font-medium">Sentiment</div>
                    </div>
                  )}
                  {typeof coaching.metrics.fillerWordRate === 'number' && (
                    <div className="text-center p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200/60">
                      <div className="text-2xl font-bold text-amber-700">{(coaching.metrics.fillerWordRate * 100).toFixed(0)}%</div>
                      <div className="text-xs text-amber-600 font-medium">Filler Words</div>
                    </div>
                  )}
                </div>
              )}

              {/* Summary */}
              {coaching.summary && (
                <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-50 to-blue-50 border border-slate-200/60">
                  <h4 className="text-sm font-semibold text-slate-700 mb-2">{tconv('aiCoach.summary')}</h4>
                  <p className="text-sm text-slate-600 leading-relaxed">{coaching.summary}</p>
                </div>
              )}

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {(Array.isArray(coaching.strengths) && coaching.strengths.length > 0) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200/60">
                    <h4 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-2">
                      ✅ {tconv('aiCoach.strengths')}
                    </h4>
                    <ul className="space-y-2">
                      {coaching.strengths.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-green-700 flex items-start gap-2">
                          <span className="text-green-500 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {(Array.isArray(coaching.improvements) && coaching.improvements.length > 0) && (
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200/60">
                    <h4 className="text-sm font-semibold text-orange-700 mb-3 flex items-center gap-2">
                      🎯 {tconv('aiCoach.improvements')}
                    </h4>
                    <ul className="space-y-2">
                      {coaching.improvements.slice(0, 3).map((s, i) => (
                        <li key={i} className="text-xs text-orange-700 flex items-start gap-2">
                          <span className="text-orange-500 mt-0.5">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                  className="h-9 px-4 text-sm border-purple-200/60 hover:bg-purple-100/80 hover:border-purple-300 hover:text-purple-700 transition-all rounded-xl shadow-sm backdrop-blur-sm"
                onClick={async () => {
                  try {
                    const { aiApi } = await import('@/lib/api/ai-client');
                    const res = await aiApi.coachingLatest({ conversationId: conversationId });
                    const payload = (res?.data || res) as { coaching?: CoachingResult; createdAt?: string } | CoachingResult;
                    const wrapper = (payload as unknown) as { coaching?: CoachingResult; createdAt?: string };
                    const c: CoachingResult | undefined = (wrapper && (wrapper.coaching ?? (payload as CoachingResult))) as CoachingResult | undefined;
                    if (c) setCoaching({
                      summary: c.summary || '',
                      metrics: { clarityScore: c.metrics?.clarityScore, fillerWordRate: c.metrics?.fillerWordRate, sentimentBalance: c.metrics?.sentimentBalance },
                      strengths: Array.isArray(c.strengths) ? c.strengths.slice(0, 5) : [],
                      improvements: Array.isArray(c.improvements) ? c.improvements.slice(0, 5) : [],
                      recommendedActions: Array.isArray(c.recommendedActions) ? c.recommendedActions.slice(0, 3) : [],
                      createdAt: wrapper?.createdAt,
                    });
                  } catch (e) { console.error(e); }
                }}
              >
                  🔄 {tconv('actions.refreshAnalysis')}
                </Button>
                <Link href="/dashboard/coaching">
                  <Button variant="outline" size="sm" className="h-9 px-4 text-sm border-indigo-200/60 hover:bg-indigo-100/80 hover:border-indigo-300 hover:text-indigo-700 transition-all rounded-xl shadow-sm backdrop-blur-sm">
                    📊 {tconv('actions.fullDashboard')}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 px-4 text-sm border-emerald-200/60 hover:bg-emerald-100/80 hover:border-emerald-300 hover:text-emerald-700 transition-all rounded-xl shadow-sm backdrop-blur-sm"
                  onClick={() => setCoaching(null)}
                >
                  ✕ {tconv('actions.dismiss')}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Enhanced Composer */}
      <div className="border-t border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-r from-white via-blue-50/20 to-white dark:from-slate-900 dark:via-blue-950/20 dark:to-slate-900 p-6 backdrop-blur-xl">
        {/* Status Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg">
              {(() => {
                const ch = channel?.type || details?.channel?.type;
                if (ch === 'whatsapp') return (<><MessageSquare className="h-4 w-4" /> {tconv('channels.whatsapp')}</>);
                if (ch === 'instagram') return (<><Instagram className="h-4 w-4" /> {tconv('channels.instagram')}</>);
                if (ch === 'email') return (<><Mail className="h-4 w-4" /> {tconv('channels.email')}</>);
                return (<><MessageSquare className="h-4 w-4" /> {tconv('channels.whatsapp')}</>);
              })()}
            </Badge>
            <Badge variant="outline" className="text-sm px-3 py-1.5 rounded-xl border-emerald-300/60 text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 shadow-sm">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              {tconv('status.aiAssistantReady')}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              {tconv('status.customerOnline')}
            </span>
          </div>
        </div>

        {/* Composer Input */}
        <div className="flex items-end gap-3">
          {/* Channel Selector */}
          <div className="flex flex-col gap-2">
            {(() => {
              const ch = channel?.type || details?.channel?.type;
              return (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-12 w-12 rounded-2xl transition-all shadow-lg backdrop-blur-sm ${ch === 'whatsapp' ? 'border-green-300 bg-green-50 text-green-600 shadow-green-200' : 'opacity-40 border-slate-200/60'}`}
                    disabled={ch !== 'whatsapp'}
                    title={tconv('channels.whatsapp')}
                  >
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </>
              );
            })()}
          </div>

          {/* Main Input Area */}
          <div className="flex-1 relative">
            <div className="flex items-end gap-3 p-4 bg-white/90 dark:bg-slate-800/90 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl shadow-lg backdrop-blur-sm">
              <Input ref={fileInputRef} type="file" className="hidden" onChange={(e) => onFilesSelected(e.target.files)} />
              <Button
                onClick={onAttachClick}
                variant="ghost"
                size="icon"
                className="h-10 w-10 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all flex-shrink-0"
                title={tconv('messages.attachFile')}
              >
                <Paperclip className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </Button>

              <div className="flex-1 min-h-[2.5rem] max-h-32">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={tconv('messages.placeholder')}
                  className="w-full resize-none border-0 bg-transparent text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-0 leading-relaxed py-2 text-slate-900 dark:text-slate-100"
                  rows={1}
                  style={{
                    minHeight: '2.5rem',
                    height: 'auto',
                    maxHeight: '8rem'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = Math.min(target.scrollHeight, 128) + 'px';
                  }}
                />
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-all"
                >
                  {tconv('messages.templates')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 px-3 text-xs rounded-lg transition-all border-emerald-200/60 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => setGlavAIOpen(true)}
                  title={tconv('messages.openGlavAI')}
                >
                  <Brain className="h-4 w-4 mr-1" /> {tconv('messages.glavAI')}
                </Button>
                <Button
                  onClick={send}
                  disabled={!text.trim()}
                  size="icon"
                  className="h-10 w-10 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 mt-3 px-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs hover:bg-blue-50 hover:text-blue-600 rounded-lg"
                onClick={async () => {
                  try {
                    const { aiApi } = await import('@/lib/api/ai-client');
                    const prior = messages.slice(-8).map(m => m.content);
                    const payload = { content: text || prior.join('\n'), context: { conversationId, previousMessages: prior } };
                    const res = await aiApi.getResponseSuggestions(payload);
                    setKbSugArticles(Array.isArray(res?.knowledgeArticles) ? res.knowledgeArticles.slice(0, 3) : [])
                    setKbSugFaqs(Array.isArray(res?.faqs) ? res.faqs.slice(0, 3) : [])
                    const best = (res?.responses || []).sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
                    if (best?.response) {
                      setText(prev => prev ? prev + '\n' + best.response : best.response);
                    }
                  } catch (e) { console.error(e); }
                }}
              >
                💡 {tconv('quickActions.suggestResponse')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs hover:bg-purple-50 hover:text-purple-600 rounded-lg"
                onClick={async () => {
                  try {
                    const { aiApi } = await import('@/lib/api/ai-client');
                    const prior = messages.slice(-8).map(m => m.content);
                    const payload = { content: text || prior.join('\n'), context: { conversationId, previousMessages: prior } };
                    const res = await aiApi.getResponseSuggestions(payload);
                    setKbSugArticles(Array.isArray(res?.knowledgeArticles) ? res.knowledgeArticles.slice(0, 3) : [])
                    setKbSugFaqs(Array.isArray(res?.faqs) ? res.faqs.slice(0, 3) : [])
                    const best = (res?.responses || []).sort((a, b) => (b.confidence || 0) - (a.confidence || 0))[0];
                    if (best?.response) {
                      setText(best.response);
                    }
                  } catch (e) { console.error(e); }
                }}
              >
                🎯 {tconv('quickActions.autoComplete')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-3 text-xs hover:bg-emerald-50 hover:text-emerald-600 rounded-lg"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent('glavito:kb:focus', { detail: { query: text || '' } }));
                }}
              >
                📚 {tconv('quickActions.knowledge')}
              </Button>
            </div>
                </div>
          {/* Inline Knowledge Suggestions */}
          {(kbSugArticles.length > 0 || kbSugFaqs.length > 0) && (
            <div className="mt-2 px-2">
              {kbSugArticles.length > 0 && (
                <div className="mb-2">
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{tconv('knowledge.suggestedArticles')}</div>
                  <div className="flex flex-col gap-1">
                    {kbSugArticles.map(a => (
                      <button key={`sug-art-${a.id}`} className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200/60 hover:bg-slate-50" onClick={() => {
                        const textToInsert = [a.title, a.snippet].filter(Boolean).join('\n')
                        setText(prev => prev ? prev + '\n' + textToInsert : textToInsert)
                      }}>
                        <div className="font-medium text-slate-700 line-clamp-1">{a.title}</div>
                        <div className="text-slate-500 line-clamp-2">{a.snippet}</div>
                      </button>
                    ))}
                  </div>
                  </div>
                )}
              {kbSugFaqs.length > 0 && (
                  <div>
                  <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-1">{tconv('knowledge.suggestedFaqs')}</div>
                  <div className="flex flex-col gap-1">
                    {kbSugFaqs.map(f => (
                      <button key={`sug-faq-${f.id}`} className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200/60 hover:bg-slate-50" onClick={() => {
                        const textToInsert = [f.question, f.answer].filter(Boolean).join('\n')
                        setText(prev => prev ? prev + '\n' + textToInsert : textToInsert)
                      }}>
                        <div className="font-medium text-slate-700 line-clamp-1">{f.question}</div>
                        <div className="text-slate-500 line-clamp-2">{f.answer}</div>
                      </button>
                    ))}
                  </div>
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

      {/* GlavAI Suggestions Modal */}
      <Dialog open={glavAIOpen} onOpenChange={setGlavAIOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" /> {tconv('aiSuggestions.title')}
            </DialogTitle>
            <DialogDescription>
              {tconv('aiSuggestions.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <AIResponseSuggestions
              customerMessage={lastCustomerMessage}
              conversationContext={{ conversationId, previousMessages: messages.slice(-12).map(m => m.content) }}
              onResponseSelect={(response) => {
                setText(prev => (prev ? prev + '\n' + response : response));
                setGlavAIOpen(false);
              }}
              onTemplateSelect={(template) => {
                const content = template.content || '';
                setText(prev => (prev ? prev + '\n' + content : content));
                setGlavAIOpen(false);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* Satisfaction Survey Modal */}
      <SatisfactionSurveyModal
        open={satisfactionModalOpen}
        onOpenChange={setSatisfactionModalOpen}
        conversationId={conversationId}
        ticketId={details?.ticketId}
        customerId={details?.customerId}
      />
        </div>
  );
}

interface SatisfactionSurveyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId?: string;
  ticketId?: string;
  customerId?: string;
}

function SatisfactionSurveyModal({ open, onOpenChange, conversationId, ticketId, customerId }: SatisfactionSurveyModalProps) {
  const tconv = useTranslations('conversation');
  const [sendEmail, setSendEmail] = React.useState(true);
  const [sendWhatsApp, setSendWhatsApp] = React.useState(true);
  const [sending, setSending] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  const sendSurveys = React.useCallback(async () => {
    if (!customerId || (!sendEmail && !sendWhatsApp)) return;

    setSending(true);
    try {
      const results = [];

      if (sendEmail) {
        try {
          const response = await fetch('/api/satisfaction/surveys/email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId,
              ticketId,
              conversationId,
              surveyType: 'post_resolution',
            }),
          });
          const result = await response.json();
          results.push({ channel: 'email', success: response.ok, result });
        } catch (error) {
          results.push({ channel: 'email', success: false, error });
        }
      }

      if (sendWhatsApp) {
        try {
          const response = await fetch('/api/satisfaction/surveys/whatsapp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              customerId,
              ticketId,
              conversationId,
              surveyType: 'post_resolution',
            }),
          });
          const result = await response.json();
          results.push({ channel: 'whatsapp', success: response.ok, result });
        } catch (error) {
          results.push({ channel: 'whatsapp', success: false, error });
        }
      }

      console.log('Survey results:', results);
      setSent(true);

      // Auto-close after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        setSent(false);
        setSending(false);
      }, 2000);
    } catch (error) {
      console.error('Failed to send surveys:', error);
      setSending(false);
    }
  }, [customerId, ticketId, conversationId, sendEmail, sendWhatsApp, onOpenChange]);

            return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center">
              <MessageSquare className="h-5 w-5 text-white" />
            </div>
            {tconv('satisfactionSurvey.title')}
          </DialogTitle>
          <DialogDescription>
            {tconv('satisfactionSurvey.description')}
          </DialogDescription>
        </DialogHeader>

        {!sent ? (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="email"
                  checked={sendEmail}
                  onCheckedChange={(v) => setSendEmail(v === true)}
                  disabled={sending}
                />
                <label htmlFor="email" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Mail className="h-4 w-4 text-blue-600" />
                  {tconv('satisfactionSurvey.sendViaEmail')}
                </label>
              </div>
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="whatsapp"
                  checked={sendWhatsApp}
                  onCheckedChange={(v) => setSendWhatsApp(v === true)}
                  disabled={sending}
                />
                <label htmlFor="whatsapp" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <MessageSquare className="h-4 w-4 text-green-600" />
                  {tconv('satisfactionSurvey.sendViaWhatsApp')}
                </label>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-sm">
                  <div className="font-medium text-blue-900 mb-1">{tconv('satisfactionSurvey.preview')}</div>
                  <div className="text-blue-700 space-y-1">
                    <div>• {tconv('satisfactionSurvey.question1')}</div>
                    <div>• {tconv('satisfactionSurvey.question2')}</div>
                    <div>• {tconv('satisfactionSurvey.question3')}</div>
                    <div>• {tconv('satisfactionSurvey.question4')}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
                <Button 
                onClick={sendSurveys}
                disabled={sending || (!sendEmail && !sendWhatsApp)}
                className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-xl"
              >
                {sending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    {tconv('satisfactionSurvey.sending')}
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    {tconv('satisfactionSurvey.sendButton')}{(sendEmail && sendWhatsApp) ? 's' : ''}
                  </>
                )}
                </Button>
                <Button 
                  variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={sending}
                className="rounded-xl"
              >
                {tconv('satisfactionSurvey.skip')}
          </Button>
        </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              </div>
            </div>
            <div className="text-lg font-semibold text-green-700 mb-2">{tconv('satisfactionSurvey.sent')}</div>
            <div className="text-sm text-green-600">
              {tconv('satisfactionSurvey.sentDescription')}
      </div>
    </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

 

