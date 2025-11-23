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
      title="Welcome back"
      subtitle="Sign in to continue to Glavito"
    >
      <ModernAuthCard>
        <form onSubmit={handleSubmit} className="space-y-5">
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
              id="email"
              name="email"
              label="Email Address"
              type="email"
              placeholder="name@company.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
            />

            <div className="space-y-1">
              <ModernInput
                id="password"
                name="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleChange}
                required
                className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
              />
              <div className="flex justify-end">
                <Link
                  href="/auth/forgot-password"
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            </div>
          </div>

          <ModernButton
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            loading={isLoading}
            loadingText="Signing in..."
          >
            Continue
          </ModernButton>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">Or continue with</span>
          </div>
        </div>

        {/* SSO Providers */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={async () => {
              const res = await api.post('/auth/sso/initiate/google');
              const payload = (res as unknown as { data?: { data?: { url?: string } } }).data?.data
                ?? (res as unknown as { data?: { url?: string } }).data;
              const url = (payload as { url?: string } | undefined)?.url;
              if (url) window.location.href = url;
            }}
            className="w-full flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-200 group"
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26.81-.58z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-gray-700 dark:text-gray-300 font-medium">Continue with Google</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={async () => {
                const res = await api.post('/auth/sso/initiate/microsoft');
                const payload = (res as unknown as { data?: { data?: { url?: string } } }).data?.data
                  ?? (res as unknown as { data?: { url?: string } }).data;
                const url = (payload as { url?: string } | undefined)?.url;
                if (url) window.location.href = url;
              }}
              className="flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-200"
            >
              <svg className="h-5 w-5 mr-2" viewBox="0 0 23 23">
                <path fill="#f35325" d="M1 1h10v10H1z"/>
                <path fill="#81bc06" d="M12 1h10v10H12z"/>
                <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                <path fill="#ffba08" d="M12 12h10v10H12z"/>
              </svg>
              <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">Microsoft</span>
            </button>

            <button
              type="button"
              onClick={async () => {
                const res = await api.post('/auth/sso/initiate/github');
                const payload = (res as unknown as { data?: { data?: { url?: string } } }).data?.data
                  ?? (res as unknown as { data?: { url?: string } }).data;
                const url = (payload as { url?: string } | undefined)?.url;
                if (url) window.location.href = url;
              }}
              className="flex items-center justify-center px-4 py-2.5 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors duration-200"
            >
              <Github className="h-5 w-5 mr-2 text-gray-900 dark:text-white" />
              <span className="text-gray-700 dark:text-gray-300 font-medium text-sm">GitHub</span>
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/auth/register"
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Sign up
            </Link>
          </p>
        </div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}