import { cn } from '@/lib/utils'

export interface SplitPaneProps {
  left: React.ReactNode
  right?: React.ReactNode
  rightTitle?: string
  onCloseRight?: () => void
  leftWidth?: string
  className?: string
}

export function SplitPane({ left, right, rightTitle, onCloseRight, leftWidth = 'flex-1', className }: SplitPaneProps) {
  return (
    <div className={cn('flex gap-4 min-h-0', className)}>
      <div className={cn('min-w-0 flex flex-col', right ? leftWidth : 'flex-1')}>
        {left}
      </div>
      {right && (
        <aside className="w-96 shrink-0 flex flex-col rounded-xl border border-border bg-surface shadow-sm overflow-hidden">
          {(rightTitle || onCloseRight) && (
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              {rightTitle && <h3 className="text-sm font-semibold text-foreground">{rightTitle}</h3>}
              {onCloseRight && (
                <button
                  onClick={onCloseRight}
                  className="ml-auto p-1 rounded hover:bg-surface-overlay text-muted-fg"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          <div className="flex-1 overflow-y-auto p-4">{right}</div>
        </aside>
      )}
    </div>
  )
}
