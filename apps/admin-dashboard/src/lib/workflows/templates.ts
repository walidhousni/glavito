/**
 * Pre-built Workflow Templates for Common Use Cases
 * 
 * Each template includes:
 * - Complete node graph with positions
 * - Default configurations
 * - Variable placeholders
 * - Documentation/help text
 */

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: 'support' | 'marketing' | 'sales' | 'customer-success' | 'analytics';
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  channels: ('whatsapp' | 'email' | 'instagram' | 'sms')[];
  estimatedExecutionTime: string;
  nodes: TemplateNode[];
  edges: TemplateEdge[];
  variables?: TemplateVariable[];
  documentation?: string;
}

export interface TemplateNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: {
    label: string;
    description?: string;
    [key: string]: any;
  };
}

export interface TemplateEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  label?: string;
  animated?: boolean;
}

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  defaultValue?: any;
  required?: boolean;
}

// Template 1: Intelligent Ticket Routing
export const intelligentTicketRouting: WorkflowTemplate = {
  id: 'intelligent-ticket-routing',
  name: 'Intelligent Ticket Routing',
  description: 'AI-powered ticket assignment based on content analysis, agent expertise, and workload',
  category: 'support',
  tags: ['ai', 'tickets', 'automation', 'routing'],
  difficulty: 'intermediate',
  channels: ['whatsapp', 'email'],
  estimatedExecutionTime: '2-5 seconds',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 200 },
      data: {
        label: 'New Ticket Created',
        description: 'Triggered when a new ticket is created',
        eventType: 'ticket.created'
      }
    },
    {
      id: 'ai-1',
      type: 'ai_analysis',
      position: { x: 350, y: 200 },
      data: {
        label: 'Analyze Ticket Content',
        description: 'AI analyzes ticket content for intent, sentiment, and urgency',
        analysisTypes: ['intent_classification', 'sentiment_analysis', 'urgency_detection']
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 650, y: 200 },
      data: {
        label: 'Check Urgency',
        description: 'Route based on urgency level',
        outputs: ['critical', 'high', 'normal', 'low']
      }
    },
    {
      id: 'assign-1',
      type: 'ticket_assign',
      position: { x: 950, y: 100 },
      data: {
        label: 'Assign to Senior Agent',
        description: 'Assign critical tickets to senior agents',
        criteria: 'experience > 2 years AND current_load < 5'
      }
    },
    {
      id: 'assign-2',
      type: 'ticket_assign',
      position: { x: 950, y: 250 },
      data: {
        label: 'Smart Assignment',
        description: 'Assign based on agent expertise and workload',
        criteria: 'match_expertise AND balanced_load'
      }
    },
    {
      id: 'notify-1',
      type: 'send_message',
      position: { x: 1250, y: 175 },
      data: {
        label: 'Notify Agent',
        description: 'Send notification to assigned agent',
        channel: 'auto'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'ai-1', animated: true },
    { id: 'e2-3', source: 'ai-1', target: 'condition-1', animated: true },
    { id: 'e3-4', source: 'condition-1', target: 'assign-1', sourceHandle: 'critical', label: 'Critical', animated: true },
    { id: 'e3-5', source: 'condition-1', target: 'assign-2', sourceHandle: 'normal', label: 'Normal', animated: true },
    { id: 'e4-6', source: 'assign-1', target: 'notify-1', animated: true },
    { id: 'e5-6', source: 'assign-2', target: 'notify-1', animated: true }
  ],
  documentation: `
# Intelligent Ticket Routing

This workflow automatically routes incoming tickets to the most appropriate agent based on AI analysis.

## How it works:
1. Trigger fires when a new ticket is created
2. AI analyzes ticket content for intent, sentiment, and urgency
3. Tickets are routed based on urgency level
4. Critical tickets go to senior agents
5. Normal tickets are assigned based on expertise and workload
6. Agents are notified via their preferred channel

## Customization:
- Adjust urgency thresholds in the condition node
- Modify assignment criteria based on your team structure
- Add more routing paths for specific ticket types
  `
};

// Template 2: SLA Breach Prevention
export const slaBreachPrevention: WorkflowTemplate = {
  id: 'sla-breach-prevention',
  name: 'SLA Breach Prevention',
  description: 'Monitor tickets and escalate before SLA breach with progressive notifications',
  category: 'support',
  tags: ['sla', 'escalation', 'monitoring'],
  difficulty: 'intermediate',
  channels: ['email', 'whatsapp'],
  estimatedExecutionTime: 'Continuous monitoring',
  nodes: [
    {
      id: 'schedule-1',
      type: 'schedule',
      position: { x: 100, y: 200 },
      data: {
        label: 'Check Every 15 Minutes',
        description: 'Monitor tickets approaching SLA breach',
        cron: '*/15 * * * *'
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 400, y: 200 },
      data: {
        label: 'Time to Breach',
        description: 'Check remaining time until SLA breach',
        outputs: ['< 1 hour', '< 4 hours', '< 12 hours']
      }
    },
    {
      id: 'escalate-1',
      type: 'ticket_escalation',
      position: { x: 700, y: 100 },
      data: {
        label: 'Escalate to Manager',
        description: 'Critical: Less than 1 hour to breach',
        escalateToRole: 'manager',
        priority: 'urgent'
      }
    },
    {
      id: 'notify-1',
      type: 'send_whatsapp',
      position: { x: 700, y: 200 },
      data: {
        label: 'WhatsApp Alert to Agent',
        description: 'Send WhatsApp alert',
        template: 'sla_warning'
      }
    },
    {
      id: 'notify-2',
      type: 'send_email',
      position: { x: 700, y: 300 },
      data: {
        label: 'Email Reminder',
        description: 'Send email reminder',
        subject: 'Ticket approaching SLA deadline'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'schedule-1', target: 'condition-1', animated: true },
    { id: 'e2-3', source: 'condition-1', target: 'escalate-1', sourceHandle: '< 1 hour', label: 'Critical', animated: true },
    { id: 'e2-4', source: 'condition-1', target: 'notify-1', sourceHandle: '< 4 hours', label: 'Urgent', animated: true },
    { id: 'e2-5', source: 'condition-1', target: 'notify-2', sourceHandle: '< 12 hours', label: 'Warning', animated: true }
  ],
  documentation: `
# SLA Breach Prevention

Proactively monitor tickets and escalate before SLA breach occurs.

## Features:
- Continuous monitoring every 15 minutes
- Progressive escalation based on time remaining
- Multi-channel notifications (WhatsApp, Email)
- Automatic manager escalation for critical cases

## Time Thresholds:
- < 1 hour: Escalate to manager + WhatsApp alert
- < 4 hours: WhatsApp alert to agent
- < 12 hours: Email reminder to agent

## Setup:
1. Configure your SLA policies in ticket settings
2. Adjust time thresholds based on your SLA terms
3. Customize notification templates
  `
};

// Template 3: Customer Onboarding Journey
export const customerOnboardingJourney: WorkflowTemplate = {
  id: 'customer-onboarding-journey',
  name: 'Customer Onboarding Journey',
  description: 'Multi-step welcome workflow with personalized messages and milestone tracking',
  category: 'customer-success',
  tags: ['onboarding', 'journey', 'engagement'],
  difficulty: 'beginner',
  channels: ['email', 'whatsapp'],
  estimatedExecutionTime: '7 days (multi-step)',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 250 },
      data: {
        label: 'New Customer',
        description: 'Triggered when customer signs up',
        eventType: 'customer.created'
      }
    },
    {
      id: 'message-1',
      type: 'send_email',
      position: { x: 350, y: 250 },
      data: {
        label: 'Welcome Email',
        description: 'Send personalized welcome email',
        template: 'welcome_email'
      }
    },
    {
      id: 'delay-1',
      type: 'delay',
      position: { x: 600, y: 250 },
      data: {
        label: 'Wait 1 Day',
        description: 'Wait before next step',
        duration: 86400000
      }
    },
    {
      id: 'message-2',
      type: 'send_whatsapp',
      position: { x: 850, y: 250 },
      data: {
        label: 'Quick Start Guide',
        description: 'Send WhatsApp quick start guide',
        template: 'onboarding_day1'
      }
    },
    {
      id: 'delay-2',
      type: 'delay',
      position: { x: 1100, y: 250 },
      data: {
        label: 'Wait 3 Days',
        description: 'Wait before checking progress',
        duration: 259200000
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 1350, y: 250 },
      data: {
        label: 'Check Activation',
        description: 'Has customer completed setup?',
        outputs: ['completed', 'not_completed']
      }
    },
    {
      id: 'message-3',
      type: 'send_email',
      position: { x: 1600, y: 150 },
      data: {
        label: 'Success Email',
        description: 'Congratulate on completing setup',
        template: 'onboarding_success'
      }
    },
    {
      id: 'message-4',
      type: 'send_message',
      position: { x: 1600, y: 350 },
      data: {
        label: 'Help Offer',
        description: 'Offer help to complete setup',
        template: 'onboarding_help'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'message-1', animated: true },
    { id: 'e2-3', source: 'message-1', target: 'delay-1', animated: true },
    { id: 'e3-4', source: 'delay-1', target: 'message-2', animated: true },
    { id: 'e4-5', source: 'message-2', target: 'delay-2', animated: true },
    { id: 'e5-6', source: 'delay-2', target: 'condition-1', animated: true },
    { id: 'e6-7', source: 'condition-1', target: 'message-3', sourceHandle: 'completed', label: 'Done', animated: true },
    { id: 'e6-8', source: 'condition-1', target: 'message-4', sourceHandle: 'not_completed', label: 'Needs Help', animated: true }
  ],
  documentation: `
# Customer Onboarding Journey

Guide new customers through their first week with automated, personalized touchpoints.

## Journey Steps:
Day 0: Welcome email immediately
Day 1: WhatsApp quick start guide
Day 4: Check activation status and send appropriate follow-up

## Personalization:
- All messages use customer's name and relevant details
- Content adapts based on customer's activation status
- Multi-channel approach (email + WhatsApp) for better engagement

## Optimization Tips:
- Adjust delays based on your product complexity
- Add more milestone checks
- Include survey to gather feedback
  `
};

// Template 4: Escalation Workflow
export const escalationWorkflow: WorkflowTemplate = {
  id: 'escalation-workflow',
  name: 'Automatic Escalation Workflow',
  description: 'Escalate tickets automatically based on priority, time, and customer status',
  category: 'support',
  tags: ['escalation', 'priority', 'automation'],
  difficulty: 'beginner',
  channels: ['email', 'whatsapp'],
  estimatedExecutionTime: '< 1 second',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 300 },
      data: {
        label: 'Ticket Event',
        description: 'Triggered on ticket creation or update',
        eventType: 'ticket.*'
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 350, y: 300 },
      data: {
        label: 'Check Priority',
        description: 'Route based on ticket priority',
        outputs: ['urgent', 'high', 'normal']
      }
    },
    {
      id: 'segment-1',
      type: 'segment_check',
      position: { x: 600, y: 150 },
      data: {
        label: 'Check if VIP',
        description: 'Check if customer is in VIP segment',
        segmentNames: ['VIP', 'Enterprise', 'Premium']
      }
    },
    {
      id: 'escalate-1',
      type: 'ticket_escalation',
      position: { x: 850, y: 100 },
      data: {
        label: 'Escalate to VP',
        description: 'VIP customer with urgent ticket',
        escalateToRole: 'vp_support'
      }
    },
    {
      id: 'escalate-2',
      type: 'ticket_escalation',
      position: { x: 850, y: 200 },
      data: {
        label: 'Escalate to Manager',
        description: 'Urgent ticket - escalate to manager',
        escalateToRole: 'manager'
      }
    },
    {
      id: 'assign-1',
      type: 'ticket_assign',
      position: { x: 850, y: 400 },
      data: {
        label: 'Standard Assignment',
        description: 'Assign to available agent',
        criteria: 'balanced_load'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'condition-1', animated: true },
    { id: 'e2-3', source: 'condition-1', target: 'segment-1', sourceHandle: 'urgent', label: 'Urgent', animated: true },
    { id: 'e2-4', source: 'condition-1', target: 'escalate-2', sourceHandle: 'high', label: 'High', animated: true },
    { id: 'e2-5', source: 'condition-1', target: 'assign-1', sourceHandle: 'normal', label: 'Normal', animated: true },
    { id: 'e3-6', source: 'segment-1', target: 'escalate-1', sourceHandle: 'in_segment', label: 'VIP', animated: true },
    { id: 'e3-7', source: 'segment-1', target: 'escalate-2', sourceHandle: 'not_in_segment', label: 'Regular', animated: true }
  ],
  documentation: `
# Automatic Escalation Workflow

Smart escalation based on ticket priority and customer status.

## Escalation Rules:
- Urgent + VIP → VP of Support
- Urgent + Regular → Manager
- High Priority → Manager
- Normal → Standard agent assignment

## Key Features:
- Real-time customer segment checking
- Multi-level escalation paths
- Automatic role-based routing
- Zero manual intervention

## Configuration:
1. Define your VIP segments
2. Set up role mappings
3. Configure escalation thresholds
  `
};

// Template 5: Customer Feedback Loop
export const customerFeedbackLoop: WorkflowTemplate = {
  id: 'customer-feedback-loop',
  name: 'Customer Feedback Loop',
  description: 'Post-resolution survey and follow-up with detractors',
  category: 'customer-success',
  tags: ['feedback', 'survey', 'nps', 'csat'],
  difficulty: 'beginner',
  channels: ['email', 'whatsapp'],
  estimatedExecutionTime: '2-3 days',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 250 },
      data: {
        label: 'Ticket Resolved',
        description: 'Triggered when ticket is marked as resolved',
        eventType: 'ticket.resolved'
      }
    },
    {
      id: 'delay-1',
      type: 'delay',
      position: { x: 350, y: 250 },
      data: {
        label: 'Wait 1 Hour',
        description: 'Give customer time to process',
        duration: 3600000
      }
    },
    {
      id: 'message-1',
      type: 'send_message',
      position: { x: 600, y: 250 },
      data: {
        label: 'Send CSAT Survey',
        description: 'Request satisfaction rating',
        channel: 'auto',
        template: 'csat_survey'
      }
    },
    {
      id: 'delay-2',
      type: 'delay',
      position: { x: 850, y: 250 },
      data: {
        label: 'Wait for Response',
        description: 'Wait 24 hours for survey response',
        duration: 86400000
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 1100, y: 250 },
      data: {
        label: 'Check Rating',
        description: 'Route based on satisfaction score',
        outputs: ['promoter', 'passive', 'detractor', 'no_response']
      }
    },
    {
      id: 'track-1',
      type: 'track_event',
      position: { x: 1350, y: 100 },
      data: {
        label: 'Track Promoter',
        description: 'Log positive feedback',
        eventType: 'feedback.promoter'
      }
    },
    {
      id: 'message-2',
      type: 'send_message',
      position: { x: 1350, y: 300 },
      data: {
        label: 'Request Callback',
        description: 'Reach out to detractors',
        template: 'detractor_callback'
      }
    },
    {
      id: 'assign-1',
      type: 'ticket_create',
      position: { x: 1600, y: 300 },
      data: {
        label: 'Create Follow-up Ticket',
        description: 'Create ticket for manager follow-up',
        priority: 'high'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'delay-1', animated: true },
    { id: 'e2-3', source: 'delay-1', target: 'message-1', animated: true },
    { id: 'e3-4', source: 'message-1', target: 'delay-2', animated: true },
    { id: 'e4-5', source: 'delay-2', target: 'condition-1', animated: true },
    { id: 'e5-6', source: 'condition-1', target: 'track-1', sourceHandle: 'promoter', label: 'Happy', animated: true },
    { id: 'e5-7', source: 'condition-1', target: 'message-2', sourceHandle: 'detractor', label: 'Unhappy', animated: true },
    { id: 'e7-8', source: 'message-2', target: 'assign-1', animated: true }
  ],
  documentation: `
# Customer Feedback Loop

Collect and act on customer feedback after ticket resolution.

## Process:
1. Wait 1 hour after resolution
2. Send CSAT survey via preferred channel
3. Wait 24 hours for response
4. Route based on score:
   - Promoters (9-10): Track as positive feedback
   - Passives (7-8): Track for analysis
   - Detractors (0-6): Immediate follow-up + create escalation ticket

## Best Practices:
- Keep survey short (1-2 questions)
- Act quickly on negative feedback
- Track trends over time
- Close the loop with customers
  `
};

// Template 6: Churn Prevention
export const churnPrevention: WorkflowTemplate = {
  id: 'churn-prevention',
  name: 'Churn Prevention Workflow',
  description: 'Detect at-risk customers and engage proactively',
  category: 'customer-success',
  tags: ['churn', 'retention', 'engagement', 'ai'],
  difficulty: 'advanced',
  channels: ['email', 'whatsapp'],
  estimatedExecutionTime: 'Continuous',
  nodes: [
    {
      id: 'schedule-1',
      type: 'schedule',
      position: { x: 100, y: 250 },
      data: {
        label: 'Daily Check',
        description: 'Check churn risk daily',
        cron: '0 9 * * *'
      }
    },
    {
      id: 'churn-1',
      type: 'churn_risk_check',
      position: { x: 350, y: 250 },
      data: {
        label: 'Assess Churn Risk',
        description: 'AI-powered churn risk assessment',
        autoCreateCampaign: false
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 600, y: 250 },
      data: {
        label: 'Risk Level',
        description: 'Route based on churn risk',
        outputs: ['critical', 'high', 'medium', 'low']
      }
    },
    {
      id: 'assign-1',
      type: 'ticket_create',
      position: { x: 850, y: 100 },
      data: {
        label: 'Account Manager Alert',
        description: 'Assign to account manager',
        priority: 'urgent',
        category: 'retention'
      }
    },
    {
      id: 'message-1',
      type: 'send_message',
      position: { x: 850, y: 250 },
      data: {
        label: 'Engagement Campaign',
        description: 'Send personalized re-engagement message',
        channel: 'auto',
        template: 'retention_offer'
      }
    },
    {
      id: 'track-1',
      type: 'track_event',
      position: { x: 1100, y: 250 },
      data: {
        label: 'Track Outreach',
        description: 'Log retention campaign',
        eventType: 'retention.outreach'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'schedule-1', target: 'churn-1', animated: true },
    { id: 'e2-3', source: 'churn-1', target: 'condition-1', animated: true },
    { id: 'e3-4', source: 'condition-1', target: 'assign-1', sourceHandle: 'critical', label: 'Critical', animated: true },
    { id: 'e3-5', source: 'condition-1', target: 'message-1', sourceHandle: 'high', label: 'High', animated: true },
    { id: 'e5-6', source: 'message-1', target: 'track-1', animated: true }
  ],
  documentation: `
# Churn Prevention Workflow

Proactively identify and engage at-risk customers before they churn.

## How It Works:
- AI analyzes customer behavior patterns daily
- Churn risk scored as: critical, high, medium, low
- Critical risks: Immediate account manager intervention
- High risks: Automated retention campaign
- All outreach tracked for analysis

## Risk Indicators:
- Decreased usage
- Support ticket increase
- Failed payments
- Negative feedback
- Reduced feature adoption

## Success Metrics:
- Track retention rate improvements
- Measure campaign effectiveness
- Monitor early warning accuracy
  `
};

// Template 7: WhatsApp First Response
export const whatsappFirstResponse: WorkflowTemplate = {
  id: 'whatsapp-first-response',
  name: 'WhatsApp Instant Response',
  description: 'Instant WhatsApp auto-reply for new tickets with AI intent detection',
  category: 'support',
  tags: ['whatsapp', 'automation', 'instant-response'],
  difficulty: 'beginner',
  channels: ['whatsapp'],
  estimatedExecutionTime: '< 1 second',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 200 },
      data: {
        label: 'New WhatsApp Ticket',
        description: 'Triggered on new WhatsApp ticket',
        eventType: 'ticket.created',
        channel: 'whatsapp'
      }
    },
    {
      id: 'ai-1',
      type: 'intent_detection',
      position: { x: 350, y: 200 },
      data: {
        label: 'Detect Intent',
        description: 'Understand customer request',
        content: '{{ticket.message}}'
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 600, y: 200 },
      data: {
        label: 'Route by Intent',
        description: 'Send appropriate auto-response',
        outputs: ['order_status', 'refund', 'technical', 'general']
      }
    },
    {
      id: 'message-1',
      type: 'send_whatsapp',
      position: { x: 850, y: 100 },
      data: {
        label: 'Order Status Reply',
        description: 'Send order tracking info',
        template: 'order_status_auto'
      }
    },
    {
      id: 'message-2',
      type: 'send_whatsapp',
      position: { x: 850, y: 200 },
      data: {
        label: 'Refund Info',
        description: 'Send refund policy',
        template: 'refund_policy'
      }
    },
    {
      id: 'message-3',
      type: 'send_whatsapp',
      position: { x: 850, y: 300 },
      data: {
        label: 'General Response',
        description: 'Acknowledge and set expectations',
        template: 'acknowledge_ticket'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'ai-1', animated: true },
    { id: 'e2-3', source: 'ai-1', target: 'condition-1', animated: true },
    { id: 'e3-4', source: 'condition-1', target: 'message-1', sourceHandle: 'order_status', animated: true },
    { id: 'e3-5', source: 'condition-1', target: 'message-2', sourceHandle: 'refund', animated: true },
    { id: 'e3-6', source: 'condition-1', target: 'message-3', sourceHandle: 'general', animated: true }
  ],
  documentation: `
# WhatsApp Instant Response

Provide instant, intelligent auto-replies to WhatsApp inquiries.

## Features:
- < 1 second response time
- AI-powered intent detection
- Context-aware responses
- 24/7 availability

## Intent Categories:
- Order Status: Send tracking info
- Refund Request: Share policy
- Technical Issue: Set expectations
- General: Acknowledge and queue

## Setup Requirements:
1. WhatsApp Business API configured
2. Message templates approved
3. Intent training data loaded
  `
};

// Template 8: Multi-Channel Follow-Up
export const multiChannelFollowUp: WorkflowTemplate = {
  id: 'multi-channel-followup',
  name: 'Multi-Channel Follow-Up',
  description: 'Escalate through channels: Email → WhatsApp → Call',
  category: 'support',
  tags: ['multichannel', 'escalation', 'engagement'],
  difficulty: 'intermediate',
  channels: ['email', 'whatsapp'],
  estimatedExecutionTime: '3-5 days',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 300 },
      data: {
        label: 'Ticket Needs Follow-up',
        description: 'Triggered for pending customer response',
        eventType: 'ticket.awaiting_customer'
      }
    },
    {
      id: 'message-1',
      type: 'send_email',
      position: { x: 350, y: 300 },
      data: {
        label: 'Email Follow-up',
        description: 'First attempt via email',
        template: 'followup_request'
      }
    },
    {
      id: 'delay-1',
      type: 'delay',
      position: { x: 600, y: 300 },
      data: {
        label: 'Wait 24 Hours',
        description: 'Wait for email response',
        duration: 86400000
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 850, y: 300 },
      data: {
        label: 'Check Response',
        description: 'Did customer respond?',
        outputs: ['responded', 'no_response']
      }
    },
    {
      id: 'message-2',
      type: 'send_whatsapp',
      position: { x: 1100, y: 400 },
      data: {
        label: 'WhatsApp Follow-up',
        description: 'Escalate to WhatsApp',
        template: 'followup_urgent'
      }
    },
    {
      id: 'delay-2',
      type: 'delay',
      position: { x: 1350, y: 400 },
      data: {
        label: 'Wait 8 Hours',
        description: 'Wait for WhatsApp response',
        duration: 28800000
      }
    },
    {
      id: 'condition-2',
      type: 'condition',
      position: { x: 1600, y: 400 },
      data: {
        label: 'Final Check',
        description: 'Still no response?',
        outputs: ['responded', 'no_response']
      }
    },
    {
      id: 'ticket-1',
      type: 'ticket_create',
      position: { x: 1850, y: 500 },
      data: {
        label: 'Schedule Call',
        description: 'Create ticket for phone outreach',
        priority: 'high',
        category: 'callback_needed'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'message-1', animated: true },
    { id: 'e2-3', source: 'message-1', target: 'delay-1', animated: true },
    { id: 'e3-4', source: 'delay-1', target: 'condition-1', animated: true },
    { id: 'e4-5', source: 'condition-1', target: 'message-2', sourceHandle: 'no_response', label: 'No Reply', animated: true },
    { id: 'e5-6', source: 'message-2', target: 'delay-2', animated: true },
    { id: 'e6-7', source: 'delay-2', target: 'condition-2', animated: true },
    { id: 'e7-8', source: 'condition-2', target: 'ticket-1', sourceHandle: 'no_response', label: 'Still No Reply', animated: true }
  ],
  documentation: `
# Multi-Channel Follow-Up

Progressive escalation through multiple channels to ensure customer engagement.

## Escalation Path:
1. Email (Day 0): Initial follow-up
2. WhatsApp (Day 1): If no email response
3. Phone Call (Day 1.5): If still no response

## Channel Strategy:
- Email: Professional, detailed
- WhatsApp: Urgent, conversational
- Phone: Personal, immediate

## Success Tips:
- Keep messages concise
- Reference previous communication
- Provide clear next steps
- Track response rates per channel
  `
};

// Template 9: Agent Performance Tracker
export const agentPerformanceTracker: WorkflowTemplate = {
  id: 'agent-performance-tracker',
  name: 'Agent Performance Tracker',
  description: 'Track and route based on agent performance metrics',
  category: 'analytics',
  tags: ['performance', 'metrics', 'routing'],
  difficulty: 'advanced',
  channels: ['email'],
  estimatedExecutionTime: 'Continuous',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 300 },
      data: {
        label: 'Ticket Closed',
        description: 'Track agent performance on close',
        eventType: 'ticket.closed'
      }
    },
    {
      id: 'track-1',
      type: 'log_metric',
      position: { x: 350, y: 300 },
      data: {
        label: 'Log Metrics',
        description: 'Record resolution time, CSAT, etc.',
        metrics: ['resolution_time', 'customer_satisfaction', 'first_response_time']
      }
    },
    {
      id: 'condition-1',
      type: 'condition',
      position: { x: 600, y: 300 },
      data: {
        label: 'Performance Check',
        description: 'Evaluate agent performance',
        outputs: ['excellent', 'good', 'needs_improvement']
      }
    },
    {
      id: 'message-1',
      type: 'send_email',
      position: { x: 850, y: 200 },
      data: {
        label: 'Kudos Email',
        description: 'Send recognition for excellent work',
        template: 'agent_kudos'
      }
    },
    {
      id: 'ticket-1',
      type: 'ticket_create',
      position: { x: 850, y: 400 },
      data: {
        label: 'Coaching Ticket',
        description: 'Create coaching ticket for manager',
        priority: 'normal',
        category: 'coaching_needed'
      }
    },
    {
      id: 'track-2',
      type: 'track_event',
      position: { x: 1100, y: 300 },
      data: {
        label: 'Update Dashboard',
        description: 'Update performance dashboard',
        eventType: 'performance.updated'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'track-1', animated: true },
    { id: 'e2-3', source: 'track-1', target: 'condition-1', animated: true },
    { id: 'e3-4', source: 'condition-1', target: 'message-1', sourceHandle: 'excellent', label: 'Excellent', animated: true },
    { id: 'e3-5', source: 'condition-1', target: 'ticket-1', sourceHandle: 'needs_improvement', label: 'Needs Work', animated: true },
    { id: 'e4-6', source: 'message-1', target: 'track-2', animated: true },
    { id: 'e5-6', source: 'ticket-1', target: 'track-2', animated: true }
  ],
  documentation: `
# Agent Performance Tracker

Automated performance tracking and coaching triggers.

## Metrics Tracked:
- Resolution time
- First response time
- Customer satisfaction (CSAT)
- Ticket volume handled
- Escalation rate

## Actions:
- Excellent: Send kudos email
- Good: Track for reports
- Needs Improvement: Create coaching ticket for manager

## Benefits:
- Real-time performance insights
- Proactive coaching opportunities
- Recognition automation
- Data-driven routing decisions
  `
};

// Template 10: VIP Customer Fast Track
export const vipCustomerFastTrack: WorkflowTemplate = {
  id: 'vip-fast-track',
  name: 'VIP Customer Fast Track',
  description: 'Priority routing and white-glove service for VIP customers',
  category: 'support',
  tags: ['vip', 'priority', 'white-glove'],
  difficulty: 'beginner',
  channels: ['whatsapp', 'email'],
  estimatedExecutionTime: '< 2 seconds',
  nodes: [
    {
      id: 'trigger-1',
      type: 'trigger',
      position: { x: 100, y: 250 },
      data: {
        label: 'New Ticket',
        description: 'Any new ticket created',
        eventType: 'ticket.created'
      }
    },
    {
      id: 'segment-1',
      type: 'segment_check',
      position: { x: 350, y: 250 },
      data: {
        label: 'Check VIP Status',
        description: 'Verify customer segment',
        segmentNames: ['VIP', 'Enterprise', 'Premium']
      }
    },
    {
      id: 'ticket-1',
      type: 'ticket_update',
      position: { x: 600, y: 150 },
      data: {
        label: 'Set High Priority',
        description: 'Mark as high priority',
        priority: 'urgent'
      }
    },
    {
      id: 'assign-1',
      type: 'ticket_assign',
      position: { x: 850, y: 150 },
      data: {
        label: 'Assign to Senior Agent',
        description: 'Route to most experienced agent',
        criteria: 'experience > 3 years AND vip_certified = true'
      }
    },
    {
      id: 'message-1',
      type: 'send_whatsapp',
      position: { x: 1100, y: 150 },
      data: {
        label: 'VIP Acknowledgment',
        description: 'Send personalized WhatsApp',
        template: 'vip_acknowledgment'
      }
    },
    {
      id: 'track-1',
      type: 'track_event',
      position: { x: 1350, y: 150 },
      data: {
        label: 'Log VIP Ticket',
        description: 'Track for VIP metrics',
        eventType: 'vip.ticket_created'
      }
    }
  ],
  edges: [
    { id: 'e1-2', source: 'trigger-1', target: 'segment-1', animated: true },
    { id: 'e2-3', source: 'segment-1', target: 'ticket-1', sourceHandle: 'in_segment', label: 'VIP', animated: true },
    { id: 'e3-4', source: 'ticket-1', target: 'assign-1', animated: true },
    { id: 'e4-5', source: 'assign-1', target: 'message-1', animated: true },
    { id: 'e5-6', source: 'message-1', target: 'track-1', animated: true }
  ],
  documentation: `
# VIP Customer Fast Track

Ensure VIP customers receive immediate, white-glove service.

## VIP Treatment:
1. Instant segment verification
2. Automatic high priority flag
3. Senior agent assignment
4. Personalized WhatsApp acknowledgment
5. Dedicated tracking and reporting

## Agent Requirements:
- 3+ years experience
- VIP certification completed
- High CSAT score (>4.5)
- Available for immediate response

## Segment Criteria:
- VIP: Top-tier paid customers
- Enterprise: Large contracts
- Premium: Special partnerships

## SLA Targets:
- First response: < 5 minutes
- Resolution: < 2 hours
  `
};

// Export all templates
export const workflowTemplates: WorkflowTemplate[] = [
  intelligentTicketRouting,
  slaBreachPrevention,
  customerOnboardingJourney,
  escalationWorkflow,
  customerFeedbackLoop,
  churnPrevention,
  whatsappFirstResponse,
  multiChannelFollowUp,
  agentPerformanceTracker,
  vipCustomerFastTrack
];

// Helper functions
export function getTemplateById(id: string): WorkflowTemplate | undefined {
  return workflowTemplates.find(template => template.id === id);
}

export function getTemplatesByCategory(category: WorkflowTemplate['category']): WorkflowTemplate[] {
  return workflowTemplates.filter(template => template.category === category);
}

export function getTemplatesByDifficulty(difficulty: WorkflowTemplate['difficulty']): WorkflowTemplate[] {
  return workflowTemplates.filter(template => template.difficulty === difficulty);
}

export function getTemplatesByChannel(channel: 'whatsapp' | 'email' | 'instagram' | 'sms'): WorkflowTemplate[] {
  return workflowTemplates.filter(template => template.channels.includes(channel));
}

export function searchTemplates(query: string): WorkflowTemplate[] {
  const lowerQuery = query.toLowerCase();
  return workflowTemplates.filter(template => 
    template.name.toLowerCase().includes(lowerQuery) ||
    template.description.toLowerCase().includes(lowerQuery) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

