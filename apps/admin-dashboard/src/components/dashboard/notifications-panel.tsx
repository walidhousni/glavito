'use client';

import React, { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Bell, CheckCheck, X, Settings, Filter, Tag, User, Clock, AlertTriangle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useNotificationStore } from '@/lib/store/notification-store';
import { useRouter } from 'next/navigation';
import { useNotificationsWebSocket } from '@/lib/hooks/use-notifications-websocket';

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  
  const t = useTranslations('notifications');
  const router = useRouter();
  
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotificationStore();

  const { isConnected } = useNotificationsWebSocket();

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications().catch((err) => {
      console.error('Failed to fetch notifications:', err);
    });
  }, [fetchNotifications]);

  // Format timestamp
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return t('justNow', { fallback: 'Just now' });
    if (minutes < 60) return t('minutesAgo', { fallback: `${minutes}m ago`, count: minutes });
    if (hours < 24) return t('hoursAgo', { fallback: `${hours}h ago`, count: hours });
    if (days < 7) return t('daysAgo', { fallback: `${days}d ago`, count: days });
    
    return date.toLocaleDateString();
  };

  // Handle notification click
  const handleNotificationClick = (notification: typeof notifications[0]) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'ticket' && notification.metadata?.ticketId) {
      router.push(`/dashboard/tickets?ticket=${notification.metadata.ticketId}`);
    } else if (notification.type === 'conversation' && notification.metadata?.conversationId) {
      router.push(`/dashboard/tickets?conversation=${notification.metadata.conversationId}`);
    } else if (notification.type === 'customer' && notification.metadata?.customerId) {
      router.push(`/dashboard/customers?id=${notification.metadata.customerId}`);
    } else if ((notification.type === 'sla') && notification.metadata?.ticketId) {
      router.push(`/dashboard/tickets?ticket=${notification.metadata.ticketId}`);
    } else if (notification.metadata?.url) {
      router.push(notification.metadata.url);
    }
    
    setOpen(false);
  };

  // Dismiss notification
  const dismissNotification = (notificationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notificationId);
  };

  // Filter notifications
  const filteredNotifications = filter === 'unread' 
    ? notifications.filter((n) => !n.isRead)
    : notifications;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 rounded-full"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] animate-pulse"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">{t('notifications', { fallback: 'Notifications' })}</span>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent
        align="end"
        className="w-[420px] p-0"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-sm">
              {t('title', { fallback: 'Notifications' })}
            </h3>
            {!isConnected && (
              <Badge variant="outline" className="text-[10px]">
                {t('offline', { fallback: 'Offline' })}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setFilter(filter === 'all' ? 'unread' : 'all')}
            >
              <Filter className="h-3.5 w-3.5" />
            </Button>
            
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={markAllAsRead}
              >
                <CheckCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => {
                router.push('/dashboard/notifications');
                setOpen(false);
              }}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Notifications List */}
        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading notifications...</p>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Bell className="h-12 w-12 text-muted-foreground mb-3 opacity-30" />
              <p className="text-sm text-muted-foreground">
                {filter === 'unread'
                  ? t('noUnread', { fallback: 'No unread notifications' })
                  : t('noNotifications', { fallback: 'No notifications yet' })}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    'flex items-start gap-3 p-3 cursor-pointer hover:bg-accent transition-colors group',
                    !notification.isRead && 'bg-blue-50/50 dark:bg-blue-950/20',
                  )}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={cn(
                      'h-8 w-8 rounded-full flex items-center justify-center',
                      notification.type === 'ticket' && 'bg-blue-100 dark:bg-blue-900/20',
                      notification.type === 'customer' && 'bg-purple-100 dark:bg-purple-900/20',
                      notification.type === 'system' && 'bg-gray-100 dark:bg-gray-900/20',
                      notification.type === 'sla' && 'bg-red-100 dark:bg-red-900/20',
                      notification.type === 'team' && 'bg-green-100 dark:bg-green-900/20',
                      notification.type === 'conversation' && 'bg-indigo-100 dark:bg-indigo-900/20',
                    )}>
                      {notification.type === 'ticket' && <Tag className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                      {notification.type === 'customer' && <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />}
                      {notification.type === 'system' && <Settings className="h-4 w-4 text-gray-600 dark:text-gray-400" />}
                      {notification.type === 'sla' && <Clock className="h-4 w-4 text-red-600 dark:text-red-400" />}
                      {notification.type === 'team' && <AlertTriangle className="h-4 w-4 text-green-600 dark:text-green-400" />}
                      {notification.type === 'conversation' && <Bell className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn(
                        'text-sm font-medium leading-snug',
                        !notification.isRead && 'font-semibold',
                      )}>
                        {notification.title}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => dismissNotification(notification.id, e)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-[10px] text-muted-foreground">
                        {formatTimestamp(notification.createdAt)}
                      </span>
                      {!notification.isRead && (
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {filteredNotifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2">
              <Button
                variant="ghost"
                className="w-full text-xs h-8"
                onClick={() => {
                  router.push('/dashboard/notifications');
                  setOpen(false);
                }}
              >
                {t('viewAll', { fallback: 'View all notifications' })}
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
