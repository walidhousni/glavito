'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Alert } from '@/components/ui/alert';
import { api as http } from '@/lib/api/config';
import { User, Mail, Lock, UserPlus, AlertTriangle, ArrowLeft, Shield, CheckCircle, Github, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api/config';
import { ModernAuthLayout } from '@/components/auth/modern-auth-layout';
import { ModernAuthCard } from '@/components/auth/modern-auth-card';
import { ModernInput } from '@/components/auth/modern-input';
import { ModernButton } from '@/components/auth/modern-button';
import { Link } from '@/i18n.config';
import { Input } from '@/components/ui/input';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
      setError('Please fill in all fields');
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

    if (!formData.agreeToTerms) {
      setError('Please agree to the terms and conditions');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/auth/register', {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
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
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
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

  const passwordStrength = () => {
    const password = formData.password;
    let strength = 0;
    
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    
    return strength;
  };

  const getStrengthColor = (strength: number) => {
    if (strength < 2) return 'bg-red-500';
    if (strength < 4) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthText = (strength: number) => {
    if (strength < 2) return 'Weak';
    if (strength < 4) return 'Medium';
    return 'Strong';
  };

  return (
    <ModernAuthLayout
      title="Create Account"
      subtitle="Join thousands of teams using Glavito"
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
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@company.com"
            value={formData.email}
            onChange={handleChange}
            icon={<Mail className="h-4 w-4" />}
            required
          />

          <div className="space-y-2">
            <ModernInput
              id="password"
              name="password"
              label="Password"
              type="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={handleChange}
              icon={<Lock className="h-4 w-4" />}
              required
            />
            
            {/* Password Strength Indicator */}
            {formData.password && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.2 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500">Password strength</span>
                  <span className={`font-medium ${
                    passwordStrength() < 2 ? 'text-red-500' :
                    passwordStrength() < 4 ? 'text-yellow-500' : 'text-green-500'
                  }`}>
                    {getStrengthText(passwordStrength())}
                  </span>
                </div>
                <div className="flex space-x-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        i < passwordStrength() ? getStrengthColor(passwordStrength()) : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

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

          <motion.label
            whileHover={{ scale: 1.02 }}
            className="flex items-start space-x-3 cursor-pointer"
          >
            <Input
              type="checkbox"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600 mt-0.5"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                Privacy Policy
              </Link>
            </span>
          </motion.label>

          <ModernButton
            type="submit"
            className="w-full"
            loading={isLoading}
            loadingText="Creating account..."
            icon={<UserPlus className="h-4 w-4" />}
          >
            Create Account
          </ModernButton>
        </form>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300 dark:border-gray-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-gray-900 text-gray-500">Already have an account?</span>
          </div>
        </div>

        {/* SSO Providers */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4">
          <ModernButton type="button" variant="outline" onClick={async () => {
            const res = await http.post('/auth/sso/initiate/google');
            const payload = (res as any)?.data?.data ?? res?.data;
            const url = payload?.url as string; if (url) window.location.href = url;
          }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Google SSO
          </ModernButton>
          <ModernButton type="button" variant="outline" onClick={async () => {
            const res = await http.post('/auth/sso/initiate/microsoft');
            const payload = (res as any)?.data?.data ?? res?.data;
            const url = payload?.url as string; if (url) window.location.href = url;
          }}>
            <RefreshCw className="h-4 w-4 mr-2" /> Microsoft SSO
          </ModernButton>
          <ModernButton type="button" variant="outline" onClick={async () => {
            const res = await http.post('/auth/sso/initiate/github');
            const payload = (res as any)?.data?.data ?? res?.data;
            const url = payload?.url as string; if (url) window.location.href = url;
          }}>
            <Github className="h-4 w-4 mr-2" /> GitHub SSO
          </ModernButton>
        </div>

        {/* Sign In Link */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Link
            href="/auth/login"
            className="w-full flex items-center justify-center space-x-2 px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-600 hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-200 group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span>Sign in instead</span>
          </Link>
        </motion.div>

        {/* Features List */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-6 space-y-3"
        >
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            What you get with Glavito:
          </div>
          {[
            'Unified inbox for all channels',
            'AI-powered automation',
            'Advanced analytics & reporting',
            '24/7 enterprise support'
          ].map((feature, index) => (
            <motion.div
              key={feature}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400"
            >
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>{feature}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Security Notice */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <Shield className="h-4 w-4 text-green-500" />
            <span>Your data is encrypted and secure</span>
          </div>
        </motion.div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}