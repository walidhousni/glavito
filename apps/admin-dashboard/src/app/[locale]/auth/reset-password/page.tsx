'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui/alert';
import { ModernAuthLayout } from '@/components/auth/modern-auth-layout';
import { ModernAuthCard } from '@/components/auth/modern-auth-card';
import { ModernInput } from '@/components/auth/modern-input';
import { ModernButton } from '@/components/auth/modern-button';
import { useAuthStore } from '@/lib/store/auth-store';
import { Lock, CheckCircle, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const t = useTranslations('auth.resetPassword');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, isLoading } = useAuthStore();
  
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const tokenParam = searchParams?.get('token') ?? null;
    if (!tokenParam) {
      setError('Invalid or missing reset token');
      return;
    }
    setToken(tokenParam);
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid reset token');
      return;
    }

    if (!formData.password || !formData.confirmPassword) {
      setError('Both password fields are required');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    try {
      await resetPassword(token, formData.password);
      setSuccess(true);
      setTimeout(() => {
        router.push('/auth/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (success) {
    return (
      <ModernAuthLayout
        title="Password reset successful"
        subtitle="You can now sign in with your new password"
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
                All set!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your password has been successfully reset. Redirecting you to login...
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

  return (
    <ModernAuthLayout
      title={t('title')}
      subtitle={t('subtitle')}
    >
      <ModernAuthCard>
        <form onSubmit={handleSubmit} className="space-y-6">
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

          <div className="space-y-4">
            <ModernInput
              id="password"
              name="password"
              label={t('password')}
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
            />

            <ModernInput
              id="confirmPassword"
              name="confirmPassword"
              label={t('confirmPassword')}
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
              success={Boolean(formData.confirmPassword) && formData.password === formData.confirmPassword}
              error={formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords don't match" : undefined}
            />
          </div>

          <ModernButton
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            loading={isLoading}
            loadingText="Resetting..."
            disabled={!token}
          >
            {t('submit')}
          </ModernButton>
        </form>

        <div className="mt-8 text-center">
          <Link
            href="/auth/login"
            className="inline-flex items-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back to login</span>
          </Link>
        </div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}