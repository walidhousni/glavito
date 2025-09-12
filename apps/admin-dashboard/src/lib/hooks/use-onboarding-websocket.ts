import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { OnboardingStep, OnboardingProgress } from '@glavito/shared-types';

interface OnboardingWebSocketEvents {
  connected: (data: { message: string; userId: string; tenantId: string }) => void;
  progress_update: (data: {
    sessionId: string;
    step: OnboardingStep;
    progress: OnboardingProgress;
    timestamp: Date;
  }) => void;
  milestone_reached: (data: {
    sessionId: string;
    milestone: 'started' | 'halfway' | 'completed' | 'abandoned';
    progress: OnboardingProgress;
    timestamp: Date;
  }) => void;
  step_completed: (data: {
    sessionId: string;
    step: string;
    nextStep?: string;
    timestamp: Date;
  }) => void;
  validation_error: (data: {
    sessionId: string;
    errors: string[];
    timestamp: Date;
  }) => void;
  connection_test_result: (data: {
    sessionId: string;
    channel: string;
    result: unknown;
    timestamp: Date;
  }) => void;
  onboarding_completed: (data: {
    sessionId: string;
    summary: unknown;
    timestamp: Date;
  }) => void;
  error: (data: { message: string; error?: string }) => void;
}

interface UseOnboardingWebSocketOptions {
  sessionId?: string;
  autoConnect?: boolean;
  onProgressUpdate?: (data: OnboardingWebSocketEvents['progress_update']) => void;
  onMilestoneReached?: (data: OnboardingWebSocketEvents['milestone_reached']) => void;
  onStepCompleted?: (data: OnboardingWebSocketEvents['step_completed']) => void;
  onValidationError?: (data: OnboardingWebSocketEvents['validation_error']) => void;
  onConnectionTestResult?: (data: OnboardingWebSocketEvents['connection_test_result']) => void;
  onOnboardingCompleted?: (data: OnboardingWebSocketEvents['onboarding_completed']) => void;
  onError?: (data: OnboardingWebSocketEvents['error']) => void;
}

export function useOnboardingWebSocket(options: UseOnboardingWebSocketOptions = {}) {
  const {
    sessionId,
    autoConnect = true,
    onProgressUpdate,
    onMilestoneReached,
    onStepCompleted,
    onValidationError,
    onConnectionTestResult,
    onOnboardingCompleted,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!autoConnect) return;

    // Read token from persisted auth store
    const authStorage = localStorage.getItem('auth-storage');
    const token = authStorage ? (JSON.parse(authStorage)?.state?.tokens?.accessToken as string | undefined) : undefined;
    if (!token) {
      setConnectionError('No authentication token available');
      return;
    }

    // Create socket connection
    // Ensure we connect to the API origin without the /api prefix for websockets
    const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace(/\/api\/?$/, '');
    const socket = io(`${base}/onboarding`, {
      auth: {
        token: token as string,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      setIsConnected(true);
      setConnectionError(null);
      console.log('Connected to onboarding WebSocket');
    });

    socket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Disconnected from onboarding WebSocket:', reason);
    });

    socket.on('connect_error', (error) => {
      setConnectionError(error.message);
      console.error('WebSocket connection error:', error);
    });

    // Onboarding event handlers
    socket.on('connected', (data) => {
      console.log('WebSocket authenticated:', data);
    });

    socket.on('progress_update', (data) => {
      setLastUpdate(new Date(data.timestamp));
      onProgressUpdate?.(data);
    });

    socket.on('milestone_reached', (data) => {
      setLastUpdate(new Date(data.timestamp));
      onMilestoneReached?.(data);
    });

    socket.on('step_completed', (data) => {
      setLastUpdate(new Date(data.timestamp));
      onStepCompleted?.(data);
    });

    socket.on('validation_error', (data) => {
      setLastUpdate(new Date(data.timestamp));
      onValidationError?.(data);
    });

    socket.on('connection_test_result', (data) => {
      setLastUpdate(new Date(data.timestamp));
      onConnectionTestResult?.(data);
    });

    socket.on('onboarding_completed', (data) => {
      setLastUpdate(new Date(data.timestamp));
      onOnboardingCompleted?.(data);
    });

    socket.on('error', (data) => {
      setConnectionError(data.message);
      onError?.(data);
    });

    // Join session if provided
    if (sessionId) {
      socket.emit('join_session', { sessionId });
    }

    // Cleanup on unmount
    return () => {
      if (sessionId) {
        socket.emit('leave_session', { sessionId });
      }
      socket.disconnect();
    };
  }, [
    autoConnect,
    sessionId,
    onProgressUpdate,
    onMilestoneReached,
    onStepCompleted,
    onValidationError,
    onConnectionTestResult,
    onOnboardingCompleted,
    onError,
  ]);

  // Manual connection control
  const connect = () => {
    if (socketRef.current && !isConnected) {
      socketRef.current.connect();
    }
  };

  const disconnect = () => {
    if (socketRef.current && isConnected) {
      socketRef.current.disconnect();
    }
  };

  // Join/leave session
  const joinSession = (newSessionId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('join_session', { sessionId: newSessionId });
    }
  };

  const leaveSession = (oldSessionId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('leave_session', { sessionId: oldSessionId });
    }
  };

  // Get current progress
  const getCurrentProgress = (sessionId: string) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit('get_progress', { sessionId });
    }
  };

  // Send custom events
  const emit = (event: string, data: unknown) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  return {
    // Connection state
    isConnected,
    connectionError,
    lastUpdate,

    // Connection control
    connect,
    disconnect,

    // Session management
    joinSession,
    leaveSession,

    // Data fetching
    getCurrentProgress,

    // Custom events
    emit,

    // Socket instance (for advanced usage)
    socket: socketRef.current,
  };
}

// Hook for automatic progress updates
export function useOnboardingProgressUpdates(sessionId?: string) {
  const [progress, setProgress] = useState<OnboardingProgress | null>(null);
  const [lastMilestone, setLastMilestone] = useState<string | null>(null);
  const [recentErrors, setRecentErrors] = useState<string[]>([]);

  const { isConnected, connectionError } = useOnboardingWebSocket({
    sessionId,
    onProgressUpdate: (data) => {
      const d = data as unknown as { progress: OnboardingProgress };
      setProgress(d.progress);
    },
    onMilestoneReached: (data) => {
      const d = data as unknown as { milestone: string; progress: OnboardingProgress };
      setLastMilestone(d.milestone);
      setProgress(d.progress);
    },
    onValidationError: (data) => {
      const d = data as unknown as { errors: string[] };
      setRecentErrors(d.errors);
      // Clear errors after 5 seconds
      setTimeout(() => setRecentErrors([]), 5000);
    },
  });

  return {
    progress,
    lastMilestone,
    recentErrors,
    isConnected,
    connectionError,
  };
}

// Hook for connection test results
export function useConnectionTestUpdates(sessionId?: string) {
  const [testResults, setTestResults] = useState<Record<string, unknown>>({});
  const [isTestingConnection, setIsTestingConnection] = useState<Record<string, boolean>>({});

  const { isConnected } = useOnboardingWebSocket({
    sessionId,
    onConnectionTestResult: (data) => {
      const d = data as unknown as { channel: string; result: unknown };
      setTestResults(prev => ({
        ...prev,
        [d.channel]: d.result,
      }));
      setIsTestingConnection(prev => ({
        ...prev,
        [d.channel]: false,
      }));
    },
  });

  const startConnectionTest = (channel: string) => {
    setIsTestingConnection(prev => ({
      ...prev,
      [channel]: true,
    }));
  };

  return {
    testResults,
    isTestingConnection,
    startConnectionTest,
    isConnected,
  };
}