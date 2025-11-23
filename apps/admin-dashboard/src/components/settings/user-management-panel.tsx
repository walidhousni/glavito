'use client';

import React, { useState, useMemo } from 'react';
import { useAgents } from '@/lib/hooks/use-agent';
import { InviteAgentDialog } from '@/components/agents/invite-agent-dialog';
import { AgentProfileForm } from '@/components/agents/AgentProfileForm';
import { UserManagementHeader } from './user-management/user-management-header';
import { UserManagementStats } from './user-management/user-management-stats';
import { UserManagementToolbar } from './user-management/user-management-toolbar';
import { UserManagementGrid } from './user-management/user-management-grid';
import { UserManagementKanban } from './user-management/user-management-kanban';
import { UserManagementList } from './user-management/user-management-list';
import { UserManagementEmpty } from './user-management/user-management-empty';

type ViewMode = 'grid' | 'list' | 'kanban';
type SortField = 'name' | 'responseTime' | 'satisfaction' | 'ticketsResolved' | 'workload';
type SortDirection = 'asc' | 'desc';

export function UserManagementPanel() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [skillFilter, setSkillFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  const { agents, isLoading } = useAgents();
  const safeAgents = useMemo(() => Array.isArray(agents) ? agents : [], [agents]);

  // Extract unique skills and languages
  const allSkills = useMemo(() => 
    Array.from(new Set(safeAgents.flatMap(agent => agent.skills || []))),
    [safeAgents]
  );
  
  const allLanguages = useMemo(() => 
    Array.from(new Set(safeAgents.flatMap(agent => agent.languages || []))),
    [safeAgents]
  );

  // Filter and sort agents
  const filteredAndSortedAgents = useMemo(() => {
    const filtered = safeAgents.filter(agent => {
      const name = agent.displayName || `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`;
      const email = agent.user?.email ?? '';
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (agent.skills || []).some(skill => skill.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || agent.availability === statusFilter;
      const matchesSkill = skillFilter === 'all' || (agent.skills || []).includes(skillFilter);
      const matchesLanguage = languageFilter === 'all' || (agent.languages || []).includes(languageFilter);

      return matchesSearch && matchesStatus && matchesSkill && matchesLanguage;
    });

    // Sort
    filtered.sort((a, b) => {
      let compareResult = 0;
      switch (sortField) {
        case 'name': {
          const nameA = a.displayName || `${a.user?.firstName ?? ''} ${a.user?.lastName ?? ''}`;
          const nameB = b.displayName || `${b.user?.firstName ?? ''} ${b.user?.lastName ?? ''}`;
          compareResult = nameA.localeCompare(nameB);
          break;
        }
        case 'responseTime':
          compareResult = (a.performanceMetrics?.responseTime ?? 0) - (b.performanceMetrics?.responseTime ?? 0);
          break;
        case 'satisfaction':
          compareResult = (a.performanceMetrics?.customerSatisfaction ?? 0) - (b.performanceMetrics?.customerSatisfaction ?? 0);
          break;
        case 'ticketsResolved':
          compareResult = (a.performanceMetrics?.ticketsCompleted ?? 0) - (b.performanceMetrics?.ticketsCompleted ?? 0);
          break;
        case 'workload': {
          const loadA = (a.performanceMetrics?.activeTickets ?? 0) / Math.max(a.maxConcurrentTickets, 1);
          const loadB = (b.performanceMetrics?.activeTickets ?? 0) / Math.max(b.maxConcurrentTickets, 1);
          compareResult = loadA - loadB;
          break;
        }
      }
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });

    return filtered;
  }, [safeAgents, searchQuery, statusFilter, skillFilter, languageFilter, sortField, sortDirection]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = safeAgents.length;
    const available = safeAgents.filter(a => a.availability === 'available').length;
    const avgResponseTime = total > 0 
      ? Math.round(safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.responseTime ?? 0), 0) / total)
      : 0;
    const avgSatisfaction = total > 0
      ? (safeAgents.reduce((sum, a) => sum + (a.performanceMetrics?.customerSatisfaction ?? 0), 0) / total).toFixed(1)
      : '0.0';

    return { total, available, avgResponseTime, avgSatisfaction };
  }, [safeAgents]);

  // Group by status for kanban view
  const agentsByStatus = useMemo(() => {
    const grouped = {
      available: filteredAndSortedAgents.filter(a => a.availability === 'available'),
      busy: filteredAndSortedAgents.filter(a => a.availability === 'busy'),
      away: filteredAndSortedAgents.filter(a => a.availability === 'away'),
      offline: filteredAndSortedAgents.filter(a => a.availability === 'offline'),
    };
    return grouped;
  }, [filteredAndSortedAgents]);

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Status', 'Skills', 'Languages', 'Response Time', 'Satisfaction', 'Tickets Resolved'];
    const rows = filteredAndSortedAgents.map(agent => [
      agent.displayName || `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`,
      agent.user?.email ?? '',
      agent.availability,
      (agent.skills || []).join('; '),
      (agent.languages || []).join('; '),
      agent.performanceMetrics?.responseTime ?? 0,
      agent.performanceMetrics?.customerSatisfaction ?? 0,
      agent.performanceMetrics?.ticketsCompleted ?? 0,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `agents-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <UserManagementHeader 
        onInvite={() => setInviteOpen(true)} 
        onExport={exportToCSV}
      />

      {/* Agent Profile (self) */}
      <AgentProfileForm />

      {/* Stats Cards */}
      <UserManagementStats stats={stats} />

      {/* Toolbar */}
      <UserManagementToolbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        showFilters={showFilters}
        onToggleFilters={() => setShowFilters(!showFilters)}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        skillFilter={skillFilter}
        onSkillFilterChange={setSkillFilter}
        languageFilter={languageFilter}
        onLanguageFilterChange={setLanguageFilter}
        sortField={sortField}
        onSortFieldChange={setSortField}
        sortDirection={sortDirection}
        onSortDirectionChange={setSortDirection}
        allSkills={allSkills}
        allLanguages={allLanguages}
      />

      {/* Agents Display */}
      {viewMode === 'grid' && (
        <UserManagementGrid agents={filteredAndSortedAgents} />
      )}

      {viewMode === 'list' && (
        <UserManagementList agents={filteredAndSortedAgents} />
      )}

      {viewMode === 'kanban' && (
        <UserManagementKanban agentsByStatus={agentsByStatus} />
      )}

      {/* Empty State */}
      {filteredAndSortedAgents.length === 0 && !isLoading && (
        <UserManagementEmpty 
          searchQuery={searchQuery}
          onInvite={() => setInviteOpen(true)}
        />
      )}

      <InviteAgentDialog open={inviteOpen} onOpenChange={setInviteOpen} />
    </div>
  );
}
