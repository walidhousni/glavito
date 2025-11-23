'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui/alert';
import { ModernAuthLayout } from '@/components/auth/modern-auth-layout';
import { ModernAuthCard } from '@/components/auth/modern-auth-card';
import { ModernButton } from '@/components/auth/modern-button';
import { useAuthStore } from '@/lib/store/auth-store';
import { CheckCircle, XCircle, Mail, RefreshCw, ArrowLeft, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

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
      <ModernAuthLayout
        title="Verifying email"
        subtitle="Please wait while we verify your email address"
      >
        <ModernAuthCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
              />
              <p className="text-gray-600 dark:text-gray-400">Verifying...</p>
            </div>
          </div>
        </ModernAuthCard>
      </ModernAuthLayout>
    );
  }

  if (status === 'success') {
    return (
      <ModernAuthLayout
        title="Email verified"
        subtitle="Your account has been successfully verified"
      >
        <ModernAuthCard>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-6"
          >
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Success!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your email has been verified. Redirecting you to login...
              </p>
            </div>

            <div className="pt-2">
              <Link href="/auth/login">
                <ModernButton className="w-full">
                  Continue to Login
                </ModernButton>
              </Link>
            </div>
          </motion.div>
        </ModernAuthCard>
      </ModernAuthLayout>
    );
  }

  if (status === 'error') {
    return (
      <ModernAuthLayout
        title="Verification failed"
        subtitle="We couldn't verify your email address"
      >
        <ModernAuthCard>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-6"
          >
            <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>

            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    {error}
                  </Alert>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-3">
              <ModernButton
                onClick={() => setStatus('resend')}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </ModernButton>
              
              <Link href="/auth/login">
                <ModernButton variant="ghost" className="w-full">
                  Back to Login
                </ModernButton>
              </Link>
            </div>
          </motion.div>
        </ModernAuthCard>
      </ModernAuthLayout>
    );
  }

  // Resend verification email
  return (
    <ModernAuthLayout
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <ModernAuthCard>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
              <Mail className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Check your email for a verification link. If you don&apos;t see it, check your spam folder.
            </p>

            {email && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">
                  Sent to
                </p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {email}
                </p>
              </div>
            )}

            <ModernButton
              onClick={handleResendEmail}
              variant="outline"
              className="w-full"
              loading={isLoading}
              loadingText="Sending..."
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('resend')}
            </ModernButton>

            <div className="pt-2">
              <Link
                href="/auth/login"
                className="inline-flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span>Back to login</span>
              </Link>
            </div>
          </div>
        </motion.div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}