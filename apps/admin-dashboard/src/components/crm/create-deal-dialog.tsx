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
import { DollarSign, Target, Briefcase, Loader2 } from 'lucide-react';

const STAGES = ['NEW','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'] as const;

interface CreateDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface FormErrors {
  name?: string;
  value?: string;
  pipelineId?: string;
}

export function CreateDealDialog({ open, onOpenChange }: CreateDealDialogProps) {
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

  useEffect(() => {
    if (open) void fetchCustomFields('deal');
  }, [open, fetchCustomFields]);

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
      if (!pipelineId && pipelines?.[0]?.id) {
        setPipelineId(pipelines[0].id);
      }
    }
  }, [open, pipelines, pipelineId]);

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600">
              <Target className="h-6 w-6 text-white" />
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
          {/* Deal Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Briefcase className="h-4 w-4" />
              {t('sections.dealInfo')}
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  {t('fields.name')} <span className="text-red-500">*</span>
                </Label>
                <Input 
                  id="name" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  placeholder={t('placeholders.name')} 
                  className={`transition-colors ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  {t('fields.description')}
                </Label>
                <Textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder={t('placeholders.description')} 
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Financial Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <DollarSign className="h-4 w-4" />
              {t('sections.financialInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="value" className="text-sm font-medium">
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
                  className={`transition-colors ${errors.value ? 'border-red-500 focus:border-red-500' : ''}`}
                />
                {errors.value && <p className="text-xs text-red-500">{errors.value}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-sm font-medium">
                  {t('fields.currency')}
                </Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.currency')} />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((curr) => (
                      <SelectItem key={curr.value} value={curr.value}>
                        {curr.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Pipeline & Stage */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
              <Target className="h-4 w-4" />
              {t('sections.pipelineInfo')}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('fields.pipeline')} <span className="text-red-500">*</span>
                </Label>
                <Select value={pipelineId} onValueChange={setPipelineId}>
                  <SelectTrigger className={`transition-colors ${errors.pipelineId ? 'border-red-500 focus:border-red-500' : ''}`}>
                    <SelectValue placeholder={t('placeholders.pipeline')} />
                  </SelectTrigger>
                  <SelectContent>
                    {pipelines.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.pipelineId && <p className="text-xs text-red-500">{errors.pipelineId}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  {t('fields.stage')}
                </Label>
                <Select value={stage} onValueChange={(v) => setStage(v as typeof STAGES[number])}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('placeholders.stage')} />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{tStages(s.toLowerCase())}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Dynamic Custom Fields */}
          {!!customFields && Array.isArray(customFields) && customFields.filter((f: any) => f.entity === 'deal' && f.isActive).length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                <DollarSign className="h-4 w-4" />
                {t('sections.customFields', { default: 'Additional fields' })}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {customFields
                  .filter((f: any) => f.entity === 'deal' && f.isActive)
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
            className="flex-1 sm:flex-none bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
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


