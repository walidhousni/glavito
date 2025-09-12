'use client';

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export interface ConversationEventPayload {
  event: string;
  [key: string]: any;
}

export function useConversationsWebSocket(options: {
  conversationId?: string;
  autoConnect?: boolean;
  onEvent?: (payload: ConversationEventPayload) => void;
}) {
  const { conversationId, autoConnect = true, onEvent } = options;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;
    const authStorage = typeof window !== 'undefined' ? window.localStorage.getItem('auth-storage') : null;
    const token = authStorage ? (JSON.parse(authStorage)?.state?.tokens?.accessToken as string | undefined) : undefined;
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
    const socket = io(`${base}/conversations`, { auth: { token }, transports: ['websocket', 'polling'], timeout: 10000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      if (conversationId) socket.emit('join', { room: `conversation:${conversationId}` });
    });

    socket.on('disconnect', () => {
      // no-op
    });

    socket.on('message.created', (payload: ConversationEventPayload) => onEvent?.(payload));
    socket.on('conversation.updated', (payload: ConversationEventPayload) => onEvent?.(payload));
    socket.on('conversation.created', (payload: ConversationEventPayload) => onEvent?.(payload));
    socket.on('conversation.deleted', (payload: ConversationEventPayload) => onEvent?.(payload));

    return () => {
      if (conversationId) socket.emit('leave', { room: `conversation:${conversationId}` });
      try { socket.disconnect(); } catch {}
    };
  }, [conversationId, autoConnect, onEvent]);

  return { socket: socketRef.current };
}


