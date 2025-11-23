# Workflow Engine

A comprehensive workflow automation engine for the Glavito ticketing system that provides rule-based automation, N8N integration, and real-time execution monitoring.

## Features

- **Workflow Rule Management**: Create, update, delete, and manage workflow rules
- **Multiple Trigger Types**: Event-based, schedule-based, webhook, and manual triggers
- **Flexible Actions**: Support for ticket assignment, field updates, notifications, and custom actions
- **N8N Integration**: Seamless integration with N8N for complex workflow orchestration
- **Real-time Monitoring**: Track workflow executions with detailed logging and metrics
- **Validation**: Comprehensive validation for workflow rules, triggers, and actions
- **Audit Trail**: Complete audit logging for all workflow operations
- **Multi-tenant Support**: Full tenant isolation and scoping

## Architecture

### Core Components

1. **WorkflowEngineService**: Main service for workflow rule CRUD operations
2. **WorkflowExecutionService**: Handles workflow execution and monitoring
3. **N8NSyncService**: Manages synchronization with N8N workflows
4. **N8NClient**: HTTP client for N8N API communication

### Database Models

- `WorkflowRule`: Stores workflow definitions, triggers, actions, and conditions
- `WorkflowExecution`: Tracks individual workflow executions and their status
- `AuditLog`: Maintains audit trail for all workflow operations

## Usage

### Creating a Workflow Rule

```typescript
import { WorkflowEngineService, TriggerType, ActionType } from '@glavito/shared-workflow';

const workflowRule = await workflowEngineService.createWorkflowRule({
  tenantId: 'tenant-123',
  name: 'Auto-assign High Priority Tickets',
  description: 'Automatically assign high priority tickets to senior agents',
  type: 'automation',
  priority: 1,
  isActive: true,
  triggers: [
    {
      id: 'trigger-1',
      type: TriggerType.EVENT,
      name: 'Ticket Created',
      enabled: true,
      configuration: {
        eventType: 'ticket.created'
      }
    }
  ],
  conditions: [
    {
      field: 'ticket.priority',
      operator: 'equals',
      value: 'high'
    }
  ],
  actions: [
    {
      id: 'action-1',
      type: ActionType.ASSIGN_TICKET,
      name: 'Assign to Senior Agent',
      enabled: true,
      configuration: {
        agentId: 'senior-agent-1'
      }
    }
  ]
});
```

### Executing a Workflow

```typescript
const execution = await workflowEngineService.executeWorkflowRule(
  'workflow-id',
  {
    data: { ticketId: 'ticket-123', priority: 'high' },
    context: { tenantId: 'tenant-123', userId: 'user-123' }
  },
  'user-123',
  'tenant-123'
);
```

### Listing Workflows

```typescript
const result = await workflowEngineService.listWorkflowRules(
  {
    tenantId: 'tenant-123',
    type: 'automation',
    isActive: true,
    search: 'high priority'
  },
  1, // page
  20 // limit
);
```

## Trigger Types

### Event Triggers
Triggered by system events like ticket creation, updates, or status changes.

```typescript
{
  type: TriggerType.EVENT,
  configuration: {
    eventType: 'ticket.created',
    conditions: [
      { field: 'priority', operator: 'equals', value: 'urgent' }
    ]
  }
}
```

### Schedule Triggers
Triggered based on cron-like schedules.

```typescript
{
  type: TriggerType.SCHEDULE,
  configuration: {
    schedule: '0 9 * * 1-5', // Every weekday at 9 AM
    timezone: 'UTC'
  }
}
```

### Webhook Triggers
Triggered by external webhook calls.

```typescript
{
  type: TriggerType.WEBHOOK,
  configuration: {
    path: '/webhook/escalation',
    method: 'POST',
    authentication: 'bearer'
  }
}
```

## Action Types

### Ticket Assignment
```typescript
{
  type: ActionType.ASSIGN_TICKET,
  configuration: {
    agentId: 'agent-123',
    // or
    teamId: 'team-456'
  }
}
```

### Field Updates
```typescript
{
  type: ActionType.UPDATE_FIELD,
  configuration: {
    field: 'priority',
    value: 'high'
  }
}
```

### Email Notifications
```typescript
{
  type: ActionType.SEND_EMAIL,
  configuration: {
    to: 'manager@company.com',
    template: 'escalation-notification',
    variables: {
      ticketId: '{{ticket.id}}',
      priority: '{{ticket.priority}}'
    }
  }
}
```

### API Calls
```typescript
{
  type: ActionType.API_CALL,
  configuration: {
    url: 'https://api.external-system.com/notify',
    method: 'POST',
    headers: {
      'Authorization': 'Bearer {{secrets.api_token}}'
    },
    body: {
      ticketId: '{{ticket.id}}',
      message: 'Ticket escalated'
    }
  }
}
```

## Conditions

Conditions use a flexible operator system:

```typescript
{
  field: 'ticket.priority',
  operator: 'equals',
  value: 'high'
}

{
  field: 'customer.tags',
  operator: 'contains',
  value: 'vip'
}

{
  field: 'ticket.createdAt',
  operator: 'greater_than',
  value: '2024-01-01T00:00:00Z'
}

// Complex conditions with logic
{
  logic: 'AND',
  conditions: [
    { field: 'ticket.priority', operator: 'equals', value: 'high' },
    { field: 'ticket.status', operator: 'equals', value: 'open' }
  ]
}
```

## N8N Integration

The workflow engine integrates seamlessly with N8N for complex workflow orchestration:

1. **Automatic Sync**: Workflows with nodes are automatically synced to N8N
2. **Execution Monitoring**: N8N executions are monitored and status is updated in real-time
3. **Bidirectional Sync**: Changes in N8N can be synced back to the database
4. **Fallback Execution**: Internal actions are executed even if N8N is unavailable

## Error Handling

The workflow engine includes comprehensive error handling:

- **Validation Errors**: Invalid workflow configurations are caught early
- **Execution Errors**: Failed actions can be configured to stop, continue, or retry
- **N8N Errors**: N8N failures fall back to internal action execution
- **Database Errors**: Transactional operations ensure data consistency

## Monitoring and Analytics

### Execution Tracking
- Real-time execution status updates
- Detailed execution logs and metrics
- Performance monitoring and optimization suggestions

### Statistics
```typescript
const stats = await workflowEngineService.getWorkflowStatistics('tenant-123');
// Returns: totalWorkflows, activeWorkflows, totalExecutions, successRate, etc.
```

### Audit Trail
All workflow operations are logged for compliance and debugging:
- Workflow creation, updates, and deletions
- Execution attempts and results
- Configuration changes and user actions

## Testing

The workflow engine includes comprehensive test coverage:

- **Unit Tests**: Test individual service methods and validation logic
- **Integration Tests**: Test complete workflow flows with database interactions
- **Performance Tests**: Ensure workflows execute within acceptable time limits

Run tests:
```bash
npm test libs/shared/workflow
```

## Configuration

### Environment Variables

```env
# N8N Integration
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key
N8N_TIMEOUT=30000
N8N_RETRY_ATTEMPTS=3

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/glavito

# Event Publishing
KAFKA_BROKERS=localhost:9092
```

### Module Configuration

```typescript
import { WorkflowModule } from '@glavito/shared-workflow';

@Module({
  imports: [
    WorkflowModule.forRoot({
      n8n: {
        baseUrl: 'http://localhost:5678',
        apiKey: 'your-api-key',
        timeout: 30000,
        retryAttempts: 3
      }
    })
  ]
})
export class AppModule {}
```

## API Endpoints

The workflow engine exposes REST API endpoints through the WorkflowsController:

- `POST /workflows` - Create workflow
- `GET /workflows` - List workflows
- `GET /workflows/:id` - Get workflow
- `PUT /workflows/:id` - Update workflow
- `DELETE /workflows/:id` - Delete workflow
- `POST /workflows/:id/execute` - Execute workflow
- `GET /workflows/:id/executions` - Get executions
- `GET /workflows/stats` - Get statistics
- `GET /workflows/templates` - Get templates

## Best Practices

1. **Keep Workflows Simple**: Break complex logic into multiple smaller workflows
2. **Use Descriptive Names**: Make workflow purposes clear from their names
3. **Test Thoroughly**: Always test workflows in a staging environment first
4. **Monitor Performance**: Keep track of execution times and success rates
5. **Handle Errors Gracefully**: Configure appropriate error handling for each action
6. **Use Conditions Wisely**: Avoid overly complex condition logic
7. **Document Workflows**: Add clear descriptions and comments to workflow rules

## Contributing

When contributing to the workflow engine:

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Consider backward compatibility for existing workflows
5. Test N8N integration thoroughly

## License

This workflow engine is part of the Glavito platform and is subject to the platform's licensing terms.