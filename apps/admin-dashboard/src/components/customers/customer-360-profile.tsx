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
  User,
  Building,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  Activity,
  MessageSquare,
  Ticket,
  TrendingUp,
  Heart,
  Star,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  Edit,
  Send,
  MoreHorizontal,
  Shield,
  Award,
  Sparkles,
  Globe,
  MapPin,
  Users,
  Briefcase,
  X,
  ExternalLink,
  Copy,
  Download
} from 'lucide-react';
import { CustomerHealthScore } from './customer-health-score';
import { CustomerJourneyTimeline } from './customer-journey-timeline';
import { cn } from '@/lib/utils';
import { CallPanel } from '@/components/calls/call-panel';
import { useCustomerInsights } from '@/lib/hooks/use-customer-analytics';
import { customersApi } from '@/lib/api/customers-client';
import { useCrmStore } from '@/lib/store/crm-store';

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
  const { success, error: toastError, info } = useToast();

  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState<{ firstName: string; lastName: string; email: string; company: string; phone: string }>({ firstName: '', lastName: '', email: '', company: '', phone: '' });

  const [sendOpen, setSendOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendForm, setSendForm] = useState<{ message: string; channelId?: string }>({ message: '', channelId: undefined });
  const [sendChannels, setSendChannels] = useState<Array<{ id: string; name?: string; type?: string }>>([]);

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
        } finally {
          if (!cancelled) setLoading(false);
        }
      })();
      void fetchCustomFields('customer');
    }
    return () => { cancelled = true; };
  }, [open, customerId, t]);

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
        <DialogContent className="sm:max-w-7xl max-h-[95vh] p-0 bg-gradient-to-br from-slate-50/95 via-white/95 to-blue-50/95 dark:from-slate-950/95 dark:via-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4 animate-fade-in">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto shadow-2xl animate-pulse">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-r from-emerald-400 to-green-500 rounded-full flex items-center justify-center shadow-lg">
                  <Sparkles className="h-3 w-3 text-white animate-spin" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('profile.loading')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('profile.gatheringInsights')}</p>
              </div>
              <div className="w-48 mx-auto">
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
        <DialogContent className="sm:max-w-7xl max-h-[95vh] p-0 bg-gradient-to-br from-slate-50/95 via-white/95 to-blue-50/95 dark:from-slate-950/95 dark:via-slate-900/95 dark:to-slate-800/95 backdrop-blur-xl border-slate-200/60 dark:border-slate-700/60">
          <div className="flex items-center justify-center h-96">
            <div className="text-center space-y-4 animate-fade-in">
              <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                <AlertTriangle className="h-8 w-8 text-slate-500 dark:text-slate-400" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">{t('profile.notFound')}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">{t('profile.notFoundDescription')}</p>
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
      <DialogContent className="sm:max-w-6xl w-[95vw] max-h-[90vh] p-0 bg-background border rounded-xl overflow-hidden">
        <div className="flex h-[90vh]">
          {/* Main Content */}
          <div className="flex-1 flex flex-col">
            {/* Clean Header */}
            <DialogHeader className="border-b p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-6">
                  {/* Simple Avatar */}
                  <div className="relative">
                    <Avatar className="h-20 w-20 border-2 border-border">
                      <AvatarImage src={customer360Data.customer.avatar} className="object-cover" />
                      <AvatarFallback className="text-lg font-semibold">
                        {customer360Data.customer.firstName?.[0] || ''}{customer360Data.customer.lastName?.[0] || ''}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* Status Indicators */}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-2 border-background flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                  </div>

                  {/* Customer Info */}
                  <div className="space-y-3 flex-1">
                    <div className="space-y-1">
                      <DialogTitle className="text-display">
                        {customer360Data.customer.firstName} {customer360Data.customer.lastName}
                      </DialogTitle>
                      <p className="text-subtitle">{customer360Data.customer.email}</p>
                    </div>

                    {/* Company Info */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">{customer360Data.customer.company}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-md">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{t('profile.enterpriseCustomer')}</span>
                      </div>
                    </div>

                    {/* Segments */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {customer360Data.segments.map((segment: any) => (
                        <Badge key={segment.id} variant="secondary">
                          {segment.name}
                        </Badge>
                      ))}
                      <Badge className="badge-success">
                        <Shield className="h-3 w-3 mr-1" />
                        {t('profile.verified')}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
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
                    <Edit className="h-4 w-4 mr-2" />
                    {t('profile.edit')}
                  </Button>
                  <Button
                    size="sm"
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
                      } catch (e) { console.error(e); }
                    }}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {t('profile.sendMessage')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        const list = await (await import('@/lib/api/conversations-client')).conversationsApi.list({ customerId }) as any;
                        const conv = Array.isArray(list) ? list[0] : (list?.items?.[0] || null);
                        const convId = conv?.id as string | undefined;
                        const call = await (await import('@/lib/api/calls-client')).callsApi.create({ conversationId: convId, type: 'video' });
                        window.dispatchEvent(new CustomEvent('glavito:call:start', { detail: { callId: call.id } }));
                        info('Call started');
                      } catch (e) { console.error(e); }
                    }}
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    {t('profile.callCustomer')}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-4 mt-6">
                  <div className="metric-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                        <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">
                          {formatCurrency(customer360Data.lifetimeValue.totalValue)}
                        </div>
                        <div className="text-caption">{t('profile.ltv')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={75} className="flex-1 h-2" />
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">+15%</span>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30">
                        <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">
                          {customer360Data.healthScore.score}
                        </div>
                        <div className="text-caption">{t('profile.health')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={customer360Data.healthScore.score} className="flex-1 h-2" />
                      <Badge className={cn(
                        "text-xs",
                        customer360Data.healthScore.riskLevel === 'low' ? "badge-success" :
                          customer360Data.healthScore.riskLevel === 'medium' ? "badge-warning" :
                            "badge-danger"
                      )}>
                        {customer360Data.healthScore.riskLevel}
                      </Badge>
                    </div>
                  </div>

                  <div className="metric-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div>
                        <div className="text-xl font-bold text-foreground">
                          {Math.floor((Date.now() - new Date(customer360Data.customer.createdAt).getTime()) / (365 * 24 * 60 * 60 * 1000))}y
                        </div>
                        <div className="text-caption">{t('profile.since')}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={90} className="flex-1 h-2" />
                      <span className="text-xs text-purple-600 dark:text-purple-400 font-medium">Loyal</span>
                    </div>
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
                <div className="px-6 pb-4 border-b">
                  <TabsList className="w-full bg-muted rounded-lg p-1">
                    <TabsTrigger value="overview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('tabs.overview')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="health" className="flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('tabs.healthScore')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="journey" className="flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('tabs.journey')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="interactions" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('tabs.interactions')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="insights" className="flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span className="hidden sm:inline">{t('tabs.insights')}</span>
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-hidden">
                  <TabsContent value="overview" className="h-full m-0 p-6 pt-4">
                    <ScrollArea className="h-full">
                      <div className="space-y-6">
                        {/* Key Metrics */}
                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="metric-card">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-blue-100 rounded-lg dark:bg-blue-900/30">
                                    <DollarSign className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  </div>
                                  <span className="text-foreground">{t('lifetimeValue')}</span>
                                </div>
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-foreground mb-2">
                                {formatCurrency(customer360Data.lifetimeValue.totalValue)}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  {t('predicted')}: {formatCurrency(customer360Data.lifetimeValue.predictedValue)}
                                </p>
                                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 text-xs">
                                  +15.2%
                                </Badge>
                              </div>
                              <Progress value={75} className="mt-3 h-2" />
                            </CardContent>
                          </div>

                          <div className="metric-card">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30">
                                    <Heart className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                  </div>
                                  <span className="text-foreground">{t('healthScore')}</span>
                                </div>
                                <Shield className="h-4 w-4 text-emerald-500" />
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-foreground mb-2">
                                {customer360Data.healthScore.score}
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  {t(`riskLevel.${customer360Data.healthScore.riskLevel}`)} {t('risk')}
                                </p>
                                <Badge className={cn(
                                  "text-xs",
                                  customer360Data.healthScore.riskLevel === 'low' ? "badge-success" :
                                    customer360Data.healthScore.riskLevel === 'medium' ? "badge-warning" :
                                      "badge-danger"
                                )}>
                                  {customer360Data.healthScore.riskLevel}
                                </Badge>
                              </div>
                              <Progress value={customer360Data.healthScore.score} className="mt-3 h-2" />
                            </CardContent>
                          </div>

                          <div className="metric-card">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm font-medium flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
                                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  </div>
                                  <span className="text-foreground">{t('customerSince')}</span>
                                </div>
                                <Award className="h-4 w-4 text-purple-500" />
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="text-2xl font-bold text-foreground mb-2">
                                {Math.floor((Date.now() - new Date(customer360Data.customer.createdAt).getTime()) / (365 * 24 * 60 * 60 * 1000))}y
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-muted-foreground">
                                  {formatDate(customer360Data.customer.createdAt)}
                                </p>
                                <Badge className="badge-info text-xs">
                                  {t('profile.loyal')}
                                </Badge>
                              </div>
                              <Progress value={85} className="mt-3 h-2" />
                            </CardContent>
                          </div>
                        </div>

                        {/* Recent Activity */}
                        <div className="section">
                          <div className="section-header">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
                                <Activity className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div>
                                <h3 className="section-title">{t('recentActivity')}</h3>
                                <p className="section-description">{t('profile.latestInteractions')}</p>
                              </div>
                            </div>
                            <Button variant="outline" size="sm">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {tc('viewAll')}
                            </Button>
                          </div>
                          <div className="p-6">
                            <div className="space-y-4">
                              {customer360Data.interactions.length > 0 ? customer360Data.interactions.map((interaction: any) => (
                                <div key={interaction.id} className="group flex items-center space-x-4 p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-600/60 transition-all duration-300 cursor-pointer">
                                  <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 group-hover:from-blue-100 group-hover:to-indigo-100 dark:group-hover:from-blue-900/30 dark:group-hover:to-indigo-900/30 transition-all duration-300 shadow-sm">
                                    {interaction.type === 'conversation' ? (
                                      <MessageSquare className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                    ) : (
                                      <Ticket className="h-5 w-5 text-slate-600 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                                      {interaction.subject}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-600 dark:text-slate-400">
                                      <span className="font-medium">{toChannelLabel(interaction.channel)}</span>
                                      <span>•</span>
                                      <span>{formatDate(interaction.timestamp)}</span>
                                    </div>
                                  </div>
                                  <Badge className={cn(
                                    "px-3 py-1 rounded-xl font-medium shadow-sm transition-all",
                                    getStatusColor(interaction.status)
                                  )}>
                                    {interaction.status}
                                  </Badge>
                                </div>
                              )) : (
                                <div className="text-center py-12 animate-fade-in">
                                  <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-3xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                                    <Activity className="h-8 w-8 text-slate-400" />
                                  </div>
                                  <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">{t('profile.noRecentActivity')}</h3>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.noRecentActivityDescription')}</p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        {/* Enhanced Key Insights */}
                        <Card className="border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-br from-white/80 to-violet-50/50 dark:from-slate-800/80 dark:to-violet-900/20 backdrop-blur-sm shadow-lg">
                          <CardHeader className="pb-4">
                            <CardTitle className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                                  <Zap className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                  <span className="text-xl font-semibold text-slate-900 dark:text-white">{t('keyInsights')}</span>
                                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">{t('profile.aiAnalysis')}</p>
                                </div>
                              </div>
                              <Badge className="bg-gradient-to-r from-violet-100 to-purple-100 text-violet-700 dark:from-violet-900/30 dark:to-purple-900/30 dark:text-violet-300 border border-violet-200/60 dark:border-violet-700/60 px-3 py-1 rounded-xl">
                                <Sparkles className="h-3 w-3 mr-1" />
                                {t('profile.aiInsights')}
                              </Badge>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {(liveInsights?.keyInsights ?? customer360Data.insights.keyInsights).length > 0 ?
                                (liveInsights?.keyInsights ?? customer360Data.insights.keyInsights).map((insight: string, index: number) => (
                                  <div key={index} className="group flex items-start space-x-4 p-4 rounded-2xl border border-blue-200/60 dark:border-blue-700/60 bg-gradient-to-r from-blue-50/80 to-indigo-50/80 dark:from-blue-900/20 dark:to-indigo-900/20 backdrop-blur-sm hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-600/60 transition-all duration-300">
                                    <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg group-hover:scale-110 transition-transform">
                                      <CheckCircle className="h-4 w-4 text-white" />
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200 leading-relaxed">{insight}</p>
                                    </div>
                                    <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )) : (
                                  <div className="text-center py-12 animate-fade-in">
                                    <div className="w-16 h-16 bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 rounded-3xl flex items-center justify-center mb-4 mx-auto shadow-lg">
                                      <Zap className="h-8 w-8 text-violet-500" />
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
                      <div className="space-y-4">
                        {customer360Data.interactions.map((interaction: any) => (
                          <Card key={interaction.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-muted rounded-full">
                                    {interaction.type === 'conversation' ? (
                                      <MessageSquare className="h-4 w-4" />
                                    ) : (
                                      <Ticket className="h-4 w-4" />
                                    )}
                                  </div>
                                  <div>
                                    <h4 className="font-medium">{interaction.subject}</h4>
                                    <p className="text-sm text-muted-foreground">
                                      {toChannelLabel(interaction.channel)} • {formatDate(interaction.timestamp)}
                                    </p>
                                  </div>
                                </div>
                                <Badge className={getStatusColor(interaction.status)}>
                                  {interaction.status}
                                </Badge>
                              </div>
                              <div className="flex space-x-2">
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4 mr-2" />
                                  {t('viewDetails')}
                                </Button>
                                <Button size="sm" variant="outline">
                                  <MessageSquare className="h-4 w-4 mr-2" />
                                  {t('reply')}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
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
                                <Zap className="h-5 w-5" />
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
                              <Target className="h-5 w-5" />
                              <span>{t('opportunities')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(liveInsights?.opportunities ?? customer360Data.insights.opportunities).map((opportunity: string, index: number) => (
                                <div key={index} className="flex items-start space-x-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                  <TrendingUp className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                  <p className="text-sm text-green-800">{opportunity}</p>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>

                        {/* Behavior + Next Best Actions */}
                        {liveInsights?.behavioralAnalysis && (
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center space-x-2">
                                <Activity className="h-5 w-5" />
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
                        <Card>
                          <CardHeader>
                            <CardTitle className="flex items-center space-x-2">
                              <Zap className="h-5 w-5" />
                              <span>{t('nextBestActions')}</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              {(liveInsights?.nextBestActions ?? customer360Data.insights.nextBestActions).map((action: string, index: number) => (
                                <div key={index} className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                  <div className="flex items-start space-x-3">
                                    <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                    <p className="text-sm text-blue-800">{action}</p>
                                  </div>
                                  <Button size="sm" variant="outline">
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

          {/* Enhanced Sidebar */}
          <div className="w-80 border-l border-slate-200/60 dark:border-slate-700/60 bg-gradient-to-b from-slate-50/80 to-white/80 dark:from-slate-900/80 dark:to-slate-800/80 backdrop-blur-sm">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Enhanced Contact Information */}
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base font-semibold">
                      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                        <User className="h-4 w-4 text-white" />
                      </div>
                      <span>{t('profile.contactInformation')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="group flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                      <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/30 dark:to-green-900/30 rounded-xl">
                        <Mail className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">{t('channels.email')}</div>
                        <div className="font-medium text-slate-900 dark:text-white truncate">{customer360Data.customer.email}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="group flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                      <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-xl">
                        <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">{t('channels.phone')}</div>
                        <div className="font-medium text-slate-900 dark:text-white truncate">{customer360Data.customer.phone}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="group flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer">
                      <div className="p-2 bg-gradient-to-br from-purple-100 to-violet-100 dark:from-purple-900/30 dark:to-violet-900/30 rounded-xl">
                        <Building className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">{t('createDialog.company')}</div>
                        <div className="font-medium text-slate-900 dark:text-white truncate">{customer360Data.customer.company}</div>
                      </div>
                      <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity p-2">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Enhanced Custom Fields */}
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base font-semibold">
                      <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg">
                        <Briefcase className="h-4 w-4 text-white" />
                      </div>
                      <span>{t('profile.companyDetails')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {Object.entries(customer360Data.customer.customFields || {}).length > 0 ? (
                      Object.entries(customer360Data.customer.customFields).map(([key, value]) => {
                        const def = Array.isArray(customFields) ? (customFields as any[]).find(f => f.entity === 'customer' && f.name === key) : undefined;
                        const label = def?.label || key.replace(/([A-Z])/g, ' $1').toLowerCase();
                        return (
                          <div key={key} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-slate-700/30 border border-slate-200/60 dark:border-slate-600/60">
                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">{label}</span>
                            <span className="text-sm font-semibold text-slate-900 dark:text-white">{String(value)}</span>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-600 rounded-2xl flex items-center justify-center mb-3 mx-auto">
                          <Briefcase className="h-6 w-6 text-slate-400" />
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t('profile.noCustomFields')}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Enhanced Quick Actions */}
                <Card className="border-slate-200/60 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center space-x-2 text-base font-semibold">
                      <div className="p-2 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg">
                        <Zap className="h-4 w-4 text-white" />
                      </div>
                      <span>{t('profile.quickActions')}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-11 border-slate-200/60 dark:border-slate-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-600 hover:text-emerald-700 dark:hover:text-emerald-300 transition-all rounded-xl shadow-sm backdrop-blur-sm group"
                    >
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg mr-3 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-800/50 transition-colors">
                        <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      {t('profile.sendMessage')}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-11 border-slate-200/60 dark:border-slate-700/60 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-700 dark:hover:text-blue-300 transition-all rounded-xl shadow-sm backdrop-blur-sm group"
                    >
                      <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg mr-3 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                        <Ticket className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      {t('profile.createTicket')}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-11 border-slate-200/60 dark:border-slate-700/60 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:border-purple-300 dark:hover:border-purple-600 hover:text-purple-700 dark:hover:text-purple-300 transition-all rounded-xl shadow-sm backdrop-blur-sm group"
                    >
                      <div className="p-1.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg mr-3 group-hover:bg-purple-200 dark:group-hover:bg-purple-800/50 transition-colors">
                        <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                      </div>
                      {t('profile.scheduleCall')}
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start h-11 border-slate-200/60 dark:border-slate-700/60 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-600 hover:text-amber-700 dark:hover:text-amber-300 transition-all rounded-xl shadow-sm backdrop-blur-sm group"
                    >
                      <div className="p-1.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg mr-3 group-hover:bg-amber-200 dark:group-hover:bg-amber-800/50 transition-colors">
                        <Star className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      {t('profile.addToVIP')}
                    </Button>

                    <div className="pt-3 border-t border-slate-200/60 dark:border-slate-700/60">
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all rounded-xl h-11"
                      >
                        <Download className="h-4 w-4 mr-2" />
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
      {/* Edit Customer Modal */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile.edit')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="firstName">{t('createDialog.firstName')}</Label>
              <Input id="firstName" value={editForm.firstName} onChange={(e) => setEditForm((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="lastName">{t('createDialog.lastName')}</Label>
              <Input id="lastName" value={editForm.lastName} onChange={(e) => setEditForm((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="email">{t('createDialog.email')}</Label>
              <Input id="email" type="email" value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="company">{t('createDialog.company')}</Label>
              <Input id="company" value={editForm.company} onChange={(e) => setEditForm((p) => ({ ...p, company: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="phone">{t('createDialog.phone')}</Label>
              <Input id="phone" value={editForm.phone} onChange={(e) => setEditForm((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={editLoading}>{tc('cancel')}</Button>
            <Button
              onClick={async () => {
                try {
                  setEditLoading(true)
                  const id = (customer360Data?.customer as any)?.id as string
                  const updated = await customersApi.update(id, editForm)
                  setCustomer360Data((prev: any) => ({ ...(prev || {}), customer: updated }))
                  setEditOpen(false)
                  success('Customer updated')
                } catch (e) {
                  toastError('Failed to update customer')
                } finally {
                  setEditLoading(false)
                }
              }}
              disabled={editLoading}
            >
              {editLoading ? tc('saving', { fallback: 'Saving...' }) : tc('save', { fallback: 'Save' })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Message Modal */}
      <Dialog open={sendOpen} onOpenChange={setSendOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('profile.sendMessage')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="channel">Channel</Label>
              <Select value={sendForm.channelId} onValueChange={(v) => setSendForm((p) => ({ ...p, channelId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {sendChannels.map((ch) => (
                    <SelectItem key={ch.id} value={ch.id}>{(ch.type || '').toString().toUpperCase()} {ch.name ? `• ${ch.name}` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" rows={5} value={sendForm.message} onChange={(e) => setSendForm((p) => ({ ...p, message: e.target.value }))} />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setSendOpen(false)} disabled={sendLoading}>{tc('cancel')}</Button>
            <Button
              onClick={async () => {
                try {
                  if (!sendForm.message.trim()) { toastError('Message is empty'); return; }
                  setSendLoading(true)
                  // ensure advanced conversation for selected channel
                  if (!sendForm.channelId) { toastError('Select a channel'); setSendLoading(false); return; }
                  const created = await (await import('@/lib/api/conversations-client')).conversationsApi.create({ customerId, channelId: sendForm.channelId, subject: undefined, priority: 'medium' })
                  const convId = (created as any)?.id || (created as any)?.data?.id
                  if (!convId) throw new Error('Failed to create conversation')
                  await (await import('@/lib/api/conversations-client')).conversationsApi.sendMessage(convId, { content: sendForm.message.trim(), messageType: 'text' })
                  setSendOpen(false)
                  setSendForm({ message: '', channelId: sendForm.channelId })
                  success('Message sent')
                } catch (e) {
                  console.error(e)
                  toastError('Failed to send message')
                } finally {
                  setSendLoading(false)
                }
              }}
              disabled={sendLoading}
            >
              {sendLoading ? tc('sending', { fallback: 'Sending...' }) : tc('send', { fallback: 'Send' })}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
