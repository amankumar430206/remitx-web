import { createPortal } from 'react-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import {
  format, isToday, isSameDay, isSameMonth, addMonths,
  sub, startOfMonth, endOfMonth, startOfYear, endOfYear, getYear,
} from 'date-fns'
import { cn } from '@/lib/utils'
import { useDatePicker, type SelectMode, type DatePickerReturn } from './useDatePicker'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DateRange {
  startDate: Date | null
  endDate: Date | null
}

export interface DateRangePickerProps {
  selectMode?: SelectMode
  initialDate?: Date | null
  initialStartDate?: Date | null
  initialEndDate?: Date | null
  minDate?: Date | null
  maxDate?: Date | null
  onChange?: (range: DateRange) => void
  onClose?: () => void
  numberOfMonths?: 1 | 2
  showShortcuts?: boolean
  useModal?: boolean
  className?: string
}

// ─── Shortcuts ───────────────────────────────────────────────────────────────

const _today = new Date()

const SHORTCUTS = [
  {
    label: 'Today',
    range: () => ({ start: _today, end: _today }),
  },
  {
    label: 'Yesterday',
    range: () => { const d = sub(_today, { days: 1 }); return { start: d, end: d } },
  },
  {
    label: 'Last 7 days',
    range: () => ({ start: sub(_today, { days: 6 }), end: _today }),
  },
  {
    label: 'Last 30 days',
    range: () => ({ start: sub(_today, { days: 29 }), end: _today }),
  },
  {
    label: 'This month',
    range: () => ({ start: startOfMonth(_today), end: _today }),
  },
  {
    label: 'Last month',
    range: () => {
      const lm = sub(_today, { months: 1 })
      return { start: startOfMonth(lm), end: endOfMonth(lm) }
    },
  },
  {
    label: 'Current month',
    range: () => ({ start: startOfMonth(_today), end: endOfMonth(_today) }),
  },
  {
    label: 'Last 6 months',
    range: () => ({ start: sub(_today, { months: 6 }), end: _today }),
  },
  {
    label: 'This year',
    range: () => ({ start: startOfYear(_today), end: _today }),
  },
  {
    label: 'Last year',
    range: () => {
      const ly = sub(_today, { years: 1 })
      return { start: startOfYear(ly), end: endOfYear(ly) }
    },
  },
]

// ─── Week header ─────────────────────────────────────────────────────────────

const WEEK_DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

// ─── DayCell ─────────────────────────────────────────────────────────────────

interface DayCellProps {
  date: Date
  monthDate: Date
  picker: DatePickerReturn
}

function DayCell({ date, monthDate, picker }: DayCellProps) {
  const { isDisabled, getDayInfo, selectDate, setHoverDate } = picker
  const disabled    = isDisabled(date)
  const outside     = !isSameMonth(date, monthDate)
  const today       = isToday(date)
  const { isStart, isEnd, isInRange, hasSpan, isHoverPreview } = getDayInfo(date)

  // Only show range bars for days inside this month
  const showRangeVisuals = !outside

  // Inline style for range bar: CSS var is rgba() so opacity works correctly.
  // Hover preview is lighter (0.6× opacity) than a committed range.
  const rangeBarStyle: React.CSSProperties = {
    backgroundColor: 'var(--color-primary-subtle)',
    opacity: isHoverPreview ? 0.7 : 1,
  }

  return (
    <div
      className={cn('relative flex h-10 items-center justify-center', outside && 'pointer-events-none')}
      onMouseEnter={() => !disabled && !outside && setHoverDate(date)}
      onMouseLeave={() => setHoverDate(null)}
    >
      {/* ── Range background bars ── */}
      {showRangeVisuals && (
        <>
          {/* Full bar for strictly in-range days */}
          {isInRange && (
            <span className="absolute inset-x-0 inset-y-1.5 pointer-events-none" style={rangeBarStyle} />
          )}
          {/* Right-half bar extending from start date */}
          {isStart && hasSpan && (
            <span className="absolute inset-y-1.5 left-1/2 right-0 pointer-events-none" style={rangeBarStyle} />
          )}
          {/* Left-half bar extending to end date */}
          {isEnd && hasSpan && (
            <span className="absolute inset-y-1.5 left-0 right-1/2 pointer-events-none" style={rangeBarStyle} />
          )}
        </>
      )}

      {/* ── Day circle ── */}
      <button
        type="button"
        onClick={() => !disabled && selectDate(date)}
        disabled={disabled}
        tabIndex={outside ? -1 : 0}
        aria-label={format(date, 'MMMM d, yyyy')}
        aria-pressed={isStart || isEnd}
        aria-disabled={disabled}
        className={cn(
          'relative z-10 flex h-9 w-9 flex-col items-center justify-center rounded-full text-sm font-medium',
          'transition-colors duration-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-1',
          // Outside current month: invisible but layout-holding
          outside && 'invisible',
          // Disabled
          disabled && !outside && 'cursor-not-allowed opacity-30',
          // Selected (start / end)
          (isStart || isEnd) && 'bg-primary text-white shadow-sm shadow-primary/40',
          // In range (not selected endpoints)
          isInRange && !isStart && !isEnd && 'text-foreground',
          // Today indicator
          today && !isStart && !isEnd && 'font-bold text-primary',
          // Hover (not selected, not disabled, not outside)
          !isStart && !isEnd && !disabled && !outside && 'hover:bg-surface-overlay',
          // Default text
          !isStart && !isEnd && !today && !outside && !disabled && 'text-foreground',
        )}
      >
        {format(date, 'd')}
        {/* Today dot */}
        {today && (
          <span
            className={cn(
              'absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full',
              isStart || isEnd ? 'bg-white/70' : 'bg-primary',
            )}
          />
        )}
      </button>
    </div>
  )
}

// ─── Month calendar ───────────────────────────────────────────────────────────

interface MonthCalendarProps {
  monthDate: Date
  picker: DatePickerReturn
  showNavPrev?: boolean
  showNavNext?: boolean
}

function MonthCalendar({ monthDate, picker, showNavPrev = true, showNavNext = true }: MonthCalendarProps) {
  const { state, navigate, setViewMode } = picker
  const days = picker.getDaysGrid(monthDate)

  return (
    <div className="flex flex-col gap-3 min-w-[252px]">
      {/* Month header */}
      <div className="flex items-center gap-1">
        {showNavPrev && (
          <button
            type="button"
            onClick={() => navigate('prev')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-surface-overlay hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Previous month"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <button
          type="button"
          onClick={() => setViewMode(state.viewMode === 'years' ? 'days' : 'years')}
          className="flex-1 rounded-lg px-2 py-1 text-sm font-semibold text-foreground transition-colors hover:bg-surface-overlay focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        >
          {format(monthDate, 'MMMM yyyy')}
        </button>

        {showNavNext && (
          <button
            type="button"
            onClick={() => navigate('next')}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-surface-overlay hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            aria-label="Next month"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7">
        {WEEK_DAYS.map(d => (
          <div key={d} className="flex h-8 items-center justify-center text-[11px] font-semibold uppercase tracking-wider text-muted-fg">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid — gap-x-0 is critical for seamless range bars */}
      <div
        className="grid grid-cols-7 gap-x-0 gap-y-0.5"
        role="grid"
        aria-label={format(monthDate, 'MMMM yyyy')}
      >
        {days.map(day => (
          <DayCell
            key={day.toISOString()}
            date={day}
            monthDate={monthDate}
            picker={picker}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Year grid ────────────────────────────────────────────────────────────────

function YearGrid({ picker }: { picker: DatePickerReturn }) {
  const { state, selectYear, shiftYearRange } = picker
  const currentYear = getYear(state.viewDate)
  const years = Array.from({ length: 12 }, (_, i) => state.yearRangeStart + i)

  return (
    <div className="flex flex-col gap-4">
      {/* Year range header */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => shiftYearRange('prev')}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-surface-overlay hover:text-foreground"
          aria-label="Previous years"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <span className="text-sm font-semibold text-foreground">
          {years[0]} – {years[years.length - 1]}
        </span>

        <button
          type="button"
          onClick={() => shiftYearRange('next')}
          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-surface-overlay hover:text-foreground"
          aria-label="Next years"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 4 × 3 year grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {years.map(year => (
          <button
            key={year}
            type="button"
            onClick={() => selectYear(year)}
            className={cn(
              'rounded-lg py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              year === currentYear
                ? 'bg-primary text-white shadow-sm shadow-primary/30'
                : year === getYear(new Date())
                ? 'border border-primary/40 text-primary'
                : 'text-foreground hover:bg-surface-overlay',
            )}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  )
}

// ─── Shortcuts panel ──────────────────────────────────────────────────────────

interface ShortcutsPanelProps {
  picker: DatePickerReturn
  onClose?: () => void
}

function ShortcutsPanel({ picker, onClose }: ShortcutsPanelProps) {
  const { state, applyShortcut } = picker

  const isActive = (s: typeof SHORTCUTS[number]) => {
    const { start, end } = s.range()
    return !!(
      state.startDate && state.endDate &&
      isSameDay(state.startDate, start) &&
      isSameDay(state.endDate, end)
    )
  }

  return (
    <div className="flex flex-col gap-0.5 border-r border-border pr-4 min-w-[140px]">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-fg">Quick select</p>
      {SHORTCUTS.map(s => {
        const active = isActive(s)
        return (
          <button
            key={s.label}
            type="button"
            onClick={() => { const r = s.range(); applyShortcut(r.start, r.end); onClose?.() }}
            className={cn(
              'rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              active
                ? 'bg-primary/10 text-primary'
                : 'text-foreground hover:bg-surface-overlay',
            )}
          >
            {s.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Picker body ─────────────────────────────────────────────────────────────

interface PickerBodyProps {
  picker: DatePickerReturn
  selectMode: SelectMode
  numberOfMonths: 1 | 2
  showShortcuts: boolean
  onClose?: () => void
  useModal?: boolean
}

function PickerBody({ picker, selectMode, numberOfMonths, showShortcuts, onClose, useModal }: PickerBodyProps) {
  const { state, setViewMode, clear } = picker
  const showingYears = state.viewMode === 'years'

  const secondMonthDate = addMonths(state.viewDate, 1)

  // Selected range display string
  const dateLabel = (() => {
    if (!state.startDate) return null
    if (selectMode === 'single') return format(state.startDate, 'MMM d, yyyy')
    if (state.startDate && state.endDate) {
      return `${format(state.startDate, 'MMM d')} – ${format(state.endDate, 'MMM d, yyyy')}`
    }
    return `${format(state.startDate, 'MMM d, yyyy')} → …`
  })()

  return (
    <div
      className="flex flex-col gap-0 rounded-2xl border border-border bg-surface shadow-xl shadow-black/10"
      role="dialog"
      aria-modal="true"
      aria-label="Date picker"
    >
      {/* ── Selected range header ── */}
      {dateLabel && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <span className="text-sm font-semibold text-foreground tabular-nums">{dateLabel}</span>
          <button
            type="button"
            onClick={clear}
            className="text-xs font-medium text-muted-fg transition-colors hover:text-foreground focus-visible:outline-none"
          >
            Clear
          </button>
        </div>
      )}

      {/* ── Main area: shortcuts + calendar(s) ── */}
      <div className="flex gap-5 p-5">
        {showShortcuts && selectMode === 'range' && !showingYears && (
          <ShortcutsPanel picker={picker} onClose={onClose} />
        )}

        {showingYears ? (
          <div className="flex-1">
            <YearGrid picker={picker} />
          </div>
        ) : (
          <div className={cn('flex gap-6', numberOfMonths === 2 && 'divide-x divide-border')}>
            <MonthCalendar
              monthDate={state.viewDate}
              picker={picker}
              showNavPrev
              showNavNext={numberOfMonths === 1}
            />
            {numberOfMonths === 2 && (
              <div className="pl-6">
                <MonthCalendar
                  monthDate={secondMonthDate}
                  picker={picker}
                  showNavPrev={false}
                  showNavNext
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Footer (modal mode) ── */}
      {useModal && (
        <div className="flex items-center justify-between border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => { setViewMode('days') }}
            className={cn(
              'text-xs font-medium transition-colors focus-visible:outline-none',
              showingYears ? 'text-primary hover:text-primary-hover' : 'text-muted-fg hover:text-foreground',
            )}
          >
            {showingYears ? '← Back to calendar' : 'Browse years'}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { clear(); onClose?.() }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-fg transition-colors hover:bg-surface-overlay hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white shadow-sm shadow-primary/30 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────

interface ModalWrapperProps {
  children: React.ReactNode
  onClose?: () => void
}

function ModalWrapper({ children, onClose }: ModalWrapperProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  // Keyboard: Escape closes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200',
        'bg-black/50 backdrop-blur-sm',
        visible ? 'opacity-100' : 'opacity-0',
      )}
      onClick={e => { if (e.target === e.currentTarget) onClose?.() }}
      aria-modal="true"
    >
      <div
        className={cn(
          'transition-all duration-200',
          visible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2',
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DateRangePicker({
  selectMode = 'range',
  initialDate,
  initialStartDate,
  initialEndDate,
  minDate,
  maxDate,
  onChange,
  onClose,
  numberOfMonths = 1,
  showShortcuts = true,
  useModal = false,
  className,
}: DateRangePickerProps) {
  const picker = useDatePicker({
    selectMode,
    initialStartDate: initialStartDate ?? initialDate ?? null,
    initialEndDate,
    minDate,
    maxDate,
    numberOfMonths,
    onChange: (startDate, endDate) => {
      onChange?.({ startDate, endDate })
      // Auto-close: single mode closes immediately; range mode closes once end date is committed
      if (selectMode === 'single' || endDate !== null) {
        onClose?.()
      }
    },
  })

  const body = (
    <PickerBody
      picker={picker}
      selectMode={selectMode}
      numberOfMonths={numberOfMonths}
      showShortcuts={showShortcuts}
      onClose={onClose}
      useModal={useModal}
    />
  )

  if (useModal) {
    return <ModalWrapper onClose={onClose}>{body}</ModalWrapper>
  }

  return <div className={cn('inline-block', className)}>{body}</div>
}

// ─── Trigger button (convenience) ────────────────────────────────────────────
// A pre-built trigger button that shows the selected range and opens the picker
// in a positioned popover when clicked.

interface DateRangePickerButtonProps extends Omit<DateRangePickerProps, 'useModal'> {
  placeholder?: string
  buttonClassName?: string
}

export function DateRangePickerButton({
  placeholder = 'Select date range',
  buttonClassName,
  ...props
}: DateRangePickerButtonProps) {
  const [open, setOpen] = useState(false)
  const [align, setAlign] = useState<'left' | 'right'>('left')
  const [range, setRange] = useState<DateRange>({
    startDate: props.initialStartDate ?? props.initialDate ?? null,
    endDate: props.initialEndDate ?? null,
  })
  const containerRef = useRef<HTMLDivElement>(null)

  // Approximate picker width: shortcuts (~160px) + calendar (~270px) + padding (~20px)
  const PICKER_WIDTH_ESTIMATE = props.showShortcuts !== false ? 460 : 290

  const label = (() => {
    if (!range.startDate) return placeholder
    if (props.selectMode === 'single') return format(range.startDate, 'MMM d, yyyy')
    if (range.startDate && range.endDate) {
      return `${format(range.startDate, 'MMM d')} – ${format(range.endDate, 'MMM d, yyyy')}`
    }
    return format(range.startDate, 'MMM d, yyyy')
  })()

  const handleChange = useCallback((r: DateRange) => {
    setRange(r)
    props.onChange?.(r)
  }, [props])

  const handleToggle = () => {
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect()
      // Flip to right-aligned when not enough space on the right
      setAlign(rect.left + PICKER_WIDTH_ESTIMATE > window.innerWidth - 16 ? 'right' : 'left')
    }
    setOpen(o => !o)
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={handleToggle}
        className={cn(
          'flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm transition-colors',
          'hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          !range.startDate && 'text-muted-fg',
          range.startDate && 'text-foreground font-medium',
          open && 'border-primary/50 ring-2 ring-primary/20',
          buttonClassName,
        )}
      >
        <svg className="h-4 w-4 shrink-0 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>{label}</span>
        <svg className={cn('ml-1 h-3.5 w-3.5 text-muted-fg transition-transform', open && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className={cn('absolute top-full z-50 mt-2', align === 'right' ? 'right-0' : 'left-0')}>
          <DateRangePicker
            {...props}
            initialStartDate={range.startDate}
            initialEndDate={range.endDate}
            onChange={handleChange}
            onClose={() => setOpen(false)}
            numberOfMonths={props.numberOfMonths}
            showShortcuts={props.showShortcuts}
          />
        </div>
      )}
    </div>
  )
}
