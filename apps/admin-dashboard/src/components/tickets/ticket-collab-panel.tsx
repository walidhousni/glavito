/**
 * Ticket Collaboration Panel
 * Beautiful real-time collaboration UI for tickets
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useTicketCollab } from '@/lib/hooks/use-ticket-collab';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { toast } from '@/hooks/use-toast';
import {
  FaComment,
  FaTasks,
  FaUsers,
  FaPlus,
  FaEllipsisV,
  FaEdit,
  FaTrash,
  FaSmile,
  FaPaperPlane,
  FaCheckCircle,
  FaSpinner,
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

interface TicketCollabPanelProps {
  ticketId: string;
}

export function TicketCollabPanel({ ticketId }: TicketCollabPanelProps) {
  const t = useTranslations('teams.collab');
  const {
    notes,
    subtasks,
    loading,
    activeUsers,
    typing,
    createNote,
    updateNote,
    deleteNote,
    toggleNoteReaction,
    createSubtask,
    updateSubtask,
    deleteSubtask,
    handleTyping,
    handleStopTyping,
  } = useTicketCollab(ticketId);

  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState<{ id: string; content: string } | null>(null);
  const [newSubtask, setNewSubtask] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'note' | 'subtask'; id: string } | null>(null);

  const safeSubtasks = Array.isArray(subtasks) ? subtasks : [];
  const completedCount = safeSubtasks.filter((s) => s.isDone).length;

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSaving(true);
    try {
      await createNote(newNote, true);
      setNewNote('');
      handleStopTyping();
      toast({ title: t('notes.created') });
    } catch {
      toast({ title: t('errors.saveFailed'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditNote = async () => {
    if (!editingNote || !editingNote.content.trim()) return;
    setIsSaving(true);
    try {
      await updateNote(editingNote.id, editingNote.content);
      setEditingNote(null);
      toast({ title: t('notes.updated') });
    } catch {
      toast({ title: t('errors.saveFailed'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'note') return;
    try {
      await deleteNote(deleteConfirm.id);
      setDeleteConfirm(null);
      toast({ title: t('notes.deleted') });
    } catch {
      toast({ title: t('errors.deleteFailed'), variant: 'destructive' });
    }
  };

  const handleAddSubtask = async () => {
    if (!newSubtask.trim()) return;
    try {
      await createSubtask(newSubtask);
      setNewSubtask('');
      toast({ title: t('checklist.created') });
    } catch {
      toast({ title: t('errors.saveFailed'), variant: 'destructive' });
    }
  };

  const handleToggleSubtask = async (id: string, isDone: boolean) => {
    try {
      await updateSubtask(id, { isDone: !isDone });
    } catch {
      toast({ title: t('errors.saveFailed'), variant: 'destructive' });
    }
  };

  const handleDeleteSubtask = async () => {
    if (!deleteConfirm || deleteConfirm.type !== 'subtask') return;
    try {
      await deleteSubtask(deleteConfirm.id);
      setDeleteConfirm(null);
      toast({ title: t('checklist.deleted') });
    } catch {
      toast({ title: t('errors.deleteFailed'), variant: 'destructive' });
    }
  };

  const handleReaction = async (noteId: string, emoji: string) => {
    try {
      await toggleNoteReaction(noteId, emoji);
    } catch {
      toast({ title: t('errors.saveFailed'), variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <FaSpinner className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with Active Users */}
      <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-foreground">Collaboration</h3>
          <Badge variant="secondary" className="text-[10px] h-5 px-2 border-0 shadow-sm bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            <FaUsers className="w-2.5 h-2.5 mr-1" />
            {activeUsers.length} {t('presence.online')}
          </Badge>
        </div>
        {typing.length > 0 && (
          <p className="text-[10px] text-muted-foreground italic">
            {'Someone'} {t('typing.isTyping')}
          </p>
        )}
      </div>

      {/* Tabs */}
      <Tabs defaultValue="notes" className="flex-1 flex flex-col">
        <TabsList className="grid w-full grid-cols-2 mx-4 mt-3 h-9 border-0 shadow-sm">
          <TabsTrigger value="notes" className="text-xs h-8 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-600 dark:data-[state=active]:bg-blue-950 dark:data-[state=active]:text-blue-400">
            <FaComment className="w-3.5 h-3.5 mr-1.5" />
            {t('notes.title')}
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs h-8 data-[state=active]:bg-green-50 data-[state=active]:text-green-600 dark:data-[state=active]:bg-green-950 dark:data-[state=active]:text-green-400">
            <FaTasks className="w-3.5 h-3.5 mr-1.5" />
            {t('checklist.title')}
          </TabsTrigger>
        </TabsList>

        {/* Notes Tab */}
        <TabsContent value="notes" className="flex-1 flex flex-col mt-0">
          <ScrollArea className="flex-1 px-4">
            <div className="space-y-2 py-4">
              {notes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center">
                    <FaComment className="w-8 h-8 text-blue-400 dark:text-blue-500" />
                  </div>
                  <p className="text-xs font-medium text-foreground mb-1">{t('notes.noNotes')}</p>
                  <p className="text-[10px] text-muted-foreground">{t('notes.addFirstNote')}</p>
                </div>
              ) : (
                notes.map((note) => (
                  <Card key={note.id} className="border-0 shadow-sm hover:shadow-md transition-all duration-200 bg-card/50">
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2.5">
                        <Avatar className="w-7 h-7 border border-border/50">
                          <AvatarImage src={note.user.avatar} />
                          <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                            {note.user.firstName?.[0]}{note.user.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-1.5">
                              <p className="text-[11px] font-semibold text-foreground">
                                {note.user.firstName} {note.user.lastName}
                              </p>
                              <Badge variant="outline" className="text-[9px] h-4 px-1.5 py-0 border-0 shadow-sm bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                {note.isPrivate ? 'Private' : 'Team'}
                              </Badge>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 border-0 shadow-sm">
                                  <FaEllipsisV className="w-3 h-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-xs">
                                <DropdownMenuItem onClick={() => setEditingNote({ id: note.id, content: note.content })}>
                                  <FaEdit className="w-3 h-3 mr-2" />
                                  {t('notes.editNote')}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-red-600 dark:text-red-400"
                                  onClick={() => setDeleteConfirm({ type: 'note', id: note.id })}
                                >
                                  <FaTrash className="w-3 h-3 mr-2" />
                                  {t('notes.deleteNote')}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <p className="text-xs whitespace-pre-wrap mb-2 text-foreground leading-relaxed">{note.content}</p>
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                            </p>
                            <div className="flex items-center gap-1">
                              {/* Reactions */}
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {note.reactions?.map((r: any) => (
                                <Button
                                  key={r.id}
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 px-1.5 text-[10px] border-0 shadow-sm"
                                  onClick={() => handleReaction(note.id, r.emoji)}
                                >
                                  {r.emoji}
                                </Button>
                              ))}
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-5 w-5 border-0 shadow-sm">
                                    <FaSmile className="w-3 h-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-56 p-2 border-0 shadow-lg">
                                  <div className="grid grid-cols-8 gap-1">
                                    {['👍', '❤️', '😊', '🎉', '👀', '🚀', '✅', '❌'].map((emoji) => (
                                      <Button
                                        key={emoji}
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 hover:bg-muted"
                                        onClick={() => handleReaction(note.id, emoji)}
                                      >
                                        {emoji}
                                      </Button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Add Note */}
          <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
            <Textarea
              placeholder={t('notes.placeholder')}
              value={newNote}
              onChange={(e) => {
                setNewNote(e.target.value);
                handleTyping();
              }}
              onBlur={handleStopTyping}
              className="min-h-[60px] text-xs resize-none mb-2 border-0 shadow-sm"
            />
            <Button 
              onClick={handleAddNote} 
              disabled={!newNote.trim() || isSaving} 
              className="w-full h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm" 
              size="sm"
            >
              {isSaving ? (
                <>
                  <FaSpinner className="w-3.5 h-3.5 mr-2 animate-spin" />
                  {t('notes.saving')}
                </>
              ) : (
                <>
                  <FaPaperPlane className="w-3.5 h-3.5 mr-2" />
                  {t('notes.addNote')}
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        {/* Checklist Tab */}
        <TabsContent value="checklist" className="flex-1 flex flex-col mt-0">
          <ScrollArea className="flex-1 px-4">
            <div className="py-4">
              {/* Progress */}
              {safeSubtasks.length > 0 && (
                <Card className="mb-3 border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-foreground">
                        {t('checklist.completed', { count: completedCount, total: safeSubtasks.length })}
                      </p>
                      <p className="text-[10px] font-medium text-green-600 dark:text-green-400">
                        {Math.round((completedCount / safeSubtasks.length) * 100)}%
                      </p>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${(completedCount / (safeSubtasks.length || 1)) * 100}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Subtasks List */}
              <div className="space-y-2">
                {safeSubtasks.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-50 dark:bg-green-950/50 flex items-center justify-center">
                      <FaTasks className="w-8 h-8 text-green-400 dark:text-green-500" />
                    </div>
                    <p className="text-xs font-medium text-foreground mb-1">{t('checklist.noItems')}</p>
                    <p className="text-[10px] text-muted-foreground">{t('checklist.addFirstItem')}</p>
                  </div>
                ) : (
                  safeSubtasks.map((task) => (
                    <Card key={task.id} className={`border-0 shadow-sm transition-all duration-200 ${task.isDone ? 'opacity-60 bg-muted/30' : 'bg-card/50 hover:shadow-md'}`}>
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2.5">
                          <Checkbox
                            checked={task.isDone}
                            onCheckedChange={() => handleToggleSubtask(task.id, task.isDone)}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs ${task.isDone ? 'line-through text-muted-foreground' : 'text-foreground font-medium'}`}>
                              {task.title}
                            </p>
                            {task.assignee && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <Avatar className="w-4 h-4 border border-border/50">
                                  <AvatarImage src={task.assignee.avatar} />
                                  <AvatarFallback className="text-[9px] bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                    {task.assignee.firstName?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <p className="text-[10px] text-muted-foreground">
                                  {task.assignee.firstName} {task.assignee.lastName}
                                </p>
                              </div>
                            )}
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 border-0 shadow-sm">
                                <FaEllipsisV className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem
                                className="text-red-600 dark:text-red-400"
                                onClick={() => setDeleteConfirm({ type: 'subtask', id: task.id })}
                              >
                                <FaTrash className="w-3 h-3 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Add Subtask */}
          <div className="px-4 py-3 border-t border-border/50 bg-muted/20">
            <div className="flex gap-2">
              <Input
                placeholder={t('checklist.placeholder')}
                value={newSubtask}
                onChange={(e) => setNewSubtask(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask()}
                className="h-9 text-xs border-0 shadow-sm"
              />
              <Button 
                onClick={handleAddSubtask} 
                disabled={!newSubtask.trim()} 
                size="icon"
                className="h-9 w-9 bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 border-0 shadow-sm"
              >
                <FaPlus className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Edit Note Dialog */}
      <Dialog open={!!editingNote} onOpenChange={() => setEditingNote(null)}>
        <DialogContent className="p-0 gap-0 border-0 shadow-xl rounded-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50">
                <FaEdit className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <DialogTitle className="text-sm font-semibold text-foreground">{t('notes.editNote')}</DialogTitle>
            </div>
          </DialogHeader>
          <div className="px-6 py-4">
            <Textarea
              value={editingNote?.content || ''}
              onChange={(e) => setEditingNote(editingNote ? { ...editingNote, content: e.target.value } : null)}
              className="min-h-[100px] text-xs border-0 shadow-sm resize-none"
            />
          </div>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setEditingNote(null)} className="h-9 text-xs border-0 shadow-sm">
              Cancel
            </Button>
            <Button onClick={handleEditNote} disabled={isSaving} className="h-9 text-xs bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 border-0 shadow-sm">
              {isSaving ? <FaSpinner className="w-3.5 h-3.5 mr-2 animate-spin" /> : <FaCheckCircle className="w-3.5 h-3.5 mr-2" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="p-0 gap-0 border-0 shadow-xl rounded-xl">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/50">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/50">
                <FaTrash className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-sm font-semibold text-foreground">Confirm Delete</DialogTitle>
                <DialogDescription className="text-[10px] text-muted-foreground mt-1">
                  Are you sure you want to delete this {deleteConfirm?.type}? This action cannot be undone.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-border/50">
            <Button variant="outline" onClick={() => setDeleteConfirm(null)} className="h-9 text-xs border-0 shadow-sm">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteConfirm?.type === 'note' ? handleDeleteNote : handleDeleteSubtask}
              className="h-9 text-xs border-0 shadow-sm"
            >
              <FaTrash className="w-3.5 h-3.5 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

