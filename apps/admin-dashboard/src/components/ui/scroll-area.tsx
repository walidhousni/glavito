import * as React from 'react'

export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  height?: string | number
}

export function ScrollArea({ height = 300, className = '', style, children, ...props }: ScrollAreaProps) {
  const h = typeof height === 'number' ? `${height}px` : String(height)
  return (
    <div
      className={`overflow-y-auto ${className}`}
      style={{ maxHeight: h, ...style }}
      {...props}
    >
      {children}
    </div>
  )
}


