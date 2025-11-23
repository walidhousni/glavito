'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { PhoneInput } from './phone-input';
import { customersApi } from '@/lib/api/customers-client';
import { teamApi } from '@/lib/api/team';
import { crmApi } from '@/lib/api/crm-client';
import { useAuthStore } from '@/lib/store/auth-store';
import { 
  User, 
  UserPlus,
  Building, 
  Mail, 
  Phone, 
  Tag, 
  UserCircle, 
  Briefcase, 
  TrendingUp, 
  Star,
  Users,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  phoneCountryCode: string;
  company: string;
  jobTitle: string;
  labels: string[];
  contactOwnerId: string;
  leadStage: string;
  leadSource: string;
  priority: string;
  subscriber: boolean;
  segmentIds: string[];
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  [key: string]: string | undefined;
}

const LEAD_STAGES = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'PROPOSAL', label: 'Proposal' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'CONVERTED', label: 'Converted' },
  { value: 'LOST', label: 'Lost' },
];

const LEAD_SOURCES = [
  { value: 'website', label: 'Website' },
  { value: 'referral', label: 'Referral' },
  { value: 'paid_social', label: 'Paid Social' },
  { value: 'organic_social', label: 'Organic Social' },
  { value: 'email_campaign', label: 'Email Campaign' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'trade_show', label: 'Trade Show' },
  { value: 'partner', label: 'Partner' },
  { value: 'other', label: 'Other' },
];

const PRIORITIES = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

const AVAILABLE_LABELS = [
  'VIP',
  'Enterprise',
  'SMB',
  'Trial',
  'Churned',
  'At Risk',
  'High Value',
  'Technical',
  'Billing',
  'Sales',
];

export function CreateCustomerDialog({ open, onOpenChange, onSuccess }: CreateCustomerDialogProps) {
  const t = useTranslations('customers');
  const { toast } = useToast();
  const { user } = useAuthStore();
  
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    phoneCountryCode: '+1',
    company: '',
    jobTitle: '',
    labels: [],
    contactOwnerId: '',
    leadStage: 'NEW',
    leadSource: 'website',
    priority: 'medium',
    subscriber: false,
    segmentIds: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<Array<{ id: string; firstName: string; lastName: string; email: string; role: string }>>([]);
  const [segments, setSegments] = useState<Array<{ id: string; name: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [segmentsLoading, setSegmentsLoading] = useState(false);
  const [labelInput, setLabelInput] = useState('');

  // Fetch available users (admins/agents) for contact owner
  useEffect(() => {
    if (open) {
      setUsersLoading(true);
      teamApi.getAvailableUsers()
        .then((users) => {
          setAvailableUsers(users);
        })
        .catch(() => {
          toast({
            title: 'Error',
            description: 'Failed to load users',
            variant: 'destructive',
          });
        })
        .finally(() => {
          setUsersLoading(false);
        });
    }
  }, [open, toast]);

  // Fetch customer segments (lists)
  useEffect(() => {
    if (open) {
      setSegmentsLoading(true);
      crmApi.listSegments()
        .then((segmentsList) => {
          setSegments(segmentsList.map(s => ({ id: s.id, name: s.name })));
        })
        .catch(() => {
          // Silently fail - segments are optional
        })
        .finally(() => {
          setSegmentsLoading(false);
        });
    }
  }, [open]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        phoneCountryCode: '+1',
        company: '',
        jobTitle: '',
        labels: [],
        contactOwnerId: '',
        leadStage: 'NEW',
        leadSource: 'website',
        priority: 'medium',
        subscriber: false,
        segmentIds: [],
      });
      setErrors({});
      setLabelInput('');
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    
    if (formData.phone && !/^[\d\s\-()]+$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddLabel = () => {
    if (labelInput.trim() && !formData.labels.includes(labelInput.trim())) {
      setFormData(prev => ({
        ...prev,
        labels: [...prev.labels, labelInput.trim()],
      }));
      setLabelInput('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    setFormData(prev => ({
      ...prev,
      labels: prev.labels.filter(l => l !== label),
    }));
  };

  const handleCreate = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      const tenantId = (user as { tenantId?: string } | null | undefined)?.tenantId;
      if (!tenantId) {
        throw new Error('Tenant ID not found');
      }

      // Create customer
      const customer = await customersApi.create({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phoneCountryCode + formData.phone.replace(/\D/g, ''),
        company: formData.company || undefined,
        tenantId,
        tags: formData.labels,
        customFields: {
          jobTitle: formData.jobTitle || undefined,
          leadStage: formData.leadStage,
          leadSource: formData.leadSource,
          priority: formData.priority,
          subscriber: formData.subscriber,
          contactOwnerId: formData.contactOwnerId || undefined,
        },
      });

      // Create lead if lead stage is set
      if (formData.leadStage && formData.leadStage !== 'CONVERTED') {
        try {
          await crmApi.createLead({
            customerId: customer.id,
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            company: formData.company || undefined,
            phone: formData.phoneCountryCode + formData.phone.replace(/\D/g, ''),
            source: formData.leadSource,
            status: formData.leadStage,
            assignedUserId: formData.contactOwnerId || undefined,
            tags: formData.labels,
            tenantId,
          });
        } catch (leadError) {
          console.warn('Failed to create lead:', leadError);
          // Don't fail the whole operation if lead creation fails
        }
      }

      // Add to segments (lists) manually
      if (formData.segmentIds.length > 0) {
        try {
          // Add customer to each selected segment
          await Promise.all(
            formData.segmentIds.map(segmentId =>
              crmApi.addCustomersToSegment(segmentId, [customer.id]).catch((err) => {
                console.warn(`Failed to add customer to segment ${segmentId}:`, err);
                // Don't fail the whole operation if segment assignment fails
              })
            )
          );
        } catch (segmentError) {
          console.warn('Failed to add customer to segments:', segmentError);
          // Don't fail the whole operation if segment assignment fails
        }
      }

      toast({
        title: 'Success',
        description: 'Customer created successfully',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create customer';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-muted/10">
        <DialogHeader className="space-y-3">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-primary/10 rounded-lg">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            {t('createDialog.title', { fallback: 'Create New Customer' })}
          </DialogTitle>
          <DialogDescription className="text-base">
            {t('createDialog.description', { fallback: 'Add a new customer to your CRM' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <User className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Basic Information</h3>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-semibold">
                  First Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                  placeholder="Enter first name"
                  className={cn('h-11', errors.firstName && 'border-destructive')}
                />
                {errors.firstName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.firstName}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-semibold">
                  Last Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                  placeholder="Enter last name"
                  className={cn('h-11', errors.lastName && 'border-destructive')}
                />
                {errors.lastName && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
                className={cn('h-11', errors.email && 'border-destructive')}
              />
              {errors.email && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.email}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-sm font-semibold flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <PhoneInput
                value={formData.phone}
                onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                countryCode={formData.phoneCountryCode}
                onCountryCodeChange={(code) => setFormData(prev => ({ ...prev, phoneCountryCode: code }))}
                placeholder="Enter phone number"
                error={errors.phone}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="labels" className="text-sm font-semibold flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Labels
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.labels.map((label) => (
                  <Badge key={label} variant="secondary" className="flex items-center gap-1">
                    {label}
                    <button
                      type="button"
                      onClick={() => handleRemoveLabel(label)}
                      className="ml-1 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Select value={labelInput} onValueChange={setLabelInput}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select or type a label" />
                  </SelectTrigger>
                  <SelectContent>
                    {AVAILABLE_LABELS.filter(l => !formData.labels.includes(l)).map((label) => (
                      <SelectItem key={label} value={label}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={labelInput}
                  onChange={(e) => setLabelInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddLabel();
                    }
                  }}
                  placeholder="Type and press Enter"
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={handleAddLabel} size="icon">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactOwner" className="text-sm font-semibold flex items-center gap-2">
                <UserCircle className="h-4 w-4" />
                Contact Owner
              </Label>
              <Select
                value={formData.contactOwnerId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, contactOwnerId: value }))}
                disabled={usersLoading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={usersLoading ? 'Loading...' : 'Select contact owner'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  {availableUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.firstName} {user.lastName}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Additional Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b">
              <Briefcase className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">Additional Information</h3>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-semibold flex items-center gap-2">
                <Building className="h-4 w-4" />
                Company Name
              </Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Enter company name"
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="jobTitle" className="text-sm font-semibold flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Job Title
              </Label>
              <Input
                id="jobTitle"
                value={formData.jobTitle}
                onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                placeholder="Enter job title"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="leadStage" className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Lead Stage
                </Label>
                <Select
                  value={formData.leadStage}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, leadStage: value }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map((stage) => (
                      <SelectItem key={stage.value} value={stage.value}>
                        {stage.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="leadSource" className="text-sm font-semibold flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Lead Source
                </Label>
                <Select
                  value={formData.leadSource}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, leadSource: value }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_SOURCES.map((source) => (
                      <SelectItem key={source.value} value={source.value}>
                        {source.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-sm font-semibold">
                  Priority
                </Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((priority) => (
                      <SelectItem key={priority.value} value={priority.value}>
                        {priority.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subscriber" className="text-sm font-semibold flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Subscriber
                </Label>
                <Select
                  value={formData.subscriber ? 'yes' : 'no'}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subscriber: value === 'yes' }))}
                >
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes">Yes</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="segments" className="text-sm font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Add to Lists
              </Label>
              <Select
                value=""
                onValueChange={(value) => {
                  if (value && !formData.segmentIds.includes(value)) {
                    setFormData(prev => ({
                      ...prev,
                      segmentIds: [...prev.segmentIds, value],
                    }));
                  }
                }}
                disabled={segmentsLoading}
              >
                <SelectTrigger className="h-11">
                  <SelectValue placeholder={segmentsLoading ? 'Loading...' : 'Select a list'} />
                </SelectTrigger>
                <SelectContent>
                  {segments.map((segment) => (
                    <SelectItem key={segment.id} value={segment.id}>
                      {segment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.segmentIds.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.segmentIds.map((segmentId) => {
                    const segment = segments.find(s => s.id === segmentId);
                    return segment ? (
                      <Badge key={segmentId} variant="secondary" className="flex items-center gap-1">
                        {segment.name}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              segmentIds: prev.segmentIds.filter(id => id !== segmentId),
                            }));
                          }}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-11 px-6 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading}
            className="h-11 px-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <User className="h-4 w-4 mr-2" />
                Create Customer
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

