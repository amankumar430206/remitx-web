import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import type { ActiveFilterChip, StatusChipOption } from '@/components/ui/organisms/SmartFilterBar'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Pagination } from '@/components/ui/atoms/Pagination'
import { ContentCard } from '@/layouts/ContentCard'
import { useTransactions } from '@/hooks/useReports'
import reportsApi from '@/api/reports'
import { toLocalDateStr } from '@/lib/utils'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'
import type { Column } from '@/components/ui/organisms/DataTable'
import type { TransactionRow } from '@/api/reports'

type Preset = '7d' | '30d' | '3m' | '6m' | 'ytd' | 'custom'

const PRESETS: { label: string; value: Preset }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '3 months', value: '3m' },
  { label: '6 months', value: '6m' },
  { label: 'Year to date', value: 'ytd' },
]

function presetToRange(preset: Preset): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)

  if (preset === '7d') startDate.setDate(today.getDate() - 6)
  else if (preset === '30d') startDate.setDate(today.getDate() - 29)
  else if (preset === '3m') startDate.setMonth(today.getMonth() - 3)
  else if (preset === '6m') startDate.setMonth(today.getMonth() - 6)
  else if (preset === 'ytd') startDate.setMonth(0, 1)

  return { startDate, endDate: today }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
}

const DIRECTION_CHIPS: StatusChipOption[] = [
  { label: 'All',    value: '',       variant: 'none'    },
  { label: 'Debit',  value: 'debit',  variant: 'danger'  },
  { label: 'Credit', value: 'credit', variant: 'success' },
]

function DirectionBadge({ direction }: { direction: 'debit' | 'credit' }) {
  return direction === 'debit' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 border border-danger/20 px-2 py-0.5 text-[11px] font-semibold text-danger-fg">
      <span className="text-[9px]">▼</span> Debit
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-[11px] font-semibold text-success-fg">
      <span className="text-[9px]">▲</span> Credit
    </span>
  )
}

const columns: Column<TransactionRow>[] = [
  {
    key: 'id',
    header: 'Type',
    render: () => <DirectionBadge direction="debit" />,
  },
  {
    key: 'created_at',
    header: 'Date',
    render: row => <span className="text-xs text-muted-fg">{new Date(row.created_at).toLocaleDateString()}</span>,
  },
  {
    key: 'purpose_code',
    header: 'Purpose',
    render: row => <span className="capitalize text-sm">{row.purpose_code?.toLowerCase().replace(/_/g, ' ') ?? '—'}</span>,
  },
  {
    key: 'source_amount',
    header: 'You sent',
    render: row => (
      <span className="font-mono text-sm text-danger-fg">
        −{row.source_amount} {row.source_currency}
      </span>
    ),
  },
  {
    key: 'dest_amount',
    header: 'Recipient got',
    render: row => (
      <span className="font-mono text-sm text-success-fg">
        +{row.dest_amount} {row.dest_currency}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: row => (
      <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">
        {row.status.replace(/_/g, ' ')}
      </Badge>
    ),
  },
]

export function Transactions() {
  const [page, setPage] = useState(1)
  const [preset, setPreset] = useState<Preset>('30d')
  const [dateRange, setDateRange] = useState<DateRange>(() => presetToRange('30d'))
  const [search, setSearch] = useState('')
  const [direction, setDirection] = useState('')
  const [exporting, setExporting] = useState(false)

  const handlePreset = (p: Preset) => {
    setPreset(p)
    setDateRange(presetToRange(p))
    setPage(1)
  }

  const handleCustomRange = (range: DateRange) => {
    if (range.startDate) { setPreset('custom'); setDateRange(range); setPage(1) }
  }

  const clearAll = () => { setSearch(''); setDirection(''); handlePreset('30d') }

  const activeChips = useMemo<ActiveFilterChip[]>(() => [
    ...(direction ? [{
      key: 'direction',
      label: direction.charAt(0).toUpperCase() + direction.slice(1),
      onRemove: () => { setDirection(''); setPage(1) },
    }] : []),
    ...(preset !== '30d' ? [{
      key: 'date',
      label: preset === 'custom' && dateRange.startDate && dateRange.endDate
        ? `${fmtDate(dateRange.startDate)} → ${fmtDate(dateRange.endDate)}`
        : PRESETS.find(p => p.value === preset)?.label ?? preset,
      onRemove: () => handlePreset('30d'),
    }] : []),
    ...(search ? [{
      key: 'search',
      label: `"${search}"`,
      onRemove: () => setSearch(''),
    }] : []),
  ], [direction, preset, dateRange, search])

  const params = {
    page,
    limit: 20,
    direction: direction as 'debit' | 'credit' | undefined || undefined,
    from: dateRange.startDate ? toLocalDateStr(dateRange.startDate) : undefined,
    to: dateRange.endDate ? toLocalDateStr(dateRange.endDate) : undefined,
  }

  const { data, isLoading } = useTransactions(params)
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      const res = await reportsApi.transactionsExport({ ...params, format })
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transaction report"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Transactions' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" loading={exporting} onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" loading={exporting} onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
          </div>
        }
      />

      <SmartFilterBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search transactions…"
        presets={PRESETS}
        activePreset={preset}
        onPresetChange={p => handlePreset(p as Preset)}
        dateRange={dateRange}
        onCustomRange={handleCustomRange}
        advancedFilters={
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-fg">Type</label>
            <div className="flex gap-1.5">
              {DIRECTION_CHIPS.map(chip => (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => { setDirection(chip.value); setPage(1) }}
                  className={[
                    'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                    direction === chip.value
                      ? chip.value === 'debit'
                        ? 'bg-danger/10 border-danger/30 text-danger-fg'
                        : chip.value === 'credit'
                        ? 'bg-success/10 border-success/30 text-success-fg'
                        : 'bg-primary text-primary-fg border-primary'
                      : 'bg-surface border-border text-muted-fg hover:text-foreground hover:border-border-strong',
                  ].join(' ')}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>
        }
        activeAdvancedCount={direction ? 1 : 0}
        activeChips={activeChips}
        onClearAll={activeChips.length > 0 ? clearAll : undefined}
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          emptyTitle="No transactions found"
        />
      </ContentCard>

      <ContentCard padding="none">
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onChange={setPage} />
      </ContentCard>
    </div>
  )
}
