'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  TrendingUp,
  Target,
  CheckCircle,
  Filter,
  Eye,
  Calendar,
  Activity,
  ArrowRight,
  Zap,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { customersApi } from '@/lib/api/customers-client';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface CustomerJourneyTimelineProps {
  customerId: string;
}

interface Touchpoint {
  id: string;
  type: string;
  channel: string;
  interaction: string;
  outcome: string;
  sentiment?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface StageItem {
  stage: string;
  entryDate: Date;
  duration: number;
  touchpointCount: number;
}

interface ConversionEvent {
  event: string;
  timestamp: Date;
  attribution: string[];
  value: number;
}

interface JourneyData {
  touchpoints: Touchpoint[];
  stages: StageItem[];
  conversionEvents: ConversionEvent[];
}

const ICONS8_URLS = {
  // Channels
  email: 'https://img.icons8.com/?id=LPcVNr4g0oyz&format=png&size=48',
  whatsapp: 'https://img.icons8.com/?id=16713&format=png&size=48',
  instagram: 'https://img.icons8.com/?id=32292&format=png&size=48',
  phone: 'https://img.icons8.com/?id=9730&format=png&size=48',
  web: 'https://img.icons8.com/?id=59740&format=png&size=48',
  
  // Interactions
  purchase: 'https://img.icons8.com/?id=Ot2P5D5MPltM&format=png&size=48',
  ticket: 'https://img.icons8.com/?id=85057&format=png&size=48',
  message: 'https://img.icons8.com/?id=86450&format=png&size=48',
  call: 'https://img.icons8.com/?id=9730&format=png&size=48',
  meeting: 'https://img.icons8.com/?id=53384&format=png&size=48',
  survey: 'https://img.icons8.com/?id=43821&format=png&size=48',
  breach: 'https://img.icons8.com/?id=112259&format=png&size=48',
  
  // Stages
  awareness: 'https://img.icons8.com/?id=68318&format=png&size=48',
  consideration: 'https://img.icons8.com/?id=84858&format=png&size=48',
  purchase_stage: 'https://img.icons8.com/?id=15886&format=png&size=48',
  retention: 'https://img.icons8.com/?id=37400&format=png&size=48',
  advocacy: 'https://img.icons8.com/?id=3685&format=png&size=48',
} as const;

const STAGE_CONFIG = {
  awareness: {
    label: 'Awareness',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    textColor: 'text-blue-700 dark:text-blue-300',
    icon: ICONS8_URLS.awareness,
  },
  consideration: {
    label: 'Consideration',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    textColor: 'text-purple-700 dark:text-purple-300',
    icon: ICONS8_URLS.consideration,
  },
  purchase: {
    label: 'Purchase',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    textColor: 'text-emerald-700 dark:text-emerald-300',
    icon: ICONS8_URLS.purchase_stage,
  },
  retention: {
    label: 'Retention',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/20',
    textColor: 'text-amber-700 dark:text-amber-300',
    icon: ICONS8_URLS.retention,
  },
  advocacy: {
    label: 'Advocacy',
    color: 'from-pink-500 to-pink-600',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    textColor: 'text-pink-700 dark:text-pink-300',
    icon: ICONS8_URLS.advocacy,
  },
} as const;

export function CustomerJourneyTimeline({ customerId }: CustomerJourneyTimelineProps) {
  const [loading, setLoading] = useState(true);
  const [journeyData, setJourneyData] = useState<JourneyData | null>(null);
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [activeView, setActiveView] = useState<'timeline' | 'stages' | 'conversions'>('timeline');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    
    (async () => {
      try {
        const data = await customersApi.getJourney(customerId);
        if (!cancelled && data) {
          // Normalize timestamps to Date objects
          const touchpoints = (data?.touchpoints || []).map((t: any) => ({
            ...t,
            timestamp: new Date(t.timestamp)
          })) as Touchpoint[];
          
          const stages = (data?.stages || []).map((s: any) => ({
            stage: String(s.stage),
            entryDate: new Date(s.entryDate),
            duration: Number(s.duration ?? 0),
            touchpointCount: Number(s.touchpointCount ?? 0)
          })) as StageItem[];
          
          const conversionEvents = (data?.conversionEvents || []).map((e: any) => ({
            event: String(e.event),
            timestamp: new Date(e.timestamp),
            attribution: Array.isArray(e.attribution) ? e.attribution : [],
            value: Number(e.value ?? 0)
          })) as ConversionEvent[];

          setJourneyData({ touchpoints, stages, conversionEvents });
        }
      } catch (error) {
        console.error('Failed to load customer journey:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    
    return () => { cancelled = true; };
  }, [customerId]);

  const getChannelIcon = (type: string) => {
    const channelMap: Record<string, string> = {
      email: ICONS8_URLS.email,
      whatsapp: ICONS8_URLS.whatsapp,
      instagram: ICONS8_URLS.instagram,
      phone: ICONS8_URLS.phone,
      web: ICONS8_URLS.web,
    };
    return channelMap[type] || ICONS8_URLS.web;
  };

  const getInteractionIcon = (interaction: string) => {
    const interactionMap: Record<string, string> = {
      purchase: ICONS8_URLS.purchase,
      upgrade_purchase: ICONS8_URLS.purchase,
      support_ticket: ICONS8_URLS.ticket,
      sla_breach: ICONS8_URLS.breach,
      demo_call: ICONS8_URLS.call,
      conversation: ICONS8_URLS.message,
      survey_sent: ICONS8_URLS.survey,
      survey_response: ICONS8_URLS.survey,
    };
    return interactionMap[interaction] || ICONS8_URLS.message;
  };

  const getSentimentBadge = (sentiment?: string) => {
    if (!sentiment) return null;
    
    const sentimentConfig: Record<string, { label: string; className: string }> = {
      positive: { label: 'Positive', className: 'bg-green-100 text-green-700 border-green-300' },
      satisfied: { label: 'Satisfied', className: 'bg-blue-100 text-blue-700 border-blue-300' },
      engaged: { label: 'Engaged', className: 'bg-purple-100 text-purple-700 border-purple-300' },
      neutral: { label: 'Neutral', className: 'bg-gray-100 text-gray-700 border-gray-300' },
      negative: { label: 'Negative', className: 'bg-red-100 text-red-700 border-red-300' },
      frustrated: { label: 'Frustrated', className: 'bg-orange-100 text-orange-700 border-orange-300' },
    };

    const config = sentimentConfig[sentiment] || sentimentConfig.neutral;
    return <Badge variant="outline" className={cn('text-xs', config.className)}>{config.label}</Badge>;
  };

  const formatDuration = (milliseconds: number) => {
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Same day';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const calculateJourneyProgress = () => {
    if (!journeyData || journeyData.stages.length === 0) return 0;
    const totalStages = 5; // awareness, consideration, purchase, retention, advocacy
    return (journeyData.stages.length / totalStages) * 100;
  };

  const filteredTouchpoints = journeyData?.touchpoints.filter((touchpoint) => {
    const stageMatch = selectedStage === 'all' || (touchpoint.metadata?.stage === selectedStage);
    const channelMatch = selectedChannel === 'all' || touchpoint.type === selectedChannel;
    return stageMatch && channelMatch;
  }) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading customer journey...</p>
        </div>
      </div>
    );
  }

  if (!journeyData || (journeyData.touchpoints.length === 0 && journeyData.stages.length === 0)) {
    return (
      <div className="text-center py-16">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="max-w-md mx-auto space-y-6"
        >
          <div className="relative w-24 h-24 mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-950 dark:to-purple-950 rounded-2xl rotate-6" />
            <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950 dark:to-pink-950 rounded-2xl -rotate-6" />
            <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
              <Target className="h-12 w-12 text-white" />
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-foreground">No Journey Data Yet</h3>
            <p className="text-sm text-muted-foreground">
              This customer hasn&apos;t started their journey. Data will appear as they interact with your business.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 mt-8">
            {[
              { icon: ICONS8_URLS.email, label: 'First Contact' },
              { icon: ICONS8_URLS.purchase, label: 'First Purchase' },
              { icon: ICONS8_URLS.retention, label: 'Retention' },
            ].map((item, i) => (
              <div key={i} className="p-4 bg-muted/50 rounded-lg border border-border/50">
                <Image src={item.icon} alt={item.label} width={32} height={32} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs text-muted-foreground text-center">{item.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-500 rounded-lg shadow-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Touchpoints</p>
                <p className="text-2xl font-bold text-foreground">{journeyData.touchpoints.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-500 rounded-lg shadow-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Journey Stages</p>
                <p className="text-2xl font-bold text-foreground">{journeyData.stages.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/50 dark:to-emerald-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500 rounded-lg shadow-lg">
                <CheckCircle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Conversions</p>
                <p className="text-2xl font-bold text-foreground">{journeyData.conversionEvents.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500 rounded-lg shadow-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">Journey Progress</p>
                <p className="text-2xl font-bold text-foreground">{Math.round(calculateJourneyProgress())}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & View Toggle */}
      <Card className="border-0 shadow-md">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">Filters:</span>
            </div>

            <Select value={selectedStage} onValueChange={setSelectedStage}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Stages" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="awareness">Awareness</SelectItem>
                <SelectItem value="consideration">Consideration</SelectItem>
                <SelectItem value="purchase">Purchase</SelectItem>
                <SelectItem value="retention">Retention</SelectItem>
                <SelectItem value="advocacy">Advocacy</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedChannel} onValueChange={setSelectedChannel}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Channels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Channels</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="web">Web</SelectItem>
                <SelectItem value="phone">Phone</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
              </SelectContent>
            </Select>

            <div className="ml-auto">
              <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="w-auto">
                <TabsList className="grid grid-cols-3 h-9">
                  <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
                  <TabsTrigger value="stages" className="text-xs">Stages</TabsTrigger>
                  <TabsTrigger value="conversions" className="text-xs">Conversions</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {activeView === 'timeline' && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Timeline View */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <span>Interaction Timeline</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px] pr-4">
                  <div className="relative space-y-6">
                    {/* Timeline Line */}
                    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-purple-500 to-pink-500" />

                    {filteredTouchpoints.length === 0 ? (
                      <div className="text-center py-12">
                        <p className="text-sm text-muted-foreground">No touchpoints match your filters</p>
                      </div>
                    ) : (
                      filteredTouchpoints.map((touchpoint, index) => (
                        <motion.div
                          key={touchpoint.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="relative pl-16"
                        >
                          {/* Timeline Node */}
                          <div className="absolute left-0 top-4">
                            <div className="relative">
                              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center shadow-lg ring-4 ring-background">
                                <Image
                                  src={getInteractionIcon(touchpoint.interaction)}
                                  alt={touchpoint.interaction}
                                  width={24}
                                  height={24}
                                  className="brightness-0 invert"
                                />
                              </div>
                              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center ring-2 ring-background shadow-sm">
                                <Image
                                  src={getChannelIcon(touchpoint.type)}
                                  alt={touchpoint.type}
                                  width={12}
                                  height={12}
                                />
                              </div>
                            </div>
                          </div>

                          {/* Content Card */}
                          <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1 flex-1">
                                    <h4 className="font-semibold text-foreground capitalize group-hover:text-primary transition-colors">
                                      {touchpoint.interaction.replace(/_/g, ' ')}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDistanceToNow(touchpoint.timestamp, { addSuffix: true })}</span>
                                    </div>
                                  </div>
                                  {getSentimentBadge(touchpoint.sentiment)}
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-muted rounded-md">
                                      <Image
                                        src={getChannelIcon(touchpoint.type)}
                                        alt={touchpoint.type}
                                        width={14}
                                        height={14}
                                      />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Channel</p>
                                      <p className="text-xs font-medium text-foreground capitalize truncate">{touchpoint.channel}</p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-muted rounded-md">
                                      <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Outcome</p>
                                      <p className="text-xs font-medium text-foreground capitalize truncate">{touchpoint.outcome.replace(/_/g, ' ')}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                                    <Eye className="h-3 w-3 mr-1.5" />
                                    View Details
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeView === 'stages' && (
          <motion.div
            key="stages"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Stages View */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg">
                    <Target className="h-4 w-4 text-white" />
                  </div>
                  <span>Journey Stages</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                {/* Progress Bar */}
                <div className="mb-8 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">Journey Progress</span>
                    <span className="text-muted-foreground">{Math.round(calculateJourneyProgress())}%</span>
                  </div>
                  <Progress value={calculateJourneyProgress()} className="h-2" />
                </div>

                {/* Stages Flow */}
                <ScrollArea className="w-full">
                  <div className="flex items-center gap-4 pb-4">
                    {journeyData.stages.map((stage, index) => {
                      const config = STAGE_CONFIG[stage.stage as keyof typeof STAGE_CONFIG] || {
                        label: stage.stage,
                        color: 'from-gray-500 to-gray-600',
                        bgColor: 'bg-gray-50',
                        textColor: 'text-gray-700',
                        icon: ICONS8_URLS.web,
                      };

                      return (
                        <React.Fragment key={stage.stage}>
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.1 }}
                            className="flex flex-col items-center min-w-[180px]"
                          >
                            <Card className={cn('border-0 shadow-xl w-full', config.bgColor)}>
                              <CardContent className="p-4 space-y-3">
                                {/* Icon */}
                                <div className="flex items-center justify-center">
                                  <div className={cn('w-16 h-16 rounded-xl bg-gradient-to-br shadow-lg flex items-center justify-center', config.color)}>
                                    <Image
                                      src={config.icon}
                                      alt={stage.stage}
                                      width={32}
                                      height={32}
                                      className="brightness-0 invert"
                                    />
                                  </div>
                                </div>

                                {/* Title & Badge */}
                                <div className="text-center space-y-1.5">
                                  <h4 className={cn('font-semibold capitalize', config.textColor)}>
                                    {config.label}
                                  </h4>
                                  <Badge variant="secondary" className="text-xs">
                                    {stage.touchpointCount} touchpoints
                                  </Badge>
                                </div>

                                {/* Duration */}
                                <div className="flex items-center justify-center gap-2 pt-2 border-t border-border/50">
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground font-medium">
                                    {formatDuration(stage.duration)}
                                  </span>
                                </div>

                                {/* Entry Date */}
                                <div className="text-center">
                                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">Started</p>
                                  <p className="text-xs font-medium text-foreground">
                                    {formatDistanceToNow(stage.entryDate, { addSuffix: true })}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>

                          {/* Connector Arrow */}
                          {index < journeyData.stages.length - 1 && (
                            <div className="flex items-center justify-center flex-shrink-0">
                              <ArrowRight className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {activeView === 'conversions' && (
          <motion.div
            key="conversions"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Conversions View */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 bg-gradient-to-br from-emerald-500 to-green-500 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span>Conversion Events</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {journeyData.conversionEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
                      <TrendingUp className="h-8 w-8 text-emerald-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Conversions Yet</h3>
                    <p className="text-sm text-muted-foreground">Conversion events will appear here when the customer completes key actions.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {journeyData.conversionEvents.map((event, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <Card className="border-0 shadow-md hover:shadow-xl transition-all duration-300 group cursor-pointer bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-950/20 dark:to-green-950/20">
                          <CardContent className="p-5">
                            <div className="flex items-center gap-6">
                              {/* Icon */}
                              <div className="relative flex-shrink-0">
                                <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                                  <CheckCircle className="h-8 w-8 text-white" />
                                </div>
                                <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-500 rounded-full flex items-center justify-center shadow-md">
                                  <span className="text-xs font-bold text-white">#{index + 1}</span>
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-1">
                                    <h4 className="text-lg font-bold text-foreground capitalize group-hover:text-emerald-600 transition-colors">
                                      {event.event.replace(/_/g, ' ')}
                                    </h4>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                      <Calendar className="h-3 w-3" />
                                      <span>{formatDistanceToNow(event.timestamp, { addSuffix: true })}</span>
                                    </div>
                                  </div>
                                  {event.value > 0 && (
                                    <div className="text-right">
                                      <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                        ${event.value.toLocaleString()}
                                      </p>
                                      <p className="text-xs text-muted-foreground">Revenue</p>
                                    </div>
                                  )}
                                </div>

                                {/* Attribution */}
                                {event.attribution.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground font-medium">Attribution:</span>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {event.attribution.slice(0, 4).map((channel, i) => (
                                        <Badge key={i} variant="secondary" className="text-xs capitalize">
                                          {channel}
                                        </Badge>
                                      ))}
                                      {event.attribution.length > 4 && (
                                        <Badge variant="secondary" className="text-xs">
                                          +{event.attribution.length - 4} more
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}