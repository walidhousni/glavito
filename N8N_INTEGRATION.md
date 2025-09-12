# n8n Integration for Glavito Ticketing System

## Overview

Glavito integrates with n8n to provide powerful workflow automation capabilities for your ticketing system. This integration allows you to create visual workflows that automate ticket management, customer communications, and business processes.

## 🚀 Quick Start

### 1. Setup n8n

Run the setup script to configure n8n:

```bash
node scripts/setup-n8n.js
```

Or manually start the services:

```bash
docker-compose up -d postgres n8n
```

### 2. Configure API Access

1. Open n8n at http://localhost:5678
2. Login with:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Go to **Settings > API Keys**
4. Create a new API key
5. Update your `.env` file:
   ```env
   N8N_API_KEY=your-generated-api-key
   ```

### 3. Start Your Application

```bash
docker-compose up -d
```

## 🎯 Available Workflow Templates

Glavito comes with pre-built workflow templates:

### 1. Auto-assign Tickets
- **Purpose**: Automatically classify and assign tickets based on keywords
- **Triggers**: New ticket creation
- **Actions**: 
  - Analyze ticket content
  - Classify by category (billing, technical, general)
  - Assign to appropriate agent

### 2. Sentiment-based Escalation
- **Purpose**: Escalate tickets with negative sentiment
- **Triggers**: New message received
- **Actions**:
  - Analyze sentiment
  - Auto-escalate negative sentiment tickets
  - Notify managers

## 🔧 Creating Custom Workflows

### Using the AI Automation Service

```typescript
// Create a new workflow
const workflow = await aiAutomationService.createN8NWorkflow(tenantId, {
  name: 'Custom Ticket Workflow',
  description: 'My custom automation',
  nodes: [
    {
      id: 'trigger',
      type: 'n8n-nodes-base.webhook',
      name: 'Ticket Event',
      parameters: {
        path: 'ticket-event',
        httpMethod: 'POST'
      }
    },
    {
      id: 'action',
      type: 'n8n-nodes-base.httpRequest',
      name: 'Process Ticket',
      parameters: {
        url: 'http://api-gateway:3000/api/tickets/process',
        method: 'POST'
      }
    }
  ],
  connections: {
    'Ticket Event': {
      main: [['Process Ticket']]
    }
  }
});

// Activate the workflow
const result = await aiAutomationService.activateN8NWorkflow(tenantId, workflow.id);
```

### Available Webhook Endpoints

Your Glavito system exposes these webhook endpoints for n8n:

- `POST /api/webhooks/ticket-created` - New ticket events
- `POST /api/webhooks/message-received` - New message events
- `POST /api/webhooks/ticket-updated` - Ticket status changes
- `POST /api/webhooks/sla-warning` - SLA deadline warnings

## 📊 Workflow Examples

### Example 1: Auto-Response for Common Issues

```json
{
  "name": "Auto-Response Workflow",
  "nodes": [
    {
      "id": "webhook",
      "type": "n8n-nodes-base.webhook",
      "name": "New Ticket",
      "parameters": {
        "path": "new-ticket",
        "httpMethod": "POST"
      }
    },
    {
      "id": "check-keywords",
      "type": "n8n-nodes-base.function",
      "name": "Check Keywords",
      "parameters": {
        "functionCode": "const ticket = items[0].json; if (ticket.subject.toLowerCase().includes('password reset')) { return [{ json: { ...ticket, autoResponse: true } }]; } return [{ json: ticket }];"
      }
    },
    {
      "id": "send-response",
      "type": "n8n-nodes-base.httpRequest",
      "name": "Send Auto-Response",
      "parameters": {
        "url": "http://api-gateway:3000/api/tickets/{{$json.id}}/respond",
        "method": "POST",
        "body": {
          "message": "Thank you for contacting us about password reset. Please check your email for reset instructions."
        }
      }
    }
  ]
}
```

### Example 2: SLA Monitoring

```json
{
  "name": "SLA Monitor",
  "nodes": [
    {
      "id": "schedule",
      "type": "n8n-nodes-base.cron",
      "name": "Every 15 Minutes",
      "parameters": {
        "cronExpression": "*/15 * * * *"
      }
    },
    {
      "id": "check-sla",
      "type": "n8n-nodes-base.httpRequest",
      "name": "Check SLA Status",
      "parameters": {
        "url": "http://api-gateway:3000/api/tickets/sla-check",
        "method": "GET"
      }
    },
    {
      "id": "escalate",
      "type": "n8n-nodes-base.httpRequest",
      "name": "Escalate Tickets",
      "parameters": {
        "url": "http://api-gateway:3000/api/tickets/escalate",
        "method": "POST"
      }
    }
  ]
}
```

## 🔗 Integration Points

### Database Models

Workflow automation data is stored in the `WorkflowAutomation` model:

```prisma
model WorkflowAutomation {
  id             String   @id @default(cuid())
  tenantId       String
  name           String
  description    String?
  workflowType   String   // 'n8n', 'zapier', 'custom'
  workflowId     String   // External workflow ID
  triggers       Json     // Trigger configuration
  actions        Json     // Action configuration
  conditions     Json     // Condition rules
  isActive       Boolean  @default(false)
  executionCount Int      @default(0)
  lastExecuted   DateTime?
  errorCount     Int      @default(0)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  
  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

### API Endpoints

- `POST /api/automation/workflows` - Create workflow
- `GET /api/automation/workflows` - List workflows
- `PUT /api/automation/workflows/:id/activate` - Activate workflow
- `PUT /api/automation/workflows/:id/deactivate` - Deactivate workflow
- `DELETE /api/automation/workflows/:id` - Delete workflow

## 🛠️ Advanced Configuration

### Custom Node Development

You can create custom n8n nodes for Glavito-specific operations:

1. Create a new node in your n8n instance
2. Use the Glavito API endpoints
3. Handle authentication with JWT tokens
4. Process ticket data and events

### Environment Variables

```env
# n8n Configuration
N8N_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key

# n8n Database (uses same PostgreSQL instance)
DB_TYPE=postgresdb
DB_POSTGRESDB_HOST=localhost
DB_POSTGRESDB_PORT=5432
DB_POSTGRESDB_DATABASE=n8n
DB_POSTGRESDB_USER=walid
DB_POSTGRESDB_PASSWORD=elder
```

## 🔒 Security Considerations

1. **API Key Security**: Store n8n API keys securely
2. **Webhook Authentication**: Use webhook tokens for security
3. **Network Security**: Run n8n in isolated network
4. **Access Control**: Limit n8n access to authorized users
5. **Data Privacy**: Be careful with sensitive ticket data in workflows

## 📈 Monitoring and Debugging

### Workflow Execution Logs

Monitor workflow executions through:

1. n8n UI at http://localhost:5678
2. Glavito logs in the API gateway
3. Database `WorkflowAutomation` records

### Common Issues

1. **Connection Errors**: Check n8n service status
2. **Authentication Failures**: Verify API key configuration
3. **Webhook Timeouts**: Increase timeout settings
4. **Database Errors**: Check PostgreSQL connection

## 🚀 Production Deployment

### Docker Compose Production

```yaml
n8n:
  image: n8nio/n8n:latest
  environment:
    - N8N_BASIC_AUTH_ACTIVE=false  # Use proper authentication
    - N8N_ENCRYPTION_KEY=your-encryption-key
    - N8N_USER_MANAGEMENT_DISABLED=false
  volumes:
    - n8n_data:/home/node/.n8n
  networks:
    - glavito-network
```

### Kubernetes Deployment

Refer to the Kubernetes manifests in `infrastructure/kubernetes/n8n/`

## 📚 Resources

- [n8n Documentation](https://docs.n8n.io/)
- [n8n Community Workflows](https://n8n.io/workflows/)
- [Glavito API Documentation](./API_DOCUMENTATION.md)
- [Webhook Integration Guide](./WEBHOOKS.md)

## 🤝 Support

For n8n integration support:

1. Check the logs in both Glavito and n8n
2. Review the workflow execution history
3. Test webhooks manually
4. Consult the n8n community forums

---

**Happy Automating! 🎉**