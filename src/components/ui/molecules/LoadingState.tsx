import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/atoms/Spinner'

export interface LoadingStateProps {
  message?: string
  className?: string
}

export function LoadingState({ message = 'Loading…', className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 gap-3', className)}>
      <Spinner size="lg" />
      <p className="text-sm text-muted-fg">{message}</p>
    </div>
  )
}
