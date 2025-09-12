'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { 
  Conversation, 
  ConversationFilters, 
  UnifiedInboxResponse,
  SendMessagePayload 
} from '@/types/conversations';
import { Loader2 } from 'lucide-react';
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Instagram, 
  Clock, 
  User, 
  AlertTriangle,
  TrendingUp,
  Search,
  Send,
  Paperclip,
  Smile,
  Zap,
  PhoneCall,
  Video,
  MoreHorizontal,
  Star,
  Archive,
  Trash2,
  Filter,
  Settings,
  Bell,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { io, Socket } from 'socket.io-client';
import { callsApi } from '@/lib/api/calls-client';
import { conversationsApi } from '@/lib/api/conversations-client';
import { Link } from '@/i18n.config';
import { CallPanel } from '@/components/calls/call-panel';
import { knowledgeApi } from '@/lib/api/knowledge-client';



interface UnifiedInboxProps {
  className?: string;
}

const channelIcons = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  email: Mail,
  web: MessageSquare,
  voice: Phone,
  video: Phone
};

const priorityColors = {
  low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  critical: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
};

const statusColors = {
  active: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  waiting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  closed: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
};

export function UnifiedInbox({ className }: UnifiedInboxProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [messageInput, setMessageInput] = useState('');
  const [callId, setCallId] = useState<string | null>(null);
  const [kbSuggestions, setKbSuggestions] = useState<{ articles: { id: string; title: string; snippet: string }[]; faqs: { id: string; question: string; answer: string }[] }>({ articles: [], faqs: [] });
  const callsSocketRef = React.useRef<Socket | null>(null);

  useEffect(() => {
    const authStorage = typeof window !== 'undefined' ? window.localStorage.getItem('auth-storage') : null;
    const token = authStorage ? (JSON.parse(authStorage)?.state?.tokens?.accessToken as string | undefined) : undefined;
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/?$/, '');
    const socket = io(`${base}/calls`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      autoConnect: false,
    });
    callsSocketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  // Suggest KB based on last message
  useEffect(() => {
    let cancelled = false;
    async function run() {
      const seed = selectedConversation?.lastMessage?.content || '';
      if (!seed) { if (!cancelled) setKbSuggestions({ articles: [], faqs: [] }); return; }
      try {
        const data = await knowledgeApi.suggest(seed);
        if (!cancelled) setKbSuggestions({
          articles: (data.articles || []).slice(0, 3),
          faqs: (data.faqs || []).slice(0, 2),
        });
      } catch {
        if (!cancelled) setKbSuggestions({ articles: [], faqs: [] });
      }
    }
    run();
    return () => { cancelled = true; };
  }, [selectedConversation?.lastMessage?.content]);

  // Load inbox from backend
  useEffect(() => {
    let isCancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const resp = await conversationsApi.getUnifiedInbox({
          search: searchQuery,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          channel: channelFilter !== 'all' ? channelFilter : undefined,
          priority: priorityFilter !== 'all' ? priorityFilter : undefined,
          page: 1,
          limit: 50
        });
        
        if (!resp.success || !resp.data) {
          if (!isCancelled) {
            setError(resp.error || 'Failed to load conversations');
            setConversations([]);
          }
          return;
        }
        
        const items = resp.data.conversations || [];
        const mapped: Conversation[] = items.map((c: any) => ({
          id: c.id,
          customerId: c.customerId,
          customer: {
            id: c.customer.id,
            firstName: c.customer.firstName,
            lastName: c.customer.lastName,
            email: c.customer.email,
            phone: c.customer.phone,
            company: c.customer.company,
          },
          channel: {
            id: c.channel.id,
            name: c.channel.name,
            type: c.channel.type,
          },
          subject: c.subject || 'No Subject',
          status: c.status,
          priority: c.priority || 'medium',
          assignedAgentId: c.assignedAgentId,
          ticketId: c.ticketId,
          tags: c.tags || [],
          lastMessage: c.lastMessage ? {
            id: c.lastMessage.id,
            content: c.lastMessage.content,
            senderType: c.lastMessage.senderType,
            messageType: c.lastMessage.messageType,
            createdAt: c.lastMessage.createdAt,
          } : null,
          messageCount: c.messageCount || 0,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
          aiInsights: c.aiInsights ? {
            sentimentScore: c.aiInsights.sentimentScore || 0,
            urgencyLevel: c.aiInsights.urgencyLevel || 'medium',
            estimatedResolutionTime: c.aiInsights.estimatedResolutionTime || 0,
            suggestedActions: Array.isArray(c.aiInsights.suggestedActions) ? c.aiInsights.suggestedActions.join(', ') : (c.aiInsights.suggestedActions || 'respond'),
          } : { sentimentScore: 0, urgencyLevel: 'medium', estimatedResolutionTime: 0, suggestedActions: 'respond' },
        }));
        if (!isCancelled) {
          setConversations(mapped);
          setSelectedConversation(mapped[0] || null);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
          setError(errorMessage);
          setConversations([]);
          console.error('Error loading inbox data:', err);
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }
    load();
    return () => { isCancelled = true; };
  }, [searchQuery, statusFilter, channelFilter, priorityFilter]);

  const filteredConversations = conversations.filter(conv => {
    const matchesSearch = !searchQuery || 
      conv.customer.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.customer.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.subject?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conv.lastMessage?.content.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || conv.status === statusFilter;
    const matchesChannel = channelFilter === 'all' || conv.channel.type === channelFilter;
    const matchesPriority = priorityFilter === 'all' || conv.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesChannel && matchesPriority;
  });

  const getSentimentColor = (score: number) => {
    if (score > 0.3) return 'text-green-600';
    if (score < -0.3) return 'text-red-600';
    return 'text-yellow-600';
  };

  const getSentimentIcon = (score: number) => {
    if (score > 0.3) return '😊';
    if (score < -0.3) return '😟';
    return '😐';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;
    
    try {
      setSendingMessage(true);
      const response = await conversationsApi.sendMessage(selectedConversation.id, { content: messageInput.trim(), messageType: 'text' });
      if (response.success) {
        setMessageInput('');
        // Message sent successfully
      } else {
        setError(response.error || 'Failed to send message');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      console.error('Failed to send message', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const startCall = async (type: 'voice' | 'video') => {
    if (!selectedConversation) return;
    try {
      const call = await callsApi.create({ conversationId: selectedConversation.id, type });
      const realId = call?.id;
      if (!realId) return;
      setCallId(realId);
      if (!callsSocketRef.current?.connected) {
        callsSocketRef.current?.connect();
      }
      callsSocketRef.current?.emit('join-call', { callId: realId });
    } catch (e) {
      console.error('startCall failed', e);
    }
  };

  const leaveCall = async () => {
    if (callId) {
      callsSocketRef.current?.emit('leave-call', { callId });
      try {
        await callsApi.end(callId);
      } catch (e) {
        console.error('end call failed', e);
      }
    }
    setCallId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm text-gray-500">Loading conversations...</p>
        </div>
      </div>
    );
  }

  if (error) {
     return (
       <div className="p-6">
         <Alert variant="destructive">
           <AlertTriangle className="h-4 w-4" />
           <AlertDescription className="flex items-center justify-between">
             <span>{error}</span>
             <Button 
               variant="ghost" 
               size="sm" 
               onClick={() => setError(null)}
               className="h-auto p-1 text-red-600 hover:text-red-800"
             >
               ×
             </Button>
           </AlertDescription>
         </Alert>
       </div>
     );
   }

  return (
    <div className={cn("h-full flex flex-col bg-gray-50/50", className)}>
      {/* Modern Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Your Inbox</h1>
              <p className="text-sm text-gray-500 mt-1">Manage all conversations from one place</p>
            </div>
            <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5">
              <Zap className="h-3.5 w-3.5" />
              AI Enabled
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
            <Link href="/tickets">
              <Button size="sm" className="gap-2">
                <Archive className="h-4 w-4" />
                View Tickets
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Modern Conversation List */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Enhanced Filters */}
          <div className="p-4 border-b border-gray-100 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Conversations</h2>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white"
              />
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={channelFilter} onValueChange={setChannelFilter}>
                <SelectTrigger className="flex-1 h-9">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Channels</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="web">Web</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Enhanced Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {loading && (
              <div className="flex items-center justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              </div>
            )}
            {error && (
               <div className="p-4">
                 <Alert variant="destructive">
                   <AlertTriangle className="h-4 w-4" />
                   <AlertDescription className="text-sm flex items-center justify-between">
                     <span>{error}</span>
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       onClick={() => setError(null)}
                       className="h-auto p-1 text-red-600 hover:text-red-800 ml-2"
                     >
                       ×
                     </Button>
                   </AlertDescription>
                 </Alert>
               </div>
             )}
            {filteredConversations.map((conversation) => {
              const ChannelIcon = channelIcons[conversation.channel.type];
              const isSelected = selectedConversation?.id === conversation.id;
              
              return (
                <div
                  key={conversation.id}
                  className={cn(
                    "p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-all duration-200",
                    isSelected && "bg-blue-50 border-r-4 border-r-blue-500 hover:bg-blue-50"
                  )}
                  onClick={() => setSelectedConversation(conversation)}
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      <Avatar className="h-11 w-11 ring-2 ring-white shadow-sm">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                          {conversation.customer.firstName?.[0] || conversation.customer.email?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                        <ChannelIcon className="h-3 w-3 text-gray-600" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {conversation.customer.firstName && conversation.customer.lastName
                            ? `${conversation.customer.firstName} ${conversation.customer.lastName}`
                            : conversation.customer.email || conversation.customer.phone || 'Unknown Customer'}
                        </h3>
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-500">
                            {formatTimeAgo(conversation.updatedAt)}
                          </span>
                          {conversation.aiInsights.urgencyLevel === 'high' && (
                            <AlertTriangle className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                      </div>

                      {conversation.subject && (
                        <p className="text-sm font-medium text-gray-600 mb-1 truncate">
                          {conversation.subject}
                        </p>
                      )}

                      {conversation.lastMessage && (
                        <p className="text-sm text-gray-500 truncate mb-3">
                          {conversation.lastMessage.senderType === 'agent' && 'You: '}
                          {conversation.lastMessage.content}
                        </p>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs px-2 py-0.5 font-medium border-0",
                              conversation.status === 'active' ? 'bg-green-100 text-green-700' :
                              conversation.status === 'waiting' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-gray-100 text-gray-700'
                            )}
                          >
                            {conversation.status === 'active' ? 'Active' : 
                             conversation.status === 'waiting' ? 'Waiting' : 'Closed'}
                          </Badge>
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs px-2 py-0.5 font-medium border-0",
                              conversation.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              conversation.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              conversation.priority === 'medium' ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            )}
                          >
                            {conversation.priority === 'critical' ? 'Critical' :
                             conversation.priority === 'high' ? 'High' :
                             conversation.priority === 'medium' ? 'Medium' : 'Low'}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400">
                            {conversation.messageCount}
                          </span>
                          <span className="text-sm" title={`Sentiment: ${(conversation.aiInsights.sentimentScore ?? 0).toFixed(2)}`}>
                            {getSentimentIcon(conversation.aiInsights.sentimentScore ?? 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Enhanced Conversation Detail */}
        <div className="flex-1 flex flex-col bg-white">
          {selectedConversation ? (
            <>
              {/* Modern Conversation Header */}
              <div className="border-b border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 ring-2 ring-white shadow-lg">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-lg">
                        {selectedConversation.customer.firstName?.[0] || selectedConversation.customer.email?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {selectedConversation.customer.firstName && selectedConversation.customer.lastName
                          ? `${selectedConversation.customer.firstName} ${selectedConversation.customer.lastName}`
                          : selectedConversation.customer.email || selectedConversation.customer.phone || 'Unknown Customer'}
                      </h2>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-gray-500">
                          {selectedConversation.channel.name}
                        </span>
                        <span className="text-gray-300">•</span>
                        <span className="text-sm text-gray-500">
                          {selectedConversation.messageCount} messages
                        </span>
                        {selectedConversation.customer.company && (
                          <>
                            <span className="text-gray-300">•</span>
                            <span className="text-sm text-gray-500">
                              {selectedConversation.customer.company}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="sm" className="gap-2">
                      <User className="h-4 w-4" />
                      Assign Agent
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => startCall('voice')}>
                      <PhoneCall className="h-4 w-4" />
                      Call
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => startCall('video')}>
                      <Video className="h-4 w-4" />
                      Video
                    </Button>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Enhanced AI Insights */}
                <div className="mt-6">
                  <Card className="border-gray-200">
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <h3 className="font-medium text-gray-900">AI Insights</h3>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-600">Sentiment:</span>
                            <span className={cn(
                              "font-medium",
                              (selectedConversation.aiInsights.sentimentScore ?? 0) > 0.3 ? 'text-green-600' :
                (selectedConversation.aiInsights.sentimentScore ?? 0) < -0.3 ? 'text-red-600' :
                              'text-yellow-600'
                            )}>
                              {getSentimentIcon(selectedConversation.aiInsights.sentimentScore ?? 0)}
              {(selectedConversation.aiInsights.sentimentScore ?? 0) > 0 ? 'Positive' :
               (selectedConversation.aiInsights.sentimentScore ?? 0) < 0 ? 'Negative' : 'Neutral'}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Est. Resolution:</span>
                          <span className="font-medium text-gray-900">{selectedConversation.aiInsights.estimatedResolutionTime}m</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-600">Suggested:</span>
                          <span className="font-medium text-gray-900">{
                            selectedConversation.aiInsights.suggestedActions?.includes('escalate') ? 'Escalate' :
            selectedConversation.aiInsights.suggestedActions?.includes('respond') ? 'Respond' : 'Close'
                          }</span>
                        </div>
                      </div>
                      
                      {(kbSuggestions.articles.length > 0 || kbSuggestions.faqs.length > 0) && (
                        <>
                          <Separator className="my-4" />
                          <div>
                            <h4 className="font-medium text-gray-900 mb-2">Knowledge Base Suggestions</h4>
                            <div className="space-y-2">
                              {kbSuggestions.articles.map(a => (
                                <div key={`a_${a.id}`} className="p-2 bg-gray-50 rounded-md">
                                  <div className="font-medium text-sm text-gray-900">{a.title}</div>
                                  <div className="text-xs text-gray-600 mt-1">{a.snippet}</div>
                                </div>
                              ))}
                              {kbSuggestions.faqs.map(f => (
                                <div key={`f_${f.id}`} className="p-2 bg-gray-50 rounded-md">
                                  <div className="font-medium text-sm text-gray-900">{f.question}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>
                {callId && (
                  <div className="mt-4">
                    <Card className="border-red-200 bg-red-50">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></div>
                            <span className="font-medium text-red-900">Call in Progress</span>
                            <span className="text-sm text-red-700">({callId})</span>
                          </div>
                          <Button size="sm" variant="destructive" onClick={leaveCall}>
                            End Call
                          </Button>
                        </div>
                        <CallPanel callId={callId} isCaller onEnd={() => setCallId(null)} />
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              {/* Enhanced Messages Area */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                <div className="space-y-4 max-w-4xl mx-auto">
                  {/* Customer Message */}
                  {selectedConversation.lastMessage && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3 max-w-[75%]">
                        <Avatar className="h-8 w-8 mt-1">
                          <AvatarFallback className="bg-gray-200 text-gray-600 text-sm">
                            {selectedConversation.customer.firstName?.[0] || 'C'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-md p-4 shadow-sm">
                          <p className="text-sm text-gray-900 leading-relaxed">{selectedConversation.lastMessage.content}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-gray-500">
                              {formatTimeAgo(selectedConversation.lastMessage.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Agent Message */}
                  <div className="flex justify-end">
                    <div className="flex items-start gap-3 max-w-[75%]">
                      <div className="bg-blue-500 text-white rounded-2xl rounded-tr-md p-4 shadow-sm">
                        <p className="text-sm leading-relaxed">Thank you for reaching out. I&apos;ll review your request and get back to you shortly.</p>
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <span className="text-xs text-blue-100">
                            10 minutes ago
                          </span>
                          <div className="flex items-center gap-1">
                            <div className="h-1 w-1 bg-blue-200 rounded-full"></div>
                            <div className="h-1 w-1 bg-blue-200 rounded-full"></div>
                          </div>
                        </div>
                      </div>
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-blue-100 text-blue-600 text-sm">
                          A
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </div>

                  {/* System Message */}
                  <div className="flex justify-center">
                    <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
                      Conversation started • {formatTimeAgo(selectedConversation.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Enhanced Message Input */}
              <div className="border-t border-gray-200 bg-white p-4">
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-end gap-3">
                    <div className="flex items-center gap-2">
                      <label className="inline-flex">
                        <input type="file" multiple className="hidden" onChange={async (e) => {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          const channel = selectedConversation?.channel.type || 'web';
                          const maxSize = channel === 'whatsapp' ? 16 * 1024 * 1024 : channel === 'instagram' ? 8 * 1024 * 1024 : 25 * 1024 * 1024;
                          const allowed: Record<string,string[]> = {
                            whatsapp: ['image/','video/','audio/','application/pdf','application/msword','application/vnd'],
                            instagram: ['image/','video/'],
                            email: ['image/','video/','audio/','application/','text/'],
                            web: ['image/','video/','audio/','application/','text/']
                          };
                          const types = allowed[channel] || allowed.web;
                          try {
                            const uploaded: Array<{ url: string; filename: string }> = [];
                            for (const f of files) {
                              if (f.size > maxSize || !types.some(t => f.type.startsWith(t) || f.type === t)) continue;
                              const form = new FormData();
                              form.append('file', f);
                              const resp = await fetch((process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001') + '/files/upload', {
                                method: 'POST',
                                body: form,
                                credentials: 'include'
                              });
                              const data = await resp.json();
                              if (resp.ok) uploaded.push({ url: data.url, filename: f.name });
                            }
                            if (uploaded.length && selectedConversation) {
                              await conversationsApi.sendMessage(selectedConversation.id, {
                                content: messageInput || '',
                                messageType: 'image',
                                attachments: []
                              });
                              setMessageInput('');
                            }
                          } catch {
                            // ignore
                          }
                        }} />
                        <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                          <Paperclip className="h-4 w-4 text-gray-500" />
                        </Button>
                      </label>
                      <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                        <Smile className="h-4 w-4 text-gray-500" />
                      </Button>
                    </div>
                    
                    <div className="flex-1 relative">
                      <Input
                        placeholder={selectedConversation?.channel.type === 'whatsapp' ? 'Type or select WhatsApp template...' : 'Type your message...'}
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[44px] pr-12 resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                      />
                      <Button 
                        onClick={handleSendMessage} 
                        disabled={!messageInput.trim() || sendingMessage}
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      >
                        {sendingMessage ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    
                    {selectedConversation?.channel.type === 'whatsapp' && (
                      <Select onValueChange={async (v) => {
                      if (!selectedConversation || sendingMessage) return;
                      try {
                        setSendingMessage(true);
                        const response = await conversationsApi.sendMessage(selectedConversation.id, { content: '', messageType: 'template', templateId: v });
                        if (!response.success) {
                          setError(response.error || 'Failed to send template message');
                        }
                      } catch (err) {
                        const errorMessage = err instanceof Error ? err.message : 'Failed to send template message';
                        setError(errorMessage);
                        console.error('Failed to send template message', err);
                      } finally {
                        setSendingMessage(false);
                      }
                    }}>
                        <SelectTrigger className="w-[140px] h-11">
                          <SelectValue placeholder="Templates" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="order_update">Order Update</SelectItem>
                          <SelectItem value="support_followup">Support Follow-up</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
              <div className="text-center">
                <div className="bg-white rounded-full p-6 shadow-sm mb-6 mx-auto w-fit">
                  <MessageSquare className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a conversation</h3>
                <p className="text-gray-500 max-w-sm mx-auto">Choose a conversation from the list to start messaging with your customers</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}