import * as Separator from '@radix-ui/react-separator'
import { cn } from '@/lib/utils'

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical'
  className?: string
  label?: string
}

export function Divider({ orientation = 'horizontal', className, label }: DividerProps) {
  if (label) {
    return (
      <div className="flex items-center gap-3">
        <Separator.Root className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-fg">{label}</span>
        <Separator.Root className="flex-1 h-px bg-border" />
      </div>
    )
  }
  return (
    <Separator.Root
      orientation={orientation}
      className={cn(
        orientation === 'horizontal' ? 'h-px w-full' : 'w-px h-full',
        'bg-border shrink-0',
        className
      )}
    />
  )
}
