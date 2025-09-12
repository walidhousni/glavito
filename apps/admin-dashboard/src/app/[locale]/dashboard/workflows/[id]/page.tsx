'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { NodePalette } from '@/components/workflows/NodePalette';
import { NodeInspector } from '@/components/workflows/NodeInspector';
import { workflowsApi, WorkflowRuleDTO } from '@/lib/api/workflows-client';
import { ReactFlow, Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState, Connection, Edge as FlowEdge, Node as FlowNode } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WebhooksManagerDialog } from '@/components/webhooks/WebhooksManager';

export default function WorkflowDesignerPage() {
  const t = useTranslations('workflows');
  const params = useParams<{ id?: string; locale?: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowRuleDTO | null>(null);
  const [metadataJson, setMetadataJson] = useState('');
  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const [executions, setExecutions] = useState<any[]>([]);
  const [execLoading, setExecLoading] = useState(false);
  const [selectedExec, setSelectedExec] = useState<any | null>(null);
  const [templates, setTemplates] = useState<any[]>([]);
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [webhooksOpen, setWebhooksOpen] = useState(false);
  const n8nId = (workflow as any)?.metadata?.n8nWorkflowId;

  const pollAfterExecute = async (workflowId: string) => {
    try {
      for (let i = 0; i < 10; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        await loadExecutions(workflowId);
      }
    } catch {
      // ignore
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const id = params?.id as string;
      if (!id) throw new Error('Missing workflow id');
      const res = await workflowsApi.get(id);
      const wf = (res as any)?.data as WorkflowRuleDTO;
      setWorkflow(wf);
      const meta = wf.metadata || {};
      setMetadataJson(JSON.stringify(meta, null, 2));
      // Convert workflow nodes to ReactFlow nodes
      const flowNodes = (meta.nodes || []).map((node: any) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: {
          label: node.name,
          ...node.configuration
        }
      }));
      setNodes(flowNodes as any);
      
      // Convert workflow connections to ReactFlow edges
      const flowEdges = (meta.connections || []).map((conn: any) => ({
        id: conn.id,
        source: conn.sourceNodeId,
        target: conn.targetNodeId,
        sourceHandle: conn.sourceOutput,
        targetHandle: conn.targetInput
      }));
      setEdges(flowEdges as any);
      
      // If no nodes exist, add some default nodes to help user get started
      if (!meta.nodes || meta.nodes.length === 0) {
        const defaultNodes = [
          {
            id: 'start-1',
            type: 'input',
            position: { x: 100, y: 100 },
            data: { label: 'Start' }
          },
          {
            id: 'process-1',
            type: 'default',
            position: { x: 300, y: 100 },
            data: { label: 'Process Ticket' }
          },
          {
            id: 'end-1',
            type: 'output',
            position: { x: 500, y: 100 },
            data: { label: 'End' }
          }
        ];
        setNodes(defaultNodes as any);
        
        const defaultEdges = [
          {
            id: 'e1-2',
            source: 'start-1',
            target: 'process-1'
          },
          {
            id: 'e2-3',
            source: 'process-1',
            target: 'end-1'
          }
        ];
        setEdges(defaultEdges as any);
      }
      await loadExecutions(id);
      setSelectedNodeId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load workflow');
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async (workflowId?: string) => {
    try {
      setExecLoading(true);
      const id = workflowId || (params?.id as string);
      if (!id) return;
      const res = await workflowsApi.executions(id, 20);
      const list = (res as any)?.data || [];
      setExecutions(list as any[]);
    } catch (e) {
      // keep silent; UI remains
    } finally {
      setExecLoading(false);
    }
  };

  const loadTemplates = async () => {
    try {
      const res = await workflowsApi.getTemplates();
      const raw: any = res as any;
      
      // Handle different response formats for templates
      let templatesData: any[] = [];
      if (Array.isArray(raw?.data)) {
        templatesData = raw.data as any[];
      } else if (Array.isArray(raw)) {
        templatesData = (raw as unknown as any[]);
      } else {
        // Use hardcoded templates as fallback
        templatesData = [
          {
            name: 'intelligent-ticket-routing',
            displayName: 'Intelligent Ticket Routing',
            description: 'Automatically route tickets based on AI analysis and customer profile',
            category: 'routing',
            nodeCount: 5,
            tags: ['ai', 'routing', 'automation']
          },
          {
            name: 'sla-monitoring',
            displayName: 'SLA Monitoring & Escalation',
            description: 'Monitor SLA compliance and automatically escalate at-risk tickets',
            category: 'sla',
            nodeCount: 4,
            tags: ['sla', 'escalation', 'monitoring']
          },
          {
            name: 'customer-onboarding',
            displayName: 'Customer Onboarding',
            description: 'Automated workflow for new customer onboarding with personalized communication',
            category: 'onboarding',
            nodeCount: 4,
            tags: ['onboarding', 'automation', 'customer-success']
          }
        ];
      }
      
      setTemplates(templatesData);
    } catch (e) {
      // Show hardcoded templates on error
      const sampleTemplates = [
        {
          name: 'intelligent-ticket-routing',
          displayName: 'Intelligent Ticket Routing',
          description: 'Automatically route tickets based on AI analysis and customer profile',
          category: 'routing',
          nodeCount: 5,
          tags: ['ai', 'routing', 'automation']
        },
        {
          name: 'sla-monitoring',
          displayName: 'SLA Monitoring & Escalation',
          description: 'Monitor SLA compliance and automatically escalate at-risk tickets',
          category: 'sla',
          nodeCount: 4,
          tags: ['sla', 'escalation', 'monitoring']
        },
        {
          name: 'customer-onboarding',
          displayName: 'Customer Onboarding',
          description: 'Automated workflow for new customer onboarding with personalized communication',
          category: 'onboarding',
          nodeCount: 4,
          tags: ['onboarding', 'automation', 'customer-success']
        }
      ];
      setTemplates(sampleTemplates);
    }
  };

  const applyTemplate = async (templateName: string) => {
    try {
      setLoading(true);
      const created = await workflowsApi.createFromTemplate(templateName, {});
      const newWf = (created as any)?.data ?? created;
      const newId = (newWf as any)?.id;
      if (newId) {
        const locale = (params as any)?.locale || 'en';
        router.push(`/${locale}/dashboard/workflows/${newId}`);
        setShowTemplates(false);
        return;
      }
      const template = getSampleTemplate(templateName);
      if (template && template.metadata) {
        const flowNodes = (template.metadata.nodes || []).map((node: any) => ({ id: node.id, type: node.type, position: node.position, data: { label: node.name, ...node.configuration } }));
        setNodes(flowNodes as any);
        const flowEdges = (template.metadata.connections || []).map((conn: any) => ({ id: conn.id, source: conn.sourceNodeId, target: conn.targetNodeId, sourceHandle: conn.sourceOutput, targetHandle: conn.targetInput }));
        setEdges(flowEdges as any);
        setMetadataJson(JSON.stringify(template.metadata, null, 2));
        setShowTemplates(false);
      } else {
        const simpleTemplate = getSimpleTemplate(templateName);
        setNodes(simpleTemplate.nodes as any);
        setEdges(simpleTemplate.edges as any);
        setMetadataJson(JSON.stringify(simpleTemplate.metadata, null, 2));
        setShowTemplates(false);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get sample template data
  const getSampleTemplate = (templateName: string) => {
    const templates: Record<string, any> = {
      'intelligent-ticket-routing': {
        name: 'intelligent-ticket-routing',
        displayName: 'Intelligent Ticket Routing',
        description: 'Automatically route tickets based on AI analysis and customer profile',
        category: 'routing',
        nodeCount: 5,
        tags: ['ai', 'routing', 'automation'],
        metadata: {
          category: 'routing',
          tags: ['ai', 'routing', 'automation'],
          version: '1.0',
          createdBy: 'template',
          status: 'active',
          nodes: [
            { id: 'start', type: 'input', name: 'Start', position: { x: 100, y: 100 }, configuration: {} },
            { id: 'ai-analysis', type: 'default', name: 'AI Analysis', position: { x: 300, y: 100 }, configuration: {} },
            { id: 'routing', type: 'default', name: 'Routing Decision', position: { x: 500, y: 100 }, configuration: {} },
            { id: 'assign', type: 'default', name: 'Assign Ticket', position: { x: 700, y: 100 }, configuration: {} },
            { id: 'end', type: 'output', name: 'End', position: { x: 900, y: 100 }, configuration: {} }
          ],
          connections: [
            { id: 'e1', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'ai-analysis', targetInput: 'default' },
            { id: 'e2', sourceNodeId: 'ai-analysis', sourceOutput: 'default', targetNodeId: 'routing', targetInput: 'default' },
            { id: 'e3', sourceNodeId: 'routing', sourceOutput: 'default', targetNodeId: 'assign', targetInput: 'default' },
            { id: 'e4', sourceNodeId: 'assign', sourceOutput: 'default', targetNodeId: 'end', targetInput: 'default' }
          ]
        }
      },
      'sla-monitoring': {
        name: 'sla-monitoring',
        displayName: 'SLA Monitoring & Escalation',
        description: 'Monitor SLA compliance and automatically escalate at-risk tickets',
        category: 'sla',
        nodeCount: 4,
        tags: ['sla', 'escalation', 'monitoring'],
        metadata: {
          category: 'sla',
          tags: ['sla', 'escalation', 'monitoring'],
          version: '1.0',
          createdBy: 'template',
          status: 'active',
          nodes: [
            { id: 'start', type: 'input', name: 'Start', position: { x: 100, y: 100 }, configuration: {} },
            { id: 'check-sla', type: 'default', name: 'Check SLA', position: { x: 300, y: 100 }, configuration: {} },
            { id: 'escalate', type: 'default', name: 'Escalate if Needed', position: { x: 500, y: 100 }, configuration: {} },
            { id: 'end', type: 'output', name: 'End', position: { x: 700, y: 100 }, configuration: {} }
          ],
          connections: [
            { id: 'e1', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'check-sla', targetInput: 'default' },
            { id: 'e2', sourceNodeId: 'check-sla', sourceOutput: 'default', targetNodeId: 'escalate', targetInput: 'default' },
            { id: 'e3', sourceNodeId: 'escalate', sourceOutput: 'default', targetNodeId: 'end', targetInput: 'default' }
          ]
        }
      },
      'customer-onboarding': {
        name: 'customer-onboarding',
        displayName: 'Customer Onboarding',
        description: 'Automated workflow for new customer onboarding with personalized communication',
        category: 'onboarding',
        nodeCount: 4,
        tags: ['onboarding', 'automation', 'customer-success'],
        metadata: {
          category: 'onboarding',
          tags: ['onboarding', 'automation', 'customer-success'],
          version: '1.0',
          createdBy: 'template',
          status: 'active',
          nodes: [
            { id: 'start', type: 'input', name: 'Start', position: { x: 100, y: 100 }, configuration: {} },
            { id: 'welcome', type: 'default', name: 'Send Welcome', position: { x: 300, y: 100 }, configuration: {} },
            { id: 'follow-up', type: 'default', name: 'Follow Up', position: { x: 500, y: 100 }, configuration: {} },
            { id: 'end', type: 'output', name: 'End', position: { x: 700, y: 100 }, configuration: {} }
          ],
          connections: [
            { id: 'e1', sourceNodeId: 'start', sourceOutput: 'default', targetNodeId: 'welcome', targetInput: 'default' },
            { id: 'e2', sourceNodeId: 'welcome', sourceOutput: 'default', targetNodeId: 'follow-up', targetInput: 'default' },
            { id: 'e3', sourceNodeId: 'follow-up', sourceOutput: 'default', targetNodeId: 'end', targetInput: 'default' }
          ]
        }
      }
    };
    return templates[templateName] || templates['intelligent-ticket-routing'];
  };

  // Helper function to get simple template structure
  const getSimpleTemplate = (templateName: string) => {
    return {
      nodes: [
        { id: 'start-1', type: 'input', position: { x: 100, y: 100 }, data: { label: 'Start' } },
        { id: 'process-1', type: 'default', position: { x: 300, y: 100 }, data: { label: `${templateName} Process` } },
        { id: 'end-1', type: 'output', position: { x: 500, y: 100 }, data: { label: 'End' } }
      ],
      edges: [
        { id: 'e1-2', source: 'start-1', target: 'process-1' },
        { id: 'e2-3', source: 'process-1', target: 'end-1' }
      ],
      metadata: {
        category: templateName.includes('routing') ? 'routing' : templateName.includes('sla') ? 'sla' : 'onboarding',
        tags: [templateName],
        version: '1.0',
        createdBy: 'template',
        status: 'active',
        nodes: [],
        connections: []
      }
    };
  };

  useEffect(() => {
    if (params?.id) {
      void load();
      void loadTemplates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.id]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const parsed = metadataJson.trim() ? JSON.parse(metadataJson) : {};
      
      // Convert ReactFlow nodes back to workflow nodes
      parsed.nodes = nodes.map((node: any) => ({
        id: node.id,
        type: node.type,
        name: node.data?.label || node.id,
        position: node.position,
        configuration: { ...node.data },
        inputs: [],
        outputs: []
      }));
      
      // Convert ReactFlow edges back to workflow connections
      parsed.connections = edges.map((edge: any) => ({
        id: edge.id,
        sourceNodeId: edge.source,
        sourceOutput: edge.sourceHandle || 'default',
        targetNodeId: edge.target,
        targetInput: edge.targetHandle || 'default'
      }));
      const id = params?.id as string;
      if (!id) throw new Error('Missing workflow id');
      await workflowsApi.update(id, { metadata: parsed } as Partial<WorkflowRuleDTO>);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    try {
      setExecLoading(true);
      const id = params?.id as string;
      await workflowsApi.execute(id, {});
      await loadExecutions(id);
      void pollAfterExecute(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to execute workflow');
    } finally {
      setExecLoading(false);
    }
  };

  const handleActivate = async (active: boolean) => {
    try {
      setLoading(true);
      const id = params?.id as string;
      if (active) await workflowsApi.activate(id); else await workflowsApi.deactivate(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const id = params?.id as string;
      await workflowsApi.sync(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to sync to N8N');
    } finally {
      setLoading(false);
    }
  };

  const addNode = (type: string) => {
    const newId = `${type}-${Date.now()}`;
    const x = 120 + Math.random() * 240;
    const y = 140 + Math.random() * 120;
    setNodes((prev) => [
      ...prev,
      { id: newId, type, position: { x, y }, data: { label: type === 'input' ? 'Start' : type === 'output' ? 'End' : 'Action' } } as any,
    ]);
  };

  const onNodeClick = (_: any, node: any) => {
    setSelectedNodeId(node?.id || null);
  };

  const selectedNode = selectedNodeId ? (nodes as any).find((n: any) => n.id === selectedNodeId) || null : null;

  const updateSelectedNode = (patch: any) => {
    if (!selectedNodeId) return;
    setNodes((prev) => (prev as any).map((n: any) => (n.id === selectedNodeId ? { ...n, ...patch, data: { ...(n.data || {}), ...(patch.data || {}) } } : n)) as any);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('designer.title')}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTemplates(true)} disabled={loading}>
            Load Template
          </Button>
          <Button variant="outline" onClick={() => setWebhooksOpen(true)} disabled={loading}>Webhooks</Button>
          <Button variant="outline" onClick={handleSync} disabled={loading}>Sync to N8N</Button>
          <Button variant="outline" onClick={() => handleActivate(!(workflow?.isActive))} disabled={loading}>
            {workflow?.isActive ? (t('designer.inactive') || 'Deactivate') : (t('designer.active') || 'Activate')}
          </Button>
          <Button variant="outline" onClick={handleExecute} disabled={execLoading || loading}>Execute</Button>
          <Button variant="outline" onClick={load} disabled={loading}>{t('list.reload')}</Button>
          <Button onClick={handleSave} disabled={loading}>{t('list.save')}</Button>
        </div>
      </div>

      {error && (
        <Card>
          <CardContent className="p-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>{t('designer.definition')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">{t('designer.name')}</div>
              <div className="font-medium">{workflow?.name}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('designer.type')}</div>
              <div className="font-medium">{workflow?.type}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">N8N</div>
              <div className="font-medium">{n8nId ? <span className="chip chip-primary">#{String(n8nId).slice(0,8)}</span> : <span className="chip chip-muted">Not synced</span>}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('designer.priority')}</div>
              <div className="font-medium">{workflow?.priority}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">{t('designer.status')}</div>
              <div className="font-medium">{workflow?.isActive ? t('designer.active') : t('designer.inactive')}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="premium-card">
        <CardHeader>
          <CardTitle>{t('designer.designer')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-3 space-y-3">
              <NodePalette onAdd={addNode} />
              <NodeInspector node={selectedNode as any} onChange={updateSelectedNode} />
            </div>
            <div className="col-span-9">
              <div className="h-[420px] border rounded-md relative">
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-muted/20 z-10">
                <div className="text-center space-y-4">
                  <div className="text-6xl">🎯</div>
                  <h3 className="text-lg font-semibold">Start Building Your Workflow</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Your workflow designer is empty. Click &quot;Load Template&quot; to get started with a pre-built workflow, 
                    or start adding nodes manually to create your own automation.
                  </p>
                  <Button onClick={() => setShowTemplates(true)}>
                    Load Template
                  </Button>
                </div>
              </div>
            )}
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={(connection: Connection) => setEdges((eds) => addEdge(connection, eds))}
              onNodeClick={onNodeClick}
              fitView
            >
              <MiniMap />
              <Controls />
              <Background />
            </ReactFlow>
          </div>
            </div>
          </div>
          <div className="mt-4">
            <Textarea
              value={metadataJson}
              onChange={(e) => setMetadataJson(e.target.value)}
              className="min-h-[180px] font-mono"
              placeholder={t('designer.metadata')}
            />
          </div>
        </CardContent>
      </Card>

      {/* Execution History */}
      <Card className="premium-card">
        <CardHeader className="flex items-center justify-between">
          <CardTitle className="w-full flex items-center justify-between">
            <span>{t('designer.executionHistory') || 'Execution History'}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => loadExecutions()} disabled={execLoading}>
                {t('list.reload')}
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {executions.length === 0 && (
            <div className="text-sm text-muted-foreground">{execLoading ? t('common.loading') : (t('designer.noExecutions') || 'No executions')}</div>
          )}
          {executions.length > 0 && (
            <div className="space-y-2">
              {executions.map((ex: any) => (
                <button
                  key={ex.id}
                  className="w-full text-left rounded-md border p-3 hover:bg-muted/30"
                  onClick={() => setSelectedExec(ex)}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium">
                        {ex.status}
                        {ex.errorMessage ? <span className="text-red-600 ml-2">{ex.errorMessage}</span> : null}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {ex.startedAt ? new Date(ex.startedAt).toLocaleString() : ''}
                        {ex.duration ? ` • ${Math.round((ex.duration as number) / 1000)}s` : ''}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">{ex.triggerType || 'manual'}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedExec && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="w-full flex items-center justify-between">
              <span>{t('designer.executionDetails') || 'Execution Details'}</span>
              <Button variant="outline" size="sm" onClick={() => setSelectedExec(null)}>{t('common.close')}</Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div>
                <div className="text-xs text-muted-foreground">{t('designer.status') || 'Status'}</div>
                <div className="font-medium">{selectedExec.status}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('designer.startedAt') || 'Started at'}</div>
                <div className="font-medium">{selectedExec.startedAt ? new Date(selectedExec.startedAt).toLocaleString() : ''}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">{t('designer.duration') || 'Duration'}</div>
                <div className="font-medium">{selectedExec.duration ? `${Math.round((selectedExec.duration as number)/1000)}s` : '-'}</div>
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Input</div>
              <Textarea readOnly className="min-h-[120px] font-mono" value={JSON.stringify(selectedExec.input || {}, null, 2)} />
            </div>
            {selectedExec.output && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Output</div>
                <Textarea readOnly className="min-h-[120px] font-mono" value={JSON.stringify(selectedExec.output || {}, null, 2)} />
              </div>
            )}
            {selectedExec.errorMessage && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Error</div>
                <Textarea readOnly className="min-h-[80px] font-mono text-red-600" value={String(selectedExec.errorMessage)} />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Template Selection Dialog */}
      {showTemplates && (
        <Card className="premium-card">
          <CardHeader>
            <CardTitle>Choose a Workflow Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select a template to get started with your workflow. You can customize it after loading.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template: any) => (
                <Card key={template.slug || template.name} className="template-card cursor-pointer" onClick={() => applyTemplate(template.slug || template.name)}>
                  <CardContent className="p-4">
                    <h3 className="font-semibold">{template.displayName || template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="chip chip-primary">
                        {template.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {template.nodeCount || 0} nodes
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowTemplates(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <WebhooksManagerDialog open={webhooksOpen} onOpenChange={setWebhooksOpen} />
    </div>
  );
}


