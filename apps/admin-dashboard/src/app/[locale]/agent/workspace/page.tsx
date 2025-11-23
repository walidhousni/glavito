'use client';

import { TicketsWorkspace } from '@/components/tickets/TicketsWorkspace';
import { ProtectedRoute } from '@/components/auth/protected-route';
import { useTranslations } from 'next-intl';

export default function AgentWorkspacePage() {
  void useTranslations('tickets');
  return (
    <ProtectedRoute requiredRole={['agent']}>
      <TicketsWorkspace mode="agent" />
    </ProtectedRoute>
  );
}


