import * as RadixCheckbox from '@radix-ui/react-checkbox'
import { cn } from '@/lib/utils'

export interface CheckboxProps {
  checked?: boolean | 'indeterminate'
  onCheckedChange?: (checked: boolean | 'indeterminate') => void
  disabled?: boolean
  id?: string
  className?: string
}

export function Checkbox({ checked, onCheckedChange, disabled, id, className }: CheckboxProps) {
  return (
    <RadixCheckbox.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      id={id}
      className={cn(
        'h-4 w-4 shrink-0 rounded-sm border border-border-strong bg-surface',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-primary-fg',
        'data-[state=indeterminate]:bg-primary data-[state=indeterminate]:border-primary',
        className
      )}
    >
      <RadixCheckbox.Indicator className="flex items-center justify-center text-current">
        {checked === 'indeterminate' ? (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="currentColor">
            <rect x="2" y="5" width="8" height="2" rx="1" />
          </svg>
        ) : (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </RadixCheckbox.Indicator>
    </RadixCheckbox.Root>
  )
}
