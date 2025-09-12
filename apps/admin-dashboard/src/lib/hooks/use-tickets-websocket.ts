'use client';

import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

type TicketEvents =
  | 'ticket.created'
  | 'ticket.updated'
  | 'ticket.assigned'
  | 'ticket.auto_assigned'
  | 'ticket.resolved'
  | 'ticket.reopened'
  | 'ticket.note_added'
  | 'ticket.watcher_added'
  | 'ticket.watcher_removed'
  | 'ticket.typing';

interface UseTicketsWebSocketOptions {
  tenantId?: string;
  ticketId?: string;
  autoConnect?: boolean;
  onEvent?: (event: { type: TicketEvents; payload: any }) => void;
}

export function useTicketsWebSocket(options: UseTicketsWebSocketOptions = {}) {
  const { tenantId, ticketId, autoConnect = true, onEvent } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;
    let token: string | null = null;
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('auth-storage');
        if (raw) {
          const parsed = JSON.parse(raw);
          token = parsed?.state?.tokens?.accessToken || null;
        }
      } catch {
        token = null;
      }
    }

    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const socket = io(`${base}/tickets`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('connect_error', (e) => setError(e.message));

    const handlers: TicketEvents[] = [
      'ticket.created',
      'ticket.updated',
      'ticket.assigned',
      'ticket.auto_assigned',
      'ticket.resolved',
      'ticket.reopened',
      'ticket.note_added',
      'ticket.watcher_added',
      'ticket.watcher_removed',
      'ticket.typing',
    ];
    handlers.forEach((evt) => {
      socket.on(evt, (payload) => {
        onEvent?.({ type: evt, payload });
      });
    });

    if (tenantId) socket.emit('join', { room: `tenant:${tenantId}` });
    if (ticketId) socket.emit('join', { room: `ticket:${ticketId}` });

    return () => {
      handlers.forEach((evt) => socket.off(evt));
      if (tenantId) socket.emit('leave', { room: `tenant:${tenantId}` });
      if (ticketId) socket.emit('leave', { room: `ticket:${ticketId}` });
      socket.disconnect();
    };
  }, [tenantId, ticketId, autoConnect, onEvent]);

  const emitTyping = (isTyping: boolean) => {
    try {
      if (!socketRef.current || !ticketId) return;
      socketRef.current.emit('typing', { ticketId, isTyping });
    } catch { /* noop */ }
  };

  return { isConnected, error, emitTyping };
}


