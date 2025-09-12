import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore, type Notification } from '@/lib/store/notification-store';
import { useAuth } from '@/lib/hooks/use-auth';

interface NotificationEvents {
  'notification.created': (payload: Notification) => void;
  'notification.updated': (payload: Notification) => void;
  'notification.deleted': (payload: { id: string }) => void;
  'notification.marked_read': (payload: { id: string }) => void;
  'notification.marked_all_read': (payload: { userId: string }) => void;
}

export function useNotificationsWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const {
    addNotification,
    deleteNotification,
    markAsRead,
    clearAllNotifications,
    fetchNotifications,
  } = useNotificationStore();

  useEffect(() => {
    if (!user?.id) return;

    // Initialize socket connection
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001', {
      auth: {
        token: localStorage.getItem('auth_token'),
      },
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Join user-specific notification room
    socket.emit('join_notifications', { userId: user.id });

    // Set up event listeners
    socket.on('connect', () => {
      console.log('Connected to notifications WebSocket');
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from notifications WebSocket');
    });

    socket.on('notification.created', (payload: Notification) => {
      addNotification(payload);
    });

    socket.on('notification.updated', (payload: Notification) => {
      // Refresh notifications to get updated data
      fetchNotifications();
    });

    socket.on('notification.deleted', (payload: { id: string }) => {
      deleteNotification(payload.id);
    });

    socket.on('notification.marked_read', (payload: { id: string }) => {
      markAsRead(payload.id);
    });

    socket.on('notification.marked_all_read', () => {
      clearAllNotifications();
    });

    socket.on('error', (error: any) => {
      console.error('Notifications WebSocket error:', error);
    });

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave_notifications', { userId: user.id });
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [user?.id, addNotification, deleteNotification, markAsRead, clearAllNotifications, fetchNotifications]);

  return {
    socket: socketRef.current,
    isConnected: socketRef.current?.connected || false,
  };
}