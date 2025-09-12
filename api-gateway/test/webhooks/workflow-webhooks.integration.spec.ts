import { WhatsAppWebhookController } from '../../src/app/webhooks/whatsapp-webhook.controller'
import { InstagramWebhookController } from '../../src/app/webhooks/instagram-webhook.controller'
import { PrismaService } from '@glavito/shared-database'
import { EnhancedConversationOrchestratorService } from '@glavito/shared-conversation'
import { WhatsAppAdapter, InstagramAdapter } from '@glavito/shared-conversation'
import { ConfigService } from '@nestjs/config'
import { PublicChatLinkService } from '../../src/app/webhooks/public-chat-link.service'
import { PublicChatSessionStore } from '../../src/app/knowledge/public-chat.store'
import { WorkflowService } from '@glavito/shared-workflow'

describe('Webhook → Workflow triggers', () => {
  const prisma = {
    channelAdvanced: { findFirst: jest.fn().mockResolvedValue({ tenantId: 'tenant1' }) },
    channel: { findMany: jest.fn().mockResolvedValue([]) }
  } as unknown as PrismaService

  const orchestrator = {
    processWebhook: jest.fn().mockResolvedValue({ success: true, data: { id: 'msg1', conversationId: 'conv1', senderId: 'cust1', messageType: 'text', content: 'Hello' } })
  } as unknown as EnhancedConversationOrchestratorService

  const whatsappAdapter = { verifyWebhook: jest.fn().mockReturnValue('ok') } as unknown as WhatsAppAdapter
  const instagramAdapter = { verifyWebhook: jest.fn().mockReturnValue('ok') } as unknown as InstagramAdapter
  const config = { get: jest.fn().mockReturnValue(undefined) } as unknown as ConfigService
  const linkService = { findSessionByWhatsApp: jest.fn().mockReturnValue(null) } as unknown as PublicChatLinkService
  const sessionStore = { appendMessage: jest.fn() } as unknown as PublicChatSessionStore
  const workflow = { executeWorkflowByTrigger: jest.fn().mockResolvedValue([]) } as unknown as WorkflowService

  it('WhatsApp webhook triggers conversation.message.received workflow', async () => {
    const ctrl = new WhatsAppWebhookController(prisma, orchestrator, whatsappAdapter, config, linkService, sessionStore, workflow)

    const body = {
      entry: [{ changes: [{ value: { metadata: { phone_number_id: '123' }, messages: [{ from: '+123', text: { body: 'Hi' } }] } }] }]
    }
    const headers = {}

    const res = await ctrl.handle(body as any, headers as any)
    expect(res).toBeTruthy()
    expect((workflow as any).executeWorkflowByTrigger).toHaveBeenCalled()
    const call = (workflow as any).executeWorkflowByTrigger.mock.calls[0]
    expect(call[0]).toBe('event')
    expect(call[1]?.eventType).toBe('conversation.message.received')
    expect(call[1]?.channel).toBe('whatsapp')
  })

  it('Instagram webhook triggers conversation.message.received workflow', async () => {
    const ctrl = new InstagramWebhookController(prisma, orchestrator, instagramAdapter, config, workflow)

    const body = { object: 'instagram', entry: [{ changes: [{ field: 'messages' }] }] }
    const headers = {}

    const res = await ctrl.handle(body as any, headers as any)
    expect(res).toBeTruthy()
    expect((workflow as any).executeWorkflowByTrigger).toHaveBeenCalled()
    const call = (workflow as any).executeWorkflowByTrigger.mock.calls.slice(-1)[0]
    expect(call[0]).toBe('event')
    expect(call[1]?.eventType).toBe('conversation.message.received')
    expect(call[1]?.channel).toBe('instagram')
  })
})


