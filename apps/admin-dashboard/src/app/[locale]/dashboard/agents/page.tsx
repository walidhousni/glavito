'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Search,
  Users,
  Settings,
  MoreHorizontal,
  Edit,
  UserPlus,
  Clock,
  Activity,
  Star,
  CheckCircle,
  AlertCircle,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAgents } from '@/lib/hooks/use-agent';
import { InviteAgentDialog } from '@/components/agents/invite-agent-dialog';
import { AgentProfileForm } from '@/components/agents/AgentProfileForm';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available': return 'bg-green-500';
    case 'busy': return 'bg-yellow-500';
    case 'away': return 'bg-orange-500';
    case 'offline': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'available': return <CheckCircle className="h-4 w-4" />;
    case 'busy': return <Clock className="h-4 w-4" />;
    case 'away': return <AlertCircle className="h-4 w-4" />;
    case 'offline': return <User className="h-4 w-4" />;
    default: return <User className="h-4 w-4" />;
  }
};

export default function AgentsPage() {
  const t = useTranslations();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [skillFilter, setSkillFilter] = useState('all');
  const [inviteOpen, setInviteOpen] = useState(false);
  const { agents } = useAgents();
  const safeAgents = Array.isArray(agents) ? agents : [];

  const filteredAgents = safeAgents.filter(agent => {
    const name = agent.displayName || `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`;
    const email = agent.user?.email ?? '';
    const matchesSearch = 
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.skills.some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === 'all' || agent.availability === statusFilter;
    const matchesSkill = skillFilter === 'all' || agent.skills.includes(skillFilter);
    
    return matchesSearch && matchesStatus && matchesSkill;
  });

  const allSkills = Array.from(new Set(safeAgents.flatMap(agent => agent.skills)));

  return (
    <div className="min-h-screen gradient-bg-primary p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">
            {t('agents.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            {t('agents.subtitle')}
          </p>
        </div>
        <Button className="btn-gradient" onClick={() => setInviteOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          {t('agents.inviteAgent')}
        </Button>
      </div>

      {/* Agent Profile (self) */}
      <AgentProfileForm />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('agents.totalAgents')}</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{safeAgents.length}</div>
            <p className="text-xs text-muted-foreground">
              {t('agents.cards.totalAgentsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('agents.availableAgents')}</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeAgents.filter(a => a.availability === 'available').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('agents.cards.availableDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('agents.avgResponseTime')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeAgents.length > 0 ? Math.round(safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.responseTime ?? 0), 0) / safeAgents.length) : 0}m
            </div>
            <p className="text-xs text-muted-foreground">
              {t('agents.cards.avgResponseDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="premium-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('agents.satisfaction')}</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {safeAgents.length > 0 ? (safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.customerSatisfaction ?? 0), 0) / safeAgents.length).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('agents.cards.satisfactionDesc')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder={t('agents.searchAgents')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('agents.filterByStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('agents.allStatus')}</SelectItem>
            <SelectItem value="available">{t('agents.available')}</SelectItem>
            <SelectItem value="busy">{t('agents.busy')}</SelectItem>
            <SelectItem value="away">{t('agents.away')}</SelectItem>
            <SelectItem value="offline">{t('agents.offline')}</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={skillFilter} onValueChange={setSkillFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('agents.filterBySkill')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('agents.allSkills')}</SelectItem>
            {allSkills.map(skill => (
              <SelectItem key={skill} value={skill}>
                {skill.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Agents Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredAgents.map((agent, index) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="premium-card hover-card">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={agent.user?.avatar ?? ''} />
                        <AvatarFallback>
                          {(agent.user?.firstName?.[0] ?? 'A').toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white dark:border-black ${getStatusColor(agent.availability)}`} />
                    </div>
                    <div>
                      <CardTitle className="text-lg">
                        {agent.displayName || `${agent.user?.firstName ?? 'Agent'} ${agent.user?.lastName ?? ''}`}
                      </CardTitle>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {agent.languages.join(', ')}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        {t('agents.editProfile')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Activity className="h-4 w-4 mr-2" />
                        {t('agents.viewPerformance')}
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" />
                        {t('navigation.settings')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(agent.availability)}
                      <span className="text-sm font-medium capitalize">
                        {t(`agents.${agent.availability}`)}
                      </span>
                    </div>
                    <Badge variant={agent.autoAssign ? "default" : "secondary"} className="rounded-md">
                      {agent.autoAssign ? t('agents.autoAssign') : t('agents.manual')}
                    </Badge>
                  </div>

                  {/* Workload */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{t('agents.currentWorkload')}</span>
                      <span>{agent.performanceMetrics?.activeTickets ?? 0}/{agent.maxConcurrentTickets}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${(Math.min(agent.performanceMetrics?.activeTickets ?? 0, agent.maxConcurrentTickets) / Math.max(agent.maxConcurrentTickets, 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">{t('agents.responseTime')}</div>
                      <div className="font-semibold">{agent.performanceMetrics?.responseTime ?? 0}m</div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">{t('agents.resolutionRate')}</div>
                      <div className="font-semibold">
                        {(() => {
                          const assigned = agent.performanceMetrics?.ticketsAssigned ?? 0;
                          const completed = agent.performanceMetrics?.ticketsCompleted ?? 0;
                          return assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
                        })()}%
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">{t('agents.satisfaction')}</div>
                      <div className="font-semibold flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        {agent.performanceMetrics?.customerSatisfaction ?? 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600 dark:text-gray-400">{t('agents.resolved')}</div>
                      <div className="font-semibold">{agent.performanceMetrics?.ticketsCompleted ?? 0}</div>
                    </div>
                  </div>

                  {/* Skills */}
                  <div>
                    <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {t('agents.skills')}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {agent.skills.slice(0, 3).map((skill) => (
                        <Badge key={skill} variant="outline" className="text-xs rounded-md">
                          {skill.replace('_', ' ')}
                        </Badge>
                      ))}
                      {agent.skills.length > 3 && (
                        <Badge variant="outline" className="text-xs rounded-md">
                          +{agent.skills.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Teams section intentionally removed until API provides memberships */}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {filteredAgents.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('agents.noAgentsFound')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {searchQuery ? t('agents.tryAdjustingSearch') : t('agents.getStartedInviting')}
          </p>
          {!searchQuery && (
            <Button onClick={() => setInviteOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              {t('agents.inviteAgent')}
            </Button>
          )}
        </div>
      )}

      <InviteAgentDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}