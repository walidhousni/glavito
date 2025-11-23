'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { marketingApi } from '@/lib/api/marketing-client';
import { Switch } from '@/components/ui/switch';

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  segmentId: string;
  segmentName?: string;
}

export function CampaignDialog({ open, onOpenChange, segmentId, segmentName }: CampaignDialogProps) {
  const t = useTranslations('crm.campaignDialog');
  const [name, setName] = React.useState<string>('');
  const [type, setType] = React.useState<'EMAIL' | 'SMS' | 'SOCIAL' | 'WEBINAR' | 'CONTENT' | 'PAID_ADS'>('EMAIL');
  const [templateId, setTemplateId] = React.useState<string>('');
  const [subject, setSubject] = React.useState<string>('');
  const [description, setDescription] = React.useState<string>('');
  const [scheduleAt, setScheduleAt] = React.useState<string>('');
  const [templates, setTemplates] = useState<Array<{ id: string; name: string; content?: string; subject?: string; variables?: string[] }>>([]);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [loading, setLoading] = React.useState(false);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [attachCheckout, setAttachCheckout] = useState<boolean>(false);
  const [checkoutAmount, setCheckoutAmount] = useState<string>('1999'); // cents
  const [checkoutCurrency, setCheckoutCurrency] = useState<string>('usd');

  useEffect(() => {
    if (open) {
      setName(segmentName ? `${segmentName} – ${t('campaign')}` : t('newCampaign'));
      setType('EMAIL');
      setTemplateId('');
      setSubject('');
      setDescription('');
      setScheduleAt('');
      setPreviewHtml('');
      setLoading(false);
      setTemplates([]);
    }
  }, [open, segmentName, t]);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (type) {
        setTemplateLoading(true);
        try {
          const fetched = await marketingApi.listTemplates(type);
          setTemplates(fetched);
        } catch (error) {
          console.error('Failed to fetch templates:', error);
        } finally {
          setTemplateLoading(false);
        }
      }
    };
    fetchTemplates();
  }, [type]);

  const loadTemplate = async (id: string) => {
    setTemplateLoading(true);
    try {
      // Assume API has getTemplate, or find in templates
      const template = templates.find(t => t.id === id);
      if (template) {
        setSubject(template.subject || '');
        setDescription(template.content || '');
      }
    } catch (error) {
      console.error('Failed to load template:', error);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handlePreview = async () => {
    if (!description) return;
    setPreviewLoading(true);
    try {
      const vars = { firstName: 'John', lastName: 'Doe', company: 'Test Company', email: 'john@example.com' };
      const rendered = await marketingApi.preview(description, vars);
      setPreviewHtml(rendered);
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getErrors = () => {
    const errors: string[] = [];
    if (!name.trim()) errors.push(t('errors.nameRequired') || 'Name is required');
    if (type === 'EMAIL' && !subject.trim()) errors.push(t('errors.subjectRequired') || 'Subject is required for email');
    if (type === 'SMS' && description.length > 1600) errors.push(t('errors.smsTooLong') || 'SMS body too long (max 1600 chars)');
    return errors;
  };

  const errors = getErrors();
  const hasErrors = errors.length > 0;

  async function createDraft() {
    if (hasErrors) return;
    setLoading(true);
    try {
      await marketingApi.create({ 
        name, 
        type, 
        subject: subject || undefined, 
        description: description || undefined, 
        templateId: templateId || undefined, 
        segmentId: segmentId || undefined, // Fix: empty string -> undefined
        content: {
          checkout: attachCheckout ? { amount: Number(checkoutAmount) || 0, currency: checkoutCurrency } : undefined,
        },
        status: 'DRAFT' 
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  async function launchNow() {
    if (hasErrors) return;
    setLoading(true);
    try {
      const created = await marketingApi.create({ 
        name, 
        type, 
        subject: subject || undefined, 
        description: description || undefined, 
        templateId: templateId || undefined, 
        segmentId: segmentId || undefined, // Fix: empty string -> undefined
        content: {
          checkout: attachCheckout ? { amount: Number(checkoutAmount) || 0, currency: checkoutCurrency } : undefined,
        },
        status: 'SCHEDULED' 
      });
      if (scheduleAt) {
        await marketingApi.schedule(created.id, scheduleAt);
      } else {
        await marketingApi.launch(created.id);
      }
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          {hasErrors && (
            <Alert variant="destructive">
              <AlertDescription>{errors.join('; ')}</AlertDescription>
            </Alert>
          )}
          <div className="space-y-2">
            <Label htmlFor="campaign-name" className="text-sm font-medium">
              {t('fields.name')} <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="campaign-name"
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder={t('placeholders.name')} 
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-type" className="text-sm font-medium">{t('fields.type')}</Label>
              <Select value={type} onValueChange={(v) => { setType(v as typeof type); setTemplateId(''); }}>
                <SelectTrigger id="campaign-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EMAIL">📧 {t('types.email')}</SelectItem>
                  <SelectItem value="SMS">📱 {t('types.sms')}</SelectItem>
                  <SelectItem value="SOCIAL">📱 {t('types.social')}</SelectItem>
                  <SelectItem value="WEBINAR">🎥 {t('types.webinar')}</SelectItem>
                  <SelectItem value="CONTENT">📝 {t('types.content')}</SelectItem>
                  <SelectItem value="PAID_ADS">💰 {t('types.paidAds')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="schedule-at" className="text-sm font-medium">{t('fields.schedule')}</Label>
              <Input 
                id="schedule-at"
                type="datetime-local" 
                value={scheduleAt} 
                onChange={(e) => setScheduleAt(e.target.value)} 
              />
            </div>
          </div>

          {type === 'EMAIL' && (
            <div className="space-y-2">
              <Label htmlFor="email-subject" className="text-sm font-medium">{t('fields.subject')}</Label>
              <Input 
                id="email-subject"
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                placeholder={t('placeholders.subject')} 
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="campaign-description" className="text-sm font-medium">{t('fields.description')}</Label>
            <Textarea 
              id="campaign-description"
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder={t('placeholders.description')}
              rows={3}
            />
          </div>

          {templates.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">{t('fields.template') || 'Template'}</Label>
              <Select value={templateId} onValueChange={(v) => { setTemplateId(v); loadTemplate(v); }}>
                <SelectTrigger>
                  <SelectValue placeholder={templateLoading ? 'Loading...' : 'Select template'} />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((tpl) => (
                    <SelectItem key={tpl.id} value={tpl.id}>
                      {tpl.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {type === 'EMAIL' && description && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium">Preview</Label>
                <Button type="button" size="sm" onClick={handlePreview} disabled={previewLoading}>
                  {previewLoading ? 'Loading...' : 'Generate Preview'}
                </Button>
              </div>
              {previewHtml && (
                <div className="p-4 border rounded-md bg-muted/50 max-h-40 overflow-auto" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              )}
            </div>
          )}

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Attach checkout link</Label>
                <p className="text-xs text-muted-foreground">Create a Stripe checkout URL per recipient.</p>
              </div>
              <Switch checked={attachCheckout} onCheckedChange={setAttachCheckout} />
            </div>
            {attachCheckout && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Amount (minor units)</Label>
                  <Input value={checkoutAmount} onChange={(e) => setCheckoutAmount(e.target.value)} placeholder="e.g. 1999" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Currency</Label>
                  <Input value={checkoutCurrency} onChange={(e) => setCheckoutCurrency(e.target.value)} placeholder="usd" />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
              {t('actions.cancel')}
            </Button>
            <Button variant="secondary" onClick={createDraft} disabled={loading || hasErrors}>
              {t('actions.saveDraft')}
            </Button>
            <Button onClick={launchNow} disabled={loading || hasErrors}>
              {scheduleAt ? t('actions.schedule') : t('actions.launchNow')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}



