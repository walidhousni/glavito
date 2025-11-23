'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth-store';
import type { DashboardMetrics } from '../api/dashboard-client';

interface DashboardWebSocketConfig {
  autoConnect?: boolean;
  reconnectDelay?: number;
}

interface SLAAlert {
  ticketId: string;
  type: 'warning' | 'breach';
  message: string;
  dueAt: string;
}

interface GoalAchieved {
  goalId: string;
  metric: string;
  target: number;
  achieved: number;
}

interface AgentPresence {
  userId: string;
  status: string;
  availability: string;
}

export function useDashboardWebSocket(config: DashboardWebSocketConfig = {}) {
  const { autoConnect = true, reconnectDelay = 3000 } = config;
  
  const [isConnected, setIsConnected] = useState(false);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const { tokens } = useAuthStore();

  /**
   * Connect to dashboard WebSocket namespace
   */
  const connect = useCallback(() => {
    if (!tokens?.accessToken || socketRef.current?.connected) return;
    
    const token = tokens.accessToken;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const wsUrl = apiUrl.replace(/^http/, 'ws');

    const socket = io(`${wsUrl}/dashboard`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: reconnectDelay,
      reconnectionAttempts: 5,
    });

    socket.on('connect', () => {
      console.log('[Dashboard WS] Connected');
      setIsConnected(true);
      
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('[Dashboard WS] Disconnected:', reason);
      setIsConnected(false);
      
      // Auto-reconnect if not a manual disconnect
      if (reason === 'io server disconnect') {
        reconnectTimeoutRef.current = setTimeout(() => {
          socket.connect();
        }, reconnectDelay);
      }
    });

    socket.on('connect_error', (error) => {
      console.error('[Dashboard WS] Connection error:', error);
      setIsConnected(false);
    });

    // Metrics updates
    socket.on('metrics.updated', (data: DashboardMetrics) => {
      setMetrics(data);
      setLastUpdate(new Date());
    });

    socketRef.current = socket;
  }, [tokens?.accessToken, reconnectDelay]);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  /**
   * Request manual metrics refresh
   */
  const refreshMetrics = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('refresh.metrics');
    }
  }, []);

  /**
   * Subscribe to a specific room/channel
   */
  const subscribe = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { room });
    }
  }, []);

  /**
   * Unsubscribe from a room/channel
   */
  const unsubscribe = useCallback((room: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe', { room });
    }
  }, []);

  /**
   * Listen for SLA alerts
   */
  const onSLAAlert = useCallback((callback: (alert: SLAAlert) => void) => {
    if (!socketRef.current) {
      return () => {
        // No-op cleanup
      };
    }
    
    socketRef.current.on('sla.alert', callback);
    
    return () => {
      socketRef.current?.off('sla.alert', callback);
    };
  }, []);

  /**
   * Listen for goal achievements
   */
  const onGoalAchieved = useCallback((callback: (achievement: GoalAchieved) => void) => {
    if (!socketRef.current) {
      return () => {
        // No-op cleanup
      };
    }
    
    socketRef.current.on('goal.achieved', callback);
    
    return () => {
      socketRef.current?.off('goal.achieved', callback);
    };
  }, []);

  /**
   * Listen for agent presence updates
   */
  const onAgentPresence = useCallback((callback: (presence: AgentPresence) => void) => {
    if (!socketRef.current) {
      return () => {
        // No-op cleanup
      };
    }
    
    socketRef.current.on('agents.presence', callback);
    
    return () => {
      socketRef.current?.off('agents.presence', callback);
    };
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && tokens?.accessToken) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [autoConnect, tokens?.accessToken, connect, disconnect]);

  return {
    isConnected,
    metrics,
    lastUpdate,
    connect,
    disconnect,
    refreshMetrics,
    subscribe,
    unsubscribe,
    onSLAAlert,
    onGoalAchieved,
    onAgentPresence,
  };
}
