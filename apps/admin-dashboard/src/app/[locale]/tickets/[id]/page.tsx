"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { ArrowLeft, Clock, User, MessageSquare, Tag, AlertCircle, CheckCircle, XCircle, Calendar, Bot, Send, Paperclip, Book, Copy } from "lucide-react";
import { Link } from "@/i18n.config";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { conversationsApi } from "@/lib/api/conversations-client";
import { callsApi } from "@/lib/api/calls-client";
import { knowledgeApi } from "@/lib/api/knowledge-client";
// import { CallPanel } from "@/components/calls/call-panel";
import { useToast } from "@/components/ui/toast";

// Mock data for a single ticket
const mockTicket = {
  id: "TKT-001",
  title: "Login issues with mobile app",
  description: "Users are experiencing difficulties logging into the mobile application. The error occurs after entering credentials and clicking the login button. The app shows a loading spinner but never proceeds to the dashboard.",
  status: "open" as const,
  priority: "high" as const,
  category: "technical",
  customer: {
    id: "CUST-001",
    name: "John Doe",
    email: "john.doe@example.com",
    avatar: "/avatars/john-doe.jpg"
  },
  assignedAgent: {
    id: "AGENT-001",
    name: "Sarah Wilson",
    email: "sarah.wilson@company.com",
    avatar: "/avatars/sarah-wilson.jpg"
  },
  createdAt: "2024-01-15T10:30:00Z",
  updatedAt: "2024-01-15T14:45:00Z",
  dueDate: "2024-01-17T18:00:00Z",
  tags: ["mobile", "authentication", "urgent"],
  aiAnalysis: {
    sentiment: "frustrated",
    priority: "high",
    category: "technical",
    suggestedActions: [
      "Check mobile app authentication service",
      "Review recent app updates",
      "Test login flow on different devices"
    ],
    confidence: 0.92
  },
  timeline: [
    {
      id: "1",
      type: "created",
      message: "Ticket created by customer",
      timestamp: "2024-01-15T10:30:00Z",
      user: "John Doe"
    },
    {
      id: "2",
      type: "assigned",
      message: "Assigned to Sarah Wilson",
      timestamp: "2024-01-15T11:00:00Z",
      user: "System"
    },
    {
      id: "3",
      type: "comment",
      message: "I've reproduced the issue on iOS devices. Investigating the authentication service logs.",
      timestamp: "2024-01-15T14:45:00Z",
      user: "Sarah Wilson"
    }
  ],
  conversations: [
    {
      id: "1",
      message: "Hi, I'm having trouble logging into the mobile app. It just keeps loading and never logs me in.",
      sender: "customer",
      timestamp: "2024-01-15T10:30:00Z",
      user: "John Doe"
    },
    {
      id: "2",
      message: "Hello John, thank you for reaching out. I'm sorry to hear you're experiencing login issues. Can you please tell me which device and operating system you're using?",
      sender: "agent",
      timestamp: "2024-01-15T11:15:00Z",
      user: "Sarah Wilson"
    },
    {
      id: "3",
      message: "I'm using an iPhone 14 with iOS 17.2. The issue started yesterday.",
      sender: "customer",
      timestamp: "2024-01-15T11:45:00Z",
      user: "John Doe"
    }
  ]
};

const statusColors = {
  open: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  in_progress: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  closed: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
};

const priorityColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  urgent: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case "open":
      return <AlertCircle className="h-4 w-4" />;
    case "in_progress":
      return <Clock className="h-4 w-4" />;
    case "resolved":
      return <CheckCircle className="h-4 w-4" />;
    case "closed":
      return <XCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const t = useTranslations();
  const [newMessage, setNewMessage] = useState("");
  const [kbLoading, setKbLoading] = useState(false);
  const [kbSuggestions, setKbSuggestions] = useState<Array<{ id: string; title: string; snippet: string }>>([]);
  const [selectedText, setSelectedText] = useState("");
  const { push } = useToast();
  type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
  type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
  const [ticketStatus, setTicketStatus] = useState<TicketStatus>(mockTicket.status);
  const [ticketPriority, setTicketPriority] = useState<TicketPriority>(mockTicket.priority);
  const [linkedConversationId, setLinkedConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Array<{
    id: string;
    content: string;
    senderType: "customer" | "agent" | "system";
    createdAt: string;
  }>>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadThread() {
      try {
        // find conversations linked to this ticket
        const convList = await conversationsApi.list({ ticketId: params.id, limit: 1, page: 1 });
        const first = Array.isArray(convList)
          ? (convList as Array<{ id: string }>)[0]
          : (convList as { items?: Array<{ id: string }> } | undefined)?.items?.[0];
        if (!first) return;
        if (!cancelled) setLinkedConversationId(first.id as string);
        const msg = await conversationsApi.getMessages(first.id as string);
        if (!cancelled && Array.isArray(msg as unknown[])) {
          setMessages(
            (msg as Array<{ id: string | number; content: string; senderType: 'customer' | 'agent' | 'system'; createdAt: string | Date }>).map((m) => ({ id: String(m.id), content: String(m.content), senderType: m.senderType, createdAt: String(m.createdAt) }))
          );
        }
      } catch {
        // ignore, fallback to mock below
      }
    }
    loadThread();
    return () => { cancelled = true; };
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!params.id) return;
      setKbLoading(true);
      try {
        if (selectedText && selectedText.length > 10) {
          const res = await knowledgeApi.suggest(selectedText);
          if (!cancelled) setKbSuggestions(res.articles || []);
        } else {
          const seed = `${mockTicket.title}\n\n${mockTicket.description}`;
          const res = await knowledgeApi.search(seed, 5, { semantic: true });
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
  }, [params.id, selectedText]);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    try {
      if (linkedConversationId) {
        await conversationsApi.sendMessage(linkedConversationId, { content: newMessage, messageType: "text" });
        // optimistic update
        setMessages((prev) => prev.concat({ id: String(Date.now()), content: newMessage, senderType: "agent", createdAt: new Date().toISOString() }));
        setNewMessage("");
      } else {
        setNewMessage("");
      }
    } catch {
      setNewMessage("");
    }
  };

  const handleStartVoiceCall = async () => {
    try {
      const call = await callsApi.create({ conversationId: linkedConversationId || params.id, type: 'voice' });
      console.log('Voice call started', call.id);
    } catch {
      // ignore
    }
  };

  const handleStartVideoCall = async () => {
    try {
      const call = await callsApi.create({ conversationId: linkedConversationId || params.id, type: 'video' });
      console.log('Video call started', call.id);
    } catch {
      // ignore
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setTicketStatus(newStatus as TicketStatus);
  };

  const handleGenerateKB = async () => {
    try {
      const draft = await knowledgeApi.generateFromTicket(params.id);
      console.log('KB draft created:', draft.id);
    } catch {
      // ignore
    }
  };

  const handlePriorityChange = (newPriority: string) => {
    setTicketPriority(newPriority as TicketPriority);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/tickets">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t('common.back')}
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{mockTicket.title}</h1>
            <p className="text-muted-foreground">{mockTicket.id}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Badge className={statusColors[ticketStatus]}>
            <StatusIcon status={ticketStatus} />
            <span className="ml-1 capitalize">{ticketStatus}</span>
          </Badge>
          <Badge className={priorityColors[ticketPriority]}>
            <span className="capitalize">{ticketPriority}</span>
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Details */}
          <Card>
            <CardHeader>
              <CardTitle>{t('tickets.details')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">{mockTicket.description}</p>

              <div className="flex flex-wrap gap-2">
                {mockTicket.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    <Tag className="h-3 w-3 mr-1" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Conversations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                {t('tickets.conversation')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {(messages.length ? messages : mockTicket.conversations.map((c) => ({ id: c.id, content: c.message, senderType: c.sender as 'customer' | 'agent' | 'system', createdAt: c.timestamp })) ).map((m) => (
                  <div key={m.id} className={`flex ${m.senderType === 'agent' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${m.senderType === 'agent' ? 'order-2' : 'order-1'}`}>
                      <div className={`rounded-lg p-3 ${m.senderType === 'agent'
                        ? 'bg-primary text-primary-foreground ml-4'
                        : 'bg-muted mr-4'
                        }`}>
                        <p className="text-sm">{m.content}</p>
                        <p className={`text-xs mt-1 ${m.senderType === 'agent'
                          ? 'text-primary-foreground/70'
                          : 'text-muted-foreground'
                          }`}>
                          {new Date(m.createdAt).toLocaleString()}
                        </p>
                        <div className="flex justify-end mt-2">
                          <Button variant="ghost" size="sm" onClick={() => { setNewMessage((prev) => (prev ? prev + '\n\n' : '') + m.content); push(t('tickets.insertedIntoReply') || 'Inserted into reply', 'success'); }}>
                            {t('tickets.insertIntoReply') || 'Insert into reply'}
                          </Button>
                        </div>
                      </div>
                    </div>
                    <Avatar className={`h-8 w-8 ${m.senderType === 'agent' ? 'order-1 mr-2' : 'order-2 ml-2'}`}>
                      <AvatarImage src={m.senderType === 'agent' ? mockTicket.assignedAgent.avatar : mockTicket.customer.avatar} />
                      <AvatarFallback>
                        {m.senderType === 'agent' ? 'AG' : 'CU'}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Reply Form */}
              <div className="space-y-3" onMouseUp={() => { try { const s = window.getSelection()?.toString()?.trim() || ''; if (s) setSelectedText(s); } catch { /* ignore */ } }}>
                <Label htmlFor="reply">{t('tickets.reply')}</Label>
                <Textarea
                  id="reply"
                  placeholder={t('tickets.typeMessage')}
                  value={newMessage}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNewMessage(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-between items-center">
                  <Button variant="outline" size="sm">
                    <Paperclip className="h-4 w-4 mr-2" />
                    {t('common.attach')}
                  </Button>
                  <div className="space-x-2">
                    <Button variant="outline" size="sm" onClick={handleStartVoiceCall}>
                      {t('tickets.startVoiceCall') || 'Start Voice Call'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleStartVideoCall}>
                      {t('tickets.startVideoCall') || 'Start Video Call'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleGenerateKB}>
                      <Book className="h-4 w-4 mr-2" /> Generate Article
                    </Button>
                    <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      {t('common.send')}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Inline Call Panel when a call is active (placeholder: detect via future state) */}
              {/* For now, we render when route param id equals linked conversation and call exists via console logs */}

              {linkedConversationId && (
                <div className="mt-3 text-xs text-muted-foreground">
                  Linked conversation: <Link className="underline" href={`/conversations?c=${linkedConversationId}`}>open in Inbox</Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Suggested Knowledge */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Book className="h-5 w-5 mr-2" /> {t('knowledge.suggested') || 'Suggested Articles'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs text-muted-foreground">
                {kbLoading ? (t('common.loading') || 'Loading...') : (t('knowledge.tipSelectText') || 'Select text in messages to refine suggestions.')}
              </div>
              {kbSuggestions.map((a) => (
                <div key={a.id} className="p-2 rounded border">
                  <div className="text-sm font-medium line-clamp-1">{a.title}</div>
                  <div className="text-xs text-muted-foreground line-clamp-2">{a.snippet}</div>
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <Button variant="ghost" size="sm" onClick={async () => { await navigator.clipboard.writeText(a.snippet); push(t('knowledge.copied') || 'Copied', 'success'); }}>
                      <Copy className="h-3.5 w-3.5 mr-1" /> {t('knowledge.copySnippet') || 'Copy'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={async () => {
                      try { const full = await knowledgeApi.getArticle(a.id); await navigator.clipboard.writeText(full.content); push(t('knowledge.copied') || 'Copied', 'success'); } catch { /* ignore */ }
                    }}>
                      {t('knowledge.copyArticle') || 'Copy Article'}
                    </Button>
                    <Button variant="default" size="sm" onClick={() => { setNewMessage((prev) => (prev ? prev + '\n\n' : '') + a.snippet); push(t('tickets.insertedIntoReply') || 'Inserted into reply', 'success'); }}>
                      {t('knowledge.insertIntoReply') || 'Insert into reply'}
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full" onClick={async () => { try { const draft = await knowledgeApi.generateFromTicket(params.id); await navigator.clipboard.writeText(draft.content); } catch { /* ignore */ } }}>
                <Book className="h-4 w-4 mr-2" /> {t('knowledge.generateFromTicket') || 'Generate from Ticket'}
              </Button>
            </CardContent>
          </Card>

          {/* Ticket Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t('tickets.actions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('tickets.status')}</Label>
                <Select value={ticketStatus} onValueChange={handleStatusChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">{t('tickets.status.open')}</SelectItem>
                    <SelectItem value="in_progress">{t('tickets.status.in_progress')}</SelectItem>
                    <SelectItem value="resolved">{t('tickets.status.resolved')}</SelectItem>
                    <SelectItem value="closed">{t('tickets.status.closed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('tickets.priority')}</Label>
                <Select value={ticketPriority} onValueChange={handlePriorityChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">{t('tickets.low')}</SelectItem>
                    <SelectItem value="medium">{t('tickets.medium')}</SelectItem>
                    <SelectItem value="high">{t('tickets.high')}</SelectItem>
                    <SelectItem value="urgent">{t('tickets.urgent')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('tickets.customer')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={mockTicket.customer.avatar} />
                  <AvatarFallback>
                    {mockTicket.customer.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{mockTicket.customer.name}</p>
                  <p className="text-sm text-muted-foreground">{mockTicket.customer.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Assigned Agent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                {t('tickets.assignedAgent')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-3">
                <Avatar>
                  <AvatarImage src={mockTicket.assignedAgent.avatar} />
                  <AvatarFallback>
                    {mockTicket.assignedAgent.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{mockTicket.assignedAgent.name}</p>
                  <p className="text-sm text-muted-foreground">{mockTicket.assignedAgent.email}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bot className="h-5 w-5 mr-2" />
                {t('tickets.aiAnalysis')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t('tickets.sentimentLabel')}</Label>
                <p className="font-medium capitalize">{mockTicket.aiAnalysis.sentiment}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('tickets.confidence')}</Label>
                <p className="font-medium">{(mockTicket.aiAnalysis.confidence * 100).toFixed(0)}%</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t('tickets.suggestedActions')}</Label>
                <ul className="text-sm space-y-1 mt-1">
                  {mockTicket.aiAnalysis.suggestedActions.map((action, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-muted-foreground mr-2">•</span>
                      {action}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                {t('tickets.timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockTicket.timeline.map((event, index) => (
                  <div key={event.id} className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                      {index < mockTicket.timeline.length - 1 && (
                        <div className="w-px h-8 bg-border ml-0.5 mt-1"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{event.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {event.user} • {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}