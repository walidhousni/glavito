import { Injectable, Logger } from '@nestjs/common';
import { NodeExecutor, FlowExecutionContext } from '../flow-execution.service';
import { PrismaService } from '@glavito/shared-database';
import { Prisma } from '@prisma/client';

@Injectable()
export class TicketNodeExecutor implements NodeExecutor {
  private readonly logger = new Logger(TicketNodeExecutor.name);

  constructor(private readonly prisma: PrismaService) {}

  canHandle(nodeKind: string): boolean {
    return ['ticket_create', 'ticket_update', 'ticket_assign', 'ticket_close'].includes(nodeKind);
  }

  async execute(node: Record<string, unknown>, context: FlowExecutionContext): Promise<Record<string, unknown>> {
    const config = (node['config'] || {}) as Record<string, unknown>;
    const nodeKind = node['kind'] as string;
    const nodeKey = node['key'] as string;

    switch (nodeKind) {
      case 'ticket_create':
        return this.createTicket(config, context, nodeKey);
      case 'ticket_update':
        return this.updateTicket(config, context, nodeKey);
      case 'ticket_assign':
        return this.assignTicket(config, context, nodeKey);
      case 'ticket_close':
        return this.closeTicket(config, context, nodeKey);
      default:
        throw new Error(`Unknown ticket node kind: ${nodeKind}`);
    }
  }

  private async createTicket(config: Record<string, unknown>, context: FlowExecutionContext, nodeKey: string): Promise<Record<string, unknown>> {
    const subject = config['subject'] as string | undefined;
    const description = config['description'] as string | undefined;
    const priority = config['priority'] as string | undefined;
    const channelId = config['channelId'] as string | undefined;
    const customerId = config['customerId'] as string | undefined;

    // Validate required fields
    if (!context.tenantId) {
      throw new Error('tenantId is required to create a ticket');
    }

    if (!customerId && !context.customerId) {
      throw new Error('customerId is required to create a ticket');
    }

    // Validate channelId exists
    if (channelId) {
      const channelExists = await this.prisma.channel.findFirst({
        where: { id: channelId, tenantId: context.tenantId }
      });
      if (!channelExists) {
        this.logger.warn(`Channel ${channelId} not found, using default`);
      }
    }

    const ticket = await this.prisma.ticket.create({
      data: {
        tenantId: context.tenantId,
        customerId: customerId || context.customerId || '',
        channelId: channelId || 'default',
        subject: this.replaceVariables(subject || 'New Ticket', context.variables),
        description: this.replaceVariables(description || '', context.variables),
        priority: priority || 'medium',
        status: 'open',
        tags: (config['tags'] as string[]) || [],
        customFields: ((config['customFields'] as Record<string, unknown>) || {}) as Prisma.InputJsonValue,
      },
    });

    // Add timeline event
    await this.prisma.ticketTimelineEvent.create({
      data: {
        ticketId: ticket.id,
        userId: context.userId,
        eventType: 'created',
        description: 'Ticket created by workflow',
        metadata: {
          workflowNode: nodeKey,
        },
      },
    });

    this.logger.log(`Ticket created: ${ticket.id}`);

    return { ticketId: ticket.id, ticket };
  }

  private async updateTicket(config: Record<string, unknown>, context: FlowExecutionContext, nodeKey: string): Promise<Record<string, unknown>> {
    const ticketId = (config['ticketId'] as string) || context.ticketId;
    
    if (!ticketId) {
      throw new Error('ticketId required for ticket_update node');
    }

    const updateData: Record<string, unknown> = {};
    const status = config['status'];
    const priority = config['priority'];
    const subject = config['subject'];
    const description = config['description'];
    const tags = config['tags'];

    if (status) updateData['status'] = status;
    if (priority) updateData['priority'] = priority;
    if (subject && typeof subject === 'string') {
      updateData['subject'] = this.replaceVariables(subject, context.variables);
    }
    if (description && typeof description === 'string') {
      updateData['description'] = this.replaceVariables(description, context.variables);
    }
    if (tags) updateData['tags'] = tags;

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    });

    // Add timeline event
    await this.prisma.ticketTimelineEvent.create({
      data: {
        ticketId: ticket.id,
        userId: context.userId,
        eventType: 'updated',
        description: 'Ticket updated by workflow',
        oldValue: {},
        newValue: updateData as Prisma.InputJsonValue,
        metadata: {
          workflowNode: nodeKey,
        },
      },
    });

    this.logger.log(`Ticket updated: ${ticket.id}`);

    return { ticketId: ticket.id, ticket };
  }

  private async assignTicket(config: Record<string, unknown>, context: FlowExecutionContext, nodeKey: string): Promise<Record<string, unknown>> {
    const ticketId = (config['ticketId'] as string) || context.ticketId;
    const assignToUserId = (config['assignToUserId'] as string) || (config['userId'] as string);
    
    if (!ticketId) {
      throw new Error('ticketId required for ticket_assign node');
    }

    if (!assignToUserId) {
      throw new Error('assignToUserId required for ticket_assign node');
    }

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        assignedAgentId: assignToUserId,
      },
    });

    // Create assignment record
    await this.prisma.ticketAssignment.create({
      data: {
        ticketId: ticket.id,
        teamMemberId: assignToUserId,
        assignedBy: context.userId || 'system',
        status: 'assigned',
        notes: 'Assigned by workflow',
      },
    });

    // Add timeline event
    await this.prisma.ticketTimelineEvent.create({
      data: {
        ticketId: ticket.id,
        userId: context.userId,
        eventType: 'assigned',
        description: `Ticket assigned to user ${assignToUserId}`,
        metadata: {
          workflowNode: nodeKey,
          assignedTo: assignToUserId,
        },
      },
    });

    this.logger.log(`Ticket assigned: ${ticket.id} to ${assignToUserId}`);

    return { ticketId: ticket.id, assignedTo: assignToUserId, ticket };
  }

  private async closeTicket(config: Record<string, unknown>, context: FlowExecutionContext, nodeKey: string): Promise<Record<string, unknown>> {
    const ticketId = (config['ticketId'] as string) || context.ticketId;
    
    if (!ticketId) {
      throw new Error('ticketId required for ticket_close node');
    }

    const ticket = await this.prisma.ticket.update({
      where: { id: ticketId },
      data: {
        status: 'resolved',
        resolvedAt: new Date(),
      },
    });

    // Add timeline event
    await this.prisma.ticketTimelineEvent.create({
      data: {
        ticketId: ticket.id,
        userId: context.userId,
        eventType: 'resolved',
        description: 'Ticket closed by workflow',
        metadata: {
          workflowNode: nodeKey,
          reason: (config['reason'] as string) || 'Workflow automation',
        },
      },
    });

    this.logger.log(`Ticket closed: ${ticket.id}`);

    return { ticketId: ticket.id, ticket };
  }

  private replaceVariables(template: string, variables: Record<string, unknown>): string {
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, String(value ?? ''));
    }
    return result;
  }
}

