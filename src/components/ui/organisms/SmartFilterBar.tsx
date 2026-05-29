import { useState } from 'react'
import { cn } from '@/lib/utils'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { DateRangePickerButton } from '@/components/ui/molecules/DateRangePicker'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StatusChipOption {
  label: string
  value: string
  /** Controls dot color + active fill. Use 'none' for the "All" chip (no dot). */
  variant?: 'default' | 'warning' | 'success' | 'danger' | 'primary' | 'none'
}

export interface ActiveFilterChip {
  key: string
  label: string
  onRemove: () => void
}

export interface SmartFilterBarProps {
  // Search
  search?: string
  onSearchChange?: (v: string) => void
  searchPlaceholder?: string

  // Date preset pills (compact segmented control in main row)
  presets?: { label: string; value: string }[]
  activePreset?: string
  onPresetChange?: (v: string) => void

  // Custom date range — rendered inside the advanced panel
  dateRange?: DateRange
  onCustomRange?: (r: DateRange) => void

  // Status quick-chips (horizontal, main row)
  statusChips?: StatusChipOption[]
  activeStatus?: string
  onStatusChange?: (v: string) => void

  // Advanced panel: arbitrary extra filter fields as a slot
  advancedFilters?: React.ReactNode
  // Count of advanced-only active filters (not counting custom date range)
  activeAdvancedCount?: number

  // Dismissible active-filter chips shown below when anything is filtered
  activeChips?: ActiveFilterChip[]
  onClearAll?: () => void

  className?: string
}

// ─── Variant map ─────────────────────────────────────────────────────────────
// All values are stable Tailwind token classes — no inline styles, no hex

const CHIP_VARIANTS: Record<
  NonNullable<StatusChipOption['variant']>,
  { dot: string; active: string }
> = {
  none:    { dot: '',              active: 'bg-primary text-primary-fg border-primary'                       },
  default: { dot: 'bg-muted-fg',   active: 'bg-primary-subtle border-primary-subtle-border text-primary'    },
  warning: { dot: 'bg-warning-fg', active: 'bg-warning border-border-strong text-warning-fg'                },
  success: { dot: 'bg-success-fg', active: 'bg-success border-border-strong text-success-fg'                },
  danger:  { dot: 'bg-danger-fg',  active: 'bg-danger border-danger-border text-danger-fg'                  },
  primary: { dot: 'bg-primary',    active: 'bg-info border-border-strong text-info-fg'                      },
}

// ─── SmartFilterBar ───────────────────────────────────────────────────────────

export function SmartFilterBar({
  search, onSearchChange, searchPlaceholder = 'Search…',
  presets, activePreset, onPresetChange,
  dateRange, onCustomRange,
  statusChips, activeStatus, onStatusChange,
  advancedFilters, activeAdvancedCount = 0,
  activeChips, onClearAll,
  className,
}: SmartFilterBarProps) {
  const [expanded, setExpanded] = useState(false)

  const customRangeNode = onCustomRange ? (
    <DateRangePickerButton
      selectMode="range"
      showShortcuts
      initialStartDate={activePreset === 'custom' ? (dateRange?.startDate ?? null) : null}
      initialEndDate={activePreset === 'custom' ? (dateRange?.endDate ?? null) : null}
      onChange={r => { if (r.startDate) onCustomRange(r) }}
      placeholder="Custom range…"
    />
  ) : null

  const customDateActive = activePreset === 'custom'
  // Total count shown on the Filters button
  const totalAdvancedActive = activeAdvancedCount + (customDateActive ? 1 : 0)
  const hasAdvancedPanel = !!(advancedFilters || onCustomRange)
  const hasActiveChips = activeChips && activeChips.length > 0

  return (
    <div className={cn('rounded-lg border border-border bg-surface overflow-hidden', className)}>

      {/* ── Main strip ───────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 px-3 py-2.5">

        {/* Segmented date preset control */}
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-px p-0.5 rounded-full bg-surface-raised border border-border">
            {presets.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => onPresetChange?.(p.value)}
                className={cn(
                  'h-6 px-3 rounded-full text-xs font-semibold transition-all duration-150 select-none',
                  activePreset === p.value
                    ? 'bg-primary text-primary-fg shadow-sm'
                    : 'text-muted-fg hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Vertical rule */}
        {(presets || onCustomRange) && (onSearchChange || statusChips) && (
          <div className="self-stretch w-px bg-border mx-0.5" />
        )}

        {/* Search */}
        {onSearchChange !== undefined && (
          <SearchInput
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            onClear={() => onSearchChange('')}
            placeholder={searchPlaceholder}
            className="w-52"
          />
        )}

        {/* Status chips */}
        {statusChips && statusChips.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {statusChips.map(chip => {
              const isActive = activeStatus === chip.value
              const vc = CHIP_VARIANTS[chip.variant ?? 'default']
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => onStatusChange?.(chip.value)}
                  className={cn(
                    'flex-shrink-0 h-7 flex items-center gap-1.5 px-2.5 rounded-full border text-xs',
                    'font-medium transition-all duration-150 select-none',
                    isActive
                      ? vc.active
                      : 'bg-transparent border-border text-muted-fg hover:bg-surface-overlay hover:border-border-strong hover:text-foreground'
                  )}
                >
                  {chip.variant !== 'none' && (
                    <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', vc.dot)} />
                  )}
                  {chip.label}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex-1" />

        {/* Advanced / Filters toggle */}
        {hasAdvancedPanel && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className={cn(
              'flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full border text-xs font-semibold',
              'transition-all duration-150 select-none',
              expanded || totalAdvancedActive > 0
                ? 'bg-primary-subtle border-primary-subtle-border text-primary'
                : 'border-border text-muted-fg hover:bg-surface-overlay hover:text-foreground hover:border-border-strong'
            )}
          >
            {/* funnel icon */}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M11 14h2" />
            </svg>
            {totalAdvancedActive > 0 ? `Filters · ${totalAdvancedActive}` : 'Filters'}
            <svg
              className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Advanced panel (CSS grid-rows collapse animation) ─────────────────── */}
      {hasAdvancedPanel && (
        <div
          className={cn(
            'grid transition-[grid-template-rows] duration-300 ease-in-out',
            expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
          )}
        >
          <div className="overflow-hidden min-h-0">
            <div className="border-t border-border bg-surface-raised px-4 py-4">
              <p className="text-[10px] font-bold text-muted-fg uppercase tracking-widest mb-3">
                Advanced filters
              </p>
              <div className="flex flex-wrap items-end gap-4">
                {/* Custom date range always first in advanced */}
                {customRangeNode && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-medium text-muted-fg">Custom date range</span>
                    {customRangeNode}
                  </div>
                )}
                {/* Caller-supplied extra filters */}
                {advancedFilters}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Active filter chips ───────────────────────────────────────────────── */}
      {hasActiveChips && (
        <div className="flex flex-wrap items-center gap-1.5 px-3 py-2 border-t border-border bg-surface-raised">
          <span className="text-[10px] font-bold text-muted-fg uppercase tracking-wide shrink-0 mr-0.5">
            Filtered:
          </span>
          {activeChips!.map(chip => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 h-5 pl-2.5 pr-1 rounded-full bg-primary-subtle border border-primary-subtle-border text-[11px] font-semibold text-primary"
            >
              {chip.label}
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove ${chip.label} filter`}
                className="ml-0.5 flex items-center justify-center h-4 w-4 rounded-full hover:bg-primary hover:text-primary-fg transition-colors shrink-0"
              >
                <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          {onClearAll && (
            <button
              type="button"
              onClick={onClearAll}
              className="ml-auto text-[11px] font-semibold text-muted-fg hover:text-danger-fg transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  )
}
