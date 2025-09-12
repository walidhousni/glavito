'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
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
import {
  Mail,
  MessageSquare,
  Phone,
  Globe,
  Instagram,
  ShoppingCart,
  Ticket,
  /* Calendar,*/
  Clock,
  TrendingUp,
  Target,
  /* Star,*/
  CheckCircle,
  /* AlertCircle,*/
  Filter,
  Eye
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { customersApi } from '@/lib/api/customers-client';

interface CustomerJourneyTimelineProps {
  customerId: string;
}

export function CustomerJourneyTimeline({ customerId }: CustomerJourneyTimelineProps) {
  const t = useTranslations('customers');
  const [loading, setLoading] = useState(true);
  type Touchpoint = {
    id: string;
    type: string;
    channel: string;
    stage: string;
    interaction: string;
    outcome: string;
    sentiment: string;
    timestamp: Date;
  };
  type StageItem = { stage: string; duration: number; touchpointCount: number };
  type ConversionEvent = { event: string; timestamp: Date; attribution: string[]; value: number };
  const [journeyData, setJourneyData] = useState<{ touchpoints: Touchpoint[]; stages: StageItem[]; conversionEvents: ConversionEvent[] } | null>(null);
  const [selectedStage, setSelectedStage] = useState('all');
  const [selectedChannel, setSelectedChannel] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const data = await customersApi.getJourney(customerId);
        if (!cancelled) {
          // Normalize timestamps to Date objects
          const tp = (data?.touchpoints || []).map((t: any) => ({ ...t, timestamp: new Date(t.timestamp) })) as Touchpoint[];
          const stages = (data?.stages || []).map((s: any) => ({ stage: s.stage, duration: Number(s.duration ?? 0), touchpointCount: Number(s.touchpointCount ?? 0) })) as StageItem[];
          const ce = (data?.conversionEvents || []).map((e: any) => ({ event: String(e.event), timestamp: new Date(e.timestamp), attribution: Array.isArray(e.attribution) ? e.attribution : [], value: Number(e.value ?? 0) })) as ConversionEvent[];
          setJourneyData({ touchpoints: tp, stages, conversionEvents: ce });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [customerId]);

  const getChannelIcon = (type: string) => {
    switch (type) {
      case 'email': return Mail;
      case 'whatsapp': return MessageSquare;
      case 'phone': return Phone;
      case 'web': return Globe;
      case 'instagram': return Instagram;
      default: return Globe;
    }
  };

  const getInteractionIcon = (interaction: string) => {
    switch (interaction) {
      case 'purchase':
      case 'upgrade_purchase': return ShoppingCart;
      case 'support_ticket': return Ticket;
      case 'demo_call': return Phone;
      case 'newsletter_signup': return Mail;
      default: return MessageSquare;
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50 border-green-200';
      case 'satisfied': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'engaged': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'interested': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'neutral': return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'frustrated': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'awareness': return 'bg-blue-500';
      case 'interest': return 'bg-green-500';
      case 'consideration': return 'bg-yellow-500';
      case 'purchase': return 'bg-orange-500';
      case 'onboarding': return 'bg-purple-500';
      case 'retention': return 'bg-indigo-500';
      case 'expansion': return 'bg-pink-500';
      case 'advocacy': return 'bg-emerald-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (milliseconds: number) => {
    const days = Math.floor(milliseconds / (24 * 60 * 60 * 1000));
    if (days === 0) return 'Same day';
    if (days === 1) return '1 day';
    return `${days} days`;
  };

  const filteredTouchpoints = journeyData?.touchpoints.filter((touchpoint: Touchpoint) => {
    const stageMatch = selectedStage === 'all' || touchpoint.stage === selectedStage;
    const channelMatch = selectedChannel === 'all' || touchpoint.type === selectedChannel;
    return stageMatch && channelMatch;
  }) || [];

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="customer-card p-4 animate-pulse">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-muted rounded-full" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="h-3 bg-muted rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!journeyData) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center mb-4 mx-auto">
          <Target className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">No Journey Data Available</h3>
        <p className="text-muted-foreground mb-4">{t('noJourneyData')}</p>
        <p className="text-sm text-muted-foreground">Journey data will appear here as the customer interacts with your business.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="customer-card p-4">
        <div className="flex items-center gap-4">
          <Select value={selectedStage} onValueChange={setSelectedStage}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('allStages')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allStages')}</SelectItem>
              <SelectItem value="awareness">{t('stages.awareness')}</SelectItem>
              <SelectItem value="interest">{t('stages.interest')}</SelectItem>
              <SelectItem value="consideration">{t('stages.consideration')}</SelectItem>
              <SelectItem value="purchase">{t('stages.purchase')}</SelectItem>
              <SelectItem value="onboarding">{t('stages.onboarding')}</SelectItem>
              <SelectItem value="retention">{t('stages.retention')}</SelectItem>
              <SelectItem value="expansion">{t('stages.expansion')}</SelectItem>
              <SelectItem value="advocacy">{t('stages.advocacy')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedChannel} onValueChange={setSelectedChannel}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('allChannels')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allChannels')}</SelectItem>
              <SelectItem value="email">{t('channels.email')}</SelectItem>
              <SelectItem value="whatsapp">{t('channels.whatsapp')}</SelectItem>
              <SelectItem value="web">{t('channels.web')}</SelectItem>
              <SelectItem value="phone">{t('channels.phone')}</SelectItem>
              <SelectItem value="instagram">{t('channels.instagram')}</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            {t('moreFilters')}
          </Button>
        </div>
      </div>

      {/* Journey Stages Overview */}
      <div className="section">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg dark:bg-purple-900/30">
              <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h3 className="section-title">{t('journeyStages')}</h3>
              <p className="section-description">Customer progression overview</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between">
          {journeyData.stages.map((stage: StageItem, index: number) => (
            <React.Fragment key={stage.stage}>
              <div className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className={cn("w-16 h-16 rounded-xl flex items-center justify-center shadow-md", getStageColor(stage.stage))}>
                    <Target className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-xs font-bold text-white">{stage.touchpointCount}</span>
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <div className="font-medium text-sm capitalize text-foreground">
                    {stage.stage.replace('_', ' ')}
                  </div>
                  <div className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-md">
                    {formatDuration(stage.duration)}
                  </div>
                </div>
              </div>
              {index < journeyData.stages.length - 1 && (
                <div className="flex-1 h-0.5 bg-muted mx-4" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Timeline */}
      <div className="section">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg dark:bg-amber-900/30">
              <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h3 className="section-title">{t('interactionTimeline')}</h3>
              <p className="section-description">Detailed interaction history</p>
            </div>
          </div>
        </div>

        <div className="relative">
          {/* Timeline Line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
          
          <div className="space-y-4 relative">
            {filteredTouchpoints.map((touchpoint: Touchpoint, index: number) => {
              const ChannelIcon = getChannelIcon(touchpoint.type);
              const InteractionIcon = getInteractionIcon(touchpoint.interaction);

              return (
                <div key={touchpoint.id} className="timeline-item">
                  {/* Timeline Node */}
                  <div className="relative z-10">
                    <div className={cn("w-12 h-12 rounded-lg flex items-center justify-center border-2 border-white dark:border-slate-900", getStageColor(touchpoint.stage))}>
                      <InteractionIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="customer-card p-4">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <h4 className="font-semibold text-foreground capitalize">
                          {touchpoint.interaction.replace('_', ' ')}
                        </h4>
                        <Badge variant="secondary" className="text-xs">
                          {touchpoint.stage}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(touchpoint.timestamp)}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <ChannelIcon className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <span className="text-xs text-muted-foreground">Channel</span>
                          <div className="font-medium text-foreground">{touchpoint.channel}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        <div>
                          <span className="text-xs text-muted-foreground">Outcome</span>
                          <div className="font-medium text-foreground">{touchpoint.outcome.replace('_', ' ')}</div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className={cn("text-xs", getSentimentColor(touchpoint.sentiment))}>
                        {touchpoint.sentiment}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        {t('details')}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Conversion Events */}
      <div className="section">
        <div className="section-header">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 rounded-lg dark:bg-emerald-900/30">
              <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h3 className="section-title">{t('conversionEvents')}</h3>
              <p className="section-description">Key conversion milestones</p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {journeyData.conversionEvents.map((event: ConversionEvent, index: number) => (
            <div key={event.event} className="customer-card p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold text-white">#{index + 1}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="font-semibold text-foreground capitalize">
                      {event.event.replace('_', ' ')}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDate(event.timestamp)}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{t('attribution')}:</span>
                      <div className="flex items-center gap-1">
                        {event.attribution.slice(0, 3).map((channel: string, index: number) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {channel}
                          </Badge>
                        ))}
                        {event.attribution.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{event.attribution.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {event.value > 0 && (
                  <div className="text-right">
                    <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                      ${event.value.toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{t('value')}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}