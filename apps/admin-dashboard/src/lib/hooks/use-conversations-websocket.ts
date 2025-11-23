'use client';

import { useEffect, useRef, useState } from 'react';
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
  const onEventRef = useRef(onEvent);
  const [isConnected, setIsConnected] = useState(false);

  // Keep the callback ref up to date without causing re-renders
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!autoConnect) return;
    
    const authStorage = typeof window !== 'undefined' ? window.localStorage.getItem('auth-storage') : null;
    const token = authStorage ? (JSON.parse(authStorage)?.state?.tokens?.accessToken as string | undefined) : undefined;
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
    const socket = io(`${base}/conversations`, { auth: { token }, transports: ['websocket', 'polling'], timeout: 10000 });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      if (conversationId) {
        socket.emit('join', { room: `conversation:${conversationId}` });
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Use ref to access latest callback without re-subscribing
    const handleMessageCreated = (payload: ConversationEventPayload) => onEventRef.current?.(payload);
    const handleMessageReaction = (payload: ConversationEventPayload) => onEventRef.current?.(payload);
    const handleConversationUpdated = (payload: ConversationEventPayload) => onEventRef.current?.(payload);
    const handleConversationCreated = (payload: ConversationEventPayload) => onEventRef.current?.(payload);
    const handleConversationDeleted = (payload: ConversationEventPayload) => onEventRef.current?.(payload);

    socket.on('message.created', handleMessageCreated);
    socket.on('message.reaction', handleMessageReaction);
    socket.on('conversation.updated', handleConversationUpdated);
    socket.on('conversation.created', handleConversationCreated);
    socket.on('conversation.deleted', handleConversationDeleted);

    return () => {
      // Clean up event listeners
      socket.off('message.created', handleMessageCreated);
      socket.off('message.reaction', handleMessageReaction);
      socket.off('conversation.updated', handleConversationUpdated);
      socket.off('conversation.created', handleConversationCreated);
      socket.off('conversation.deleted', handleConversationDeleted);
      
      if (conversationId) {
        socket.emit('leave', { room: `conversation:${conversationId}` });
      }
      try { 
        socket.disconnect(); 
      } catch {
        // Ignore disconnect errors
      }
    };
  }, [conversationId, autoConnect]); // Removed onEvent from dependencies

  return { socket: socketRef.current, isConnected };
}


