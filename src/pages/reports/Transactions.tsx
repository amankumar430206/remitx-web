import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FilterBar } from '@/components/ui/organisms/FilterBar'
import { DateRangePicker } from '@/components/ui/molecules/DateRangePicker'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Pagination } from '@/components/ui/atoms/Pagination'
import { ContentCard } from '@/layouts/ContentCard'
import { useTransactions } from '@/hooks/useReports'
import reportsApi from '@/api/reports'
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
  const from = new Date(today)

  if (preset === '7d') from.setDate(today.getDate() - 6)
  else if (preset === '30d') from.setDate(today.getDate() - 29)
  else if (preset === '3m') from.setMonth(today.getMonth() - 3)
  else if (preset === '6m') from.setMonth(today.getMonth() - 6)
  else if (preset === 'ytd') from.setMonth(0, 1)

  return { from, to: today }
}

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
}

const columns: Column<TransactionRow>[] = [
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
  const [exporting, setExporting] = useState(false)

  const handlePreset = (p: Preset) => {
    setPreset(p)
    setDateRange(presetToRange(p))
    setPage(1)
  }

  const handleCustomRange = (range: DateRange) => {
    setPreset('custom')
    setDateRange(range)
    setPage(1)
  }

  const params = {
    page,
    limit: 20,
    from: dateRange.from ? dateRange.from.toISOString().slice(0, 10) : undefined,
    to: dateRange.to ? dateRange.to.toISOString().slice(0, 10) : undefined,
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

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {PRESETS.map(p => (
            <Button
              key={p.value}
              size="sm"
              variant={preset === p.value ? 'primary' : 'outline'}
              onClick={() => handlePreset(p.value)}
            >
              {p.label}
            </Button>
          ))}
          <DateRangePicker
            value={preset === 'custom' ? dateRange : {}}
            onChange={handleCustomRange}
            placeholder="Custom range…"
          />
        </div>
        <FilterBar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search transactions…"
        />
      </div>

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
