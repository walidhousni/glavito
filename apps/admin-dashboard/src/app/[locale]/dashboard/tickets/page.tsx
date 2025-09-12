'use client';

import { TicketsWorkspace } from '@/components/tickets/TicketsWorkspace';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

export default function DashboardTicketsPage() {
  void useTranslations('tickets');
  const search = useSearchParams();
  const ticket = (search?.get('ticket') || undefined) as string | undefined;
  return <TicketsWorkspace openTicketId={ticket} />;
}