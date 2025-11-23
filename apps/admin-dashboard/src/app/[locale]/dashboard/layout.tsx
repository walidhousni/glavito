'use client';

import React from 'react';
import { ClientOnly } from '@/components/client-only';
import { AppShell } from '@/components/navigation/AppShell';
import { ProtectedRoute } from '@/components/auth/protected-route';

interface DashboardLayoutProps { children: React.ReactNode }

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <ClientOnly
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      }
    >
    <ProtectedRoute requiredRole={['admin','agent']}>
        <AppShell>{children}</AppShell>
      </ProtectedRoute>
    </ClientOnly>
  );
}