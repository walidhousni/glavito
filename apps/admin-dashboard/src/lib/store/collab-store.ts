/**
 * Collaboration Store
 * Manages presence, typing indicators, and room state
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'busy' | 'offline';
  lastSeen: string; // ISO date string
}

interface TypingUser {
  userId: string;
  isTyping: boolean;
  timestamp: number; // Unix timestamp
}

interface CollabState {
  // Global presence map (userId -> presence)
  globalPresence: Record<string, UserPresence>;
  // Room-specific states
  roomStates: Record<string, {
    activeUsers: string[]; // Array of userIds currently in the room
    typingUsers: Record<string, TypingUser>; // userId -> TypingUser
  }>;
  // Actions
  setGlobalPresence: (userId: string, status: UserPresence['status']) => void;
  updateRoomPresence: (roomId: string, userId: string, status: UserPresence['status']) => void;
  userJoinedRoom: (roomId: string, userId: string) => void;
  userLeftRoom: (roomId: string, userId: string) => void;
  setTyping: (roomId: string, userId: string, isTyping: boolean) => void;
  clearTyping: (roomId: string, userId: string) => void;
  initializeRoomState: (roomId: string, initialUsers?: string[]) => void;
  removeRoomState: (roomId: string) => void;
}

export const useCollabStore = create<CollabState>()(
  immer((set, get) => ({
    globalPresence: {},
    roomStates: {},

    setGlobalPresence: (userId, status) => {
      set((state) => {
        state.globalPresence[userId] = { userId, status, lastSeen: new Date().toISOString() };
      });
    },

    initializeRoomState: (roomId, initialUsers = []) => {
      set((state) => {
        if (!state.roomStates[roomId]) {
          state.roomStates[roomId] = {
            activeUsers: initialUsers,
            typingUsers: {},
          };
        } else {
          // Merge initial users if state already exists
          state.roomStates[roomId].activeUsers = Array.from(new Set([...state.roomStates[roomId].activeUsers, ...initialUsers]));
        }
      });
    },

    userJoinedRoom: (roomId, userId) => {
      set((state) => {
        if (!state.roomStates[roomId]) {
          state.roomStates[roomId] = { activeUsers: [], typingUsers: {} };
        }
        if (!state.roomStates[roomId].activeUsers.includes(userId)) {
          state.roomStates[roomId].activeUsers.push(userId);
        }
        // Also update global presence
        state.globalPresence[userId] = { userId, status: 'online', lastSeen: new Date().toISOString() };
      });
    },

    userLeftRoom: (roomId, userId) => {
      set((state) => {
        if (state.roomStates[roomId]) {
          state.roomStates[roomId].activeUsers = state.roomStates[roomId].activeUsers.filter((id) => id !== userId);
          delete state.roomStates[roomId].typingUsers[userId]; // Clear typing status
        }
      });
    },

    updateRoomPresence: (roomId, userId, status) => {
      set((state) => {
        if (!state.roomStates[roomId]) {
          state.roomStates[roomId] = { activeUsers: [], typingUsers: {} };
        }
        if (status === 'offline') {
          state.roomStates[roomId].activeUsers = state.roomStates[roomId].activeUsers.filter((id) => id !== userId);
        } else if (!state.roomStates[roomId].activeUsers.includes(userId)) {
          state.roomStates[roomId].activeUsers.push(userId);
        }
        state.globalPresence[userId] = { userId, status, lastSeen: new Date().toISOString() };
      });
    },

    setTyping: (roomId, userId, isTyping) => {
      set((state) => {
        if (!state.roomStates[roomId]) {
          state.roomStates[roomId] = { activeUsers: [], typingUsers: {} };
        }
        if (isTyping) {
          state.roomStates[roomId].typingUsers[userId] = { userId, isTyping: true, timestamp: Date.now() };
        } else {
          delete state.roomStates[roomId].typingUsers[userId];
        }
      });
    },

    clearTyping: (roomId, userId) => {
      set((state) => {
        if (state.roomStates[roomId]) {
          delete state.roomStates[roomId].typingUsers[userId];
        }
      });
    },

    removeRoomState: (roomId) => {
      set((state) => {
        delete state.roomStates[roomId];
      });
    },
  }))
);
