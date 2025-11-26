'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { integrationsApi } from '@/lib/api/integrations';

type Props = {
  onComplete?: () => void;
  defaultChannel?: 'whatsapp'|'instagram'|'email';
};

export default function ChannelSetupForm({ onComplete, defaultChannel }: Props) {
  const t = useTranslations('integrations.dialogs.channelSetup');
  const [channel, setChannel] = useState<'whatsapp'|'instagram'|'email'>(defaultChannel || 'whatsapp');
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
      setMsg(res?.message || t('messages.configured'));
      onComplete?.();
    } catch (e: any) {
      setMsg(e?.message || t('messages.failed'));
    } finally {
      setLoading(false);
    }
  };

  // Keep selected channel in sync with provided default
  // Useful when the modal is reused for different providers
  React.useEffect(() => {
    if (defaultChannel) setChannel(defaultChannel);
  }, [defaultChannel]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>{t('fields.channel')}</Label>
            <Select value={channel} onValueChange={(v) => setChannel(v as any)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="whatsapp">{t('channels.whatsapp')}</SelectItem>
                <SelectItem value="instagram">{t('channels.instagram')}</SelectItem>
                <SelectItem value="email">{t('channels.email')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {channel === 'whatsapp' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t('fields.businessAccountId')}</Label>
                <Input value={wa.businessAccountId} onChange={(e)=>setWa({...wa,businessAccountId:e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>{t('fields.phoneNumberId')}</Label>
                <Input value={wa.phoneNumberId} onChange={(e)=>setWa({...wa,phoneNumberId:e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>{t('fields.accessToken')}</Label>
                <Input type="password" value={wa.accessToken} onChange={(e)=>setWa({...wa,accessToken:e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>{t('fields.verifyToken')}</Label>
                <Input value={wa.verifyToken} onChange={(e)=>setWa({...wa,verifyToken:e.target.value})} />
              </div>
            </div>
          )}

          {channel === 'instagram' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('fields.pageId')}</Label><Input value={ig.pageId} onChange={(e)=>setIg({...ig,pageId:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.accessToken')}</Label><Input type="password" value={ig.accessToken} onChange={(e)=>setIg({...ig,accessToken:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.appId')}</Label><Input value={ig.appId} onChange={(e)=>setIg({...ig,appId:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.appSecret')}</Label><Input type="password" value={ig.appSecret} onChange={(e)=>setIg({...ig,appSecret:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.verifyToken')}</Label><Input value={ig.verifyToken} onChange={(e)=>setIg({...ig,verifyToken:e.target.value})} /></div>
            </div>
          )}

          {channel === 'email' && (
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1"><Label>{t('fields.provider')}</Label>
                <Select value={em.provider} onValueChange={(v)=>setEm({...em,provider:v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gmail">{t('providers.gmail')}</SelectItem>
                    <SelectItem value="outlook">{t('providers.outlook')}</SelectItem>
                    <SelectItem value="custom">{t('providers.custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label>{t('fields.smtpHost')}</Label><Input value={em.smtpHost} onChange={(e)=>setEm({...em,smtpHost:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.smtpPort')}</Label><Input type="number" value={em.smtpPort} onChange={(e)=>setEm({...em,smtpPort:parseInt(e.target.value||'0')})} /></div>
              <div className="space-y-1"><Label>{t('fields.imapHost')}</Label><Input value={em.imapHost} onChange={(e)=>setEm({...em,imapHost:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.imapPort')}</Label><Input type="number" value={em.imapPort} onChange={(e)=>setEm({...em,imapPort:parseInt(e.target.value||'0')})} /></div>
              <div className="space-y-1"><Label>{t('fields.username')}</Label><Input value={em.username} onChange={(e)=>setEm({...em,username:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.password')}</Label><Input type="password" value={em.password} onChange={(e)=>setEm({...em,password:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.fromEmail')}</Label><Input type="email" value={em.fromEmail} onChange={(e)=>setEm({...em,fromEmail:e.target.value})} /></div>
              <div className="space-y-1"><Label>{t('fields.fromName')}</Label><Input value={em.fromName} onChange={(e)=>setEm({...em,fromName:e.target.value})} /></div>
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center gap-3">
          <Button disabled={loading} onClick={submit}>{loading ? t('actions.saving') : t('actions.saveAndTest')}</Button>
          {msg && <span className="text-sm text-muted-foreground">{msg}</span>}
        </div>
      </CardContent>
    </Card>
  );
}


