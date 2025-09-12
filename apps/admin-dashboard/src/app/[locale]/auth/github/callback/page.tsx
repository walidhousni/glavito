'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n.config';
import { api } from '@/lib/api/config';

export default function GithubSSOCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = params?.get('code') || '';
    const state = params?.get('state') || '';
    const tenantId = (() => {
      try {
        return localStorage.getItem('tenantId') || undefined;
      } catch {
        return undefined;
      }
    })();

    if (!code) {
      setError('Missing authorization code');
      return;
    }

    (async () => {
      try {
        const res = await api.get(`/auth/sso/callback/github`, { params: { code, state, tenantId } });
        const data = (res as any)?.data?.data ?? res.data;
        const { accessToken, refreshToken, user } = data || {};
        if (accessToken && user) {
          try {
            localStorage.setItem(
              'auth-storage',
              JSON.stringify({
                state: {
                  user,
                  tokens: { accessToken, refreshToken },
                  isAuthenticated: true,
                },
                version: 0,
              }),
            );
          } catch { /* ignore */ }
        }
        router.push('/dashboard');
      } catch (e: any) {
        setError(e?.response?.data?.message || 'SSO login failed');
      }
    })();
  }, [params, router]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        {!error ? 'Signing you in with GitHub…' : error}
      </div>
    </div>
  );
}


