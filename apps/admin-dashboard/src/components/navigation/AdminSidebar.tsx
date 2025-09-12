'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuthStore } from '@/lib/store/auth-store';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  // Keep store hydrated for role; we can further filter items in Sidebar if needed
  useAuthStore();
  return <Sidebar isOpen={isOpen} onClose={onClose} />;
}


