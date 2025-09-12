'use client'

import { Handle, Position, type NodeProps } from '@xyflow/react'

export function DefaultNode({ data }: NodeProps) {
  const d = (data as any) || {}
  const kind = String(d?.kind || '')

  const color = (() => {
    if (kind === 'trigger.channel') return { bg: 'bg-amber-50/80 dark:bg-amber-900/30', border: 'border-amber-200/70 dark:border-amber-800/50', text: 'text-amber-900 dark:text-amber-200', accent: 'bg-amber-400' }
    if (kind === 'send.message') return { bg: 'bg-sky-50/80 dark:bg-sky-900/30', border: 'border-sky-200/70 dark:border-sky-800/50', text: 'text-sky-900 dark:text-sky-200', accent: 'bg-sky-400' }
    if (kind === 'condition') return { bg: 'bg-indigo-50/80 dark:bg-indigo-900/30', border: 'border-indigo-200/70 dark:border-indigo-800/50', text: 'text-indigo-900 dark:text-indigo-200', accent: 'bg-indigo-400' }
    if (kind === 'switch') return { bg: 'bg-violet-50/80 dark:bg-violet-900/30', border: 'border-violet-200/70 dark:border-violet-800/50', text: 'text-violet-900 dark:text-violet-200', accent: 'bg-violet-400' }
    if (kind === 'wait') return { bg: 'bg-amber-50/80 dark:bg-amber-900/30', border: 'border-amber-200/70 dark:border-amber-800/50', text: 'text-amber-900 dark:text-amber-200', accent: 'bg-amber-400' }
    if (kind === 'http.request') return { bg: 'bg-slate-50/80 dark:bg-slate-900/30', border: 'border-slate-200/70 dark:border-slate-800/50', text: 'text-slate-900 dark:text-slate-200', accent: 'bg-slate-400' }
    if (kind === 'ticket.create') return { bg: 'bg-emerald-50/80 dark:bg-emerald-900/30', border: 'border-emerald-200/70 dark:border-emerald-800/50', text: 'text-emerald-900 dark:text-emerald-200', accent: 'bg-emerald-400' }
    if (kind === 'ticket.update') return { bg: 'bg-teal-50/80 dark:bg-teal-900/30', border: 'border-teal-200/70 dark:border-teal-800/50', text: 'text-teal-900 dark:text-teal-200', accent: 'bg-teal-400' }
    if (kind === 'notify') return { bg: 'bg-rose-50/80 dark:bg-rose-900/30', border: 'border-rose-200/70 dark:border-rose-800/50', text: 'text-rose-900 dark:text-rose-200', accent: 'bg-rose-400' }
    if (kind === 'end') return { bg: 'bg-zinc-50/80 dark:bg-zinc-900/30', border: 'border-zinc-200/70 dark:border-zinc-800/50', text: 'text-zinc-800 dark:text-zinc-300', accent: 'bg-zinc-400' }
    return { bg: 'bg-white/80 dark:bg-gray-900/60', border: 'border-gray-200/70 dark:border-gray-800/50', text: 'text-foreground', accent: 'bg-primary' }
  })()

  const showTarget = kind !== 'trigger.channel'
  const showSource = kind !== 'end'

  return (
    <div className={`relative px-3 py-2 text-sm rounded-lg border shadow-soft hover-card ${color.bg} ${color.border} ${color.text}`}>
      <div className={`absolute left-0 top-0 h-full w-1 rounded-l-lg opacity-70 ${color.accent}`}></div>
      <div className="font-medium leading-5 pr-2">{String(d?.label ?? 'Node')}</div>
      {showTarget && <Handle type="target" position={Position.Left} id="in" className="!w-2.5 !h-2.5 !bg-foreground/60 border border-white/40" />}
      {showSource && <Handle type="source" position={Position.Right} id="out" className="!w-2.5 !h-2.5 !bg-foreground/60 border border-white/40" />}
    </div>
  )
}


