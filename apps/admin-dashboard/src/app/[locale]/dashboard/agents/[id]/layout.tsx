import { ReactNode } from 'react';
import { DashboardLayout as SharedDashboardLayout } from '@/components/dashboard/layout';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function AgentDetailLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['admin',]}>
      <SharedDashboardLayout>{children}</SharedDashboardLayout>
    </ProtectedRoute>
  );
}

