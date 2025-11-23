'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { 
  FaPlus, 
  FaTimes, 
  FaUser, 
  FaBuilding, 
  FaEnvelope, 
  FaPhone, 
  FaCalendarAlt,
  FaTag,
  FaCheck,
  FaChevronDown,
  FaSpinner,
  FaExclamationCircle,
  FaTicketAlt
} from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ticketsApi } from '@/lib/api/tickets-client';
import { customersApi, type CustomerListItem } from '@/lib/api/customers-client';
import { channelsApi } from '@/lib/api/channels-client';
import { agentApi, teamApi } from '@/lib/api/team';
import { useAuthStore } from '@/lib/store/auth-store';
import { useCrmStore } from '@/lib/store/crm-store';
import { RoutingSuggestionsPanel } from '@/components/tickets/routing-suggestions-panel';

interface CreateTicketDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateTicketDialog({ open, onOpenChange, onSuccess }: CreateTicketDialogProps) {
  const t = useTranslations('tickets');
  const tCommon = useTranslations('common');
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    priority: 'medium',
    customerId: '',
    channelId: '',
    assignedAgentId: '',
    teamId: '',
    tags: [] as string[],
    dueDate: null as Date | null,
    customFields: {},
    channelType: '' as string,
    language: '' as string
  });

  // Customers from API (debounced search)
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [customersLoading, setCustomersLoading] = useState(false);

  // Channels from API
  const [channels, setChannels] = useState<Array<{ id: string; name: string; type: string; icon: typeof FaEnvelope }>>([]);
  const [channelsLoading, setChannelsLoading] = useState(false);

  // Agents from API
  const [agents, setAgents] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; skills: string[] }>>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);

  // Teams from API
  const [teams, setTeams] = useState<Array<{ id: string; name: string; description?: string }>>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [availableTags] = useState([
    'bug', 'feature-request', 'billing', 'technical', 'urgent', 
    'vip-customer', 'escalated', 'refund', 'integration', 'training'
  ]);

  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPopover, setShowCustomerPopover] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const { fetchCustomFields, customFields } = useCrmStore();
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
  const [createdTicketId, setCreatedTicketId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      void fetchCustomFields('ticket');
      // Fetch channels, agents, and teams when dialog opens
      void fetchChannels();
      void fetchAgents();
      void fetchTeams();
    }
  }, [open, fetchCustomFields]);

  // Fetch channels from API
  const fetchChannels = async () => {
    try {
      setChannelsLoading(true);
      const channelsList = await channelsApi.list();
      const channelIcons: Record<string, typeof FaEnvelope> = {
        email: FaEnvelope,
        whatsapp: FaPhone,
        instagram: FaUser,
        web: FaUser,
        facebook: FaUser,
        twitter: FaUser,
        sms: FaPhone,
      };
      const mappedChannels = (Array.isArray(channelsList) ? channelsList : []).map((ch: any) => ({
        id: ch.id,
        name: ch.name || `${ch.type} Channel`,
        type: ch.type || 'email',
        icon: channelIcons[ch.type?.toLowerCase()] || FaEnvelope,
      }));
      setChannels(mappedChannels);
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      setChannels([]);
    } finally {
      setChannelsLoading(false);
    }
  };

  // Fetch agents from API
  const fetchAgents = async () => {
    try {
      setAgentsLoading(true);
      const agentsList = await agentApi.getAvailableAgents();
      const mappedAgents = (Array.isArray(agentsList) ? agentsList : []).map((agent: any) => ({
        id: agent.userId || agent.user?.id || agent.id,
        firstName: agent.user?.firstName || agent.firstName || '',
        lastName: agent.user?.lastName || agent.lastName || '',
        email: agent.user?.email || agent.email || '',
        skills: Array.isArray(agent.skills) ? agent.skills : [],
      }));
      setAgents(mappedAgents);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      setAgents([]);
    } finally {
      setAgentsLoading(false);
    }
  };

  // Fetch teams from API
  const fetchTeams = async () => {
    try {
      setTeamsLoading(true);
      const teamsList = await teamApi.getTeams();
      const mappedTeams = (Array.isArray(teamsList) ? teamsList : []).map((team: any) => ({
        id: team.id,
        name: team.name || 'Unnamed Team',
        description: team.description || '',
      }));
      setTeams(mappedTeams);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
      setTeams([]);
    } finally {
      setTeamsLoading(false);
    }
  };

  const priorityOptions = [
    { value: 'low', label: t('priority.low'), color: 'text-green-600' },
    { value: 'medium', label: t('priority.medium'), color: 'text-blue-600' },
    { value: 'high', label: t('priority.high'), color: 'text-orange-600' },
    { value: 'urgent', label: t('priority.urgent'), color: 'text-red-600' },
    { value: 'critical', label: t('priority.critical'), color: 'text-red-700' }
  ];

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setFormData({
        subject: '',
        description: '',
        priority: 'medium',
        customerId: '',
        channelId: '',
        assignedAgentId: '',
        teamId: '',
        tags: [],
        dueDate: null,
        customFields: {},
        channelType: '',
        language: ''
      });
      setStep(1);
      setErrors({});
      setCustomerSearch('');
      setTagInput('');
      setCreatedTicketId(null);
    }
  }, [open]);

  // Debounced fetch customers when popover is open or search changes
  useEffect(() => {
    if (!showCustomerPopover) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      try {
        setCustomersLoading(true);
        const list = await customersApi.list(customerSearch || undefined);
        if (!cancelled) setCustomers(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setCustomers([]);
      } finally {
        if (!cancelled) setCustomersLoading(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [showCustomerPopover, customerSearch]);

  const validateStep = (stepNumber: number) => {
    const newErrors: Record<string, string> = {};

    if (stepNumber === 1) {
      if (!formData.subject.trim()) {
        newErrors.subject = t('validation.subjectRequired');
      }
      if (!formData.description.trim()) {
        newErrors.description = t('validation.descriptionRequired');
      }
      if (!formData.customerId) {
        newErrors.customerId = t('validation.customerRequired');
      }
    }

    if (stepNumber === 2) {
      if (!formData.channelId) {
        newErrors.channelId = t('validation.channelRequired');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setStep(step - 1);
    setErrors({});
  };

  const handleSubmit = async () => {
    if (!validateStep(step)) return;

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {};
      payload.subject = formData.subject;
      payload.description = formData.description;
      payload.priority = formData.priority;
      if (formData.customerId) payload.customerId = formData.customerId;
      if (formData.channelId) payload.channelId = formData.channelId;
      if (formData.assignedAgentId && formData.assignedAgentId !== 'UNASSIGNED') payload.assignedAgentId = formData.assignedAgentId;
      if (formData.teamId && formData.teamId !== 'NO_TEAM') payload.teamId = formData.teamId;
      if (formData.tags?.length) payload.tags = formData.tags;
      if (formData.dueDate) payload.dueDate = formData.dueDate.toISOString();
      // Language hint via browser locale if available
      try {
        const hdr = typeof window !== 'undefined' ? (navigator.languages?.[0] || navigator.language || '') : ''
        const short = (hdr || '').split('-')[0]?.toLowerCase() || ''
        if (short) (payload as Record<string, unknown>)['language'] = short
      } catch {/* no-op */}

      const tenantId = (user as { tenantId?: string } | null | undefined)?.tenantId;
      if (tenantId) payload.tenantId = tenantId;

      if (Object.keys(dynamicFields).length) (payload as any).customFields = dynamicFields;
      const created = (await ticketsApi.create(payload)) as unknown as { id?: string };
      try {
        // Notify any open tickets lists to refresh and optionally select the new ticket
        window.dispatchEvent(new CustomEvent('glavito:tickets:refetch', { detail: { id: created?.id } }));
      } catch {
        // no-op
      }
      
      // If no agent was assigned, show routing suggestions
      if (created?.id && (!formData.assignedAgentId || formData.assignedAgentId === 'UNASSIGNED')) {
        setCreatedTicketId(created.id);
        setStep(4); // Show routing suggestions step
      } else {
        onSuccess();
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to create ticket:', error);
      setErrors({ submit: t('validation.createFailed') });
    } finally {
      setLoading(false);
    }
  };

  const handleTagAdd = (tag: string) => {
    if (tag && !formData.tags.includes(tag)) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
    }
    setTagInput('');
  };

  const handleTagRemove = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const filteredCustomers = customers; // server-side filtering by q
  const selectedCustomer = customers.find(c => c.id === formData.customerId);
  const selectedChannel = channels.find(c => c.id === formData.channelId);
  const selectedAgent = agents.find(a => a.id === formData.assignedAgentId);
  const selectedTeam = teams.find(t => t.id === formData.teamId);

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="subject" className="text-xs font-medium">
            {t('createDialog.subject')} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="subject"
            placeholder={t('createDialog.subjectPlaceholder')}
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            className={cn("h-9 border-0 shadow-sm text-xs", errors.subject && "border-red-500 focus:border-red-500")}
          />
          {errors.subject && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <FaExclamationCircle className="h-3.5 w-3.5" />
              <span>{errors.subject}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description" className="text-xs font-medium">
            {t('createDialog.descriptionLabel')} <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder={t('createDialog.descriptionPlaceholder')}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={cn("min-h-24 border-0 shadow-sm text-xs resize-none", errors.description && "border-red-500 focus:border-red-500")}
          />
          {errors.description && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <FaExclamationCircle className="h-3.5 w-3.5" />
              <span>{errors.description}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">
            {t('createDialog.customer')} <span className="text-red-500">*</span>
          </Label>
          <Popover open={showCustomerPopover} onOpenChange={setShowCustomerPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={showCustomerPopover}
                className={cn(
                  "w-full justify-between h-9 border-0 shadow-sm text-xs",
                  errors.customerId && "border-red-500 focus:border-red-500"
                )}
              >
                {selectedCustomer ? (
                  <div className="flex items-center gap-2">
                    <FaUser className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                    <span className="text-muted-foreground">({selectedCustomer.company})</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{t('createDialog.selectCustomer')}</span>
                )}
                <FaChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0 z-[9999]" align="start" sideOffset={8} avoidCollisions>
              <Command>
                <CommandInput 
                  placeholder={t('createDialog.searchCustomer')}
                  value={customerSearch}
                  onValueChange={setCustomerSearch}
                  autoFocus
                />
                <CommandEmpty>
                  {customersLoading ? tCommon('loading') : t('createDialog.noCustomerFound')}
                </CommandEmpty>
                <CommandGroup className="max-h-64 overflow-auto">
                  {filteredCustomers.map((customer) => {
                    // Create a searchable value that includes name, email, and company
                    const searchableValue = [
                      customer.firstName,
                      customer.lastName,
                      customer.email,
                      customer.company,
                    ]
                      .filter(Boolean)
                      .join(' ')
                      .toLowerCase();
                    
                    return (
                      <CommandItem
                        key={customer.id}
                        value={searchableValue}
                        onSelect={() => {
                          setFormData(prev => ({ ...prev, customerId: customer.id }));
                          setShowCustomerPopover(false);
                          setCustomerSearch('');
                        }}
                        className="cursor-pointer"
                      >
                        <FaCheck
                          className={cn(
                            "mr-2 h-3.5 w-3.5",
                            formData.customerId === customer.id ? "opacity-100 text-green-600 dark:text-green-400" : "opacity-0"
                          )}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <FaUser className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-xs">
                              {customer.firstName} {customer.lastName}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {customer.company && (
                              <div className="flex items-center gap-1">
                                <FaBuilding className="h-3 w-3" />
                                <span>{customer.company}</span>
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1">
                                <FaEnvelope className="h-3 w-3" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {errors.customerId && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <FaExclamationCircle className="h-3.5 w-3.5" />
              <span>{errors.customerId}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority" className="text-xs font-medium">{t('createDialog.priority')}</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
          >
            <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  <span className={option.color}>{option.label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{t('createDialog.channel')} *</Label>
          {channelsLoading ? (
            <div className="flex items-center justify-center p-8">
              <FaSpinner className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : channels.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground border-0 shadow-sm rounded-lg bg-muted/30">
              {t('createDialog.noChannelsAvailable') || 'No channels available. Please configure channels first.'}
            </div>
          ) : (
          <div className="grid grid-cols-2 gap-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <Button
                  key={channel.id}
                  type="button"
                  variant={formData.channelId === channel.id ? "default" : "outline"}
                  className={cn(
                    "h-auto p-3 flex flex-col items-center gap-2 border-0 shadow-sm",
                    formData.channelId === channel.id 
                      ? "bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white" 
                      : "bg-background hover:bg-muted"
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, channelId: channel.id, channelType: channel.type }))}
                >
                  <Icon className={cn(
                    "h-5 w-5",
                    formData.channelId === channel.id ? "text-white" : "text-blue-600 dark:text-blue-400"
                  )} />
                  <div className="text-center">
                    <div className="font-medium text-xs">{channel.name}</div>
                    <div className="text-[10px] text-muted-foreground capitalize">
                      {channel.type}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
          )}
          {errors.channelId && (
            <p className="text-xs text-red-500 flex items-center gap-1.5">
              <FaExclamationCircle className="h-3.5 w-3.5" />
              <span>{errors.channelId}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignee" className="text-xs font-medium">
            {t('createDialog.assignee')} ({tCommon('optional')})
          </Label>
          <Select
            value={formData.assignedAgentId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, assignedAgentId: value }))}
            disabled={agentsLoading}
          >
            <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
              <SelectValue placeholder={agentsLoading ? tCommon('loading') : t('createDialog.selectAgent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNASSIGNED" className="text-xs">{t('createDialog.unassigned')}</SelectItem>
              {agents.length === 0 && !agentsLoading && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {t('createDialog.noAgentsAvailable') || 'No agents available'}
                </div>
              )}
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <FaUser className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>{agent.firstName} {agent.lastName}</span>
                    {agent.skills.length > 0 && (
                    <div className="flex gap-1">
                      {agent.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-[10px] h-4 px-1.5">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="team" className="text-xs font-medium">
            {t('createDialog.team')} ({tCommon('optional')})
          </Label>
          <Select
            value={formData.teamId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, teamId: value }))}
            disabled={teamsLoading}
          >
            <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
              <SelectValue placeholder={teamsLoading ? tCommon('loading') : t('createDialog.selectTeam')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NO_TEAM" className="text-xs">{t('createDialog.noTeam')}</SelectItem>
              {teams.length === 0 && !teamsLoading && (
                <div className="p-4 text-center text-xs text-muted-foreground">
                  {t('createDialog.noTeamsAvailable') || 'No teams available'}
                </div>
              )}
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id} className="text-xs">
                  <div>
                    <div className="font-medium">{team.name}</div>
                    {team.description && (
                    <div className="text-[10px] text-muted-foreground">{team.description}</div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label className="text-xs font-medium">
            {t('createDialog.tags')} ({tCommon('optional')})
          </Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder={t('createDialog.addTag')}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTagAdd(tagInput);
                  }
                }}
                className="h-9 border-0 shadow-sm text-xs"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTagAdd(tagInput)}
                disabled={!tagInput.trim()}
                className="h-9 border-0 shadow-sm"
              >
                <FaPlus className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* Suggested Tags */}
            <div className="space-y-2">
              <Label className="text-[10px] text-muted-foreground">{t('createDialog.suggestedTags')}</Label>
              <div className="flex flex-wrap gap-1">
                {availableTags
                  .filter(tag => !formData.tags.includes(tag))
                  .slice(0, 8)
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted text-[10px] h-5 px-2 border-0 shadow-sm"
                      onClick={() => handleTagAdd(tag)}
                    >
                      <FaTag className="h-2.5 w-2.5 mr-1" />
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Selected Tags */}
            {formData.tags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-[10px] text-muted-foreground">{t('createDialog.selectedTags')}</Label>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 text-[10px] h-5 px-2 border-0 shadow-sm">
                      <FaTag className="h-2.5 w-2.5" />
                      <span>{tag}</span>
                      <FaTimes
                        className="h-2.5 w-2.5 cursor-pointer hover:text-red-600"
                        onClick={() => handleTagRemove(tag)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-medium">
            {t('createDialog.dueDate')} ({tCommon('optional')})
          </Label>
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9 border-0 shadow-sm text-xs",
                  !formData.dueDate && "text-muted-foreground"
                )}
              >
                <FaCalendarAlt className="mr-2 h-3.5 w-3.5" />
                {formData.dueDate ? format(formData.dueDate, "PPP") : t('createDialog.selectDueDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 z-[9999]" align="start">
              <Calendar
                mode="single"
                selected={formData.dueDate ?? undefined}
                onSelect={(date) => {
                  setFormData(prev => ({ ...prev, dueDate: date ?? null }));
                  setShowDatePicker(false);
                }}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Dynamic Custom Fields */}
        {!!customFields && Array.isArray(customFields) && customFields.filter((f: any) => f.entity === 'ticket' && f.isActive).length > 0 && (
          <>
            <Separator className="bg-border/50" />
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50">
                  <FaTag className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                {t('createDialog.additionalFields', { default: 'Additional fields' })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields
                  .filter((f: any) => f.entity === 'ticket' && f.isActive)
                  .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                  .map((field: any) => (
                  <div key={field.id} className="space-y-2">
                    <Label className="text-xs font-medium">{field.label}{field.required ? ' *' : ''}</Label>
                    {(['text','email','phone','url','number'] as string[]).includes(field.type) ? (
                      <Input
                        type={field.type === 'number' ? 'number' : 'text'}
                        value={dynamicFields[field.name] ?? ''}
                        onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                        placeholder={field.description || ''}
                        className="h-9 border-0 shadow-sm text-xs"
                      />
                    ) : field.type === 'textarea' ? (
                      <Textarea
                        value={dynamicFields[field.name] ?? ''}
                        onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                        rows={3}
                        className="border-0 shadow-sm resize-none text-xs"
                      />
                    ) : field.type === 'boolean' ? (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
                        <input
                          type="checkbox"
                          checked={!!dynamicFields[field.name]}
                          onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: e.target.checked }))}
                          className="h-4 w-4"
                        />
                        <span className="text-xs text-muted-foreground">{field.description || ''}</span>
                      </div>
                    ) : field.type === 'select' ? (
                      <Select
                        value={String(dynamicFields[field.name] ?? '')}
                        onValueChange={(v) => setDynamicFields(prev => ({ ...prev, [field.name]: v }))}
                      >
                        <SelectTrigger className="h-9 border-0 shadow-sm text-xs">
                          <SelectValue placeholder={field.description || 'Select...'} />
                        </SelectTrigger>
                        <SelectContent>
                          {(Array.isArray(field.options) ? field.options : []).map((opt: any) => (
                            <SelectItem key={String(opt?.value ?? opt)} value={String(opt?.value ?? opt)} className="text-xs">
                              {String(opt?.label ?? opt)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Summary */}
      <Separator className="bg-border/50" />
      <div className="pt-4">
        <h4 className="text-xs font-semibold mb-3">{t('createDialog.summary')}</h4>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('createDialog.customer')}:</span>
            <span>{selectedCustomer?.firstName} {selectedCustomer?.lastName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('createDialog.channel')}:</span>
            <span>{selectedChannel?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('createDialog.priority')}:</span>
            <span>{priorityOptions.find(p => p.value === formData.priority)?.label}</span>
          </div>
          {selectedAgent && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('createDialog.assignee')}:</span>
              <span>{selectedAgent.firstName} {selectedAgent.lastName}</span>
            </div>
          )}
          {selectedTeam && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('createDialog.team')}:</span>
              <span>{selectedTeam.name}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-background border-0 shadow-xl rounded-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-50 dark:bg-orange-950/50">
              <FaTicketAlt className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">{t('createDialog.title')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {t('createDialog.description')} ({t('createDialog.step')} {step} {t('createDialog.of')} {step === 4 ? 4 : 3})
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 flex-1 overflow-y-auto">
          {/* Progress Indicator */}
          <div className="flex items-center space-x-2 mb-6">
            {[1, 2, 3, ...(step === 4 ? [4] : [])].map((stepNumber) => (
              <div
                key={stepNumber}
                className={cn(
                  "flex-1 h-1.5 rounded-full transition-colors",
                  stepNumber <= step ? "bg-orange-600 dark:bg-orange-500" : "bg-muted"
                )}
              />
            ))}
          </div>

          {/* Step Content */}
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && createdTicketId && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <h3 className="text-lg font-semibold mb-2">{t('createDialog.ticketCreated') || 'Ticket Created Successfully!'}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('createDialog.routingSuggestionsDescription') || 'We recommend assigning this ticket to one of these agents based on their skills and availability.'}
                </p>
              </div>
              <RoutingSuggestionsPanel
                ticketId={createdTicketId}
                onAssign={async (agentId: string) => {
                  try {
                    await ticketsApi.assign(createdTicketId, agentId);
                    onSuccess();
                    onOpenChange(false);
                  } catch (error) {
                    console.error('Failed to assign ticket:', error);
                    setErrors({ submit: t('validation.assignmentFailed') || 'Failed to assign ticket' });
                    throw error;
                  }
                }}
                onAutoAssign={async () => {
                  try {
                    await ticketsApi.autoAssign(createdTicketId);
                    onSuccess();
                    onOpenChange(false);
                  } catch (error) {
                    console.error('Failed to auto-assign ticket:', error);
                    setErrors({ submit: t('validation.autoAssignmentFailed') || 'Failed to auto-assign ticket' });
                    throw error;
                  }
                }}
              />
            </div>
          )}
        </div>

        {/* Error Message */}
        {errors.submit && (
          <div className="px-6 py-3 bg-red-50 dark:bg-red-950/30 border-0 rounded-lg">
            <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-2">
              <FaExclamationCircle className="h-3.5 w-3.5" />
              <span>{errors.submit}</span>
            </p>
          </div>
        )}

        <DialogFooter className="px-6 pb-6 pt-0 border-t border-border/50">
          <div className="flex justify-between w-full">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={loading} className="h-9 text-xs border-0 shadow-sm">
                  {t('createDialog.back')}
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              {step === 4 ? (
                <>
                  <Button variant="outline" onClick={() => {
                    onSuccess();
                    onOpenChange(false);
                  }} className="h-9 text-xs border-0 shadow-sm">
                    {t('createDialog.skipAssignment') || 'Skip Assignment'}
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading} className="h-9 text-xs border-0 shadow-sm">
                    {tCommon('cancel')}
                  </Button>
                  {step < 3 ? (
                    <Button onClick={handleNext} disabled={loading} className="h-9 text-xs bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 border-0 shadow-sm">
                      {t('createDialog.next')}
                    </Button>
                  ) : (
                    <Button onClick={handleSubmit} disabled={loading} className="h-9 text-xs bg-orange-600 hover:bg-orange-700 dark:bg-orange-600 dark:hover:bg-orange-700 border-0 shadow-sm">
                      {loading ? (
                        <>
                          <FaSpinner className="mr-2 h-3.5 w-3.5 animate-spin" />
                          {t('createDialog.creating')}
                        </>
                      ) : (
                        <>
                          <FaTicketAlt className="mr-2 h-3.5 w-3.5" />
                          {t('createDialog.create')}
                        </>
                      )}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}