import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FilterBar } from '@/components/ui/organisms/FilterBar'
import { DateRangePicker } from '@/components/ui/molecules/DateRangePicker'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useTransactions } from '@/hooks/useReports'
import reportsApi from '@/api/reports'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'
import type { Column } from '@/components/ui/organisms/DataTable'
import type { TransactionRow } from '@/api/reports'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success',
  pending: 'warning',
  failed: 'danger',
}

const columns: Column<TransactionRow>[] = [
  {
    key: 'date',
    header: 'Date',
    render: row => new Date(row.date).toLocaleDateString(),
  },
  { key: 'description', header: 'Description' },
  {
    key: 'amount',
    header: 'Amount',
    render: row => (
      <span className={row.type === 'credit' ? 'text-success-fg font-medium' : 'text-danger-fg font-medium'}>
        {row.type === 'credit' ? '+' : '−'}{row.amount} {row.currency}
      </span>
    ),
  },
  { key: 'balance', header: 'Balance', render: row => `${row.balance} ${row.currency}` },
  {
    key: 'status',
    header: 'Status',
    render: row => (
      <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">
        {row.status}
      </Badge>
    ),
  },
]

export function Transactions() {
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)

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

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search transactions…"
        filters={
          <DateRangePicker
            value={dateRange}
            onChange={setDateRange}
            placeholder="All dates"
          />
        }
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          emptyTitle="No transactions found"
        />
      </ContentCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-fg">
          <span>{total} transactions</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>
              Previous
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
