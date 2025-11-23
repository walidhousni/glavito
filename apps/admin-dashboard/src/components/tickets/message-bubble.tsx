'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Reply,
  Forward,
  Copy,
  MoreVertical,
  Trash2,
  Smile,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { EmojiPicker } from './emoji-picker';

export interface MessageBubbleProps {
  id: string;
  content: string;
  senderType: 'customer' | 'agent' | 'system';
  senderName?: string;
  senderAvatar?: string;
  timestamp: Date;
  isInternalNote?: boolean;
  reactions?: Array<{
    emoji: string;
    userId: string;
    userName?: string;
  }>;
  audioUrl?: string;
  audioDuration?: number;
  attachments?: Array<{
    id: string;
    type: string;
    url: string;
    filename?: string;
  }>;
  currentUserId?: string;
  onReply?: () => void;
  onForward?: () => void;
  onDelete?: () => void;
  onReact?: (emoji: string) => void;
}

export function MessageBubble({
  id,
  content,
  senderType,
  senderName,
  senderAvatar,
  timestamp,
  isInternalNote = false,
  reactions = [],
  audioUrl,
  audioDuration,
  attachments = [],
  currentUserId,
  onReply,
  onForward,
  onDelete,
  onReact,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);

  const isAgent = senderType === 'agent';
  const isSystem = senderType === 'system';

  // Safely convert timestamp to Date and validate
  const dateTimestamp = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const isValidDate = !isNaN(dateTimestamp.getTime());
  const displayTime = isValidDate 
    ? formatDistanceToNow(dateTimestamp, { addSuffix: true })
    : 'Just now';

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  if (isSystem) {
    return (
      <div className="flex justify-center my-4">
        <div className="bg-muted px-4 py-2 rounded-full text-xs text-muted-foreground">
          {content}
        </div>
      </div>
    );
  }

  if (isInternalNote) {
    return (
      <div className="my-4 mx-4">
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <FileText className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-amber-900 dark:text-amber-100">
                  {senderName || 'Team Member'}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {displayTime}
                </span>
                <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                  Internal Note
                </span>
              </div>
              <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                {content}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors',
        isAgent && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-white/50 dark:ring-slate-900/50 shadow-md">
        {senderAvatar && <AvatarImage src={senderAvatar} />}
        <AvatarFallback className={cn(
          'font-semibold shadow-inner',
          isAgent 
            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
            : 'bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-700 dark:to-slate-800 text-slate-700 dark:text-slate-200'
        )}>
          {(senderName || 'U')[0].toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Message Content */}
      <div className={cn('flex-1 min-w-0', isAgent && 'flex flex-col items-end')}>
        {/* Sender Name & Time */}
        <div className={cn('flex items-center gap-2 mb-1', isAgent && 'flex-row-reverse')}>
          <span className="text-sm font-medium">
            {senderName || (isAgent ? 'Agent' : 'Customer')}
          </span>
          <span className="text-xs text-muted-foreground">
            {displayTime}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={cn(
            'conversation-message-bubble inline-block max-w-[70%] px-4 py-3 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg',
            isAgent
              ? 'conversation-message-bubble-agent bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-tr-sm shadow-blue-500/30'
              : 'conversation-message-bubble-customer bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 text-foreground rounded-tl-sm border border-slate-200/50 dark:border-slate-700/50'
          )}
        >
          {/* Audio Message */}
          {audioUrl && (
            <div className="mb-2">
              <audio controls className="w-full max-w-xs">
                <source src={audioUrl} type="audio/mpeg" />
                Your browser does not support the audio element.
              </audio>
              {audioDuration && (
                <p className="text-xs mt-1 opacity-70">
                  Duration: {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}
                </p>
              )}
            </div>
          )}

          {/* Text Content */}
          <p className="text-sm whitespace-pre-wrap break-words">{content}</p>

          {/* Attachments */}
          {attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex items-center gap-2 p-2 rounded bg-background/10 hover:bg-background/20 transition-colors"
                >
                  {attachment.type === 'image' ? (
                    <img
                      src={attachment.url}
                      alt={attachment.filename}
                      className="max-w-xs rounded"
                    />
                  ) : (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs underline"
                    >
                      {attachment.filename || 'Download file'}
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {Object.entries(groupedReactions).map(([emoji, users]) => {
              const hasUserReaction = currentUserId ? users.some(u => u.userId === currentUserId) : false;
              return (
                <button
                  key={emoji}
                  onClick={() => onReact?.(emoji)}
                  className={cn(
                    "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors",
                    hasUserReaction
                      ? "bg-primary/20 border border-primary/30"
                      : "bg-muted hover:bg-muted/80 border border-transparent"
                  )}
                  title={users.map(u => u.userName || 'User').join(', ')}
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">{users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div
        className={cn(
          'conversation-hover-actions flex items-center gap-1',
          !showActions && 'opacity-0'
        )}
      >
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={onReply}
        >
          <Reply className="h-3.5 w-3.5" />
        </Button>

        <EmojiPicker onEmojiSelect={(emoji) => onReact?.(emoji)}>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
          >
            <Smile className="h-3.5 w-3.5" />
          </Button>
        </EmojiPicker>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onReply}>
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onForward}>
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigator.clipboard.writeText(content)}>
              <Copy className="h-4 w-4 mr-2" />
              Copy
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

