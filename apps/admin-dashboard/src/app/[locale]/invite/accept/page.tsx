'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { invitationsApi } from '@/lib/api/invitations-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/toast';
import { CheckCircle2, AlertCircle, UserPlus } from 'lucide-react';

interface PageProps {
  params: { locale: string };
}

export default function AcceptInvitationPage({ params }: PageProps) {
  const t = useTranslations('invite');
  const router = useRouter();
  const search = useSearchParams();
  const { push } = useToast();

  const token = useMemo(() => String(search.get('token') || ''), [search]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<null | {
    email: string;
    role: string;
    inviter: { firstName: string; lastName: string; email: string };
  }>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setError('Missing invitation token');
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const info = await invitationsApi.validate(token);
        if (!cancelled) {
          if (info) {
            setInvitation({ email: info.email, role: info.role, inviter: info.inviter });
            setError(null);
          } else {
            setError('Invalid or expired invitation');
          }
        }
      } catch {
        if (!cancelled) setError('Failed to validate invitation');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  async function onSubmit() {
    if (!token) return;
    if (!firstName.trim() || !lastName.trim()) {
      push('Please provide your first and last name', 'error');
      return;
    }
    if ((password || confirm) && password !== confirm) {
      push('Passwords do not match', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await invitationsApi.accept({ token, firstName, lastName, password });
      if (res?.success) {
        push('Invitation accepted. You can now sign in.', 'success');
        router.replace(`/${params.locale}/auth/login`);
        return;
      }
      push(res?.message || 'Failed to accept invitation', 'error');
    } catch (e) {
      push('Failed to accept invitation', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <Card className="w-full max-w-xl premium-card">
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">
              {t('title', { fallback: 'Accept Invitation' })}
            </CardTitle>
          </div>
          <CardDescription>
            {t('subtitle', { fallback: 'Join your team and get started' })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loading && (
            <div className="text-sm text-muted-foreground">{t('loading', { fallback: 'Validating invitation…' })}</div>
          )}

          {!loading && error && (
            <div className="flex items-start gap-2 rounded-md border border-red-300/50 bg-red-50 p-3 text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <div>
                <div className="font-medium">{t('invalid', { fallback: 'Invalid or expired invitation' })}</div>
                <div className="text-xs">{error}</div>
              </div>
            </div>
          )}

          {!loading && invitation && (
            <>
              <div className="rounded-md border p-3 bg-muted/40">
                <div className="text-sm">
                  <span className="font-medium">{t('invitedBy', { fallback: 'Invited by' })}:</span>{' '}
                  {invitation.inviter.firstName} {invitation.inviter.lastName} ({invitation.inviter.email})
                </div>
                <div className="text-sm">
                  <span className="font-medium">{t('email', { fallback: 'Email' })}:</span> {invitation.email}
                </div>
                <div className="text-sm">
                  <span className="font-medium">{t('role', { fallback: 'Role' })}:</span> {invitation.role}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('firstName', { fallback: 'First name' })}</Label>
                  <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div className="space-y-2">
                  <Label>{t('lastName', { fallback: 'Last name' })}</Label>
                  <Input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Doe" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('password', { fallback: 'Password (optional)' })}</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>{t('confirmPassword', { fallback: 'Confirm password' })}</Label>
                  <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="••••••••" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {t('policy', { fallback: 'By accepting, you agree to the Terms of Use.' })}
                </div>
                <Button onClick={onSubmit} disabled={submitting} className="btn-gradient rounded-lg">
                  {submitting ? t('accepting', { fallback: 'Accepting…' }) : t('accept', { fallback: 'Accept Invitation' })}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


