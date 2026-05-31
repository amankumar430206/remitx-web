import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import type { ActiveFilterChip } from '@/components/ui/organisms/SmartFilterBar'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { EmptyState } from '@/components/ui/molecules/EmptyState'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useReconciliation } from '@/hooks/useReports'
import { toLocalDateStr } from '@/lib/utils'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'

type Preset = '7d' | '30d' | '3m' | '6m' | 'ytd' | 'custom'

const PRESETS: { label: string; value: Preset }[] = [
  { label: '7 days',      value: '7d'  },
  { label: '30 days',     value: '30d' },
  { label: '3 months',    value: '3m'  },
  { label: '6 months',    value: '6m'  },
  { label: 'Year to date',value: 'ytd' },
]

function presetToRange(preset: Preset): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  if (preset === '7d')  startDate.setDate(today.getDate() - 6)
  else if (preset === '30d') startDate.setDate(today.getDate() - 29)
  else if (preset === '3m')  startDate.setMonth(today.getMonth() - 3)
  else if (preset === '6m')  startDate.setMonth(today.getMonth() - 6)
  else if (preset === 'ytd') startDate.setMonth(0, 1)
  return { startDate, endDate: today }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function Reconciliation() {
  const [preset, setPreset]       = useState<Preset>('30d')
  const [dateRange, setDateRange] = useState<DateRange>(() => presetToRange('30d'))

  const handlePreset = (p: Preset) => { setPreset(p); setDateRange(presetToRange(p)) }
  const handleCustomRange = (range: DateRange) => {
    if (range.startDate) { setPreset('custom'); setDateRange(range) }
  }
  const clearAll = () => handlePreset('30d')

  const activeChips = useMemo<ActiveFilterChip[]>(() => [
    ...(preset !== '30d' ? [{
      key: 'date',
      label: preset === 'custom' && dateRange.startDate && dateRange.endDate
        ? `${fmtDate(dateRange.startDate)} → ${fmtDate(dateRange.endDate)}`
        : PRESETS.find(p => p.value === preset)?.label ?? preset,
      onRemove: () => handlePreset('30d'),
    }] : []),
  ], [preset, dateRange])

  const params = {
    from: dateRange.startDate ? toLocalDateStr(dateRange.startDate) : undefined,
    to:   dateRange.endDate ? toLocalDateStr(dateRange.endDate) : undefined,
  }

  const { data: rows, isLoading } = useReconciliation(params)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reconciliation"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Reconciliation' }]}
      />

      <SmartFilterBar
        presets={PRESETS}
        activePreset={preset}
        onPresetChange={p => handlePreset(p as Preset)}
        dateRange={dateRange}
        onCustomRange={handleCustomRange}
        activeChips={activeChips}
        onClearAll={activeChips.length > 0 ? clearAll : undefined}
      />

      {isLoading ? (
        <LoadingState message="Loading reconciliation data…" />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          title="No reconciliation data"
          description="Select a date range to view reconciliation."
        />
      ) : (
        <ContentCard padding="none">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-fg">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Payments</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Total amount</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Matched</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Unmatched</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-fg">Exceptions</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-fg">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const exceptionCount = Array.isArray(row.exceptions) ? row.exceptions.length : 0
                  return (
                    <tr
                      key={row.report_date}
                      className={`border-b border-border last:border-0 ${exceptionCount > 0 ? 'bg-warning/5' : ''}`}
                    >
                      <td className="px-4 py-3 text-foreground font-medium">
                        {new Date(row.report_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-mono text-xs">
                        {row.total_payments}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-mono text-xs">
                        {parseFloat(row.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-success-fg font-mono text-xs">
                        {row.matched_count}
                      </td>
                      <td className="px-4 py-3 text-right text-danger-fg font-mono text-xs">
                        {row.unmatched_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exceptionCount > 0 ? (
                          <Badge variant="warning">{exceptionCount}</Badge>
                        ) : (
                          <span className="text-muted-fg text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={row.status === 'matched' ? 'success' : 'warning'} className="capitalize">
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}
    </div>
  )
}
