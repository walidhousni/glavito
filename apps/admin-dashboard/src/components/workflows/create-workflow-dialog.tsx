'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { workflowsApi } from '@/lib/api/workflows-client';

type TemplateInfo = {
  slug: string;
  name: string;
  description?: string;
  category?: string;
  tags?: string[];
  nodeCount?: number;
  triggerTypes?: string[];
};

interface CreateWorkflowDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (workflowId: string) => void;
}

export function CreateWorkflowDialog({ open, onOpenChange, onCreated }: CreateWorkflowDialogProps) {
  const t = useTranslations('workflows');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [templateSearch, setTemplateSearch] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  type RawTemplate = Record<string, unknown>;
  const getString = React.useCallback((o: RawTemplate, key: string): string | undefined => {
    const v = o[key];
    return typeof v === 'string' ? v : undefined;
  }, []);
  const getStringArray = React.useCallback((o: RawTemplate, key: string): string[] | undefined => {
    const v = o[key];
    return Array.isArray(v) ? (v.filter((x) => typeof x === 'string') as string[]) : undefined;
  }, []);
  const getNumber = React.useCallback((o: RawTemplate, key: string): number | undefined => {
    const v = o[key];
    return typeof v === 'number' ? v : undefined;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadTemplates() {
      try {
        setError(null);
        const res = await workflowsApi.getTemplates();
        const listData = (res as any)?.data ?? res;
        const arr: RawTemplate[] = Array.isArray(listData) ? (listData as RawTemplate[]) : [];
        // Normalize: ensure slug exists
        const normalized: TemplateInfo[] = arr.map((t: RawTemplate): TemplateInfo => ({
          slug: String(getString(t, 'slug') || (getString(t, 'name') || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-*|-*$/g, '')),
          name: String(getString(t, 'name') || getString(t, 'slug') || 'template'),
          description: getString(t, 'description'),
          category: getString(t, 'category'),
          tags: getStringArray(t, 'tags') || [],
          nodeCount: getNumber(t, 'nodeCount') ?? 0,
          triggerTypes: getStringArray(t, 'triggerTypes') || [],
        }))
        if (!cancelled) setTemplates(normalized);
      } catch {
        if (!cancelled) setTemplates([
          { slug: 'intelligent-ticket-routing', name: 'Intelligent Ticket Routing', description: 'Auto-route tickets based on AI', category: 'routing', tags: ['ai','routing'], nodeCount: 5, triggerTypes: ['event'] },
          { slug: 'sla-monitoring', name: 'SLA Monitoring & Escalation', description: 'Monitor SLAs and escalate', category: 'sla', tags: ['sla','escalation'], nodeCount: 4, triggerTypes: ['event'] },
          { slug: 'customer-onboarding', name: 'Customer Onboarding', description: 'Automated onboarding sequence', category: 'onboarding', tags: ['automation'], nodeCount: 4, triggerTypes: ['event'] },
          { slug: 'ultimate-chatbot', name: 'Ultimate Multichannel Chatbot', description: 'AI-driven multi-channel chatbot', category: 'chatbot', tags: ['whatsapp','instagram','email','ai'], nodeCount: 10, triggerTypes: ['event'] },
        ]);
      }
    }
    if (open) {
      setSelectedTemplate('');
      setTemplateSearch('');
      setName('');
      setDescription('');
      setCategory('general');
      void loadTemplates();
    }
    return () => { cancelled = true; };
  }, [open, getNumber, getString, getStringArray]);

  const filteredTemplates = useMemo<TemplateInfo[]>(() => {
    const base = Array.isArray(templates) ? templates : [];
    const q = templateSearch.trim().toLowerCase();
    if (!q) return base;
    return base.filter((tpl) =>
      (tpl.name || '').toLowerCase().includes(q) ||
      (tpl.description || '').toLowerCase().includes(q) ||
      (tpl.category || '').toLowerCase().includes(q) ||
      (tpl.tags || []).some((x) => (x || '').toLowerCase().includes(q))
    );
  }, [templateSearch, templates]);

  const handleCreate = async () => {
    if (loading) return;
    setLoading(true);
    try {
      setError(null);
      if (selectedTemplate && selectedTemplate !== 'list') {
        // selectedTemplate now contains the slug
        const res = await workflowsApi.createFromTemplate(selectedTemplate, { metadata: { category } });
        const wf = (res as any)?.data ?? res;
        const id = (wf as any)?.id;
        if (id) {
          onCreated(String(id));
          onOpenChange(false);
        } else {
          setError('Failed to create from template');
        }
      } else {
        if (!name.trim()) {
          setError('Name is required');
          return;
        }
        const payload = {
          name: name || 'New Workflow',
          description: description || '',
          type: 'n8n',
          priority: 0,
          isActive: true,
          triggers: [],
          nodes: [],
          connections: [],
          metadata: { category, tags: [], version: '1.0' },
        } as any;
        const res = await workflowsApi.create(payload);
        const r = res as unknown as { success?: boolean; data?: { id?: string } } | { id?: string };
        const wf = (r as { success?: boolean; data?: { id?: string } } | { id?: string }) as any;
        const id = (wf?.data?.id ?? wf?.id) as string | undefined;
        if (id) {
          onCreated(String(id));
          onOpenChange(false);
        } else {
          setError('Failed to create workflow');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-xl">{t('createDialog.title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {error && (
            <div className="text-sm text-red-600 border border-red-200 bg-red-50 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {/* Templates section */}
          <div className="space-y-3">
            <Label>{t('createDialog.chooseTemplate')}</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Input
                  placeholder={t('createDialog.searchPlaceholder')}
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                />
              </div>
              <div>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('createDialog.templatePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="list">{t('list.all')}</SelectItem>
                    {filteredTemplates.map((tpl: TemplateInfo) => (
                      <SelectItem key={tpl.slug || tpl.name} value={tpl.slug || tpl.name}>{tpl.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {filteredTemplates.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-auto">
                {filteredTemplates.map((tpl: TemplateInfo) => (
                  <button
                    key={tpl.slug}
                    type="button"
                    onClick={() => setSelectedTemplate(tpl.slug)}
                    className={`template-card text-left ${selectedTemplate === tpl.slug ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="font-semibold line-clamp-1">{tpl.name}</div>
                      {tpl.category && (
                        <span className="chip chip-primary text-[10px]">{tpl.category}</span>
                      )}
                    </div>
                    {tpl.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{tpl.description}</div>
                    )}
                    {!!(tpl.tags && tpl.tags.length) && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(tpl.tags || []).slice(0, 4).map((tag) => (
                          <span key={tag} className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full">{tag}</span>
                        ))}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
            {filteredTemplates.length === 0 && (
              <div className="text-sm text-muted-foreground">{t('createDialog.none')}</div>
            )}
          </div>

          {/* Manual section */}
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <Label>{t('createDialog.nameLabel')}</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div>
                <Label>{t('createDialog.categoryLabel')}</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">general</SelectItem>
                    <SelectItem value="routing">routing</SelectItem>
                    <SelectItem value="escalation">escalation</SelectItem>
                    <SelectItem value="automation">automation</SelectItem>
                    <SelectItem value="sla">SLA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>{t('createDialog.descriptionLabel')}</Label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t('createDialog.cancel')}
          </Button>
          <Button className="btn-gradient" onClick={handleCreate} disabled={loading || (!selectedTemplate && !name.trim())}>
            {loading ? t('createDialog.creating') : t('createDialog.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


