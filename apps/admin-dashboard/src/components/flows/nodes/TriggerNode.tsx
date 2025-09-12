'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export function TriggerNode({ data }: NodeProps) {
  return (
    <div className="relative px-3 py-2 text-sm rounded-lg border shadow-soft hover-card bg-amber-50/80 dark:bg-amber-900/30 border-amber-200/70 dark:border-amber-800/50 text-amber-900 dark:text-amber-200">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg opacity-70 bg-amber-400"></div>
      <div className="font-medium leading-5 pr-2">{String((data as any)?.label ?? 'Trigger')}</div>
      <Handle type="source" position={Position.Right} id="out" className="!w-2.5 !h-2.5 !bg-foreground/60 border border-white/40" />
    </div>
  )
}


