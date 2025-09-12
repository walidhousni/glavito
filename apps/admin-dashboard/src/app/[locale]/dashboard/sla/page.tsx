import { Metadata } from 'next';
import { SLADashboard } from '@/components/sla/sla-dashboard';

export const metadata: Metadata = {
  title: 'SLA Management',
  description: 'Manage SLA policies, monitor compliance, and track performance metrics',
};

export default function SLAPage() {
  return <SLADashboard />;
}