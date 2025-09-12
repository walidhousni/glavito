'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { AuthLayout } from '@/components/auth/auth-layout';
import { useAuthStore } from '@/lib/store/auth-store';
import { CheckCircle, XCircle, Mail, RefreshCw } from 'lucide-react';

export default function VerifyEmailPage() {
  const t = useTranslations('auth.verifyEmail');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyEmail, resendVerificationEmail, isLoading } = useAuthStore();
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const token = searchParams?.get('token');
    const emailParam = searchParams?.get('email');
    
    if (emailParam) {
      setEmail(emailParam);
    }

    if (token) {
      handleVerifyEmail(token);
    } else {
      setStatus('resend');
    }
  }, [searchParams]);

  const handleVerifyEmail = async (token: string) => {
    try {
      await verifyEmail(token);
      setStatus('success');
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to verify email');
      setStatus('error');
    }
  };

  const handleResendEmail = async () => {
    if (!email) {
      setError('Email address is required');
      return;
    }

    try {
      await resendVerificationEmail(email);
      setStatus('resend');
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    }
  };

  if (status === 'loading') {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <CardContent className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-600 border-t-transparent mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Verifying your email...</p>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Email Verified Successfully
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              {t('success')}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Your email has been verified. You can now access all features.
            </p>
            <Link href="/auth/login">
              <Button className="w-full">
                Continue to Login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  if (status === 'error') {
    return (
      <AuthLayout>
        <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-700/50 shadow-xl">
          <CardHeader className="space-y-1 text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
              Verification Failed
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Unable to verify your email address
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                {error}
              </Alert>
            )}
            <div className="space-y-3">
              <Button
                onClick={() => setStatus('resend')}
                variant="outline"
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Link href="/auth/login">
                <Button variant="ghost" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </AuthLayout>
    );
  }

  // Resend verification email
  return (
    <AuthLayout>
      <Card className="w-full max-w-md backdrop-blur-sm bg-white/95 dark:bg-gray-800/95 border-gray-200/50 dark:border-gray-700/50 shadow-xl">
        <CardHeader className="space-y-1 text-center">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {t('title')}
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-400">
            {t('subtitle')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              {error}
            </Alert>
          )}

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check your email for a verification link. If you don&apos;t see it, check your spam folder.
            </p>

            {email && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Verification email sent to:
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {email}
                </p>
              </div>
            )}

            <Button
              onClick={handleResendEmail}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-600 border-t-transparent" />
                  <span>Sending...</span>
                </div>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {t('resend')}
                </>
              )}
            </Button>

            <Link
              href="/auth/login"
              className="block text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              Back to Login
            </Link>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}