'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Paperclip, Smile, Send } from 'lucide-react'

interface AttachmentSpec { url: string; filename: string; type: string; size: number; mimeType: string }

interface ConversationComposerProps {
  placeholder?: string
  message: string
  onChange: (v: string) => void
  onSend: () => Promise<void> | void
  sending?: boolean
  onUpload: (files: AttachmentSpec[]) => Promise<void>
}

export function ConversationComposer({ placeholder, message, onChange, onSend, sending, onUpload }: ConversationComposerProps) {
  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-2">
            <label className="inline-flex">
              <input type="file" multiple className="hidden" onChange={async (e) => {
                const files = Array.from(e.target.files || [])
                if (!files.length) return
                const specs: AttachmentSpec[] = files.map(f => ({ url: '', filename: f.name, type: f.type.startsWith('image/') ? 'image' : f.type.startsWith('video/') ? 'video' : f.type.startsWith('audio/') ? 'audio' : 'document', size: f.size, mimeType: f.type || 'application/octet-stream' }))
                await onUpload(specs)
              }} />
              <Button variant="ghost" size="sm" className="h-10 w-10 p-0"><Paperclip className="h-4 w-4 text-muted-foreground" /></Button>
            </label>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0"><Smile className="h-4 w-4 text-muted-foreground" /></Button>
          </div>
          <div className="flex-1 relative">
            <Input placeholder={placeholder || 'Type your message...'} value={message} onChange={(e) => onChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend() } }} className="min-h-[44px] pr-12 resize-none" />
            <Button onClick={onSend} disabled={!message.trim() || !!sending} size="sm" className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0">{sending ? <span className="animate-spin">⏳</span> : <Send className="h-4 w-4" />}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}


