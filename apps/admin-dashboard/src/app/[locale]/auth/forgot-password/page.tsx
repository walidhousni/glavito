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
        title="Check Your Email"
        subtitle="We've sent you a password reset link"
      >
        <ModernAuthCard>
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center space-y-6"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-16 h-16 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center"
            >
              <CheckCircle className="h-8 w-8 text-white" />
            </motion.div>

            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Reset link sent!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
            </div>

            <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Didn't receive the email? Check your spam folder or try again in a few minutes.
              </p>
            </div>

            <div className="space-y-3">
              <ModernButton
                onClick={() => setSuccess(false)}
                className="w-full"
                gradient={false}
                variant="outline"
              >
                Try different email
              </ModernButton>

              <Link
                href="/auth/login"
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group"
              >
                <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
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
      title="Forgot Password?"
      subtitle="Enter your email to receive reset instructions"
    >
      <ModernAuthCard>
        <form onSubmit={handleSubmit} className="space-y-6">
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive" className="border-red-200 bg-red-50 dark:bg-red-950/20">
                  <AlertTriangle className="h-4 w-4" />
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
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-4 w-4" />}
            helperText="We'll send you a link to reset your password"
            required
          />

          <ModernButton
            type="submit"
            className="w-full"
            loading={isLoading}
            loadingText="Sending reset link..."
            icon={<Send className="h-4 w-4" />}
          >
            Send Reset Link
          </ModernButton>
        </form>

        {/* Back to Login */}
        <div className="mt-6">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Link
              href="/auth/login"
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group"
            >
              <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to login</span>
            </Link>
          </motion.div>
        </div>

        {/* Help Section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="text-center space-y-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Need help?
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Contact our support team at{' '}
              <a href="mailto:support@glavito.com" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                support@glavito.com
              </a>
            </p>
          </div>
        </motion.div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}