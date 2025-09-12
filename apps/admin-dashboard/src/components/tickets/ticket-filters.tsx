'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { 
  X, 
  Calendar as CalendarIcon, 
  Filter, 
  RotateCcw,
  Check,
  ChevronsUpDown,
  User,
  Building,
  Hash,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface TicketFiltersProps {
  filters: any;
  onChange: (filters: any) => void;
}

export function TicketFilters({ filters, onChange }: TicketFiltersProps) {
  const t = useTranslations('tickets');
  const [localFilters, setLocalFilters] = useState(filters);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'to' | null>(null);

  // Mock data - in real app, these would come from API
  const [agents] = useState([
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com' }
  ]);

  const [customers] = useState([
    { id: '1', name: 'Acme Corp', email: 'contact@acme.com' },
    { id: '2', name: 'TechStart Inc', email: 'hello@techstart.com' },
    { id: '3', name: 'Global Solutions', email: 'info@global.com' }
  ]);

  const [channels] = useState([
    { id: '1', name: 'Email Support', type: 'email' },
    { id: '2', name: 'WhatsApp Business', type: 'whatsapp' },
    { id: '3', name: 'Instagram DM', type: 'instagram' },
    { id: '4', name: 'Web Chat', type: 'web' }
  ]);

  const [teams] = useState([
    { id: '1', name: 'Technical Support' },
    { id: '2', name: 'Customer Success' },
    { id: '3', name: 'Sales Support' }
  ]);

  const [availableTags] = useState([
    'bug', 'feature-request', 'billing', 'technical', 'urgent', 
    'vip-customer', 'escalated', 'refund', 'integration', 'training'
  ]);

  const statusOptions = [
    { value: 'open', label: t('status.open') },
    { value: 'in_progress', label: t('status.in_progress') },
    { value: 'waiting', label: t('status.waiting') },
    { value: 'resolved', label: t('status.resolved') },
    { value: 'closed', label: t('status.closed') }
  ];

  const priorityOptions = [
    { value: 'low', label: t('priority.low') },
    { value: 'medium', label: t('priority.medium') },
    { value: 'high', label: t('priority.high') },
    { value: 'urgent', label: t('priority.urgent') },
    { value: 'critical', label: t('priority.critical') }
  ];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...localFilters, [key]: value };
    setLocalFilters(newFilters);
    onChange(newFilters);
  };

  const handleMultiSelectChange = (key: string, value: string, checked: boolean) => {
    const currentValues = localFilters[key] || [];
    const newValues = checked 
      ? [...currentValues, value]
      : currentValues.filter((v: string) => v !== value);
    
    handleFilterChange(key, newValues);
  };

  const handleTagToggle = (tag: string) => {
    const currentTags = localFilters.tags || [];
    const newTags = currentTags.includes(tag)
      ? currentTags.filter((t: string) => t !== tag)
      : [...currentTags, tag];
    
    handleFilterChange('tags', newTags);
  };

  const clearFilters = () => {
    const clearedFilters = {
      status: [],
      priority: [],
      assignedAgentId: '',
      customerId: '',
      channelId: '',
      teamId: '',
      tags: [],
      dateFrom: '',
      dateTo: '',
      overdue: false,
      unassigned: false,
      slaAtRisk: false
    };
    setLocalFilters(clearedFilters);
    onChange(clearedFilters);
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (localFilters.status?.length > 0) count++;
    if (localFilters.priority?.length > 0) count++;
    if (localFilters.assignedAgentId) count++;
    if (localFilters.customerId) count++;
    if (localFilters.channelId) count++;
    if (localFilters.teamId) count++;
    if (localFilters.tags?.length > 0) count++;
    if (localFilters.dateFrom || localFilters.dateTo) count++;
    if (localFilters.overdue) count++;
    if (localFilters.unassigned) count++;
    if (localFilters.slaAtRisk) count++;
    return count;
  };

  return (
    <div className="space-y-6">
      {/* Filter Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4" />
          <h3 className="font-medium">{t('filters.title')}</h3>
          {getActiveFilterCount() > 0 && (
            <Badge variant="secondary">
              {getActiveFilterCount()} {t('filters.active')}
            </Badge>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={clearFilters}
          disabled={getActiveFilterCount() === 0}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('filters.clear')}
        </Button>
      </div>

      {/* Filter Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.status')}</Label>
          <div className="space-y-2">
            {statusOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`status-${option.value}`}
                  checked={localFilters.status?.includes(option.value)}
                  onChange={(e) => 
                    handleMultiSelectChange('status', option.value, (e.target as HTMLInputElement).checked)
                  }
                />
                <Label 
                  htmlFor={`status-${option.value}`}
                  className="text-sm cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.priority')}</Label>
          <div className="space-y-2">
            {priorityOptions.map((option) => (
              <div key={option.value} className="flex items-center space-x-2">
                <Checkbox
                  id={`priority-${option.value}`}
                  checked={localFilters.priority?.includes(option.value)}
                  onChange={(e) => 
                    handleMultiSelectChange('priority', option.value, (e.target as HTMLInputElement).checked)
                  }
                />
                <Label 
                  htmlFor={`priority-${option.value}`}
                  className="text-sm cursor-pointer"
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {/* Assignee Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.assignee')}</Label>
          <Select
            value={localFilters.assignedAgentId}
            onValueChange={(value) => handleFilterChange('assignedAgentId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('filters.selectAssignee')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('filters.allAssignees')}</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{agent.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Customer Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.customer')}</Label>
          <Select
            value={localFilters.customerId}
            onValueChange={(value) => handleFilterChange('customerId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('filters.selectCustomer')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('filters.allCustomers')}</SelectItem>
              {customers.map((customer) => (
                <SelectItem key={customer.id} value={customer.id}>
                  <div className="flex items-center space-x-2">
                    <Building className="h-4 w-4" />
                    <span>{customer.name}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Channel Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.channel')}</Label>
          <Select
            value={localFilters.channelId}
            onValueChange={(value) => handleFilterChange('channelId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('filters.selectChannel')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('filters.allChannels')}</SelectItem>
              {channels.map((channel) => (
                <SelectItem key={channel.id} value={channel.id}>
                  {channel.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Team Filter */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.team')}</Label>
          <Select
            value={localFilters.teamId}
            onValueChange={(value) => handleFilterChange('teamId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('filters.selectTeam')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('filters.allTeams')}</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date Range */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.dateRange')}</Label>
          <div className="flex space-x-2">
            <Popover open={showDatePicker === 'from'} onOpenChange={(open) => setShowDatePicker(open ? 'from' : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !localFilters.dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dateFrom ? format(new Date(localFilters.dateFrom), "PPP") : t('filters.from')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.dateFrom ? new Date(localFilters.dateFrom) : undefined}
                  onSelect={(date) => {
                    handleFilterChange('dateFrom', date ? date.toISOString() : '');
                    setShowDatePicker(null);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <Popover open={showDatePicker === 'to'} onOpenChange={(open) => setShowDatePicker(open ? 'to' : null)}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "flex-1 justify-start text-left font-normal",
                    !localFilters.dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {localFilters.dateTo ? format(new Date(localFilters.dateTo), "PPP") : t('filters.to')}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={localFilters.dateTo ? new Date(localFilters.dateTo) : undefined}
                  onSelect={(date) => {
                    handleFilterChange('dateTo', date ? date.toISOString() : '');
                    setShowDatePicker(null);
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Special Filters */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t('filters.special')}</Label>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="overdue"
                checked={localFilters.overdue}
                onChange={(e) => handleFilterChange('overdue', (e.target as HTMLInputElement).checked)}
              />
              <Label htmlFor="overdue" className="text-sm cursor-pointer flex items-center space-x-1">
                <Clock className="h-3 w-3" />
                <span>{t('filters.overdue')}</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="unassigned"
                checked={localFilters.unassigned}
                onChange={(e) => handleFilterChange('unassigned', (e.target as HTMLInputElement).checked)}
              />
              <Label htmlFor="unassigned" className="text-sm cursor-pointer flex items-center space-x-1">
                <User className="h-3 w-3" />
                <span>{t('filters.unassigned')}</span>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="slaAtRisk"
                checked={localFilters.slaAtRisk}
                onChange={(e) => handleFilterChange('slaAtRisk', (e.target as HTMLInputElement).checked)}
              />
              <Label htmlFor="slaAtRisk" className="text-sm cursor-pointer flex items-center space-x-1">
                <AlertTriangle className="h-3 w-3" />
                <span>{t('filters.slaAtRisk')}</span>
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Tags Filter */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">{t('filters.tags')}</Label>
        <div className="flex flex-wrap gap-2">
          {availableTags.map((tag) => {
            const active = !!localFilters.tags?.includes(tag);
            return (
              <Badge
                key={tag}
                variant={active ? "default" : "outline"}
                className="cursor-pointer"
                role="button"
                aria-pressed={active}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleTagToggle(tag);
                  }
                }}
                onClick={() => handleTagToggle(tag)}
              >
                <Hash className="h-3 w-3 mr-1" />
                {tag}
                {active && (
                  <X className="h-3 w-3 ml-1" />
                )}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Active Filters Summary */}
      {getActiveFilterCount() > 0 && (
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground" aria-live="polite">
              {t('filters.activeFilters')}:
            </span>
            <div className="flex flex-wrap gap-1">
              {localFilters.status?.map((status: string) => (
                <Badge key={`status-${status}`} variant="secondary" className="text-xs">
                  {t(`status.${status}`)}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => handleMultiSelectChange('status', status, false)}
                  />
                </Badge>
              ))}
              {localFilters.priority?.map((priority: string) => (
                <Badge key={`priority-${priority}`} variant="secondary" className="text-xs">
                  {t(`priority.${priority}`)}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => handleMultiSelectChange('priority', priority, false)}
                  />
                </Badge>
              ))}
              {localFilters.tags?.map((tag: string) => (
                <Badge key={`tag-${tag}`} variant="secondary" className="text-xs">
                  #{tag}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer" 
                    onClick={() => handleTagToggle(tag)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}