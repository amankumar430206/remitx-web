import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex min-h-[80px] w-full rounded border bg-surface px-3 py-2 text-sm text-foreground shadow-sm',
        'placeholder:text-muted-fg resize-y',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error ? 'border-danger-fg' : 'border-border hover:border-border-strong',
        className
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
