import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'

export interface DateRange {
  from?: Date
  to?: Date
}

export interface DateRangePickerProps {
  value?: DateRange
  onChange?: (range: DateRange) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function DateRangePicker({ value, onChange, placeholder = 'Pick a date range', className, disabled }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [fromStr, setFromStr] = useState(value?.from ? format(value.from, 'yyyy-MM-dd') : '')
  const [toStr, setToStr] = useState(value?.to ? format(value.to, 'yyyy-MM-dd') : '')

  const label = value?.from && value?.to
    ? `${format(value.from, 'MMM d, yyyy')} – ${format(value.to, 'MMM d, yyyy')}`
    : value?.from
    ? format(value.from, 'MMM d, yyyy')
    : placeholder

  const apply = () => {
    const from = fromStr ? new Date(fromStr) : undefined
    const to = toStr ? new Date(toStr) : undefined
    onChange?.({ from, to })
    setOpen(false)
  }

  const clear = () => {
    setFromStr('')
    setToStr('')
    onChange?.({})
    setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          disabled={disabled}
          className={cn(
            'flex h-9 items-center gap-2 rounded border border-border px-3 text-sm bg-surface hover:border-border-strong',
            'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            !value?.from && 'text-muted-fg',
            className
          )}
        >
          <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {label}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 rounded-lg border border-border bg-surface p-4 shadow-lg w-72"
          align="start"
          sideOffset={4}
        >
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-fg">From</label>
              <Input type="date" value={fromStr} onChange={e => setFromStr(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-muted-fg">To</label>
              <Input type="date" value={toStr} onChange={e => setToStr(e.target.value)} min={fromStr} />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={clear}>Clear</Button>
              <Button size="sm" onClick={apply}>Apply</Button>
            </div>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
