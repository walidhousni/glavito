"use client";
import { useEffect, useMemo, useState } from 'react';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';

export function WhiteLabelTemplatesPanel() {
  const { templates, loadTemplates, upsertTemplate, deleteTemplate, previewTemplate, loading } = useWhiteLabel();
  const [typeFilter, setTypeFilter] = useState<string>('email');
  const [name, setName] = useState('welcome_email');
  const [content, setContent] = useState('<h1>Hi {{firstName}}</h1>');
  const [varsText, setVarsText] = useState('firstName:John');
  const [preview, setPreview] = useState<string>('');

  useEffect(() => {
    loadTemplates(typeFilter).catch(() => {});
  }, [typeFilter, loadTemplates]);

  const variables = useMemo(() => {
    const out: Record<string, string> = {};
    (varsText || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((pair) => {
      const idx = pair.indexOf(':');
      if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    });
    return out;
  }, [varsText]);

  const handlePreview = async () => {
    const res = await previewTemplate(content, variables);
    setPreview(res.content);
  };

  const handleSave = async () => {
    await upsertTemplate({ type: typeFilter, name, content, variables: Object.keys(variables).map((k) => ({ key: k })) });
    await handlePreview();
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-700/60">
      <CardHeader>
        <CardTitle>Templates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">Type</label>
            <Input value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} placeholder="email | portal_page | ..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="welcome_email" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Variables (k:v, comma separated)</label>
            <Input value={varsText} onChange={(e) => setVarsText(e.target.value)} placeholder="firstName:John, company:ACME" />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Content</label>
          <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={8} className="font-mono" />
        </div>

        <div className="flex gap-2">
          <Button onClick={handlePreview} disabled={loading}>Preview</Button>
          <Button onClick={handleSave} variant="secondary" disabled={loading}>Save</Button>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Preview</label>
          <div className="p-4 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900" dangerouslySetInnerHTML={{ __html: preview }} />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Existing</label>
          <div className="grid gap-2">
            {templates.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-slate-200 dark:border-slate-700">
                <div className="text-sm">
                  <div className="font-medium">{t.type} / {t.name}</div>
                  <div className="text-slate-500 text-xs">v{t.version} • {new Date(t.updatedAt).toLocaleString()}</div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { setName(t.name); setContent(t.content); setTypeFilter(t.type); }}>Edit</Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteTemplate(t.id)}>Delete</Button>
                </div>
              </div>
            ))}
            {templates.length === 0 && <div className="text-sm text-slate-500">No templates yet.</div>}
          </div>
        </div>
      </CardContent>
      <CardFooter className="justify-end text-xs text-slate-500">
        Handlebars rendering is used when available, with fallback replacement.
      </CardFooter>
    </Card>
  );
}


