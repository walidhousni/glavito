'use client'

import React from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useTranslations } from 'next-intl'

interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  senderType: 'agent' | 'customer' | 'system' | 'bot'
  content: string
  messageType: string
  createdAt: string | Date
  attachments?: Array<{ id?: string; type: string; url: string; filename?: string; mimeType?: string; size?: number }>
}

interface ThreadViewProps {
  conversationId: string
  fetchMessages: (conversationId: string) => Promise<MessageItem[]>
  refreshKey?: number
}

export function ThreadView({ conversationId, fetchMessages, refreshKey }: ThreadViewProps) {
  const t = useTranslations('threadView')
  const [messages, setMessages] = React.useState<MessageItem[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const [error, setError] = React.useState<string | null>(null)
  const endRef = React.useRef<HTMLDivElement | null>(null)

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchMessages(conversationId)
        if (!cancelled) setMessages(Array.isArray(data) ? data : [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t('failedToLoadMessages'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    if (conversationId) load()
    return () => { cancelled = true }
  }, [conversationId, fetchMessages, refreshKey])

  React.useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fmt = (dt: string | Date) => {
    const d = typeof dt === 'string' ? new Date(dt) : dt
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  if (loading) return <div className="p-6 text-sm text-muted-foreground">{t('loadingMessages')}</div>
  if (error) return <div className="p-6 text-sm text-destructive">{error}</div>

  return (
    <div className="flex-1 overflow-y-auto p-6 bg-muted/20">
      <div className="space-y-4 max-w-4xl mx-auto">
        {messages.map(m => {
          const isAgent = m.senderType === 'agent' || m.senderType === 'system'
          return (
            <div key={m.id} className={isAgent ? 'flex justify-end' : 'flex justify-start'}>
              <div className="flex items-start gap-3 max-w-[75%]">
                {!isAgent && (
                  <Avatar className="h-8 w-8 mt-1"><AvatarFallback className="bg-muted text-muted-foreground text-sm">C</AvatarFallback></Avatar>
                )}
                <div className={isAgent ? 'bg-primary text-primary-foreground rounded-2xl rounded-tr-md p-4 shadow-sm' : 'bg-card border rounded-2xl rounded-tl-md p-4 shadow-sm'}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{m.content}</p>
                  {!!m.attachments?.length && (
                    <div className="mt-2 space-y-1">
                      {m.attachments.map((a, idx) => (
                        <a key={`${m.id}_att_${idx}`} href={a.url} target="_blank" rel="noreferrer" className="text-xs underline">
                          {a.filename || a.url}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className={isAgent ? 'flex items-center justify-end gap-2 mt-2' : 'flex items-center gap-2 mt-2'}>
                    <span className={isAgent ? 'text-xs text-primary-foreground/70' : 'text-xs text-muted-foreground'}>{fmt(m.createdAt)}</span>
                  </div>
                </div>
                {isAgent && (
                  <Avatar className="h-8 w-8 mt-1"><AvatarFallback className="bg-primary/10 text-primary text-sm">A</AvatarFallback></Avatar>
                )}
              </div>
            </div>
          )
        })}
        <div ref={endRef} />
      </div>
    </div>
  )
}


