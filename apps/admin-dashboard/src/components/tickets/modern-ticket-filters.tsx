'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Filter,
  X,
  Search,
  Calendar,
  Users,
  Tag,
  AlertTriangle,
  Clock,
  CheckCircle,
  User,
  Building,
  MessageSquare,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface FilterState {
  search: string;
  status: string[];
  priority: string[];
  assignee: string[];
  customer: string[];
  channel: string[];
  team: string[];
  dateRange: {
    from: Date | null;
    to: Date | null;
  };
  tags: string[];
  special: string[];
}

interface ModernTicketFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onClearFilters: () => void;
}

export function ModernTicketFilters({ 
  filters, 
  onFiltersChange, 
  onClearFilters 
}: ModernTicketFiltersProps) {
  const t = useTranslations('tickets');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Mock data - in real app, these would come from API
  const statusOptions = [
    { value: 'open', label: t('status.open'), color: 'bg-blue-100 text-blue-800' },
    { value: 'in_progress', label: t('status.in_progress'), color: 'bg-yellow-100 text-yellow-800' },
    { value: 'waiting', label: t('status.waiting'), color: 'bg-orange-100 text-orange-800' },
    { value: 'resolved', label: t('status.resolved'), color: 'bg-green-100 text-green-800' },
    { value: 'closed', label: t('status.closed'), color: 'bg-gray-100 text-gray-800' }
  ];

  const priorityOptions = [
    { value: 'low', label: t('priority.low'), color: 'text-green-600' },
    { value: 'medium', label: t('priority.medium'), color: 'text-blue-600' },
    { value: 'high', label: t('priority.high'), color: 'text-orange-600' },
    { value: 'urgent', label: t('priority.urgent'), color: 'text-red-600' },
    { value: 'critical', label: t('priority.critical'), color: 'text-red-700' }
  ];

  const specialFilters = [
    { value: 'overdue', label: t('filters.overdue'), icon: Clock },
    { value: 'unassigned', label: t('filters.unassigned'), icon: User },
    { value: 'sla_at_risk', label: t('filters.slaAtRisk'), icon: AlertTriangle }
  ];

  const updateFilter = (key: keyof FilterState, value: unknown) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const toggleArrayFilter = (key: keyof FilterState, value: string) => {
    const currentArray = filters[key] as string[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    updateFilter(key, newArray);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.search) count++;
    count += filters.status.length;
    count += filters.priority.length;
    count += filters.assignee.length;
    count += filters.customer.length;
    count += filters.channel.length;
    count += filters.team.length;
    count += filters.tags.length;
    count += filters.special.length;
    if (filters.dateRange.from || filters.dateRange.to) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  return (
    <Card className="border-0 shadow-sm bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
      <CardContent className="p-4 space-y-4">
        {/* Search and Quick Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              className="pl-10 bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 transition-colors"
            />
          </div>

          {/* Quick Status Filters */}
          <div className="flex items-center space-x-2">
            {statusOptions.slice(0, 3).map((status) => (
              <motion.div
                key={status.value}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  variant={filters.status.includes(status.value) ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleArrayFilter('status', status.value)}
                  className={cn(
                    "transition-all duration-200",
                    filters.status.includes(status.value) && status.color
                  )}
                >
                  {status.label}
                </Button>
              </motion.div>
            ))}
          </div>

          {/* Advanced Filters Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center space-x-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>{t('filters.title')}</span>
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
              <motion.div
                animate={{ rotate: showAdvanced ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-3 w-3" />
              </motion.div>
            </Button>

            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearFilters}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              >
                <X className="h-4 w-4 mr-1" />
                {t('filters.clear')}
              </Button>
            )}
          </div>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Priority Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('filters.priority')}
                  </label>
                  <div className="space-y-2">
                    {priorityOptions.map((priority) => (
                      <div key={priority.value} className="flex items-center space-x-2">
                        <Checkbox
                          id={`priority-${priority.value}`}
                          checked={filters.priority.includes(priority.value)}
                          onCheckedChange={() => toggleArrayFilter('priority', priority.value)}
                        />
                        <label
                          htmlFor={`priority-${priority.value}`}
                          className={cn("text-sm cursor-pointer", priority.color)}
                        >
                          {priority.label}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Date Range Filter */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('filters.dateRange')}
                  </label>
                  <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {filters.dateRange.from ? (
                          filters.dateRange.to ? (
                            <>
                              {format(filters.dateRange.from, "LLL dd, y")} -{" "}
                              {format(filters.dateRange.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(filters.dateRange.from, "LLL dd, y")
                          )
                        ) : (
                          <span>{t('filters.dateRange')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        initialFocus
                        mode="range"
                        defaultMonth={filters.dateRange.from || undefined}
                        selected={{
                          from: filters.dateRange.from || undefined,
                          to: filters.dateRange.to || undefined
                        }}
                        onSelect={(range) => {
                          updateFilter('dateRange', {
                            from: range?.from || null,
                            to: range?.to || null
                          });
                        }}
                        numberOfMonths={2}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Special Filters */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('filters.special')}
                  </label>
                  <div className="space-y-2">
                    {specialFilters.map((filter) => {
                      const Icon = filter.icon;
                      return (
                        <div key={filter.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`special-${filter.value}`}
                            checked={filters.special.includes(filter.value)}
                            onCheckedChange={() => toggleArrayFilter('special', filter.value)}
                          />
                          <label
                            htmlFor={`special-${filter.value}`}
                            className="text-sm cursor-pointer flex items-center space-x-2"
                          >
                            <Icon className="h-3 w-3" />
                            <span>{filter.label}</span>
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Active Filters Display */}
              {activeFiltersCount > 0 && (
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center space-x-2 mb-2">
                    <Filter className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('filters.activeFilters')}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {filters.search && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Search className="h-3 w-3" />
                        <span>"{filters.search}"</span>
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-600" 
                          onClick={() => updateFilter('search', '')}
                        />
                      </Badge>
                    )}
                    
                    {filters.status.map((status) => (
                      <Badge key={status} variant="secondary" className="flex items-center space-x-1">
                        <CheckCircle className="h-3 w-3" />
                        <span>{statusOptions.find(s => s.value === status)?.label}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-600" 
                          onClick={() => toggleArrayFilter('status', status)}
                        />
                      </Badge>
                    ))}

                    {filters.priority.map((priority) => (
                      <Badge key={priority} variant="secondary" className="flex items-center space-x-1">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{priorityOptions.find(p => p.value === priority)?.label}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-600" 
                          onClick={() => toggleArrayFilter('priority', priority)}
                        />
                      </Badge>
                    ))}

                    {filters.special.map((special) => (
                      <Badge key={special} variant="secondary" className="flex items-center space-x-1">
                        <Tag className="h-3 w-3" />
                        <span>{specialFilters.find(s => s.value === special)?.label}</span>
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-600" 
                          onClick={() => toggleArrayFilter('special', special)}
                        />
                      </Badge>
                    ))}

                    {(filters.dateRange.from || filters.dateRange.to) && (
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {filters.dateRange.from && format(filters.dateRange.from, "MMM dd")}
                          {filters.dateRange.from && filters.dateRange.to && " - "}
                          {filters.dateRange.to && format(filters.dateRange.to, "MMM dd")}
                        </span>
                        <X 
                          className="h-3 w-3 cursor-pointer hover:text-red-600" 
                          onClick={() => updateFilter('dateRange', { from: null, to: null })}
                        />
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}