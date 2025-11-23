"use client";
import { useEffect, useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { emailProvidersApi, type EmailProviderType, type TenantEmailProviderConfigDto } from '@/lib/api/email-providers-client';

export function EmailProvidersPanel() {
  const [list, setList] = useState<TenantEmailProviderConfigDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<{
    provider: EmailProviderType;
    isPrimary: boolean;
    fromName: string;
    fromEmail: string;
    replyToEmail?: string;
    dkimDomain?: string;
    trackingDomain?: string;
    ratePerSecond?: number | string;
    credentialsText: string;
  }>({
    provider: 'SMTP',
    isPrimary: true,
    fromName: '',
    fromEmail: '',
    replyToEmail: '',
    dkimDomain: '',
    trackingDomain: '',
    ratePerSecond: 5,
    credentialsText: '{\n  "host": "smtp.example.com",\n  "port": 587,\n  "secure": false,\n  "user": "",\n  "pass": ""\n}',
  });

  const parsedCredentials = useMemo(() => {
    try {
      return JSON.parse(form.credentialsText) as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [form.credentialsText]);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await emailProvidersApi.listMy();
      setList(rows);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!parsedCredentials) return;
    setCreating(true);
    try {
      await emailProvidersApi.createMy({
        provider: form.provider,
        isPrimary: !!form.isPrimary,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        replyToEmail: form.replyToEmail,
        dkimDomain: form.dkimDomain,
        trackingDomain: form.trackingDomain,
        ratePerSecond: Number(form.ratePerSecond || 5),
        credentials: parsedCredentials,
      } as any);
      await load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-700/60">
      <CardHeader>
        <CardTitle>Email Providers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v as EmailProviderType }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SMTP">SMTP</SelectItem>
                <SelectItem value="SES">AWS SES</SelectItem>
                <SelectItem value="SENDGRID">SendGrid</SelectItem>
                <SelectItem value="ALIYUN_DM">Alibaba DirectMail</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2 pt-6">
            <Switch checked={!!form.isPrimary} onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v }))} />
            <span className="text-sm">Primary</span>
          </div>
          <div className="space-y-2">
            <Label>From name</Label>
            <Input value={form.fromName} onChange={(e) => setForm((f) => ({ ...f, fromName: e.target.value }))} placeholder="Company Inc." />
          </div>
          <div className="space-y-2">
            <Label>From email</Label>
            <Input value={form.fromEmail} onChange={(e) => setForm((f) => ({ ...f, fromEmail: e.target.value }))} placeholder="noreply@yourdomain.com" />
          </div>
          <div className="space-y-2">
            <Label>Reply-to email</Label>
            <Input value={form.replyToEmail || ''} onChange={(e) => setForm((f) => ({ ...f, replyToEmail: e.target.value }))} placeholder="support@yourdomain.com" />
          </div>
          <div className="space-y-2">
            <Label>Rate per second</Label>
            <Input type="number" value={form.ratePerSecond} onChange={(e) => setForm((f) => ({ ...f, ratePerSecond: e.target.value }))} placeholder="5" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Credentials (JSON)</Label>
            <textarea className="w-full h-40 rounded border border-slate-200 dark:border-slate-700 bg-transparent p-2 font-mono text-sm" value={form.credentialsText} onChange={(e) => setForm((f) => ({ ...f, credentialsText: e.target.value }))} />
            {!parsedCredentials && <div className="text-xs text-red-500">Invalid JSON</div>}
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex items-center gap-3">
        <Button onClick={handleCreate} disabled={creating || !parsedCredentials}>{creating ? 'Saving…' : 'Add provider'}</Button>
      </CardFooter>

      <CardContent className="border-t pt-4">
        <div className="text-sm font-medium mb-2">Existing providers</div>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : (
          <div className="space-y-2">
            {list.map((p) => (
              <div key={p.id} className="p-3 border rounded flex items-center justify-between">
                <div>
                  <div className="font-medium">{p.provider} {p.isPrimary ? <span className="text-xs text-green-600 ml-1">(primary)</span> : null}</div>
                  <div className="text-xs text-muted-foreground">{p.fromName} &lt;{p.fromEmail}&gt;</div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => emailProvidersApi.verifyDomainMy(p.id).catch(() => {})}>Verify domain</Button>
                  <Button variant="outline" onClick={() => emailProvidersApi.updateMy(p.id, { isPrimary: true }).then(load)}>Make primary</Button>
                  <Button variant="destructive" onClick={() => emailProvidersApi.deleteMy(p.id).then(load)}>Delete</Button>
                </div>
              </div>
            ))}
            {list.length === 0 && <div className="text-sm text-muted-foreground">No providers yet.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


