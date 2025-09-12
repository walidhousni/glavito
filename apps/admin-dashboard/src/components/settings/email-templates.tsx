"use client";
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';

type WLApi = {
  templates: Array<{ id: string; name: string; subject?: string; content: string; updatedAt: string }>;
  deliveries: Array<{ id: string; to: string; subject: string; status: string; sentAt?: string; openedAt?: string; openCount: number; clickCount: number; createdAt: string }>;
  loadTemplates: (type?: string) => Promise<void>;
  upsertTemplate: (tpl: { type: string; name: string; subject?: string; content: string; variables?: Array<{ key: string }> }) => Promise<void>;
  previewTemplate: (content: string, variables: Record<string, unknown>) => Promise<{ content: string }>;
  testSendTemplate: (id: string, payload: { to: string; variables?: Record<string, unknown> }) => Promise<{ success: boolean }>;
  loadDeliveries: (params?: { take?: number; status?: string; q?: string }) => Promise<void>;
};

export function EmailTemplatesPanel() {
  const { templates, deliveries, loadTemplates, upsertTemplate, previewTemplate, testSendTemplate, loadDeliveries } = useWhiteLabel() as WLApi;
  const [name, setName] = useState('welcome_email');
  const [subject, setSubject] = useState('Welcome, {{firstName}}');
  const [content, setContent] = useState('<p>Hello {{firstName}}, welcome to {{company}}.</p>');
  const [varsText, setVarsText] = useState('firstName:John, company:Glavito');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);

  useEffect(() => {
    loadTemplates('email').catch((e) => console.warn('Failed to load templates', (e as Error)?.message));
    loadDeliveries({ take: 20, status: statusFilter || undefined, q: q || undefined }).catch(() => {});
  }, [loadTemplates, loadDeliveries, statusFilter, q]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(() => {
      loadDeliveries({ take: 20, status: statusFilter || undefined, q: q || undefined }).catch(() => {});
    }, 5000);
    return () => clearInterval(id);
  }, [autoRefresh, loadDeliveries, statusFilter, q]);

  const variables = useMemo(() => {
    const out: Record<string, string> = {};
    (varsText || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((pair) => {
      const idx = pair.indexOf(':');
      if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    });
    return out;
  }, [varsText]);

  const handleSave = async () => {
    await upsertTemplate({ type: 'email', name, subject, content, variables: Object.keys(variables).map((k) => ({ key: k })) });
  };

  const handlePreview = async () => {
    const res = await previewTemplate(content, variables);
    setPreview(res?.content || '');
  };

  const handleTestSend = async (id: string) => {
    if (!to) return;
    await testSendTemplate(id, { to, variables });
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-700/60">
      <CardHeader><CardTitle>Email Templates</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="template name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="recipient for test send" value={to} onChange={(e) => setTo(e.target.value)} />
          <Input placeholder="variables (k:v)" value={varsText} onChange={(e) => setVarsText(e.target.value)} />
        </div>
        <Input placeholder="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="font-mono" />
        <div className="flex gap-2">
          <Button onClick={handlePreview}>Preview</Button>
          <Button variant="secondary" onClick={handleSave}>Save</Button>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Preview</label>
          <div className="p-4 rounded border border-slate-200 dark:border-slate-700" dangerouslySetInnerHTML={{ __html: preview }} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Existing</label>
          <div className="grid gap-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="text-sm">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-slate-500 text-xs">{t.subject || '(no subject)'} • {new Date(t.updatedAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setName(t.name); setSubject(t.subject || ''); setContent(t.content); }}>Edit</Button>
                  <Button size="sm" variant="secondary" onClick={() => handleTestSend(t.id)}>Test Send</Button>
                </div>
              </div>
            ))}
            {templates.length === 0 && <div className="text-sm text-slate-500">No email templates yet.</div>}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Recent test deliveries</label>
          <div className="flex gap-2 items-center">
            <Input placeholder="Filter status (sent/opened/clicked/failed/bounced)" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} />
            <Input placeholder="Search to/subject" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="sm" variant="outline" onClick={() => loadDeliveries({ take: 20, status: statusFilter || undefined, q: q || undefined })}>Apply</Button>
            <Button size="sm" variant={autoRefresh ? 'default' : 'outline'} onClick={() => setAutoRefresh((v) => !v)}>{autoRefresh ? 'Auto refresh: ON' : 'Auto refresh: OFF'}</Button>
          </div>
          <div className="grid gap-2">
            {deliveries?.length ? deliveries.map((d) => (
              <div key={d.id} className="p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="text-sm font-medium truncate">{d.subject}</div>
                <div className="text-xs text-slate-500 truncate">to {d.to} • {d.status} • opens {d.openCount} • clicks {d.clickCount}</div>
              </div>
            )) : <div className="text-sm text-slate-500">No deliveries yet.</div>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


