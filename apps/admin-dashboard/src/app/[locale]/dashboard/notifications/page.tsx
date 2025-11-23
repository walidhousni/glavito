'use client';

import React, { useEffect } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2, Check, Bell, Tag, User, Settings, Clock, AlertTriangle } from 'lucide-react';
import { useNotificationStore } from '@/lib/store/notification-store';
import { cn } from '@/lib/utils';
import { CheckedState } from "@radix-ui/react-checkbox";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    isLoading,
  } = useNotificationStore();

  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications().catch((err) => {
      console.error('Failed to fetch notifications:', err);
    });
  }, [fetchNotifications]);

  const filteredNotifications = notifications.filter(n => !showUnreadOnly || !n.isRead);

  const priorityColor = (p: string) => {
    switch (p) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const typeIcon = (t: string) => {
    switch (t) {
      case 'ticket': return <Tag className="h-4 w-4" />;
      case 'customer': return <User className="h-4 w-4" />;
      case 'system': return <Settings className="h-4 w-4" />;
      case 'sla': return <Clock className="h-4 w-4" />;
      case 'team': return <AlertTriangle className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <h1 className="text-xl font-semibold">Notifications</h1>
            <Badge variant="secondary" className="ml-2 text-xs">{unreadCount} unread</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled>
              Refresh
            </Button>
            <Button size="sm" disabled>
              <Check className="h-4 w-4 mr-1" /> Mark all read
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="space-x-2">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-6 w-6 rounded" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600" />
          <h1 className="text-xl font-semibold">Notifications</h1>
          <Badge variant="secondary" className="ml-2 text-xs">{unreadCount} unread</Badge>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox 
              checked={showUnreadOnly} 
              onCheckedChange={(v: CheckedState) => setShowUnreadOnly(v === true)} 
            />
            Show unread only
          </label>
          <Button variant="outline" size="sm" onClick={() => fetchNotifications()}>
            Refresh
          </Button>
          <Button size="sm" onClick={() => markAllAsRead()} disabled={unreadCount === 0}>
            <Check className="h-4 w-4 mr-1" /> Mark all read
          </Button>
        </div>
      </div>

      {filteredNotifications.length === 0 ? (
        <Card className="text-center">
          <CardContent className="py-12">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No notifications yet</h3>
            <p className="text-muted-foreground mb-6">Stay tuned for updates on tickets, customers, and system events.</p>
            <Button variant="outline" size="sm" onClick={() => fetchNotifications()}>
              Pull to refresh
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((n) => (
                    <TableRow key={n.id} className={cn(!n.isRead && 'bg-blue-50')}>
                      <TableCell>{typeIcon(n.type)} {n.type}</TableCell>
                      <TableCell className="font-medium hover:underline" onClick={() => {
                        // Link to related page if metadata has id
                        if (n.metadata?.ticketId) window.open(`/dashboard/tickets/${n.metadata.ticketId}`, '_blank');
                        else if (n.metadata?.customerId) window.open(`/dashboard/customers/${n.metadata.customerId}`, '_blank');
                        else if (n.metadata?.url) window.open(n.metadata.url, '_blank');
                      }}>
                        {n.title}
                      </TableCell>
                      <TableCell className="max-w-md">{n.message}</TableCell>
                      <TableCell>
                        <Badge className={priorityColor(n.priority)}>
                          {n.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(n.createdAt).toLocaleString()}</TableCell>
                      <TableCell className="space-x-2">
                        {!n.isRead && (
                          <Button variant="outline" size="sm" onClick={() => markAsRead(n.id)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => deleteNotification(n.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


