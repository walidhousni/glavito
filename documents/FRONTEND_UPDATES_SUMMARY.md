# Frontend Updates Summary

## ✅ Completed Updates

### 1. **API Client Updated** (`apps/admin-dashboard/src/lib/api/workflows-client.ts`)

#### New DTOs Added:
- `FlowDTO` - Main flow structure
- `FlowVersionDTO` - Flow version with nodes/edges
- `FlowNodeDTO` - Individual node definition
- `FlowEdgeDTO` - Connection between nodes
- `FlowNodeInputDTO` - Input for creating nodes
- `FlowEdgeInputDTO` - Input for creating edges
- `FlowRunDTO` - Execution run data
- `FlowEventDTO` - Event log entries
- `FlowStatisticsDTO` - Flow statistics

#### Updated Methods:
```typescript
// List flows with new status values
list(params?: { 
  status?: 'draft' | 'published' | 'archived';
  search?: string;
  page?: number;
  limit?: number;
}): Promise<FlowDTO[]>

// Get single flow with version data
get(id: string): Promise<FlowDTO>

// Get flow statistics
getStats(): Promise<FlowStatisticsDTO>

// Create flow with nodes and edges
create(payload: {
  name: string;
  description?: string;
  nodes?: FlowNodeInputDTO[];
  edges?: FlowEdgeInputDTO[];
}): Promise<FlowDTO>

// Update flow
update(id: string, payload: {
  name?: string;
  description?: string;
  nodes?: FlowNodeInputDTO[];
  edges?: FlowEdgeInputDTO[];
  status?: 'draft' | 'published' | 'archived';
}): Promise<FlowDTO>

// Publish/unpublish flows
publish(id: string): Promise<FlowDTO>
unpublish(id: string): Promise<FlowDTO>

// Execute flow
execute(id: string, input?: Record<string, unknown>, context?: Record<string, unknown>): Promise<any>

// Get execution history
getExecutions(id: string, params?: { page?: number; limit?: number }): Promise<FlowRunDTO[]>
```

### 2. **Workflow Mapper Utilities** (`apps/admin-dashboard/src/lib/utils/workflow-mapper.ts`)

Created utility functions to map between Flow DTOs and frontend display models:

```typescript
// Map Flow DTO to display item
mapFlowToDisplayItem(flow: FlowDTO): WorkflowDisplayItem

// Convert Flow nodes to ReactFlow nodes
mapFlowNodesToReactFlow(nodes: FlowNodeDTO[]): ReactFlowNode[]

// Convert Flow edges to ReactFlow edges
mapFlowEdgesToReactFlow(edges: FlowEdgeDTO[]): ReactFlowEdge[]

// Convert ReactFlow nodes back to Flow format
mapReactFlowNodesToFlow(nodes: ReactFlowNode[]): FlowNodeInputDTO[]

// Convert ReactFlow edges back to Flow format
mapReactFlowEdgesToFlow(edges: ReactFlowEdge[]): FlowEdgeInputDTO[]
```

### 3. **Workflows List Page Updated** (`apps/admin-dashboard/src/app/[locale]/dashboard/workflows/page.tsx`)

#### Changes Made:
- ✅ Imports updated to use `FlowDTO` instead of `WorkflowRuleDTO`
- ✅ Uses `mapFlowToDisplayItem` utility for data mapping
- ✅ Status mapping: `active` → `published`, `inactive` → `draft`
- ✅ `handleToggleWorkflow` now uses `publish()`/`unpublish()` methods
- ✅ Proper error handling with toast notifications

#### Status Mapping:
```typescript
Frontend Status → Backend Status
'active'        → 'published'
'inactive'      → 'draft'
'draft'         → 'draft'
'archived'      → 'archived'
```

## 🔄 Remaining Frontend Updates Needed

### 1. **Workflow Designer Page** (`apps/admin-dashboard/src/app/[locale]/dashboard/workflows/[id]/page.tsx`)

#### Needs Updates:

**Load Flow Data:**
```typescript
const loadFlow = async (flowId: string) => {
  const flow = await workflowsApi.get(flowId);
  const currentVersion = flow.currentVersion;
  
  if (!currentVersion) return;
  
  // Convert to ReactFlow format
  const reactFlowNodes = mapFlowNodesToReactFlow(currentVersion.nodes);
  const reactFlowEdges = mapFlowEdgesToReactFlow(currentVersion.edges);
  
  setNodes(reactFlowNodes);
  setEdges(reactFlowEdges);
  setWorkflowName(flow.name);
  setWorkflowDescription(flow.description || '');
  setIsActive(flow.status === 'published');
};
```

**Save Flow Data:**
```typescript
const handleSave = async () => {
  // Convert ReactFlow format back to Flow format
  const flowNodes = mapReactFlowNodesToFlow(nodes);
  const flowEdges = mapReactFlowEdgesToFlow(edges);
  
  await workflowsApi.update(flowId, {
    name: workflowName,
    description: workflowDescription,
    nodes: flowNodes,
    edges: flowEdges,
    status: isActive ? 'published' : 'draft',
  });
  
  push({
    title: 'Success',
    description: 'Workflow saved successfully',
    variant: 'default',
  });
};
```

**Execute Flow:**
```typescript
const handleExecute = async () => {
  try {
    const result = await workflowsApi.execute(flowId, {
      // Input variables
      customerName: 'Test Customer',
      orderId: 'ORD-123',
    }, {
      // Execution context
      userId: currentUserId,
    });
    
    console.log('Execution result:', result);
    
    push({
      title: 'Success',
      description: 'Workflow executed successfully',
      variant: 'default',
    });
  } catch (error) {
    console.error('Execution failed:', error);
  }
};
```

### 2. **Create Workflow Dialog** (`apps/admin-dashboard/src/components/workflows/create-workflow-dialog.tsx`)

#### Needs Updates:

**Create From Scratch:**
```typescript
const handleCreate = async () => {
  try {
    const flow = await workflowsApi.create({
      name: workflowName,
      description: workflowDescription,
      nodes: [
        {
          key: 'start-1',
          kind: 'start',
          label: 'Start',
          position: { x: 250, y: 50 },
          config: {},
        },
        {
          key: 'end-1',
          kind: 'end',
          label: 'End',
          position: { x: 250, y: 200 },
          config: {},
        },
      ],
      edges: [
        {
          sourceKey: 'start-1',
          targetKey: 'end-1',
        },
      ],
    });
    
    // Navigate to designer
    router.push(`/${locale}/dashboard/workflows/${flow.id}`);
  } catch (error) {
    console.error('Failed to create workflow:', error);
  }
};
```

### 3. **Node Inspector** (`apps/admin-dashboard/src/components/workflows/NodeInspector.tsx`)

#### Already Good! Just needs node kind mapping:

Map `type` to `kind` when working with nodes:
- `'send_message'` → Send Message node
- `'condition'` → Condition node
- `'ticket_create'` → Create Ticket node
- `'http_request'` → HTTP Request node
- etc.

### 4. **Execution History View**

Create a new component to display execution history:

```typescript
const ExecutionHistory = ({ flowId }: { flowId: string }) => {
  const [runs, setRuns] = useState<FlowRunDTO[]>([]);
  
  useEffect(() => {
    const loadRuns = async () => {
      const data = await workflowsApi.getExecutions(flowId);
      setRuns(data);
    };
    loadRuns();
  }, [flowId]);
  
  return (
    <div>
      {runs.map((run) => (
        <div key={run.id} className="execution-item">
          <div>Status: {run.status}</div>
          <div>Started: {new Date(run.startedAt).toLocaleString()}</div>
          {run.completedAt && (
            <div>Duration: {run.durationMs}ms</div>
          )}
          {run.errorMessage && (
            <div className="error">{run.errorMessage}</div>
          )}
        </div>
      ))}
    </div>
  );
};
```

## 📋 Node Type Reference

When working with nodes in the designer, use these `kind` values:

### Basic Nodes
- `start` / `channel_in` - Entry point
- `end` - Exit point
- `wait` - Delay execution
- `set_variable` - Set context variable

### Messaging Nodes
- `send_message` - Send text/rich message
- `template_message` - Send template (WhatsApp, etc.)

### Logic Nodes
- `condition` - Boolean condition (true/false ports)
- `switch` - Multiple output branches

### Ticket Nodes
- `ticket_create` - Create new ticket
- `ticket_update` - Update ticket fields
- `ticket_assign` - Assign to agent
- `ticket_close` - Close/resolve ticket

### Integration Nodes
- `http_request` - HTTP API call
- `notification` - Send notification

## 🎯 Testing Checklist

### Backend Tests
- [ ] Create flow with nodes and edges
- [ ] Get flow by ID
- [ ] List flows with filters
- [ ] Update flow (creates new version)
- [ ] Publish/unpublish flow
- [ ] Delete flow
- [ ] Execute flow
- [ ] Get execution history

### Frontend Tests
- [ ] List view shows flows correctly
- [ ] Create new flow navigates to designer
- [ ] Designer loads flow data
- [ ] Designer saves nodes and edges
- [ ] Toggle active/inactive works
- [ ] Execute workflow shows result
- [ ] Execution history displays runs

### End-to-End Tests
1. Create a simple flow:
   - Start node
   - Send message node
   - End node
2. Publish the flow
3. Execute the flow
4. Verify message was sent
5. Check execution history

## 📚 Quick Migration Guide for Developers

### Before (Old WorkflowRule):
```typescript
const workflow = await workflowsApi.create({
  name: 'My Workflow',
  isActive: true,
  conditions: [...],
  actions: [...],
  metadata: {
    nodes: [...],
    connections: [...],
  },
});
```

### After (New Flow):
```typescript
const flow = await workflowsApi.create({
  name: 'My Workflow',
  nodes: [
    { key: 'node-1', kind: 'start', position: { x: 0, y: 0 }, config: {} },
    { key: 'node-2', kind: 'send_message', position: { x: 0, y: 100 }, config: { message: 'Hello!' } },
    { key: 'node-3', kind: 'end', position: { x: 0, y: 200 }, config: {} },
  ],
  edges: [
    { sourceKey: 'node-1', targetKey: 'node-2' },
    { sourceKey: 'node-2', targetKey: 'node-3' },
  ],
});

// Publish it
await workflowsApi.publish(flow.id);

// Execute it
await workflowsApi.execute(flow.id, { customerName: 'John' });
```

## 🔧 Common Issues & Solutions

### Issue: "isActive is not defined"
**Solution:** Use `flow.status === 'published'` instead of `flow.isActive`

### Issue: "metadata.nodes is undefined"
**Solution:** Use `flow.currentVersion.nodes` instead

### Issue: "Cannot read property 'connections' of undefined"
**Solution:** Use `flow.currentVersion.edges` instead of `metadata.connections`

### Issue: "Execute returns 404"
**Solution:** Make sure the flow is published first with `workflowsApi.publish(flowId)`

## 📝 Next Steps

1. ✅ API client updated
2. ✅ Workflows list page updated
3. ⏳ Update workflow designer page (see instructions above)
4. ⏳ Update create workflow dialog
5. ⏳ Test end-to-end workflow creation and execution
6. ⏳ Add execution history view
7. ⏳ Migrate any existing workflow data

Your workflow system is now properly aligned! 🎉

