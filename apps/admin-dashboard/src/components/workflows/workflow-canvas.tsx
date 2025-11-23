'use client';

import React, { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Edge,
  Node,
  ReactFlowProvider,
  useReactFlow,
  BackgroundVariant,
} from '@xyflow/react';
import { WorkflowNode, workflowNodeTypes, WorkflowNodeData } from './workflow-node';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Grid3X3,
  Move,
  MousePointer,
  Hand,
  Trash2,
  Copy,
  Download,
  Upload,
} from 'lucide-react';

interface WorkflowCanvasProps {
  initialNodes?: Node<WorkflowNodeData>[];
  initialEdges?: Edge[];
  onNodesChange?: (nodes: Node<WorkflowNodeData>[]) => void;
  onEdgesChange?: (edges: Edge[]) => void;
  onNodeSelect?: (node: Node<WorkflowNodeData> | null) => void;
  readOnly?: boolean;
}

const defaultNodes: Node<WorkflowNodeData>[] = [
  {
    id: 'start-1',
    type: 'input',
    position: { x: 100, y: 200 },
    data: {
      label: 'Workflow Start',
      type: 'input',
      status: 'active',
      description: 'Entry point for the workflow',
    },
  },
  {
    id: 'process-1',
    type: 'ai-analysis',
    position: { x: 400, y: 200 },
    data: {
      label: 'AI Analysis',
      type: 'ai-analysis',
      status: 'active',
      description: 'Analyze incoming data using AI',
      outputs: ['positive', 'negative', 'neutral'],
    },
  },
  {
    id: 'condition-1',
    type: 'condition',
    position: { x: 700, y: 200 },
    data: {
      label: 'Route Decision',
      type: 'condition',
      status: 'active',
      description: 'Route based on analysis result',
      outputs: ['high-priority', 'normal', 'low-priority'],
    },
  },
  {
    id: 'action-1',
    type: 'send-notification',
    position: { x: 1000, y: 100 },
    data: {
      label: 'Send Alert',
      type: 'send-notification',
      status: 'active',
      description: 'Send high priority alert',
    },
  },
  {
    id: 'action-2',
    type: 'ticket-assignment',
    position: { x: 1000, y: 300 },
    data: {
      label: 'Assign Ticket',
      type: 'ticket-assignment',
      status: 'active',
      description: 'Assign to appropriate agent',
    },
  },
  {
    id: 'end-1',
    type: 'output',
    position: { x: 1300, y: 200 },
    data: {
      label: 'Workflow End',
      type: 'output',
      status: 'active',
      description: 'Workflow completion',
    },
  },
];

const defaultEdges: Edge[] = [
  {
    id: 'e1-2',
    source: 'start-1',
    target: 'process-1',
    animated: true,
  },
  {
    id: 'e2-3',
    source: 'process-1',
    target: 'condition-1',
    animated: true,
  },
  {
    id: 'e3-4',
    source: 'condition-1',
    target: 'action-1',
    sourceHandle: 'high-priority',
    animated: true,
    label: 'High Priority',
    labelStyle: { fontSize: 12, fontWeight: 600 },
  },
  {
    id: 'e3-5',
    source: 'condition-1',
    target: 'action-2',
    sourceHandle: 'normal',
    animated: true,
    label: 'Normal',
    labelStyle: { fontSize: 12, fontWeight: 600 },
  },
  {
    id: 'e4-6',
    source: 'action-1',
    target: 'end-1',
    animated: true,
  },
  {
    id: 'e5-6',
    source: 'action-2',
    target: 'end-1',
    animated: true,
  },
];

function WorkflowCanvasInner({
  initialNodes = defaultNodes,
  initialEdges = defaultEdges,
  onNodesChange,
  onEdgesChange,
  onNodeSelect,
  readOnly = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node<WorkflowNodeData> | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { 
    zoomIn, 
    zoomOut, 
    fitView, 
    getViewport, 
    setViewport,
    screenToFlowPosition,
    getNodes,
    getEdges,
  } = useReactFlow();

  // Handle node changes
  const handleNodesChange = useCallback((changes: any) => {
    onNodesChangeInternal(changes);
    onNodesChange?.(getNodes());
  }, [onNodesChangeInternal, onNodesChange, getNodes]);

  // Handle edge changes
  const handleEdgesChange = useCallback((changes: any) => {
    onEdgesChangeInternal(changes);
    onEdgesChange?.(getEdges());
  }, [onEdgesChangeInternal, onEdgesChange, getEdges]);

  // Handle new connections
  const onConnect = useCallback(
    (params: Connection) => {
      if (readOnly) return;
      const newEdge = {
        ...params,
        id: `e${params.source}-${params.target}-${Date.now()}`,
        animated: true,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, readOnly]
  );

  // Handle node selection
  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node<WorkflowNodeData>) => {
      setSelectedNode(node);
      onNodeSelect?.(node);
    },
    [onNodeSelect]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [onNodeSelect]);

  // Handle drag over for node palette
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from node palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');
      if (typeof type === 'undefined' || !type || readOnly) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node<WorkflowNodeData> = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label: type.charAt(0).toUpperCase() + type.slice(1).replace(/[-_]/g, ' '),
          type,
          status: 'inactive',
          description: `New ${type} node`,
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [screenToFlowPosition, setNodes, readOnly]
  );

  // Delete selected elements
  const deleteSelected = useCallback(() => {
    if (readOnly) return;
    
    const selectedNodes = nodes.filter((node) => node.selected);
    const selectedEdges = edges.filter((edge) => edge.selected);
    
    if (selectedNodes.length > 0) {
      setNodes((nds) => nds.filter((node) => !node.selected));
    }
    
    if (selectedEdges.length > 0) {
      setEdges((eds) => eds.filter((edge) => !edge.selected));
    }
    
    setSelectedNode(null);
    onNodeSelect?.(null);
  }, [nodes, edges, setNodes, setEdges, onNodeSelect, readOnly]);

  // Copy selected nodes
  const copySelected = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected);
    if (selectedNodes.length === 0) return;

    const copiedNodes = selectedNodes.map((node) => ({
      ...node,
      id: `${node.id}-copy-${Date.now()}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      selected: false,
    }));

    setNodes((nds) => [...nds, ...copiedNodes]);
  }, [nodes, setNodes]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (readOnly) return;
      
      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected();
      } else if (event.key === 'c' && (event.ctrlKey || event.metaKey)) {
        copySelected();
      } else if (event.key === 'a' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setNodes((nds) => nds.map((node) => ({ ...node, selected: true })));
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, copySelected, setNodes, readOnly]);

  return (
    <div className="h-full w-full relative overflow-hidden" ref={reactFlowWrapper}>
      {/* Modern gradient background overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          background: 'radial-gradient(circle at 50% 50%, hsl(var(--primary) / 0.03) 0%, transparent 70%)',
        }}
      />
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDrop={onDrop}
        onDragOver={onDragOver}
        nodeTypes={workflowNodeTypes}
        fitView
        attributionPosition="bottom-left"
        className="workflow-canvas-modern"
        selectNodesOnDrag={!isSelecting}
        panOnDrag={!isSelecting}
        selectionOnDrag={isSelecting}
        multiSelectionKeyCode="Shift"
        deleteKeyCode={readOnly ? null : ['Delete', 'Backspace']}
        defaultEdgeOptions={{
          animated: true,
          style: { 
            strokeWidth: 2,
            stroke: 'hsl(var(--primary) / 0.6)',
          },
        }}
        connectionLineStyle={{
          strokeWidth: 2,
          stroke: 'hsl(var(--primary))',
        }}
      >
        {/* Modern grid background with subtle dots */}
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={24} 
          size={1.5}
          className="opacity-30"
          color="hsl(var(--muted-foreground) / 0.3)"
        />
        
        {/* Enhanced controls with glassmorphism */}
        <Controls 
          className="!bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl !shadow-primary/5 transition-all hover:shadow-primary/10"
          showZoom={true}
          showFitView={true}
          showInteractive={true}
          style={{
            boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.1)',
          }}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className="react-flow__controls-button transition-all duration-200 hover:scale-110"
                  onClick={() => setIsSelecting(!isSelecting)}
                  style={{ 
                    backgroundColor: isSelecting ? 'hsl(var(--primary))' : 'transparent',
                    color: isSelecting ? 'hsl(var(--primary-foreground))' : 'inherit'
                  }}
                >
                  {isSelecting ? <Hand className="h-4 w-4" /> : <MousePointer className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="left" className="backdrop-blur-xl bg-background/95">
                {isSelecting ? 'Switch to pan mode' : 'Switch to select mode'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          {!readOnly && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="react-flow__controls-button transition-all duration-200 hover:scale-110 hover:text-destructive"
                      onClick={deleteSelected}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="backdrop-blur-xl bg-background/95">
                    Delete selected (Del)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className="react-flow__controls-button transition-all duration-200 hover:scale-110 hover:text-primary"
                      onClick={copySelected}
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="backdrop-blur-xl bg-background/95">
                    Copy selected (Ctrl+C)
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </>
          )}
        </Controls>
        
        {/* Enhanced minimap with better colors and glassmorphism */}
        <MiniMap 
          className="!bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl !shadow-primary/5"
          style={{
            boxShadow: '0 8px 32px -8px hsl(var(--primary) / 0.1)',
          }}
          nodeColor={(node) => {
            const category = node.data?.category || node.type || 'default';
            // Category-based colors
            const colorMap: Record<string, string> = {
              trigger: '#8b5cf6',
              input: '#06b6d4',
              action: '#10b981',
              condition: '#f59e0b',
              output: '#ec4899',
              messaging: '#3b82f6',
              'send_whatsapp': '#25D366',
              'send_instagram': '#E1306C',
              'send_email': '#0078D4',
              'send_message': '#6366f1',
              'ai-analysis': '#8b5cf6',
              default: '#6b7280',
            };
            
            // Status-based overlay
            switch (node.data?.status) {
              case 'running': return '#3b82f6';
              case 'error': return '#ef4444';
              case 'success': return '#10b981';
              default: return colorMap[category] || colorMap.default;
            }
          }}
          nodeStrokeWidth={3}
          nodeBorderRadius={8}
          maskColor="hsl(var(--muted) / 0.7)"
        />
      </ReactFlow>

      {/* Floating Action Toolbar with Glassmorphism */}
      {!readOnly && (
        <div className="absolute top-4 right-4 flex items-center gap-2 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl p-2 transition-all hover:shadow-primary/10">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => fitView({ padding: 0.1, duration: 800 })}
                  className="transition-all duration-200 hover:scale-110 hover:bg-primary/10"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="backdrop-blur-xl bg-background/95">
                Fit to view
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <div className="h-5 w-px bg-border/50" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => zoomIn({ duration: 300 })}
                  className="transition-all duration-200 hover:scale-110 hover:bg-primary/10"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="backdrop-blur-xl bg-background/95">
                Zoom in
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => zoomOut({ duration: 300 })}
                  className="transition-all duration-200 hover:scale-110 hover:bg-primary/10"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent className="backdrop-blur-xl bg-background/95">
                Zoom out
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Workflow stats overlay */}
      <div className="absolute bottom-4 left-4 flex items-center gap-3 bg-background/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl px-4 py-2 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-medium">{nodes.length} nodes</span>
        </div>
        <div className="h-3 w-px bg-border/50" />
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary/60" />
          <span className="font-medium">{edges.length} connections</span>
        </div>
      </div>
    </div>
  );
}

export function WorkflowCanvas(props: WorkflowCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}