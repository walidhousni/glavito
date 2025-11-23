'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Search,
  Plus,
  Inbox,
  AlertCircle,
  CheckCircle2,
  MessageSquare,
  Mail,
  Instagram,
  Phone,
  Zap,
  ChevronUp,
  ChevronDown,
  Filter,
  ArrowUpDown,
  User,
  Users,
  AtSign,
  Bot
} from 'lucide-react';
import { ChannelSetupDialog } from './channel-setup-dialog';
import { useAuthStore } from '@/lib/store/auth-store';

interface ConversationLite {
  id: string;
  subject?: string;
  priority?: string;
  channel?: { type?: string } | string;
  customer?: { firstName?: string; lastName?: string; email?: string; name?: string; phone?: string };
  lastMessage?: { preview?: string; content?: string; createdAt?: string | Date };
  ticketId?: string;
  lastMessageAt?: string | Date;
  updatedAt?: string | Date;
  unreadCount?: number;
  slaInstance?: { breachCount?: number };
  [key: string]: unknown;
}

interface ConversationListProps {
  conversations: ConversationLite[];
  stats?: Record<string, unknown>;
  filters: {
    status: string[];
    channel: string[];
    assignedAgentId?: string;
  };
  onFiltersChange: (filters: ConversationListProps['filters']) => void;
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string, ticketId?: string) => void;
  mode: 'admin' | 'agent';
  activeChannelTab?: 'social' | 'all';
  onChannelTabChange?: (tab: 'social' | 'all') => void;
}

// reserved for future use: status chips and channel icons (removed now to avoid lints)

const channelConfig = {
  whatsapp: { 
    icon: MessageSquare, 
    label: 'WhatsApp', 
    color: 'bg-green-500', 
    textColor: 'text-green-700 dark:text-green-400',
    badgeColor: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
  },
  instagram: { 
    icon: Instagram, 
    label: 'Instagram', 
    color: 'bg-pink-500', 
    textColor: 'text-pink-700 dark:text-pink-400',
    badgeColor: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
  },
  email: { 
    icon: Mail, 
    label: 'Email', 
    color: 'bg-blue-500', 
    textColor: 'text-blue-700 dark:text-blue-400',
    badgeColor: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
  },
  sms: { 
    icon: Phone, 
    label: 'SMS', 
    color: 'bg-orange-500', 
    textColor: 'text-orange-700 dark:text-orange-400',
    badgeColor: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
  },
  web: { 
    icon: MessageSquare, 
    label: 'Web', 
    color: 'bg-slate-500', 
    textColor: 'text-slate-700 dark:text-slate-400',
    badgeColor: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400'
  },
};

export function ConversationList({
  conversations,
  stats,
  filters,
  onFiltersChange,
  selectedConversationId,
  onSelectConversation,
  mode,
  activeChannelTab = 'all',
  onChannelTabChange,
}: ConversationListProps) {
  const t = useTranslations('conversationList');
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [showChannelSetup, setShowChannelSetup] = useState(false);
  const [selectedChannelType, setSelectedChannelType] = useState<'whatsapp' | 'messenger' | 'instagram' | 'email' | 'sms'>('whatsapp');
  const [myInboxOpen, setMyInboxOpen] = useState(true);
  const [companyInboxOpen, setCompanyInboxOpen] = useState(true);
  const [activeInboxFilter, setActiveInboxFilter] = useState<'assigned' | 'collaborations' | 'mentions' | 'ai' | 'all'>('assigned');

  const handleInboxFilter = (filter: 'assigned' | 'collaborations' | 'mentions' | 'ai' | 'all') => {
    setActiveInboxFilter(filter);
    if (filter === 'assigned') {
      onFiltersChange({ ...filters, assignedAgentId: user?.id });
    } else if (filter === 'all') {
      onFiltersChange({ ...filters, assignedAgentId: undefined });
    } else {
      // Handle other filters as needed
      onFiltersChange({ ...filters });
    }
  };

  // Filter conversations by channel tab
  const channelFilteredConversations = (Array.isArray(conversations) ? conversations : []).filter((conv: ConversationLite) => {
    const channelType = typeof conv.channel === 'string' ? conv.channel : (conv.channel?.type || '');
    
    if (activeChannelTab === 'social') {
      // Show only WhatsApp and Instagram
      return channelType === 'whatsapp' || channelType === 'instagram';
    } else {
      // Show all channels
      return true;
    }
  });

  // Apply search filter
  const filteredConversations = channelFilteredConversations.filter(conv => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        conv.subject?.toLowerCase().includes(query) ||
        conv.customer?.email?.toLowerCase().includes(query) ||
        conv.customer?.firstName?.toLowerCase().includes(query) ||
        conv.customer?.lastName?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Count conversations per channel type
  const socialCount = conversations.filter((c: ConversationLite) => {
    const channelType = typeof c.channel === 'string' ? c.channel : (c.channel?.type || '');
    return channelType === 'whatsapp' || channelType === 'instagram';
  }).length;
  
  const allCount = conversations.length;

  // Count conversations for each inbox filter
  const assignedCount = filteredConversations.filter(c => c.assignedAgentId === user?.id).length;

  // Empty state when no conversations at all
  const hasAny = Array.isArray(conversations) && conversations.length > 0;

  const handleConnectChannel = (channelType: 'whatsapp' | 'messenger' | 'instagram' | 'email' | 'sms') => {
    setSelectedChannelType(channelType);
    setShowChannelSetup(true);
  };

  // If no conversations at all, show a floating connect overlay
  if (!hasAny) {
    return (
      <div className="relative h-full bg-slate-50/50 dark:bg-slate-900/50">
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="w-full max-w-3xl">
            <Card className="rounded-2xl border-0 shadow-xl bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
              <CardHeader className="text-center pb-2">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-blue-500/20">
                  <Inbox className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300">
                  {t('connectChannels')}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {t('connectChannelsDesc')}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <div className="p-2.5 rounded-xl bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400">
                        <Image src="https://img.icons8.com/ios-filled/50/25D366/whatsapp.png" alt="WhatsApp" width={24} height={24} className="dark:invert" />
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">WhatsApp</div>
                    </div>
                    <Button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100" onClick={() => handleConnectChannel('whatsapp')}>{t('connect')}</Button>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                        <Image src="https://img.icons8.com/ios-filled/50/1877F2/facebook-messenger.png" alt="Messenger" width={24} height={24} className="dark:invert" />
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Messenger</div>
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => handleConnectChannel('messenger')}>{t('connect')}</Button>
                  </div>

                  <div className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                    <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <div className="p-2.5 rounded-xl bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400">
                        <Image src="https://img.icons8.com/ios-filled/50/E4405F/instagram-new.png" alt="Instagram" width={24} height={24} className="dark:invert" />
                      </div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">Instagram</div>
                    </div>
                    <Button className="w-full" variant="outline" onClick={() => handleConnectChannel('instagram')}>{t('connect')}</Button>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center mt-8">
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">5+</div>
                    <div className="text-xs font-medium text-slate-500">Channels</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">2m</div>
                    <div className="text-xs font-medium text-slate-500">{t('setupTime')}</div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-1">AI</div>
                    <div className="text-xs font-medium text-slate-500">{t('powered')}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        <ChannelSetupDialog
          open={showChannelSetup}
          onOpenChange={setShowChannelSetup}
          defaultChannel={selectedChannelType}
          onSuccess={() => {
            window.location.reload();
          }}
        />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-950">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800/50 space-y-4 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
              <Inbox className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t('inbox')}</h2>
          </div>
          <Button size="sm" className="h-9 px-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-sm rounded-lg">
            <Plus className="h-4 w-4 mr-2" />
            {t('new')}
          </Button>
        </div>

        {/* Search */}
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-10 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all rounded-xl"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg">
              <Filter className="h-3.5 w-3.5 text-slate-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Inbox Sections */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-1">
            {/* MY INBOX Section */}
            <Collapsible open={myInboxOpen} onOpenChange={setMyInboxOpen}>
              <CollapsibleTrigger className="w-full group">
                <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    {t('myInbox')}
                  </span>
                  {myInboxOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 mt-1">
                  <button
                    onClick={() => handleInboxFilter('assigned')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      activeInboxFilter === 'assigned'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <User className="h-4 w-4 opacity-70" />
                      <span>{t('assignedToMe')}</span>
                    </div>
                    {assignedCount > 0 && (
                      <Badge variant="secondary" className="h-5 min-w-[20px] text-xs bg-white dark:bg-slate-800 shadow-sm">
                        {assignedCount}
                      </Badge>
                    )}
                  </button>
                  <button
                    onClick={() => handleInboxFilter('collaborations')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      activeInboxFilter === 'collaborations'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Users className="h-4 w-4 opacity-70" />
                      <span>{t('collaborations')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleInboxFilter('mentions')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      activeInboxFilter === 'mentions'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <AtSign className="h-4 w-4 opacity-70" />
                      <span>{t('mentions')}</span>
                    </div>
                  </button>
                  <button
                    onClick={() => handleInboxFilter('ai')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      activeInboxFilter === 'ai'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Bot className="h-4 w-4 opacity-70" />
                      <span>{t('aiHandover')}</span>
                    </div>
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* COMPANY INBOX Section */}
            <Collapsible open={companyInboxOpen} onOpenChange={setCompanyInboxOpen} className="mt-4">
              <CollapsibleTrigger className="w-full group">
                <div className="flex items-center justify-between w-full py-2 px-3 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg transition-colors">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider group-hover:text-slate-700 dark:group-hover:text-slate-300 transition-colors">
                    {t('companyInbox')}
                  </span>
                  {companyInboxOpen ? (
                    <ChevronUp className="h-3.5 w-3.5 text-slate-400" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 mt-1">
                  <button
                    onClick={() => handleInboxFilter('all')}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all duration-200',
                      activeInboxFilter === 'all'
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Inbox className="h-4 w-4 opacity-70" />
                      <span>{t('allConversations')}</span>
                    </div>
                  </button>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </div>

          {/* Channel Tabs */}
          <div className="px-4 py-3">
            <Tabs value={activeChannelTab} onValueChange={(value) => onChannelTabChange?.(value as 'social' | 'all')}>
              <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl">
                <TabsTrigger 
                  value="social" 
                  className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{t('social')}</span>
                  {socialCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px] bg-slate-100 dark:bg-slate-700">
                      {socialCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="all" 
                  className="gap-2 rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-sm transition-all"
                >
                  <Inbox className="h-4 w-4" />
                  <span>{t('all')}</span>
                  {allCount > 0 && (
                    <Badge variant="secondary" className="h-5 min-w-[20px] text-[10px] bg-slate-100 dark:bg-slate-700">
                      {allCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Conversation List Header */}
          <div className="px-4 py-2 bg-slate-50/50 dark:bg-slate-900/50 border-y border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {activeChannelTab === 'social' ? t('socialInbox') : t('allInbox')}
              </span>
              <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {activeInboxFilter === 'assigned' ? t('assignedToMe') : activeInboxFilter === 'all' ? t('all') : activeInboxFilter}
              </span>
            </div>
          </div>

          {/* Conversation List */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800/50">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  {activeChannelTab === 'social' ? (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                        <MessageSquare className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{t('noSocialConversations')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">{t('noSocialConversationsDesc')}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                        <Inbox className="h-8 w-8 text-slate-300 dark:text-slate-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">{t('noConversations')}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[200px] mx-auto">{t('noConversationsDesc')}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              filteredConversations.map((conversation) => {
                const isSelected = conversation.id === selectedConversationId;
                const channelType = (typeof conversation.channel === 'string'
                  ? conversation.channel
                  : (conversation.channel?.type || 'web')) as keyof typeof channelConfig;
                const channelInfo = channelConfig[channelType] || channelConfig.web;
                const ChannelIcon = channelInfo.icon;
                const customerName = (() => {
                  const full = `${conversation.customer?.firstName || ''} ${conversation.customer?.lastName || ''}`.trim();
                  if (full) return full;
                  return conversation.customer?.name || conversation.customer?.email || conversation.customer?.phone || 'Unknown';
                })();
                const previewText = (conversation.lastMessage?.preview || conversation.lastMessage?.content || '').toString();
                const lastAt = conversation.lastMessage?.createdAt || conversation.lastMessageAt || conversation.updatedAt;
                const dateStr = lastAt ? new Date(lastAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short' }) : '';
                
                // Check for SLA breach or warning
                const hasSlaBreach = (conversation.slaInstance?.breachCount ?? 0) > 0;
                const isUnread = (conversation.unreadCount ?? 0) > 0;

                return (
                  <button
                    key={conversation.id}
                    onClick={() => onSelectConversation(conversation.id, conversation.ticketId)}
                    className={cn(
                      'w-full p-4 text-left transition-all duration-200 hover:bg-slate-50 dark:hover:bg-slate-900/50 relative group',
                      isSelected && 'bg-blue-50/50 dark:bg-blue-900/10 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-blue-500'
                    )}
                  >
                    <div className="flex gap-3">
                      {/* Avatar */}
                      <div className="relative">
                        <Avatar className="h-10 w-10 flex-shrink-0 border border-slate-200 dark:border-slate-700 shadow-sm">
                          <AvatarFallback className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                            {customerName[0]?.toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800",
                          channelInfo.textColor
                        )}>
                          <div className={cn("p-1 rounded-full", channelInfo.badgeColor)}>
                            <ChannelIcon className="h-2.5 w-2.5" />
                          </div>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn(
                            "font-semibold text-sm truncate",
                            isUnread ? "text-slate-900 dark:text-slate-100" : "text-slate-700 dark:text-slate-300"
                          )}>
                            {customerName}
                          </span>
                          <span className="text-[10px] font-medium text-slate-400 flex-shrink-0">{dateStr}</span>
                        </div>

                        <p className={cn(
                          "text-xs truncate line-clamp-1",
                          isUnread ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-500 dark:text-slate-400"
                        )}>
                          {previewText || conversation.subject || 'No subject'}
                        </p>

                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {(() => {
                            const obj = conversation as Record<string, unknown>;
                            return obj['isNewCustomer'] ? (
                              <Badge variant="secondary" className="text-[10px] h-4 px-1.5 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0">
                                NEW
                              </Badge>
                            ) : null;
                          })()}
                          
                          {conversation.priority && conversation.priority !== 'medium' && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[10px] h-4 px-1.5 border-0',
                                conversation.priority === 'urgent' && 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                                conversation.priority === 'high' && 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              )}
                            >
                              <Zap className="h-2.5 w-2.5 mr-1" />
                              {String(conversation.priority || '')}
                            </Badge>
                          )}
                          
                          {hasSlaBreach && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1.5">
                              <AlertCircle className="h-2.5 w-2.5 mr-1" />
                              SLA
                            </Badge>
                          )}
                          
                          {isUnread && (
                            <Badge className="ml-auto h-4 min-w-[16px] px-1 rounded-full text-[10px] bg-blue-600 text-white shadow-sm shadow-blue-200 dark:shadow-none">
                              {conversation.unreadCount}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

