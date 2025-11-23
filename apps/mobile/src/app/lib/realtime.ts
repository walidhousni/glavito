import { io, Socket } from 'socket.io-client';
import { ENV } from '../config/env';
import { getAccessToken } from './api';

let socket: Socket | null = null;

export async function getTicketsSocket(): Promise<Socket> {
  if (socket && socket.connected) return socket;
  const token = await getAccessToken();
  socket = io(`${ENV.apiBaseUrl.replace(/\/api$/, '')}/tickets`, {
    transports: ['websocket'],
    autoConnect: true,
    auth: { token },
  });
  return socket;
}

export async function onTicketEvents(handlers: Partial<{
  created: (p: any) => void;
  updated: (p: any) => void;
  assigned: (p: any) => void;
  resolved: (p: any) => void;
}>) {
  const s = await getTicketsSocket();
  if (handlers.created) s.on('ticket.created', handlers.created);
  if (handlers.updated) s.on('ticket.updated', handlers.updated);
  if (handlers.assigned) s.on('ticket.assigned', handlers.assigned);
  if (handlers.resolved) s.on('ticket.resolved', handlers.resolved);
  return () => {
    if (handlers.created) s.off('ticket.created', handlers.created);
    if (handlers.updated) s.off('ticket.updated', handlers.updated);
    if (handlers.assigned) s.off('ticket.assigned', handlers.assigned);
    if (handlers.resolved) s.off('ticket.resolved', handlers.resolved);
  };
}


