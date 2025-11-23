import { WorkflowDefinition, NodeType, TriggerType } from '../interfaces/workflow.interface'

export class WorkflowTemplates {
  
  /**
   * Order Processing Automation (eGrow-like)
   * Trigger: New order (ticket created) → Assign to confirmation team → Notify agent → WhatsApp confirmation to customer → Result
   */
  static getOrderProcessingAutomationWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'Order Processing Automation',
      description: 'Auto-assign new orders, notify agents, and confirm with customer on WhatsApp',
      version: '1.0',
      status: 'active' as any,
      category: 'order_processing',
      tags: ['orders', 'assignment', 'whatsapp', 'confirmation'],
      createdBy: 'system',
      triggers: [
        {
          id: 'new-order',
          type: TriggerType.EVENT,
          name: 'Trigger: New Order Received',
          configuration: {
            eventType: 'order.created',
          },
          enabled: true,
        },
      ],
      nodes: [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 100, y: 100 }, configuration: {}, inputs: [], outputs: [{ name: 'default', type: 'main' }] },
        {
          id: 'assign-team',
          type: NodeType.TICKET_ASSIGNMENT,
          name: 'Action: Assign to Team Agent',
          position: { x: 320, y: 100 },
          configuration: {
            assignmentStrategy: 'team_based',
            teamFilter: 'confirmation',
            notifyAgent: true,
            setSLA: true,
            slaPolicy: 'standard_support',
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'assigned', type: 'main' }],
        },
        {
          id: 'notify-agent',
          type: NodeType.SEND_NOTIFICATION,
          name: 'Send Notification to Agent',
          position: { x: 560, y: 60 },
          configuration: {
            notificationType: 'inapp',
            template: 'order_assigned',
            urgency: 'low',
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }],
        },
        {
          id: 'wa-confirm',
          type: NodeType.SEND_NOTIFICATION,
          name: 'Send WhatsApp to Customer',
          position: { x: 560, y: 150 },
          configuration: {
            notificationType: 'template',
            channel: 'whatsapp',
            template: 'order_confirmation',
            templateParams: {
              orderId: '{{ $node.data.orderId }}',
            },
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }],
        },
        {
          id: 'result',
          type: NodeType.LOG_EVENT,
          name: 'Result: Order Ready for Processing',
          position: { x: 820, y: 100 },
          configuration: { eventType: 'order.ready_for_processing', logLevel: 'info', includeContext: true },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'logged', type: 'main' }],
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 1040, y: 100 }, configuration: {}, inputs: [{ name: 'default', type: 'main', required: true }], outputs: [] },
      ],
      connections: [
        { id: 's-assign', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'assign-team', targetInput: 'ticket' },
        { id: 'assign-notify-agent', sourceNodeId: 'assign-team', sourceOutput: 'assigned', targetNodeId: 'notify-agent', targetInput: 'data' },
        { id: 'assign-wa', sourceNodeId: 'assign-team', sourceOutput: 'assigned', targetNodeId: 'wa-confirm', targetInput: 'data' },
        { id: 'to-result', sourceNodeId: 'wa-confirm', sourceOutput: 'sent', targetNodeId: 'result', targetInput: 'data' },
        { id: 'result-end', sourceNodeId: 'result', sourceOutput: 'logged', targetNodeId: 'end', targetInput: 'default' },
      ],
      settings: {
        timeout: 300000,
        maxRetries: 2,
        errorHandling: 'continue',
        logging: 'detailed',
        executionMode: 'async',
        priority: 'high',
        permissions: [ { role: 'admin', actions: ['read','write','execute'] }, { role: 'supervisor', actions: ['read','execute'] } ],
        allowedIntegrations: ['notification','whatsapp']
      },
      variables: []
    }
  }

  /**
   * Order Confirmation Ticket
   * Trigger: order.created → Create ticket → Send confirmation → Log
   */
  static getOrderConfirmationTicketWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'Order Confirmation Ticket',
      description: 'Creates a confirmation ticket and sends an order confirmation message when an order is created',
      version: '1.0',
      status: 'active' as any,
      category: 'order_processing',
      tags: ['orders', 'confirmation', 'ticket'],
      createdBy: 'system',
      triggers: [
        {
          id: 'order-created',
          type: TriggerType.EVENT,
          name: 'Order Created',
          configuration: { eventType: 'order.created' },
          enabled: true,
        },
      ],
      nodes: [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 100, y: 100 }, configuration: {}, inputs: [], outputs: [{ name: 'default', type: 'main' }] },
        {
          id: 'create-ticket',
          type: NodeType.API_CALL,
          name: 'Create Confirmation Ticket',
          position: { x: 320, y: 100 },
          configuration: {
            method: 'POST',
            url: '/api/tickets',
            headers: { 'Content-Type': 'application/json' },
            body: {
              subject: 'Order {{ $node.data.orderId }} confirmation',
              description: 'Auto-created confirmation for order {{ $node.data.orderId }}',
              priority: 'medium',
              tags: ['order', 'confirmation'],
              customerId: '{{ $node.data.customerId }}',
              channelId: '{{ $node.data.channelId || "" }}'
            }
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'created', type: 'main' }]
        },
        {
          id: 'send-confirmation',
          type: NodeType.SEND_NOTIFICATION,
          name: 'Send Order Confirmation',
          position: { x: 580, y: 80 },
          configuration: {
            notificationType: 'template',
            channel: 'auto',
            template: 'order_confirmation',
            templateParams: { orderId: '{{ $node.data.orderId }}' }
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }]
        },
        {
          id: 'log',
          type: NodeType.LOG_EVENT,
          name: 'Log Confirmation',
          position: { x: 840, y: 100 },
          configuration: { eventType: 'order.confirmation_ticket_created', includeContext: true, logLevel: 'info' },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'logged', type: 'main' }]
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 1040, y: 100 }, configuration: {}, inputs: [{ name: 'default', type: 'main', required: true }], outputs: [] }
      ],
      connections: [
        { id: 's-ct', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'create-ticket', targetInput: 'data' },
        { id: 'ct-send', sourceNodeId: 'create-ticket', sourceOutput: 'created', targetNodeId: 'send-confirmation', targetInput: 'data' },
        { id: 'send-log', sourceNodeId: 'send-confirmation', sourceOutput: 'sent', targetNodeId: 'log', targetInput: 'data' },
        { id: 'log-end', sourceNodeId: 'log', sourceOutput: 'logged', targetNodeId: 'end', targetInput: 'default' }
      ],
      settings: { timeout: 300000, maxRetries: 2, errorHandling: 'continue', logging: 'detailed', executionMode: 'async', priority: 'high', permissions: [], allowedIntegrations: ['notification','api'] },
      variables: []
    }
  }

  /**
   * Order Canceled Notification
   * Trigger: order.updated with status=canceled → Send cancellation message → Log
   */
  static getOrderCanceledNotificationWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'Order Canceled Notification',
      description: 'Sends a cancellation message to customer when an order is canceled',
      version: '1.0',
      status: 'active' as any,
      category: 'order_processing',
      tags: ['orders', 'cancellation'],
      createdBy: 'system',
      triggers: [
        {
          id: 'order-updated-canceled',
          type: TriggerType.EVENT,
          name: 'Order Updated (Canceled)',
          configuration: {
            eventType: 'order.updated',
            conditions: [ { field: 'status', operator: 'equals', value: 'canceled' } ]
          },
          enabled: true,
        },
      ],
      nodes: [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 100, y: 100 }, configuration: {}, inputs: [], outputs: [{ name: 'default', type: 'main' }] },
        {
          id: 'send-cancel',
          type: NodeType.SEND_NOTIFICATION,
          name: 'Send Cancellation Message',
          position: { x: 320, y: 100 },
          configuration: {
            notificationType: 'template',
            channel: 'auto',
            template: 'order_canceled',
            templateParams: { orderId: '{{ $node.data.orderId }}', reason: '{{ $node.data.reason || "" }}' }
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }]
        },
        {
          id: 'log',
          type: NodeType.LOG_EVENT,
          name: 'Log Cancellation Notice',
          position: { x: 580, y: 100 },
          configuration: { eventType: 'order.cancellation_notified', includeContext: true, logLevel: 'info' },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'logged', type: 'main' }]
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 800, y: 100 }, configuration: {}, inputs: [{ name: 'default', type: 'main', required: true }], outputs: [] }
      ],
      connections: [
        { id: 's-send', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'send-cancel', targetInput: 'data' },
        { id: 'send-log', sourceNodeId: 'send-cancel', sourceOutput: 'sent', targetNodeId: 'log', targetInput: 'data' },
        { id: 'log-end', sourceNodeId: 'log', sourceOutput: 'logged', targetNodeId: 'end', targetInput: 'default' }
      ],
      settings: { timeout: 300000, maxRetries: 2, errorHandling: 'continue', logging: 'detailed', executionMode: 'async', priority: 'high', permissions: [], allowedIntegrations: ['notification'] },
      variables: []
    }
  }

  /**
   * Delivery Issue Automation (eGrow-like)
   * Trigger: Delivery issue reported → Escalate to shipping team → Alert team → WhatsApp message to customer → Result
   */
  static getDeliveryIssueAutomationWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'Delivery Issue Automation',
      description: 'Escalate delivery issues to shipping team and notify customer via WhatsApp',
      version: '1.0',
      status: 'active' as any,
      category: 'delivery_management',
      tags: ['shipping', 'escalation', 'whatsapp'],
      createdBy: 'system',
      triggers: [
        {
          id: 'delivery-issue',
          type: TriggerType.EVENT,
          name: 'Trigger: Delivery Issue Reported',
          configuration: {
            eventType: 'ticket.status.changed',
            // Expect newStatus like 'delivery_issue' or 'cannot_deliver'
            conditions: [{ field: 'newStatus', operator: 'in', value: ['delivery_issue', 'cannot_deliver'] }],
          },
          enabled: true,
        },
      ],
      nodes: [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 100, y: 100 }, configuration: {}, inputs: [], outputs: [{ name: 'default', type: 'main' }] },
        {
          id: 'escalate',
          type: NodeType.TICKET_ESCALATION,
          name: 'Action: Escalate to Shipping Team',
          position: { x: 320, y: 100 },
          configuration: {
            escalationType: 'team',
            team: 'shipping',
            notifyEscalatee: true,
            updatePriority: true,
            addNote: true,
            noteTemplate: 'Delivery issue escalation to shipping',
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'escalated', type: 'main' }],
        },
        {
          id: 'alert-team',
          type: NodeType.SEND_NOTIFICATION,
          name: 'Alert Shipping Team',
          position: { x: 560, y: 60 },
          configuration: {
            notificationType: 'inapp',
            template: 'shipping_issue_alert',
            urgency: 'high',
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }],
        },
        {
          id: 'wa-customer',
          type: NodeType.SEND_NOTIFICATION,
          name: 'Send WhatsApp to Customer',
          position: { x: 560, y: 150 },
          configuration: {
            notificationType: 'template',
            channel: 'whatsapp',
            template: 'delivery_issue_update',
            templateParams: {
              ticketId: '{{ $node.ticket.id }}',
            },
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }],
        },
        {
          id: 'result',
          type: NodeType.LOG_EVENT,
          name: 'Result: Issue Resolution Initiated',
          position: { x: 820, y: 100 },
          configuration: { eventType: 'delivery.issue_resolution_initiated', logLevel: 'info', includeContext: true },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'logged', type: 'main' }],
        },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 1040, y: 100 }, configuration: {}, inputs: [{ name: 'default', type: 'main', required: true }], outputs: [] },
      ],
      connections: [
        { id: 's-esc', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'escalate', targetInput: 'ticket' },
        { id: 'esc-alert', sourceNodeId: 'escalate', sourceOutput: 'escalated', targetNodeId: 'alert-team', targetInput: 'data' },
        { id: 'esc-wa', sourceNodeId: 'escalate', sourceOutput: 'escalated', targetNodeId: 'wa-customer', targetInput: 'data' },
        { id: 'to-result-2', sourceNodeId: 'wa-customer', sourceOutput: 'sent', targetNodeId: 'result', targetInput: 'data' },
        { id: 'result-end-2', sourceNodeId: 'result', sourceOutput: 'logged', targetNodeId: 'end', targetInput: 'default' },
      ],
      settings: {
        timeout: 300000,
        maxRetries: 2,
        errorHandling: 'continue',
        logging: 'detailed',
        executionMode: 'async',
        priority: 'high',
        permissions: [ { role: 'admin', actions: ['read','write','execute'] }, { role: 'supervisor', actions: ['read','execute'] } ],
        allowedIntegrations: ['notification','whatsapp']
      },
      variables: []
    }
  }

  /**
   * Intelligent Ticket Routing Workflow
   * Automatically routes tickets based on content, customer, and agent availability
   */
  static getIntelligentTicketRoutingWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'Intelligent Ticket Routing',
      description: 'Automatically route tickets based on AI analysis, customer profile, and agent availability',
      version: '1.0',
      status: 'active' as any,
      category: 'ticket_management',
      tags: ['routing', 'ai', 'automation'],
      createdBy: 'system',
      triggers: [
        {
          id: 'ticket-created-trigger',
          type: TriggerType.EVENT,
          name: 'Ticket Created',
          configuration: {
            eventType: 'ticket.created',
            conditions: [
              {
                field: 'status',
                operator: 'equals',
                value: 'open'
              }
            ]
          },
          enabled: true
        }
      ],
      nodes: [
        {
          id: 'start',
          type: NodeType.START,
          name: 'Start',
          position: { x: 100, y: 100 },
          configuration: {},
          inputs: [],
          outputs: [{ name: 'default', type: 'main', description: 'Default output' }]
        },
        {
          id: 'ai-analysis',
          type: NodeType.AI_ANALYSIS,
          name: 'Analyze Ticket Content',
          position: { x: 300, y: 100 },
          configuration: {
            analysisTypes: ['intent', 'sentiment', 'urgency', 'category', 'language'],
            includeCustomerHistory: true,
            confidenceThreshold: 0.7
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'analysis', type: 'main', description: 'AI analysis results' }]
        },
        {
          id: 'customer-lookup',
          type: NodeType.CUSTOMER_LOOKUP,
          name: 'Get Customer Profile',
          position: { x: 500, y: 100 },
          configuration: {
            includeHistory: true,
            includePurchases: true,
            includeSegmentation: true,
            includeHealthScore: true
          },
          inputs: [{ name: 'customerId', type: 'main', required: true }],
          outputs: [{ name: 'customer', type: 'main', description: 'Customer profile data' }]
        },
        {
          id: 'priority-scoring',
          type: NodeType.CUSTOMER_SCORING,
          name: 'Calculate Priority Score',
          position: { x: 700, y: 100 },
          configuration: {
            factors: [
              { name: 'urgency', weight: 0.3 },
              { name: 'customerTier', weight: 0.25 },
              { name: 'businessImpact', weight: 0.2 },
              { name: 'slaRisk', weight: 0.15 },
              { name: 'sentiment', weight: 0.1 }
            ]
          },
          inputs: [
            { name: 'analysis', type: 'main', required: true },
            { name: 'customer', type: 'main', required: true }
          ],
          outputs: [{ name: 'score', type: 'main', description: 'Priority score' }]
        },
        {
          id: 'routing-decision',
          type: NodeType.CONDITION,
          name: 'Routing Decision',
          position: { x: 900, y: 100 },
          configuration: {
            conditions: [
              {
                field: 'priority',
                operator: 'greater_than_or_equal',
                value: 0.8,
                output: 'high-priority'
              },
              {
                field: 'category',
                operator: 'in',
                value: ['technical', 'api', 'integration'],
                output: 'technical-team'
              },
              {
                field: 'category',
                operator: 'in',
                value: ['billing', 'payment', 'subscription'],
                output: 'billing-team'
              }
            ],
            defaultOutput: 'general-support'
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [
            { name: 'high-priority', type: 'main' },
            { name: 'technical-team', type: 'main' },
            { name: 'billing-team', type: 'main' },
            { name: 'general-support', type: 'main' }
          ]
        },
        {
          id: 'assign-high-priority',
          type: NodeType.TICKET_ASSIGNMENT,
          name: 'Assign to Senior Agent',
          position: { x: 1100, y: 50 },
          configuration: {
            assignmentStrategy: 'senior_agent',
            teamFilter: 'all',
            skillsRequired: [],
            notifyAgent: true,
            setSLA: true,
            slaPolicy: 'high_priority'
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'assigned', type: 'main' }]
        },
        {
          id: 'assign-technical',
          type: NodeType.TICKET_ASSIGNMENT,
          name: 'Assign to Technical Team',
          position: { x: 1100, y: 150 },
          configuration: {
            assignmentStrategy: 'skill_based',
            teamFilter: 'technical',
            skillsRequired: ['api', 'integration', 'technical'],
            notifyAgent: true,
            setSLA: true,
            slaPolicy: 'technical_support'
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'assigned', type: 'main' }]
        },
        {
          id: 'assign-billing',
          type: NodeType.TICKET_ASSIGNMENT,
          name: 'Assign to Billing Team',
          position: { x: 1100, y: 250 },
          configuration: {
            assignmentStrategy: 'team_based',
            teamFilter: 'billing',
            skillsRequired: ['billing', 'payments'],
            notifyAgent: true,
            setSLA: true,
            slaPolicy: 'billing_support'
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'assigned', type: 'main' }]
        },
        {
          id: 'assign-general',
          type: NodeType.TICKET_ASSIGNMENT,
          name: 'Assign to General Support',
          position: { x: 1100, y: 350 },
          configuration: {
            assignmentStrategy: 'round_robin',
            teamFilter: 'support',
            skillsRequired: [],
            notifyAgent: true,
            setSLA: true,
            slaPolicy: 'standard_support'
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'assigned', type: 'main' }]
        },
        {
          id: 'log-assignment',
          type: NodeType.LOG_EVENT,
          name: 'Log Assignment',
          position: { x: 1300, y: 200 },
          configuration: {
            eventType: 'ticket_assigned',
            includeContext: true,
            logLevel: 'info'
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'logged', type: 'main' }]
        },
        {
          id: 'end',
          type: NodeType.END,
          name: 'End',
          position: { x: 1500, y: 200 },
          configuration: {},
          inputs: [{ name: 'default', type: 'main', required: true }],
          outputs: []
        }
      ],
      connections: [
        {
          id: 'start-to-ai',
          sourceNodeId: 'start',
          sourceOutput: 'default',
          targetNodeId: 'ai-analysis',
          targetInput: 'ticket'
        },
        {
          id: 'ai-to-customer',
          sourceNodeId: 'ai-analysis',
          sourceOutput: 'analysis',
          targetNodeId: 'customer-lookup',
          targetInput: 'customerId'
        },
        {
          id: 'customer-to-scoring',
          sourceNodeId: 'customer-lookup',
          sourceOutput: 'customer',
          targetNodeId: 'priority-scoring',
          targetInput: 'customer'
        },
        {
          id: 'ai-to-scoring',
          sourceNodeId: 'ai-analysis',
          sourceOutput: 'analysis',
          targetNodeId: 'priority-scoring',
          targetInput: 'analysis'
        },
        {
          id: 'scoring-to-routing',
          sourceNodeId: 'priority-scoring',
          sourceOutput: 'score',
          targetNodeId: 'routing-decision',
          targetInput: 'data'
        },
        {
          id: 'routing-to-high-priority',
          sourceNodeId: 'routing-decision',
          sourceOutput: 'high-priority',
          targetNodeId: 'assign-high-priority',
          targetInput: 'ticket'
        },
        {
          id: 'routing-to-technical',
          sourceNodeId: 'routing-decision',
          sourceOutput: 'technical-team',
          targetNodeId: 'assign-technical',
          targetInput: 'ticket'
        },
        {
          id: 'routing-to-billing',
          sourceNodeId: 'routing-decision',
          sourceOutput: 'billing-team',
          targetNodeId: 'assign-billing',
          targetInput: 'ticket'
        },
        {
          id: 'routing-to-general',
          sourceNodeId: 'routing-decision',
          sourceOutput: 'general-support',
          targetNodeId: 'assign-general',
          targetInput: 'ticket'
        },
        {
          id: 'high-priority-to-log',
          sourceNodeId: 'assign-high-priority',
          sourceOutput: 'assigned',
          targetNodeId: 'log-assignment',
          targetInput: 'data'
        },
        {
          id: 'technical-to-log',
          sourceNodeId: 'assign-technical',
          sourceOutput: 'assigned',
          targetNodeId: 'log-assignment',
          targetInput: 'data'
        },
        {
          id: 'billing-to-log',
          sourceNodeId: 'assign-billing',
          sourceOutput: 'assigned',
          targetNodeId: 'log-assignment',
          targetInput: 'data'
        },
        {
          id: 'general-to-log',
          sourceNodeId: 'assign-general',
          sourceOutput: 'assigned',
          targetNodeId: 'log-assignment',
          targetInput: 'data'
        },
        {
          id: 'log-to-end',
          sourceNodeId: 'log-assignment',
          sourceOutput: 'logged',
          targetNodeId: 'end',
          targetInput: 'default'
        }
      ],
      settings: {
        timeout: 300000, // 5 minutes
        maxRetries: 3,
        errorHandling: 'continue',
        logging: 'detailed',
        executionMode: 'async',
        priority: 'high',
        permissions: [
          { role: 'admin', actions: ['read', 'write', 'execute'] },
          { role: 'supervisor', actions: ['read', 'execute'] }
        ],
        allowedIntegrations: ['ai', 'database', 'notification']
      },
      variables: [
        {
          name: 'defaultSLA',
          type: 'string',
          defaultValue: 'standard_support',
          required: false,
          description: 'Default SLA policy to apply'
        },
        {
          name: 'priorityThreshold',
          type: 'number',
          defaultValue: 0.8,
          required: false,
          description: 'Threshold for high priority routing'
        }
      ]
    }
  }

  /**
   * SLA Monitoring and Escalation Workflow
   * Monitors SLA compliance and automatically escalates at-risk tickets
   */
  static getSLAMonitoringWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'SLA Monitoring and Escalation',
      description: 'Monitor SLA compliance and automatically escalate at-risk tickets',
      version: '1.0',
      status: 'active' as any,
      category: 'sla_management',
      tags: ['sla', 'escalation', 'monitoring'],
      createdBy: 'system',
      triggers: [
        {
          id: 'sla-check-trigger',
          type: TriggerType.SCHEDULE,
          name: 'SLA Check Schedule',
          configuration: {
            schedule: '*/15 * * * *', // Every 15 minutes
            timezone: 'UTC'
          },
          enabled: true
        }
      ],
      nodes: [
        {
          id: 'start',
          type: NodeType.START,
          name: 'Start SLA Check',
          position: { x: 100, y: 100 },
          configuration: {},
          inputs: [],
          outputs: [{ name: 'default', type: 'main' }]
        },
        {
          id: 'get-at-risk-tickets',
          type: NodeType.DATABASE_QUERY,
          name: 'Get At-Risk Tickets',
          position: { x: 300, y: 100 },
          configuration: {
            query: `
              SELECT t.*, s.* FROM tickets t 
              JOIN sla_instances s ON t.id = s.ticket_id 
              WHERE s.status = 'active' 
              AND (
                (s.first_response_due < NOW() + INTERVAL '2 hours' AND s.first_response_at IS NULL)
                OR (s.resolution_due < NOW() + INTERVAL '4 hours' AND s.resolution_at IS NULL)
              )
            `,
            parameters: {}
          },
          inputs: [{ name: 'trigger', type: 'main', required: true }],
          outputs: [{ name: 'tickets', type: 'main' }]
        },
        {
          id: 'process-tickets',
          type: NodeType.LOOP,
          name: 'Process Each Ticket',
          position: { x: 500, y: 100 },
          configuration: {
            loopType: 'forEach',
            itemProperty: 'tickets'
          },
          inputs: [{ name: 'items', type: 'main', required: true }],
          outputs: [{ name: 'item', type: 'main' }]
        },
        {
          id: 'check-escalation-level',
          type: NodeType.CONDITION,
          name: 'Check Escalation Level',
          position: { x: 700, y: 100 },
          configuration: {
            conditions: [
              {
                field: 'sla.breach_count',
                operator: 'equals',
                value: 0,
                output: 'first-warning'
              },
              {
                field: 'sla.breach_count',
                operator: 'equals',
                value: 1,
                output: 'supervisor-escalation'
              },
              {
                field: 'sla.breach_count',
                operator: 'greater_than_or_equal',
                value: 2,
                output: 'manager-escalation'
              }
            ]
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [
            { name: 'first-warning', type: 'main' },
            { name: 'supervisor-escalation', type: 'main' },
            { name: 'manager-escalation', type: 'main' }
          ]
        },
        {
          id: 'send-warning',
          type: NodeType.SEND_NOTIFICATION,
          name: 'Send Warning to Agent',
          position: { x: 900, y: 50 },
          configuration: {
            notificationType: 'email',
            template: 'sla_warning',
            urgency: 'medium'
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }]
        },
        {
          id: 'escalate-supervisor',
          type: NodeType.TICKET_ESCALATION,
          name: 'Escalate to Supervisor',
          position: { x: 900, y: 150 },
          configuration: {
            escalationType: 'supervisor',
            notifyEscalatee: true,
            updatePriority: true,
            addNote: true,
            noteTemplate: 'SLA breach warning - escalated to supervisor'
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'escalated', type: 'main' }]
        },
        {
          id: 'escalate-manager',
          type: NodeType.TICKET_ESCALATION,
          name: 'Escalate to Manager',
          position: { x: 900, y: 250 },
          configuration: {
            escalationType: 'manager',
            notifyEscalatee: true,
            updatePriority: true,
            addNote: true,
            noteTemplate: 'Critical SLA breach - escalated to management'
          },
          inputs: [{ name: 'ticket', type: 'main', required: true }],
          outputs: [{ name: 'escalated', type: 'main' }]
        },
        {
          id: 'update-sla',
          type: NodeType.DATABASE_QUERY,
          name: 'Update SLA Instance',
          position: { x: 1100, y: 150 },
          configuration: {
            query: `
              UPDATE sla_instances 
              SET breach_count = breach_count + 1, 
                  last_escalation_at = NOW(),
                  escalation_level = $escalationLevel
              WHERE ticket_id = $ticketId
            `,
            parameters: {
              ticketId: '{{ $node.ticket.id }}',
              escalationLevel: '{{ $node.escalationType }}'
            }
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'updated', type: 'main' }]
        },
        {
          id: 'log-escalation',
          type: NodeType.LOG_EVENT,
          name: 'Log Escalation',
          position: { x: 1300, y: 150 },
          configuration: {
            eventType: 'sla_escalation',
            includeContext: true,
            logLevel: 'warn'
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'logged', type: 'main' }]
        },
        {
          id: 'end',
          type: NodeType.END,
          name: 'End',
          position: { x: 1500, y: 150 },
          configuration: {},
          inputs: [{ name: 'default', type: 'main', required: true }],
          outputs: []
        }
      ],
      connections: [
        {
          id: 'start-to-query',
          sourceNodeId: 'start',
          sourceOutput: 'default',
          targetNodeId: 'get-at-risk-tickets',
          targetInput: 'trigger'
        },
        {
          id: 'query-to-loop',
          sourceNodeId: 'get-at-risk-tickets',
          sourceOutput: 'tickets',
          targetNodeId: 'process-tickets',
          targetInput: 'items'
        },
        {
          id: 'loop-to-condition',
          sourceNodeId: 'process-tickets',
          sourceOutput: 'item',
          targetNodeId: 'check-escalation-level',
          targetInput: 'ticket'
        },
        {
          id: 'condition-to-warning',
          sourceNodeId: 'check-escalation-level',
          sourceOutput: 'first-warning',
          targetNodeId: 'send-warning',
          targetInput: 'ticket'
        },
        {
          id: 'condition-to-supervisor',
          sourceNodeId: 'check-escalation-level',
          sourceOutput: 'supervisor-escalation',
          targetNodeId: 'escalate-supervisor',
          targetInput: 'ticket'
        },
        {
          id: 'condition-to-manager',
          sourceNodeId: 'check-escalation-level',
          sourceOutput: 'manager-escalation',
          targetNodeId: 'escalate-manager',
          targetInput: 'ticket'
        },
        {
          id: 'warning-to-update',
          sourceNodeId: 'send-warning',
          sourceOutput: 'sent',
          targetNodeId: 'update-sla',
          targetInput: 'data'
        },
        {
          id: 'supervisor-to-update',
          sourceNodeId: 'escalate-supervisor',
          sourceOutput: 'escalated',
          targetNodeId: 'update-sla',
          targetInput: 'data'
        },
        {
          id: 'manager-to-update',
          sourceNodeId: 'escalate-manager',
          sourceOutput: 'escalated',
          targetNodeId: 'update-sla',
          targetInput: 'data'
        },
        {
          id: 'update-to-log',
          sourceNodeId: 'update-sla',
          sourceOutput: 'updated',
          targetNodeId: 'log-escalation',
          targetInput: 'data'
        },
        {
          id: 'log-to-end',
          sourceNodeId: 'log-escalation',
          sourceOutput: 'logged',
          targetNodeId: 'end',
          targetInput: 'default'
        }
      ],
      settings: {
        timeout: 600000, // 10 minutes
        maxRetries: 2,
        errorHandling: 'continue',
        logging: 'detailed',
        executionMode: 'async',
        priority: 'high',
        permissions: [
          { role: 'admin', actions: ['read', 'write', 'execute'] },
          { role: 'supervisor', actions: ['read', 'execute'] }
        ],
        allowedIntegrations: ['database', 'notification', 'escalation']
      },
      variables: [
        {
          name: 'warningThreshold',
          type: 'number',
          defaultValue: 2,
          required: false,
          description: 'Hours before SLA breach to send warning'
        },
        {
          name: 'escalationThreshold',
          type: 'number',
          defaultValue: 4,
          required: false,
          description: 'Hours before SLA breach to escalate'
        }
      ]
    }
  }

  /**
   * Customer Onboarding Workflow
   * Automated workflow for new customer onboarding
   */
  static getCustomerOnboardingWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'Customer Onboarding Automation',
      description: 'Automated workflow for new customer onboarding with personalized communication',
      version: '1.0',
      status: 'active' as any,
      category: 'customer_management',
      tags: ['onboarding', 'automation', 'customer-success'],
      createdBy: 'system',
      triggers: [
        {
          id: 'customer-created-trigger',
          type: TriggerType.EVENT,
          name: 'New Customer Created',
          configuration: {
            eventType: 'customer.created'
          },
          enabled: true
        }
      ],
      nodes: [
        {
          id: 'start',
          type: NodeType.START,
          name: 'Start Onboarding',
          position: { x: 100, y: 100 },
          configuration: {},
          inputs: [],
          outputs: [{ name: 'default', type: 'main' }]
        },
        {
          id: 'welcome-email',
          type: NodeType.SEND_EMAIL,
          name: 'Send Welcome Email',
          position: { x: 300, y: 100 },
          configuration: {
            template: 'customer_welcome',
            personalization: true,
            trackOpens: true,
            trackClicks: true
          },
          inputs: [{ name: 'customer', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }]
        },
        {
          id: 'delay-24h',
          type: NodeType.DELAY,
          name: 'Wait 24 Hours',
          position: { x: 500, y: 100 },
          configuration: {
            delayType: 'fixed',
            duration: 86400000 // 24 hours in milliseconds
          },
          inputs: [{ name: 'trigger', type: 'main', required: true }],
          outputs: [{ name: 'delayed', type: 'main' }]
        },
        {
          id: 'check-engagement',
          type: NodeType.CUSTOMER_LOOKUP,
          name: 'Check Customer Engagement',
          position: { x: 700, y: 100 },
          configuration: {
            includeActivity: true,
            includeEngagementScore: true,
            timeframe: '24h'
          },
          inputs: [{ name: 'customerId', type: 'main', required: true }],
          outputs: [{ name: 'customer', type: 'main' }]
        },
        {
          id: 'engagement-condition',
          type: NodeType.CONDITION,
          name: 'Check Engagement Level',
          position: { x: 900, y: 100 },
          configuration: {
            conditions: [
              {
                field: 'engagementScore',
                operator: 'greater_than',
                value: 0.7,
                output: 'high-engagement'
              },
              {
                field: 'engagementScore',
                operator: 'less_than',
                value: 0.3,
                output: 'low-engagement'
              }
            ],
            defaultOutput: 'medium-engagement'
          },
          inputs: [{ name: 'customer', type: 'main', required: true }],
          outputs: [
            { name: 'high-engagement', type: 'main' },
            { name: 'medium-engagement', type: 'main' },
            { name: 'low-engagement', type: 'main' }
          ]
        },
        {
          id: 'send-tips-email',
          type: NodeType.SEND_EMAIL,
          name: 'Send Getting Started Tips',
          position: { x: 1100, y: 50 },
          configuration: {
            template: 'getting_started_tips',
            personalization: true
          },
          inputs: [{ name: 'customer', type: 'main', required: true }],
          outputs: [{ name: 'sent', type: 'main' }]
        },
        {
          id: 'schedule-call',
          type: NodeType.API_CALL,
          name: 'Schedule Onboarding Call',
          position: { x: 1100, y: 150 },
          configuration: {
            method: 'POST',
            url: '/api/scheduling/create-appointment',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              customerId: '{{ $node.customer.id }}',
              type: 'onboarding_call',
              duration: 30,
              priority: 'high'
            }
          },
          inputs: [{ name: 'customer', type: 'main', required: true }],
          outputs: [{ name: 'scheduled', type: 'main' }]
        },
        {
          id: 'create-support-ticket',
          type: NodeType.API_CALL,
          name: 'Create Follow-up Ticket',
          position: { x: 1100, y: 250 },
          configuration: {
            method: 'POST',
            url: '/api/tickets',
            headers: {
              'Content-Type': 'application/json'
            },
            body: {
              customerId: '{{ $node.customer.id }}',
              subject: 'Low engagement - proactive outreach needed',
              description: 'Customer shows low engagement after 24h. Proactive outreach recommended.',
              priority: 'medium',
              tags: ['onboarding', 'low-engagement', 'proactive'],
              assignToTeam: 'customer-success'
            }
          },
          inputs: [{ name: 'customer', type: 'main', required: true }],
          outputs: [{ name: 'created', type: 'main' }]
        },
        {
          id: 'update-customer-stage',
          type: NodeType.DATABASE_QUERY,
          name: 'Update Customer Stage',
          position: { x: 1300, y: 150 },
          configuration: {
            query: `
              UPDATE customers 
              SET onboarding_stage = $stage, 
                  onboarding_completed_at = CASE WHEN $stage = 'completed' THEN NOW() ELSE NULL END
              WHERE id = $customerId
            `,
            parameters: {
              customerId: '{{ $node.customer.id }}',
              stage: 'in_progress'
            }
          },
          inputs: [{ name: 'data', type: 'main', required: true }],
          outputs: [{ name: 'updated', type: 'main' }]
        },
        {
          id: 'end',
          type: NodeType.END,
          name: 'End',
          position: { x: 1500, y: 150 },
          configuration: {},
          inputs: [{ name: 'default', type: 'main', required: true }],
          outputs: []
        }
      ],
      connections: [
        {
          id: 'start-to-welcome',
          sourceNodeId: 'start',
          sourceOutput: 'default',
          targetNodeId: 'welcome-email',
          targetInput: 'customer'
        },
        {
          id: 'welcome-to-delay',
          sourceNodeId: 'welcome-email',
          sourceOutput: 'sent',
          targetNodeId: 'delay-24h',
          targetInput: 'trigger'
        },
        {
          id: 'delay-to-check',
          sourceNodeId: 'delay-24h',
          sourceOutput: 'delayed',
          targetNodeId: 'check-engagement',
          targetInput: 'customerId'
        },
        {
          id: 'check-to-condition',
          sourceNodeId: 'check-engagement',
          sourceOutput: 'customer',
          targetNodeId: 'engagement-condition',
          targetInput: 'customer'
        },
        {
          id: 'condition-to-tips',
          sourceNodeId: 'engagement-condition',
          sourceOutput: 'high-engagement',
          targetNodeId: 'send-tips-email',
          targetInput: 'customer'
        },
        {
          id: 'condition-to-call',
          sourceNodeId: 'engagement-condition',
          sourceOutput: 'medium-engagement',
          targetNodeId: 'schedule-call',
          targetInput: 'customer'
        },
        {
          id: 'condition-to-ticket',
          sourceNodeId: 'engagement-condition',
          sourceOutput: 'low-engagement',
          targetNodeId: 'create-support-ticket',
          targetInput: 'customer'
        },
        {
          id: 'tips-to-update',
          sourceNodeId: 'send-tips-email',
          sourceOutput: 'sent',
          targetNodeId: 'update-customer-stage',
          targetInput: 'data'
        },
        {
          id: 'call-to-update',
          sourceNodeId: 'schedule-call',
          sourceOutput: 'scheduled',
          targetNodeId: 'update-customer-stage',
          targetInput: 'data'
        },
        {
          id: 'ticket-to-update',
          sourceNodeId: 'create-support-ticket',
          sourceOutput: 'created',
          targetNodeId: 'update-customer-stage',
          targetInput: 'data'
        },
        {
          id: 'update-to-end',
          sourceNodeId: 'update-customer-stage',
          sourceOutput: 'updated',
          targetNodeId: 'end',
          targetInput: 'default'
        }
      ],
      settings: {
        timeout: 3600000, // 1 hour
        maxRetries: 3,
        errorHandling: 'continue',
        logging: 'detailed',
        executionMode: 'async',
        priority: 'normal',
        permissions: [
          { role: 'admin', actions: ['read', 'write', 'execute'] },
          { role: 'customer-success', actions: ['read', 'execute'] }
        ],
        allowedIntegrations: ['email', 'database', 'api', 'scheduling']
      },
      variables: [
        {
          name: 'welcomeEmailTemplate',
          type: 'string',
          defaultValue: 'customer_welcome',
          required: false,
          description: 'Email template for welcome message'
        },
        {
          name: 'engagementThreshold',
          type: 'number',
          defaultValue: 0.5,
          required: false,
          description: 'Threshold for medium engagement'
        }
      ]
    }
  }

  /**
   * Ultimate Multichannel Chatbot Workflow
   * Handles WA/IG/Email intents: invoices, order status, refunds, escalation, small-talk
   */
  static getUltimateChatbotWorkflow(tenantId: string): WorkflowDefinition {
    return {
      tenantId,
      name: 'Ultimate Multichannel Chatbot',
      description: 'AI-driven, multi-channel chatbot for invoices, orders, refunds, and escalation',
      version: '1.0',
      status: 'active' as any,
      category: 'chatbot',
      tags: ['whatsapp', 'instagram', 'email', 'ai', 'billing', 'orders'],
      createdBy: 'system',
      triggers: [
        { id: 'wa-message', type: TriggerType.EVENT, name: 'WA Message', configuration: { eventType: 'conversation.message.received', channel: 'whatsapp' }, enabled: true },
        { id: 'ig-message', type: TriggerType.EVENT, name: 'IG Message', configuration: { eventType: 'conversation.message.received', channel: 'instagram' }, enabled: true },
        { id: 'email-message', type: TriggerType.EVENT, name: 'Email Message', configuration: { eventType: 'conversation.message.received', channel: 'email' }, enabled: true }
      ],
      nodes: [
        { id: 'start', type: NodeType.START, name: 'Start', position: { x: 100, y: 100 }, configuration: {}, inputs: [], outputs: [{ name: 'default', type: 'main' }] },
        { id: 'ai', type: NodeType.AI_ANALYSIS, name: 'Detect Intent', position: { x: 300, y: 100 }, configuration: { analysisTypes: ['intent', 'entities', 'sentiment', 'urgency'], confidenceThreshold: 0.6 }, inputs: [{ name: 'message', type: 'main', required: true }], outputs: [{ name: 'analysis', type: 'main' }] },
        { id: 'intent-switch', type: NodeType.CONDITION, name: 'Intent Switch', position: { x: 550, y: 100 }, configuration: { conditions: [
          { field: 'intent', operator: 'equals', value: 'invoice_lookup', output: 'invoice' },
          { field: 'intent', operator: 'equals', value: 'order_status', output: 'order' },
          { field: 'intent', operator: 'equals', value: 'refund_request', output: 'refund' },
          { field: 'intent', operator: 'equals', value: 'escalation', output: 'escalation' },
        ], defaultOutput: 'fallback' }, inputs: [{ name: 'analysis', type: 'main', required: true }], outputs: [
          { name: 'invoice', type: 'main' }, { name: 'order', type: 'main' }, { name: 'refund', type: 'main' }, { name: 'escalation', type: 'main' }, { name: 'fallback', type: 'main' }
        ]},
        { id: 'customer-lookup', type: NodeType.CUSTOMER_LOOKUP, name: 'Customer Lookup', position: { x: 780, y: 60 }, configuration: { includeHistory: true, includePurchases: true }, inputs: [{ name: 'customerId', type: 'main', required: true }], outputs: [{ name: 'customer', type: 'main' }] },
        { id: 'customer-scoring', type: NodeType.CUSTOMER_SCORING, name: 'Customer Priority', position: { x: 980, y: 60 }, configuration: { factors: [ { name: 'tier', weight: 0.3 }, { name: 'lifetimeValue', weight: 0.3 }, { name: 'sentiment', weight: 0.2 }, { name: 'urgency', weight: 0.2 } ] }, inputs: [{ name: 'customer', type: 'main', required: true }], outputs: [{ name: 'score', type: 'main' }] },
        { id: 'invoice-reply', type: NodeType.SEND_NOTIFICATION, name: 'Reply Invoice', position: { x: 1200, y: 20 }, configuration: { notificationType: 'template', template: 'invoice_info', channel: 'auto' }, inputs: [{ name: 'data', type: 'main', required: true }], outputs: [{ name: 'sent', type: 'main' }] },
        { id: 'order-reply', type: NodeType.SEND_NOTIFICATION, name: 'Reply Order', position: { x: 1200, y: 100 }, configuration: { notificationType: 'template', template: 'order_status', channel: 'auto' }, inputs: [{ name: 'data', type: 'main', required: true }], outputs: [{ name: 'sent', type: 'main' }] },
        { id: 'refund-reply', type: NodeType.SEND_NOTIFICATION, name: 'Reply Refund', position: { x: 1200, y: 180 }, configuration: { notificationType: 'template', template: 'refund_steps', channel: 'auto' }, inputs: [{ name: 'data', type: 'main', required: true }], outputs: [{ name: 'sent', type: 'main' }] },
        { id: 'escalate', type: NodeType.TICKET_ESCALATION, name: 'Escalate', position: { x: 1200, y: 260 }, configuration: { escalationType: 'supervisor', notifyEscalatee: true, updatePriority: true, addNote: true, noteTemplate: 'Auto-escalated by chatbot' }, inputs: [{ name: 'ticket', type: 'main', required: true }], outputs: [{ name: 'escalated', type: 'main' }] },
        { id: 'end', type: NodeType.END, name: 'End', position: { x: 1450, y: 140 }, configuration: {}, inputs: [{ name: 'default', type: 'main', required: true }], outputs: [] }
      ],
      connections: [
        { id: 's-ai', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'ai', targetInput: 'message' },
        { id: 'ai-switch', sourceNodeId: 'ai', sourceOutput: 'analysis', targetNodeId: 'intent-switch', targetInput: 'analysis' },
        { id: 'switch-invoice', sourceNodeId: 'intent-switch', sourceOutput: 'invoice', targetNodeId: 'customer-lookup', targetInput: 'customerId' },
        { id: 'invoice-cust-score', sourceNodeId: 'customer-lookup', sourceOutput: 'customer', targetNodeId: 'customer-scoring', targetInput: 'customer' },
        { id: 'invoice-reply-conn', sourceNodeId: 'customer-scoring', sourceOutput: 'score', targetNodeId: 'invoice-reply', targetInput: 'data' },
        { id: 'switch-order', sourceNodeId: 'intent-switch', sourceOutput: 'order', targetNodeId: 'order-reply', targetInput: 'data' },
        { id: 'switch-refund', sourceNodeId: 'intent-switch', sourceOutput: 'refund', targetNodeId: 'refund-reply', targetInput: 'data' },
        { id: 'switch-escalate', sourceNodeId: 'intent-switch', sourceOutput: 'escalation', targetNodeId: 'escalate', targetInput: 'ticket' },
        { id: 'invoice-end', sourceNodeId: 'invoice-reply', sourceOutput: 'sent', targetNodeId: 'end', targetInput: 'default' },
        { id: 'order-end', sourceNodeId: 'order-reply', sourceOutput: 'sent', targetNodeId: 'end', targetInput: 'default' },
        { id: 'refund-end', sourceNodeId: 'refund-reply', sourceOutput: 'sent', targetNodeId: 'end', targetInput: 'default' },
        { id: 'escalate-end', sourceNodeId: 'escalate', sourceOutput: 'escalated', targetNodeId: 'end', targetInput: 'default' }
      ],
      settings: { timeout: 300000, maxRetries: 2, errorHandling: 'continue', logging: 'detailed', executionMode: 'async', priority: 'high', permissions: [], allowedIntegrations: ['ai','database','notification'] },
      variables: []
    };
  }

  /**
   * Get all available workflow templates
   */
  static getAllTemplates(tenantId: string): WorkflowDefinition[] {
    return [
      this.getOrderConfirmationTicketWorkflow(tenantId),
      this.getOrderCanceledNotificationWorkflow(tenantId),
      this.getOrderProcessingAutomationWorkflow(tenantId),
      this.getDeliveryIssueAutomationWorkflow(tenantId),
      this.getIntelligentTicketRoutingWorkflow(tenantId),
      this.getSLAMonitoringWorkflow(tenantId),
      this.getCustomerOnboardingWorkflow(tenantId),
      this.getUltimateChatbotWorkflow(tenantId)
    ]
  }

  /**
   * Get template by name
   */
  static getTemplate(name: string, tenantId: string): WorkflowDefinition | null {
    const templates: Record<string, (tenantId: string) => WorkflowDefinition> = {
      'order-confirmation-ticket': this.getOrderConfirmationTicketWorkflow,
      'order-canceled-notification': this.getOrderCanceledNotificationWorkflow,
      'order-processing-automation': this.getOrderProcessingAutomationWorkflow,
      'delivery-issue-automation': this.getDeliveryIssueAutomationWorkflow,
      'intelligent-ticket-routing': this.getIntelligentTicketRoutingWorkflow,
      'sla-monitoring': this.getSLAMonitoringWorkflow,
      'customer-onboarding': this.getCustomerOnboardingWorkflow,
      'ultimate-chatbot': this.getUltimateChatbotWorkflow
    }

    const templateFunction = templates[name]
    return templateFunction ? templateFunction(tenantId) : null
  }
}