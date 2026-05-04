import * as RadixSelect from '@radix-ui/react-select'
import { cn } from '@/lib/utils'

export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

export interface SelectProps {
  value?: string
  onValueChange?: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  error?: boolean
  className?: string
}

// Radix Select.Item rejects empty string values, so we use a sentinel
const EMPTY_SENTINEL = '__empty__'

function toRadix(v: string | undefined) {
  return v === '' ? EMPTY_SENTINEL : (v ?? '')
}

function fromRadix(v: string) {
  return v === EMPTY_SENTINEL ? '' : v
}

export function Select({ value, onValueChange, options, placeholder = 'Select…', disabled, error, className }: SelectProps) {
  return (
    <RadixSelect.Root
      value={toRadix(value)}
      onValueChange={v => onValueChange?.(fromRadix(v))}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        className={cn(
          'flex h-9 w-full items-center justify-between rounded border bg-surface px-3 py-1 text-sm shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error ? 'border-danger-fg' : 'border-border hover:border-border-strong',
          !value && 'text-muted-fg',
          className
        )}
      >
        <RadixSelect.Value placeholder={placeholder} />
        <RadixSelect.Icon>
          <svg className="h-4 w-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content className="z-50 min-w-[8rem] overflow-hidden rounded-lg border border-border bg-surface shadow-lg animate-in fade-in-0 zoom-in-95">
          <RadixSelect.Viewport className="p-1">
            {options.map((opt) => (
              <RadixSelect.Item
                key={opt.value}
                value={toRadix(opt.value)}
                disabled={opt.disabled}
                className={cn(
                  'relative flex cursor-default select-none items-center rounded px-2 py-1.5 text-sm outline-none',
                  'focus:bg-surface-overlay text-foreground',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50'
                )}
              >
                <RadixSelect.ItemText>{opt.label}</RadixSelect.ItemText>
              </RadixSelect.Item>
            ))}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}
