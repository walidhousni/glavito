import { ReactNode } from 'react';
import { AppShell } from '@/components/navigation/AppShell';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function ConversationsSectionLayout({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute requiredRole={['agent', 'admin']}>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
  );
}


