/**
 * useTicketCollab Hook
 * Manages ticket notes, subtasks, presence, and typing indicators
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useCollabStore } from '../store/collab-store';
import { collabApi } from '../api/collab';
import { getCollabSocket } from '../realtime/collab-socket';

export function useTicketCollab(ticketId: string) {
  const {
    initializeRoomState,
    removeRoomState,
    userJoinedRoom,
    userLeftRoom,
    setTyping: setStoreTyping,
    updateRoomPresence,
    roomStates,
  } = useCollabStore();
  
  const [notes, setNotes] = useState<any[]>([]);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const room = `ticket:${ticketId}`;
  
  // Get room state from store
  const roomState = roomStates[room];
  const activeUsers = roomState?.activeUsers || [];
  const typing = Object.values(roomState?.typingUsers || {}).filter(u => u.isTyping);

  // Load initial data
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const [notesData, subtasksData] = await Promise.all([
          collabApi.getTicketNotes(ticketId),
          collabApi.getTicketSubtasks(ticketId),
        ]);
        if (mounted) {
          const notesArray = Array.isArray(notesData)
            ? notesData
            : (notesData as any)?.data ?? (notesData as any)?.items ?? [];
          const subtasksArray = Array.isArray(subtasksData)
            ? subtasksData
            : (subtasksData as any)?.data ?? (subtasksData as any)?.items ?? [];

          setNotes(notesArray as any[]);
          setSubtasks((subtasksArray as any[]).slice().sort((a: any, b: any) => (a?.order ?? 0) - (b?.order ?? 0)));
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : 'Failed to load collaboration data');
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [ticketId]);

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

    const handleNoteCreated = (note: any) => {
      if (note.ticketId === ticketId) {
        setNotes((prev) => [...prev, note]);
      }
    };

    const handleNoteUpdated = (note: any) => {
      if (note.ticketId === ticketId) {
        setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
      }
    };

    const handleNoteDeleted = (data: { noteId: string }) => {
      setNotes((prev) => prev.filter((n) => n.id !== data.noteId));
    };

    const handleReactionAdded = (data: any) => {
      if (data.noteId) {
        setNotes((prev) =>
          prev.map((note) =>
            note.id === data.noteId
              ? {
                  ...note,
                  reactions: [...(note.reactions || []), data],
                }
              : note
          )
        );
      }
    };

    const handleReactionRemoved = (data: { reactionId: string; targetId: string }) => {
      setNotes((prev) =>
        prev.map((note) =>
          note.id === data.targetId
            ? {
                ...note,
                reactions: (note.reactions || []).filter((r: any) => r.id !== data.reactionId),
              }
            : note
        )
      );
    };

    const handleSubtaskCreated = (subtask: any) => {
      if (subtask.ticketId === ticketId) {
        setSubtasks((prev) => [...prev, subtask].sort((a, b) => a.order - b.order));
      }
    };

    const handleSubtaskUpdated = (subtask: any) => {
      if (subtask.ticketId === ticketId) {
        setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? subtask : s)).sort((a, b) => a.order - b.order));
      }
    };

    const handleSubtaskDeleted = (data: { subtaskId: string }) => {
      setSubtasks((prev) => prev.filter((s) => s.id !== data.subtaskId));
    };

    socket.on('newNote', handleNoteCreated);
    socket.on('noteUpdated', handleNoteUpdated);
    socket.on('noteDeleted', handleNoteDeleted);
    socket.on('noteReactionAdded', handleReactionAdded);
    socket.on('noteReactionRemoved', handleReactionRemoved);
    socket.on('newSubtask', handleSubtaskCreated);
    socket.on('subtaskUpdated', handleSubtaskUpdated);
    socket.on('subtaskDeleted', handleSubtaskDeleted);
    
    // Presence handlers
    socket.on('userJoined', ({ userId, roomId }) => {
      if (roomId === room) userJoinedRoom(roomId, userId);
    });
    socket.on('userLeft', ({ userId, roomId }) => {
      if (roomId === room) userLeftRoom(roomId, userId);
    });
    socket.on('typing', ({ userId, isTyping, roomId }) => {
      if (roomId === room) setStoreTyping(roomId, userId, isTyping);
    });
    socket.on('presenceUpdate', ({ userId, status, roomId }) => {
      if (roomId === room) updateRoomPresence(roomId, userId, status);
    });

    return () => {
      socket.off('newNote', handleNoteCreated);
      socket.off('noteUpdated', handleNoteUpdated);
      socket.off('noteDeleted', handleNoteDeleted);
      socket.off('noteReactionAdded', handleReactionAdded);
      socket.off('noteReactionRemoved', handleReactionRemoved);
      socket.off('newSubtask', handleSubtaskCreated);
      socket.off('subtaskUpdated', handleSubtaskUpdated);
      socket.off('subtaskDeleted', handleSubtaskDeleted);
      socket.off('userJoined');
      socket.off('userLeft');
      socket.off('typing');
      socket.off('presenceUpdate');
    };
  }, [ticketId]);

  // Notes actions
  const createNote = useCallback(
    async (content: string, isPrivate = true, tags?: string[]) => {
      const note = await collabApi.createTicketNote(ticketId, { content, isPrivate, tags });
      // Real-time update will handle adding to state
      return note;
    },
    [ticketId]
  );

  const updateNote = useCallback(
    async (noteId: string, content?: string, isPrivate?: boolean, tags?: string[]) => {
      const note = await collabApi.updateTicketNote(ticketId, noteId, { content, isPrivate, tags });
      // Real-time update will handle updating state
      return note;
    },
    [ticketId]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      await collabApi.deleteTicketNote(ticketId, noteId);
      // Real-time update will handle removing from state
    },
    [ticketId]
  );

  const toggleNoteReaction = useCallback(
    async (noteId: string, emoji: string) => {
      await collabApi.toggleNoteReaction(ticketId, noteId, emoji);
      // Real-time update will handle adding/removing reaction
    },
    [ticketId]
  );

  // Subtasks actions
  const createSubtask = useCallback(
    async (title: string, assigneeId?: string, dueDate?: string) => {
      const subtask = await collabApi.createTicketSubtask(ticketId, { title, assigneeId, dueDate });
      // Real-time update will handle adding to state
      return subtask;
    },
    [ticketId]
  );

  const updateSubtask = useCallback(
    async (subtaskId: string, data: { title?: string; isDone?: boolean; assigneeId?: string; dueDate?: string }) => {
      const subtask = await collabApi.updateTicketSubtask(ticketId, subtaskId, data);
      // Real-time update will handle updating state
      return subtask;
    },
    [ticketId]
  );

  const deleteSubtask = useCallback(
    async (subtaskId: string) => {
      await collabApi.deleteTicketSubtask(ticketId, subtaskId);
      // Real-time update will handle removing from state
    },
    [ticketId]
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
    notes,
    subtasks,
    loading,
    error,

    // Presence
    activeUsers,
    typing,

    // Notes actions
    createNote,
    updateNote,
    deleteNote,
    toggleNoteReaction,

    // Subtasks actions
    createSubtask,
    updateSubtask,
    deleteSubtask,

    // Typing
    handleTyping,
    handleStopTyping,
  };
}

