/**
 * Collaboration API Client
 * Handles ticket notes, reactions, and checklists
 */

import { api } from './config';

export const collabApi = {
  // ========== Notes ==========

  // Get all notes for a ticket
  getTicketNotes: async (ticketId: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${ticketId}/collab/notes`);
    return response.data;
  },

  // Create a note
  createTicketNote: async (ticketId: string, data: { content: string; isPrivate?: boolean; tags?: string[] }): Promise<any> => {
    const response = await api.post(`/tickets/${ticketId}/collab/notes`, data);
    return response.data;
  },

  // Update a note
  updateTicketNote: async (ticketId: string, noteId: string, data: { content?: string; isPrivate?: boolean; tags?: string[] }): Promise<any> => {
    const response = await api.patch(`/tickets/${ticketId}/collab/notes/${noteId}`, data);
    return response.data;
  },

  // Delete a note
  deleteTicketNote: async (ticketId: string, noteId: string): Promise<void> => {
    await api.delete(`/tickets/${ticketId}/collab/notes/${noteId}`);
  },

  // Add/remove reaction to a note
  toggleNoteReaction: async (ticketId: string, noteId: string, emoji: string): Promise<any> => {
    const response = await api.post(`/tickets/${ticketId}/collab/notes/${noteId}/reactions`, { emoji });
    return response.data;
  },

  // ========== Subtasks/Checklist ==========

  // Get all subtasks for a ticket
  getTicketSubtasks: async (ticketId: string): Promise<any[]> => {
    const response = await api.get(`/tickets/${ticketId}/collab/subtasks`);
    return response.data;
  },

  // Create a subtask
  createTicketSubtask: async (ticketId: string, data: { title: string; assigneeId?: string; dueDate?: string; order?: number }): Promise<any> => {
    const response = await api.post(`/tickets/${ticketId}/collab/subtasks`, data);
    return response.data;
  },

  // Update a subtask
  updateTicketSubtask: async (ticketId: string, subtaskId: string, data: { title?: string; isDone?: boolean; assigneeId?: string; dueDate?: string; order?: number }): Promise<any> => {
    const response = await api.patch(`/tickets/${ticketId}/collab/subtasks/${subtaskId}`, data);
    return response.data;
  },

  // Delete a subtask
  deleteTicketSubtask: async (ticketId: string, subtaskId: string): Promise<void> => {
    await api.delete(`/tickets/${ticketId}/collab/subtasks/${subtaskId}`);
  },
};

