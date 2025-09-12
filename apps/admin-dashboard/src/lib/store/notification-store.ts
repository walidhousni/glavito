import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '@/lib/api/config';

export interface Notification {
  id: string;
  type: 'ticket' | 'customer' | 'system' | 'sla' | 'team';
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
          const notifications = response.data;
          const unreadCount = notifications.filter((n: Notification) => !n.isRead).length;
          
          set({ 
            notifications, 
            unreadCount,
            isLoading: false 
          });
        } catch (error: any) {
          set({ 
            error: error.response?.data?.message || 'Failed to fetch notifications',
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

      updatePreferences: async (newPreferences: Partial<NotificationPreferences>) => {
        try {
          const updatedPreferences = { ...get().preferences, ...newPreferences };
          await api.patch('/notifications/preferences', updatedPreferences);
          
          set({ preferences: updatedPreferences });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Failed to update preferences' });
        }
      },

      addNotification: (notification: Omit<Notification, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newNotification: Notification = {
          ...notification,
          id: `temp-${Date.now()}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        set((state) => ({
          notifications: [newNotification, ...state.notifications],
          unreadCount: state.unreadCount + 1,
        }));
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