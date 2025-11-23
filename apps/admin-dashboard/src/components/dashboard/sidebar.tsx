'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n.config';
import { 
  Home, 
  LayoutDashboard, 
  Ticket, 
  Users, 
  PieChart, 
  Workflow, 
  Brain, 
  Settings, 
  Clock, 
  Briefcase, 
  MessageSquare, 
  Megaphone, 
  Plug, 
  Shield, 
  Key, 
  Bell, 
  History, 
  GraduationCap,
  BarChart,
  FileText,
  ClipboardList,
  Smartphone,
  LogOut,
  ChevronRight,
  Menu
} from 'lucide-react';
import { Link } from '@/i18n.config';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTheme } from '@/components/theme-provider';
import { useSidebarStore } from '@/lib/store/sidebar-store';

// Lucide Icons mapping for navigation items
const icons = {
  home: Home,
  dashboard: LayoutDashboard,
  ticket: Ticket,
  users: Users,
  analytics: PieChart,
  workflow: Workflow,
  brain: Brain,
  settings: Settings,
  timer: Clock,
  briefcase: Briefcase,
  message: MessageSquare,
  marketing: Megaphone,
  integration: Plug,
  shield: Shield,
  key: Key,
  bell: Bell,
  activity: History,
  coaching: GraduationCap,
  leadScoring: BarChart,
  quotes: FileText,
  surveys: ClipboardList,
  whatsapp: Smartphone,
};

interface NavItem {
  name: string;
  href: string;
  icon: keyof typeof icons;
  badge?: string | null;
  children?: NavItem[];
}

interface NavGroup {
  name: string;
  icon: keyof typeof icons;
  items: NavItem[];
}

// Navigation structure with groups
const navigationGroups: NavGroup[] = [
  {
    name: 'main',
    icon: 'home',
    items: [
      { name: 'dashboard', href: '/dashboard', icon: 'home', badge: null },
      { name: 'agent_dashboard', href: '/dashboard/tickets', icon: 'dashboard', badge: 'NEW' },
      { name: 'tickets', href: '/dashboard/tickets', icon: 'ticket', badge: '12' },
      { name: 'activity', href: '/dashboard/activity', icon: 'activity', badge: null },
    ],
  },
  {
    name: 'manage',
    icon: 'users',
    items: [
      { name: 'customers', href: '/dashboard/customers', icon: 'users', badge: null },
      { name: 'teams', href: '/dashboard/teams', icon: 'users', badge: null },
      { name: 'crm', href: '/dashboard/crm', icon: 'briefcase', badge: null },
      { name: 'lead_scoring', href: '/dashboard/crm/lead-scoring', icon: 'leadScoring', badge: 'NEW' },
      { name: 'quotes', href: '/dashboard/crm/quotes', icon: 'quotes', badge: 'NEW' },
    ],
  },
  {
    name: 'insights',
    icon: 'analytics',
    items: [
      { name: 'analytics', href: '/dashboard/analytics', icon: 'analytics', badge: null },
      { name: 'ai_intelligence', href: '/dashboard/ai-intelligence', icon: 'brain', badge: 'NEW' },
      { name: 'glavai_insights', href: '/dashboard/glavai-insights', icon: 'brain', badge: 'NEW' },
      { name: 'coaching', href: '/dashboard/coaching', icon: 'coaching', badge: 'NEW' },
      { name: 'knowledge', href: '/dashboard/knowledge', icon: 'brain', badge: null },
    ],
  },
  {
    name: 'automation',
    icon: 'workflow',
    items: [
      { name: 'workflows', href: '/dashboard/workflows', icon: 'workflow', badge: null },
      { name: 'sla', href: '/dashboard/sla', icon: 'timer', badge: 'NEW' },
      { name: 'marketplace', href: '/dashboard/marketplace', icon: 'workflow', badge: null },
      { name: 'marketing', href: '/dashboard/marketing', icon: 'marketing', badge: 'NEW' },
      { name: 'surveys', href: '/dashboard/surveys', icon: 'surveys', badge: 'NEW' },
      { name: 'integrations', href: '/dashboard/integrations', icon: 'integration', badge: 'NEW' },
      { name: 'whatsapp_automation', href: '/dashboard/channels/whatsapp', icon: 'whatsapp', badge: 'NEW' },
    ],
  },
  {
    name: 'settings',
    icon: 'settings',
    items: [
      { name: 'customize_dashboard', href: '/dashboard/customize', icon: 'dashboard', badge: null },
      { name: 'permissions', href: '/dashboard/permissions', icon: 'key', badge: null },
      { name: 'admin_settings', href: '/dashboard/admin-settings', icon: 'shield', badge: null },
    ],
  },
];

const agentNavigation: NavGroup[] = [
  {
    name: 'main',
    icon: 'dashboard',
    items: [
      { name: 'agent_dashboard', href: '/tickets', icon: 'dashboard', badge: null },
      { name: 'conversations', href: '/agent/workspace', icon: 'message', badge: null },
      { name: 'activity', href: '/dashboard/activity', icon: 'activity', badge: null },
      { name: 'coaching', href: '/agent/coaching', icon: 'coaching', badge: 'NEW' },
      { name: 'knowledge', href: '/agent/knowledge', icon: 'brain', badge: null },
      { name: 'notifications', href: '/dashboard/notifications', icon: 'bell', badge: null },
    ],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations('navigation');
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const { brand } = useTheme();
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const { setIsCollapsed } = useSidebarStore();

  // Determine navigation based on user role
  const getNavigationGroups = (): NavGroup[] => {
    if (user?.role === 'admin') {
      return navigationGroups;
    }
    if (user?.role === 'agent') {
      return agentNavigation;
    }
    return [];
  };

  const userNavigationGroups = getNavigationGroups();

  const isActivePath = (href: string) => {
    try {
      if (!pathname) return false;
      if (href === '/dashboard') {
        return pathname === '/dashboard';
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    } catch {
      return false;
    }
  };

  // Auto-open the group containing the active item on mount
  useEffect(() => {
    if (!activeGroup) {
      const activeGroupName = userNavigationGroups.find((group) =>
        group.items.some((item) => isActivePath(item.href))
      )?.name;
      if (activeGroupName) {
        setActiveGroup(activeGroupName);
        setIsCollapsed(false);
      }
    }
  }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleGroupClick = (groupName: string) => {
    if (activeGroup === groupName) {
      setActiveGroup(null);
      setIsCollapsed(true);
    } else {
      setActiveGroup(groupName);
      setIsCollapsed(false);
    }
  };

  const handleItemClick = () => {
    setActiveGroup(null);
    setIsCollapsed(true);
    onClose();
  };

  // Check if any item in a group is active
  const isGroupActive = (group: NavGroup) => {
    return group.items.some((item) => isActivePath(item.href));
  };

  return (
    <TooltipProvider delayDuration={0}>
      {/* Backdrop for mobile */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        />
      )}
      
      <div className="fixed inset-y-0 left-0 z-50 flex">
        {/* Collapsed Icon Sidebar (60px) */}
        <motion.aside
          initial={false}
          className={cn(
            'w-[60px] bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/50 shadow-sm z-50',
            'lg:translate-x-0',
            isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          )}
        >
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center justify-center border-b border-slate-200 dark:border-slate-800/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative group cursor-pointer">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40 group-hover:scale-105 transition-all duration-300">
                      <Ticket className="h-5 w-5 text-white" />
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 dark:bg-slate-800 text-white border-slate-700">
                  <p className="font-semibold">{brand?.name || 'Glavito'}</p>
                  <p className="text-xs text-slate-400">{t('supportPlatform')}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Navigation Icons */}
            <nav className="flex-1 overflow-y-auto p-2 space-y-2 my-2 no-scrollbar">
              {userNavigationGroups.map((group) => {
                const isActive = activeGroup === group.name || isGroupActive(group);
                const Icon = icons[group.icon];
                return (
                  <Tooltip key={group.name}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleGroupClick(group.name)}
                        className={cn(
                          'group relative flex items-center justify-center w-full h-10 rounded-xl transition-all duration-300',
                          isActive
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md shadow-blue-500/25'
                            : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-100'
                        )}
                      >
                        <Icon className={cn(
                          'w-5 h-5 transition-all duration-300',
                          isActive ? 'scale-100' : 'group-hover:scale-110'
                        )} />
                        
                        {isActive && (
                          <motion.div
                            layoutId="sidebar-active-indicator"
                            className="absolute -left-2 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-600 rounded-r-full"
                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                          />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="bg-slate-900 dark:bg-slate-800 text-white border-slate-700 font-medium">
                      <span className="capitalize">{t(`groups.${group.name}`)}</span>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </nav>

            {/* User Profile & Logout */}
            <div className="border-t border-slate-200 dark:border-slate-800/50 p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative flex items-center justify-center w-full h-10 rounded-xl hover:bg-white dark:hover:bg-slate-800 shadow-sm hover:shadow transition-all cursor-pointer group border border-transparent hover:border-slate-200 dark:hover:border-slate-700">
                    <div className="relative">
                      <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                        {user?.firstName?.[0]}{user?.lastName?.[0]}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border-2 border-white dark:border-slate-950 rounded-full ring-1 ring-white/20"></div>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-slate-900 dark:bg-slate-800 text-white border-slate-700">
                  <div className="space-y-1">
                    <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-slate-400">{user?.email}</p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full h-10 p-0 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 rounded-xl"
                    onClick={logout}
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right" className="bg-red-600 text-white border-red-700 font-medium">
                  <span>{t('logout')}</span>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </motion.aside>

        {/* Expanded Submenu Panel (240px) */}
        <AnimatePresence>
          {activeGroup && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 240, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800/50 shadow-xl overflow-hidden z-40"
            >
              <div className="flex h-full flex-col w-[240px]">
                {/* Panel Header */}
                <div className="h-16 flex items-center justify-between px-5 border-b border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/50">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 capitalize flex items-center gap-2">
                    {activeGroup ? (
                      <>
                        {React.createElement(icons[userNavigationGroups.find(g => g.name === activeGroup)?.icon || 'home'], { className: "w-4 h-4 text-blue-600" })}
                        {t(`groups.${activeGroup}`)}
                      </>
                    ) : ''}
                  </h2>
                  <button
                    onClick={() => {
                      setActiveGroup(null);
                      setIsCollapsed(true);
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-all"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                {/* Panel Items */}
                <nav className="flex-1 overflow-y-auto p-3 space-y-1">
                  {userNavigationGroups
                    .find((g) => g.name === activeGroup)
                    ?.items.filter((item) => {
                      if ((item.href === '/dashboard/customize' || item.href === '/dashboard/permissions') && user?.role !== 'admin') {
                        return false;
                      }
                      return true;
                    })
                    .map((item) => {
                      const isActive = isActivePath(item.href);
                      const ItemIcon = icons[item.icon];
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={handleItemClick}
                          className={cn(
                            'group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative overflow-hidden',
                            isActive
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'
                          )}
                        >
                          {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-600 rounded-r-full" />
                          )}
                          
                          <ItemIcon className={cn(
                            'w-4 h-4 transition-all duration-200',
                            isActive 
                              ? 'text-blue-600 dark:text-blue-400' 
                              : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                          )} />
                          
                          <span className="text-sm font-medium flex-1 truncate">{t(item.name)}</span>
                          
                          {item.badge && (
                            <Badge 
                              variant="secondary" 
                              className={cn(
                                "text-[10px] px-1.5 py-0 h-4 font-bold tracking-wide",
                                isActive 
                                  ? "bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-200"
                                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                              )}
                            >
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      );
                    })}
                </nav>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
