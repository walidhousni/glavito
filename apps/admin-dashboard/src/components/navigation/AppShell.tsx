'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations, useLocale } from 'next-intl';
import { 
  Menu, 
  Bell, 
  Settings, 
  HelpCircle, 
  Sun, 
  Moon, 
  Monitor,
  ChevronDown,
  Plus,
  Globe,
  Search,
  LogOut
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth-store';
import { useTheme } from '@/components/theme-provider';
import { Sidebar } from '@/components/dashboard/sidebar';
import { CreateTicketDialog } from '@/components/tickets/create-ticket-dialog';
import { useNotificationStore } from '@/lib/store/notification-store';
import { SearchDropdown } from '@/components/search/SearchDropdown';
import { useNotificationsWebSocket } from '@/lib/hooks/use-notifications-websocket';
import { useSidebarStore } from '@/lib/store/sidebar-store';
import { useAgentAvailability } from '@/hooks/use-agent-availability';
import { UpgradePrompt } from '@/components/billing/upgrade-prompt';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const t = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [showCreate, setShowCreate] = useState(false);
  const { isCollapsed } = useSidebarStore();
  const { availability, updateAvailability, loading: availabilityLoading } = useAgentAvailability();

  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  useNotificationsWebSocket();

  useEffect(() => {
    fetchNotifications().catch((e) => console.debug('fetchNotifications failed', e));
  }, [fetchNotifications]);

  const handleAvailabilityToggle = (checked: boolean) => {
    updateAvailability(checked ? 'available' : 'offline');
  };

  const isOnline = availability !== 'offline';

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#0f172a]">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <motion.div
        animate={{ paddingLeft: isCollapsed ? 60 : 280 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="lg:pl-[60px] min-h-screen flex flex-col transition-all duration-300"
      >
        {/* Top Navigation */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800/50">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Search */}
              <div className="relative w-80 hidden md:block">
                <SearchDropdown
                  placeholder={t('searchPlaceholder')}
                  className="w-full"
                />
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Quick Actions */}
              <Button
                variant="outline"
                size="sm"
                className="hidden sm:flex bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-md hover:shadow-lg transition-all duration-200 rounded-full px-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                {t('createTicket')}
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden sm:block" />

              {/* Theme Toggle */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                    {theme === 'light' && <Sun className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
                    {theme === 'dark' && <Moon className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
                    {theme === 'system' && <Monitor className="h-4 w-4 text-slate-600 dark:text-slate-400" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>{t('theme')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTheme('light')}>
                    <Sun className="h-4 w-4 mr-2" />
                    {t('light')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('dark')}>
                    <Moon className="h-4 w-4 mr-2" />
                    {t('dark')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme('system')}>
                    <Monitor className="h-4 w-4 mr-2" />
                    {t('system')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0 relative rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Bell className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    {unreadCount > 0 && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-slate-950"
                      />
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel className="flex items-center justify-between">
                    {t('notifications')}
                    <Badge variant="secondary" className="text-xs">
                      {unreadCount} {t('new')}
                    </Badge>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-sm text-muted-foreground">
                        No new notifications
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <DropdownMenuItem key={n.id} className="flex flex-col items-start p-3 cursor-pointer" onClick={() => { if (!n.isRead) markAsRead(n.id).catch((e) => console.debug('markAsRead failed', e)); }}>
                          <div className="flex items-center justify-between w-full">
                            <p className={cn('text-sm', !n.isRead ? 'font-semibold text-slate-900 dark:text-slate-100' : 'font-normal text-slate-600 dark:text-slate-400')}>
                              {n.title}
                            </p>
                            {!n.isRead && (
                              <div className="h-1.5 w-1.5 bg-blue-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-slate-400 mt-1.5">{new Date(n.createdAt).toLocaleString()}</p>
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <div className="px-3 pb-2 flex items-center justify-between">
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => markAllAsRead().catch((e) => console.debug('markAllAsRead failed', e))}>{t('markAllRead')}</Button>
                    <Link href="/dashboard/notifications">
                      <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700">
                        {t('viewAll')}
                      </Button>
                    </Link>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* User Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-9 px-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                    <div className="flex items-center space-x-2">
                      <Avatar className="h-8 w-8 border-2 border-white dark:border-slate-800 shadow-sm">
                        <AvatarImage src={user?.avatar} />
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {user?.firstName?.[0]}{user?.lastName?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <ChevronDown className="h-3 w-3 text-slate-400 hidden sm:block" />
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
                      <p className="text-xs text-slate-500">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  
                  {/* Availability Status */}
                  <div className="px-2 py-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "h-2 w-2 rounded-full ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-950",
                          isOnline ? "bg-green-500 ring-green-500/20" : "bg-slate-400 ring-slate-400/20"
                        )} />
                        <span className="text-sm font-medium">{isOnline ? 'Online' : 'Offline'}</span>
                      </div>
                      <Switch
                        checked={isOnline}
                        onCheckedChange={handleAvailabilityToggle}
                        disabled={availabilityLoading}
                        className="scale-75"
                      />
                    </div>
                  </div>
                  
                  <DropdownMenuSeparator />
                  
                  {/* Language */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            <span>{t('language')}</span>
                          </div>
                          <ChevronDown className="h-4 w-4" />
                        </div>
                      </DropdownMenuItem>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      {['en', 'fr', 'ar'].map((loc) => {
                        const labels: Record<string, { label: string; flag: string }> = {
                          en: { label: 'English', flag: '🇬🇧' },
                          ar: { label: 'العربية', flag: '🇸🇦' },
                          fr: { label: 'Français', flag: '🇫🇷' },
                        };
                        const info = labels[loc];
                        const isActive = loc === locale;
                        return (
                          <DropdownMenuItem
                            key={loc}
                            onSelect={() => {
                              const newPath = pathname.replace(`/${locale}`, `/${loc}`);
                              router.push(newPath);
                            }}
                            className="flex w-full items-center"
                          >
                            <span className="mr-2 text-lg leading-none">{info.flag}</span>
                            <span className="flex-1">{info.label}</span>
                            {isActive && (
                              <span className="ml-2 text-xs text-blue-600 dark:text-blue-400 font-medium">Current</span>
                            )}
                          </DropdownMenuItem>
                        );
                      })}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <DropdownMenuSeparator />
                  
                  <DropdownMenuItem asChild>
                    <Link href={`/${locale}/dashboard/admin-settings`} className="flex items-center w-full cursor-pointer">
                      <Settings className="h-4 w-4 mr-2" />
                      {t('settings')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="cursor-pointer">
                    <HelpCircle className="h-4 w-4 mr-2" />
                    {t('help')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={logout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    {t('logout')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Upgrade Prompt Banner */}
        <div className="px-4 sm:px-6 lg:px-8 pt-6">
          <UpgradePrompt />
        </div>

        {/* Page Content */}
        <main className="flex-1">
          <div className="px-4 sm:px-6 lg:px-8 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        {/* Global Create Ticket Dialog */}
        <CreateTicketDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          onSuccess={() => setShowCreate(false)}
        />
      </motion.div>
    </div>
  );
}