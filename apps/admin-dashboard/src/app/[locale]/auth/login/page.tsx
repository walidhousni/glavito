'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n.config';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui/alert';
//
import { useAuthStore } from '@/lib/store/auth-store';
import { Mail, Lock, LogIn, AlertTriangle, ArrowRight, Shield, Github, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api/config';
import { ModernAuthLayout } from '@/components/auth/modern-auth-layout';
import { ModernAuthCard } from '@/components/auth/modern-auth-card';
import { ModernInput } from '@/components/auth/modern-input';
import { ModernButton } from '@/components/auth/modern-button';
import { Link } from '@/i18n.config';
import { Input } from '@/components/ui/input';

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const login = useAuthStore((s) => s.login);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }

    setIsLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      const user = result?.user;
      if (user?.tenantId && typeof window !== 'undefined') {
        try { localStorage.setItem('tenantId', user.tenantId) } catch { /* ignore */ }
      }
      const ret = params?.get('returnTo');
      router.push(ret && ret.startsWith('/') ? ret : '/dashboard');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } }
      setError(e.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  return (
    <ModernAuthLayout
      title="Welcome Back"
      subtitle="Sign in to your account"
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
            placeholder="Enter your email"
            value={formData.email}
            onChange={handleChange}
            icon={<Mail className="h-4 w-4" />}
            required
          />

          <ModernInput
            id="password"
            name="password"
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            icon={<Lock className="h-4 w-4" />}
            required
          />

          <div className="flex items-center justify-between">
            <motion.label
              whileHover={{ scale: 1.02 }}
              className="flex items-center space-x-2 cursor-pointer"
            >
              <Input
                type="checkbox"
                name="rememberMe"
                checked={formData.rememberMe}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">Remember me</span>
            </motion.label>

            <Link
              href="/auth/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Forgot password?
            </Link>
          </div>

          <ModernButton
            type="submit"
            className="w-full"
            loading={isLoading}
            loadingText="Signing in..."
            icon={<LogIn className="h-4 w-4" />}
          >
            Sign In
          </ModernButton>
        </form>

        {/* SSO Providers */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
          <ModernButton
            type="button"
            variant="outline"
            onClick={async () => {
              const res = await api.post('/auth/sso/initiate/google');
              const payload = (res as unknown as { data?: { data?: { url?: string } } }).data?.data
                ?? (res as unknown as { data?: { url?: string } }).data;
              const url = (payload as { url?: string } | undefined)?.url;
              if (url) window.location.href = url;
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Google SSO
          </ModernButton>
          <ModernButton
            type="button"
            variant="outline"
            onClick={async () => {
              const res = await api.post('/auth/sso/initiate/microsoft');
              const payload = (res as unknown as { data?: { data?: { url?: string } } }).data?.data
                ?? (res as unknown as { data?: { url?: string } }).data;
              const url = (payload as { url?: string } | undefined)?.url;
              if (url) window.location.href = url;
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" /> Microsoft SSO
          </ModernButton>
          <ModernButton
            type="button"
            variant="outline"
            onClick={async () => {
              const res = await api.post('/auth/sso/initiate/github');
              const payload = (res as unknown as { data?: { data?: { url?: string } } }).data?.data
                ?? (res as unknown as { data?: { url?: string } }).data;
              const url = (payload as { url?: string } | undefined)?.url;
              if (url) window.location.href = url;
            }}
          >
            <Github className="h-4 w-4 mr-2" /> GitHub SSO
          </ModernButton>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Don&apos;t have an account?</span>
          </div>
        </div>

        {/* Sign Up Link */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href="/auth/register"
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group"
          >
            <span>Create new account</span>
            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Protected by enterprise-grade security</span>
          </div>
        </motion.div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}