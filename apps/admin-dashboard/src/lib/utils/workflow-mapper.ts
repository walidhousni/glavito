import { FlowDTO, FlowNodeDTO, FlowEdgeDTO } from '../api/workflows-client';

/**
 * Utility functions to map between Flow DTOs and frontend display models
 */

export interface WorkflowDisplayItem {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'published' | 'archived';
  isActive: boolean;
  nodeCount: number;
  connectionCount: number;
  executionCount: number;
  lastExecutedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // For display
  category?: string;
  tags?: string[];
  version?: number;
}

export function mapFlowToDisplayItem(flow: FlowDTO): WorkflowDisplayItem {
  const currentVersion = flow.currentVersion;
  const nodeCount = currentVersion?.nodes?.length || 0;
  const connectionCount = currentVersion?.edges?.length || 0;
  const executionCount = flow._count?.runs || 0;

  return {
    id: flow.id,
    name: flow.name,
    description: flow.description || '',
    status: flow.status,
    isActive: flow.status === 'published',
    nodeCount,
    connectionCount,
    executionCount,
    lastExecutedAt: undefined, // Would need separate API call
    createdAt: new Date(flow.createdAt),
    updatedAt: new Date(flow.updatedAt),
    version: currentVersion?.version,
  };
}

export interface ReactFlowNode {
  id: string;
  type: string;
  data: {
    label: string;
    type: string;
    configuration?: Record<string, any>;
  };
  position: { x: number; y: number };
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  label?: string;
}

export function mapFlowNodesToReactFlow(nodes: FlowNodeDTO[]): ReactFlowNode[] {
  return nodes.map((node) => ({
    id: node.key,
    type: node.kind,
    data: {
      label: node.label || node.kind,
      type: node.kind,
      configuration: node.config,
    },
    position: node.position,
  }));
}

export function mapFlowEdgesToReactFlow(edges: FlowEdgeDTO[]): ReactFlowEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.sourceKey,
    sourceHandle: edge.sourcePort,
    target: edge.targetKey,
    targetHandle: edge.targetPort,
    label: edge.label,
  }));
}

export function mapReactFlowNodesToFlow(nodes: ReactFlowNode[]) {
  return nodes.map((node) => ({
    key: node.id,
    kind: node.type || 'basic',
    label: node.data?.label,
    position: node.position,
    config: node.data?.configuration || {},
  }));
}

export function mapReactFlowEdgesToFlow(edges: ReactFlowEdge[]) {
  return edges.map((edge) => ({
    sourceKey: edge.source,
    sourcePort: edge.sourceHandle,
    targetKey: edge.target,
    targetPort: edge.targetHandle,
    label: edge.label,
  }));
}

