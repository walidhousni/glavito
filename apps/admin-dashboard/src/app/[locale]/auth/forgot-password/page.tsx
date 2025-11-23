'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api/config';
import { Mail, ArrowLeft, Send, CheckCircle, AlertTriangle } from 'lucide-react';
import { ModernAuthLayout } from '@/components/auth/modern-auth-layout';
import { ModernAuthCard } from '@/components/auth/modern-auth-card';
import { ModernInput } from '@/components/auth/modern-input';
import { ModernButton } from '@/components/auth/modern-button';
import { Link } from '@/i18n.config';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      await api.post('/auth/forgot-password', { email });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send reset email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <ModernAuthLayout
        title="Check your email"
        subtitle="We've sent you a password reset link"
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
              <p className="text-gray-600 dark:text-gray-400">
                We've sent a password reset link to<br />
                <span className="font-semibold text-gray-900 dark:text-white">{email}</span>
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <ModernButton
                onClick={() => setSuccess(false)}
                className="w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Try different email
              </ModernButton>

              <Link
                href="/auth/login"
                className="flex items-center justify-center space-x-2 text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to login</span>
              </Link>
            </div>
          </motion.div>
        </ModernAuthCard>
      </ModernAuthLayout>
    );
  }

  return (
    <ModernAuthLayout
      title="Forgot password?"
      subtitle="Enter your email to receive reset instructions"
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

          <ModernInput
            id="email"
            name="email"
            label="Email Address"
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
          />

          <ModernButton
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            loading={isLoading}
            loadingText="Sending link..."
          >
            Send Reset Link
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