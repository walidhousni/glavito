'use client';

import { TicketsWorkspace } from '@/components/tickets/TicketsWorkspace';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { ProtectedRoute } from '@/components/auth/protected-route';

export default function DashboardTicketsPage() {
  void useTranslations('tickets');
  const search = useSearchParams();
  const ticket = (search?.get('ticket') || undefined) as string | undefined;
  return (
    <ProtectedRoute requiredRole={['admin','agent']}>
      <TicketsWorkspace openTicketId={ticket} />
    </ProtectedRoute>
  );
}