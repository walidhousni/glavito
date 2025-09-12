"use client";
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';

// Minimal drag-drop builder: simple blocks list with reordering
type Block = { id: string; type: 'text' | 'image' | 'button'; content?: string; url?: string; label?: string };

function wrapForClient(bodyHtml: string, client: 'gmail' | 'outlook' | 'apple'): string {
  const baseReset = `
    <style>
      html, body { margin:0; padding:0; background:#ffffff; }
      img { border:0; outline:none; text-decoration:none; display:block; max-width:100%; height:auto; }
      table { border-collapse:collapse; border-spacing:0; mso-table-lspace:0pt; mso-table-rspace:0pt; }
      a { text-decoration:none; color:inherit; }
    </style>
  `;
  if (client === 'gmail') {
    return `
      ${baseReset}
      <style>
        body, table, td, a { -ms-text-size-adjust:100%; -webkit-text-size-adjust:100%; font-family:Arial, Helvetica, sans-serif; }
        .gmail-container { max-width:600px; margin:0 auto; padding:16px; }
      </style>
      <div class="gmail-container">${bodyHtml}</div>
    `;
  }
  if (client === 'outlook') {
    return `
      ${baseReset}
      <!--[if mso]>
      <style type="text/css">
        body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
        .outlook-container { width:600px !important; }
      </style>
      <![endif]-->
      <div class="outlook-container" style="max-width:600px;margin:0 auto;padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="padding:16px;">${bodyHtml}</td>
          </tr>
        </table>
      </div>
    `;
  }
  // apple mail
  return `
    ${baseReset}
    <style>
      body { -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
      a[x-apple-data-detectors] { color:inherit !important; text-decoration:none !important; }
      .apple-container { max-width:600px; margin:0 auto; padding:16px; }
    </style>
    <div class="apple-container">${bodyHtml}</div>
  `;
}

export function EmailBuilderPanel() {
  const { upsertTemplate, previewTemplate } = useWhiteLabel() as any;
  const [name, setName] = useState('builder_email');
  const [subject, setSubject] = useState('Hello {{firstName}}');
  const [blocks, setBlocks] = useState<Block[]>([
    { id: 'h', type: 'text', content: '<h1>Welcome {{firstName}}</h1>' },
    { id: 'p', type: 'text', content: '<p>Thanks for joining {{company}}</p>' },
    { id: 'btn', type: 'button', label: 'Get Started', url: 'https://example.com' },
  ]);
  const [varsText, setVarsText] = useState('firstName:John, company:Glavito');
  const [html, setHtml] = useState('');

  const variables = useMemo(() => {
    const out: Record<string, string> = {};
    (varsText || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((pair) => {
      const idx = pair.indexOf(':');
      if (idx > 0) out[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
    });
    return out;
  }, [varsText]);

  const addBlock = (type: Block['type']) => {
    const id = Math.random().toString(36).slice(2);
    if (type === 'text') setBlocks((b) => [...b, { id, type, content: '<p>New text</p>' }]);
    if (type === 'image') setBlocks((b) => [...b, { id, type, url: 'https://via.placeholder.com/600x200' }]);
    if (type === 'button') setBlocks((b) => [...b, { id, type, label: 'Click', url: '#' }]);
  };

  const move = (idx: number, dir: -1 | 1) => {
    setBlocks((b) => {
      const next = b.slice();
      const j = idx + dir;
      if (j < 0 || j >= next.length) return next;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
  };

  const toHtml = () => {
    return blocks
      .map((b) => {
        if (b.type === 'text') return b.content || '';
        if (b.type === 'image') return `<img src="${b.url || ''}" alt="" style="max-width:100%"/>`;
        if (b.type === 'button') return `<div style="text-align:center;margin:16px 0"><a href="${b.url || '#'}" style="background:#2563EB;color:#fff;padding:12px 20px;border-radius:6px;text-decoration:none;display:inline-block">${b.label || 'Button'}</a></div>`;
        return '';
      })
      .join('\n');
  };

  const handlePreview = async () => {
    const content = toHtml();
    const res = await previewTemplate(content, variables);
    setHtml(res?.content || content);
  };

  const handleSave = async () => {
    const content = toHtml();
    await upsertTemplate({ type: 'email', name, subject, content, variables: Object.keys(variables).map((k) => ({ key: k })) });
    await handlePreview();
  };

  useEffect(() => {
    setHtml(toHtml());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gmailPreview = useMemo(() => wrapForClient(html, 'gmail'), [html]);
  const outlookPreview = useMemo(() => wrapForClient(html, 'outlook'), [html]);
  const applePreview = useMemo(() => wrapForClient(html, 'apple'), [html]);

  return (
    <Card className="border-slate-200/60 dark:border-slate-700/60">
      <CardHeader><CardTitle>Email Builder (lite)</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="template name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input placeholder="subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Input placeholder="variables (k:v)" value={varsText} onChange={(e) => setVarsText(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <Button onClick={() => addBlock('text')}>Add Text</Button>
          <Button onClick={() => addBlock('image')} variant="outline">Add Image</Button>
          <Button onClick={() => addBlock('button')} variant="secondary">Add Button</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            {blocks.map((b, idx) => (
              <div key={b.id} className="p-3 border rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{b.type}</div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => move(idx, -1)}>↑</Button>
                    <Button size="sm" variant="outline" onClick={() => move(idx, 1)}>↓</Button>
                  </div>
                </div>
                {b.type === 'text' && (
                  <Textarea rows={4} value={b.content || ''} onChange={(e) => setBlocks((arr) => arr.map((x) => x.id === b.id ? { ...x, content: e.target.value } : x))} />
                )}
                {b.type === 'image' && (
                  <Input value={b.url || ''} onChange={(e) => setBlocks((arr) => arr.map((x) => x.id === b.id ? { ...x, url: e.target.value } : x))} placeholder="https://..." />
                )}
                {b.type === 'button' && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={b.label || ''} onChange={(e) => setBlocks((arr) => arr.map((x) => x.id === b.id ? { ...x, label: e.target.value } : x))} placeholder="Label" />
                    <Input value={b.url || ''} onChange={(e) => setBlocks((arr) => arr.map((x) => x.id === b.id ? { ...x, url: e.target.value } : x))} placeholder="https://..." />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div>
            <div className="p-4 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 mb-3" dangerouslySetInnerHTML={{ __html: html }} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-medium mb-1 text-slate-600">Gmail</div>
                <div className="rounded border border-slate-200 dark:border-slate-700" dangerouslySetInnerHTML={{ __html: gmailPreview }} />
              </div>
              <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-medium mb-1 text-slate-600">Outlook</div>
                <div className="rounded border border-slate-200 dark:border-slate-700" dangerouslySetInnerHTML={{ __html: outlookPreview }} />
              </div>
              <div className="p-2 rounded border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-medium mb-1 text-slate-600">Apple Mail</div>
                <div className="rounded border border-slate-200 dark:border-slate-700" dangerouslySetInnerHTML={{ __html: applePreview }} />
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={handlePreview}>Preview</Button>
        <Button variant="secondary" onClick={handleSave}>Save</Button>
      </CardFooter>
    </Card>
  );
}


