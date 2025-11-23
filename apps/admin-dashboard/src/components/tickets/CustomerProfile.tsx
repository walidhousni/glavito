'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  User,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  Tag,
  Sparkles,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Package,
  CreditCard,
  Paperclip,
  Plus,
  X,
  List,
  FileText,
  Search,
} from 'lucide-react';
import { conversationsApi } from '@/lib/api/conversations-client';
import { useToast } from '@/components/ui/toast';
import { formatDistanceToNow } from 'date-fns';
import { ConversationCollaborators } from './conversation-collaborators';

interface CustomerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  tags?: string[];
  ticketCount?: number;
  resolvedTickets?: number;
  ltv?: number;
}

interface AIInsights {
  results?: {
    triage?: {
      intent?: string;
      category?: string;
      priority?: string;
      urgencyLevel?: string;
      language?: string;
      confidence?: number;
    };
    sentimentAnalysis?: {
      sentiment: string;
    };
    urgencyDetection?: {
      urgencyLevel: string;
    };
  };
  suggestions?: string[];
  triageConfidence?: number;
}

interface CustomerProfileProps {
  conversationId: string;
  ticketId?: string;
}

export function CustomerProfile({ conversationId, ticketId }: CustomerProfileProps) {
  const t = useTranslations('customerProfile');
  const { error: toastError } = useToast();

  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [conversation, setConversation] = useState<{
    teamId?: string | null;
    assignedAgentId?: string | null;
    team?: { id: string; name: string; color?: string } | null;
    assignedAgent?: {
      id: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      avatar?: string;
    } | null;
  } | null>(null);

  const loadData = React.useCallback(async () => {
    try {
      const res = await conversationsApi.getContextAdvanced(conversationId);
      const data = (res && typeof res === 'object') ? ((res as { data?: unknown }).data ?? res) : res;
      
      // Extract customer from context
      const customerProfile = data?.customerProfile || data?.conversation?.customer || null;
      setCustomer(customerProfile);
      
      // Extract conversation data for collaborators
      const convData = data?.conversation || null;
      setConversation(convData);

      // Load AI insights if available
      if (ticketId && data?.tenantId) {
        try {
          const { ticketsApi } = await import('@/lib/api/tickets-client');
          const insights = await ticketsApi.aiAnalysis(ticketId, data.tenantId);
          setAiInsights(insights as AIInsights);
        } catch {
          // AI insights not available
        }
      }
    } catch (e) {
      console.error('Failed to load customer data:', e);
      toastError('Failed to load customer data');
    } finally {
      setLoading(false);
    }
  }, [conversationId, ticketId, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8 border-l">
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    );
  }

  const customerName = customer
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || t('unknownCustomer')
    : t('unknownCustomer');

  const joinedDate = customer?.createdAt
    ? formatDistanceToNow(new Date(customer.createdAt), { addSuffix: true })
    : t('unknown');

  return (
    <div className="h-full flex flex-col border-l bg-background">
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {/* Customer Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-14 w-14 ring-2 ring-white/50 dark:ring-slate-900/50 shadow-lg">
                <AvatarFallback className="bg-gradient-to-br from-green-400 via-green-500 to-emerald-600 text-white text-xl font-bold shadow-inner">
                {customerName[0]?.toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-base">{customerName}</h3>
              </div>
            </div>

            {/* Action Icons */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-blue-50 hover:to-blue-100 dark:hover:from-blue-950/50 dark:hover:to-blue-900/50 transition-all duration-200 hover:scale-105">
                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-purple-50 hover:to-purple-100 dark:hover:from-purple-950/50 dark:hover:to-purple-900/50 transition-all duration-200 hover:scale-105">
                <Building2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-orange-50 hover:to-orange-100 dark:hover:from-orange-950/50 dark:hover:to-orange-900/50 transition-all duration-200 hover:scale-105">
                <Package className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              </Button>
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 hover:bg-gradient-to-br hover:from-green-50 hover:to-green-100 dark:hover:from-green-950/50 dark:hover:to-green-900/50 transition-all duration-200 hover:scale-105">
                <Paperclip className="h-4 w-4 text-green-600 dark:text-green-400" />
              </Button>
            </div>
          </div>

          {/* Collaborators Section */}
          <ConversationCollaborators
            conversationId={conversationId}
            conversation={conversation || undefined}
            onUpdate={loadData}
          />

          <Separator />

          {/* Contact Info Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{t('contactInfo')}</h4>
                  </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{customer?.phone || '-'}</span>
                </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{customer?.email || '-'}</span>
                  </div>
                </div>
                  </div>

          {/* Remarks Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{t('remarks')}</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
                </div>
            <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg bg-muted/30">
              <FileText className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground text-center">{t('noRemarks')}</p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {t('addRemarks')}
              </p>
                </div>
              </div>

          {/* Labels Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{t('labels')}</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            {customer?.tags && customer.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {customer.tags.map((tag: string) => (
                  <Badge key={tag} variant="secondary" className="text-xs flex items-center gap-1">
                          {tag}
                    <X className="h-3 w-3 cursor-pointer" />
                        </Badge>
                      ))}
                    </div>
            ) : (
              <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300 flex items-center gap-1">
                {t('newCustomer')}
                <X className="h-3 w-3 cursor-pointer" />
              </Badge>
            )}
          </div>

          {/* Lists Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{t('lists')}</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="flex flex-col items-center justify-center py-8 border border-dashed rounded-lg bg-muted/30">
              <List className="h-8 w-8 text-muted-foreground mb-2 opacity-50" />
              <p className="text-xs text-muted-foreground text-center">{t('noLists')}</p>
              <p className="text-xs text-muted-foreground text-center mt-1">
                {t('addLists')}
              </p>
            </div>
          </div>

          {/* Contact Property Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">{t('contactProperty')}</h4>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <Search className="h-3.5 w-3.5" />
              </Button>
                  </div>
                </div>

          {/* AI Insights */}
          {aiInsights && (
            <Card className="border-purple-200/50 dark:border-purple-900/50 bg-gradient-to-br from-purple-50/30 to-white dark:from-purple-950/20 dark:to-slate-900 shadow-lg shadow-purple-500/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  {t('aiInsights')}
                </CardTitle>
                <CardDescription className="text-xs">
                  {t('poweredByAi')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {aiInsights.results?.triage && (
                  <>
                    {aiInsights.results.triage.intent && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('intent')}</p>
                        <Badge variant="secondary" className="bg-purple-50 text-purple-700 dark:bg-purple-950">
                          {aiInsights.results.triage.intent.replace(/_/g, ' ')}
                        </Badge>
                      </div>
                    )}
                    {aiInsights.results.triage.category && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('category')}</p>
                        <Badge variant="outline">
                          {aiInsights.results.triage.category}
                        </Badge>
                      </div>
                    )}
                    {aiInsights.results.triage.priority && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('aiPriority')}</p>
                        <Badge
                          variant="outline"
                          className={cn(
                            aiInsights.results.triage.priority === 'urgent' && 'border-red-500 text-red-700',
                            aiInsights.results.triage.priority === 'high' && 'border-orange-500 text-orange-700'
                          )}
                        >
                          {aiInsights.results.triage.priority}
                        </Badge>
                      </div>
                    )}
                    {aiInsights.results.triage.confidence !== undefined && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">{t('confidence')}</p>
                        <div className="flex items-center gap-2">
                          <div className="h-2 flex-1 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all"
                              style={{ width: `${(aiInsights.results.triage.confidence * 100).toFixed(0)}%` }}
                            />
                          </div>
                          <span className="text-xs font-medium">
                            {(aiInsights.results.triage.confidence * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {aiInsights.results?.sentimentAnalysis && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('sentiment')}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        aiInsights.results.sentimentAnalysis.sentiment === 'positive' &&
                          'border-green-500 text-green-700',
                        aiInsights.results.sentimentAnalysis.sentiment === 'negative' &&
                          'border-red-500 text-red-700',
                        aiInsights.results.sentimentAnalysis.sentiment === 'neutral' &&
                          'border-gray-500 text-gray-700'
                      )}
                    >
                      {aiInsights.results.sentimentAnalysis.sentiment}
                    </Badge>
                  </div>
                )}

                {aiInsights.results?.urgencyDetection && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('urgencyLevel')}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        aiInsights.results.urgencyDetection.urgencyLevel === 'critical' &&
                          'border-red-500 text-red-700',
                        aiInsights.results.urgencyDetection.urgencyLevel === 'high' &&
                          'border-orange-500 text-orange-700'
                      )}
                    >
                      <AlertCircle className="h-3 w-3 mr-1" />
                      {aiInsights.results.urgencyDetection.urgencyLevel}
                    </Badge>
                  </div>
                )}

                {aiInsights.suggestions && aiInsights.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t('suggestedActions')}</p>
                    <div className="space-y-1">
                      {aiInsights.suggestions.slice(0, 3).map((suggestion: string, index: number) => (
                        <div key={index} className="text-xs p-2 bg-purple-50 dark:bg-purple-950 rounded-md">
                          {suggestion}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Customer Stats */}
          <Card className="border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/30 to-white dark:from-slate-900/50 dark:to-slate-800/50 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
                {t('activity')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('totalTickets')}</p>
                  <p className="text-2xl font-bold">{customer?.ticketCount || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t('resolved')}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {customer?.resolvedTickets || 0}
                  </p>
                </div>
              </div>

              {customer?.ltv && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-950/30 dark:to-emerald-950/30 border border-green-200/50 dark:border-green-800/50 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/30">
                      <DollarSign className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{t('lifetimeValue')}</span>
                  </div>
                  <span className="text-sm font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">${customer.ltv}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-slate-200/50 dark:border-slate-700/50 bg-gradient-to-br from-slate-50/30 to-white dark:from-slate-900/50 dark:to-slate-800/50 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">{t('quickActions')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" size="sm" className="w-full justify-start h-9 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 dark:hover:from-orange-950/50 dark:hover:to-amber-950/50 transition-all duration-200 hover:scale-[1.02]">
                <Package className="h-4 w-4 mr-2 text-orange-600 dark:text-orange-400" />
                {t('viewOrders')}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start h-9 hover:bg-gradient-to-r hover:from-blue-50 hover:to-cyan-50 dark:hover:from-blue-950/50 dark:hover:to-cyan-950/50 transition-all duration-200 hover:scale-[1.02]">
                <CreditCard className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400" />
                {t('paymentHistory')}
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start h-9 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 dark:hover:from-purple-950/50 dark:hover:to-pink-950/50 transition-all duration-200 hover:scale-[1.02]">
                <AlertCircle className="h-4 w-4 mr-2 text-purple-600 dark:text-purple-400" />
                {t('viewAllTickets')}
              </Button>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}

