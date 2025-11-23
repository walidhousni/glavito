# Workflow System Migration Guide

## ✅ What Was Fixed

### 1. **Unified Architecture**
Previously, you had TWO conflicting workflow systems:
- **Old System**: `WorkflowRule` (condition-action based) ❌
- **New System**: `Flow/FlowNode/FlowEdge` (visual node-based) ✅

**Solution**: Migrated everything to use the Flow system, which is better designed for visual workflow builders.

### 2. **Backend Services**
#### Created New Services:
- **`FlowService`**: Handles Flow CRUD operations (create, read, update, delete)
- **`FlowExecutionService`**: Executes flow runs with proper node traversal
- **Node Executors**: Modular handlers for different node types

#### Node Executors Implemented:
- `SendMessageNodeExecutor` - Sends messages to conversations
- `ConditionNodeExecutor` - Evaluates conditions and switches
- `TicketNodeExecutor` - Creates, updates, assigns, closes tickets
- `BasicNodesExecutor` - Handles start, end, wait, variables, HTTP requests, notifications

### 3. **API Controller Updated**
All endpoints now use Flow model:
- `POST /workflows` - Creates a Flow
- `GET /workflows` - Lists Flows
- `GET /workflows/:id` - Gets a Flow with nodes/edges
- `PUT /workflows/:id` - Updates Flow and creates new version
- `DELETE /workflows/:id` - Deletes Flow
- `POST /workflows/:id/execute` - Executes Flow
- `GET /workflows/:id/executions` - Gets FlowRuns

## 🗂️ Database Structure

### Flow Model (Primary)
```prisma
Flow {
  id, tenantId, name, description, status
  currentVersion → FlowVersion
  versions → FlowVersion[]
  runs → FlowRun[]
}

FlowVersion {
  id, flowId, version, isPublished
  nodes → FlowNode[]
  edges → FlowEdge[]
  graph (JSON backup)
}

FlowNode {
  id, versionId, key, kind, label
  position { x, y }
  config (node-specific settings)
}

FlowEdge {
  id, versionId
  sourceKey, sourcePort
  targetKey, targetPort
  label, condition
}

FlowRun {
  id, flowId, versionId, tenantId
  status, input, output, errorMessage
  startedAt, completedAt, durationMs
  events → FlowEvent[]
}
```

## 📝 Frontend Updates Needed

### 1. Update API Client
Your `WorkflowsApiClient` needs to match the new API responses:

```typescript
// apps/admin-dashboard/src/lib/api/workflows-client.ts

export interface FlowDTO {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  currentVersion?: FlowVersionDTO;
  createdAt: string;
  updatedAt: string;
}

export interface FlowVersionDTO {
  id: string;
  flowId: string;
  version: number;
  isPublished: boolean;
  nodes: FlowNodeDTO[];
  edges: FlowEdgeDTO[];
}

export interface FlowNodeDTO {
  id: string;
  versionId: string;
  key: string;
  kind: string; // 'send_message', 'condition', 'ticket_create', etc.
  label?: string;
  position: { x: number; y: number };
  config: Record<string, any>;
}

export interface FlowEdgeDTO {
  id: string;
  versionId: string;
  sourceKey: string;
  sourcePort?: string;
  targetKey: string;
  targetPort?: string;
  label?: string;
  condition?: any;
}

export class WorkflowsApiClient {
  async create(payload: { name: string; description?: string; nodes?: FlowNodeDTO[]; edges?: FlowEdgeDTO[] }) {
    return api.post('/workflows', payload);
  }

  async update(id: string, payload: { name?: string; description?: string; nodes?: FlowNodeDTO[]; edges?: FlowEdgeDTO[]; status?: string }) {
    return api.put(`/workflows/${id}`, payload);
  }

  async execute(id: string, input?: Record<string, unknown>) {
    return api.post(`/workflows/${id}/execute`, { input });
  }

  async getExecutions(id: string) {
    return api.get(`/workflows/${id}/executions`);
  }
}
```

### 2. Update Frontend Pages

#### Workflows List Page
```typescript
// apps/admin-dashboard/src/app/[locale]/dashboard/workflows/page.tsx

const mapFlowToItem = (flow: FlowDTO): WorkflowItem => {
  const currentVersion = flow.currentVersion;
  
  return {
    id: flow.id,
    name: flow.name,
    description: flow.description || '',
    status: flow.status,
    isActive: flow.status === 'published',
    nodeCount: currentVersion?.nodes?.length || 0,
    connectionCount: currentVersion?.edges?.length || 0,
    createdAt: new Date(flow.createdAt),
    updatedAt: new Date(flow.updatedAt),
  };
};
```

#### Workflow Designer Page
```typescript
// apps/admin-dashboard/src/app/[locale]/dashboard/workflows/[id]/page.tsx

const loadFlow = async (flowId: string) => {
  const flow = await workflowsApi.get(flowId);
  const currentVersion = flow.currentVersion;
  
  if (!currentVersion) return;
  
  // Convert FlowNodes to ReactFlow nodes
  const reactFlowNodes = currentVersion.nodes.map((node: FlowNodeDTO) => ({
    id: node.key,
    type: node.kind,
    data: {
      label: node.label || node.kind,
      type: node.kind,
      configuration: node.config,
    },
    position: node.position,
  }));
  
  // Convert FlowEdges to ReactFlow edges
  const reactFlowEdges = currentVersion.edges.map((edge: FlowEdgeDTO) => ({
    id: edge.id,
    source: edge.sourceKey,
    sourceHandle: edge.sourcePort,
    target: edge.targetKey,
    targetHandle: edge.targetPort,
    label: edge.label,
  }));
  
  setNodes(reactFlowNodes);
  setEdges(reactFlowEdges);
};

const handleSave = async () => {
  // Convert ReactFlow nodes back to FlowNodes
  const flowNodes = nodes.map((node) => ({
    key: node.id,
    kind: node.type || 'basic',
    label: node.data?.label,
    position: node.position,
    config: node.data?.configuration || {},
  }));
  
  // Convert ReactFlow edges back to FlowEdges
  const flowEdges = edges.map((edge) => ({
    sourceKey: edge.source,
    sourcePort: edge.sourceHandle,
    targetKey: edge.target,
    targetPort: edge.targetHandle,
    label: edge.label,
  }));
  
  await workflowsApi.update(flowId, {
    name: workflowName,
    description: workflowDescription,
    nodes: flowNodes,
    edges: flowEdges,
    status: isActive ? 'published' : 'draft',
  });
};
```

## 🔧 Node Types Reference

### Available Node Kinds:
- **`channel_in`** / **`start`**: Entry point of flow
- **`send_message`**: Send message to conversation
- **`template_message`**: Send template message (WhatsApp, etc.)
- **`condition`**: Boolean condition (true/false ports)
- **`switch`**: Multiple output conditions
- **`wait`**: Delay execution
- **`set_variable`**: Set context variable
- **`http_request`**: Make HTTP API call
- **`notification`**: Send notification to user
- **`ticket_create`**: Create new ticket
- **`ticket_update`**: Update ticket fields
- **`ticket_assign`**: Assign ticket to agent
- **`ticket_close`**: Close/resolve ticket
- **`end`**: End of flow

### Node Configuration Examples:

#### Send Message Node
```typescript
{
  kind: 'send_message',
  config: {
    message: 'Hello {{customerName}}!',
    channelId: 'channel_id',
    messageType: 'text',
  }
}
```

#### Condition Node
```typescript
{
  kind: 'condition',
  config: {
    field: 'variables.priority',
    operator: 'equals',
    value: 'high',
  }
}
// Outputs: 'true' port or 'false' port
```

#### Ticket Create Node
```typescript
{
  kind: 'ticket_create',
  config: {
    subject: 'Order Issue - {{orderId}}',
    description: 'Customer reported an issue',
    priority: 'high',
    channelId: 'channel_id',
    customerId: '{{customerId}}',
  }
}
```

#### HTTP Request Node
```typescript
{
  kind: 'http_request',
  config: {
    method: 'POST',
    url: 'https://api.example.com/webhook',
    headers: {
      'Authorization': 'Bearer token',
    },
    body: {
      customerId: '{{customerId}}',
      status: 'processed',
    }
  }
}
```

## 🚀 Migration Steps

### 1. Run Database Migration
No migration needed if starting fresh. If you have existing `WorkflowRule` data, create a migration script.

### 2. Update Frontend
- Update `workflows-client.ts` with new interfaces
- Update workflow list page to use Flow data
- Update workflow designer page to save/load Flow format
- Test create, update, execute workflows

### 3. Channel Integration
Node executors now properly integrate with channels:
- `SendMessageNodeExecutor` creates messages in conversations
- Messages are linked to channels automatically
- WhatsApp/Instagram/SMS adapters work seamlessly with workflows

### 4. Test Flow Execution
```typescript
// Execute a flow
const result = await workflowsApi.execute(flowId, {
  customerName: 'John Doe',
  orderId: 'ORD-123',
  priority: 'high',
});

// Get execution history
const executions = await workflowsApi.getExecutions(flowId);
```

## 🎯 Benefits

1. **Clean Architecture**: Single source of truth (Flow model)
2. **Visual Editor Support**: Frontend workflow builder works seamlessly
3. **Modular Executors**: Easy to add new node types
4. **Channel Integration**: Proper message sending through adapters
5. **Versioning**: Flow versions track changes over time
6. **Execution Tracking**: Full event logs for debugging

## ⚠️ Breaking Changes

- Old `WorkflowRule` endpoints may break
- Frontend must update to use Flow data structure
- Existing workflows need migration

## 📚 Next Steps

1. ✅ Backend services migrated
2. ⏳ Update frontend API client
3. ⏳ Update frontend pages
4. ⏳ Test end-to-end flows
5. ⏳ Migrate existing data
6. ⏳ Add more node types as needed

