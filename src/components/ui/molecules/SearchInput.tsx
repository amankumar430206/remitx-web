import { forwardRef } from 'react'
import { Input, type InputProps } from '@/components/ui/atoms/Input'
import { cn } from '@/lib/utils'

export interface SearchInputProps extends Omit<InputProps, 'type'> {
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, onClear, value, ...props }, ref) => (
    <div className="relative">
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-fg pointer-events-none"
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M16.65 10.5A6.15 6.15 0 1110.5 4.35a6.15 6.15 0 016.15 6.15z" />
      </svg>
      <Input
        ref={ref}
        type="search"
        value={value}
        className={cn('pl-9', value && onClear ? 'pr-8' : '', className)}
        {...props}
      />
      {value && onClear && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-fg hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  )
)
SearchInput.displayName = 'SearchInput'
