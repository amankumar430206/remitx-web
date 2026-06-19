import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
}

const BLOCK_KEYS = new Set(['e', 'E', '+', '-'])

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = 'text', onKeyDown, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      onKeyDown={type === 'number'
        ? (e) => { if (BLOCK_KEYS.has(e.key)) e.preventDefault(); onKeyDown?.(e) }
        : onKeyDown}
      className={cn(
        'flex h-9 w-full rounded border bg-surface px-3 py-1 text-sm text-foreground shadow-sm transition-colors',
        'placeholder:text-muted-fg',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error ? 'border-danger-fg' : 'border-border hover:border-border-strong',
        className
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'
