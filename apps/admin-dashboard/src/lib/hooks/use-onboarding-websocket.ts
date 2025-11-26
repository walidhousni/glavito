/**
 * useOnboardingWebSocket Hook
 * Real-time updates via WebSocket
 */

import { useEffect, useRef } from 'react';
import { useOnboardingStore } from '../store/onboarding-store';
import { useAuth } from './use-auth';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';

export function useOnboardingWebSocket(userId?: string) {
  const socket = useRef<Socket | null>(null);
  const session = useOnboardingStore((state) => state.session);
  const { user, isAuthenticated } = useAuth();
  
  // Use provided userId or get from auth context
  const effectiveUserId = userId || user?.id;
  
  useEffect(() => {
    if (!effectiveUserId || !session || !isAuthenticated) {
      return;
    }
    
    // Connect to WebSocket
    socket.current = io(`${WS_URL}/onboarding`, {
      query: { userId: effectiveUserId },
      transports: ['websocket'],
    });
    
    const currentSocket = socket.current;
    
    // Join session room
    currentSocket.emit('join-session', {
      sessionId: session.id,
      userId: effectiveUserId,
    });
    
    // Listen for events
    currentSocket.on('onboarding:started', (payload: Record<string, unknown>) => {
      console.log('Onboarding started:', payload);
    });
    
    currentSocket.on('onboarding:step-completed', (payload: Record<string, unknown>) => {
      console.log('Step completed:', payload);
      // Update progress in store
      useOnboardingStore.setState((state) => ({
        session: state.session ? {
          ...state.session,
          progress: payload.progress as number,
          completedSteps: [...state.session.completedSteps, payload.stepId as string],
        } : null,
      }));
    });
    
    currentSocket.on('onboarding:completed', (payload: Record<string, unknown>) => {
      console.log('Onboarding completed:', payload);
      useOnboardingStore.setState((state) => ({
        session: state.session ? {
          ...state.session,
          status: 'completed',
          completedAt: new Date(),
        } : null,
      }));
    });
    
    currentSocket.on('onboarding:progress', (payload: Record<string, unknown>) => {
      useOnboardingStore.setState((state) => ({
        session: state.session ? {
          ...state.session,
          progress: payload.progress as number,
          currentStep: payload.currentStep as string,
        } : null,
      }));
    });
    
    // Cleanup
    return () => {
      currentSocket.emit('leave-session', { sessionId: session.id });
      currentSocket.disconnect();
    };

  }, [effectiveUserId, session?.id, isAuthenticated]);
  
  return {
    connected: socket.current?.connected || false,
  };
}
