'use client'

import { Button } from '@/components/ui/button'

type PaletteCategory = { title: string; items: Array<{ type: string; label: string }> }

export function Palette({ categories }: { categories: PaletteCategory[] }) {
  return (
    <div className="space-y-3">
      {categories.map((cat) => (
        <div key={cat.title} className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
              {cat.title === 'Channels' && (
                <svg className="w-2 h-2 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z"/>
                </svg>
              )}
              {cat.title === 'Logic' && (
                <svg className="w-2 h-2 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
              )}
              {cat.title === 'Actions' && (
                <svg className="w-2 h-2 text-gray-600 dark:text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd"/>
                </svg>
              )}
            </div>
            <div className="text-[11px] uppercase text-gray-600 dark:text-gray-400 font-medium tracking-wide">{cat.title}</div>
          </div>
          <div className="space-y-1">
            {cat.items.map((p) => (
              <PaletteItem key={p.type} type={p.type} label={p.label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function PaletteItem({ type, label }: { type: string; label: string }) {
  const onDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', type)
    event.dataTransfer.effectAllowed = 'move'
  }
  return (
    <Button variant="ghost" className="w-full justify-start h-8 text-[13px] hover:bg-muted/60" draggable onDragStart={onDragStart}>
      {label}
    </Button>
  )
}


