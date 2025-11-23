/**
 * Collaboration Socket.IO Client
 * Manages real-time connection for ticket and team collaboration
 */

import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

export interface CollabSocketEvents {
  // Connection events
  connected: (data: { userId: string; connectedAt: string }) => void;
  error: (data: { message: string }) => void;

  // Room events
  user_joined: (data: { room: string; userId: string; user: any; activeUsers: string[]; joinedAt: string }) => void;
  user_left: (data: { room: string; userId: string; activeUsers: string[]; leftAt: string }) => void;

  // Presence events
  presence_changed: (data: { room: string; userId: string; status: string; updatedAt?: string; activeUsers?: string[] }) => void;

  // Typing events
  typing_indicator: (data: { room: string; userId: string; user?: { firstName: string; lastName: string }; isTyping: boolean }) => void;

  // Ticket collaboration events
  note_created: (data: { ticketId: string; note: any }) => void;
  note_updated: (data: { ticketId: string; note: any }) => void;
  note_deleted: (data: { ticketId: string; noteId: string }) => void;
  reaction_added: (data: any) => void;
  reaction_removed: (data: { reactionId: string; targetId: string }) => void;
  checklist_updated: (data: { ticketId: string; subtask: any }) => void;
  subtask_deleted: (data: { ticketId: string; subtaskId: string }) => void;

  // Team room events
  message_created: (data: { channelId: string; message: any }) => void;
  message_deleted: (data: { channelId: string; messageId: string }) => void;

  // Mention notifications
  mention_notify: (data: any) => void;
}

export function initializeCollabSocket(apiUrl: string, token: string): Socket {
  if (socket && socket.connected) {
    return socket;
  }

  const socketUrl = apiUrl.replace(/^http/, 'ws').replace(/\/api$/, '');

  socket = io(`${socketUrl}/collab`, {
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('[CollabSocket] Connected:', socket?.id);
    reconnectAttempts = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('[CollabSocket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[CollabSocket] Connection error:', error.message);
    reconnectAttempts++;
    
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('[CollabSocket] Max reconnection attempts reached');
      socket?.disconnect();
    }
  });

  socket.on('error', (data) => {
    console.error('[CollabSocket] Error:', data.message);
  });

  return socket;
}

export function getCollabSocket(): Socket | null {
  return socket;
}

export function disconnectCollabSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinRoom(room: string): Promise<{ success: boolean; room?: string; activeUsers?: string[]; error?: string }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false, error: 'Socket not initialized' });
      return;
    }

    socket.emit('join_room', { room }, (response: any) => {
      resolve(response);
    });
  });
}

export function leaveRoom(room: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    if (!socket) {
      resolve({ success: false, error: 'Socket not initialized' });
      return;
    }

    socket.emit('leave_room', { room }, (response: any) => {
      resolve(response);
    });
  });
}

export function sendTypingStart(room: string): void {
  if (!socket) return;
  socket.emit('typing_start', { room, isTyping: true });
}

export function sendTypingStop(room: string): void {
  if (!socket) return;
  socket.emit('typing_stop', { room, isTyping: false });
}

export function updatePresence(room: string, status: 'online' | 'away' | 'busy' | 'offline'): void {
  if (!socket) return;
  socket.emit('presence_update', { room, status });
}

