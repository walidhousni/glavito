'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCrmStore } from '@/lib/store/crm-store';
import { User, Building2, Mail, Phone, Globe, Loader2 } from 'lucide-react';

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  phone?: string;
}

export function CreateLeadDialog({ open, onOpenChange }: CreateLeadDialogProps) {
  const t = useTranslations('crm.createLeadDialog');
  const { createLead, fetchCustomFields, customFields } = useCrmStore();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');
  const [phone, setPhone] = useState('');
  const [source, setSource] = useState('website');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) void fetchCustomFields('lead');
  }, [open, fetchCustomFields]);

  const leadSources = [
    { value: 'website', label: t('sources.website') },
    { value: 'referral', label: t('sources.referral') },
    { value: 'social_media', label: t('sources.socialMedia') },
    { value: 'email_campaign', label: t('sources.emailCampaign') },
    { value: 'cold_call', label: t('sources.coldCall') },
    { value: 'trade_show', label: t('sources.tradeShow') },
    { value: 'partner', label: t('sources.partner') },
    { value: 'other', label: t('sources.other') }
  ];

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setFirstName('');
      setLastName('');
      setEmail('');
      setCompany('');
      setPhone('');
      setSource('website');
      setErrors({});
    }
  }, [open]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    
    if (!firstName.trim()) {
      newErrors.firstName = t('errors.firstNameRequired');
    }
    
    if (!lastName.trim()) {
      newErrors.lastName = t('errors.lastNameRequired');
    }
    
    if (!email.trim()) {
      newErrors.email = t('errors.emailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = t('errors.emailInvalid');
    }
    
    if (!company.trim()) {
      newErrors.company = t('errors.companyRequired');
    }
    
    if (phone && !/^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''))) {
      newErrors.phone = t('errors.phoneInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;
    
    setLoading(true);
    try {
      await createLead({ 
        firstName: firstName.trim(), 
        lastName: lastName.trim(), 
        email: email.trim().toLowerCase(), 
        company: company.trim(), 
        phone: phone.trim() || undefined, 
        source,
        customFields: dynamicFields
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create lead:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold">{t('title')}</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {t('description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <User className="h-4 w-4" />
              {t('sections.personalInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-sm font-medium">
                  {t('firstName')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder={t('placeholders.firstName')} 
                  className={`transition-colors ${errors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-sm font-medium">
                  {t('lastName')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder={t('placeholders.lastName')} 
                  className={`transition-colors ${errors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Mail className="h-4 w-4" />
              {t('sections.contactInfo')}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  {t('email')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={t('placeholders.email')} 
                  className={`transition-colors ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium">
                  {t('phone')}
                </Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder={t('placeholders.phone')} 
                  className={`transition-colors ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Building2 className="h-4 w-4" />
              {t('sections.companyInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium">
                  {t('company')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="company" 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                  placeholder={t('placeholders.company')} 
                  className={`transition-colors ${errors.company ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.company && <p className="text-xs text-red-500">{errors.company}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="source" className="text-sm font-medium">
                  {t('source')}
                </Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.source')} />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map((sourceOption) => (
                      <SelectItem key={sourceOption.value} value={sourceOption.value}>
                        {sourceOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dynamic Custom Fields */}
          {!!customFields && Array.isArray(customFields) && customFields.filter((f: any) => f.entity === 'lead' && f.isActive).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <Globe className="h-4 w-4" />
                {t('sections.customFields', { default: 'Additional fields' })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields
                  .filter((f: any) => f.entity === 'lead' && f.isActive)
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
                      <textarea
                        className="w-full border rounded px-3 py-2 bg-transparent"
                        rows={3}
                        value={dynamicFields[field.name] ?? ''}
                        onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: e.target.value }))}
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

        <DialogFooter className="flex gap-3 pt-6 border-t">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="flex-1 sm:flex-none"
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading}
            className="flex-1 sm:flex-none bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('creating')}
              </>
            ) : (
              t('create')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


