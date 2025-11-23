'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Paperclip,
  Smile,
  FileText,
  Sparkles,
  Clock,
  X,
  MessageSquare,
  Instagram,
  Mail,
  Phone,
} from 'lucide-react';
import { aiGetResponseSuggestions, aiGetAutopilotConfig } from '@/lib/api/ai-client';
import { EmojiPicker } from './emoji-picker';
import { AudioRecorder } from './audio-recorder';
import { useToast } from '@/components/ui/toast';

export interface MessageComposerProps {
  conversationId: string;
  onSendMessage: (content: string, type: 'reply' | 'internal_note', audioBlob?: Blob) => Promise<void>;
  onAttachFile?: (file: File) => Promise<void>;
  onRecordAudio?: () => void;
  onOpenEmojiPicker?: () => void;
  onOpenAIAssistant?: () => void;
  placeholder?: string;
  disabled?: boolean;
  defaultTab?: 'reply' | 'internal_note' | 'ai_assistant';
  channelType?: string; // Actual channel type from conversation
}

export function MessageComposer({
  conversationId,
  onSendMessage,
  onAttachFile,
  onRecordAudio,
  onOpenEmojiPicker,
  onOpenAIAssistant,
  placeholder = 'Type your message...',
  disabled = false,
  defaultTab = 'reply',
  channelType,
}: MessageComposerProps) {
  const [activeTab, setActiveTab] = useState<'reply' | 'internal_note' | 'ai_assistant'>(defaultTab);
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiTone, setAiTone] = useState<'professional' | 'friendly' | 'empathetic' | 'technical' | 'concise'>('professional');
  const [aiSuggestion, setAiSuggestion] = useState<string>('');
  const [aiSuggestionConfidence, setAiSuggestionConfidence] = useState<number | null>(null);
  const [aiRewrite, setAiRewrite] = useState<string>('');
  const [aiGrammar, setAiGrammar] = useState<string>('');
  const [autopilotMode, setAutopilotMode] = useState<'off'|'draft'|'auto'>('off');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const { success, error: toastError } = useToast();

  // Channel display configuration
  const channelConfig: Record<string, { label: string; icon: React.ReactNode }> = {
    whatsapp: { label: 'WhatsApp', icon: <MessageSquare className="h-3.5 w-3.5" /> },
    instagram: { label: 'Instagram', icon: <Instagram className="h-3.5 w-3.5" /> },
    email: { label: 'Email', icon: <Mail className="h-3.5 w-3.5" /> },
    sms: { label: 'SMS', icon: <Phone className="h-3.5 w-3.5" /> },
    chat: { label: 'Web Chat', icon: <MessageSquare className="h-3.5 w-3.5" /> },
    web: { label: 'Web', icon: <MessageSquare className="h-3.5 w-3.5" /> },
  };
  
  const channelInfo = channelType ? channelConfig[channelType.toLowerCase()] : null;

  useEffect(() => {
    // best-effort fetch autopilot config
    aiGetAutopilotConfig().then((cfg) => {
      if (cfg && (cfg as any).mode) setAutopilotMode((cfg as any).mode);
    }).catch(() => undefined);
  }, []);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  const handleSend = async () => {
    if ((!content.trim() && !audioBlob) || isSending) return;

    setIsSending(true);
    try {
      await onSendMessage(
        content || (audioBlob ? '🎤 Audio message' : ''),
        activeTab === 'internal_note' ? 'internal_note' : 'reply',
        audioBlob || undefined
      );
      setContent('');
      setAudioBlob(null);
      setAudioDuration(0);
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    if (!textareaRef.current) return;
    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const newContent = `${content.substring(0, start)}${emoji}${content.substring(end)}`;
    setContent(newContent);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const handleAudioRecorded = async (blob: Blob, duration: number) => {
    setAudioBlob(blob);
    setAudioDuration(duration);
  };

  const handleCancelAudio = () => {
    setAudioBlob(null);
    setAudioDuration(0);
  };

  const handleKeyDown = (evt: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.key === 'Enter' && (evt.metaKey || evt.ctrlKey)) {
      evt.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onAttachFile) {
      onAttachFile(file);
    }
  };


  const insertFormatting = (format: 'bold' | 'italic' | 'list' | 'link') => {
    if (!textareaRef.current) return;

    const start = textareaRef.current.selectionStart;
    const end = textareaRef.current.selectionEnd;
    const selectedText = content.substring(start, end);
    let newText = content;
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        newText = `${content.substring(0, start)}**${selectedText}**${content.substring(end)}`;
        newCursorPos = start + 2;
        break;
      case 'italic':
        newText = `${content.substring(0, start)}_${selectedText}_${content.substring(end)}`;
        newCursorPos = start + 1;
        break;
      case 'list':
        newText = `${content.substring(0, start)}\n- ${selectedText}${content.substring(end)}`;
        newCursorPos = start + 3;
        break;
      case 'link':
        newText = `${content.substring(0, start)}[${selectedText}](url)${content.substring(end)}`;
        newCursorPos = start + selectedText.length + 3;
        break;
    }

    setContent(newText);
    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  const getPlaceholder = () => {
    switch (activeTab) {
      case 'internal_note':
        return 'Add an internal note (only visible to team members)...';
      case 'ai_assistant':
        return 'Describe what you want to write, and AI will help...';
      default:
        return placeholder;
    }
  };

  const handleGenerateAI = async () => {
    if (!content.trim()) return;
    setAiLoading(true);
    setAiSuggestion('');
    setAiRewrite('');
    setAiGrammar('');
    try {
      const res = await aiGetResponseSuggestions(content, {
        improveTone: true,
        tone: aiTone,
        fixGrammar: true,
      });
      const best = res.responses?.[0]?.response || '';
      const conf = res.responses?.[0]?.confidence;
      setAiSuggestion(best);
      setAiSuggestionConfidence(typeof conf === 'number' ? conf : null);
      if (res.rewrite) setAiRewrite(res.rewrite);
      if (res.grammarFix) setAiGrammar(res.grammarFix);
    } catch {
      // silent
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="border-t bg-background">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'reply'|'internal_note'|'ai_assistant')} className="w-full">
        <div className="border-b px-4 py-2">
          <TabsList className="h-9">
            <TabsTrigger value="reply" className="text-sm">
              Reply
            </TabsTrigger>
            <TabsTrigger value="internal_note" className="text-sm">
              Internal note
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="p-4">
          {autopilotMode === 'draft' && aiSuggestion && (
            <div className="mb-3 rounded-md border bg-muted/40 p-3 flex items-start justify-between gap-3">
              <div className="text-sm">
                <div className="font-medium">AI Draft ready</div>
                <div className="text-xs text-muted-foreground">
                  Confidence {aiSuggestionConfidence !== null ? Math.round(aiSuggestionConfidence * 100) : 70}%
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setContent(aiSuggestion)}>Insert</Button>
                <Button size="sm" onClick={() => { setContent(aiSuggestion); void handleSend(); }}>Insert & Send</Button>
              </div>
            </div>
          )}
          <TabsContent value="reply" className="mt-0">
            <div className="space-y-3">
              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here"
                disabled={disabled || isSending}
                className="min-h-[120px] max-h-[300px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-muted/30"
              />

              {/* Audio Preview */}
              {audioBlob && (
                <div className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg border">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">Audio recording ready</p>
                    <p className="text-xs text-muted-foreground">
                      Duration: {Math.floor(audioDuration / 60)}:{(audioDuration % 60).toString().padStart(2, '0')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleCancelAudio}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <EmojiPicker onEmojiSelect={handleEmojiSelect}>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </EmojiPicker>
                  
                  <AudioRecorder
                    onRecordingComplete={handleAudioRecorded}
                    onCancel={handleCancelAudio}
                  />
                  
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-9 w-9 p-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                  
                  {/* Channel indicator - read-only */}
                  {channelInfo && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                      {channelInfo.icon}
                      <span>Sending via {channelInfo.label}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                    <Clock className="h-4 w-4" />
                  </Button>
                <Button
                  onClick={handleSend}
                  disabled={(!content.trim() && !audioBlob) || disabled || isSending}
                  className="gap-2"
                >
                  Send
                </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="internal_note" className="mt-0">
            <div className="space-y-3">
              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add an internal note (only visible to team members)..."
                disabled={disabled || isSending}
                className="min-h-[120px] max-h-[300px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-amber-50 dark:bg-amber-950/20"
              />

              {/* Action Buttons */}
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  💡 Internal notes are only visible to your team
                </p>

                <Button
                  onClick={handleSend}
                  disabled={!content.trim() || disabled || isSending}
                  variant="secondary"
                  className="gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Add Note
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ai_assistant" className="mt-0">
            <div className="space-y-3">
              <div className="rounded-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/20 dark:to-blue-950/20 p-4 border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-sm mb-1">AI Writing Assistant</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Describe what you want to write, and AI will generate a professional response
                    </p>

                    <Textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="E.g., 'Write a friendly response apologizing for the delay and offering a 10% discount'"
                      disabled={disabled || isSending}
                      className="min-h-[80px] mb-3"
                    />

                    <div className="flex items-center gap-2">
                      <Button onClick={handleGenerateAI} disabled={!content.trim() || disabled || aiLoading} className="gap-2">
                        <Sparkles className="h-4 w-4" />
                        {aiLoading ? 'Generating…' : 'Generate with AI'}
                      </Button>
                      <Button variant={aiTone==='professional'?'default':'outline'} size="sm" onClick={()=>setAiTone('professional')}>Professional</Button>
                      <Button variant={aiTone==='friendly'?'default':'outline'} size="sm" onClick={()=>setAiTone('friendly')}>Friendly</Button>
                      <Button variant={aiTone==='empathetic'?'default':'outline'} size="sm" onClick={()=>setAiTone('empathetic')}>Empathetic</Button>
                      <Button variant={aiTone==='technical'?'default':'outline'} size="sm" onClick={()=>setAiTone('technical')}>Technical</Button>
                      <Button variant={aiTone==='concise'?'default':'outline'} size="sm" onClick={()=>setAiTone('concise')}>Concise</Button>
                    </div>

                    {(aiSuggestion || aiRewrite || aiGrammar) && (
                      <div className="mt-4 grid gap-3 md:grid-cols-3">
                        {aiSuggestion && (
                          <div className="p-3 rounded-md bg-white dark:bg-neutral-900 border">
                            <p className="text-xs text-muted-foreground mb-1">Suggested Reply</p>
                            <p className="text-sm whitespace-pre-wrap">{aiSuggestion}</p>
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" onClick={()=>setContent(aiSuggestion)}>Insert</Button>
                              <Button size="sm" variant="outline" onClick={()=>navigator.clipboard.writeText(aiSuggestion)}>Copy</Button>
                            </div>
                          </div>
                        )}
                        {aiRewrite && (
                          <div className="p-3 rounded-md bg-white dark:bg-neutral-900 border">
                            <p className="text-xs text-muted-foreground mb-1">Tone Rewrite</p>
                            <p className="text-sm whitespace-pre-wrap">{aiRewrite}</p>
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" onClick={()=>setContent(aiRewrite)}>Insert</Button>
                              <Button size="sm" variant="outline" onClick={()=>navigator.clipboard.writeText(aiRewrite)}>Copy</Button>
                            </div>
                          </div>
                        )}
                        {aiGrammar && (
                          <div className="p-3 rounded-md bg-white dark:bg-neutral-900 border">
                            <p className="text-xs text-muted-foreground mb-1">Grammar Fix</p>
                            <p className="text-sm whitespace-pre-wrap">{aiGrammar}</p>
                            <div className="mt-2 flex gap-2">
                              <Button size="sm" onClick={()=>setContent(aiGrammar)}>Insert</Button>
                              <Button size="sm" variant="outline" onClick={()=>navigator.clipboard.writeText(aiGrammar)}>Copy</Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleFileSelect}
        accept="image/*,video/*,application/pdf,.doc,.docx,.xls,.xlsx"
      />
    </div>
  );
}

