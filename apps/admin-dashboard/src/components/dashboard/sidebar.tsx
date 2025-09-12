'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { usePathname } from '@/i18n.config';
import {
  Home,
  Ticket,
  Users,
  MessageSquare,
  LogOut,
  X,
  UserCog,
  Shield,
  TrendingUp,
  Brain,
  Zap,
  LayoutDashboard,
  KeyRound,
  ChevronDown,
  Settings,
  
  
  Plus,
  Briefcase
} from 'lucide-react';
import { Link } from '@/i18n.config';
import Image from 'next/image';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTheme } from '@/components/theme-provider';

// Navigation structure with modern grouping
const navigationGroups = {
  main: [
    { name: 'dashboard', href: '/dashboard', icon: Home, badge: null },
    { name: 'agent_dashboard', href: '/agent', icon: LayoutDashboard, badge: 'NEW' },
    { name: 'tickets', href: '/dashboard/tickets', icon: Ticket, badge: '12' },
    { name: 'conversations', href: '/conversations', icon: MessageSquare, badge: '3' },
  ],
  manage: [
    { name: 'customers', href: '/dashboard/customers', icon: Users, badge: null },
    { name: 'teams', href: '/dashboard/teams', icon: Users, badge: null },
    { name: 'agents', href: '/dashboard/agents', icon: UserCog, badge: null },
    { name: 'crm', href: '/dashboard/crm', icon: Briefcase, badge: 'NEW' },
  ],
  insights: [
    { name: 'analytics', href: '/dashboard/analytics', icon: TrendingUp, badge: null },
    { name: 'ai_intelligence', href: '/dashboard/ai-intelligence', icon: Brain, badge: 'NEW' },
    { name: 'coaching', href: '/dashboard/coaching', icon: Brain, badge: 'NEW' },
    { name: 'knowledge', href: '/dashboard/knowledge', icon: Brain, badge: null },
  ],
  automation: [
    { name: 'workflows', href: '/dashboard/workflows', icon: Zap, badge: null },
    { name: 'marketplace', href: '/dashboard/marketplace', icon: Zap, badge: null },
    { name: 'marketing', href: '/dashboard/marketing', icon: Zap, badge: 'NEW' },
    { name: 'integrations', href: '/dashboard/integrations', icon: Zap, badge: 'NEW' },
  ],
  settings: [
    { name: 'customize_dashboard', href: '/dashboard/customize', icon: LayoutDashboard, badge: null },
    { name: 'permissions', href: '/dashboard/permissions', icon: KeyRound, badge: null },
    { name: 'admin_settings', href: '/dashboard/admin-settings', icon: Shield, badge: null },
  ]
};

// Agent-specific navigation (locale-aware destinations are handled by <Link>)
const agentNavigation = [
  { name: 'conversations', href: '/conversations', icon: MessageSquare, badge: '3' },
  { name: 'tickets', href: '/dashboard/tickets', icon: Ticket, badge: '12' },
  { name: 'knowledge', href: '/agent/knowledge', icon: Brain, badge: null },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const t = useTranslations();
  const pathname = usePathname();
  const { logout, user } = useAuthStore();
  const { brand } = useTheme();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    main: true,
    manage: true,
    insights: false,
    automation: false,
    settings: false
  });

  // Determine navigation based on user role
  const getNavigationGroups = () => {
    if (user?.role === 'admin') {
      return navigationGroups;
    }
    if (user?.role === 'agent') {
      return {
        main: [
          { name: 'agent_dashboard', href: '/agent', icon: LayoutDashboard, badge: null },
          ...agentNavigation,
        ],
      };
    }
    return { main: [] };
  };

  const userNavigationGroups = getNavigationGroups();

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };

  const isActivePath = (href: string) => {
    // Ensure locale-aware matching by normalizing pathname without locale segment
    // Pathname already locale-prefixed in this app, so check endsWith or exact segment match
    try {
      if (!pathname) return false;
      if (href === '/dashboard') {
        return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
      }
      return pathname === href || pathname.startsWith(`${href}/`);
    } catch {
      return false;
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-72 bg-white/95 dark:bg-gray-950/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 lg:fixed lg:translate-x-0 shadow-xl lg:shadow-none transition-transform duration-300',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-800/50">
            <motion.div 
              className="flex items-center space-x-3"
              whileHover={{ scale: 1.02 }}
            >
              {brand?.logoUrl ? (
                <Image src={brand.logoUrl} alt="logo" width={96} height={24} className="h-7 w-auto" unoptimized />
              ) : (
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl blur opacity-75"></div>
                  <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                    <Ticket className="h-5 w-5 text-white" />
                  </div>
                </div>
              )}
              {!brand?.logoUrl && (
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {brand?.name || 'Glavito'}
                  </h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('navigation.supportPlatform')}</p>
                </div>
              )}
            </motion.div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-8 w-8 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="p-4 border-b border-gray-200/50 dark:border-gray-800/50">
            <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              <Plus className="h-4 w-4 mr-2" />
              {t('navigation.newTicket')}
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 space-y-6">
            {Object.entries(userNavigationGroups).map(([groupName, items]) => (
              <div key={groupName}>
                {/* Group Header */}
                {user?.role === 'admin' && (
                  <button
                    onClick={() => toggleGroup(groupName)}
                    className="flex items-center justify-between w-full text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                  >
                    <span>{t(`navigation.groups.${groupName}`)}</span>
                    <motion.div
                      animate={{ rotate: expandedGroups[groupName] ? 0 : -90 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </motion.div>
                  </button>
                )}

                {/* Group Items */}
                <AnimatePresence>
                  {(user?.role !== 'admin' || expandedGroups[groupName]) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-1"
                    >
                      {items
                        .filter((item) => {
                          if ((item.href === '/dashboard/customize' || item.href === '/dashboard/permissions') && user?.role !== 'admin') {
                            return false;
                          }
                          return true;
                        })
                        .map((item) => {
                          const isActive = isActivePath(item.href);
                          return (
                            <motion.div
                              key={item.name}
                              whileHover={{ x: 4 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <Link
                                href={item.href}
                                className={cn(
                                  'group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 relative overflow-hidden',
                                  isActive
                                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 dark:from-blue-950/50 dark:to-purple-950/50 dark:text-blue-300 shadow-sm border border-blue-200/50 dark:border-blue-800/50'
                                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'
                                )}
                                onClick={onClose}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className={cn(
                                    'p-1.5 rounded-lg transition-colors',
                                    isActive 
                                      ? 'bg-blue-100 dark:bg-blue-900/50' 
                                      : 'group-hover:bg-gray-100 dark:group-hover:bg-gray-700'
                                  )}>
                                    <item.icon className={cn(
                                      'h-4 w-4 transition-colors',
                                      isActive 
                                        ? 'text-blue-600 dark:text-blue-400' 
                                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-300'
                                    )} />
                                  </div>
                                  <span>{t(`navigation.${item.name}`)}</span>
                                </div>
                                {item.badge && (
                                  <Badge 
                                    variant={item.badge === 'NEW' ? 'default' : 'secondary'} 
                                    className={cn(
                                      'text-xs px-2 py-0.5',
                                      item.badge === 'NEW' 
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                    )}
                                  >
                                    {item.badge}
                                  </Badge>
                                )}
                                {isActive && (
                                  <motion.div
                                    layoutId="activeTab"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl"
                                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                  />
                                )}
                              </Link>
                            </motion.div>
                          );
                        })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </nav>

          {/* User Profile */}
          <div className="border-t border-gray-200/50 dark:border-gray-800/50 p-4">
            <motion.div 
              className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer mb-3"
              whileHover={{ scale: 1.02 }}
            >
              <div className="relative">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-950 rounded-full"></div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user?.email}
                </p>
                <Badge variant="outline" className="text-xs mt-1 capitalize">
                  {user?.role}
                </Badge>
              </div>
              <Settings className="h-4 w-4 text-gray-400" />
            </motion.div>
            
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 transition-all duration-200 rounded-xl"
                onClick={logout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t('navigation.logout')}
              </Button>
            </motion.div>
          </div>
        </div>
      </motion.aside>
    </>
  );
}