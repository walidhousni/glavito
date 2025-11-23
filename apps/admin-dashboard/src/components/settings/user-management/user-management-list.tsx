'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { useParams, useRouter } from 'next/navigation';
import { MoreVertical, Edit, Mail, Settings, Clock, Star, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import type { AgentProfile } from '@/lib/api/team';

interface UserManagementListProps {
  agents: AgentProfile[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-500';
    case 'busy':
      return 'bg-yellow-500';
    case 'away':
      return 'bg-orange-500';
    case 'offline':
      return 'bg-gray-500';
    default:
      return 'bg-gray-500';
  }
};

export function UserManagementList({ agents }: UserManagementListProps) {
  const t = useTranslations('settings.userManagement');
  const params = useParams();
  const router = useRouter();
  const locale = params?.locale as string || 'en';

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {agents.map((agent) => (
            <div
              key={agent.id}
              className="p-4 hover:bg-muted/50 transition-colors cursor-pointer"
              onClick={() => router.push(`/${locale}/dashboard/agents/${agent.userId}`)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={agent.user?.avatar ?? ''} />
                      <AvatarFallback>
                        {(agent.user?.firstName?.[0] ?? 'A').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white dark:border-black ${getStatusColor(
                        agent.availability
                      )}`}
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm truncate">
                        {agent.displayName || `${agent.user?.firstName ?? 'Agent'} ${agent.user?.lastName ?? ''}`}
                      </h3>
                      <Badge variant="outline" className="capitalize text-xs">
                        {agent.availability}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">{agent.user?.email}</p>
                  </div>

                  <div className="hidden md:flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{agent.performanceMetrics?.responseTime ?? 0}m</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      <span className="font-medium">{(agent.performanceMetrics?.customerSatisfaction ?? 0).toFixed(1)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span className="font-medium">{agent.performanceMetrics?.ticketsCompleted ?? 0}</span>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/${locale}/dashboard/agents/${agent.userId}`);
                      }}>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('edit', { fallback: 'Edit' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Mail className="h-4 w-4 mr-2" />
                        {t('sendEmail', { fallback: 'Send Email' })}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Settings className="h-4 w-4 mr-2" />
                        {t('settings', { fallback: 'Settings' })}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
