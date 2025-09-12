import { Injectable } from '@nestjs/common'

@Injectable()
export class PublicChatLinkService {
  private phoneToSession = new Map<string, string>()
  private sessionToPhone = new Map<string, string>()

  private normalizePhone(input?: string): string | null {
    if (!input) return null
    const digits = String(input).replace(/\D/g, '')
    return digits || null
  }

  linkWhatsAppSender(sessionId: string, phone: string): void {
    const norm = this.normalizePhone(phone)
    if (!norm || !sessionId) return
    this.phoneToSession.set(norm, sessionId)
    this.sessionToPhone.set(sessionId, norm)
  }

  findSessionByWhatsApp(phone: string): string | null {
    const norm = this.normalizePhone(phone)
    if (!norm) return null
    return this.phoneToSession.get(norm) || null
  }

  findWhatsAppBySession(sessionId: string): string | null {
    return this.sessionToPhone.get(sessionId) || null
  }
}


