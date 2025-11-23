'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  X,
  MoreVertical,
  Phone,
  Video,
  User,
  Tag,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { conversationsApi } from '@/lib/api/conversations-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useToast } from '@/components/ui/toast';
import { MessageBubble } from './message-bubble';
import { MessageComposer } from './message-composer';
import { api } from '@/lib/api/config';
import { useConversationsWebSocket } from '@/lib/hooks/use-conversations-websocket';
import { CallModal } from './call-modal';
import { callsApi, type CallRecord } from '@/lib/api/calls-client';
import { GlavaiCopilotPanel } from '@/components/glavai/glavai-copilot-panel';

interface ConversationThreadProps {
  conversationId: string;
  ticketId?: string;
  onClose: () => void;
}

interface Message {
  id: string;
  content: string;
  senderType: 'customer' | 'agent' | 'system';
  createdAt: string;
  sender?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  messageType: string;
  status?: string;
  isInternalNote?: boolean;
  reactions?: Array<{
    emoji: string;
    userId: string;
    userName?: string;
  }>;
  audioUrl?: string;
  audioDuration?: number;
}

interface ConversationHeader {
  id: string;
  status?: string;
  team?: { id?: string | null } | null;
  customerId?: string | null;
  channelId?: string;
  channel?: {
    id?: string;
    name?: string;
    type?: string;
  } | null;
  customer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
    name?: string | null;
    phone?: string | null;
  } | null;
}

const getStatusConfig = (t: any) => ({
  open: { icon: Clock, label: t('open'), color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
  waiting: { icon: Clock, label: t('waiting'), color: 'text-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-950' },
  resolved: { icon: CheckCircle2, label: t('resolved'), color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
  closed: { icon: CheckCircle2, label: t('closed'), color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-950' },
});

export function ConversationThread({ conversationId, ticketId, onClose }: ConversationThreadProps) {
  const t = useTranslations('conversationThread');
  const { success, error: toastError } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const [conversation, setConversation] = useState<ConversationHeader | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const [callType, setCallType] = useState<'voice' | 'video'>('voice');
  const [callHistory, setCallHistory] = useState<CallRecord[]>([]);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const loadConversation = useCallback(async () => {
    setLoading(true);
    try {
      const [convResp, messagesResp] = await Promise.all([
        conversationsApi.getConversation(conversationId),
        conversationsApi.getMessages(conversationId),
      ]);

      if (convResp.success && convResp.data) {
        const convData = convResp.data.conversation || convResp.data;
        setConversation(convData);
        
        // Load call history for this conversation
        try {
          const calls = await callsApi.list({ conversationId });
          setCallHistory(calls || []);
        } catch (callError) {
          console.error('Failed to load call history:', callError);
        }
      }

      if (messagesResp.success && messagesResp.data) {
        setMessages(messagesResp.data);
      }
    } catch (err: any) {
      setError(err.message || t('loadError'));
      toastError(t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [conversationId, toastError]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Memoize WebSocket event handler to prevent reconnection loops
  const handleWebSocketEvent = useCallback((payload: { event: string; [key: string]: any }) => {
    if (payload.event === 'message.reaction') {
      // Update message reactions when reaction is added/removed
      const { messageId, reactions } = payload;
      if (messageId && reactions) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, reactions: reactions as Array<{ emoji: string; userId: string; timestamp?: string }> }
              : msg
          )
        );
      }
    } else if (payload.event === 'message.created') {
      // Add new message when received via WebSocket
      const newMessage = payload.message as Message;
      if (newMessage) {
        setMessages((prev) => {
          // Avoid duplicates
          if (prev.some((m) => m.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
      }
    }
  }, []);

  // Listen for WebSocket events (reactions, new messages, etc.)
  useConversationsWebSocket({
    conversationId,
    onEvent: handleWebSocketEvent,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string, type: 'reply' | 'internal_note', audioBlob?: Blob) => {
    if (!content.trim() && !audioBlob) return;

    setSending(true);
    try {
      let audioUrl: string | undefined;
      let audioDuration: number | undefined;

      // Upload audio if present
      if (audioBlob) {
        try {
          const formData = new FormData();
          formData.append('file', audioBlob, 'audio.webm');
          
          const uploadResp = await api.post('/files/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          
          if (uploadResp.data?.url) {
            audioUrl = uploadResp.data.url;
            audioDuration = Math.floor(audioBlob.size / 16000); // Rough estimate, will be updated by backend
          }
        } catch (uploadError) {
          console.error('Failed to upload audio:', uploadError);
          toastError(t('uploadFailed'));
          setSending(false);
          return;
        }
      }

      const resp = await conversationsApi.sendMessage(conversationId, {
        content: content || `🎤 ${t('audioMessage')}`,
        messageType: audioBlob ? 'audio' : (type === 'internal_note' ? 'internal_note' : 'text'),
        isInternalNote: type === 'internal_note',
        attachments: audioUrl ? [{
          id: `audio_${Date.now()}`,
          url: audioUrl,
          type: 'audio',
          filename: 'audio.webm',
          mimeType: 'audio/webm',
        }] : undefined,
        metadata: audioDuration ? { audioDuration, audioUrl } : undefined,
      });

      if (resp.success && resp.data) {
        setMessages((prev) => [...prev, resp.data as Message]);
        success(t('messageSent'));
      } else {
        throw new Error(resp.error || t('sendFailed'));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : t('sendFailed');
      toastError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  const handleReactToMessage = async (messageId: string, emoji: string) => {
    try {
      const resp = await conversationsApi.addReaction(messageId, emoji);
      if (resp.success) {
        // Update message reactions locally
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === messageId
              ? { ...msg, reactions: resp.data?.reactions || [] }
              : msg
          )
        );
        success(t('reactionAdded'));
      }
    } catch (err: any) {
      toastError(t('reactionFailed'));
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    try {
      const resp = await conversationsApi.updateConversation(conversationId, {
        status: newStatus,
      });

      if (resp.success) {
        setConversation((prev) => (prev ? { ...prev, status: newStatus } : null));
        success(t('statusUpdated', { status: newStatus }));
      }
    } catch (err: any) {
      toastError(t('statusUpdateFailed'));
    }
  };

  const customerName = conversation?.customer
    ? `${conversation.customer.firstName || ''} ${conversation.customer.lastName || ''}`.trim() ||
      conversation.customer.name ||
      conversation.customer.email ||
      t('unknownCustomer')
    : t('unknownCustomer');

  const statusConfig = getStatusConfig(t);
  const statusInfo = statusConfig[conversation?.status as keyof typeof statusConfig] || statusConfig.open;
  const StatusIcon = statusInfo.icon;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button onClick={loadConversation} variant="outline">
          {t('retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gradient-to-r from-purple-200/20 via-blue-200/20 to-green-200/20 dark:from-purple-900/20 dark:via-blue-900/20 dark:to-green-900/20 bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl sticky top-0 z-10 shadow-sm">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-200 bg-clip-text text-transparent">{customerName}</h3>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              'h-9 w-9 p-0 transition-all duration-200',
              copilotOpen 
                ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg shadow-purple-500/50' 
                : 'hover:bg-purple-50 dark:hover:bg-purple-950/50 hover:scale-105'
            )}
            onClick={() => setCopilotOpen(!copilotOpen)}
            title="GLAVAI Copilot"
          >
            <Sparkles className={cn('h-4 w-4', copilotOpen && 'animate-pulse')} />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 hover:bg-green-50 dark:hover:bg-green-950/50 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
            onClick={() => {
              setCallType('voice');
              setShowCallModal(true);
            }}
            disabled={!conversation?.customer?.phone && conversation?.channel?.type !== 'whatsapp'}
            title={conversation?.customer?.phone ? t('startVoiceCall') : t('phoneNumberRequired')}
          >
            <Phone className="h-4 w-4 text-green-600 dark:text-green-400" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-9 w-9 p-0 hover:bg-blue-50 dark:hover:bg-blue-950/50 hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:hover:scale-100"
            onClick={() => {
              setCallType('video');
              setShowCallModal(true);
            }}
            disabled={conversation?.channel?.type === 'phone' || conversation?.channel?.type === 'sms'}
            title={conversation?.channel?.type === 'phone' || conversation?.channel?.type === 'sms' ? t('videoCallUnavailable') : t('startVideoCall')}
          >
            <Video className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </Button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleUpdateStatus('open')}>
                <Clock className="h-4 w-4 mr-2" />
                {t('markAsOpen')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('resolved')}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('markAsResolved')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleUpdateStatus('closed')}>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t('closeConversation')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="h-4 w-4 mr-2" />
                {t('assignToAgent')}
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Tag className="h-4 w-4 mr-2" />
                {t('addTags')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 bg-background" ref={scrollRef}>
        <div className="py-4">
          {/* Customer Intro Section */}
          {conversation?.customer && (
            <div className="px-4 mb-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-gradient-to-br from-slate-50/50 to-white/50 dark:from-slate-900/50 dark:to-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-sm">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold flex-shrink-0 shadow-lg shadow-green-500/30 ring-2 ring-white/50 dark:ring-slate-900/50">
                  {customerName[0]?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">{customerName}</h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    {t('testContactIntro', { name: user?.firstName || 'user' })}
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-xs hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 dark:hover:from-green-950/50 dark:hover:to-emerald-950/50 transition-all duration-200"
                  >
                    {t('viewDetails')}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Call History */}
          {callHistory.length > 0 && (
            <div className="px-4 mb-4">
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase">{t('recentCalls')}</h4>
                {callHistory.slice(0, 3).map((call) => {
                  const duration = call.endedAt && call.startedAt
                    ? Math.floor((new Date(call.endedAt).getTime() - new Date(call.startedAt).getTime()) / 1000)
                    : null;
                  const formatDuration = (secs: number) => {
                    const mins = Math.floor(secs / 60);
                    const s = secs % 60;
                    return `${mins}:${s.toString().padStart(2, '0')}`;
                  };
                  return (
                    <div key={call.id} className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-br from-slate-50/80 to-white/80 dark:from-slate-900/80 dark:to-slate-800/80 border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-200">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center",
                        call.type === 'video' 
                          ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30' 
                          : 'bg-gradient-to-br from-green-500 to-green-600 shadow-lg shadow-green-500/30'
                      )}>
                        {call.type === 'video' ? (
                          <Video className="h-4 w-4 text-white" />
                        ) : (
                          <Phone className="h-4 w-4 text-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold">
                          {call.type === 'video' ? t('videoCall') : t('voiceCall')}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(call.startedAt).toLocaleString()} • {duration ? formatDuration(duration) : t('inProgress')}
                        </p>
                      </div>
                      <Badge 
                        variant={call.status === 'active' ? 'default' : 'secondary'} 
                        className={cn(
                          "text-xs",
                          call.status === 'active' && 'bg-gradient-to-r from-green-500 to-emerald-500 shadow-sm'
                        )}
                      >
                        {call.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Date Separator */}
          {messages.length > 0 && (
            <div className="px-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {new Date(messages[0]?.createdAt || Date.now()).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          )}

          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-12 text-center px-4">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <User className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{t('noMessages')}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t('startConversation')}
              </p>
            </div>
          ) : (
            <div className="px-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id}>
              <MessageBubble
                id={msg.id}
                content={msg.content}
                senderType={msg.senderType}
                senderName={
                  msg.sender
                    ? `${msg.sender.firstName || ''} ${msg.sender.lastName || ''}`.trim() ||
                      msg.sender.email
                    : undefined
                }
                timestamp={new Date(msg.createdAt)}
                isInternalNote={msg.isInternalNote}
                reactions={msg.reactions}
                audioUrl={msg.audioUrl}
                audioDuration={msg.audioDuration}
                currentUserId={user?.id}
                onReact={(emoji) => handleReactToMessage(msg.id, emoji)}
              />
                  {/* Channel indicator */}
                  {msg.senderType === 'customer' && (
                    <div className="flex items-center gap-1.5 mt-1 ml-14">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('testingChannel')}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Testing Banner */}
          {conversation?.customer && (
            <div className="px-4 mt-6">
              <div className="bg-muted/50 rounded-lg p-3 flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {t('testingChannelBanner')}
                </p>
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  {t('deleteTest')}
                </Button>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Message Composer */}
      <MessageComposer
        conversationId={conversationId}
        onSendMessage={handleSendMessage}
        disabled={sending}
        channelType={conversation?.channel?.type}
      />

      {/* Call Modal */}
      {showCallModal && (
        <CallModal
          open={showCallModal}
          onOpenChange={(open) => {
            setShowCallModal(open);
            if (!open) {
              // Reload call history when modal closes
              callsApi.list({ conversationId }).then((calls) => {
                setCallHistory(calls || []);
              }).catch(() => {});
            }
          }}
          conversationId={conversationId}
          customerName={customerName}
          customerPhone={conversation?.customer?.phone || undefined}
          channelType={conversation?.channel?.type}
          callType={callType}
        />
      )}

      {/* GLAVAI Copilot Panel */}
      <GlavaiCopilotPanel
        conversationId={conversationId}
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        onInsertResponse={(text) => {
          // Insert text into message composer (would need to expose composer ref or callback)
          console.log('Insert response:', text);
        }}
      />
    </div>
  );
}
