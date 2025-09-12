'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui/alert';
import { api } from '@/lib/api/config';
import { User, Lock, Building, Mail, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
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
    email: string;
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50 dark:bg-red-950/20">
                  <AlertTriangle className="h-4 w-4" />
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          <ModernButton
            onClick={() => router.push('/auth/login')}
            className="w-full"
            gradient={false}
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
          className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-2xl border border-blue-200/50 dark:border-blue-800/50"
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                {invitation.tenant.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center space-x-1">
                <Sparkles className="h-3 w-3" />
                <span>Role: {invitation.role}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-600 dark:text-gray-400">
            <Mail className="h-4 w-4" />
            <span>
              Invited by <span className="font-medium">{invitation.inviter.firstName} {invitation.inviter.lastName}</span>
            </span>
          </div>
        </motion.div>

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

          <div className="grid grid-cols-2 gap-4">
            <ModernInput
              id="firstName"
              name="firstName"
              label="First Name"
              placeholder="John"
              value={formData.firstName}
              onChange={handleChange}
              icon={<User className="h-4 w-4" />}
              required
            />

            <ModernInput
              id="lastName"
              name="lastName"
              label="Last Name"
              placeholder="Doe"
              value={formData.lastName}
              onChange={handleChange}
              icon={<User className="h-4 w-4" />}
              required
            />
          </div>

          <ModernInput
            id="email"
            label="Email Address"
            type="email"
            value={invitation.email}
            disabled
            icon={<Mail className="h-4 w-4" />}
            className="bg-gray-50 dark:bg-gray-800/50"
          />

          <ModernInput
            id="password"
            name="password"
            label="Password"
            type="password"
            placeholder="Create a strong password"
            value={formData.password}
            onChange={handleChange}
            icon={<Lock className="h-4 w-4" />}
            helperText="Must be at least 8 characters long"
            required
          />

          <ModernInput
            id="confirmPassword"
            name="confirmPassword"
            label="Confirm Password"
            type="password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            icon={<Lock className="h-4 w-4" />}
            success={Boolean(formData.confirmPassword) && formData.password === formData.confirmPassword}
            error={formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords don't match" : undefined}
            required
          />

          <ModernButton
            type="submit"
            className="w-full"
            loading={isLoading}
            loadingText="Creating account..."
            icon={<CheckCircle className="h-4 w-4" />}
          >
            Accept Invitation & Create Account
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