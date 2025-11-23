'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCrmStore } from '@/lib/store/crm-store';
import { 
  FaDollarSign, 
  FaBullseye, 
  FaBriefcase, 
  FaSpinner, 
  FaUsers 
} from 'react-icons/fa';
import { Separator } from '@/components/ui/separator';
import { customersApi, type CustomerListItem } from '@/lib/api/customers-client';

const STAGES = ['NEW', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: {
    name?: string;
    description?: string;
    value?: number;
    currency?: string;
    pipelineId?: string;
    stage?: typeof STAGES[number];
    customerId?: string;
  };
}

interface FormErrors {
  name?: string;
  value?: string;
  pipelineId?: string;
}

export function CreateDealDialog({ open, onOpenChange, prefill }: CreateDealDialogProps) {
  const t = useTranslations('crm.createDealDialog');
  const tStages = useTranslations('crm.stages');
  const { pipelines, createDeal, fetchCustomFields, customFields } = useCrmStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [pipelineId, setPipelineId] = useState<string | undefined>(undefined);
  const [stage, setStage] = useState<typeof STAGES[number]>('NEW');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [dynamicFields, setDynamicFields] = useState<Record<string, any>>({});
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);
  const [customerQuery, setCustomerQuery] = useState('');
  const [customerOptions, setCustomerOptions] = useState<CustomerListItem[]>([]);

  useEffect(() => {
    if (open) void fetchCustomFields('deal');
  }, [open, fetchCustomFields]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        if (!open) return;
        const list = await customersApi.list(customerQuery);
        if (active) setCustomerOptions(list.slice(0, 25));
      } catch { /* noop */ }
    })();
    return () => { active = false };
  }, [open, customerQuery]);

  const currencies = [
    { value: 'USD', label: 'USD - US Dollar' },
    { value: 'EUR', label: 'EUR - Euro' },
    { value: 'GBP', label: 'GBP - British Pound' },
    { value: 'CAD', label: 'CAD - Canadian Dollar' },
    { value: 'AUD', label: 'AUD - Australian Dollar' },
    { value: 'JPY', label: 'JPY - Japanese Yen' }
  ];

  useEffect(() => {
    if (!open) {
      // Reset form when dialog closes
      setName('');
      setDescription('');
      setValue('');
      setCurrency('USD');
      setStage('NEW');
      setErrors({});
    } else {
      // Prefill defaults if provided
      setName((prefill?.name ?? '').toString());
      setDescription((prefill?.description ?? '').toString());
      setValue(typeof prefill?.value === 'number' ? String(prefill?.value) : '');
      setCurrency(prefill?.currency || 'USD');
      setStage(prefill?.stage || 'NEW');
      setErrors({});
      setCustomerId(prefill?.customerId);
      // Choose pipeline: prefill or first available
      if (prefill?.pipelineId) {
        setPipelineId(prefill.pipelineId);
      } else if (pipelines?.[0]?.id) {
        setPipelineId(pipelines[0].id);
      }
    }
  }, [open, pipelines, prefill]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = t('errors.nameRequired');
    }

    if (!value.trim()) {
      newErrors.value = t('errors.valueRequired');
    } else if (Number.isNaN(Number(value)) || Number(value) <= 0) {
      newErrors.value = t('errors.valueInvalid');
    }

    if (!pipelineId) {
      newErrors.pipelineId = t('errors.pipelineRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCreate = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      await createDeal({
        name: name.trim(),
        description: description.trim() || undefined,
        value: Number(value),
        currency,
        pipelineId,
        stage,
        customerId: customerId || prefill?.customerId,
        customFields: dynamicFields
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create deal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 bg-background border-0 shadow-xl rounded-xl">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/50">
              <FaBullseye className="h-5 w-5 text-green-600 dark:text-green-400" />
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
          {/* Deal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                <FaBriefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              </div>
              {t('sections.dealInfo')}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-medium">
                  {t('fields.name')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t('placeholders.name')}
                  className={`h-9 border-0 shadow-sm ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-medium">
                  {t('fields.description')}
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('placeholders.description')}
                  rows={3}
                  className="border-0 shadow-sm resize-none"
                />
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Financial Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50">
                <FaDollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              {t('sections.financialInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value" className="text-xs font-medium">
                  {t('fields.value')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="value"
                  type="number"
                  min="0"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={t('placeholders.value')}
                  className={`h-9 border-0 shadow-sm ${errors.value ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.value && <p className="text-xs text-red-500">{errors.value}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-xs font-medium">
                  {t('fields.currency')}
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="h-9 border-0 shadow-sm">
                    <SelectValue placeholder={t('placeholders.currency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value} className="text-xs">
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Pipeline & Stage */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <div className="p-1.5 rounded-lg bg-purple-50 dark:bg-purple-950/50">
                <FaBullseye className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              </div>
              {t('sections.pipelineInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {t('fields.pipeline')} <span className="text-red-500">*</span>
                </Label>
                <Select value={pipelineId} onValueChange={setPipelineId}>
                  <SelectTrigger className={`h-9 border-0 shadow-sm ${errors.pipelineId ? 'border-red-500 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder={t('placeholders.pipeline')} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.pipelineId && <p className="text-xs text-red-500">{errors.pipelineId}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  {t('fields.stage')}
                </Label>
                <Select value={stage} onValueChange={(v) => setStage(v as typeof STAGES[number])}>
                  <SelectTrigger className="h-9 border-0 shadow-sm">
                    <SelectValue placeholder={t('placeholders.stage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s} className="text-xs">{tStages(s.toLowerCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator className="bg-border/50" />

          {/* Customer Linking */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <div className="p-1.5 rounded-lg bg-orange-50 dark:bg-orange-950/50">
                <FaUsers className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
              </div>
              {t('sections.customer', { default: 'Customer' })}
            </div>
            <div className="grid grid-cols-1 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">{t('fields.customer', { default: 'Link to Customer (optional)' })}</Label>
                <Input
                  placeholder={t('placeholders.searchCustomer', { default: 'Search customer by name or email' })}
                  value={customerQuery}
                  onChange={(e) => setCustomerQuery(e.target.value)}
                  className="h-9 border-0 shadow-sm"
                />
                {customerOptions.length > 0 && (
                  <div className="max-h-40 overflow-auto border border-border/50 rounded-lg shadow-sm">
                    {customerOptions.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setCustomerId(c.id)}
                        className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${customerId === c.id ? 'bg-muted font-medium' : ''}`}
                      >
                        {(c.firstName || c.lastName) ? `${c.firstName || ''} ${c.lastName || ''}`.trim() : (c.email || c.id)}
                        {c.company ? ` • ${c.company}` : ''}
                      </button>
                    ))}
                  </div>
                )}
                {customerId && (
                  <div className="text-xs text-muted-foreground p-2 rounded-lg bg-muted/30">
                    Selected: {customerOptions.find(x=>x.id===customerId)?.email || customerId}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dynamic Custom Fields */}
          {!!customFields && Array.isArray(customFields) && customFields.filter((f: any) => f.entity === 'deal' && f.isActive).length > 0 && (
            <>
              <Separator className="bg-border/50" />
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <div className="p-1.5 rounded-lg bg-cyan-50 dark:bg-cyan-950/50">
                    <FaDollarSign className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  {t('sections.customFields', { default: 'Additional fields' })}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {customFields
                    .filter((f: any) => f.entity === 'deal' && f.isActive)
                    .sort((a: any, b: any) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((field: any) => (
                      <div key={field.id} className="space-y-2">
                        <Label className="text-xs font-medium">{field.label}{field.required ? ' *' : ''}</Label>
                        {(['text', 'email', 'phone', 'url', 'number'] as string[]).includes(field.type) ? (
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
            className="h-9 text-xs bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 border-0 shadow-sm"
          >
            {loading ? (
              <>
                <FaSpinner className="mr-2 h-3.5 w-3.5 animate-spin" />
                {t('creating')}
              </>
            ) : (
              <>
                <FaBullseye className="mr-2 h-3.5 w-3.5" />
                {t('create')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


