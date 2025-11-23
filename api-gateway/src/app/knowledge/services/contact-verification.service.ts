import { Injectable, Logger } from '@nestjs/common'
import { WhatsAppAdapter } from '@glavito/shared-conversation'
import { InstagramAdapter } from '@glavito/shared-conversation'
import { PublicChatSessionStore } from '../public-chat.store'

@Injectable()
export class ContactVerificationService {
  private readonly logger = new Logger(ContactVerificationService.name)
  private readonly MAX_ATTEMPTS = 3
  private readonly RATE_LIMIT_WINDOW = 60 * 1000 // 1 minute

  constructor(
    private readonly whatsappAdapter: WhatsAppAdapter,
    private readonly instagramAdapter: InstagramAdapter,
    private readonly sessionStore: PublicChatSessionStore,
  ) {}

  async sendWhatsAppVerification(sessionId: string, phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check rate limiting
      const linkedChannels = this.sessionStore.getLinkedChannels(sessionId)
      const whatsappChannel = linkedChannels?.whatsapp
      
      if (whatsappChannel) {
        if ((whatsappChannel.verificationAttempts || 0) >= this.MAX_ATTEMPTS) {
          return { success: false, error: 'Maximum verification attempts exceeded' }
        }

        if (whatsappChannel.lastVerificationAt && Date.now() - whatsappChannel.lastVerificationAt < this.RATE_LIMIT_WINDOW) {
          return { success: false, error: 'Please wait before requesting another code' }
        }
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      // Link the phone number if not already linked
      this.sessionStore.linkWhatsAppNumber(sessionId, phoneNumber, false)

      // Store the verification code
      this.sessionStore.setVerificationCode(sessionId, 'whatsapp', code)

      // Send verification code via WhatsApp
      // In production, use a pre-approved WhatsApp template
      const message = `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`
      
      const result = await this.whatsappAdapter.sendMessage('public', {
        recipientId: phoneNumber,
        content: message,
        messageType: 'text',
        metadata: { verificationType: 'public_chat_link' },
      })

      if (result.status === 'sent') {
        this.logger.log(`Verification code sent to WhatsApp ${phoneNumber}`)
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to send verification code' }
      }
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp verification: ${error?.message}`)
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }

  async sendInstagramVerification(sessionId: string, igHandle: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Check rate limiting
      const linkedChannels = this.sessionStore.getLinkedChannels(sessionId)
      const instagramChannel = linkedChannels?.instagram
      
      if (instagramChannel) {
        if ((instagramChannel.verificationAttempts || 0) >= this.MAX_ATTEMPTS) {
          return { success: false, error: 'Maximum verification attempts exceeded' }
        }

        if (instagramChannel.lastVerificationAt && Date.now() - instagramChannel.lastVerificationAt < this.RATE_LIMIT_WINDOW) {
          return { success: false, error: 'Please wait before requesting another code' }
        }
      }

      // Generate 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString()

      // Link the Instagram handle if not already linked
      this.sessionStore.linkInstagramHandle(sessionId, igHandle, false)

      // Store the verification code
      this.sessionStore.setVerificationCode(sessionId, 'instagram', code)

      // Send verification code via Instagram DM
      const message = `Your verification code is: ${code}\n\nThis code will expire in 10 minutes.`
      
      // Note: Instagram requires the numeric user ID, not the handle
      // In production, you'd need to resolve the handle to an ID first
      const result = await this.instagramAdapter.sendMessage('public', {
        recipientId: igHandle, // Should be Instagram user ID in production
        content: message,
        messageType: 'text',
        metadata: { verificationType: 'public_chat_link' },
      })

      if (result.status === 'sent') {
        this.logger.log(`Verification code sent to Instagram @${igHandle}`)
        return { success: true }
      } else {
        return { success: false, error: result.error || 'Failed to send verification code' }
      }
    } catch (error: any) {
      this.logger.error(`Failed to send Instagram verification: ${error?.message}`)
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }

  async verifyCode(sessionId: string, channel: 'whatsapp' | 'instagram', code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const success = this.sessionStore.verifyChannel(sessionId, channel, code)
      
      if (success) {
        this.logger.log(`Channel ${channel} verified for session ${sessionId}`)
        return { success: true }
      } else {
        return { success: false, error: 'Invalid verification code' }
      }
    } catch (error: any) {
      this.logger.error(`Failed to verify code: ${error?.message}`)
      return { success: false, error: error?.message || 'Unknown error' }
    }
  }

  async getVerificationStatus(sessionId: string): Promise<{
    whatsapp?: { verified: boolean; phoneNumber?: string; attemptsLeft: number }
    instagram?: { verified: boolean; igHandle?: string; attemptsLeft: number }
  }> {
    const linkedChannels = this.sessionStore.getLinkedChannels(sessionId)
    if (!linkedChannels) return {}

    const result: ReturnType<typeof this.getVerificationStatus> extends Promise<infer T> ? T : never = {}

    if (linkedChannels.whatsapp) {
      result.whatsapp = {
        verified: linkedChannels.whatsapp.verified,
        phoneNumber: linkedChannels.whatsapp.phoneNumber,
        attemptsLeft: Math.max(0, this.MAX_ATTEMPTS - (linkedChannels.whatsapp.verificationAttempts || 0)),
      }
    }

    if (linkedChannels.instagram) {
      result.instagram = {
        verified: linkedChannels.instagram.verified,
        igHandle: linkedChannels.instagram.igHandle,
        attemptsLeft: Math.max(0, this.MAX_ATTEMPTS - (linkedChannels.instagram.verificationAttempts || 0)),
      }
    }

    return result
  }
}

