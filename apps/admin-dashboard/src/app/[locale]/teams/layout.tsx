import { ReactNode } from 'react';
import { DashboardLayout as SharedDashboardLayout } from '@/components/dashboard/layout';

export default function TeamsSectionLayout({ children }: { children: ReactNode }) {
  return <SharedDashboardLayout>{children}</SharedDashboardLayout>;
}


