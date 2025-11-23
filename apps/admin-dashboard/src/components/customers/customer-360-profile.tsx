'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import {
  FaUser,
  FaBuilding,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaRunning,
  FaComment,
  FaTicketAlt,
  FaArrowUp,
  FaStar,
  FaBullseye,
  FaBolt,
  FaExclamationTriangle,
  FaCheckCircle,
  FaEye,
  FaEdit,
  FaPaperPlane,
  FaShieldAlt,
  FaTrophy,
  FaBriefcase,
  FaTimes,
  FaExternalLinkAlt,
  FaCopy,
  FaDownload,
  FaChartLine,
  FaMagic,
  FaDollarSign
} from 'react-icons/fa';
import { CustomerHealthScore } from './customer-health-score';
import { CustomerJourneyTimeline } from './customer-journey-timeline';
import { cn } from '@/lib/utils';
import { CallPanel } from '@/components/calls/call-panel';
import { useCustomerInsights } from '@/lib/hooks/use-customer-analytics';
import { customersApi } from '@/lib/api/customers-client';
import { useCrmStore } from '@/lib/store/crm-store';
import { satisfactionApi } from '@/lib/api/satisfaction-client';
import { slaApi, type SLAInstance } from '@/lib/api/sla-client';
import { useNotificationUpdates } from '@/lib/hooks/use-notifications-websocket';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Customer360ProfileProps {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function Customer360Profile({ customerId, open, onOpenChange }: Customer360ProfileProps) {
  const t = useTranslations('customers');
  const tc = useTranslations('common');
  const [loading, setLoading] = useState(true);
  const [customer360Data, setCustomer360Data] = useState<any>(null);
  const { data: liveInsights } = useCustomerInsights(customerId);
  const { fetchCustomFields, customFields } = useCrmStore();
  const [activeCallId, setActiveCallId] = useState<string | undefined>(undefined);
  const { success, error: toastError } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<{ firstName: string; lastName: string; email: string; company: string; phone: string }>({ firstName: '', lastName: '', email: '', company: '', phone: '' });

  const [sendOpen, setSendOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendForm, setSendForm] = useState<{ message: string; channelId?: string }>({ message: '', channelId: undefined });
  const [sendChannels, setSendChannels] = useState<Array<{ id: string; name?: string; type?: string }>>([]);
  const [recentOrders, setRecentOrders] = useState<Array<{ id: string; total: number; currency: string; status: string; createdAt: string }>>([]);
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [calls, setCalls] = useState<Array<{ id: string; status: string; type: 'voice'|'video'; startedAt: string; endedAt?: string }>>([])
  const [rfm, setRfm] = useState<{ recencyDays: number; frequency90d: number; monetary: number; score: number }>({ recencyDays: 0, frequency90d: 0, monetary: 0, score: 0 })
  const [slaSummary, setSlaSummary] = useState<{ active: number; breached: number; nextDue?: string | null }>({ active: 0, breached: 0, nextDue: null })

  // Listen for survey notifications and surface a toast for low CSAT
  const { lastNotification } = useNotificationUpdates();
  useEffect(() => {
    const n = lastNotification;
    if (!n) return;
    if (n.type === 'csat.low_rating_received') {
      success(t('profile.lowCsatToast'));
    }
    if (n.type === 'sla.breached') {
      toastError(t('profile.slaBreachedToast'));
    }
    if (n.type === 'sla.at_risk') {
      success(t('profile.slaRiskToast'));
    }
  }, [lastNotification, success, t]);

  useEffect(() => {
    function onCallStart(e: CustomEvent<{ callId: string }>) {
      const id = e?.detail?.callId;
      if (id) setActiveCallId(id);
    }
    window.addEventListener('glavito:call:start', onCallStart as EventListener);
    return () => window.removeEventListener('glavito:call:start', onCallStart as EventListener);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (open && customerId) {
      setLoading(true);
      (async () => {
        try {
          const data = await customersApi.get360Profile(customerId).catch(async () => {
            // Fallback compose from separate endpoints
            const [customer, health, ltv, journey, segments] = await Promise.all([
              customersApi.get(customerId),
              customersApi.getHealth(customerId),
              customersApi.getLifetimeValue(customerId),
              customersApi.getJourney(customerId),
              customersApi.getSegments(customerId),
            ]);
            return {
              customer,
              healthScore: health,
              lifetimeValue: ltv,
              journey,
              segments,
              interactions: [],
              tickets: [],
              conversations: [],
              insights: await customersApi.getInsights(customerId)
            } as any;
          });
          if (!cancelled) setCustomer360Data(data);
          // Load activities feed for recent interactions
          try {
            const acts = await customersApi.getActivities(customerId, { limit: 50 });
            if (!cancelled) {
              setCustomer360Data((prev: any) => {
                const base = prev || data || {};
                return { ...base, interactions: Array.isArray(acts) ? acts : [] };
              });
            }
          } catch { /* noop */ }
          
          // Load recent orders (best-effort)
          try {
            const ro = await customersApi.getRecentOrders(customerId, 5) as any
            if (!cancelled) setRecentOrders(Array.isArray(ro) ? ro : [])
          } catch { if (!cancelled) setRecentOrders([]) }
          
          // Load recent calls for this customer
          try {
            const list = await (await import('@/lib/api/calls-client')).callsApi.list({ customerId })
            if (!cancelled) setCalls(Array.isArray(list) ? list.slice(0, 10) : [])
          } catch { if (!cancelled) setCalls([]) }

          // Compute SLA summary from customer's recent tickets (best-effort)
          try {
            const ticketIds = Array.isArray((data as any)?.tickets) ? ((data as any).tickets as Array<{ id: string }>).map(t => String(t.id)) : []
            const instances = (await Promise.all(ticketIds.map(async (tid) => {
              try { return await slaApi.getInstanceByTicket(tid) } catch { return null }
            }))).filter(Boolean) as SLAInstance[]
            const active = instances.filter(i => i.status === 'active').length
            const breached = instances.filter(i => i.status === 'breached').length
            const dueDates = instances
              .map(i => i.resolutionDue)
              .filter(Boolean)
              .map(d => new Date(d as unknown as string).getTime())
            const nextDue = dueDates.length ? new Date(Math.min(...dueDates)).toISOString() : null
            if (!cancelled) setSlaSummary({ active, breached, nextDue })
          } catch { /* noop */ }

          // Compute RFM score
          if (!cancelled && data) {
            const now = Date.now()
            const customerAge = data.customer?.createdAt ? now - new Date(data.customer.createdAt).getTime() : 0
            const orders = Array.isArray((data as any).recentOrders) ? (data as any).recentOrders : []
            const recency = orders.length > 0 ? Math.floor((now - new Date(orders[0].createdAt).getTime()) / (24*60*60*1000)) : Math.floor(customerAge / (24*60*60*1000))
            const frequency = orders.filter((o: any) => new Date(o.createdAt) > new Date(now - 90*24*60*60*1000)).length
            const monetary = orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0)
            const score = Math.round((Math.min(recency / 30, 5) * 20) + (Math.min(frequency, 5) * 20) + (Math.min(monetary / 1000, 5) * 20))
            setRfm({ recencyDays: recency, frequency90d: frequency, monetary, score })
          }
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      void fetchCustomFields('customer');
    }
    return () => { cancelled = true; };
  }, [open, customerId, t, fetchCustomFields]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'open': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Safely derive a display label for a channel that can be a string or object
  const toChannelLabel = (channel: any): string => {
    if (!channel) return t('profile.unknown');
    if (typeof channel === 'string') return channel;
    if (typeof channel === 'object') return channel.name ?? channel.type ?? t('profile.unknown');
    return String(channel);
  };

  if (!open) return null;

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-7xl max-h-[95vh] p-0 bg-gradient-to-br from-background via-background to-muted/10 backdrop-blur-xl border-border/50">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-6 animate-fade-in">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700 dark:from-blue-600 dark:via-blue-700 dark:to-blue-800 rounded-2xl flex items-center justify-center mx-auto shadow-lg animate-pulse">
                  <FaUser className="h-10 w-10 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-7 h-7 bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 rounded-full flex items-center justify-center shadow-lg">
                  <FaMagic className="h-4 w-4 text-white animate-spin" />
                </div>
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{t('profile.loading')}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('profile.gatheringInsights')}</p>
              </div>
              <div className="w-64 mx-auto">
                <Progress value={75} className="h-2" />
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!customer360Data) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-7xl max-h-[95vh] p-0 bg-gradient-to-br from-background via-background to-muted/10 backdrop-blur-xl border-border/50">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-6 animate-fade-in">
              <div className="w-20 h-20 bg-gradient-to-br from-red-100 to-red-200 dark:from-red-900/30 dark:to-red-800/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg border border-red-200 dark:border-red-800/50">
                <FaExclamationTriangle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-semibold text-foreground">{t('profile.notFound')}</h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">{t('profile.notFoundDescription')}</p>
              </div>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="mt-4">
                {tc('close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] p-0 bg-background border-0 shadow-lg rounded-xl overflow-hidden">
        <div className="flex h-[95vh]">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Modern Header */}
            <DialogHeader className="border-b border-border/50 p-4 bg-muted/30 dark:bg-muted/20">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Enhanced Avatar */}
                  <div className="relative flex-shrink-0">
                    <Avatar className="h-12 w-12 border-2 border-background shadow-md ring-1 ring-primary/10">
                      <AvatarImage src={customer360Data.customer.avatar} className="object-cover" />
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/20 to-primary/10 text-primary">
                        {customer360Data.customer.firstName?.[0] || ''}{customer360Data.customer.lastName?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>

                    {/* Status Indicator */}
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-background shadow-md" />
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <DialogTitle className="text-lg font-bold text-foreground truncate">
                        {customer360Data.customer.firstName} {customer360Data.customer.lastName}
                      </DialogTitle>
                      <FaStar className="h-3.5 w-3.5 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{customer360Data.customer.email}</p>

                    {/* Company & Tags Row */}
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-950/30 rounded-md border border-blue-200 dark:border-blue-800/50">
                        <FaBuilding className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        <span className="font-medium truncate text-blue-900 dark:text-blue-100">{customer360Data.customer.company}</span>
                      </div>
                      <Badge variant="secondary" className="px-2 py-0.5 text-xs rounded-md bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                        <FaShieldAlt className="h-2.5 w-2.5 mr-1" />
                        {t('profile.verified')}
                      </Badge>
                      {customer360Data.segments.slice(0, 2).map((segment: any) => (
                        <Badge key={segment.id} variant="outline" className="px-2 py-0.5 text-xs rounded-md">
                          {segment.name}
                        </Badge>
                      ))}
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-4 gap-2 pt-1">
                      <div className="px-2 py-1.5 rounded-md bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-900/10 border border-emerald-200/50 dark:border-emerald-800/30">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{t('profile.rfmScore')}</div>
                        <div className="text-sm font-bold">{rfm.score}</div>
                      </div>
                      <div className="px-2 py-1.5 rounded-md bg-muted/30 border border-border/30">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{t('profile.ordersLabel')}</div>
                        <div className="text-sm font-bold">{recentOrders.length}</div>
                      </div>
                      <div className="px-2 py-1.5 rounded-md bg-muted/30 border border-border/30">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">{t('profile.ticketsLabel')}</div>
                        <div className="text-sm font-bold">{Array.isArray(customer360Data.tickets) ? customer360Data.tickets.length : 0}</div>
                      </div>
                      <div className="px-2 py-1.5 rounded-md bg-muted/30 border border-border/30">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium flex items-center gap-1">
                          <FaShieldAlt className="h-3 w-3 text-red-600 dark:text-red-400" />
                          {t('profile.slaLabel')}
                        </div>
                        <div className={cn("text-sm font-bold", slaSummary.breached > 0 && "text-red-600")}>{slaSummary.breached}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modern Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      const c = (customer360Data?.customer || {}) as any;
                      setEditForm({
                        firstName: c.firstName || '',
                        lastName: c.lastName || '',
                        email: c.email || '',
                        company: c.company || '',
                        phone: c.phone || '',
                      });
                      setEditOpen(true);
                    }}
                  >
                    <FaEdit className="h-3 w-3 mr-1.5 text-blue-600 dark:text-blue-400" />
                    {t('profile.edit')}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 px-3 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white"
                    onClick={async () => {
                      try {
                        const list = await (await import('@/lib/api/conversations-client')).conversationsApi.list({ customerId }) as any;
                        const convs = Array.isArray(list) ? list : (list?.items || []);
                        const channels = convs
                          .map((c: any) => c?.channel)
                          .filter((c: any) => c && c.id)
                          .reduce((map: Map<string, any>, ch: any) => map.set(ch.id, ch), new Map())
                        setSendChannels(Array.from(channels.values()));
                        setSendForm({ message: '', channelId: Array.from(channels.keys())[0] as string | undefined });
                        setSendOpen(true);
                        success(t('profile.channelsLoaded'));
                      } catch (_e) { toastError(t('profile.channelsLoadFailed')); }
                    }}
                  >
                    <FaPaperPlane className="h-3 w-3 mr-1.5" />
                    {t('profile.sendMessage')}
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 px-3 text-xs border-0 shadow-sm">
                        <FaMagic className="h-3 w-3 mr-1.5 text-purple-600 dark:text-purple-400" />
                        {t('profile.sendSurvey')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={async () => {
                        try {
                          await satisfactionApi.sendWhatsAppSurvey({ customerId, surveyType: 'post_resolution', expiresInDays: 7 });
                          success(t('profile.sentWhatsAppSurvey'));
                        } catch { toastError(t('profile.failedSurvey')); }
                      }}>WhatsApp CSAT</DropdownMenuItem>
                      <DropdownMenuItem onClick={async () => {
                        try {
                          await satisfactionApi.sendEmailSurvey({ customerId, surveyType: 'post_resolution', expiresInDays: 7 });
                          success(t('profile.sentEmailSurvey'));
                        } catch { toastError(t('profile.failedSurvey')); }
                      }}>Email CSAT</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onOpenChange(false)}
                  >
                    <FaTimes className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </div>

            </DialogHeader>

            <div className="flex-1 overflow-hidden">
              {activeCallId && (
                <div className="px-6 pt-3">
                  <CallPanel callId={activeCallId} isCaller onEnd={() => setActiveCallId(undefined)} />
                </div>
              )}
              <Tabs defaultValue="overview" className="h-full flex flex-col">
                <div className="px-4 py-2 border-b border-border/50 bg-muted/20 dark:bg-muted/10">
                  <TabsList className="w-full bg-transparent rounded-lg p-0.5 h-9 border-0">
                    <TabsTrigger value="overview" className="flex items-center gap-1.5 text-xs h-8 rounded-md data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-950/30 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 text-muted-foreground hover:text-foreground transition-colors px-3">
                      <FaEye className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                      <span>{t('tabs.overview')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex items-center gap-1.5 text-xs h-8 rounded-md data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-950/30 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 text-muted-foreground hover:text-foreground transition-colors px-3">
                      <FaChartLine className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                      <span>{t('tabs.healthScore')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="journey" className="flex items-center gap-1.5 text-xs h-8 rounded-md data-[state=active]:bg-purple-50 dark:data-[state=active]:bg-purple-950/30 data-[state=active]:text-purple-600 dark:data-[state=active]:text-purple-400 text-muted-foreground hover:text-foreground transition-colors px-3">
                      <FaRunning className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                      <span>{t('tabs.journey')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="interactions" className="flex items-center gap-1.5 text-xs h-8 rounded-md data-[state=active]:bg-orange-50 dark:data-[state=active]:bg-orange-950/30 data-[state=active]:text-orange-600 dark:data-[state=active]:text-orange-400 text-muted-foreground hover:text-foreground transition-colors px-3">
                      <FaComment className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                      <span>{t('tabs.interactions')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="flex items-center gap-1.5 text-xs h-8 rounded-md data-[state=active]:bg-yellow-50 dark:data-[state=active]:bg-yellow-950/30 data-[state=active]:text-yellow-600 dark:data-[state=active]:text-yellow-400 text-muted-foreground hover:text-foreground transition-colors px-3">
                      <FaBolt className="h-3 w-3 text-yellow-600 dark:text-yellow-400" />
                      <span>{t('tabs.insights')}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="overview" className="h-full m-0 p-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-4">
                        {/* Enhanced Key Metrics */}
                        <div className="grid gap-3 grid-cols-3">
                          <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-2 mb-2">
                              <FaDollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-base font-bold text-foreground truncate">
                                  {formatCurrency(customer360Data.lifetimeValue.totalValue)}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('lifetimeValue')}</div>
                              </div>
                              <FaArrowUp className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
                            </div>
                            <div className="flex items-center justify-between text-[10px] mb-1.5">
                              <span className="text-muted-foreground">
                                {t('predicted')}: {formatCurrency(customer360Data.lifetimeValue.predictedValue)}
                              </span>
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0 text-[9px] rounded">
                                +15%
                              </Badge>
                            </div>
                            <Progress value={75} className="h-1.5" />
                          </div>

                          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800/50 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-2 mb-2">
                              <FaChartLine className="h-5 w-5 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-base font-bold text-foreground">
                                  {customer360Data.healthScore.score}
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('healthScore.title')}</div>
                              </div>
                              <Badge className={cn(
                                "px-1.5 py-0 text-[9px] rounded flex-shrink-0",
                                customer360Data.healthScore.riskLevel === 'low' ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
                                  customer360Data.healthScore.riskLevel === 'medium' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
                                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                              )}>
                                {customer360Data.healthScore.riskLevel}
                              </Badge>
                            </div>
                            <Progress value={customer360Data.healthScore.score} className="h-1.5" />
                          </div>

                          <div className="p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800/50 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start gap-2 mb-2">
                              <FaCalendarAlt className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <div className="text-base font-bold text-foreground">
                                  {Math.floor((Date.now() - new Date(customer360Data.customer.createdAt).getTime()) / (365 * 24 * 60 * 60 * 1000))}y
                                </div>
                                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('customerSince')}</div>
                              </div>
                              <FaTrophy className="h-3.5 w-3.5 text-purple-500 dark:text-purple-400 flex-shrink-0" />
                            </div>
                            <p className="text-[10px] text-muted-foreground mb-1.5 truncate">
                              {formatDate(customer360Data.customer.createdAt)}
                            </p>
                            <Progress value={85} className="h-1.5" />
                          </div>
                        </div>

                        {/* Enhanced Recent Orders */}
                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-600 dark:bg-emerald-700 rounded-lg shadow-sm border border-emerald-700 dark:border-emerald-800">
                                  <FaTicketAlt className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                  <h3 className="text-base font-semibold text-foreground">{tc('recent')} {t('profile.ordersLabel')}</h3>
                                  <p className="text-xs text-muted-foreground">{t('profile.latestInteractions')}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs border-0 shadow-sm" onClick={async () => {
                                  try { const ro = await customersApi.getRecentOrders(customerId, 10) as any; setRecentOrders(Array.isArray(ro) ? ro : []); } catch { /* noop */ }
                                }}>
                                  <FaExternalLinkAlt className="h-3 w-3 mr-1.5 text-blue-600 dark:text-blue-400" />
                                  {tc('refresh')}
                                </Button>
                                <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm" disabled={creatingOrder} onClick={async () => {
                                  try {
                                    setCreatingOrder(true)
                                    const created = await customersApi.createOrder(customerId, { items: [], notes: 'Quick order' })
                                    // push placeholder then refresh
                                    await new Promise(r => setTimeout(r, 400))
                                    const ro = await customersApi.getRecentOrders(customerId, 10) as any
                                    setRecentOrders(Array.isArray(ro) ? ro : [])
                                  } catch { /* noop */ } finally { setCreatingOrder(false) }
                                }}>
                                  {creatingOrder ? t('profile.creating') : t('profile.createOrder')}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {recentOrders.length > 0 ? recentOrders.map((o: any) => (
                                <div key={o.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30 bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors">
                                  <div>
                                    <div className="text-base font-semibold">{t('profile.orderNumber')}{String(o.id).slice(-6)}</div>
                                    <div className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString()}</div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-base font-bold">{new Intl.NumberFormat('en-US', { style: 'currency', currency: o.currency || 'USD' }).format(o.total || 0)}</div>
                                    <Badge variant="outline" className="text-sm capitalize mt-1">{String(o.status || '').replace('_', ' ')}</Badge>
                                  </div>
                                </div>
                              )) : (
                                <div className="text-center py-8">
                                  <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 rounded-2xl flex items-center justify-center mb-4 mx-auto border border-blue-200 dark:border-blue-800/50">
                                    <FaArrowUp className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <p className="text-base text-muted-foreground">{t('profile.noRecentOrders')}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Recent Activity */}
                        <Card className="border-0 shadow-sm">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800/50">
                                  <FaRunning className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div>
                                  <h3 className="text-base font-semibold text-foreground">{t('recentActivity')}</h3>
                                  <p className="text-xs text-muted-foreground">{t('profile.latestInteractions')}</p>
                              </div>
                            </div>
                              <Button variant="outline" size="sm" className="h-8 text-xs border-0 shadow-sm">
                                <FaExternalLinkAlt className="h-3 w-3 mr-1.5 text-blue-600 dark:text-blue-400" />
                              {tc('viewAll')}
                            </Button>
                          </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="space-y-3">
                              {customer360Data.interactions.length > 0 ? customer360Data.interactions.map((interaction: any) => (
                                <div key={interaction.id} className="group flex items-center space-x-3 p-3 rounded-lg border border-border/30 bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30 hover:shadow-md transition-all duration-300 cursor-pointer">
                                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-all duration-300">
                                    {interaction.type === 'conversation' ? (
                                      <FaComment className="h-5 w-5 text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors" />
                                    ) : (
                                      <FaTicketAlt className="h-5 w-5 text-orange-600 dark:text-orange-400 group-hover:text-orange-700 dark:group-hover:text-orange-300 transition-colors" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate text-sm">
                                      {interaction.subject}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                                      <span className="font-medium">{toChannelLabel(interaction.channel)}</span>
                                      <span>•</span>
                                      <span>{formatDate(interaction.timestamp)}</span>
                                    </div>
                                  </div>
                                  <Badge className={cn(
                                    "px-2 py-0.5 rounded-lg font-medium text-xs transition-all",
                                    getStatusColor(interaction.status)
                                  )}>
                                    {interaction.status}
                                  </Badge>
                                </div>
                              )) : (
                                <div className="text-center py-12 animate-fade-in">
                                  <div className="w-16 h-16 bg-amber-50 dark:bg-amber-950/30 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg border border-amber-200 dark:border-amber-800/50">
                                    <FaRunning className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-foreground mb-2">{t('profile.noRecentActivity')}</h3>
                                  <p className="text-sm text-muted-foreground">{t('profile.noRecentActivityDescription')}</p>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                        {/* Enhanced Key Insights */}
                        <Card className="border-0 shadow-sm bg-background">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-800/50">
                                  <FaBolt className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                </div>
                                <div>
                                  <span className="text-xl font-semibold text-foreground">{t('keyInsights')}</span>
                                  <p className="text-sm text-muted-foreground mt-1">{t('profile.aiAnalysis')}</p>
                                </div>
                              </div>
                              <Badge className="bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-800/50 px-3 py-1 rounded-lg">
                                <FaMagic className="h-3 w-3 mr-1" />
                                {t('profile.aiInsights')}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {(liveInsights?.keyInsights ?? customer360Data.insights.keyInsights).length > 0 ?
                                (liveInsights?.keyInsights ?? customer360Data.insights.keyInsights).map((insight: string, index: number) => (
                                  <div key={index} className="group flex items-start space-x-4 p-4 rounded-lg border border-blue-200 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-700 transition-all duration-300">
                                    <div className="p-2 bg-blue-600 dark:bg-blue-700 rounded-lg shadow-sm group-hover:scale-110 transition-transform">
                                      <FaCheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100 leading-relaxed">{insight}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                                      <FaCopy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                    </Button>
                                  </div>
                                )) : (
                                  <div className="text-center py-12 animate-fade-in">
                                    <div className="w-16 h-16 bg-yellow-50 dark:bg-yellow-950/30 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg border border-yellow-200 dark:border-yellow-800/50">
                                      <FaBolt className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('profile.noInsightsAvailable')}</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.insightsPlaceholder')}</p>
                                  </div>
                                )
                              }
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="health" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <CustomerHealthScore
                        customerId={customerId}
                        healthScore={customer360Data.healthScore}
                      />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="journey" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <CustomerJourneyTimeline customerId={customerId} />
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="interactions" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-6">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-lg font-semibold flex items-center gap-2">
                              <FaComment className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                              {t('profile.recentInteractions')}
                            </h4>
                          </div>
                          <div className="space-y-3">
                            {(customer360Data.interactions || []).map((interaction: { id: string; type: string; subject?: string; channel?: any; timestamp: string; status?: string }) => (
                              <Card key={interaction.id}>
                                <CardContent className="p-4">
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                      <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-full border border-blue-200 dark:border-blue-800/50">
                                        {interaction.type === 'conversation' ? (
                                          <FaComment className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        ) : (
                                          <FaTicketAlt className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                        )}
                                      </div>
                                      <div>
                                        <h4 className="font-medium">{interaction.subject || t('profile.interaction')}</h4>
                                        <p className="text-sm text-muted-foreground">
                                          {toChannelLabel(interaction.channel)} • {formatDate(interaction.timestamp)}
                                        </p>
                                      </div>
                                    </div>
                                    {interaction.status && (
                                      <Badge className={getStatusColor(interaction.status)}>
                                        {interaction.status}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex space-x-2">
                                    <Button size="sm" variant="outline" className="border-0 shadow-sm">
                                      <FaEye className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                                      {t('viewDetails')}
                                    </Button>
                                    <Button size="sm" variant="outline" className="border-0 shadow-sm">
                                      <FaComment className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                                      {t('reply')}
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>

                        <div>
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-4">
                              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                                <div className="p-2 bg-blue-600 dark:bg-blue-700 rounded-lg shadow-sm border border-blue-700 dark:border-blue-800">
                                  <FaPhone className="h-4 w-4 text-white" />
                                </div>
                                <span>{t('profile.recentCalls')}</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0">
                              {!calls.length ? (
                                <div className="text-sm text-muted-foreground">{t('profile.noCalls')}</div>
                              ) : (
                                <div className="space-y-3">
                                  {calls.map((c) => (
                                    <div key={c.id} className="flex items-center justify-between p-4 rounded-xl border border-border/30 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors">
                                      <div className="text-sm flex items-center gap-2">
                                        <Badge variant="secondary" className="capitalize">{c.type}</Badge>
                                        <span className="text-muted-foreground">{new Date(c.startedAt).toLocaleString()}</span>
                                        <span className="text-muted-foreground">•</span>
                                        <span className="capitalize">{c.status}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Button size="sm" variant="outline" onClick={() => setActiveCallId(c.id)}>
                                          {t('profile.join')}
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>

                  <TabsContent value="insights" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-6">
                        {/* Sentiment + Opportunities */}
                        {liveInsights?.sentimentAnalysis && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <FaBolt className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                                <span>{t('sentiment')}</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-sm text-muted-foreground">
                                {t('sentiment')}: <span className="font-medium">{liveInsights.sentimentAnalysis.overall}</span> • {t('score')}: {Math.round((liveInsights.sentimentAnalysis.score || 0) * 100)}% • {t('trend')}: {liveInsights.sentimentAnalysis.trend}
                              </div>
                              {typeof liveInsights.confidence === 'number' && (
                                <div className="text-xs text-muted-foreground mt-1">{t('confidence')}: {Math.round((liveInsights.confidence || 0) * 100)}%</div>
                              )}
                            </CardContent>
                          </Card>
                        )}
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <FaBullseye className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                              <span>{t('opportunities')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(liveInsights?.opportunities ?? customer360Data.insights.opportunities).map((opportunity: string, index: number) => (
                                <div key={index} className="flex items-start space-x-3 p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 rounded-lg">
                                  <FaArrowUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-emerald-800 dark:text-emerald-200">{opportunity}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Behavior + Next Best Actions */}
                        {liveInsights?.behavioralAnalysis && (
                          <Card className="border-0 shadow-sm">
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <FaRunning className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                <span>{t('recentActivity')}</span>
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                                <div>
                                  {(liveInsights.behavioralAnalysis.recentActivity || []).map((a, i) => (
                                    <div key={`ra-${i}`}>{a.type}: {a.count}</div>
                                  ))}
                                </div>
                                <div>
                                  {(liveInsights.behavioralAnalysis.channelPreference || []).map((c, i) => (
                                    <div key={`cp-${i}`}>{toChannelLabel(c.channel)}: {c.percentage}%</div>
                                  ))}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        )}
                        <Card className="border-0 shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <FaBolt className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                              <span>{t('nextBestActions')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(liveInsights?.nextBestActions ?? customer360Data.insights.nextBestActions).map((action: string, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-lg">
                                  <div className="flex items-start space-x-3">
                                    <FaCheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-blue-800 dark:text-blue-200">{action}</p>
                                  </div>
                                  <Button size="sm" variant="outline" className="border-0 shadow-sm">
                                    {t('execute')}
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                        {liveInsights?.explanation && (
                          <div className="text-xs text-muted-foreground">{liveInsights.explanation}</div>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>

          {/* Modern Sidebar */}
          <div className="hidden lg:block w-72 border-l border-border/50 bg-gradient-to-b from-muted/10 to-muted/5">
            <ScrollArea className="h-full">
              <div className="p-3 space-y-3">
                {/* Enhanced Contact Information */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="flex items-center space-x-2 text-xs font-semibold">
                      <div className="p-1.5 bg-blue-600 dark:bg-blue-700 rounded-md shadow-sm border border-blue-700 dark:border-blue-800">
                        <FaUser className="h-3 w-3 text-white" />
                      </div>
                      <span>{t('profile.contactInformation')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 px-3 pb-3">
                    <div className="group flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                      <div className="p-1.5 bg-emerald-600 dark:bg-emerald-700 rounded-md shadow-sm flex-shrink-0 border border-emerald-700 dark:border-emerald-800">
                        <FaEnvelope className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('channels.email')}</div>
                        <div className="text-xs font-medium text-foreground truncate">{customer360Data.customer.email}</div>
                      </div>
                    </div>

                    <div className="group flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                      <div className="p-1.5 bg-blue-600 dark:bg-blue-700 rounded-md shadow-sm flex-shrink-0 border border-blue-700 dark:border-blue-800">
                        <FaPhone className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('channels.phone')}</div>
                        <div className="text-xs font-medium text-foreground truncate">{customer360Data.customer.phone}</div>
                      </div>
                    </div>

                    <div className="group flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors cursor-pointer border border-transparent hover:border-border/50">
                      <div className="p-1.5 bg-purple-600 dark:bg-purple-700 rounded-md shadow-sm flex-shrink-0 border border-purple-700 dark:border-purple-800">
                        <FaBuilding className="h-3 w-3 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wide">{t('createDialog.company')}</div>
                        <div className="text-xs font-medium text-foreground truncate">{customer360Data.customer.company}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Custom Fields */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="flex items-center space-x-2 text-xs font-semibold">
                      <div className="p-1.5 bg-amber-600 dark:bg-amber-700 rounded-md shadow-sm border border-amber-700 dark:border-amber-800">
                        <FaBriefcase className="h-3 w-3 text-white" />
                      </div>
                      <span>{t('profile.companyDetails')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 px-3 pb-3">
                    {Object.entries(customer360Data.customer.customFields || {}).length > 0 ? (
                      Object.entries(customer360Data.customer.customFields).slice(0, 3).map(([key, value]) => {
                        const def = Array.isArray(customFields) ? (customFields as any[]).find(f => f.entity === 'customer' && f.name === key) : undefined;
                        const label = def?.label || key.replace(/([A-Z])/g, ' $1').toLowerCase();
                        return (
                          <div key={key} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 dark:bg-muted/20 border border-border/30 hover:bg-muted/50 dark:hover:bg-muted/30 transition-colors">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide truncate">{label}</span>
                            <span className="text-xs font-semibold text-foreground truncate ml-2">{String(value)}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4">
                        <FaBriefcase className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <p className="text-xs text-muted-foreground">{t('profile.noCustomFields')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Enhanced Quick Actions */}
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="flex items-center space-x-2 text-xs font-semibold">
                      <div className="p-1.5 bg-purple-600 dark:bg-purple-700 rounded-md shadow-sm border border-purple-700 dark:border-purple-800">
                        <FaBolt className="h-3 w-3 text-white" />
                      </div>
                      <span>{t('profile.quickActions')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1.5 pt-0 px-3 pb-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-8 text-xs border-0 shadow-sm"
                      onClick={async () => {
                        try {
                          // Load available channels for this customer
                          const list = await (await import('@/lib/api/conversations-client')).conversationsApi.list({ customerId }) as any;
                          const convs = Array.isArray(list) ? list : (list?.items || []);

                          // Extract unique channels from conversations
                          const channelMap = new Map();
                          convs.forEach((conv: any) => {
                            if (conv?.channel && conv.channel.id) {
                              channelMap.set(conv.channel.id, conv.channel);
                            }
                          });

                          const channels = Array.from(channelMap.values());

                          // If no existing conversations, get all available channels
                          if (channels.length === 0) {
                            const allChannels = await (await import('@/lib/api/channels-client')).channelsApi.list();
                            const channelList = Array.isArray(allChannels) ? allChannels : (allChannels as any)?.data || [];
                            setSendChannels(channelList);
                            setSendForm({ message: '', channelId: channelList[0]?.id });
                          } else {
                            setSendChannels(channels);
                            setSendForm({ message: '', channelId: channels[0]?.id });
                          }

                          setSendOpen(true);
                          success(t('profile.channelsLoadedSuccess'));
                        } catch (e) {
                          console.error(e);
                          toastError(t('profile.channelsLoadFailed'));
                        }
                      }}
                    >
                      <div className="p-1 bg-emerald-600 dark:bg-emerald-700 rounded-md mr-2 shadow-sm border border-emerald-700 dark:border-emerald-800">
                        <FaComment className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{t('profile.sendMessage')}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-8 text-xs border-0 shadow-sm"
                      onClick={async () => {
                        try {
                          const subject = window.prompt('Email subject', `Hello ${customer360Data.customer.firstName || ''}`) || '';
                          if (!subject) return;
                          const html = window.prompt('Email HTML', `<p>Hi ${(customer360Data.customer.firstName || '')},</p><p>Great to connect.</p>`) || '';
                          if (!html) return;
                          const api = (await import('@/lib/api/config')).default;
                          await api.post('/email/send', {
                            tenantId: (customer360Data.customer as any).tenantId,
                            subject,
                            html,
                            personalizations: [{ toEmail: customer360Data.customer.email, toName: `${customer360Data.customer.firstName || ''} ${customer360Data.customer.lastName || ''}`.trim() }],
                            tracking: { open: true, click: true },
                          });
                          success(t('profile.messageSent'));
                        } catch {
                          toastError(t('profile.messageSendFailed'));
                        }
                      }}
                    >
                      <div className="p-1 bg-blue-600 dark:bg-blue-700 rounded-md mr-2 shadow-sm border border-blue-700 dark:border-blue-800">
                        <FaEnvelope className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">Send Email</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-8 text-xs border-0 shadow-sm"
                      onClick={async () => {
                        try {
                          // First, try to find an existing channel for this customer
                          let channelId: string | undefined;

                          try {
                            // Get existing conversations to find a channel
                            const list = await (await import('@/lib/api/conversations-client')).conversationsApi.list({ customerId }) as any;
                            const convs = Array.isArray(list) ? list : (list?.items || []);

                            if (convs.length > 0) {
                              // Use the channel from the most recent conversation
                              channelId = convs[0]?.channel?.id;
                            }
                          } catch (e) {
                            console.warn('Failed to get existing conversations:', e);
                          }

                          // If no existing channel, try to get a default channel
                          if (!channelId) {
                            try {
                              const channels = await (await import('@/lib/api/channels-client')).channelsApi.list();
                              const channelList = Array.isArray(channels) ? channels : (channels as any)?.data || [];

                              if (channelList.length > 0) {
                                // Use the first available channel (or find a specific type like 'email')
                                const defaultChannel = channelList.find((ch: any) => ch.type === 'email') || channelList[0];
                                channelId = defaultChannel?.id;
                              }
                            } catch (err) {
                              console.warn('Failed to get channels:', err);
                            }
                          }

                          if (!channelId) {
                            toastError(t('profile.noChannelsAvailable'));
                            return;
                          }

                          // Create a ticket for this customer
                          const ticketData = {
                            subject: `Support request from ${customer360Data.customer.firstName} ${customer360Data.customer.lastName}`,
                            description: 'Support ticket created from customer profile',
                            priority: 'medium',
                            customerId: customerId,
                            channelId: channelId,
                            status: 'open',
                            tags: ['profile-created', 'support'],
                            // Add tenant context if available
                            ...(customer360Data.customer.tenantId && { tenantId: customer360Data.customer.tenantId })
                          };

                          const ticket: any = await (await import('@/lib/api/tickets-client')).ticketsApi.create(ticketData);
                          success(t('profile.ticketCreated', { id: ticket?.id ?? '' }));

                          // Optionally redirect to the ticket or refresh data
                          // You could open the ticket in a new tab or update the customer data
                          console.log('Created ticket:', ticket);
                        } catch (_e) {
                          toastError(t('profile.ticketCreateFailed'));
                        }
                      }}
                    >
                      <div className="p-1 bg-blue-600 dark:bg-blue-700 rounded-md mr-2 shadow-sm border border-blue-700 dark:border-blue-800">
                        <FaTicketAlt className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{t('profile.createTicket')}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-8 text-xs border-0 shadow-sm"
                      onClick={async () => {
                        try {
                          // Get existing conversations to find a channel for the call
                          const list = await (await import('@/lib/api/conversations-client')).conversationsApi.list({ customerId }) as any;
                          const conv = Array.isArray(list) ? list[0] : (list?.items?.[0] || null);
                          const convId = conv?.id as string | undefined;

                          // Create a video call
                          const call = await (await import('@/lib/api/calls-client')).callsApi.create({
                            conversationId: convId,
                            type: 'video',
                            metadata: {
                              customerId: customerId,
                              customerName: `${customer360Data.customer.firstName} ${customer360Data.customer.lastName}`,
                              initiatedFrom: 'customer-profile'
                            }
                          });

                          // Trigger the call using the useCall hook
                          window.dispatchEvent(new CustomEvent('glavito:call:start', {
                            detail: { callId: call.id }
                          }));

                          success(t('profile.callScheduled'));
                        } catch (_e) {
                          toastError(t('profile.scheduleCallFailed'));
                        }
                      }}
                    >
                      <div className="p-1 bg-purple-600 dark:bg-purple-700 rounded-md mr-2 shadow-sm border border-purple-700 dark:border-purple-800">
                        <FaCalendarAlt className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{t('profile.scheduleCall')}</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-8 text-xs border-0 shadow-sm"
                      onClick={async () => {
                        try {
                          // Find or create VIP segment
                          const segments = await (await import('@/lib/api/crm-client')).crmApi.listSegments();
                          let vipSegment = segments.find((s: any) => s.name.toLowerCase().includes('vip'));

                          if (!vipSegment) {
                            // Create VIP segment if it doesn't exist
                            vipSegment = await (await import('@/lib/api/crm-client')).crmApi.createSegment({
                              name: 'VIP Customers',
                              description: 'High-value customers with VIP status',
                              criteria: {
                                logic: 'AND',
                                conditions: [
                                  {
                                    field: 'customer.healthScore',
                                    operator: 'gte',
                                    value: 80
                                  },
                                  {
                                    field: 'customer.lifetimeValue',
                                    operator: 'gte',
                                    value: 1000
                                  }
                                ]
                              },
                              isActive: true
                            });
                          }

                          // Add customer to VIP segment
                          await (await import('@/lib/api/crm-client')).crmApi.updateSegment(vipSegment.id, {
                            addCustomers: [customerId]
                          });

                          success(t('profile.vipAddedSuccess'));

                          // Refresh customer data to show updated segments
                          // You might want to trigger a refresh of customer360Data here
                          // This could be done by calling the same API that loads the 360 data
                          const updatedData = await customersApi.get360Profile(customerId).catch(async () => {
                            // Fallback compose from separate endpoints
                            const [customer, health, ltv, journey, segments] = await Promise.all([
                              customersApi.get(customerId),
                              customersApi.getHealth(customerId),
                              customersApi.getLifetimeValue(customerId),
                              customersApi.getJourney(customerId),
                              customersApi.getSegments(customerId),
                            ]);
                            return {
                              customer,
                              healthScore: health,
                              lifetimeValue: ltv,
                              journey,
                              segments,
                              interactions: [],
                              tickets: [],
                              conversations: [],
                              insights: await customersApi.getInsights(customerId)
                            } as any;
                          });
                          setCustomer360Data(updatedData);
                        } catch (_e) {
                          toastError(t('profile.addToVIPFailed'));
                        }
                      }}
                    >
                      <div className="p-1 bg-amber-600 dark:bg-amber-700 rounded-md mr-2 shadow-sm border border-amber-700 dark:border-amber-800">
                        <FaStar className="h-3 w-3 text-white" />
                      </div>
                      <span className="font-medium">{t('profile.addToVIP')}</span>
                    </Button>

                    <div className="pt-2 border-t border-border/50">
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all"
                        onClick={async () => {
                          try {
                            // Export customer 360 profile data
                            const exportData = {
                              customer: customer360Data.customer,
                              healthScore: customer360Data.healthScore,
                              lifetimeValue: customer360Data.lifetimeValue,
                              journey: customer360Data.journey,
                              segments: customer360Data.segments,
                              interactions: customer360Data.interactions,
                              tickets: customer360Data.tickets,
                              conversations: customer360Data.conversations,
                              insights: customer360Data.insights,
                              exportedAt: new Date().toISOString(),
                              exportedBy: 'admin-dashboard'
                            };

                            // Create and download the file
                            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                              type: 'application/json'
                            });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `customer-360-${customer360Data.customer.firstName}-${customer360Data.customer.lastName}-${new Date().toISOString().split('T')[0]}.json`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);

                            success(t('profile.exportSuccess'));
                          } catch (_e) {
                            toastError(t('profile.exportFailed'));
                          }
                        }}
                      >
                        <FaDownload className="h-4 w-4 mr-2" />
                        {t('profile.exportProfile')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
      {/* Modern Edit Customer Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-0 shadow-lg rounded-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
                <FaEdit className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              {t('profile.edit')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-semibold">{t('createDialog.firstName')}</Label>
                <Input
                  id="firstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))}
                  className="h-11 rounded-xl border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-semibold">{t('createDialog.lastName')}</Label>
                <Input
                  id="lastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))}
                  className="h-11 rounded-xl border-2 border-muted-foreground/20 focus:border-primary transition-colors"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">{t('createDialog.email')}</Label>
              <Input
                id="email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                className="h-11 rounded-xl border-2 border-muted-foreground/20 focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-semibold">{t('createDialog.company')}</Label>
              <Input
                id="company"
                value={editForm.company}
                onChange={(e) => setEditForm((p) => ({ ...p, company: e.target.value }))}
                className="h-11 rounded-xl border-2 border-muted-foreground/20 focus:border-primary transition-colors"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold">{t('createDialog.phone')}</Label>
              <Input
                id="phone"
                value={editForm.phone}
                onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))}
                className="h-11 rounded-xl border-2 border-muted-foreground/20 focus:border-primary transition-colors"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading} className="h-11 px-6 rounded-xl">
              {tc('cancel')}
            </Button>
            <Button
              onClick={async () => {
                try {
                  setEditLoading(true)
                  const id = (customer360Data?.customer as any)?.id as string
                  const updated = await customersApi.update(id, editForm)
                  setCustomer360Data((prev: any) => ({ ...(prev || {}), customer: updated }))
                  setEditOpen(false)
                  success(t('profile.customerUpdated'))
                } catch (e) {
                  toastError(t('profile.customerUpdateFailed'))
                } finally {
                  setEditLoading(false)
                }
              }}
              disabled={editLoading}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all rounded-xl"
            >
              {editLoading ? tc('saving') : tc('save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modern Send Message Modal */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-lg bg-background border-0 shadow-lg rounded-xl">
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-xl font-semibold flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800/50">
                <FaPaperPlane className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              {t('profile.sendMessage')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="channel" className="text-sm font-semibold">{t('profile.channel')}</Label>
              <Select value={sendForm.channelId} onValueChange={(v) => setSendForm((p) => ({ ...p, channelId: v }))}>
                <SelectTrigger className="h-11 rounded-xl border-2 border-muted-foreground/20 focus:border-primary">
                  <SelectValue placeholder={t('profile.selectChannel')} />
                </SelectTrigger>
                <SelectContent>
                  {sendChannels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{(ch.type || '').toString().toUpperCase()} {ch.name ? `• ${ch.name}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message" className="text-sm font-semibold">{t('profile.message')}</Label>
              <Textarea
                id="message"
                rows={6}
                value={sendForm.message}
                onChange={(e) => setSendForm((p) => ({ ...p, message: e.target.value }))}
                className="rounded-xl border-2 border-muted-foreground/20 focus:border-primary transition-colors resize-none"
                placeholder={t('profile.typeMessage')}
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sendLoading} className="h-11 px-6 rounded-xl">
              {tc('cancel')}
            </Button>
            <Button
              onClick={async () => {
                try {
                  if (!sendForm.message.trim()) { toastError(t('profile.messageEmpty')); return; }
                  setSendLoading(true)
                  // ensure advanced conversation for selected channel
                  if (!sendForm.channelId) { toastError(t('profile.selectChannel')); setSendLoading(false); return; }
                  const created = await (await import('@/lib/api/conversations-client')).conversationsApi.create({ customerId, channelId: sendForm.channelId, subject: undefined, priority: 'medium' })
                  const convId = (created as any)?.id || (created as any)?.data?.id
                  if (!convId) throw new Error('Failed to create conversation')
                  await (await import('@/lib/api/conversations-client')).conversationsApi.sendMessage(convId, { content: sendForm.message.trim(), messageType: 'text' })
                  setSendOpen(false)
                  setSendForm({ message: '', channelId: sendForm.channelId })
                  success(t('profile.messageSent'))
                } catch (_e) {
                  toastError(t('profile.messageSendFailed'))
                } finally {
                  setSendLoading(false)
                }
              }}
              disabled={sendLoading}
              className="h-11 px-6 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all rounded-xl"
            >
              {sendLoading ? tc('sending') : tc('send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
