import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api/config';

export interface Notification {
  id: string;
  type: 'ticket' | 'customer' | 'system' | 'sla' | 'team' | 'conversation';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  tenantId: string;
  metadata?: {
    ticketId?: string;
    customerId?: string;
    agentId?: string;
    teamId?: string;
    url?: string;
    [key: string]: any;
  };
}

export interface NotificationPreferences {
  email: {
    newTickets: boolean;
    customerReplies: boolean;
    slaBreaches: boolean;
    teamMentions: boolean;
    systemUpdates: boolean;
  };
  inApp: {
    newTickets: boolean;
    customerReplies: boolean;
    slaBreaches: boolean;
    teamMentions: boolean;
    systemUpdates: boolean;
  };
  push: {
    newTickets: boolean;
    customerReplies: boolean;
    slaBreaches: boolean;
    teamMentions: boolean;
    systemUpdates: boolean;
  };
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchNotifications: () => Promise<void>;
  fetchPreferences: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;
  addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

const defaultPreferences: NotificationPreferences = {
  email: {
    newTickets: true,
    customerReplies: true,
    slaBreaches: true,
    teamMentions: true,
    systemUpdates: false,
  },
  inApp: {
    newTickets: true,
    customerReplies: true,
    slaBreaches: true,
    teamMentions: true,
    systemUpdates: true,
  },
  push: {
    newTickets: false,
    customerReplies: true,
    slaBreaches: true,
    teamMentions: true,
    systemUpdates: false,
  },
};

export const useNotificationStore = create<NotificationState>()(
  persist(
    (set, get) => ({
      notifications: [],
      unreadCount: 0,
      preferences: defaultPreferences,
      isLoading: false,
      error: null,

      fetchNotifications: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/notifications');
          // Handle both wrapped and unwrapped responses
          const data = response.data;
          const notifications = Array.isArray(data) 
            ? data 
            : Array.isArray(data?.data) 
              ? data.data 
              : [];
          
          // Ensure notifications have correct format
          const normalizedNotifications: Notification[] = notifications.map((n: any) => ({
            id: n.id,
            type: n.type as Notification['type'],
            title: n.title || '',
            message: n.message || '',
            priority: (n.priority || 'low') as Notification['priority'],
            isRead: n.isRead ?? false,
            createdAt: n.createdAt || new Date().toISOString(),
            updatedAt: n.updatedAt || new Date().toISOString(),
            userId: n.userId || '',
            tenantId: n.tenantId || '',
            metadata: n.metadata || {},
          }));
          
          const unreadCount = normalizedNotifications.filter((n) => !n.isRead).length;
          
          set({ 
            notifications: normalizedNotifications, 
            unreadCount,
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Failed to fetch notifications:', error);
          set({ 
            error: error.response?.data?.message || error.message || 'Failed to fetch notifications',
            isLoading: false 
          });
        }
      },

      fetchPreferences: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.get('/notifications/preferences');
          const prefs = response.data || {};
          const merged: NotificationPreferences = {
            email: {
              ...defaultPreferences.email,
              ...(prefs.email || {}),
            },
            inApp: {
              ...defaultPreferences.inApp,
              ...(prefs.inApp || {}),
            },
            push: {
              ...defaultPreferences.push,
              ...(prefs.push || {}),
            },
          };
          set({ preferences: merged, isLoading: false });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to fetch notification preferences',
            isLoading: false 
          });
        }
      },

      markAsRead: async (notificationId: string) => {
        try {
          await api.patch(`/notifications/${notificationId}/read`);
          
          set((state) => ({
            notifications: state.notifications.map((n) =>
              n.id === notificationId ? { ...n, isRead: true } : n
            ),
            unreadCount: Math.max(0, state.unreadCount - 1),
          }));
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Failed to mark notification as read' });
        }
      },

      markAllAsRead: async () => {
        try {
          await api.patch('/notifications/read-all');
          
          set((state) => ({
            notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
            unreadCount: 0,
          }));
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Failed to mark all notifications as read' });
        }
      },

      deleteNotification: async (notificationId: string) => {
        try {
          await api.delete(`/notifications/${notificationId}`);
          
          set((state) => {
            const notification = state.notifications.find(n => n.id === notificationId);
            const wasUnread = notification && !notification.isRead;
            
            return {
              notifications: state.notifications.filter((n) => n.id !== notificationId),
              unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
            };
          });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Failed to delete notification' });
        }
      },

      clearAllNotifications: async () => {
        try {
          await api.delete('/notifications');
          
          set({ 
            notifications: [], 
            unreadCount: 0 
          });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Failed to clear notifications' });
        }
      },

      updatePreferences: async (newPreferences: Partial<NotificationPreferences> | NotificationPreferences) => {
        try {
          const currentPrefs = get().preferences;
          const updatedPreferences: NotificationPreferences = {
            email: { ...currentPrefs.email, ...(newPreferences.email || {}) },
            inApp: { ...currentPrefs.inApp, ...(newPreferences.inApp || {}) },
            push: { ...currentPrefs.push, ...(newPreferences.push || {}) },
          };
          
          await api.patch('/notifications/preferences', updatedPreferences);
          
          set({ preferences: updatedPreferences });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Failed to update preferences' });
          throw error;
        }
      },

      addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newNotification: Notification = {
          ...notification,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isRead: false, // Default unread
        };
        
        set((state) => {
          const nextUnread = state.unreadCount + (!newNotification.isRead ? 1 : 0);
          return {
            notifications: [newNotification, ...state.notifications],
            unreadCount: nextUnread,
          };
        });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'notification-storage',
      partialize: (state) => ({
        preferences: state.preferences,
      }),
    }
  )
);