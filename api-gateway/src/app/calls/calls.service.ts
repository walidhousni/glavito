import { Injectable } from '@nestjs/common';
import { DatabaseService } from '@glavito/shared-database';
import { Prisma } from '@prisma/client';
import { TelephonyService } from './telephony.service';
import { TranscriptionService } from './transcription.service';
import { ModuleRef } from '@nestjs/core';

@Injectable()
export class CallsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly telephony: TelephonyService,
    private readonly transcription: TranscriptionService,
    private readonly moduleRef: ModuleRef,
  ) {}

  private async getAiService(): Promise<{ analyzeContent: (args: { content: string; context?: Record<string, unknown>; analysisTypes: string[] }) => Promise<unknown> } | null> {
    try {
      const aiLib = await import('@glavito/shared-ai')
      const svc = this.moduleRef.get(aiLib.AIIntelligenceService, { strict: false }) as { analyzeContent?: (args: { content: string; context?: Record<string, unknown>; analysisTypes: string[] }) => Promise<unknown> } | undefined
      return svc && typeof svc.analyzeContent === 'function' ? { analyzeContent: svc.analyzeContent.bind(svc) } : null
    } catch {
      return null
    }
  }

  async createCall(params: {
    tenantId: string;
    conversationId?: string;
    startedBy: string;
    type: 'voice' | 'video';
    metadata?: Record<string, unknown>;
    customerId?: string;
    channelId?: string;
  }) {
    // Validate conversation exists if conversationId is provided
    let validConversationId: string | null = null;
    if (params.conversationId) {
      // First check if it's actually a conversation ID
      const conversation = await this.db.conversation.findFirst({
        where: {
          id: params.conversationId,
          tenantId: params.tenantId,
        },
      });
      
      if (conversation) {
        validConversationId = conversation.id;
      } else {
        // Check if it might be a ticket ID instead
        const ticket = await this.db.ticket.findFirst({
          where: {
            id: params.conversationId,
            tenantId: params.tenantId,
          },
          include: {
            conversations: {
              take: 1,
              orderBy: { createdAt: 'desc' }
            },
            customer: true,
            channel: true
          }
        });
        
        if (ticket) {
          // If ticket has conversations, use the latest one
          if (ticket.conversations && ticket.conversations.length > 0) {
            validConversationId = ticket.conversations[0].id;
          } else if (ticket.customer && ticket.channel) {
            // Create a new conversation for this ticket
            try {
              const newConversation = await this.db.conversation.create({
                data: {
                  tenantId: params.tenantId,
                  ticketId: ticket.id,
                  customerId: ticket.customer.id,
                  channelId: ticket.channel.id,
                  subject: ticket.subject || 'Call conversation',
                  status: 'active',
                  metadata: {},
                },
              });
              validConversationId = newConversation.id;
            } catch (error) {
              console.warn('Failed to create conversation for ticket:', error);
            }
          }
        }
      }
    }

    const call = await this.db.call.create({
      data: {
        tenantId: params.tenantId,
        conversationId: validConversationId,
        startedBy: params.startedBy,
        type: params.type,
        ...(params.metadata ? { metadata: params.metadata as Prisma.InputJsonValue } : {}),
        status: 'active',
      },
    });
    return call;
  }

  async endCall(callId: string, updates?: { recordingUrl?: string; transcription?: string }) {
    const call = await this.db.call.update({
      where: { id: callId },
      data: {
        status: 'ended',
        endedAt: new Date(),
        ...(updates?.recordingUrl ? { recordingUrl: updates.recordingUrl } : {}),
        ...(updates?.transcription ? { transcription: updates.transcription } : {}),
      },
    });
    try {
      const durationSec = call.startedAt ? Math.max(0, Math.floor(((call.endedAt as Date) || new Date()).getTime() - (call.startedAt as Date).getTime()) / 1000) : 0;
      await this.db.callUsage.upsert({
        where: { callId: call.id },
        update: { durationSec },
        create: {
          callId: call.id,
          tenantId: call.tenantId,
          durationSec,
        },
      });
      // If no transcription provided but we have a recording URL on the call or in updates, start background transcription
      try {
        const effectiveRecordingUrl = updates?.recordingUrl || call.recordingUrl
        if (!updates?.transcription && effectiveRecordingUrl && !call.transcription) {
          void this.transcription.transcribeRecording(call.id, effectiveRecordingUrl).catch(() => void 0)
        }
      } catch (_e) { /* ignore transcription start failure */ }
      // Trigger best-effort AI sales coaching analysis if we have a transcript
      const transcriptText = updates?.transcription || call.transcription
      if (transcriptText && transcriptText.trim().length > 20) {
        try {
          const ai = await this.getAiService()
          if (ai) {
            await ai.analyzeContent({
              content: transcriptText,
              context: { callId: call.id, conversationId: call.conversationId || undefined, tenantId: call.tenantId },
              analysisTypes: ['sales_coaching']
            })
          }
        } catch (_e) { /* ignore AI failure */ }
      }
    } catch (_e) { /* ignore usage upsert failure */ }
    return call;
  }

  async listCalls(params: { tenantId: string; conversationId?: string; status?: string }) {
    const where: Record<string, unknown> = { tenantId: params.tenantId };
    if (params.conversationId) where.conversationId = params.conversationId;
    if (params.status) where.status = params.status;
    return this.db.call.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      include: { participants: true },
    });
  }

  async getCall(id: string) {
    return this.db.call.findUnique({ where: { id }, include: { participants: true } });
  }

  async addParticipant(callId: string, data: { userId?: string; customerId?: string; role?: string }) {
    return this.db.callParticipant.create({
      data: {
        callId,
        userId: data.userId ?? null,
        customerId: data.customerId ?? null,
        role: data.role ?? 'participant',
        status: 'joined',
      },
    });
  }

  async leaveParticipant(participantId: string) {
    return this.db.callParticipant.update({
      where: { id: participantId },
      data: { status: 'left', leftAt: new Date() },
    });
  }

  async startOutboundCall(params: { tenantId: string; startedBy: string; to: string; from?: string }) {
    const from = params.from || process.env.TWILIO_FROM_NUMBER || '';
    // Create call row first
    const call = await this.db.call.create({
      data: {
        tenantId: params.tenantId,
        startedBy: params.startedBy,
        type: 'voice',
        status: 'active',
        provider: 'twilio',
        direction: 'outbound',
        toNumber: params.to,
        fromNumber: from,
      },
    });

    // Provider initiate via service
    try {
      const { sid } = await this.telephony.startOutboundCall({ to: params.to, from, twimlUrl: `${process.env.PUBLIC_API_BASE_URL || 'http://localhost:3001'}/api/calls/telephony/twilio/voice` });
      if (sid) await this.db.call.update({ where: { id: call.id }, data: { externalId: sid } });
    } catch (_e) { /* ignore provider failure */ }

    return call;
  }
}



