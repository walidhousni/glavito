'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  
  Users,
  
  Mail, 
  Phone, 
  
  Clock, 
  Tag as TagIcon,
  MessageSquare,
  FileText,
  
  AlertTriangle,
  CheckCircle,
  Edit,
  UserPlus,
  
  Zap,
  Activity,
  
  Download,
  ExternalLink,
  Bot,
  
  ThumbsUp,
  ThumbsDown,
  Meh,
  Book,
  Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ticketsApi } from '@/lib/api/tickets-client';
import { useTicketsWebSocket } from '@/lib/hooks/use-tickets-websocket';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useAuthStore } from '@/lib/store/auth-store';
import { knowledgeApi } from '@/lib/api/knowledge-client';
import { useToast } from '@/components/ui/toast';

type Person = {
  id?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  type?: string;
};

type ConversationMessage = {
  id: string;
  content: string;
  sender: Person;
  createdAt: string;
  attachments: unknown[];
};

type Conversation = {
  id: string;
  messages: ConversationMessage[];
};

type TimelineEvent = {
  id: string;
  eventType: 'created' | 'assigned' | 'status_changed' | 'note_added' | string;
  description: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
};

type SlaInstance = {
  status: string;
  firstResponseDue?: string;
  firstResponseAt?: string | null;
  resolutionDue?: string;
  resolutionAt?: string | null;
  breachCount: number;
};

type AIAnalysis = {
  classification?: string;
  sentiment?: string;
  urgencyScore?: number;
  priority?: string;
  suggestedActions?: string[];
  keyEntities?: Array<{ type: string; value: string }>;
  confidence?: number;
};

type TicketModel = {
  id: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  dueDate?: string;
  tags: string[];
  customFields?: Record<string, string>;
  customer?: Person & { company?: string };
  channel?: { id: string; name: string; type: string };
  assignedAgent?: Person;
  team?: { id: string; name: string };
  conversations: Conversation[];
  timelineEvents: TimelineEvent[];
  aiAnalysis?: AIAnalysis | null;
  slaInstance?: SlaInstance;
};

interface TicketDetailsDialogProps {
  ticketId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailsDialog({ ticketId, open, onOpenChange }: TicketDetailsDialogProps) {
  const t = useTranslations('tickets');
  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketModel | null>(null);
  const { user } = useAuthStore();
  const [noteText, setNoteText] = useState('');
  const [notePrivate, setNotePrivate] = useState(true);
  const [tagText, setTagText] = useState('');
  const [saving, setSaving] = useState(false);
  const [kbSuggestions, setKbSuggestions] = useState<Array<{ id: string; title: string; snippet: string }>>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [tab, setTab] = useState<'conversation' | 'timeline' | 'ai-insights'>('conversation');
  const noteRef = React.useRef<HTMLTextAreaElement | null>(null);
  const { push } = useToast();
  const [notes, setNotes] = useState<Array<{ id: string; content: string; isPrivate: boolean; createdAt: string; user: { firstName: string; lastName: string } }>>([]);
  const [watchers, setWatchers] = useState<Array<{ userId: string; user: { id: string; firstName: string; lastName: string; email?: string; avatar?: string } }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  const safeFormatDate = (value?: string | Date | null, fallback = ''): string => {
    try {
      if (!value) return fallback;
      const d = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(d.getTime())) return fallback;
      return format(d, 'PPp');
    } catch {
      return fallback;
    }
  };

  // Load from API
  useEffect(() => {
    if (open && ticketId) {
      setLoading(true);
      (async () => {
        try {
          const data = await ticketsApi.get(ticketId);
          // Fallback demo fields if missing to keep UI stable
          const safe: TicketModel = {
            ...(data as TicketModel),
            conversations: Array.isArray((data as unknown as { conversations?: Conversation[] }).conversations) ? (data as { conversations?: Conversation[] }).conversations || [] : [],
            timelineEvents: Array.isArray((data as unknown as { timelineEvents?: TimelineEvent[] }).timelineEvents) ? (data as { timelineEvents?: TimelineEvent[] }).timelineEvents || [] : [],
            aiAnalysis: (data as unknown as { aiAnalysis?: AIAnalysis | null }).aiAnalysis ?? null,
          };
          setTicket(safe);
        } catch {
          // fallback to demo content if API not ready
          setTicket({
          id: ticketId,
          subject: 'Unable to access premium features after subscription upgrade',
          description: 'I upgraded my subscription to premium yesterday but I still cannot access the premium features. The billing shows the charge went through successfully. Please help resolve this issue as I need these features for my project deadline.',
          status: 'in_progress',
          priority: 'high',
          createdAt: '2024-01-15T10:30:00Z',
          updatedAt: '2024-01-15T14:20:00Z',
          dueDate: '2024-01-17T17:00:00Z',
          tags: ['billing', 'premium', 'urgent', 'subscription'],
          customFields: {
            subscriptionId: 'sub_1234567890',
            planType: 'premium',
            billingAmount: '$29.99'
          },
          customer: {
            id: '1',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john.doe@acme.com',
            phone: '+1-555-0123',
            company: 'Acme Corporation',
            avatar: undefined,
            
          },
          channel: {
            id: '1',
            name: 'Email Support',
            type: 'email'
          },
          assignedAgent: {
            id: '1',
            firstName: 'Alice',
            lastName: 'Wilson',
            email: 'alice@company.com',
            avatar: undefined
          },
          team: {
            id: '1',
            name: 'Technical Support'
          },
          conversations: [
            {
              id: '1',
              messages: [
                {
                  id: '1',
                  content: 'I upgraded my subscription to premium yesterday but I still cannot access the premium features.',
                  sender: {
                    id: '1',
                    firstName: 'John',
                    lastName: 'Doe',
                    type: 'customer'
                  },
                  createdAt: '2024-01-15T10:30:00Z',
                  attachments: []
                },
                {
                  id: '2',
                  content: 'Hi John, thank you for contacting us. I can see your subscription upgrade went through successfully. Let me check your account permissions and get this resolved for you.',
                  sender: {
                    id: '1',
                    firstName: 'Alice',
                    lastName: 'Wilson',
                    type: 'agent'
                  },
                  createdAt: '2024-01-15T11:15:00Z',
                  attachments: []
                },
                {
                  id: '3',
                  content: 'I\'ve refreshed your account permissions. Can you please try logging out and back in to see if you can access the premium features now?',
                  sender: {
                    id: '1',
                    firstName: 'Alice',
                    lastName: 'Wilson',
                    type: 'agent'
                  },
                  createdAt: '2024-01-15T11:20:00Z',
                  attachments: []
                }
              ]
            }
          ],
          timelineEvents: [
            {
              id: '1',
              eventType: 'created',
              description: 'Ticket created',
              createdAt: '2024-01-15T10:30:00Z',
              user: {
                firstName: 'System',
                lastName: ''
              }
            },
            {
              id: '2',
              eventType: 'assigned',
              description: 'Ticket assigned to Alice Wilson',
              createdAt: '2024-01-15T10:45:00Z',
              user: {
                firstName: 'System',
                lastName: ''
              }
            },
            {
              id: '3',
              eventType: 'status_changed',
              description: 'Status changed from open to in_progress',
              createdAt: '2024-01-15T11:00:00Z',
              user: {
                firstName: 'Alice',
                lastName: 'Wilson'
              }
            },
            {
              id: '4',
              eventType: 'note_added',
              description: 'Internal note added: Checked billing system - payment processed correctly',
              createdAt: '2024-01-15T11:10:00Z',
              user: {
                firstName: 'Alice',
                lastName: 'Wilson'
              }
            }
          ],
          aiAnalysis: {
            classification: 'billing_issue',
            sentiment: 'frustrated',
            urgencyScore: 0.8,
            priority: 'high',
            suggestedActions: [
              'Check account permissions',
              'Verify subscription status',
              'Escalate to billing team if needed'
            ],
            keyEntities: [
              { type: 'subscription_id', value: 'sub_1234567890' },
              { type: 'plan_type', value: 'premium' },
              { type: 'amount', value: '$29.99' }
            ],
            confidence: 0.92
          },
          slaInstance: {
            status: 'active',
            firstResponseDue: '2024-01-15T14:30:00Z',
            firstResponseAt: '2024-01-15T11:15:00Z',
            resolutionDue: '2024-01-17T10:30:00Z',
            resolutionAt: null,
            breachCount: 0
          }
          });
        }
        setLoading(false);
      })();
    }
  }, [open, ticketId]);

  // Load knowledge suggestions from ticket content
  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!open) return;
      const text = `${ticket?.subject || ''}\n\n${ticket?.description || ''}`.trim();
      if (!text && !selectedText) return;
      setKbLoading(true);
      try {
        if (selectedText && selectedText.length > 10) {
          const res = await knowledgeApi.suggest(selectedText);
          if (!cancelled) setKbSuggestions(res.articles || []);
        } else {
          const res = await knowledgeApi.search(text, 5, { semantic: true });
          if (!cancelled) setKbSuggestions(res.articles || []);
        }
      } catch {
        if (!cancelled) setKbSuggestions([]);
      } finally {
        if (!cancelled) setKbLoading(false);
      }
    }
    run();
    return () => { cancelled = true };
  }, [open, ticket?.subject, ticket?.description, selectedText]);

  // Realtime updates
  const { emitTyping } = useTicketsWebSocket({
    ticketId: ticketId,
    onEvent: ({ type, payload }) => {
      if (!ticket || payload.ticketId !== (ticket as TicketModel).id) return;
      if (type === 'ticket.updated') {
        setTicket((prev) => ({ ...(prev as TicketModel), ...(payload.changes as Partial<TicketModel>) }));
      }
      if (type === 'ticket.assigned' || type === 'ticket.auto_assigned') {
        setTicket((prev) => ({ ...(prev as TicketModel), assignedAgentId: payload.assignedAgentId, status: payload.status || (prev as TicketModel).status }));
      }
      if (type === 'ticket.resolved') {
        setTicket((prev) => ({ ...(prev as TicketModel), status: 'resolved', resolvedAt: new Date().toISOString() }));
      }
      if (type === 'ticket.reopened') {
        setTicket((prev) => ({ ...(prev as TicketModel), status: 'open', resolvedAt: null }));
      }
      if (type === 'ticket.note_added') {
        // Optimistically append to timeline; real UI could refetch timeline
        setTicket((prev) => ({
          ...(prev as TicketModel),
          timelineEvents: [
            { id: payload.noteId, eventType: 'note_added', description: 'Note added', createdAt: new Date().toISOString(), user: { firstName: 'You', lastName: '' } },
            ...(((prev as TicketModel).timelineEvents) || [])
          ]
        }));
        // Refresh notes
        void ticketsApi.listNotes(ticketId, 50).then((rows) => setNotes(rows || []));
      }
      if (type === 'ticket.watcher_added' || type === 'ticket.watcher_removed') {
        void ticketsApi.listWatchers(ticketId).then((rows) => setWatchers(rows || []));
      }
      if (type === 'ticket.typing') {
        setIsTyping(Boolean(payload?.isTyping));
        // Reset typing indicator after a short delay
        setTimeout(() => setIsTyping(false), 2000);
      }
    }
  });

  useEffect(() => {
    let cancelled = false;
    async function loadCollab() {
      try {
        const [notesRes, watchersRes] = await Promise.all([
          ticketsApi.listNotes(ticketId, 50),
          ticketsApi.listWatchers(ticketId),
        ]);
        if (!cancelled) {
          setNotes(notesRes || []);
          setWatchers(watchersRes || []);
        }
      } catch { /* noop */ }
    }
    if (open) loadCollab();
    return () => { cancelled = true };
  }, [open, ticketId]);

  const handleAddNote = async () => {
    if (!user || !noteText.trim()) return;
    try {
      setSaving(true);
      if (!ticket) return;
      await ticketsApi.addNote(ticket.id, {
        content: noteText.trim(),
        userId: user.id,
        tenantId: user.tenantId,
        isPrivate: notePrivate,
      });
      setNoteText('');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = async () => {
    if (!user || !tagText.trim()) return;
    try {
      setSaving(true);
      if (!ticket) return;
      await ticketsApi.updateTags(ticket.id, { add: [tagText.trim()], tenantId: user.tenantId });
      setTicket((prev) => ({ ...(prev as TicketModel), tags: Array.from(new Set([...(prev?.tags || []), tagText.trim()])) } as TicketModel));
      setTagText('');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveTag = async (tag: string) => {
    if (!user) return;
    try {
      setSaving(true);
      if (!ticket) return;
      await ticketsApi.updateTags(ticket.id, { remove: [tag], tenantId: user.tenantId });
      setTicket((prev) => ({ ...(prev as TicketModel), tags: (prev?.tags || []).filter((t) => t !== tag) } as TicketModel));
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  const getStatusColor = (
    status: 'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed' | string
  ) => {
    const colors: Record<'open' | 'in_progress' | 'waiting' | 'resolved' | 'closed', string> = {
      open: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      waiting: 'bg-orange-100 text-orange-800',
      resolved: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return (colors as Record<string, string>)[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (
    priority: 'low' | 'medium' | 'high' | 'urgent' | 'critical' | string
  ) => {
    const colors: Record<'low' | 'medium' | 'high' | 'urgent' | 'critical', string> = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      urgent: 'bg-red-100 text-red-800',
      critical: 'bg-red-200 text-red-900',
    };
    return (colors as Record<string, string>)[priority] || 'bg-gray-100 text-gray-800';
  };

  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return <ThumbsUp className="h-4 w-4 text-green-600" />;
      case 'negative':
        return <ThumbsDown className="h-4 w-4 text-red-600" />;
      case 'frustrated':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      default:
        return <Meh className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!ticket) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh]">
          <div className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">{t('ticketNotFound')}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] p-0">
        <div className="flex h-[90vh]">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            <DialogHeader className="p-6 pb-4 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <DialogTitle className="text-xl font-semibold mb-2">
                    {ticket.subject}
                  </DialogTitle>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span>#{ticket.id}</span>
                    <span>•</span>
                    <span>{t('createdOn')} {safeFormatDate(ticket.createdAt)}</span>
                    <span>•</span>
                    <span>{t('lastUpdated')} {safeFormatDate(ticket.updatedAt)}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    {t('edit')}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    {t('export')}
                  </Button>
                </div>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              <Tabs value={tab} onValueChange={(v) => setTab(v as 'conversation' | 'timeline' | 'ai-insights')} className="h-full flex flex-col">
                <div className="px-6 pt-4">
                  <TabsList>
                    <TabsTrigger value="conversation" className="flex items-center space-x-2">
                      <MessageSquare className="h-4 w-4" />
                      <span>{t('conversation')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="timeline" className="flex items-center space-x-2">
                      <Activity className="h-4 w-4" />
                      <span>{t('timeline')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="ai-insights" className="flex items-center space-x-2">
                      <Bot className="h-4 w-4" />
                      <span>{t('aiInsights')}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="conversation" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-4" onMouseUp={() => {
                        try {
                          const s = window.getSelection()?.toString()?.trim() || '';
                          if (s) setSelectedText(s);
                        } catch {
                          /* ignore */
                        }
                      }}>
                        {/* Initial Description */}
                        <Card>
                          <CardContent className="p-4">
                            <div className="flex items-start space-x-3">
                              <Avatar>
                                <AvatarImage src={ticket.customer?.avatar} />
                                <AvatarFallback>
                                  {ticket.customer?.firstName?.[0]}{ticket.customer?.lastName?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  <span className="font-medium">
                                    {ticket.customer?.firstName} {ticket.customer?.lastName}
                                  </span>
                                  <Badge variant="outline">{t('customer')}</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    {safeFormatDate(ticket.createdAt)}
                                  </span>
                                </div>
                                <div className="prose prose-sm max-w-none">
                                  <p>{ticket.description}</p>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Messages */}
                        {ticket.conversations[0]?.messages.map((message) => (
                          <Card key={message.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start space-x-3">
                                <Avatar>
                                  <AvatarImage src={message.sender.avatar} />
                                  <AvatarFallback>
                                    {message.sender.firstName?.[0]}{message.sender.lastName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <span className="font-medium">
                                      {message.sender.firstName} {message.sender.lastName}
                                    </span>
                                    <Badge 
                                      variant={message.sender.type === 'agent' ? 'default' : 'outline'}
                                    >
                                      {t(String(message.sender.type))}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {safeFormatDate(message.createdAt)}
                                    </span>
                                  </div>
                                  <div className="prose prose-sm max-w-none">
                                    <p>{message.content}</p>
                                  </div>
                                  <div className="flex justify-end mt-2">
                                    <Button variant="ghost" size="sm" onClick={() => { setNoteText((prev) => (prev ? prev + '\n\n' : '') + message.content); setTab('timeline'); setTimeout(() => noteRef.current?.focus(), 0); push(t('knowledge.insertedIntoNote') || 'Inserted into note', 'success'); }}>
                                      {t('knowledge.insertIntoNote') || 'Insert into note'}
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="timeline" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-4">
                        {/* Notes thread */}
                        {notes.length > 0 && (
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center justify-between">
                                <span>{t('notes') || 'Notes'}</span>
                                {isTyping && <span className="text-xs text-muted-foreground">{t('someoneTyping') || 'Someone is typing…'}</span>}
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              {notes.map((n) => (
                                <div key={n.id} className="p-3 rounded-lg border bg-background">
                                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{n.user.firstName} {n.user.lastName}</span>
                                    <span>{safeFormatDate(n.createdAt)}</span>
                                  </div>
                                  <div className="mt-2 text-sm whitespace-pre-wrap">{n.content}</div>
                                  {n.isPrivate && <Badge variant="secondary" className="mt-2 text-[10px]">{t('private') || 'Private'}</Badge>}
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        )}

                        {/* Timeline */}
                        {ticket.timelineEvents.map((event, index: number) => (
                          <div key={event.id} className="flex items-start space-x-3">
                            <div className="flex flex-col items-center">
                              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                                {event.eventType === 'created' && <FileText className="h-4 w-4" />}
                                {event.eventType === 'assigned' && <UserPlus className="h-4 w-4" />}
                                {event.eventType === 'status_changed' && <CheckCircle className="h-4 w-4" />}
                                {event.eventType === 'note_added' && <MessageSquare className="h-4 w-4" />}
                              </div>
                              {index < ticket.timelineEvents.length - 1 && (
                                <div className="w-px h-8 bg-border mt-2" />
                              )}
                            </div>
                            <div className="flex-1 pb-4">
                              <p className="text-sm">{event.description}</p>
                              <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
                                <span>{event.user.firstName} {event.user.lastName}</span>
                                <span>•</span>
                                <span>{safeFormatDate(event.createdAt)}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {/* Add note */}
                      <div className="mt-4 pt-4 border-t space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">{t('addNote')}</Label>
                          <div className="flex items-center space-x-2">
                            <Switch checked={notePrivate} onCheckedChange={setNotePrivate} id="note-private" />
                            <Label htmlFor="note-private" className="text-xs text-muted-foreground">
                              {notePrivate ? t('private') : t('public')}
                            </Label>
                          </div>
                        </div>
                        <Textarea
                          placeholder={t('notePlaceholder')}
                          value={noteText}
                          onChange={(e) => { setNoteText(e.target.value); emitTyping(true); }}
                          ref={noteRef}
                        />
                        <div className="flex justify-end">
                          <Button size="sm" disabled={saving || !noteText.trim()} onClick={handleAddNote}>
                            {t('addNote')}
                          </Button>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="ai-insights" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-6">
                        {/* AI Analysis Overview */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Bot className="h-5 w-5" />
                              <span>{t('aiAnalysis.overview')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('aiAnalysis.classification')}</Label>
                                <Badge variant="outline" className="w-fit">
                                  {(ticket.aiAnalysis?.classification || '').replace('_', ' ')}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('aiAnalysis.sentiment')}</Label>
                                <div className="flex items-center space-x-2">
                                  {getSentimentIcon(ticket.aiAnalysis?.sentiment || '')}
                                  <span className="text-sm capitalize">{ticket.aiAnalysis?.sentiment}</span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('aiAnalysis.urgencyScore')}</Label>
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div 
                                      className={cn(
                                        "h-2 rounded-full",
                                        (ticket.aiAnalysis?.urgencyScore || 0) > 0.7 ? "bg-red-500" :
                                        (ticket.aiAnalysis?.urgencyScore || 0) > 0.4 ? "bg-orange-500" : "bg-green-500"
                                      )}
                                      style={{ width: `${(ticket.aiAnalysis?.urgencyScore || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {Math.round((ticket.aiAnalysis?.urgencyScore || 0) * 100)}%
                                  </span>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="text-sm font-medium">{t('aiAnalysis.confidence')}</Label>
                                <div className="flex items-center space-x-2">
                                  <div className="flex-1 bg-muted rounded-full h-2">
                                    <div 
                                      className="h-2 rounded-full bg-blue-500"
                                      style={{ width: `${(ticket.aiAnalysis?.confidence || 0) * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">
                                    {Math.round((ticket.aiAnalysis?.confidence || 0) * 100)}%
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Suggested Actions */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Zap className="h-5 w-5" />
                              <span>{t('aiAnalysis.suggestedActions')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {(ticket.aiAnalysis?.suggestedActions || []).map((action: string, index: number) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                  <span className="text-sm">{action}</span>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Key Entities */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <TagIcon className="h-5 w-5" />
                              <span>{t('aiAnalysis.keyEntities')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2">
                              {(ticket.aiAnalysis?.keyEntities || []).map((entity: { type: string; value: string }, index: number) => (
                                <div key={index} className="flex items-center justify-between">
                                  <span className="text-sm text-muted-foreground capitalize">
                                    {entity.type.replace('_', ' ')}:
                                  </span>
                                  <Badge variant="secondary">{entity.value}</Badge>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Sidebar */}
          <div className="w-80 border-l bg-muted/30">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Status & Priority */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('details.status')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('statusLabel')}:</span>
                      <Badge className={getStatusColor(ticket.status)}>
                        {t(`status.${ticket.status}`)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{t('priorityLabel')}:</span>
                      <Badge className={getPriorityColor(ticket.priority)}>
                        {t(`priority.${ticket.priority}`)}
                      </Badge>
                    </div>
                    {ticket.dueDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('dueDate')}:</span>
                        <span className="text-sm">{safeFormatDate(ticket.dueDate)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Watchers */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>{t('watchers') || 'Watchers'}</span>
                      <Button variant="outline" size="sm" onClick={() => ticketsApi.addWatcher(ticket.id).then(() => ticketsApi.listWatchers(ticket.id).then(setWatchers))}>
                        {t('watch') || 'Watch'}
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      {watchers.length === 0 && (
                        <div className="text-xs text-muted-foreground">{t('noWatchers') || 'No watchers'}</div>
                      )}
                      {watchers.map((w) => (
                        <div key={w.userId} className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={w.user.avatar} />
                              <AvatarFallback>{w.user.firstName?.[0]}{w.user.lastName?.[0]}</AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{w.user.firstName} {w.user.lastName}</span>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => ticketsApi.removeWatcher(ticket.id, w.userId).then(() => ticketsApi.listWatchers(ticket.id).then(setWatchers))}>✕</Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Customer Info */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('details.customer')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <Avatar>
                        <AvatarImage src={ticket.customer?.avatar} />
                        <AvatarFallback>
                          {ticket.customer?.firstName?.[0]}{ticket.customer?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {ticket.customer?.firstName} {ticket.customer?.lastName}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {ticket.customer?.company}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate">{ticket.customer?.email}</span>
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{ticket.customer?.phone}</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="w-full">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {t('viewCustomer')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Assignment */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('details.assignment')}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {ticket.assignedAgent ? (
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={ticket.assignedAgent.avatar} />
                          <AvatarFallback className="text-xs">
                            {ticket.assignedAgent.firstName[0]}{ticket.assignedAgent.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {ticket.assignedAgent.firstName} {ticket.assignedAgent.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {ticket.assignedAgent.email}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('unassigned')}</p>
                    )}
                    
                    {ticket.team && (
                      <div className="flex items-center space-x-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{ticket.team.name}</span>
                      </div>
                    )}
                    
                    <Button variant="outline" size="sm" className="w-full">
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t('reassign')}
                    </Button>
                  </CardContent>
                </Card>

                {/* Tags */}
                {ticket.tags.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('details.tags')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-1">
                        {ticket.tags.map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag}
                            <button className="ml-1 text-[10px]" onClick={() => handleRemoveTag(tag)}>×</button>
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Add tag */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">{t('addTag')}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center space-x-2">
                    <Input
                      placeholder={t('tagPlaceholder')}
                      value={tagText}
                      onChange={(e) => setTagText(e.target.value)}
                    />
                    <Button size="sm" disabled={saving || !tagText.trim()} onClick={handleAddTag}>
                      {t('add')}
                    </Button>
                  </CardContent>
                </Card>

                {/* SLA Status */}
                {ticket.slaInstance && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('details.sla')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('firstResponse')}:</span>
                        <div className="flex items-center space-x-1">
                          {ticket.slaInstance.firstResponseAt ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-600" />
                          )}
                          <span className="text-xs">
                            {ticket.slaInstance.firstResponseAt ? t('met') : t('pending')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('resolution')}:</span>
                        <div className="flex items-center space-x-1">
                          {ticket.slaInstance.resolutionAt ? (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          ) : (
                            <Clock className="h-4 w-4 text-orange-600" />
                          )}
                          <span className="text-xs">
                            {ticket.slaInstance.resolutionAt ? t('met') : t('pending')}
                          </span>
                        </div>
                      </div>
                      {ticket.slaInstance.resolutionDue && (
                        <div className="text-xs text-muted-foreground">
                          {t('dueBy')} {safeFormatDate(ticket.slaInstance.resolutionDue)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Custom Fields */}
                {Object.keys(ticket.customFields || {}).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">{t('details.customFields')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {Object.entries(ticket.customFields || {}).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground capitalize">
                            {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                          </span>
                          <span className="text-sm font-medium">{value as string}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Suggested Knowledge */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2"><Book className="h-4 w-4" /> {t('knowledge.suggested') || 'Suggested Articles'}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {kbLoading && (
                      <div className="text-xs text-muted-foreground">{t('common.loading') || 'Loading...'}</div>
                    )}
                    {!kbLoading && kbSuggestions.length === 0 && (
                      <div className="text-xs text-muted-foreground">{t('knowledge.noResults') || 'No suggestions'}</div>
                    )}
                    {kbSuggestions.map((a) => (
                      <div key={a.id} className="p-2 rounded border hover-card">
                        <div className="text-sm font-medium line-clamp-1">{a.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-2">{a.snippet}</div>
                        <div className="flex items-center justify-end gap-2 mt-2">
                          <Button variant="ghost" size="sm" onClick={() => navigator.clipboard.writeText(a.snippet)}>
                            <Copy className="h-3.5 w-3.5 mr-1" /> {t('knowledge.copySnippet') || 'Copy'}
                          </Button>
                          <Button variant="outline" size="sm" onClick={async () => {
                            try {
                              const full = await knowledgeApi.getArticle(a.id);
                              await navigator.clipboard.writeText(full.content);
                            } catch {
                              /* ignore */
                            }
                          }}>
                            {t('knowledge.copyArticle') || 'Copy Article'}
                          </Button>
                          <Button variant="default" size="sm" onClick={async () => {
                            try {
                              setNoteText((prev) => (prev ? prev + '\n\n' : '') + a.snippet);
                              setTab('timeline');
                              setTimeout(() => noteRef.current?.focus(), 0);
                              push(t('knowledge.insertedIntoNote') || 'Inserted into note', 'success');
                            } catch {
                              /* ignore */
                            }
                          }}>
                            {t('knowledge.insertIntoNote') || 'Insert into note'}
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" onClick={async () => {
                      try {
                        await knowledgeApi.generateFromTicket(ticket.id);
                      } catch {
                        /* ignore */
                      }
                    }}>
                      <Book className="h-4 w-4 mr-2" /> {t('knowledge.generateFromTicket') || 'Generate from Ticket'}
                    </Button>
                  </CardContent>
                </Card>
                
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}