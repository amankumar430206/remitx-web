import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import type { ActiveFilterChip } from '@/components/ui/organisms/SmartFilterBar'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
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


const columns: Column<TransactionRow>[] = [
  {
    key: 'reference',
    header: 'Reference',
    render: row => (
      <span className="font-mono text-xs font-semibold text-foreground tracking-wide">
        {row.reference ?? '—'}
      </span>
    ),
  },
  {
    key: 'created_at',
    header: 'Date',
    render: row => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
        {row.completed_at && (
          <span className="text-[10px] text-muted-fg">
            Settled {new Date(row.completed_at).toLocaleDateString()}
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'beneficiary_id',
    header: 'Beneficiary',
    render: row => row.beneficiary_name ? (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{row.beneficiary_name}</span>
        {row.beneficiary_country && (
          <span className="text-[10px] text-muted-fg uppercase tracking-wide">{row.beneficiary_country}</span>
        )}
      </div>
    ) : (
      <span className="text-xs text-muted-fg">—</span>
    ),
  },
  {
    key: 'source_amount',
    header: 'You sent',
    render: row => <AmountDisplay amount={row.source_amount} currency={row.source_currency} negative />,
  },
  {
    key: 'dest_amount',
    header: 'Recipient got',
    render: row => <AmountDisplay amount={row.dest_amount} currency={row.dest_currency} positive />,
  },
  {
    key: 'exchange_rate',
    header: 'Rate',
    render: row => (
      <span className="font-mono text-xs text-muted-fg tabular-nums">
        {parseFloat(row.exchange_rate).toFixed(4)}
      </span>
    ),
  },
  {
    key: 'fee_amount',
    header: 'Fee',
    render: row => (
      <span className="font-mono text-xs tabular-nums text-foreground">
        {parseFloat(row.fee_amount) === 0
          ? <span className="text-muted-fg">Free</span>
          : <AmountDisplay amount={row.fee_amount} currency={row.source_currency} />}
      </span>
    ),
  },
  {
    key: 'purpose_code',
    header: 'Purpose',
    render: row => (
      <span className="capitalize text-xs text-muted-fg">
        {row.purpose_code?.toLowerCase().replace(/_/g, ' ') ?? '—'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: row => <StatusBadge status={row.status} />,
  },
]

export function Transactions() {
  const [page, setPage] = useState(1)
  const [preset, setPreset] = useState<Preset>('30d')
  const [dateRange, setDateRange] = useState<DateRange>(() => presetToRange('30d'))
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const handlePreset = (p: Preset) => {
    setPreset(p)
    setDateRange(presetToRange(p))
    setPage(1)
  }

  const handleCustomRange = (range: DateRange) => {
    if (range.startDate) { setPreset('custom'); setDateRange(range); setPage(1) }
  }

  const clearAll = () => { setSearch(''); handlePreset('30d') }

  const activeChips = useMemo<ActiveFilterChip[]>(() => [
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
  ], [preset, dateRange, search])

  const params = {
    page,
    limit: 20,
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
        dateRange={preset === 'custom' ? dateRange : undefined}
        onCustomRange={handleCustomRange}
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
