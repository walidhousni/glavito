"use client";
import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useWhiteLabel } from '@/lib/hooks/use-white-label';
import { whiteLabelApi } from '@/lib/api/white-label-client';

type WL = {
  smtp: { host: string; port: number; user: string; from?: string; secure?: boolean } | null;
  loadSmtp: () => Promise<void>;
  saveSmtp: (payload: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) => Promise<void>;
  testSmtp: (payload: { host: string; port: number; user: string; pass?: string; from?: string; secure?: boolean }) => Promise<{ ok: boolean; error?: string }>;
};

export function EmailSmtpPanel() {
  const { smtp, loadSmtp, saveSmtp, testSmtp } = useWhiteLabel() as WL;
  const [form, setForm] = useState<{ host: string; port: number | string; user: string; pass?: string; from?: string; secure?: boolean }>({ host: '', port: 587, user: '', pass: '', from: '', secure: false });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<string>('');
  const [domainInput, setDomainInput] = useState<string>('');
  const [dnsGuidance, setDnsGuidance] = useState<{ domain: string; provider: string; records: Array<{ type: 'TXT' | 'CNAME'; name: string; value: string; ttl: number; purpose: string }> } | null>(null);
  const [dnsValidation, setDnsValidation] = useState<{ passed: boolean; checks: any } | null>(null);

  useEffect(() => {
    loadSmtp().catch((err) => console.warn('loadSmtp failed', (err as Error)?.message));
  }, [loadSmtp]);

  useEffect(() => {
    if (smtp) setForm((f) => ({ ...f, ...smtp }));
  }, [smtp]);

  const handleChange = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const handleTest = async () => {
    setTesting(true);
    setTestResult('');
    try {
      const res = await testSmtp({ ...form, port: Number(form.port || 0) });
      setTestResult(res.ok ? 'OK' : `Error: ${res.error || 'unknown'}`);
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveSmtp({ ...form, port: Number(form.port || 0) });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadGuidance = async () => {
    if (!domainInput) return;
    try {
      const data = await whiteLabelApi.getEmailDnsGuidance(domainInput);
      setDnsGuidance(data);
    } catch (e: any) {
      setDnsGuidance(null);
    }
  };

  const handleValidateDns = async () => {
    if (!domainInput) return;
    try {
      const data = await whiteLabelApi.validateEmailDns(domainInput);
      setDnsValidation({ passed: !!data?.passed, checks: data?.checks || {} });
    } catch (e: any) {
      setDnsValidation({ passed: false, checks: { error: e?.message || 'Validation failed' } });
    }
  };

  return (
    <Card className="border-slate-200/60 dark:border-slate-700/60">
      <CardHeader><CardTitle>SMTP Settings</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Host</label>
          <Input value={form.host} onChange={(e) => handleChange('host', e.target.value)} placeholder="smtp-relay.brevo.com" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Port</label>
          <Input type="number" value={form.port} onChange={(e) => handleChange('port', e.target.value)} placeholder="587" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Username</label>
          <Input value={form.user} onChange={(e) => handleChange('user', e.target.value)} placeholder="apikey" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Password / API Key</label>
          <Input type="password" value={form.pass || ''} onChange={(e) => handleChange('pass', e.target.value)} placeholder="••••••••" />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">From</label>
          <Input value={form.from || ''} onChange={(e) => handleChange('from', e.target.value)} placeholder="Glavito <noreply@yourdomain.com>" />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <Switch checked={!!form.secure} onCheckedChange={(c) => handleChange('secure', c)} />
          <span className="text-sm">Secure (SSL/TLS)</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 items-start">
        <Button variant="outline" onClick={handleTest} disabled={testing}>{testing ? 'Testing…' : 'Test'}</Button>
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
        {testResult && <span className="text-xs text-slate-500">{testResult}</span>}

        <div className="w-full border-t pt-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your sending domain</label>
              <Input placeholder="yourdomain.com" value={domainInput} onChange={(e) => setDomainInput(e.target.value)} />
            </div>
            <Button variant="secondary" onClick={handleLoadGuidance}>Get DKIM/SPF/DMARC Records</Button>
            <Button variant="outline" onClick={handleValidateDns}>Validate DNS</Button>
          </div>
          {dnsGuidance && (
            <div className="mt-3 text-xs">
              <div className="font-medium mb-1">Add these DNS records ({dnsGuidance.provider}):</div>
              <div className="overflow-auto">
                <table className="w-full text-left border border-slate-200 dark:border-slate-700">
                  <thead className="bg-slate-50 dark:bg-slate-800">
                    <tr>
                      <th className="p-2">Type</th>
                      <th className="p-2">Name</th>
                      <th className="p-2">Value</th>
                      <th className="p-2">TTL</th>
                      <th className="p-2">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dnsGuidance.records.map((r, idx) => (
                      <tr key={idx} className="border-t border-slate-200 dark:border-slate-700">
                        <td className="p-2">{r.type}</td>
                        <td className="p-2">{r.name}</td>
                        <td className="p-2 font-mono break-all">{r.value}</td>
                        <td className="p-2">{r.ttl}</td>
                        <td className="p-2">{r.purpose}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {dnsValidation && (
            <div className="mt-3 text-xs">
              <div className="font-medium">Validation: {dnsValidation.passed ? 'All checks passed' : 'Missing/incorrect records'}</div>
              <pre className="mt-2 p-2 rounded bg-slate-50 dark:bg-slate-900 overflow-auto max-h-48">{JSON.stringify(dnsValidation.checks, null, 2)}</pre>
            </div>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}


