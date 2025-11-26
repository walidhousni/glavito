'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useParams } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { NodeInspector } from '@/components/workflows/NodeInspector';
import { NodeSelectionDialog } from '@/components/workflows/node-selection-dialog';
import { workflowsApi, WorkflowRuleDTO } from '@/lib/api/workflows-client';
import { ReactFlow, ReactFlowProvider, Background, Controls, addEdge, useEdgesState, useNodesState, Connection, Edge as FlowEdge, Node as FlowNode, useReactFlow } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WebhooksManagerDialog } from '@/components/webhooks/WebhooksManager';
import { normalizeNodeType, toBackendNodeKind, getNodeLabel } from '@/lib/workflows/node-type-mapping';
import { workflowNodeTypes as nodeTypes } from '@/components/workflows/workflow-node';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button as UIButton } from '@/components/ui/button';
import { 
  Play, Save, RefreshCw, Webhook as WebhookIcon,
  Zap, Target, Settings, Layers, AlertTriangle, Plus, X
} from 'lucide-react';

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
  const [nodeSelectionOpen, setNodeSelectionOpen] = useState(false);
  const [nodeToInsertAfter, setNodeToInsertAfter] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);
  // N8N removed

  // Toolbar nested component (inside ReactFlowProvider context)
  const DesignerToolbar = ({
    onShowTemplates,
    onOpenWebhooks,
    onSync,
    onToggleActive,
    onExecute,
    onOpenTest,
    onReload,
    onSave,
  }: {
    onShowTemplates: () => void;
    onOpenWebhooks: () => void;
    onSync: () => void;
    onToggleActive: () => void;
    onExecute: () => void;
    onOpenTest: () => void;
    onReload: () => void;
    onSave: () => void;
  }) => {
    const { fitView, setCenter } = useReactFlow();
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button variant="ghost" size="sm" onClick={onShowTemplates} disabled={loading}>
            <Zap className="h-4 w-4 mr-2" />{t('designer.toolbar.templates')}
          </Button>
          <Button variant="ghost" size="sm" onClick={onOpenWebhooks} disabled={loading}>
            <WebhookIcon className="h-4 w-4 mr-2" />{t('designer.toolbar.webhooks')}
          </Button>
        </div>
        
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button variant="ghost" size="sm" onClick={() => fitView({ padding: 0.2 })} title="Fit to screen">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setCenter(300, 200, { zoom: 0.9 })} title="Center view">
            <Target className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-1 border-r pr-2 mr-2">
          <Button variant="outline" size="sm" onClick={onOpenTest} disabled={loading}>
            <Play className="h-4 w-4 mr-2" />{t('designer.toolbar.test')}
          </Button>
        </div>
        
        <Button 
          variant={workflow?.isActive ? "destructive" : "default"} 
          size="sm" 
          onClick={onToggleActive} 
          disabled={loading}
        >
          {workflow?.isActive ? t('designer.toolbar.deactivate') : t('designer.toolbar.activate')}
        </Button>
        
        <Button onClick={onSave} disabled={loading} size="sm">
          <Save className="h-4 w-4 mr-2" />{t('designer.toolbar.save')}
        </Button>
      </div>
    );
  };

  // Test execution dialog state
  const [testOpen, setTestOpen] = useState(false);
  const [testInput, setTestInput] = useState<string>('{}');
  const [testRunning, setTestRunning] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [lastTestResult, setLastTestResult] = useState<any | null>(null);
  const [testExecutionLogs, setTestExecutionLogs] = useState<any[]>([]);

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
      const wf = res as WorkflowRuleDTO;
      setWorkflow(wf);
      
      // Load nodes/edges from FlowVersion (not metadata)
      const version = wf.currentVersion || wf.versions?.[0];
      const backendNodes = version?.nodes || [];
      const backendEdges = version?.edges || [];
      
      // Convert backend FlowNode format to ReactFlow format
      // Backend: { key, kind, label, position, config }
      // Frontend: { id, type, position, data: { label, ...config } }
      const flowNodes = backendNodes.map((node: any) => {
        const backendKind = node.kind || 'default';
        const frontendType = normalizeNodeType(backendKind);
        const nodeLabel = node.label || getNodeLabel(frontendType);
        
        return {
          id: String(node.key),
          type: frontendType,
          position: node.position || { x: 0, y: 0 },
          data: {
            label: nodeLabel,
            type: frontendType,
            backendKind: backendKind, // Store for round-trip conversion
            status: wf.status === 'published' ? 'active' : 'draft',
            ...(node.config || {})
          }
        } as any;
      });
      setNodes(flowNodes as any);
      if (flowNodes.length > 0) {
        setSelectedNodeId(flowNodes[0].id as string);
      }
      
      // Convert backend FlowEdge format to ReactFlow format
      // Backend: { sourceKey, sourcePort, targetKey, targetPort, label, condition }
      // Frontend: { id, source, target, sourceHandle, targetHandle, label }
      const flowEdges = backendEdges.map((edge: any, index: number) => ({
        id: edge.id || `edge-${index}`,
        source: String(edge.sourceKey),
        target: String(edge.targetKey),
        sourceHandle: edge.sourcePort || 'default',
        targetHandle: edge.targetPort || 'default',
        label: edge.label || edge.sourcePort || undefined,
        labelStyle: { fontSize: 10, fill: 'hsl(var(--foreground))' } as any,
        labelBgPadding: [4, 2] as any,
        labelBgBorderRadius: 8 as any,
        labelBgStyle: { fill: 'hsl(var(--muted))', stroke: 'hsl(var(--border))' } as any
      }));
      setEdges(flowEdges as any);
      
      // Update metadata JSON for display
      const meta = {
        nodes: backendNodes,
        edges: backendEdges,
        ...(wf.metadata || {})
      };
      setMetadataJson(JSON.stringify(meta, null, 2));
      
      // If no nodes exist, add default nodes to help user get started
      if (backendNodes.length === 0) {
        const defaultNodes = [
          {
            id: 'start-1',
            type: 'start',
            position: { x: 100, y: 100 },
            data: { label: t('designer.defaultNodes.start'), type: 'start', backendKind: 'start', status: 'active' }
          },
          {
            id: 'process-1',
            type: 'default',
            position: { x: 300, y: 100 },
            data: { label: t('designer.defaultNodes.processTicket'), type: 'default', backendKind: 'send_message', status: 'active' }
          },
          {
            id: 'end-1',
            type: 'end',
            position: { x: 500, y: 100 },
            data: { label: t('designer.defaultNodes.end'), type: 'end', backendKind: 'end', status: 'active' }
          }
        ];
        setNodes(defaultNodes as any);
        setSelectedNodeId('process-1');
        
        const defaultEdges = [
          {
            id: 'e1-2',
            source: 'start-1',
            target: 'process-1',
            sourceHandle: 'default',
            targetHandle: 'default'
          },
          {
            id: 'e2-3',
            source: 'process-1',
            target: 'end-1',
            sourceHandle: 'default',
            targetHandle: 'default'
          }
        ];
        setEdges(defaultEdges as any);
      }
      
      await loadExecutions(id);
      setSelectedNodeId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('designer.errors.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadExecutions = async (workflowId?: string) => {
    try {
      setExecLoading(true);
      const id = workflowId || (params?.id as string);
      if (!id) return;
      const res = await workflowsApi.getExecutions(id, { limit: 20 });
      const raw = (res as any)?.data || res || [];
      const arr = Array.isArray(raw) ? raw : [];
      const normalized = arr.map((ex: any) => ({
        ...ex,
        status: (ex?.status || '').toString().toLowerCase(),
        triggerType: ex?.triggerType || (ex?.metadata?.triggerType) || 'manual',
        duration: typeof ex?.duration === 'number' ? ex.duration : (ex?.completedAt && ex?.startedAt ? (new Date(ex.completedAt).getTime() - new Date(ex.startedAt).getTime()) : undefined)
      }));
      setExecutions(normalized as any[]);
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
            displayName: t('designer.sampleTemplates.intelligentTicketRouting.name'),
            description: t('designer.sampleTemplates.intelligentTicketRouting.description'),
            category: 'routing',
            nodeCount: 5,
            tags: ['ai', 'routing', 'automation']
          },
          {
            name: 'sla-monitoring',
            displayName: t('designer.sampleTemplates.slaMonitoring.name'),
            description: t('designer.sampleTemplates.slaMonitoring.description'),
            category: 'sla',
            nodeCount: 4,
            tags: ['sla', 'escalation', 'monitoring']
          },
          {
            name: 'customer-onboarding',
            displayName: t('designer.sampleTemplates.customerOnboarding.name'),
            description: t('designer.sampleTemplates.customerOnboarding.description'),
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
          displayName: t('designer.sampleTemplates.intelligentTicketRouting.name'),
          description: t('designer.sampleTemplates.intelligentTicketRouting.description'),
          category: 'routing',
          nodeCount: 5,
          tags: ['ai', 'routing', 'automation']
        },
        {
          name: 'sla-monitoring',
          displayName: t('designer.sampleTemplates.slaMonitoring.name'),
          description: t('designer.sampleTemplates.slaMonitoring.description'),
          category: 'sla',
          nodeCount: 4,
          tags: ['sla', 'escalation', 'monitoring']
        },
        {
          name: 'customer-onboarding',
          displayName: t('designer.sampleTemplates.customerOnboarding.name'),
          description: t('designer.sampleTemplates.customerOnboarding.description'),
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
      setError(e instanceof Error ? e.message : t('designer.errors.applyTemplateFailed'));
    } finally {
      setLoading(false);
    }
  };

  // Helper function to get sample template data
  const getSampleTemplate = (templateName: string) => {
    const templates: Record<string, any> = {
      'intelligent-ticket-routing': {
        name: 'intelligent-ticket-routing',
        displayName: t('designer.sampleTemplates.intelligentTicketRouting.name'),
        description: t('designer.sampleTemplates.intelligentTicketRouting.description'),
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
        displayName: t('designer.sampleTemplates.slaMonitoring.name'),
        description: t('designer.sampleTemplates.slaMonitoring.description'),
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
        displayName: t('designer.sampleTemplates.customerOnboarding.name'),
        description: t('designer.sampleTemplates.customerOnboarding.description'),
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
        { id: 'start-1', type: 'input', position: { x: 100, y: 100 }, data: { label: t('designer.defaultNodes.start') } },
        { id: 'process-1', type: 'default', position: { x: 300, y: 100 }, data: { label: `${templateName} Process` } },
        { id: 'end-1', type: 'output', position: { x: 500, y: 100 }, data: { label: t('designer.defaultNodes.end') } }
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
  }, [params?.id]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const id = params?.id as string;
      if (!id) throw new Error('Missing workflow id');
      
      // Convert ReactFlow nodes to backend FlowNode format
      // Frontend: { id, type, position, data: { label, backendKind, ...config } }
      // Backend: { key, kind, label, position, config }
      const backendNodes = nodes.map((node: any) => {
        const cfg: Record<string, unknown> = { ...(node.data || {}) };
        // Remove frontend-only fields from config
        delete cfg['label'];
        delete cfg['type'];
        delete cfg['status'];
        delete cfg['outputs'];
        
        // Use stored backendKind if available, otherwise convert from frontend type
        const backendKind: string = typeof cfg['backendKind'] === 'string' 
          ? cfg['backendKind'] 
          : toBackendNodeKind(node.type) || 'send_message';
        delete cfg['backendKind']; // Remove after using it
        
        const nodeLabel = node.data?.label || getNodeLabel(node.type);
        
        return {
          key: String(node.id),
          kind: backendKind,
          label: String(nodeLabel || node.id),
          position: node.position || { x: 0, y: 0 },
          config: cfg
        };
      });
      
      // Convert ReactFlow edges to backend FlowEdge format
      // Frontend: { id, source, target, sourceHandle, targetHandle, label }
      // Backend: { sourceKey, sourcePort, targetKey, targetPort, label, condition }
      const backendEdges = edges.map((edge: any) => ({
        sourceKey: edge.source,
        sourcePort: edge.sourceHandle || 'default',
        targetKey: edge.target,
        targetPort: edge.targetHandle || 'default',
        label: edge.label || edge.id,
        condition: edge.condition || undefined
      }));
      
      // Update workflow with nodes and edges directly (not in metadata)
      await workflowsApi.update(id, {
        nodes: backendNodes,
        edges: backendEdges,
        isActive: workflow?.status === 'published' || workflow?.isActive || false
      });
      
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('designer.errors.saveFailed'));
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
      setError(e instanceof Error ? e.message : t('designer.errors.executeFailed'));
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
      setError(e instanceof Error ? e.message : t('designer.errors.updateStatusFailed'));
    } finally {
      setLoading(false);
    }
  };

  // N8N removed: sync handler deleted

  const addNode = (type: string, insertAfterNodeId?: string | null) => {
    const newId = `${type}-${Date.now()}`;
    
    // Get proper label and backend kind for the node type
    const frontendType = normalizeNodeType(type);
    const backendKind = toBackendNodeKind(frontendType);
    const nodeLabel = getNodeLabel(frontendType);
    
    // Get icon URL based on type
    const iconUrlMap: Record<string, string> = {
      'send_message': 'https://img.icons8.com/?id=YZPI5ITFKVFg&format=png&size=96',
      'send_email': 'https://img.icons8.com/?id=86171&format=png&size=96',
      'send_whatsapp': 'https://img.icons8.com/?id=16713&format=png&size=96',
      'template_message': 'https://img.icons8.com/?id=111374&format=png&size=96',
      'condition': 'https://img.icons8.com/?id=86554&format=png&size=96',
      'delay': 'https://img.icons8.com/?id=85037&format=png&size=96',
      'ticket_create': 'https://img.icons8.com/?id=103187&format=png&size=96',
      'ticket_assign': 'https://img.icons8.com/?id=23454&format=png&size=96',
      'ai_decision': 'https://img.icons8.com/?id=93407&format=png&size=96',
      'segment_check': 'https://img.icons8.com/?id=23267&format=png&size=96',
    };
    
    // Calculate position - vertical flow layout
    let x = 400; // Center horizontally
    let y = 100;
    
    if (insertAfterNodeId) {
      const afterNode = nodes.find(n => n.id === insertAfterNodeId);
      if (afterNode) {
        x = afterNode.position.x;
        y = afterNode.position.y + 180; // Space between nodes in vertical flow
        
        // Update all nodes after this one to move down
        setNodes((prev) => prev.map(n => {
          if (n.position.y > afterNode.position.y) {
            return { ...n, position: { ...n.position, y: n.position.y + 180 } };
          }
          return n;
        }));
        
        // Update edges to connect the new node
        const edgeFromAfter = edges.find(e => e.source === insertAfterNodeId);
        if (edgeFromAfter) {
          // Insert node between existing edge
          setEdges((prev) => [
            ...prev.filter(e => e.id !== edgeFromAfter.id),
            {
              id: `e-${insertAfterNodeId}-${newId}`,
              source: insertAfterNodeId,
              target: newId,
              sourceHandle: 'default',
              targetHandle: 'default'
            },
            {
              id: `e-${newId}-${edgeFromAfter.target}`,
              source: newId,
              target: edgeFromAfter.target,
              sourceHandle: 'default',
              targetHandle: 'default'
            }
          ]);
        } else {
          // Just add edge from previous node
          setEdges((prev) => [
      ...prev,
            {
              id: `e-${insertAfterNodeId}-${newId}`,
              source: insertAfterNodeId,
              target: newId,
              sourceHandle: 'default',
              targetHandle: 'default'
            }
          ]);
        }
      }
    } else {
      // Add at end of flow
      const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);
      y = maxY + 180;
      
      // Connect from last node
      const lastNode = nodes.reduce((last, n) => 
        n.position.y > (last?.position.y || 0) ? n : last, null as any
      );
      if (lastNode) {
        setEdges((prev) => [
          ...prev,
          {
            id: `e-${lastNode.id}-${newId}`,
            source: lastNode.id,
            target: newId,
            sourceHandle: 'default',
            targetHandle: 'default'
          }
        ]);
      }
    }
    
    const newNode = {
      id: newId,
      type: frontendType,
      position: { x, y },
      data: {
        label: nodeLabel,
        type: frontendType,
        backendKind: backendKind,
        status: 'draft',
        iconUrl: iconUrlMap[type] || undefined
      }
    } as any;
    
    setNodes((prev) => [...prev, newNode]);
    setSelectedNodeId(newId);
  };
  
  const openNodeSelection = (afterNodeId?: string) => {
    setNodeToInsertAfter(afterNodeId || null);
    setNodeSelectionOpen(true);
  };
  
  const handleNodeSelection = (nodeType: string) => {
    addNode(nodeType, nodeToInsertAfter);
    setNodeToInsertAfter(null);
  };

  const onNodeClick = (_: any, node: any) => {
    const nodeId = node?.id || null;
    setSelectedNodeId(nodeId);
    if (nodeId) {
      setInspectorOpen(true);
    }
    console.log('Node clicked:', nodeId, node);
  };

  const selectedNode = selectedNodeId ? (nodes as any).find((n: any) => n.id === selectedNodeId) || null : null;

  const updateSelectedNode = (patch: any) => {
    if (!selectedNodeId) {
      console.warn('Cannot update node: no node selected');
      return;
    }
    console.log('Updating node:', selectedNodeId, patch);
    setNodes((prev) => (prev as any).map((n: any) => {
      if (n.id === selectedNodeId) {
        const updated = {
          ...n,
          ...patch,
          data: {
            ...(n.data || {}),
            ...(patch.data || {})
          }
        };
        console.log('Node updated:', updated);
        return updated;
      }
      return n;
    }) as any);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save workflow (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      
      // Duplicate node (Ctrl+D or Cmd+D)
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (selectedNodeId) {
          const nodeToDuplicate = nodes.find((n: any) => n.id === selectedNodeId);
          if (nodeToDuplicate) {
            const newNode = {
              ...nodeToDuplicate,
              id: `${nodeToDuplicate.type}-${Date.now()}`,
              position: {
                x: nodeToDuplicate.position.x + 50,
                y: nodeToDuplicate.position.y + 50
              },
              selected: false
            };
            setNodes((nds) => [...nds, newNode as any]);
          }
        }
      }
      
      // Execute workflow (Ctrl+Enter or Cmd+Enter)
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!execLoading) {
          void handleExecute();
        }
      }
      
      // Search nodes (Ctrl+F or Cmd+F)
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        // Focus on search input if exists (would need to add a search input)
        console.log('Search triggered');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, nodes, setNodes, execLoading, handleSave, handleExecute]);

  return (
    <ReactFlowProvider>
      <div className="workflow-designer h-screen flex flex-col">
        {/* Enhanced Header */}
        <div className="workflow-header">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5 flex items-center justify-center shadow-lg border border-primary/20">
                      <Layers className="h-6 w-6 text-primary" />
                    </div>
                    {workflow?.isActive && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 dark:from-white dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent">
                      {workflow?.name || t('designer.title')}
                    </h1>
                    <div className="flex items-center space-x-3 text-sm">
                      <span className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                        {workflow?.type || t('designer.workflow')}
                      </span>
                      <div className="h-1 w-1 rounded-full bg-slate-400" />
                      <Badge 
                        variant={workflow?.isActive ? 'default' : 'secondary'}
                        className={workflow?.isActive ? 'wf-badge-active' : 'wf-badge-inactive'}
                      >
                        {workflow?.isActive ? t('designer.active') : t('designer.draft')}
                      </Badge>
              {/* N8N ID badge removed */}
                    </div>
                  </div>
                </div>
              </div>
              
              <DesignerToolbar
                onShowTemplates={() => setShowTemplates(true)}
                onOpenWebhooks={() => setWebhooksOpen(true)}
                onSync={() => void 0}
                onToggleActive={() => handleActivate(!(workflow?.isActive))}
                onExecute={handleExecute}
                onOpenTest={() => setTestOpen(true)}
                onReload={load}
                onSave={handleSave}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="border-b border-red-200/60 dark:border-red-800/60 bg-gradient-to-r from-red-50/80 to-rose-50/80 dark:from-red-950/40 dark:to-rose-950/40">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
                  <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                </div>
                <div className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden bg-background">
          {/* Center - Canvas */}
          <div className="flex-1 relative bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-800">
            <div className="absolute inset-0">
              {nodes.length === 0 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center">
                  <Card className="p-8 max-w-md">
                    <div className="flex flex-col items-center text-center space-y-4">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Target className="h-8 w-8 text-primary" />
                    </div>
                      <div className="space-y-2">
                        <h3 className="text-2xl font-bold text-foreground">{t('designer.emptyState.title')}</h3>
                        <p className="text-muted-foreground leading-relaxed">
                        {t('designer.emptyState.description')}
                      </p>
                    </div>
                      <div className="flex gap-3 pt-4">
                        <Button onClick={() => setShowTemplates(true)}>
                        <Zap className="h-4 w-4 mr-2" />
                        {t('designer.emptyState.browseTemplates')}
                      </Button>
                        <Button variant="outline" onClick={() => openNodeSelection()}>
                        <Play className="h-4 w-4 mr-2" />
                        {t('designer.emptyState.addStartNode')}
                      </Button>
                    </div>
                  </div>
                  </Card>
                </div>
              )}
              <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={(connection: Connection) => setEdges((eds) => addEdge(connection, eds))}
                onNodeClick={onNodeClick}
                onSelectionChange={(sel: any) => {
                  const nodeId = sel?.nodes?.[0]?.id ?? null;
                  console.log('Selection changed:', nodeId);
                  setSelectedNodeId(nodeId);
                }}
                onPaneClick={() => {
                  console.log('Pane clicked, deselecting node');
                  setSelectedNodeId(null);
                }}
                nodesDraggable={true}
                nodesConnectable={true}
                elementsSelectable={true}
                fitView
                proOptions={{ hideAttribution: true }}
                defaultEdgeOptions={{ 
                  type: 'smoothstep', 
                  animated: false,
                  style: { 
                    stroke: '#94a3b8', 
                    strokeWidth: 2
                  }
                }}
                connectionLineStyle={{ 
                  stroke: '#3b82f6', 
                  strokeWidth: 2 
                }}
                className="bg-gradient-to-br from-slate-50 to-gray-100 dark:from-slate-900 dark:to-slate-800"
              >
                <Background 
                  className="opacity-20" 
                  gap={32} 
                  size={1} 
                  color="#e2e8f0" 
                  variant={"dots" as any}
                />
                <Controls position="bottom-left" className="!shadow-lg" />
              </ReactFlow>
              
              {/* Plus buttons between nodes */}
              {nodes.map((node, index) => {
                if (index === nodes.length - 1) return null; // Skip last node
                const nextNode = nodes[index + 1];
                if (!nextNode) return null;
                
                // Calculate position between current and next node
                const midY = (node.position.y + nextNode.position.y) / 2;
                const midX = node.position.x;
                
                return (
                  <button
                    key={`plus-${node.id}`}
                    className="absolute z-50 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-500 shadow-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:scale-110 flex items-center justify-center group"
                    style={{
                      left: `${midX + 140}px`,
                      top: `${midY}px`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    onClick={() => openNodeSelection(node.id)}
                  >
                    <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </button>
                );
              })}
              
              {/* Add button after last node */}
              {nodes.length > 0 && (
                <button
                  className="absolute z-50 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-blue-500 shadow-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all hover:scale-110 flex items-center justify-center"
                  style={{
                    left: `${nodes[nodes.length - 1].position.x + 140}px`,
                    top: `${nodes[nodes.length - 1].position.y + 90}px`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onClick={() => openNodeSelection()}
                >
                  <Plus className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </button>
              )}
            </div>
          </div>

          {/* Right Sidebar - Inspector & Details */}
          {inspectorOpen && (
            <div className="w-96 border-l bg-card flex flex-col animate-in slide-in-from-right duration-300">
              {/* Close Button Header */}
              <div className="border-b p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {selectedNode && (
                    <>
                      <Settings className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">
                        {selectedNode.data?.label || 'Node Settings'}
                      </span>
                    </>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setInspectorOpen(false)}
                  className="h-8 w-8 p-0 hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <Tabs defaultValue="setup" className="h-full flex flex-col">
                <div className="border-b px-4">
                  <TabsList className="grid w-full grid-cols-2 h-10">
                    <TabsTrigger value="setup" className="text-sm">
                      Setup
                    </TabsTrigger>
                    <TabsTrigger value="details" className="text-sm">
                      Details
                    </TabsTrigger>
                  </TabsList>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <TabsContent value="setup" className="h-full p-4 m-0">
                      <div className="space-y-4">
                    {selectedNode ? (
                          <NodeInspector node={selectedNode as any} onChange={updateSelectedNode} />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
                        <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center">
                          <Settings className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">{t('designer.inspector.noNodeSelected')}</h4>
                          <p className="text-sm text-muted-foreground">{t('designer.inspector.noNodeDescription')}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="details" className="h-full p-4 m-0">
                    <div className="space-y-4">
                    <div className="space-y-3">
                      
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4">
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('designer.details.name')}</Label>
                            <div className="px-3 py-2 bg-muted rounded-lg text-sm font-medium">
                              {workflow?.name || t('designer.untitled')}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('designer.details.type')}</Label>
                            <div className="px-3 py-2 bg-muted rounded-lg text-sm font-medium">
                              {workflow?.type || t('designer.standard')}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('designer.details.priority')}</Label>
                            <div className="px-3 py-2 bg-muted rounded-lg text-sm font-medium">
                              {workflow?.priority || t('designer.normal')}
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label className="text-sm font-medium">{t('designer.details.status')}</Label>
                            <Badge 
                              variant={workflow?.isActive ? 'default' : 'secondary'}
                            >
                              {workflow?.isActive ? t('designer.active') : t('designer.inactive')}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">{t('designer.details.rawMetadata')}</Label>
                      <Textarea
                        value={metadataJson}
                        onChange={(e) => setMetadataJson(e.target.value)}
                        className="min-h-[200px] font-mono text-xs"
                        placeholder={t('designer.details.metadataPlaceholder')}
                      />
                    </div>
                  </div>
                </TabsContent>
                        </div>
            </Tabs>
                        </div>
          )}
        </div>


        {/* Execution History Sheet - Moved outside */}
          <Sheet open={!!selectedExec} onOpenChange={() => setSelectedExec(null)}>
            <SheetContent className="sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>{t('designer.execution.details')}</SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('designer.execution.status')}</div>
                  <Badge variant={selectedExec?.status === 'success' ? 'default' : selectedExec?.status === 'error' ? 'destructive' : 'secondary'}>
                    {selectedExec?.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('designer.execution.startedAt')}</div>
                  <div className="font-medium">{selectedExec?.startedAt ? new Date(selectedExec.startedAt).toLocaleString() : '-'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">{t('designer.execution.duration')}</div>
                  <div className="font-medium">{selectedExec?.duration ? `${Math.round((selectedExec.duration as number)/1000)}s` : '-'}</div>
                  </div>
                </div>
                
                <Separator />
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">{t('designer.execution.input')}</div>
                    <Textarea 
                      readOnly 
                      className="min-h-[120px] font-mono text-xs" 
                    value={JSON.stringify(selectedExec?.input || {}, null, 2)} 
                    />
                  </div>
                  
                {selectedExec?.output && (
                    <div>
                      <div className="text-sm font-medium mb-2">{t('designer.execution.output')}</div>
                      <Textarea 
                        readOnly 
                      className="min-h-[120px] font-mono text-xs bg-muted/50" 
                        value={JSON.stringify(selectedExec.output || {}, null, 2)} 
                      />
                    </div>
                  )}
                  
                {selectedExec?.errorMessage && (
                    <div>
                      <div className="text-sm font-medium mb-2 text-destructive">{t('designer.execution.error')}</div>
                      <Textarea 
                        readOnly 
                        className="min-h-[80px] font-mono text-xs border-destructive" 
                        value={String(selectedExec.errorMessage)} 
                      />
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>


        {/* Template Selection Sheet */}
        {showTemplates && (
          <Sheet open={showTemplates} onOpenChange={setShowTemplates}>
            <SheetContent className="sm:max-w-3xl">
              <SheetHeader>
                <SheetTitle>{t('designer.templates.title')}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {t('designer.templates.subtitle')}
                </p>
              </SheetHeader>
              <div className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                  {templates.map((template: any) => (
                    <Card 
                      key={template.slug || template.name} 
                      className="cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/20" 
                      onClick={() => applyTemplate(template.slug || template.name)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <h3 className="font-semibold">{template.displayName || template.name}</h3>
                            <Badge variant="outline" className="text-xs">
                              {template.nodeCount || 0} {t('designer.templates.nodes')}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{template.description}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className="text-xs">
                              {template.category}
                            </Badge>
                            {template.tags?.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}

        <WebhooksManagerDialog open={webhooksOpen} onOpenChange={setWebhooksOpen} />

        {/* Node Selection Dialog */}
        <NodeSelectionDialog 
          open={nodeSelectionOpen} 
          onOpenChange={setNodeSelectionOpen}
          onSelectNode={handleNodeSelection}
        />

        {/* Test Execution Dialog */}
        <Dialog open={testOpen} onOpenChange={(v) => { 
          if (!testRunning) {
            setTestOpen(v);
            if (!v) {
              // Reset state when closing
              setTestInput('{}');
              setTestError(null);
              setLastTestResult(null);
              setTestExecutionLogs([]);
            }
          }
        }}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <Play className="h-5 w-5" />
                <span>Test Execution</span>
              </DialogTitle>
              <DialogDescription>
                Test your workflow with sample input data. The workflow will execute using the latest version.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {testError && (
                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 text-destructive text-sm">
                  <div className="font-medium mb-1">Execution Error</div>
                  <div>{testError}</div>
                </div>
              )}
              
              {/* Input Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Input Data (JSON)</Label>
                  <UIButton
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Generate sample input based on workflow nodes
                      const sampleInput: any = {
                        message: "Hello, I need help with my order",
                        customerId: "sample-customer-123",
                        channel: "whatsapp",
                      };
                      setTestInput(JSON.stringify(sampleInput, null, 2));
                    }}
                    className="h-7 text-xs"
                  >
                    Use Sample
                  </UIButton>
                </div>
                <Textarea
                  className="font-mono min-h-[180px] text-xs"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  placeholder={`{
  "message": "Sample message",
  "customerId": "customer-123",
  "channel": "whatsapp"
}`}
                />
                <div className="text-xs text-muted-foreground">
                  Common variables: message, customerId, conversationId, ticketId, channel
              </div>
              </div>

              {/* Execution Logs */}
              {testExecutionLogs.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Execution Logs</Label>
                  <div className="border rounded-lg p-3 bg-muted/30 max-h-[200px] overflow-y-auto">
                    <div className="space-y-1 text-xs font-mono">
                      {testExecutionLogs.map((log, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <span className="text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                          <span className={log.severity === 'error' ? 'text-destructive' : log.severity === 'warning' ? 'text-amber-600' : ''}>
                            [{log.eventType}] {log.message || log.nodeKey}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Result Section */}
              {lastTestResult && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Execution Result</Label>
                  <div className="border rounded-lg p-3 bg-muted/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`h-2 w-2 rounded-full ${lastTestResult.status === 'completed' ? 'bg-green-500' : lastTestResult.status === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}`} />
                      <span className="text-xs font-medium capitalize">{lastTestResult.status || 'completed'}</span>
                      {lastTestResult.durationMs && (
                        <span className="text-xs text-muted-foreground">
                          ({lastTestResult.durationMs}ms)
                        </span>
                      )}
                    </div>
                  <Textarea 
                    readOnly 
                      className="font-mono min-h-[120px] text-xs bg-background border-0 p-0 resize-none" 
                      value={JSON.stringify(lastTestResult.output || lastTestResult, null, 2)} 
                  />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <UIButton variant="outline" onClick={() => {
                setTestOpen(false);
                setTestInput('{}');
                setTestError(null);
                setLastTestResult(null);
                setTestExecutionLogs([]);
              }} disabled={testRunning}>
                Close
              </UIButton>
              <UIButton
                onClick={async () => {
                  if (testRunning) return;
                  try {
                    setTestRunning(true);
                    setTestError(null);
                    setLastTestResult(null);
                    setTestExecutionLogs([]);
                    
                    const id = params?.id as string;
                    let data: any = {};
                    try { 
                      data = JSON.parse(testInput || '{}'); 
                    } catch (_e) { 
                      setTestError('Invalid JSON format. Please check your input.');
                      setTestRunning(false);
                      return;
                    }
                    
                    // Execute workflow
                    const res = await workflowsApi.execute(id, data);
                    setLastTestResult(res);
                    
                    // Poll for execution logs
                    if (res.id || res.runId) {
                      const runId = res.id || res.runId;
                      
                      // Try to fetch execution details with logs
                      try {
                        const executions = await workflowsApi.getExecutions(id, { limit: 5 });
                        const latestRun = executions.find((r: any) => r.id === runId);
                        if (latestRun?.events) {
                          setTestExecutionLogs(latestRun.events);
                        }
                      } catch {
                        // Ignore errors fetching logs
                      }
                    }
                    
                    await loadExecutions(id);
                  } catch (e: any) {
                    const errorMessage = e?.response?.data?.message || e?.message || 'Failed to execute workflow';
                    setTestError(errorMessage);
                  } finally {
                    setTestRunning(false);
                  }
                }}
                disabled={testRunning}
              >
                {testRunning ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run Test
                  </>
                )}
              </UIButton>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ReactFlowProvider>
  );
}


