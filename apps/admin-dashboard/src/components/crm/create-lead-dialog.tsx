'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCrmStore } from '@/lib/store/crm-store';
import { 
  FaUser, 
  FaBuilding, 
  FaEnvelope, 
  FaGlobe, 
  FaSpinner 
} from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';

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
    
    if (phone && !/^[+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-()]/g, ''))) {
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
      <DialogContent className="max-w-2xl p-0 gap-0 bg-background border-0 shadow-xl rounded-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
              <FaUser className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-foreground">{t('title')}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {t('description')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6 max-h-[calc(90vh-180px)] overflow-y-auto">
          {/* Personal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                <FaUser className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              {t('sections.personalInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-xs font-medium">
                  {t('firstName')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="firstName" 
                  value={firstName} 
                  onChange={(e) => setFirstName(e.target.value)} 
                  placeholder={t('placeholders.firstName')} 
                  className={`h-9 border-0 shadow-sm ${errors.firstName ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-xs font-medium">
                  {t('lastName')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="lastName" 
                  value={lastName} 
                  onChange={(e) => setLastName(e.target.value)} 
                  placeholder={t('placeholders.lastName')} 
                  className={`h-9 border-0 shadow-sm ${errors.lastName ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Contact Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <FaEnvelope className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              {t('sections.contactInfo')}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-medium">
                  {t('email')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder={t('placeholders.email')} 
                  className={`h-9 border-0 shadow-sm ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-medium">
                  {t('phone')}
                </Label>
                <Input 
                  id="phone" 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => setPhone(e.target.value)} 
                  placeholder={t('placeholders.phone')} 
                  className={`h-9 border-0 shadow-sm ${errors.phone ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Company Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                <FaBuilding className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              {t('sections.companyInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-xs font-medium">
                  {t('company')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="company" 
                  value={company} 
                  onChange={(e) => setCompany(e.target.value)} 
                  placeholder={t('placeholders.company')} 
                  className={`h-9 border-0 shadow-sm ${errors.company ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.company && <p className="text-xs text-red-500">{errors.company}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="source" className="text-xs font-medium">
                  {t('source')}
                </Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger id="source" className="h-9 border-0 shadow-sm">
                    <SelectValue placeholder={t('placeholders.source')} />
                  </SelectTrigger>
                  <SelectContent>
                    {leadSources.map((sourceOption) => (
                      <SelectItem key={sourceOption.value} value={sourceOption.value} className="text-xs">
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
            <>
              <Separator className="bg-border/50" />
            <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50">
                    <FaGlobe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                {t('sections.customFields', { default: 'Additional fields' })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields
                  .filter((f: any) => f.entity === 'lead' && f.isActive)
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
                          className="h-9 border-0 shadow-sm"
                      />
                    ) : field.type === 'textarea' ? (
                        <Textarea
                          className="w-full border-0 shadow-sm resize-none"
                        rows={3}
                        value={dynamicFields[field.name] ?? ''}
                        onChange={(e) => setDynamicFields(prev => ({ ...prev, [field.name]: e.target.value }))}
                        placeholder={field.description || ''}
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
                          <SelectTrigger className="h-9 border-0 shadow-sm">
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

        <DialogFooter className="px-6 pb-6 pt-0 border-t border-border/50">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="h-9 text-xs border-0 shadow-sm"
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleCreate} 
            disabled={loading}
            className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm"
          >
            {loading ? (
              <>
                <FaSpinner className="mr-2 h-3.5 w-3.5 animate-spin" />
                {t('creating')}
              </>
            ) : (
              <>
                <FaUser className="mr-2 h-3.5 w-3.5" />
                {t('create')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


