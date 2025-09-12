'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export function SendMessageNode({ data }: NodeProps) {
  return (
    <div className="relative px-3 py-2 text-sm rounded-lg border shadow-soft hover-card bg-sky-50/80 dark:bg-sky-900/30 border-sky-200/70 dark:border-sky-800/50 text-sky-900 dark:text-sky-200">
      <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg opacity-70 bg-sky-400"></div>
      <div className="font-medium leading-5 pr-2">{String(((data as unknown) as { label?: unknown })?.label ?? 'Send Message')}</div>
      <Handle type="target" position={Position.Left} id="in" className="!w-2.5 !h-2.5 !bg-foreground/60 border border-white/40" />
      <Handle type="source" position={Position.Right} id="out" className="!w-2.5 !h-2.5 !bg-foreground/60 border border-white/40" />
    </div>
  )
}


