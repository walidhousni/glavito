import { Injectable } from '@nestjs/common'
import { DatabaseService } from '@glavito/shared-database'
import type { Response } from 'express'

export type PublicChatRole = 'user' | 'assistant'
export type PublicChatMessage = { role: PublicChatRole; text: string; ts: number }
export type PublicChatSession = { tenantId: string; createdAt: number; messages: PublicChatMessage[]; email?: string; name?: string; conversationId?: string; conversationChannel?: string }

@Injectable()
export class PublicChatSessionStore {
  private sessions = new Map<string, PublicChatSession>()
  private subscribers = new Map<string, Set<Response>>()
  private magicTokens = new Map<string, { sessionId: string; tenantId: string; email?: string; expiresAt: number }>()

  constructor(private readonly db: DatabaseService) {}

  createSession(tenantId: string, opts?: { email?: string; name?: string }): string {
    const sessionId = `sess_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
    this.sessions.set(sessionId, { tenantId, createdAt: Date.now(), messages: [], email: opts?.email, name: opts?.name })
    return sessionId
  }

  ensureSession(sessionId: string, tenantId: string): void {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, { tenantId, createdAt: Date.now(), messages: [] })
    }
  }

  appendMessage(sessionId: string, role: PublicChatRole, text: string, ts?: number): void {
    const sess = this.sessions.get(sessionId)
    if (!sess) return
    sess.messages.push({ role, text, ts: ts ?? Date.now() })
    // Broadcast to SSE subscribers
    this.broadcast(sessionId, { type: 'message', message: { role, text, ts: ts ?? Date.now() } })
    // Best-effort persistence if session is linked to a conversation
    const conversationId = sess.conversationId
    if (conversationId) {
      const senderType = role === 'user' ? 'customer' : 'assistant'
      const channel = sess.conversationChannel || 'web'
      // Fire and forget
      this.db.messageAdvanced.create({
        data: {
          conversationId,
          senderId: 'system',
          senderType,
          content: text,
          messageType: 'text',
          channel,
          metadata: { publicSessionId: sessionId },
        },
      }).catch(() => void 0)
    }
  }

  getMessages(sessionId: string, limit = 50): PublicChatMessage[] {
    const sess = this.sessions.get(sessionId)
    if (!sess) return []
    const list = sess.messages
    return list.slice(Math.max(0, list.length - limit))
  }

  getTenant(sessionId: string): string | null {
    return this.sessions.get(sessionId)?.tenantId || null
  }

  linkConversation(sessionId: string, conversationId: string, opts?: { channel?: string }): void {
    const sess = this.sessions.get(sessionId)
    if (!sess) return
    const wasUnlinked = !sess.conversationId
    sess.conversationId = conversationId
    if (opts?.channel) sess.conversationChannel = opts.channel
    this.broadcast(sessionId, { type: 'conversation.linked', conversationId })
    // If this is the first time we link, persist backlog best-effort
    if (wasUnlinked && Array.isArray(sess.messages) && sess.messages.length) {
      const channel = sess.conversationChannel || 'web'
      const backlog = sess.messages.slice(-50)
      for (const m of backlog) {
        const senderType = m.role === 'user' ? 'customer' : 'assistant'
        this.db.messageAdvanced.create({
          data: {
            conversationId,
            senderId: 'system',
            senderType,
            content: m.text,
            messageType: 'text',
            channel,
            metadata: { publicSessionId: sessionId, ts: m.ts },
          },
        }).catch(() => void 0)
      }
    }
  }

  getConversationId(sessionId: string): string | undefined {
    return this.sessions.get(sessionId)?.conversationId
  }

  addSubscriber(sessionId: string, res: Response): void {
    const set = this.subscribers.get(sessionId) || new Set<Response>()
    set.add(res)
    this.subscribers.set(sessionId, set)
  }

  removeSubscriber(sessionId: string, res: Response): void {
    const set = this.subscribers.get(sessionId)
    if (!set) return
    set.delete(res)
    if (set.size === 0) this.subscribers.delete(sessionId)
  }

  broadcast(sessionId: string, payload: unknown): void {
    const set = this.subscribers.get(sessionId)
    if (!set) return
    const data = `data: ${JSON.stringify(payload)}\n\n`
    for (const res of set) {
      try { res.write(data) } catch { /* ignore broken pipe */ }
    }
  }

  // --- Magic-link tokens ---
  createMagicLinkToken(sessionId: string, tenantId: string, email?: string): string {
    const token = `ml_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    const expiresAt = Date.now() + 3 * 24 * 60 * 60 * 1000 // 3 days
    this.magicTokens.set(token, { sessionId, tenantId, email, expiresAt })
    return token
  }

  verifyMagicLinkToken(token: string): { sessionId: string; tenantId: string } | null {
    const entry = this.magicTokens.get(token)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.magicTokens.delete(token)
      return null
    }
    this.magicTokens.delete(token)
    return { sessionId: entry.sessionId, tenantId: entry.tenantId }
  }
}


