'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore, type Notification } from '../store/notification-store';
import { useAuth } from './use-auth';

export interface NotificationEventPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: string;
  category?: string;
  actionUrl?: string;
  createdAt: string;
  userId: string;
  tenantId: string;
  metadata?: Record<string, any>;
}

export interface UseNotificationsWebSocketOptions {
  autoConnect?: boolean;
  onNotificationCreated?: (payload: NotificationEventPayload) => void;
  onNotificationUpdated?: (payload: NotificationEventPayload) => void;
  onNotificationRead?: (payload: { id: string }) => void;
  onNotificationDeleted?: (payload: { id: string }) => void;
  onNotificationsReadAll?: () => void;
  onNotificationsCleared?: () => void;
}

/**
 * Unified WebSocket hook for notifications
 * Automatically connects using auth context and handles all notification events
 */
export function useNotificationsWebSocket(options: UseNotificationsWebSocketOptions = {}) {
  const {
    autoConnect = true,
    onNotificationCreated,
    onNotificationUpdated,
    onNotificationRead,
    onNotificationDeleted,
    onNotificationsReadAll,
    onNotificationsCleared,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const { user } = useAuth();
  const {
    addNotification,
    deleteNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    fetchNotifications,
  } = useNotificationStore();

  useEffect(() => {
    if (!autoConnect || !user?.id) return;

    // Get auth token from localStorage
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          token = parsed?.state?.tokens?.accessToken || null;
        }
      } catch {
        token = null;
      }
    }

    if (!token) {
      setConnectionError('No authentication token available');
      return;
    }

    // Create socket connection
    const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
    const socket = io(`${baseUrl}/notifications`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      // Join user room (already auto-joined by gateway, but explicit for clarity)
      socket.emit('join', { room: `user:${user.id}` });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Notification event handlers - match backend gateway events
    socket.on('notification.created', (payload: NotificationEventPayload | Notification) => {
      // Normalize payload to match Notification interface
      const normalized: Notification = {
        id: payload.id,
        type: (payload.type || 'system') as Notification['type'],
        title: payload.title || '',
        message: payload.message || '',
        priority: (payload.priority || 'low') as Notification['priority'],
        isRead: payload.isRead ?? false,
        createdAt: payload.createdAt || new Date().toISOString(),
        updatedAt: payload.updatedAt || new Date().toISOString(),
        userId: payload.userId || user.id,
        tenantId: payload.tenantId || user.tenantId,
        metadata: payload.metadata || payload.data || {},
      };
      
      addNotification(normalized);
      onNotificationCreated?.(payload as NotificationEventPayload);
    });

    socket.on('notification.updated', (payload: NotificationEventPayload | Notification) => {
      // Refresh notifications to get updated data
      fetchNotifications();
      onNotificationUpdated?.(payload as NotificationEventPayload);
    });

    socket.on('notification.marked_read', (payload: { id: string }) => {
      markAsRead(payload.id);
      onNotificationRead?.(payload);
    });

    socket.on('notification.deleted', (payload: { id: string }) => {
      deleteNotification(payload.id);
      onNotificationDeleted?.(payload);
    });

    socket.on('notification.marked_all_read', () => {
      markAllAsRead();
      onNotificationsReadAll?.();
    });

    socket.on('notification.cleared_all', () => {
      clearAllNotifications();
      onNotificationsCleared?.();
    });

    socket.on('notification.preferences_updated', () => {
      // Refresh preferences if needed
      fetchNotifications();
    });

    socket.on('error', (error: any) => {
      console.error('Notifications WebSocket error:', error);
      setConnectionError(error.message || 'WebSocket error');
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.emit('leave', { room: `user:${user.id}` });
      }
      socket.disconnect();
      socketRef.current = null;
    };
  }, [
    user?.id,
    user?.tenantId,
    autoConnect,
    onNotificationCreated,
    onNotificationUpdated,
    onNotificationRead,
    onNotificationDeleted,
    onNotificationsReadAll,
    onNotificationsCleared,
    addNotification,
    deleteNotification,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    fetchNotifications,
  ]);

  // Manual connection control
  const connect = () => {
    if (socketRef.current && !isConnected) {
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.disconnect();
    }
  };

  // Emit custom events
  const emit = (event: string, data: any) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    // Connection state
    isConnected,
    connectionError,
    
    // Connection control
    connect,
    disconnect,
    
    // Custom events
    emit,
    
    // Socket instance (for advanced usage)
    socket: socketRef.current,
  };
}

/**
 * Simplified hook for automatic notification updates
 * Uses auth context automatically
 */
export function useNotificationUpdates() {
  const [lastNotification, setLastNotification] = useState<NotificationEventPayload | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  const { isConnected, connectionError } = useNotificationsWebSocket({
    onNotificationCreated: (payload) => {
      setLastNotification(payload);
    },
  });
  
  useEffect(() => {
    if (isConnected) {
      setConnectionStatus('connected');
    } else if (connectionError) {
      setConnectionStatus('error');
    } else {
      setConnectionStatus('disconnected');
    }
  }, [isConnected, connectionError]);
  
  return {
    lastNotification,
    connectionStatus,
    connectionError,
    isConnected,
  };
}
