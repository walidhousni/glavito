# Workflow Builder User Guide

## Table of Contents
1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Understanding Node Types](#understanding-node-types)
4. [Multi-Channel Messaging](#multi-channel-messaging)
5. [Using Templates](#using-templates)
6. [Variables and Expressions](#variables-and-expressions)
7. [Building Your First Workflow](#building-your-first-workflow)
8. [Debugging Workflows](#debugging-workflows)
9. [Keyboard Shortcuts](#keyboard-shortcuts)
10. [Best Practices](#best-practices)

---

## Introduction

The Workflow Builder is a powerful visual automation tool that allows you to create sophisticated, multi-channel customer engagement workflows without writing code. From simple ticket routing to complex AI-powered customer journeys, the Workflow Builder helps you automate your support and marketing operations.

### Key Features
- **Visual Workflow Design**: Drag-and-drop interface with modern, intuitive UI
- **Multi-Channel Support**: WhatsApp, Instagram, Email, and SMS messaging
- **AI-Powered Automation**: Intelligent routing, sentiment analysis, and intent detection
- **Pre-built Templates**: 10+ ready-to-use templates for common scenarios
- **Real-time Execution**: Monitor workflow execution in real-time
- **Template Messages**: Integrate WhatsApp Business templates seamlessly

---

## Getting Started

### Creating a New Workflow

1. **From Templates**:
   - Click "Create Workflow" button
   - Browse the template gallery
   - Use the search bar to find specific templates
   - Filter by category: Support, Marketing, Sales, Customer Success, Analytics
   - Check difficulty badges: Beginner, Intermediate, Advanced
   - Review estimated execution time and channel compatibility
   - Click on a template card to select it
   - Click "Create Workflow" to start

2. **From Scratch**:
   - Click "Create Workflow" button
   - Scroll to "Create Custom Workflow" section
   - Enter workflow name (required)
   - Select a category
   - Add description (optional)
   - Click "Create Workflow"

### The Workflow Canvas

The canvas is your main workspace where you design workflows:

- **Background Grid**: Subtle dot grid for alignment
- **Minimap**: Bottom-right corner shows overview of entire workflow
- **Controls**: Left side for zoom, fit view, and canvas controls
- **Stats Overlay**: Bottom-left shows node and connection count
- **Floating Toolbar**: Top-right for quick actions (zoom in/out, fit view)

### The Node Palette

Located on the left side, the Node Palette contains all available workflow nodes:

- **Recently Used**: Quick access to your most-used nodes
- **Popular**: Most commonly used nodes across all users
- **Categories**:
  - **Triggers**: Event-based workflow starters
  - **Tickets**: Ticket management operations
  - **Messages**: Multi-channel messaging nodes
  - **Logic**: Conditional routing and delays
  - **AI**: AI-powered analysis and routing
  - **Customer**: Customer data and segmentation
  - **Analytics**: Event tracking and metrics
  - **Integrations**: External API calls

**Using the Node Palette**:
- Search nodes by name, description, or category
- Filter by category using the pill buttons
- Click a node to add it to the canvas
- Or drag and drop nodes onto the canvas

### The Node Inspector

Located on the right side, the Node Inspector shows configuration for the selected node:

**Tabs**:
- **General**: Basic properties (label, position)
- **Config**: Node-specific configuration
- **I/O**: Inputs and outputs for the node

**Configuration by Node Type**:
Each node type has specific configuration options. Always fill in required fields before saving.

---

## Understanding Node Types

### Triggers
Start workflows based on events:

- **Event Trigger**: Generic event-based trigger
- **Webhook**: HTTP-triggered workflows
- **Schedule**: Time-based triggers (cron syntax)

### Tickets
Manage support tickets:

- **Create Ticket**: Create new ticket
- **Update Ticket**: Modify ticket properties
- **Assign Ticket**: Route to agent or team
- **Close Ticket**: Mark ticket as resolved
- **Escalate Ticket**: Escalate to higher tier

### Messages
Send messages across channels:

- **Send Message**: Unified messaging with channel selector
  - Channels: WhatsApp, Instagram, Email, SMS, Auto
  - Auto mode picks best channel based on customer preference
  
- **Send WhatsApp**: WhatsApp Business API messaging
  - Template support
  - Media attachments
  - Variable substitution
  
- **Send Instagram**: Instagram Business messaging
  - Direct messages
  - Story mentions
  
- **Send Email**: Email notifications
  - HTML templates
  - Attachments
  - CC/BCC support

- **Template Message**: Pre-approved message templates
  - WhatsApp Business templates
  - Variable mapping
  - Multi-language support

### Logic
Control flow and timing:

- **Condition**: If/else branching
  - Define conditions using JSON
  - Multiple output paths
  - Default output for unmatched conditions
  
- **Switch**: Multi-way branching
  - Route based on multiple conditions
  
- **Delay**: Wait for time period
  - Fixed duration (milliseconds)
  - Cron-based delays
  
- **Set Variable**: Store data for later use
  - Create workflow variables
  - Transform data

### AI
Intelligent automation:

- **AI Router**: AI-powered routing decisions
  - Automatic intent classification
  - Sentiment-based routing
  
- **AI Analysis**: Analyze content with AI
  - Sentiment analysis
  - Intent detection
  - Urgency assessment
  
- **Sentiment Analysis**: Detect emotional tone
  - Positive, negative, neutral
  
- **Intent Detection**: Understand customer intent
  - Pre-defined intent categories
  - Custom intents

### Customer
Customer data and segmentation:

- **Segment Check**: Verify customer segment membership
  - VIP customers
  - Enterprise clients
  - Custom segments
  
- **Journey Tracker**: Track customer journey stage
  - Onboarding, activation, retention stages
  - Journey recommendations
  
- **Churn Risk**: Assess customer churn likelihood
  - AI-powered risk assessment
  - Automatic retention campaigns

### Analytics
Track and measure:

- **Track Event**: Log custom events
  - Custom event types
  - Metadata attachment
  
- **Log Metric**: Record performance metrics
  - Custom metrics
  - Time-series data

### Integrations
Connect to external services:

- **HTTP Request**: Make API calls
  - GET, POST, PUT, PATCH, DELETE methods
  - Custom headers
  - Request body
  - Timeout configuration
  
- **Database Query**: Query databases
  - SQL queries
  - NoSQL operations

---

## Multi-Channel Messaging

### Channel Strategy

The workflow builder supports **both approaches** for multi-channel messaging:

**Approach 1: Channel-Specific Nodes**
- Use dedicated nodes for each channel
- `send_whatsapp`, `send_instagram`, `send_email`, `send_sms`
- Best for: Workflows focused on a single channel

**Approach 2: Unified Send Message Node**
- Use one `send_message` node with channel selector
- Select channel: WhatsApp, Instagram, Email, SMS, or Auto
- Auto mode intelligently picks the best channel
- Best for: Multi-channel workflows with flexible routing

### WhatsApp Business API

**Setup Requirements**:
1. WhatsApp Business API account
2. Approved message templates
3. Webhook configuration

**Using WhatsApp Nodes**:

1. **Select WhatsApp Node** from Messages category
2. **Choose Template**:
   - Click "Refresh" to load templates
   - Select from approved templates list
   - Templates show language and preview
3. **Map Variables**:
   - Click variable pills to auto-populate
   - Or manually edit Template Params JSON
4. **Set Recipient**:
   - Leave Conversation ID empty for auto-find
   - Or provide specific conversation ID

**Template Variables**:
Use double curly braces for dynamic content:
- `{{customer.name}}` - Customer name
- `{{ticket.id}}` - Ticket number
- `{{agent.name}}` - Agent name

### Instagram Business API

**Configuration Options**:
- **Message Type**: Text, Image, Carousel
- **Media URL**: For image/carousel messages
- **Quick Replies**: Interactive button messages
- **Story Mentions**: Tag in stories

### Email Messages

**Configuration**:
- **To**: Recipient email (or `{{customer.email}}`)
- **Subject**: Email subject line
- **Content**: Email body (supports variables)
- **Template**: Optional HTML template
- **CC/BCC**: Additional recipients
- **Attachments**: File attachments

### Best Practices for Multi-Channel

1. **Use Auto Channel Selection** when customer preference is unknown
2. **Start with Email**, escalate to WhatsApp, then to Phone call
3. **Respect Opt-outs**: Check opt-out status before sending
4. **Time-based Routing**: Use SMS during business hours, Email for overnight
5. **Template Compliance**: Always use approved templates for WhatsApp

---

## Using Templates

### Available Templates

#### 1. Intelligent Ticket Routing (Intermediate)
**Use Case**: AI-powered ticket assignment based on content, urgency, and agent expertise

**How It Works**:
- Analyzes ticket content with AI
- Routes critical tickets to senior agents
- Balances workload across team
- Notifies assigned agent

**Channels**: WhatsApp, Email  
**Execution Time**: 2-5 seconds

#### 2. SLA Breach Prevention (Intermediate)
**Use Case**: Monitor tickets and escalate before SLA breach

**How It Works**:
- Checks tickets every 15 minutes
- Progressive escalation (< 12 hours → < 4 hours → < 1 hour)
- Manager escalation for critical cases
- Multi-channel alerts

**Channels**: Email, WhatsApp  
**Execution Time**: Continuous monitoring

#### 3. Customer Onboarding Journey (Beginner)
**Use Case**: Automated welcome sequence with milestone tracking

**How It Works**:
- Day 0: Welcome email
- Day 1: WhatsApp quick start guide
- Day 4: Activation check + appropriate follow-up

**Channels**: Email, WhatsApp  
**Execution Time**: 7 days (multi-step)

#### 4. Automatic Escalation (Beginner)
**Use Case**: Route tickets based on priority and customer status

**How It Works**:
- Checks ticket priority
- Verifies VIP status
- Routes urgent + VIP to VP
- Standard tickets to available agents

**Channels**: Email, WhatsApp  
**Execution Time**: < 1 second

#### 5. Customer Feedback Loop (Beginner)
**Use Case**: Post-resolution survey with detractor follow-up

**How It Works**:
- Wait 1 hour after resolution
- Send CSAT survey
- Track promoters
- Create escalation ticket for detractors

**Channels**: Email, WhatsApp  
**Execution Time**: 2-3 days

#### 6. Churn Prevention (Advanced)
**Use Case**: Detect at-risk customers and engage proactively

**How It Works**:
- Daily AI-powered churn risk assessment
- Critical risks: Account manager alert
- High risks: Automated retention campaign
- Track all outreach

**Channels**: Email, WhatsApp  
**Execution Time**: Continuous

#### 7. WhatsApp Instant Response (Beginner)
**Use Case**: Instant auto-reply with AI intent detection

**How It Works**:
- Detect intent (order status, refund, technical, general)
- Send appropriate auto-response
- < 1 second response time

**Channels**: WhatsApp  
**Execution Time**: < 1 second

#### 8. Multi-Channel Follow-Up (Intermediate)
**Use Case**: Progressive escalation through channels

**How It Works**:
- Email follow-up (Day 0)
- WhatsApp if no response (Day 1)
- Phone call ticket if still no response (Day 1.5)

**Channels**: Email, WhatsApp  
**Execution Time**: 3-5 days

#### 9. Agent Performance Tracker (Advanced)
**Use Case**: Track and route based on agent metrics

**How It Works**:
- Log resolution time, CSAT, response time
- Excellent performance: Send kudos
- Needs improvement: Create coaching ticket

**Channels**: Email  
**Execution Time**: Continuous

#### 10. VIP Customer Fast Track (Beginner)
**Use Case**: Priority routing for VIP customers

**How It Works**:
- Check VIP segment membership
- Set high priority
- Assign to senior, VIP-certified agent
- Personalized WhatsApp acknowledgment

**Channels**: WhatsApp, Email  
**Execution Time**: < 2 seconds

### Customizing Templates

After selecting a template:

1. **Review Nodes**: Understand the workflow structure
2. **Modify Configuration**: Click nodes to adjust settings
3. **Add Nodes**: Drag additional nodes from palette
4. **Adjust Routing**: Modify conditions and connections
5. **Test**: Use Execute button to test with sample data
6. **Activate**: Toggle Active switch when ready

---

## Variables and Expressions

### Using Variables

Variables allow dynamic content in your workflows:

**Syntax**: Use double curly braces: `{{variable.name}}`

### Common Variables

**Customer Variables**:
- `{{customer.id}}` - Customer ID
- `{{customer.name}}` - Customer name
- `{{customer.email}}` - Email address
- `{{customer.phone}}` - Phone number
- `{{customer.segment}}` - Customer segment

**Ticket Variables**:
- `{{ticket.id}}` - Ticket number
- `{{ticket.title}}` - Ticket title
- `{{ticket.priority}}` - Priority level
- `{{ticket.status}}` - Current status
- `{{ticket.message}}` - Ticket content

**Agent Variables**:
- `{{agent.id}}` - Agent ID
- `{{agent.name}}` - Agent name
- `{{agent.email}}` - Agent email
- `{{agent.team}}` - Team name

**System Variables**:
- `{{workflow.id}}` - Current workflow ID
- `{{workflow.name}}` - Workflow name
- `{{execution.timestamp}}` - Execution time

### Variable Transformations

Transform variables with built-in functions:

- `{{customer.name | uppercase}}` - Convert to uppercase
- `{{customer.name | lowercase}}` - Convert to lowercase
- `{{ticket.created_at | formatDate}}` - Format date
- `{{order.total | currency}}` - Format as currency

---

## Building Your First Workflow

### Example: Simple Ticket Assignment

Let's build a basic workflow that assigns new tickets to available agents.

**Step 1: Create Workflow**
1. Click "Create Workflow"
2. Name it "Simple Ticket Assignment"
3. Select category "Routing"
4. Click "Create Workflow"

**Step 2: Add Trigger**
1. From Node Palette, add **Event Trigger**
2. Click the trigger node
3. In Node Inspector, set:
   - Label: "New Ticket Created"
   - Event Type: `ticket.created`

**Step 3: Add Assignment Logic**
1. Add **Ticket Assign** node
2. Position it to the right of trigger
3. Configure:
   - Label: "Assign to Agent"
   - Criteria: `balanced_load`

**Step 4: Add Notification**
1. Add **Send Message** node
2. Configure:
   - Label: "Notify Agent"
   - Channel: `auto`
   - Template: `agent_notification`
   - Message: `New ticket assigned: {{ticket.title}}`

**Step 5: Connect Nodes**
1. Drag from trigger's bottom handle to assignment node's top handle
2. Drag from assignment node to notification node
3. Connections should appear with blue animated lines

**Step 6: Save and Test**
1. Press `Ctrl+S` or click "Save" button
2. Click "Execute" to test
3. Check execution history for results

**Step 7: Activate**
1. Toggle "Active" switch at top
2. Workflow is now live!

---

## Debugging Workflows

### Execution History

View past executions in the right panel:

- **Status Icons**:
  - ✓ Success (green)
  - ⚠ Warning (yellow)
  - ✗ Error (red)
  - ⟳ Running (blue)

- **Details**: Click execution to see:
  - Execution time
  - Nodes executed
  - Variables at each step
  - Error messages if failed

### Common Issues

**Issue**: "Node configuration invalid"
- **Solution**: Check required fields in Node Inspector
- Ensure all fields have valid values

**Issue**: "Connection failed"
- **Solution**: Verify API credentials
- Check timeout settings

**Issue**: "Template not found"
- **Solution**: Refresh WhatsApp templates
- Ensure template is approved in Business Manager

**Issue**: "Variable not found"
- **Solution**: Check variable spelling
- Ensure variable exists in context

### Best Debugging Practices

1. **Test Incrementally**: Add nodes one at a time and test
2. **Use Log Nodes**: Add "Log Event" nodes to track values
3. **Check Conditions**: Verify condition logic with test data
4. **Review Connections**: Ensure all nodes are properly connected
5. **Monitor Execution**: Watch real-time execution in history panel

---

## Keyboard Shortcuts

Speed up your workflow building with keyboard shortcuts:

### Canvas Actions
- `Ctrl+S` / `Cmd+S` - **Save workflow**
- `Ctrl+Z` / `Cmd+Z` - **Undo** (coming soon)
- `Ctrl+Y` / `Cmd+Y` - **Redo** (coming soon)
- `Ctrl+F` / `Cmd+F` - **Search nodes**
- `Delete` / `Backspace` - **Delete selected node**

### Node Actions
- `Ctrl+D` / `Cmd+D` - **Duplicate selected node**
- `Ctrl+C` / `Cmd+C` - **Copy selected node**
- `Ctrl+A` / `Cmd+A` - **Select all nodes**

### Workflow Actions
- `Ctrl+Enter` / `Cmd+Enter` - **Execute workflow**

### Canvas Navigation
- `Mouse Wheel` - **Zoom in/out**
- `Space + Drag` - **Pan canvas**
- `Shift + Click` - **Multi-select nodes**

---

## Best Practices

### Workflow Design

1. **Keep It Simple**: Start with simple workflows, add complexity gradually
2. **Modular Design**: Break complex workflows into smaller, reusable pieces
3. **Clear Naming**: Use descriptive labels for nodes
4. **Document Your Work**: Add descriptions to nodes
5. **Test Thoroughly**: Test all branches and edge cases

### Performance

1. **Minimize Delays**: Use delays strategically, not excessively
2. **Batch Operations**: Group similar operations together
3. **Limit Nesting**: Avoid deeply nested conditions
4. **Cache Results**: Store results in variables to avoid duplicate API calls
5. **Monitor Execution**: Regularly check execution times

### Multi-Channel Best Practices

1. **Customer Preference**: Respect customer channel preferences
2. **Time Zones**: Consider time zones for messaging
3. **Opt-out Management**: Always check opt-out status
4. **Escalation Path**: Define clear escalation path through channels
5. **Template Compliance**: Use approved templates for WhatsApp

### Security

1. **Sensitive Data**: Never log sensitive customer data
2. **API Keys**: Use environment variables for API keys
3. **Access Control**: Limit workflow editing to authorized users
4. **Audit Trail**: Enable execution history for compliance
5. **Data Retention**: Configure appropriate data retention periods

### Maintenance

1. **Regular Reviews**: Review and update workflows monthly
2. **Archive Old Workflows**: Deactivate unused workflows
3. **Version Control**: Document major changes
4. **Team Communication**: Share workflow updates with team
5. **Error Monitoring**: Set up alerts for workflow failures

---

## Advanced Topics

### Custom Integrations

Connect to external services using HTTP Request nodes:

```json
{
  "url": "https://api.example.com/endpoint",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer {{api.token}}",
    "Content-Type": "application/json"
  },
  "body": {
    "customer_id": "{{customer.id}}",
    "event": "workflow_executed"
  }
}
```

### Complex Conditions

Use JSON for complex conditional logic:

```json
[
  {
    "field": "ticket.priority",
    "operator": "equals",
    "value": "urgent",
    "output": "high-priority"
  },
  {
    "field": "customer.segment",
    "operator": "in",
    "value": ["VIP", "Enterprise"],
    "output": "vip-path"
  },
  {
    "field": "ticket.age",
    "operator": "greater_than",
    "value": 86400000,
    "output": "overdue"
  }
]
```

### AI Configuration

Fine-tune AI nodes for better results:

**Analysis Types**:
- `intent_classification` - Understand what customer wants
- `sentiment_analysis` - Detect emotional tone
- `urgency_detection` - Assess time sensitivity
- `topic_extraction` - Identify main topics

**Output Routing**:
Configure custom output paths based on AI results:
- Positive sentiment → Route A
- Negative sentiment → Route B
- Neutral → Route C

---

## Getting Help

### Resources

- **Template Documentation**: Each template includes detailed documentation
- **Node Help**: Hover over nodes in palette for descriptions
- **Field Tooltips**: Hover over configuration fields for help text
- **Example Workflows**: Browse templates for examples

### Support

- **Technical Issues**: Contact support team
- **Feature Requests**: Submit via feedback form
- **Best Practices**: Consult with customer success team
- **Training**: Schedule workflow builder training session

---

## Glossary

- **Node**: A single step or action in a workflow
- **Edge/Connection**: A link between nodes defining execution flow
- **Trigger**: The starting point of a workflow
- **Canvas**: The visual workspace for building workflows
- **Inspector**: The configuration panel for selected nodes
- **Palette**: The library of available nodes
- **Execution**: A single run of a workflow
- **Template**: A pre-built workflow pattern
- **Variable**: Dynamic data used in workflows
- **Condition**: A decision point that routes execution
- **Handle**: The connection point on a node

---

## What's Next?

Now that you understand the basics:

1. **Explore Templates**: Try customizing a pre-built template
2. **Build Simple Workflows**: Start with basic ticket routing
3. **Add Complexity**: Gradually add AI and multi-channel features
4. **Monitor Performance**: Track workflow execution and optimize
5. **Share Knowledge**: Help teammates learn the workflow builder

Happy Workflow Building! 🚀

