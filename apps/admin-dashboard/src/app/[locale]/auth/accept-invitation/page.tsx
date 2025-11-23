'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api/config';
import { User, Lock, Building, Mail, CheckCircle, AlertTriangle, Sparkles, ArrowRight } from 'lucide-react';
import { ModernAuthLayout } from '@/components/auth/modern-auth-layout';
import { ModernAuthCard } from '@/components/auth/modern-auth-card';
import { ModernInput } from '@/components/auth/modern-input';
import { ModernButton } from '@/components/auth/modern-button';

interface InvitationInfo {
  id: string;
  email: string;
  role: string;
  tenant: {
    name: string;
  };
  inviter: {
    firstName: string;
    lastName: string;
  };
  expiresAt: string;
}

export default function AcceptInvitationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [invitation, setInvitation] = useState<InvitationInfo | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInvitation, setIsLoadingInvitation] = useState(true);

  useEffect(() => {
    const token = searchParams?.get('token');
    if (token) {
      fetchInvitation(token);
    } else {
      setError('Invalid invitation link');
      setIsLoadingInvitation(false);
    }
  }, [searchParams]);

  const fetchInvitation = async (token: string) => {
    try {
      const response = await api.get(`/auth/invitations/${token}`);
      setInvitation(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired invitation');
    } finally {
      setIsLoadingInvitation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.password) {
      setError('All fields are required');
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

    const token = searchParams?.get('token');
    if (!token) {
      setError('Invalid invitation token');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post(`/auth/invitations/${token}/accept`, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
      });

      // Store auth tokens
      const { accessToken, refreshToken, user } = response.data;
      localStorage.setItem('auth-storage', JSON.stringify({
        state: {
          user,
          tokens: { accessToken, refreshToken },
          isAuthenticated: true,
        },
        version: 0,
      }));

      router.push('/dashboard');
    } catch (err: unknown) {
      const message = (() => {
        if (typeof err === 'string') return err;
        if (err && typeof err === 'object') {
          const anyErr = err as { response?: { data?: { message?: string } } };
          return anyErr.response?.data?.message || (err as Error).message;
        }
        return undefined;
      })();
      setError(message || 'Failed to accept invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  if (isLoadingInvitation) {
    return (
      <ModernAuthLayout>
        <ModernAuthCard>
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"
              />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-gray-600 dark:text-gray-400"
              >
                Loading invitation...
              </motion.p>
            </div>
          </div>
        </ModernAuthCard>
      </ModernAuthLayout>
    );
  }

  if (!invitation) {
    return (
      <ModernAuthLayout>
        <ModernAuthCard
          title="Invalid Invitation"
          description="This invitation link is invalid or has expired."
        >
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <ModernButton
            onClick={() => router.push('/auth/login')}
            className="w-full"
            variant="outline"
          >
            Go to Login
          </ModernButton>
        </ModernAuthCard>
      </ModernAuthLayout>
    );
  }

  return (
    <ModernAuthLayout
      title="Accept Invitation"
      subtitle="Complete your account setup"
    >
      <ModernAuthCard>
        {/* Invitation Info */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 p-5 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800"
        >
          <div className="flex items-start space-x-4">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
              <Building className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                {invitation.tenant.name}
              </h3>
              <div className="mt-1 flex flex-col space-y-1">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                  <span>Role: <span className="font-medium text-gray-700 dark:text-gray-300">{invitation.role}</span></span>
                </div>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  <Mail className="h-3.5 w-3.5 mr-1.5" />
                  <span className="truncate">Invited by {invitation.inviter.firstName} {invitation.inviter.lastName}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

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

          <div className="grid grid-cols-2 gap-4">
            <ModernInput
              id="firstName"
              name="firstName"
              label="First Name"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
            />

            <ModernInput
              id="lastName"
              name="lastName"
              label="Last Name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
            />
          </div>

          <ModernInput
            id="email"
            label="Email Address"
            type="email"
            value={invitation.email}
            disabled
            className="bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed border-gray-200 dark:border-gray-700"
          />

          <div className="space-y-4">
            <ModernInput
              id="password"
              name="password"
              label="Password"
              type="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              helperText="Must be at least 8 characters long"
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
            />

            <ModernInput
              id="confirmPassword"
              name="confirmPassword"
              label="Confirm Password"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              success={Boolean(formData.confirmPassword) && formData.password === formData.confirmPassword}
              error={formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords don't match" : undefined}
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
            />
          </div>

          <ModernButton
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            loading={isLoading}
            loadingText="Creating account..."
          >
            <span>Accept & Create Account</span>
            <ArrowRight className="ml-2 h-4 w-4" />
          </ModernButton>
        </form>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span>Your data is protected with enterprise-grade security</span>
          </div>
        </motion.div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}