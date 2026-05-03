import { cn } from '@/lib/utils'

export interface FormFieldProps {
  label?: string
  error?: string
  hint?: string
  required?: boolean
  htmlFor?: string
  className?: string
  children: React.ReactNode
}

export function FormField({ label, error, hint, required, htmlFor, className, children }: FormFieldProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-danger-fg ml-0.5">*</span>}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-danger-fg">{error}</p>}
      {!error && hint && <p className="text-xs text-muted-fg">{hint}</p>}
    </div>
  )
}
