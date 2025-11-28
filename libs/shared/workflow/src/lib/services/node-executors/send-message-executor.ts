import { Injectable, Logger } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';
import { PrismaService } from '@glavito/shared-database';

@Injectable()
export class SendMessageNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(SendMessageNodeExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  canHandle(nodeKind: string): boolean {
    return nodeKind === 'send_message' || nodeKind === 'template_message';
  }

  async execute(node: any, context: FlowExecutionContext): Promise<any> {
    const config = node.config || {};
    
    // Get conversation or create one
    let conversationId = context.conversationId;
    
    if (!conversationId && context.customerId) {
      // Find or create conversation for customer
      const existingConversation = await this.prisma['conversation'].findFirst({
        where: {
          tenantId: context.tenantId,
          customerId: context.customerId,
          status: 'active',
        },
      });

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new conversation (requires channelId)
        if (!config.channelId) {
          throw new Error('channelId required to create new conversation');
        }
        
        const newConv = await this.prisma['conversation'].create({
          data: {
            tenantId: context.tenantId,
            customerId: context.customerId!,
            channelId: config.channelId,
            status: 'active',
          },
        });
        conversationId = newConv.id;
      }
    }

    if (!conversationId) {
      throw new Error('No conversation context available');
    }

    // Replace variables in message content
    const messageContent = this.replaceVariables(config.message || config.content || '', context.variables);

    // Create message in database
    const message = await this.prisma['message'].create({
      data: {
        conversationId,
        senderId: context.userId || 'system',
        senderType: context.userId ? 'agent' : 'system',
        content: messageContent,
        messageType: config.messageType || 'text',
        metadata: {
          fromWorkflow: true,
          nodeKey: node.key,
          templateName: config.templateName,
          ...config.metadata,
        },
      },
    });

    this.logger.log(`Message sent: ${message.id} to conversation ${conversationId}`);

    return {
      messageId: message.id,
      conversationId,
      content: messageContent,
    };
  }

  private replaceVariables(template: string, variables: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value));
    }
    return result;
  }
}

