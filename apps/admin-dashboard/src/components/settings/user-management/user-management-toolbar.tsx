'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import { AnimatePresence } from 'framer-motion';
import { Search, Grid3x3, List, Kanban, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ViewMode = 'grid' | 'list' | 'kanban';
type SortField = 'name' | 'responseTime' | 'satisfaction' | 'ticketsResolved' | 'workload';
type SortDirection = 'asc' | 'desc';

interface UserManagementToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  skillFilter: string;
  onSkillFilterChange: (value: string) => void;
  languageFilter: string;
  onLanguageFilterChange: (value: string) => void;
  sortField: SortField;
  onSortFieldChange: (field: SortField) => void;
  sortDirection: SortDirection;
  onSortDirectionChange: (direction: SortDirection) => void;
  allSkills: string[];
  allLanguages: string[];
}

export function UserManagementToolbar({
  searchQuery,
  onSearchChange,
  viewMode,
  onViewModeChange,
  showFilters,
  onToggleFilters,
  statusFilter,
  onStatusFilterChange,
  skillFilter,
  onSkillFilterChange,
  languageFilter,
  onLanguageFilterChange,
  sortField,
  onSortFieldChange,
  sortDirection,
  onSortDirectionChange,
  allSkills,
  allLanguages,
}: UserManagementToolbarProps) {
  const t = useTranslations('settings.userManagement');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder={t('searchPlaceholder', { fallback: 'Search users...' })}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* View Mode Toggle */}
          <Tabs value={viewMode} onValueChange={(v) => onViewModeChange(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="grid">
                <Grid3x3 className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="list">
                <List className="h-4 w-4" />
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <Kanban className="h-4 w-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Filter Toggle */}
          <Button
            variant={showFilters ? 'default' : 'outline'}
            onClick={onToggleFilters}
          >
            <SlidersHorizontal className="h-4 w-4 mr-2" />
            {t('filters', { fallback: 'Filters' })}
          </Button>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-4 gap-4">
              <Select value={statusFilter} onValueChange={onStatusFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filterByStatus', { fallback: 'Filter by Status' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allStatus', { fallback: 'All Status' })}</SelectItem>
                  <SelectItem value="available">{t('available', { fallback: 'Available' })}</SelectItem>
                  <SelectItem value="busy">{t('busy', { fallback: 'Busy' })}</SelectItem>
                  <SelectItem value="away">{t('away', { fallback: 'Away' })}</SelectItem>
                  <SelectItem value="offline">{t('offline', { fallback: 'Offline' })}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={skillFilter} onValueChange={onSkillFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filterBySkill', { fallback: 'Filter by Skill' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allSkills', { fallback: 'All Skills' })}</SelectItem>
                  {allSkills.map(skill => (
                    <SelectItem key={skill} value={skill}>
                      {skill.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={languageFilter} onValueChange={onLanguageFilterChange}>
                <SelectTrigger>
                  <SelectValue placeholder={t('filterByLanguage', { fallback: 'Filter by Language' })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('allLanguages', { fallback: 'All Languages' })}</SelectItem>
                  {allLanguages.map(lang => (
                    <SelectItem key={lang} value={lang}>
                      {lang.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex gap-2">
                <Select value={sortField} onValueChange={(v) => onSortFieldChange(v as SortField)}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('sortBy', { fallback: 'Sort By' })} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name">{t('name', { fallback: 'Name' })}</SelectItem>
                    <SelectItem value="responseTime">{t('responseTime', { fallback: 'Response Time' })}</SelectItem>
                    <SelectItem value="satisfaction">{t('satisfaction', { fallback: 'Satisfaction' })}</SelectItem>
                    <SelectItem value="ticketsResolved">{t('resolved', { fallback: 'Resolved' })}</SelectItem>
                    <SelectItem value="workload">{t('workload', { fallback: 'Workload' })}</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => onSortDirectionChange(sortDirection === 'asc' ? 'desc' : 'asc')}
                >
                  <ArrowUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
