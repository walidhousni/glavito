'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  X,
  UserPlus,
  CheckCircle,
  AlertTriangle,
  Tag,
  Trash2,
  MoreHorizontal,
  Users,
  Star,
  Archive,
  Merge,
  Send,
  Loader2,
  Zap
} from 'lucide-react';

interface BulkActionsBarProps {
  selectedCount: number;
  onAction: (action: string, params?: Record<string, unknown>) => Promise<void>;
  onClear: () => void;
  canDelete?: boolean;
}

interface ActionParams {
  agentId?: string;
  status?: string;
  priority?: string;
  reason?: string;
  tagsInput?: string;
  tags?: string[];
}

export function BulkActionsBar({ selectedCount, onAction, onClear, canDelete = true }: BulkActionsBarProps) {
  const t = useTranslations('tickets');
  type BulkDialogKey = 'assign' | 'update_status' | 'update_priority' | 'add_tags' | 'delete';
  const [showDialog, setShowDialog] = useState<BulkDialogKey | null>(null);
  const [actionParams, setActionParams] = useState<ActionParams>({});
  const [loading, setLoading] = useState(false);

  // Mock data - in real app, these would come from API
  const agents = [
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    { id: '3', name: 'Mike Johnson', email: 'mike@example.com' }
  ];

  const statusOptions = [
    { value: 'open', label: t('status.open') },
    { value: 'in_progress', label: t('status.in_progress') },
    { value: 'waiting', label: t('status.waiting') },
    { value: 'resolved', label: t('status.resolved') },
    { value: 'closed', label: t('status.closed') }
  ];

  const priorityOptions = [
    { value: 'low', label: t('priority.low') },
    { value: 'medium', label: t('priority.medium') },
    { value: 'high', label: t('priority.high') },
    { value: 'urgent', label: t('priority.urgent') },
    { value: 'critical', label: t('priority.critical') }
  ];

  const handleAction = async (action: string, params?: Record<string, unknown>) => {
    setLoading(true);
    try {
      await onAction(action, params);
      setShowDialog(null);
      setActionParams({});
    } catch (error) {
      console.error('Bulk action failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const openDialog = (action: BulkDialogKey) => {
    setShowDialog(action);
    setActionParams({});
  };

  const renderDialog = () => {
    if (!showDialog) return null;

    const dialogConfig: Record<BulkDialogKey, {
      title: string;
      description: string;
      content: React.ReactNode;
      action: () => Promise<void>;
      disabled: boolean;
      destructive?: boolean;
    }> = {
      assign: {
        title: t('bulkActions.assignTitle'),
        description: t('bulkActions.assignDescription', { count: selectedCount }),
        content: (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent">{t('bulkActions.selectAgent')}</Label>
              <Select
                value={actionParams.agentId || ''}
                onValueChange={(value) => setActionParams({ ...actionParams, agentId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('bulkActions.chooseAgent')} />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4" />
                        <span>{agent.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">{t('bulkActions.reason')} ({t('optional')})</Label>
              <Textarea
                id="reason"
                placeholder={t('bulkActions.assignReason')}
                value={actionParams.reason || ''}
                onChange={(e) => setActionParams({ ...actionParams, reason: e.target.value })}
              />
            </div>
          </div>
        ),
        action: () => handleAction('assign', actionParams),
        disabled: !actionParams.agentId
      },
      update_status: {
        title: t('bulkActions.updateStatusTitle'),
        description: t('bulkActions.updateStatusDescription', { count: selectedCount }),
        content: (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">{t('bulkActions.selectStatus')}</Label>
              <Select
                value={actionParams.status || ''}
                onValueChange={(value) => setActionParams({ ...actionParams, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('bulkActions.chooseStatus')} />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">{t('bulkActions.reason')} ({t('optional')})</Label>
              <Textarea
                id="reason"
                placeholder={t('bulkActions.statusReason')}
                value={actionParams.reason || ''}
                onChange={(e) => setActionParams({ ...actionParams, reason: e.target.value })}
              />
            </div>
          </div>
        ),
        action: () => handleAction('update_status', actionParams),
        disabled: !actionParams.status
      },
      update_priority: {
        title: t('bulkActions.updatePriorityTitle'),
        description: t('bulkActions.updatePriorityDescription', { count: selectedCount }),
        content: (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="priority">{t('bulkActions.selectPriority')}</Label>
              <Select
                value={actionParams.priority || ''}
                onValueChange={(value) => setActionParams({ ...actionParams, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('bulkActions.choosePriority')} />
                </SelectTrigger>
                <SelectContent>
                  {priorityOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">{t('bulkActions.reason')} ({t('optional')})</Label>
              <Textarea
                id="reason"
                placeholder={t('bulkActions.priorityReason')}
                value={actionParams.reason || ''}
                onChange={(e) => setActionParams({ ...actionParams, reason: e.target.value })}
              />
            </div>
          </div>
        ),
        action: () => handleAction('update_priority', actionParams),
        disabled: !actionParams.priority
      },
      add_tags: {
        title: t('bulkActions.addTagsTitle'),
        description: t('bulkActions.addTagsDescription', { count: selectedCount }),
        content: (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tags">{t('bulkActions.enterTags')}</Label>
              <Input
                id="tags"
                placeholder={t('bulkActions.tagsPlaceholder')}
                value={actionParams.tagsInput || ''}
                onChange={(e) => setActionParams({
                  ...actionParams,
                  tagsInput: e.target.value,
                  tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                })}
              />
              <p className="text-xs text-muted-foreground">
                {t('bulkActions.tagsHelp')}
              </p>
            </div>
            {actionParams.tags && actionParams.tags.length > 0 && (
              <div className="space-y-2">
                <Label>{t('bulkActions.tagsPreview')}</Label>
                <div className="flex flex-wrap gap-1">
                  {actionParams.tags.map((tag: string, index: number) => (
                    <Badge key={index} variant="secondary">
                      #{tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
        action: () => handleAction('add_tags', { tags: actionParams.tags }),
        disabled: !actionParams.tags || actionParams.tags.length === 0
      },
      delete: {
        title: t('bulkActions.deleteTitle'),
        description: t('bulkActions.deleteDescription', { count: selectedCount }),
        content: (
          <div className="space-y-4">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <p className="text-sm text-red-800 font-medium">
                  {t('bulkActions.deleteWarning')}
                </p>
              </div>
              <p className="text-sm text-red-700 mt-2">
                {t('bulkActions.deleteConfirmation')}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">{t('bulkActions.deleteReason')}</Label>
              <Textarea
                id="reason"
                placeholder={t('bulkActions.deleteReasonPlaceholder')}
                value={actionParams.reason || ''}
                onChange={(e) => setActionParams({ ...actionParams, reason: e.target.value })}
              />
            </div>
          </div>
        ),
        action: () => handleAction('delete', actionParams),
        disabled: false,
        destructive: true
      }
    };

    const config = showDialog ? dialogConfig[showDialog] : null;
    if (!config) return null;

    return (
      <Dialog open={!!showDialog} onOpenChange={() => setShowDialog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>
          {config.content}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDialog(null)}
              disabled={loading}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={config.action}
              disabled={config.disabled || loading}
              variant={config.destructive ? "destructive" : "default"}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>{t('common.processing')}</span>
                </div>
              ) : (
                t('common.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
        >
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200/50 dark:border-gray-800/50 rounded-2xl shadow-2xl shadow-blue-500/10 p-4 min-w-[28rem] max-w-4xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Badge
                    variant="secondary"
                    className="px-3 py-1.5 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    {selectedCount} {t('bulkActions.selected')}
                  </Badge>
                </motion.div>
                <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {t('bulkActions.chooseAction')}
                </span>
              </div>
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="h-8 w-8 p-0 hover:bg-red-50 dark:hover:bg-red-950/20 hover:text-red-600 dark:hover:text-red-400 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog('assign')}
                  className="flex items-center space-x-2 hover:bg-blue-50 dark:hover:bg-blue-950/20 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-700 dark:hover:text-blue-300 transition-all duration-200"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>{t('bulkActions.assign')}</span>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog('update_status')}
                  className="flex items-center space-x-2 hover:bg-green-50 dark:hover:bg-green-950/20 hover:border-green-300 dark:hover:border-green-700 hover:text-green-700 dark:hover:text-green-300 transition-all duration-200"
                >
                  <CheckCircle className="h-4 w-4" />
                  <span>{t('bulkActions.status')}</span>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog('update_priority')}
                  className="flex items-center space-x-2 hover:bg-orange-50 dark:hover:bg-orange-950/20 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-700 dark:hover:text-orange-300 transition-all duration-200"
                >
                  <Star className="h-4 w-4" />
                  <span>{t('bulkActions.priority')}</span>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.35 }}
              >
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openDialog('add_tags')}
                  className="flex items-center space-x-2 hover:bg-purple-50 dark:hover:bg-purple-950/20 hover:border-purple-300 dark:hover:border-purple-700 hover:text-purple-700 dark:hover:text-purple-300 transition-all duration-200"
                >
                  <Tag className="h-4 w-4" />
                  <span>{t('bulkActions.tags')}</span>
                </Button>
              </motion.div>

              {/* More Actions Dropdown */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-all duration-200"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-gray-200/50 dark:border-gray-800/50"
                  >
                    <DropdownMenuLabel className="text-gray-900 dark:text-gray-100">
                      {t('bulkActions.moreActions')}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() => handleAction('remove_tags')}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Tag className="mr-2 h-4 w-4" />
                      {t('bulkActions.removeTags')}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleAction('merge')}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Merge className="mr-2 h-4 w-4" />
                      {t('bulkActions.merge')}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleAction('archive')}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Archive className="mr-2 h-4 w-4" />
                      {t('bulkActions.archive')}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => handleAction('export')}
                      className="hover:bg-gray-50 dark:hover:bg-gray-800"
                    >
                      <Send className="mr-2 h-4 w-4" />
                      {t('bulkActions.export')}
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    {canDelete && (
                      <DropdownMenuItem
                        onClick={() => openDialog('delete')}
                        className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 focus:text-red-600 dark:focus:text-red-400"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {t('bulkActions.delete')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {renderDialog()}
    </>
  );
}