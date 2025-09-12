'use client'

import { Background, BackgroundVariant, ReactFlow, useReactFlow, type Node as RFNode, type Edge as RFEdge, type Connection, type NodeChange, type EdgeChange } from '@xyflow/react'
import { DefaultNode } from './nodes/DefaultNode'
import { TriggerNode } from './nodes/TriggerNode'
import { SendMessageNode } from './nodes/SendMessageNode'

interface CanvasProps {
  nodes: RFNode[]
  edges: RFEdge[]
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  onNodeClick: (nodeId: string) => void
  onDropAddNode: (pos: { x: number; y: number }, nodeType: string) => void
}

export function Canvas({ nodes, edges, onNodesChange, onEdgesChange, onConnect, onNodeClick, onDropAddNode }: CanvasProps) {
  const rf = useReactFlow()

  const onDragOver = (event: React.DragEvent) => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }

  const onDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const nodeType = event.dataTransfer.getData('application/reactflow')
    if (!nodeType) return
    const rfa = rf as unknown as { screenToFlowPosition?: (p: { x: number; y: number }) => { x: number; y: number }; project: (p: { x: number; y: number }) => { x: number; y: number } }
    const point = typeof rfa.screenToFlowPosition === 'function'
      ? rfa.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      : rfa.project({ x: event.clientX, y: event.clientY })
    onDropAddNode(point, nodeType)
  }

  return (
    <div className="w-full h-full min-h-[600px]">
      <ReactFlow
        nodeTypes={{ default: DefaultNode, 'trigger.channel': TriggerNode, 'send.message': SendMessageNode }}
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{ type: 'smoothstep', style: { stroke: 'hsl(var(--muted-foreground) / 0.4)', strokeWidth: 2 }, animated: false }}
        connectionMode={"loose" as unknown as undefined}
      >
        <Background variant={BackgroundVariant.Dots} size={1} gap={20} color={typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#374151' : '#d1d5db'} />
      </ReactFlow>
    </div>
  )
}


