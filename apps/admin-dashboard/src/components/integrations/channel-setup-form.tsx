'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { integrationsApi } from '@/lib/api/integrations';

type Props = {
  onComplete?: () => void;
};

export default function ChannelSetupForm({ onComplete }: Props) {
  const [channel, setChannel] = useState<'whatsapp'|'instagram'|'email'>('whatsapp');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string>('');

  const [wa, setWa] = useState({ businessAccountId: '', phoneNumberId: '', accessToken: '', verifyToken: '' });
  const [ig, setIg] = useState({ pageId: '', accessToken: '', appId: '', appSecret: '', verifyToken: '' });
  const [em, setEm] = useState({ provider: 'gmail', smtpHost: '', smtpPort: 587, smtpSecure: true, imapHost: '', imapPort: 993, username: '', password: '', fromEmail: '', fromName: '' });

  const submit = async () => {
    setLoading(true);
    setMsg('');
    try {
      let res: any;
      if (channel === 'whatsapp') res = await integrationsApi.setupWhatsApp(wa);
      if (channel === 'instagram') res = await integrationsApi.setupInstagram(ig);
      if (channel === 'email') res = await integrationsApi.setupEmail(em as any);
      setMsg(res?.message || 'Configured');
      onComplete?.();
    } catch (e: any) {
      setMsg(e?.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Setup</CardTitle>
        <CardDescription>Connect WhatsApp, Instagram, or Email to your tenant</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Channel</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channel === 'whatsapp' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Business Account ID</Label>
                <Input value={wa.businessAccountId} onChange={(e)=>setWa({...wa,businessAccountId:e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Phone Number ID</Label>
                <Input value={wa.phoneNumberId} onChange={(e)=>setWa({...wa,phoneNumberId:e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Access Token</Label>
                <Input type="password" value={wa.accessToken} onChange={(e)=>setWa({...wa,accessToken:e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Verify Token</Label>
                <Input value={wa.verifyToken} onChange={(e)=>setWa({...wa,verifyToken:e.target.value})} />
              </div>
            </div>
          )}

          {channel === 'instagram' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Page ID</Label><Input value={ig.pageId} onChange={(e)=>setIg({...ig,pageId:e.target.value})} /></div>
              <div className="space-y-1"><Label>Access Token</Label><Input type="password" value={ig.accessToken} onChange={(e)=>setIg({...ig,accessToken:e.target.value})} /></div>
              <div className="space-y-1"><Label>App ID</Label><Input value={ig.appId} onChange={(e)=>setIg({...ig,appId:e.target.value})} /></div>
              <div className="space-y-1"><Label>App Secret</Label><Input type="password" value={ig.appSecret} onChange={(e)=>setIg({...ig,appSecret:e.target.value})} /></div>
              <div className="space-y-1"><Label>Verify Token</Label><Input value={ig.verifyToken} onChange={(e)=>setIg({...ig,verifyToken:e.target.value})} /></div>
            </div>
          )}

          {channel === 'email' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>Provider</Label>
                <Select value={em.provider} onValueChange={(v)=>setEm({...em,provider:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">Gmail</SelectItem>
                    <SelectItem value="outlook">Outlook</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>SMTP Host</Label><Input value={em.smtpHost} onChange={(e)=>setEm({...em,smtpHost:e.target.value})} /></div>
              <div className="space-y-1"><Label>SMTP Port</Label><Input type="number" value={em.smtpPort} onChange={(e)=>setEm({...em,smtpPort:parseInt(e.target.value||'0')})} /></div>
              <div className="space-y-1"><Label>IMAP Host</Label><Input value={em.imapHost} onChange={(e)=>setEm({...em,imapHost:e.target.value})} /></div>
              <div className="space-y-1"><Label>IMAP Port</Label><Input type="number" value={em.imapPort} onChange={(e)=>setEm({...em,imapPort:parseInt(e.target.value||'0')})} /></div>
              <div className="space-y-1"><Label>Username</Label><Input value={em.username} onChange={(e)=>setEm({...em,username:e.target.value})} /></div>
              <div className="space-y-1"><Label>Password</Label><Input type="password" value={em.password} onChange={(e)=>setEm({...em,password:e.target.value})} /></div>
              <div className="space-y-1"><Label>From Email</Label><Input type="email" value={em.fromEmail} onChange={(e)=>setEm({...em,fromEmail:e.target.value})} /></div>
              <div className="space-y-1"><Label>From Name</Label><Input value={em.fromName} onChange={(e)=>setEm({...em,fromName:e.target.value})} /></div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button disabled={loading} onClick={submit}>{loading ? 'Saving...' : 'Save & Test'}</Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}


