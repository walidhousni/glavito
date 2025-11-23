import { Injectable, Logger } from '@nestjs/common'
import { WhatsAppAdapter } from '@glavito/shared-conversation'
import { InstagramAdapter } from '@glavito/shared-conversation'
import { EmailService } from '../../auth/email.service'
import { PublicChatSessionStore } from '../public-chat.store'

export interface ChannelMessage {
  content: string
  recipientId: string
  messageType?: 'text' | 'image' | 'template'
  metadata?: Record<string, unknown>
  attachments?: Array<{ url: string; type: string; filename?: string }>
}

@Injectable()
export class ChannelOrchestratorService {
  private readonly logger = new Logger(ChannelOrchestratorService.name)

  constructor(
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly emailService: EmailService,
    private readonly sessionStore: PublicChatSessionStore,
  ) {}

  async sendToAllChannels(sessionId: string, message: ChannelMessage): Promise<void> {
    const linkedChannels = this.sessionStore.getLinkedChannels(sessionId)
    if (!linkedChannels) {
      this.logger.debug(`No linked channels for session ${sessionId}`)
      return
    }

    const promises: Promise<void>[] = []

    // Send to WhatsApp if linked and verified
    if (linkedChannels.whatsapp?.verified && linkedChannels.whatsapp.phoneNumber) {
      promises.push(this.sendToWhatsApp(sessionId, linkedChannels.whatsapp.phoneNumber, message))
    }

    // Send to Instagram if linked and verified
    if (linkedChannels.instagram?.verified && linkedChannels.instagram.igHandle) {
      promises.push(this.sendToInstagram(sessionId, linkedChannels.instagram.igHandle, message))
    }

    // Send to Email if linked
    if (linkedChannels.email?.email) {
      promises.push(this.sendToEmail(sessionId, linkedChannels.email.email, message))
    }

    await Promise.allSettled(promises)
  }

  private async sendToWhatsApp(sessionId: string, phoneNumber: string, message: ChannelMessage): Promise<void> {
    try {
      const result = await this.whatsappAdapter.sendMessage('public', {
        recipientId: phoneNumber,
        content: message.content,
        messageType: message.messageType || 'text',
        metadata: message.metadata,
        attachments: message.attachments?.map(a => ({ ...a, id: `att_${Date.now()}_${Math.random().toString(36).slice(2)}` })),
      })

      if (result.status === 'sent') {
        this.logger.log(`WhatsApp message sent to ${phoneNumber}: ${result.messageId}`)
      } else {
        this.logger.error(`WhatsApp message failed to ${phoneNumber}: ${result.error}`)
      }
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp message: ${error?.message}`)
      throw error
    }
  }

  private async sendToInstagram(sessionId: string, igHandle: string, message: ChannelMessage): Promise<void> {
    try {
      // Instagram requires IG user ID, not handle. In production, you'd map handle to ID
      const result = await this.instagramAdapter.sendMessage('public', {
        recipientId: igHandle, // In reality, this should be the Instagram user ID
        content: message.content,
        messageType: message.messageType || 'text',
        metadata: message.metadata,
        attachments: message.attachments?.map(a => ({ ...a, id: `att_${Date.now()}_${Math.random().toString(36).slice(2)}` })),
      })

      if (result.status === 'sent') {
        this.logger.log(`Instagram message sent to ${igHandle}: ${result.messageId}`)
      } else {
        this.logger.error(`Instagram message failed to ${igHandle}: ${result.error}`)
      }
    } catch (error: any) {
      this.logger.error(`Failed to send Instagram message: ${error?.message}`)
      throw error
    }
  }

  private async sendToEmail(sessionId: string, email: string, message: ChannelMessage): Promise<void> {
    try {
      // Get tenant ID from session
      const session = this.sessionStore.getTenant(sessionId)
      if (!session) {
        this.logger.warn(`Cannot send email: session ${sessionId} not found`)
        return
      }

      await this.emailService.sendEmailForTenant(session, {
        to: email,
        subject: 'Support Response',
        html: `<p>${message.content.replace(/\n/g, '<br>')}</p>`,
      })

      this.logger.log(`Email sent to ${email}`)
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error?.message}`)
      throw error
    }
  }

  async sendToSpecificChannel(
    sessionId: string,
    channel: 'whatsapp' | 'instagram' | 'email',
    message: ChannelMessage
  ): Promise<void> {
    const linkedChannels = this.sessionStore.getLinkedChannels(sessionId)
    if (!linkedChannels) return

    switch (channel) {
      case 'whatsapp':
        if (linkedChannels.whatsapp?.verified && linkedChannels.whatsapp.phoneNumber) {
          await this.sendToWhatsApp(sessionId, linkedChannels.whatsapp.phoneNumber, message)
        }
        break
      case 'instagram':
        if (linkedChannels.instagram?.verified && linkedChannels.instagram.igHandle) {
          await this.sendToInstagram(sessionId, linkedChannels.instagram.igHandle, message)
        }
        break
      case 'email':
        if (linkedChannels.email?.email) {
          await this.sendToEmail(sessionId, linkedChannels.email.email, message)
        }
        break
    }
  }
}

