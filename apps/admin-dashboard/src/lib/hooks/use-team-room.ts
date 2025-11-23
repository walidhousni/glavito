/**
 * useTeamRoom Hook
 * Manages team room messages, reactions, presence, and typing indicators
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCollabStore } from '../store/collab-store';
import { teamRoomsApi } from '../api/team';
import { getCollabSocket } from '../realtime/collab-socket';

export function useTeamRoom(teamId: string, roomId: string) {
  const {
    initializeRoomState,
    removeRoomState,
    userJoinedRoom,
    userLeftRoom,
    setTyping: setStoreTyping,
    updateRoomPresence,
    roomStates,
  } = useCollabStore();
  
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const room = `team:${roomId}`;
  
  // Get room state from store
  const roomState = roomStates[room];
  const activeUsers = roomState?.activeUsers || [];
  const typing = Object.values(roomState?.typingUsers || {}).filter((u: any) => u.isTyping);

  // Load initial messages
  useEffect(() => {
    let mounted = true;

    const loadMessages = async () => {
      try {
        setLoading(true);
        const data = await teamRoomsApi.getRoomMessages(teamId, roomId);
        if (mounted) {
          setMessages(data.items);
          setHasMore(data.hasMore);
          setNextCursor(data.nextCursor);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load messages');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [teamId, roomId]);

  // Join room on mount
  useEffect(() => {
    initializeRoomState(room);
    const socket = getCollabSocket();
    if (socket) {
      socket.emit('joinRoom', { roomId: room });
    }

    return () => {
      if (socket) {
        socket.emit('leaveRoom', { roomId: room });
      }
      removeRoomState(room);
    };
  }, [room, initializeRoomState, removeRoomState]);

  // Listen to real-time events
  useEffect(() => {
    const socket = getCollabSocket();
    if (!socket) return;

    const handleMessageCreated = (data: { channelId: string; message: any }) => {
      if (data.channelId === roomId) {
        setMessages((prev) => [...prev, data.message]);
      }
    };

    const handleMessageDeleted = (data: { channelId: string; messageId: string }) => {
      if (data.channelId === roomId) {
        setMessages((prev) => prev.filter((m) => m.id !== data.messageId));
      }
    };

    const handleReactionAdded = (data: any) => {
      if (data.messageId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? {
                  ...msg,
                  reactions: [...(msg.reactions || []), data],
                }
              : msg
          )
        );
      }
    };

    const handleReactionRemoved = (data: { reactionId: string; targetId: string }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === data.targetId
            ? {
                ...msg,
                reactions: (msg.reactions || []).filter((r: any) => r.id !== data.reactionId),
              }
            : msg
        )
      );
    };

    socket.on('message_created', handleMessageCreated);
    socket.on('message_deleted', handleMessageDeleted);
    socket.on('reaction_added', handleReactionAdded);
    socket.on('reaction_removed', handleReactionRemoved);

    return () => {
      socket.off('message_created', handleMessageCreated);
      socket.off('message_deleted', handleMessageDeleted);
      socket.off('reaction_added', handleReactionAdded);
      socket.off('reaction_removed', handleReactionRemoved);
    };
  }, [roomId]);

  // Load more messages (pagination)
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !nextCursor) return;

    try {
      setLoadingMore(true);
      const data = await teamRoomsApi.getRoomMessages(teamId, roomId, nextCursor);
      setMessages((prev) => [...data.items, ...prev]);
      setHasMore(data.hasMore);
      setNextCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more messages');
    } finally {
      setLoadingMore(false);
    }
  }, [teamId, roomId, nextCursor, hasMore, loadingMore]);

  // Send message
  const sendMessage = useCallback(
    async (content: string, mentions?: string[]) => {
      const message = await teamRoomsApi.createRoomMessage(teamId, roomId, { content, mentions });
      // Real-time update will handle adding to state
      return message;
    },
    [teamId, roomId]
  );

  // Toggle reaction
  const toggleReaction = useCallback(
    async (messageId: string, emoji: string) => {
      await teamRoomsApi.toggleMessageReaction(teamId, roomId, messageId, emoji);
      // Real-time update will handle adding/removing reaction
    },
    [teamId, roomId]
  );

  // Delete message
  const deleteMessage = useCallback(
    async (messageId: string) => {
      await teamRoomsApi.deleteRoomMessage(teamId, roomId, messageId);
      // Real-time update will handle removing from state
    },
    [teamId, roomId]
  );

  // Typing indicator
  const handleTyping = useCallback(() => {
    const socket = getCollabSocket();
    if (socket) {
      socket.emit('typing', { roomId: room, isTyping: true });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Auto-stop typing after 3 seconds
      typingTimeoutRef.current = setTimeout(() => {
        if (socket) {
          socket.emit('typing', { roomId: room, isTyping: false });
        }
      }, 3000);
    }
  }, [room]);

  const handleStopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    const socket = getCollabSocket();
    if (socket) {
      socket.emit('typing', { roomId: room, isTyping: false });
    }
  }, [room]);

  return {
    // Data
    messages,
    loading,
    loadingMore,
    error,
    hasMore,

    // Presence
    activeUsers,
    typing,

    // Actions
    sendMessage,
    toggleReaction,
    deleteMessage,
    loadMore,

    // Typing
    handleTyping,
    handleStopTyping,
  };
}

