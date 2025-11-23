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
            name="email"
            label="Email Address"
            type="email"
            placeholder="john@company.com"
            value={formData.email}
            onChange={handleChange}
            required
            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
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
              required
              className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
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
            success={Boolean(formData.confirmPassword) && formData.password === formData.confirmPassword}
            error={formData.confirmPassword && formData.password !== formData.confirmPassword ? "Passwords don't match" : undefined}
            required
            className="bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 focus:ring-blue-500"
          />

          <motion.label
            whileHover={{ scale: 1.01 }}
            className="flex items-start space-x-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
          >
            <Input
              type="checkbox"
              name="agreeToTerms"
              checked={formData.agreeToTerms}
              onChange={handleChange}
              className="w-4 h-4 mt-0.5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              I agree to the{' '}
              <Link href="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                Privacy Policy
              </Link>
            </span>
          </motion.label>

          <ModernButton
            type="submit"
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all duration-200"
            loading={isLoading}
            loadingText="Creating account..."
          >
            Create Account
          </ModernButton>
        </form>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-800" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white dark:bg-gray-950 px-2 text-gray-500">Or sign up with</span>
          </div>
        </div>

        {/* SSO Providers */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={async () => {
              const res = await http.post('/auth/sso/initiate/google');
              const payload = (res as any)?.data?.data ?? res?.data;
              const url = payload?.url as string; if (url) window.location.href = url;
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
            <span className="text-gray-700 dark:text-gray-300 font-medium">Sign up with Google</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={async () => {
                const res = await http.post('/auth/sso/initiate/microsoft');
                const payload = (res as any)?.data?.data ?? res?.data;
                const url = payload?.url as string; if (url) window.location.href = url;
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
                const res = await http.post('/auth/sso/initiate/github');
                const payload = (res as any)?.data?.data ?? res?.data;
                const url = payload?.url as string; if (url) window.location.href = url;
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
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </ModernAuthCard>
    </ModernAuthLayout>
  );
}