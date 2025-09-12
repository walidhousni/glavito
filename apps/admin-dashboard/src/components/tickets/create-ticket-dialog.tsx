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
  Plus, 
  X, 
  User, 
  Building, 
  Mail, 
  Phone, 
  Calendar as CalendarIcon,
  Tag as TagIcon,
  Check,
  ChevronsUpDown,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ticketsApi } from '@/lib/api/tickets-client';
import { customersApi, type CustomerListItem } from '@/lib/api/customers-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { useCrmStore } from '@/lib/store/crm-store';

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

  const [channels] = useState([
    { id: '1', name: 'Email Support', type: 'email', icon: Mail },
    { id: '2', name: 'WhatsApp Business', type: 'whatsapp', icon: Phone },
    { id: '3', name: 'Instagram DM', type: 'instagram', icon: User },
    { id: '4', name: 'Web Chat', type: 'web', icon: User }
  ]);

  const [agents] = useState([
    { id: '1', firstName: 'Alice', lastName: 'Wilson', email: 'alice@company.com', skills: ['technical', 'billing'] },
    { id: '2', firstName: 'Bob', lastName: 'Brown', email: 'bob@company.com', skills: ['sales', 'onboarding'] },
    { id: '3', firstName: 'Carol', lastName: 'Davis', email: 'carol@company.com', skills: ['technical', 'escalation'] }
  ]);

  const [teams] = useState([
    { id: '1', name: 'Technical Support', description: 'Handles technical issues and bugs' },
    { id: '2', name: 'Customer Success', description: 'Manages customer relationships and success' },
    { id: '3', name: 'Sales Support', description: 'Assists with sales-related inquiries' }
  ]);

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

  useEffect(() => {
    if (open) void fetchCustomFields('ticket');
  }, [open, fetchCustomFields]);

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
      
      onSuccess();
      onOpenChange(false);
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
          <Label htmlFor="subject">{t('createDialog.subject')} *</Label>
          <Input
            id="subject"
            placeholder={t('createDialog.subjectPlaceholder')}
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            className={cn(errors.subject && "border-red-500")}
          />
          {errors.subject && (
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.subject}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">{t('createDialog.descriptionLabel')} *</Label>
          <Textarea
            id="description"
            placeholder={t('createDialog.descriptionPlaceholder')}
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className={cn("min-h-24", errors.description && "border-red-500")}
          />
          {errors.description && (
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.description}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label>{t('createDialog.customer')} *</Label>
          <Popover open={showCustomerPopover} onOpenChange={setShowCustomerPopover}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={showCustomerPopover}
                className={cn(
                  "w-full justify-between",
                  errors.customerId && "border-red-500"
                )}
              >
                {selectedCustomer ? (
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{selectedCustomer.firstName} {selectedCustomer.lastName}</span>
                    <span className="text-muted-foreground">({selectedCustomer.company})</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">{t('createDialog.selectCustomer')}</span>
                )}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0 z-[1000]" align="start" sideOffset={8} avoidCollisions>
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
                  {filteredCustomers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={(value) => {
                        setFormData(prev => ({ ...prev, customerId: value }));
                        setShowCustomerPopover(false);
                        setCustomerSearch('');
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          formData.customerId === customer.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                          <div className="flex items-center space-x-1">
                            <Building className="h-3 w-3" />
                            <span>{customer.company}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{customer.email}</span>
                          </div>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Command>
            </PopoverContent>
          </Popover>
          {errors.customerId && (
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.customerId}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">{t('createDialog.priority')}</Label>
          <Select
            value={formData.priority}
            onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {priorityOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
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
          <div className="grid grid-cols-2 gap-3">
            {channels.map((channel) => {
              const Icon = channel.icon;
              return (
                <Button
                  key={channel.id}
                  variant={formData.channelId === channel.id ? "default" : "outline"}
                  className="h-auto p-4 flex flex-col items-center space-y-2"
                  onClick={() => setFormData(prev => ({ ...prev, channelId: channel.id, channelType: channel.type }))}
                >
                  <Icon className="h-6 w-6" />
                  <div className="text-center">
                    <div className="font-medium">{channel.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">
                      {channel.type}
                    </div>
                  </div>
                </Button>
              );
            })}
          </div>
          {errors.channelId && (
            <p className="text-sm text-red-600 flex items-center space-x-1">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.channelId}</span>
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignee">{t('createDialog.assignee')} ({tCommon('optional')})</Label>
          <Select
            value={formData.assignedAgentId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, assignedAgentId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('createDialog.selectAgent')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UNASSIGNED">{t('createDialog.unassigned')}</SelectItem>
              {agents.map((agent) => (
                <SelectItem key={agent.id} value={agent.id}>
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4" />
                    <span>{agent.firstName} {agent.lastName}</span>
                    <div className="flex space-x-1">
                      {agent.skills.slice(0, 2).map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="team">{t('createDialog.team')} ({tCommon('optional')})</Label>
          <Select
            value={formData.teamId}
            onValueChange={(value) => setFormData(prev => ({ ...prev, teamId: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('createDialog.selectTeam')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NO_TEAM">{t('createDialog.noTeam')}</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  <div>
                    <div className="font-medium">{team.name}</div>
                    <div className="text-xs text-muted-foreground">{team.description}</div>
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
          <Label>{t('createDialog.tags')} ({tCommon('optional')})</Label>
          <div className="space-y-2">
            <div className="flex space-x-2">
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
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => handleTagAdd(tagInput)}
                disabled={!tagInput.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Suggested Tags */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">{t('createDialog.suggestedTags')}</Label>
              <div className="flex flex-wrap gap-1">
                {availableTags
                  .filter(tag => !formData.tags.includes(tag))
                  .slice(0, 8)
                  .map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="cursor-pointer hover:bg-muted"
                      onClick={() => handleTagAdd(tag)}
                    >
                      <TagIcon className="h-3 w-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
              </div>
            </div>

            {/* Selected Tags */}
            {formData.tags.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{t('createDialog.selectedTags')}</Label>
                <div className="flex flex-wrap gap-1">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="flex items-center space-x-1">
                      <TagIcon className="h-3 w-3" />
                      <span>{tag}</span>
                      <X
                        className="h-3 w-3 cursor-pointer hover:text-red-600"
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
          <Label>{t('createDialog.dueDate')} ({tCommon('optional')})</Label>
          <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !formData.dueDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {formData.dueDate ? format(formData.dueDate, "PPP") : t('createDialog.selectDueDate')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={formData.dueDate ?? undefined}
                onSelect={(date) => {
                  setFormData(prev => ({ ...prev, dueDate: date ?? null }));
                  setShowDatePicker(false);
                }}
                disabled={(date) => date < new Date()}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Dynamic Custom Fields */}
        {!!customFields && Array.isArray(customFields) && customFields.filter((f: any) => f.entity === 'ticket' && f.isActive).length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <TagIcon className="h-4 w-4" />
              {t('createDialog.additionalFields', { default: 'Additional fields' })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customFields
                .filter((f: any) => f.entity === 'ticket' && f.isActive)
                .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((field: any) => (
                <div key={field.id} className="space-y-2">
                  <Label className="text-sm font-medium">{field.label}{field.required ? ' *' : ''}</Label>
                  {(['text','email','phone','url','number'] as string[]).includes(field.type) ? (
                    <Input
                      type={field.type === 'number' ? 'number' : 'text'}
                      value={dynamicFields[field.name] ?? ''}
                      onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: field.type === 'number' ? Number(e.target.value) : e.target.value }))}
                      placeholder={field.description || ''}
                    />
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      value={dynamicFields[field.name] ?? ''}
                      onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                      rows={3}
                    />
                  ) : field.type === 'boolean' ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!dynamicFields[field.name]}
                        onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: e.target.checked }))}
                      />
                      <span className="text-sm text-muted-foreground">{field.description || ''}</span>
                    </div>
                  ) : field.type === 'select' ? (
                    <Select
                      value={String(dynamicFields[field.name] ?? '')}
                      onValueChange={(v) => setDynamicFields(prev => ({ ...prev, [field.name]: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={field.description || 'Select...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(Array.isArray(field.options) ? field.options : []).map((opt: any) => (
                          <SelectItem key={String(opt?.value ?? opt)} value={String(opt?.value ?? opt)}>
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
        )}
      </div>

      {/* Summary */}
      <div className="pt-4 border-t">
        <h4 className="font-medium mb-3">{t('createDialog.summary')}</h4>
        <div className="space-y-2 text-sm">
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
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('createDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('createDialog.description')} ({t('createDialog.step')} {step} {t('createDialog.of')} 3)
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
        <div className="flex items-center space-x-2 mb-6">
          {[1, 2, 3].map((stepNumber) => (
            <div
              key={stepNumber}
              className={cn(
                "flex-1 h-2 rounded-full",
                stepNumber <= step ? "bg-primary" : "bg-muted"
              )}
            />
          ))}
        </div>

        {/* Step Content */}
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}

        {/* Error Message */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600 flex items-center space-x-2">
              <AlertCircle className="h-4 w-4" />
              <span>{errors.submit}</span>
            </p>
          </div>
        )}

        <DialogFooter>
          <div className="flex justify-between w-full">
            <div>
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} disabled={loading}>
                  {t('createDialog.back')}
                </Button>
              )}
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
                {tCommon('cancel')}
              </Button>
              {step < 3 ? (
                <Button onClick={handleNext} disabled={loading}>
                  {t('createDialog.next')}
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('createDialog.creating')}</span>
                    </div>
                  ) : (
                    t('createDialog.create')
                  )}
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}