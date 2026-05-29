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

  // Custom date range is a COMMON filter — always visible in the main strip
  const showCustomPicker = !!onCustomRange

  // Advanced panel only exists if caller provided extra filter fields
  const hasAdvancedPanel = !!advancedFilters
  const hasActiveChips   = activeChips && activeChips.length > 0

  // Search goes RIGHT when other filters exist, LEFT when it's the only control
  const hasOtherFilters = !!(presets?.length || showCustomPicker || statusChips?.length)

  const searchNode = onSearchChange !== undefined ? (
    <SearchInput
      value={search}
      onChange={e => onSearchChange(e.target.value)}
      onClear={() => onSearchChange('')}
      placeholder={searchPlaceholder}
      className="w-52"
    />
  ) : null

  return (
    <div className={cn('rounded-lg border border-border bg-surface overflow-hidden', className)}>

      {/* ── Row 1: filters + search + (optional) more-filters btn ──────────────── */}
      <div className="flex items-center gap-2 px-3 py-2.5">

        {/* Search LEFT — only when no other filters exist */}
        {!hasOtherFilters && searchNode}

        {/* Segmented date preset control */}
        {presets && presets.length > 0 && (
          <div className="flex items-center gap-px p-0.5 rounded-full bg-surface-raised border border-border shrink-0">
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

        {/* Custom date range picker — always visible, not hidden behind a button */}
        {showCustomPicker && (
          <div className="shrink-0">
            <DateRangePickerButton
              key={activePreset ?? 'default'}
              selectMode="range"
              showShortcuts
              initialStartDate={dateRange?.startDate ?? null}
              initialEndDate={dateRange?.endDate ?? null}
              onChange={r => { if (r.startDate) onCustomRange!(r) }}
              placeholder="Custom range…"
            />
          </div>
        )}

        <div className="flex-1" />

        {/* Search RIGHT — when other filters exist */}
        {hasOtherFilters && searchNode}

        {/* Divider between search and more-filters when both are present */}
        {hasOtherFilters && onSearchChange !== undefined && hasAdvancedPanel && (
          <div className="self-stretch w-px bg-border mx-0.5 shrink-0" />
        )}

        {/* More filters toggle — only shown when advancedFilters slot has content */}
        {hasAdvancedPanel && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className={cn(
              'flex items-center gap-1.5 h-7 pl-2.5 pr-2 rounded-full border text-xs font-semibold',
              'transition-all duration-150 select-none shrink-0',
              expanded || activeAdvancedCount > 0
                ? 'bg-primary-subtle border-primary-subtle-border text-primary'
                : 'border-border text-muted-fg hover:bg-surface-overlay hover:text-foreground hover:border-border-strong'
            )}
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 9h10M11 14h2" />
            </svg>
            {activeAdvancedCount > 0 ? `More filters · ${activeAdvancedCount}` : 'More filters'}
            <svg
              className={cn('h-3.5 w-3.5 transition-transform duration-200', expanded && 'rotate-180')}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* ── Row 2: status chips — own row so they never wrap into the date row ── */}
      {statusChips && statusChips.length > 0 && (
        <div className="flex items-center gap-1.5 px-3 pb-2.5 overflow-x-auto scrollbar-none">
          {statusChips.map(chip => {
            const isActive = activeStatus === chip.value
            const vc = CHIP_VARIANTS[chip.variant ?? 'default']
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => onStatusChange?.(chip.value)}
                className={cn(
                  'flex-shrink-0 h-7 flex items-center gap-1.5 px-3 rounded-full border text-xs',
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

      {/* ── Advanced panel (max-h transition — reliable cross-browser) ─────────── */}
      {hasAdvancedPanel && (
        <div className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          expanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        )}>
          <div className="border-t border-border bg-surface-raised px-4 py-4">
            <p className="text-[10px] font-bold text-muted-fg uppercase tracking-widest mb-3">
              More filters
            </p>
            <div className="flex flex-wrap items-end gap-4">
              {advancedFilters}
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
