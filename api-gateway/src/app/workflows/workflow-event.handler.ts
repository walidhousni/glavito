import { Injectable, Logger } from '@nestjs/common'
import { EventPattern, Payload } from '@nestjs/microservices'
import { WorkflowService } from '@glavito/shared-workflow'

@Injectable()
export class WorkflowEventHandler {
  private readonly logger = new Logger(WorkflowEventHandler.name)

  constructor(private readonly workflowService: WorkflowService) {}

  @EventPattern('ticket.created')
  async handleTicketCreated(@Payload() data: any) {
    try {
      this.logger.log('Processing ticket.created event for workflow automation')
      
      // Execute workflows triggered by ticket creation
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'ticket.created',
        ticketId: data.ticketId,
        tenantId: data.tenantId,
        customerId: data.customerId,
        priority: data.priority,
        category: data.category,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for ticket.created event`)
      
    } catch (error) {
      this.logger.error('Failed to handle ticket.created event:', error)
    }
  }

  @EventPattern('ticket.status.changed')
  async handleTicketStatusChanged(@Payload() data: any) {
    try {
      this.logger.log('Processing ticket.status.changed event for workflow automation')
      
      // Execute workflows triggered by status changes
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'ticket.status.changed',
        ticketId: data.ticketId,
        tenantId: data.tenantId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        changedBy: data.changedBy,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for ticket.status.changed event`)
      
    } catch (error) {
      this.logger.error('Failed to handle ticket.status.changed event:', error)
    }
  }

  @EventPattern('ticket.assigned')
  async handleTicketAssigned(@Payload() data: any) {
    try {
      this.logger.log('Processing ticket.assigned event for workflow automation')
      
      // Execute workflows triggered by ticket assignment
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'ticket.assigned',
        ticketId: data.ticketId,
        tenantId: data.tenantId,
        assignedTo: data.assignedTo,
        assignedBy: data.assignedBy,
        previousAssignee: data.previousAssignee,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for ticket.assigned event`)
      
    } catch (error) {
      this.logger.error('Failed to handle ticket.assigned event:', error)
    }
  }

  @EventPattern('ticket.escalated')
  async handleTicketEscalated(@Payload() data: any) {
    try {
      this.logger.log('Processing ticket.escalated event for workflow automation')
      
      // Execute workflows triggered by ticket escalation
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'ticket.escalated',
        ticketId: data.ticketId,
        tenantId: data.tenantId,
        escalationType: data.escalationType,
        escalatedTo: data.escalatedTo,
        escalatedBy: data.escalatedBy,
        reason: data.reason,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for ticket.escalated event`)
      
    } catch (error) {
      this.logger.error('Failed to handle ticket.escalated event:', error)
    }
  }

  @EventPattern('ticket.resolved')
  async handleTicketResolved(@Payload() data: any) {
    try {
      this.logger.log('Processing ticket.resolved event for workflow automation')
      
      // Execute workflows triggered by ticket resolution
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'ticket.resolved',
        ticketId: data.ticketId,
        tenantId: data.tenantId,
        resolvedBy: data.resolvedBy,
        resolutionTime: data.resolutionTime,
        customerSatisfaction: data.customerSatisfaction,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for ticket.resolved event`)
      
    } catch (error) {
      this.logger.error('Failed to handle ticket.resolved event:', error)
    }
  }

  @EventPattern('customer.created')
  async handleCustomerCreated(@Payload() data: any) {
    try {
      this.logger.log('Processing customer.created event for workflow automation')
      
      // Execute workflows triggered by customer creation (onboarding)
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'customer.created',
        customerId: data.customerId,
        tenantId: data.tenantId,
        customerTier: data.customerTier,
        source: data.source,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for customer.created event`)
      
    } catch (error) {
      this.logger.error('Failed to handle customer.created event:', error)
    }
  }

  @EventPattern('sla.breach.warning')
  async handleSLABreachWarning(@Payload() data: any) {
    try {
      this.logger.log('Processing sla.breach.warning event for workflow automation')
      
      // Execute workflows triggered by SLA breach warnings
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'sla.breach.warning',
        ticketId: data.ticketId,
        tenantId: data.tenantId,
        slaType: data.slaType,
        timeRemaining: data.timeRemaining,
        breachLevel: data.breachLevel,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for sla.breach.warning event`)
      
    } catch (error) {
      this.logger.error('Failed to handle sla.breach.warning event:', error)
    }
  }

  @EventPattern('conversation.message.received')
  async handleMessageReceived(@Payload() data: any) {
    try {
      this.logger.log('Processing conversation.message.received event for workflow automation')
      
      // Execute workflows triggered by new messages
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'conversation.message.received',
        conversationId: data.conversationId,
        messageId: data.messageId,
        tenantId: data.tenantId,
        customerId: data.customerId,
        channel: data.channel,
        messageType: data.messageType,
        sentiment: data.sentiment,
        urgency: data.urgency,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for conversation.message.received event`)
      
    } catch (error) {
      this.logger.error('Failed to handle conversation.message.received event:', error)
    }
  }

  @EventPattern('agent.status.changed')
  async handleAgentStatusChanged(@Payload() data: any) {
    try {
      this.logger.log('Processing agent.status.changed event for workflow automation')
      
      // Execute workflows triggered by agent status changes
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'agent.status.changed',
        agentId: data.agentId,
        tenantId: data.tenantId,
        oldStatus: data.oldStatus,
        newStatus: data.newStatus,
        availability: data.availability,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for agent.status.changed event`)
      
    } catch (error) {
      this.logger.error('Failed to handle agent.status.changed event:', error)
    }
  }

  @EventPattern('customer.satisfaction.received')
  async handleCustomerSatisfactionReceived(@Payload() data: any) {
    try {
      this.logger.log('Processing customer.satisfaction.received event for workflow automation')
      
      // Execute workflows triggered by customer satisfaction feedback
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'customer.satisfaction.received',
        ticketId: data.ticketId,
        customerId: data.customerId,
        tenantId: data.tenantId,
        rating: data.rating,
        feedback: data.feedback,
        category: data.category,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for customer.satisfaction.received event`)
      
    } catch (error) {
      this.logger.error('Failed to handle customer.satisfaction.received event:', error)
    }
  }

  @EventPattern('system.high.load')
  async handleSystemHighLoad(@Payload() data: any) {
    try {
      this.logger.log('Processing system.high.load event for workflow automation')
      
      // Execute workflows triggered by high system load
      const executions = await this.workflowService.executeWorkflowByTrigger('event', {
        eventType: 'system.high.load',
        tenantId: data.tenantId,
        loadLevel: data.loadLevel,
        affectedServices: data.affectedServices,
        timestamp: new Date()
      })

      this.logger.log(`Triggered ${executions.length} workflows for system.high.load event`)
      
    } catch (error) {
      this.logger.error('Failed to handle system.high.load event:', error)
    }
  }

  // Generic event handler for custom events
  @EventPattern('workflow.trigger.*')
  async handleCustomWorkflowTrigger(@Payload() data: any) {
    try {
      this.logger.log(`Processing custom workflow trigger: ${data.eventType}`)
      
      // Execute workflows triggered by custom events
      const executions = await this.workflowService.executeWorkflowByTrigger('event', data)

      this.logger.log(`Triggered ${executions.length} workflows for custom event: ${data.eventType}`)
      
    } catch (error) {
      this.logger.error(`Failed to handle custom workflow trigger ${data.eventType}:`, error)
    }
  }
}