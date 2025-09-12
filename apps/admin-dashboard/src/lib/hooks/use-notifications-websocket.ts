'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '../store/notification-store';

export interface NotificationEventPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  priority: string;
  category: string;
  actionUrl?: string;
  createdAt: string;
  userId: string;
  tenantId: string;
}

export interface NotificationWebSocketEvents {
  'notification.created': NotificationEventPayload;
  'notification.updated': NotificationEventPayload;
  'notification.read': { id: string; userId: string; tenantId: string };
  'notification.deleted': { id: string; userId: string; tenantId: string };
  'notifications.read_all': { userId: string; tenantId: string };
  'notifications.cleared': { userId: string; tenantId: string };
}

export interface UseNotificationsWebSocketOptions {
  userId?: string;
  tenantId?: string;
  autoConnect?: boolean;
  onNotificationCreated?: (payload: NotificationEventPayload) => void;
  onNotificationUpdated?: (payload: NotificationEventPayload) => void;
  onNotificationRead?: (payload: { id: string; userId: string; tenantId: string }) => void;
  onNotificationDeleted?: (payload: { id: string; userId: string; tenantId: string }) => void;
  onNotificationsReadAll?: (payload: { userId: string; tenantId: string }) => void;
  onNotificationsCleared?: (payload: { userId: string; tenantId: string }) => void;
}

export function useNotificationsWebSocket(options: UseNotificationsWebSocketOptions = {}) {
  const {
    userId,
    tenantId,
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
  const { addNotification, updateNotification, removeNotification, markAsRead, clearAll } = useNotificationStore();

  useEffect(() => {
    if (!autoConnect || !userId || !tenantId) return;

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
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      
      // Join user-specific room for notifications
      socket.emit('join_user_room', { userId, tenantId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      setIsConnected(false);
    });

    // Notification event handlers
    socket.on('notification.created', (payload: NotificationEventPayload) => {
      // Add to store
      addNotification({
        id: payload.id,
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        isRead: payload.isRead,
        priority: payload.priority as 'low' | 'medium' | 'high' | 'urgent',
        category: payload.category,
        actionUrl: payload.actionUrl,
        createdAt: payload.createdAt,
      });
      
      // Call custom handler
      onNotificationCreated?.(payload);
    });

    socket.on('notification.updated', (payload: NotificationEventPayload) => {
      // Update in store
      updateNotification(payload.id, {
        type: payload.type,
        title: payload.title,
        message: payload.message,
        data: payload.data,
        isRead: payload.isRead,
        priority: payload.priority as 'low' | 'medium' | 'high' | 'urgent',
        category: payload.category,
        actionUrl: payload.actionUrl,
      });
      
      // Call custom handler
      onNotificationUpdated?.(payload);
    });

    socket.on('notification.read', (payload: { id: string; userId: string; tenantId: string }) => {
      // Mark as read in store
      markAsRead(payload.id);
      
      // Call custom handler
      onNotificationRead?.(payload);
    });

    socket.on('notification.deleted', (payload: { id: string; userId: string; tenantId: string }) => {
      // Remove from store
      removeNotification(payload.id);
      
      // Call custom handler
      onNotificationDeleted?.(payload);
    });

    socket.on('notifications.read_all', (payload: { userId: string; tenantId: string }) => {
      // Mark all as read in store
      useNotificationStore.getState().markAllAsRead();
      
      // Call custom handler
      onNotificationsReadAll?.(payload);
    });

    socket.on('notifications.cleared', (payload: { userId: string; tenantId: string }) => {
      // Clear all notifications in store
      clearAll();
      
      // Call custom handler
      onNotificationsCleared?.(payload);
    });

    // Cleanup on unmount
    return () => {
      if (socket.connected) {
        socket.emit('leave_user_room', { userId, tenantId });
      }
      socket.disconnect();
    };
  }, [userId, tenantId, autoConnect, onNotificationCreated, onNotificationUpdated, onNotificationRead, onNotificationDeleted, onNotificationsReadAll, onNotificationsCleared, addNotification, updateNotification, removeNotification, markAsRead, clearAll]);

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

// Hook for automatic notification updates with auth context
export function useNotificationUpdates() {
  const [lastNotification, setLastNotification] = useState<NotificationEventPayload | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  
  // Get user info from auth store (you may need to adjust this based on your auth implementation)
  const [userId, setUserId] = useState<string | null>(null);
  const [tenantId, setTenantId] = useState<string | null>(null);
  
  useEffect(() => {
    // Get user info from auth storage
    if (typeof window !== 'undefined') {
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const user = parsed?.state?.user;
          if (user) {
            setUserId(user.id);
            setTenantId(user.tenantId);
          }
        }
      } catch {
        // Handle error silently
      }
    }
  }, []);
  
  const { isConnected, connectionError } = useNotificationsWebSocket({
    userId: userId || undefined,
    tenantId: tenantId || undefined,
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