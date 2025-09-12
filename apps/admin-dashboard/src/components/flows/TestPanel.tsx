'use client'

import { Label } from '@/components/ui/label'

type AnyRecord = Record<string, unknown>

interface TestPanelProps {
  testInput: string
  testContext: string
  setTestInput: (v: string) => void
  setTestContext: (v: string) => void
  events: AnyRecord[]
}

export function TestPanel({ testInput, testContext, setTestInput, setTestContext, events }: TestPanelProps) {
  return (
    <div>
      <div className="font-medium mb-2">Live Preview</div>
      <div className="space-y-2 mb-2">
        <div>
          <Label>Test Input (JSON)</Label>
          <textarea className="w-full h-20 rounded-md border border-input bg-background px-2 py-1 text-sm font-mono" value={testInput} onChange={(e) => setTestInput(e.target.value)} />
        </div>
        <div>
          <Label>Test Context (JSON)</Label>
          <textarea className="w-full h-20 rounded-md border border-input bg-background px-2 py-1 text-sm font-mono" value={testContext} onChange={(e) => setTestContext(e.target.value)} />
        </div>
      </div>
      <div className="max-h-48 overflow-auto text-xs space-y-1">
        {events.map((e, idx) => {
          const level = String((e as AnyRecord)?.level || (e as AnyRecord)?.type || '').toLowerCase()
          const isError = level.includes('error') || level.includes('failed')
          const isWarn = level.includes('warn')
          const style = isError ? 'text-red-600' : isWarn ? 'text-amber-600' : 'text-muted-foreground'
          return (
            <div key={idx} className={style}>{JSON.stringify(e)}</div>
          )
        })}
      </div>
    </div>
  )
}


