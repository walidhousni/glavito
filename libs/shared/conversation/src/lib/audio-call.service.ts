import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@glavito/shared-database';
import { AdvancedEventBusService } from '@glavito/shared-kafka';

export interface InitiateCallDto {
  conversationId: string;
  initiatorId: string;
  recipientId: string;
  callType: 'audio' | 'video';
}

export interface CallSession {
  id: string;
  conversationId: string;
  initiatorId: string;
  recipientId: string;
  callType: 'audio' | 'video';
  status: 'initiated' | 'ringing' | 'in_progress' | 'ended' | 'missed' | 'declined';
  startedAt?: Date;
  endedAt?: Date;
  duration?: number; // in seconds
  recordingUrl?: string;
  transcription?: string;
}

export interface EndCallDto {
  callId: string;
  endedBy: string;
  recordingUrl?: string;
}

export interface UpdateCallStatusDto {
  callId: string;
  status: CallSession['status'];
}

/**
 * AudioCallService handles voice and video calls within conversations
 * Integrates with WebRTC for peer-to-peer connections
 * Can be extended to use Twilio Voice API or Agora.io for production
 */
@Injectable()
export class AudioCallService {
  private readonly logger = new Logger(AudioCallService.name);
  private readonly activeCalls = new Map<string, CallSession>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: AdvancedEventBusService
  ) {}

  /**
   * Initiate a new call
   */
  async initiateCall(dto: InitiateCallDto): Promise<CallSession> {
    const { conversationId, initiatorId, recipientId, callType } = dto;

    try {
      // Verify conversation exists
      const conversation = await this.prisma.conversationAdvanced.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new NotFoundException(`Conversation ${conversationId} not found`);
      }

      // Create call session
      const callSession: CallSession = {
        id: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        conversationId,
        initiatorId,
        recipientId,
        callType,
        status: 'initiated',
        startedAt: new Date(),
      };

      // Store in memory
      this.activeCalls.set(callSession.id, callSession);

      this.logger.log(`Initiated ${callType} call ${callSession.id} in conversation ${conversationId}`);

      // Publish event to notify recipient
      await this.eventBus.publish({
        eventType: 'call.initiated',
        eventId: callSession.id,
        aggregateId: conversationId,
        aggregateType: 'call',
        tenantId: '',
        timestamp: new Date(),
        version: '1.0',
        eventData: {
          callId: callSession.id,
          conversationId,
          initiatorId,
          recipientId,
          callType,
        },
        metadata: {
          source: 'audio-call-service',
        },
      });

      // Log event in conversation
      await this.prisma.conversationEventLog.create({
        data: {
          conversationId,
          eventType: 'call_initiated',
          eventData: {
            callId: callSession.id,
            callType,
            initiatorId,
            recipientId,
          },
          triggeredBy: initiatorId,
          triggeredByType: 'user',
        },
      });

      return callSession;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to initiate call: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Update call status (ringing, in_progress, etc.)
   */
  async updateCallStatus(dto: UpdateCallStatusDto): Promise<CallSession> {
    const { callId, status } = dto;

    const callSession = this.activeCalls.get(callId);
    if (!callSession) {
      throw new NotFoundException(`Call ${callId} not found`);
    }

    callSession.status = status;

    if (status === 'in_progress' && !callSession.startedAt) {
      callSession.startedAt = new Date();
    }

    this.logger.log(`Updated call ${callId} status to ${status}`);

    // Publish event
    await this.eventBus.publish({
      eventType: 'call.status.updated',
      eventId: callId,
      aggregateId: callSession.conversationId,
      aggregateType: 'call',
      tenantId: '',
      timestamp: new Date(),
      version: '1.0',
      eventData: {
        callId,
        conversationId: callSession.conversationId,
        status,
      },
      metadata: {
        source: 'audio-call-service',
      },
    });

    return callSession;
  }

  /**
   * End a call
   */
  async endCall(dto: EndCallDto): Promise<CallSession> {
    const { callId, endedBy, recordingUrl } = dto;

    try {
      const callSession = this.activeCalls.get(callId);
      if (!callSession) {
        throw new NotFoundException(`Call ${callId} not found`);
      }

      callSession.status = 'ended';
      callSession.endedAt = new Date();

      if (callSession.startedAt) {
        const durationMs = callSession.endedAt.getTime() - callSession.startedAt.getTime();
        callSession.duration = Math.floor(durationMs / 1000);
      }

      if (recordingUrl) {
        callSession.recordingUrl = recordingUrl;
      }

      this.logger.log(`Ended call ${callId} with duration ${callSession.duration}s`);

      // Publish event
      await this.eventBus.publish({
        eventType: 'call.ended',
        eventId: callId,
        aggregateId: callSession.conversationId,
        aggregateType: 'call',
        tenantId: '',
        timestamp: new Date(),
        version: '1.0',
        eventData: {
          callId,
          conversationId: callSession.conversationId,
          duration: callSession.duration,
          recordingUrl,
        },
        metadata: {
          source: 'audio-call-service',
        },
      });

      // Log event in conversation
      await this.prisma.conversationEventLog.create({
        data: {
          conversationId: callSession.conversationId,
          eventType: 'call_ended',
          eventData: {
            callId,
            callType: callSession.callType,
            duration: callSession.duration,
            recordingUrl,
          },
          triggeredBy: endedBy,
          triggeredByType: 'user',
        },
      });

      // Save call as a message in the conversation
      await this.saveCallAsMessage(callSession);

      // Remove from active calls
      this.activeCalls.delete(callId);

      return callSession;
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to end call: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Decline a call
   */
  async declineCall(callId: string, declinedBy: string): Promise<CallSession> {
    const callSession = this.activeCalls.get(callId);
    if (!callSession) {
      throw new NotFoundException(`Call ${callId} not found`);
    }

    callSession.status = 'declined';
    callSession.endedAt = new Date();

    this.logger.log(`Call ${callId} declined by ${declinedBy}`);

    // Publish event
    await this.eventBus.publish({
      eventType: 'call.declined',
      eventId: callId,
      aggregateId: callSession.conversationId,
      aggregateType: 'call',
      tenantId: '',
      timestamp: new Date(),
      version: '1.0',
      eventData: {
        callId,
        conversationId: callSession.conversationId,
        declinedBy,
      },
      metadata: {
        source: 'audio-call-service',
      },
    });

    // Log event
    await this.prisma.conversationEventLog.create({
      data: {
        conversationId: callSession.conversationId,
        eventType: 'call_declined',
        eventData: {
          callId,
          callType: callSession.callType,
        },
        triggeredBy: declinedBy,
        triggeredByType: 'user',
      },
    });

    // Remove from active calls
    this.activeCalls.delete(callId);

    return callSession;
  }

  /**
   * Get active call for a conversation
   */
  async getActiveCall(conversationId: string): Promise<CallSession | null> {
    for (const [, callSession] of this.activeCalls) {
      if (
        callSession.conversationId === conversationId &&
        (callSession.status === 'initiated' ||
          callSession.status === 'ringing' ||
          callSession.status === 'in_progress')
      ) {
        return callSession;
      }
    }
    return null;
  }

  /**
   * Get call session by ID
   */
  getCallSession(callId: string): CallSession | null {
    return this.activeCalls.get(callId) || null;
  }

  /**
   * Save call recording transcription
   */
  async saveCallTranscription(callId: string, transcription: string): Promise<void> {
    try {
      // Find the message associated with this call
      const message = await this.prisma.messageAdvanced.findFirst({
        where: {
          metadata: {
            path: ['callId'],
            equals: callId,
          },
        },
      });

      if (message) {
        await this.prisma.messageAdvanced.update({
          where: { id: message.id },
          data: { transcription },
        });

        this.logger.log(`Saved transcription for call ${callId}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to save call transcription: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Save call as a message in the conversation
   */
  private async saveCallAsMessage(callSession: CallSession): Promise<void> {
    try {
      const messageContent =
        callSession.status === 'ended'
          ? `${callSession.callType === 'audio' ? '📞' : '📹'} Call ended (${callSession.duration}s)`
          : `${callSession.callType === 'audio' ? '📞' : '📹'} Call ${callSession.status}`;

      await this.prisma.messageAdvanced.create({
        data: {
          conversationId: callSession.conversationId,
          senderId: callSession.initiatorId,
          senderType: 'agent',
          content: messageContent,
          messageType: 'call',
          channel: 'web',
          audioUrl: callSession.recordingUrl,
          audioDuration: callSession.duration,
          metadata: {
            callId: callSession.id,
            callType: callSession.callType,
            recipientId: callSession.recipientId,
            status: callSession.status,
          },
        },
      });

      this.logger.log(`Saved call ${callSession.id} as message`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to save call as message: ${err.message}`, err.stack);
    }
  }

  /**
   * Generate WebRTC signaling data (placeholder for actual WebRTC implementation)
   */
  async generateSignalingData(callId: string): Promise<Record<string, unknown>> {
    // In a real implementation, this would integrate with a WebRTC signaling server
    // or use a service like Twilio, Agora.io, or Daily.co
    return {
      callId,
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
      // Add TURN servers for production
    };
  }
}

