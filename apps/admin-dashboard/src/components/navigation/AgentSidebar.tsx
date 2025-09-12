'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { useAuthStore } from '@/lib/store/auth-store';

interface AgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AgentSidebar({ isOpen, onClose }: AgentSidebarProps) {
  useAuthStore();
  return <Sidebar isOpen={isOpen} onClose={onClose} />;
}


