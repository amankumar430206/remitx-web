import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, DataTable, AmountDisplay, LoadingState, ErrorState, DateRangePicker, FilterBar, Timeline } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { Select } from '@/components/ui/atoms/Select'
import { Pagination } from '@/components/ui/atoms/Pagination'
import { ContentCard } from '@/layouts/ContentCard'
import { useAccount, useAccountLedger } from '@/hooks/useAccounts'
import accountsApi from '@/api/accounts'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'
import { format } from 'date-fns'

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
  { value: 'mt940', label: 'MT940' },
]

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)

  const { data: account, isLoading: loadingAccount, isError: accountError } = useAccount(id!)
  const { data: ledgerData, isLoading: loadingLedger } = useAccountLedger(id!, {
    page,
    from: dateRange.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
    to: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
  })

  const handleExport = async () => {
    if (!id || !dateRange.from || !dateRange.to) return
    setExporting(true)
    try {
      const res = await accountsApi.downloadStatement(id, {
        from: format(dateRange.from, 'yyyy-MM-dd'),
        to: format(dateRange.to, 'yyyy-MM-dd'),
        format: exportFormat as 'csv' | 'pdf' | 'mt940',
      })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `statement-${id}.${exportFormat}`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  if (loadingAccount) return <LoadingState />
  if (accountError || !account) return <ErrorState onRetry={() => navigate('/accounts')} />

  const totalPages = ledgerData?.meta?.total ? Math.ceil(ledgerData.meta.total / 20) : 1

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${account.currency} Account`}
        description={`Ref: ${account.provider_account_id ?? account.account_number ?? '—'}`}
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: account.currency }]}
        actions={
          <div className="flex items-center gap-2">
            <Select options={FORMAT_OPTIONS} value={exportFormat} onValueChange={setExportFormat} className="w-28" />
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <Button variant="outline" onClick={handleExport} loading={exporting} disabled={!dateRange.from || !dateRange.to}>
              Export
            </Button>
          </div>
        }
      />

      {/* Balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ContentCard className="col-span-1">
          <p className="text-sm text-muted-fg">Current balance</p>
          <AmountDisplay amount={account.balance} currency={account.currency} size="xl" className="mt-1" />
        </ContentCard>
        <ContentCard className="col-span-2">
          <p className="text-sm font-medium text-muted-fg mb-3">Recent activity</p>
          {(account.recentEntries?.length ?? 0) > 0 ? (
            <Timeline
              events={(account.recentEntries ?? []).slice(0, 5).map(e => ({
                id: e.id,
                status: e.entry_type === 'credit' ? 'completed' : 'processing',
                label: e.description,
                description: `Balance after: ${e.currency} ${parseFloat(e.balance_after).toLocaleString()}`,
                timestamp: e.created_at,
              }))}
            />
          ) : (
            <p className="text-sm text-muted-fg">No recent activity.</p>
          )}
        </ContentCard>
      </div>

      {/* Ledger */}
      <ContentCard padding="none">
        <div className="px-5 py-4 border-b border-border">
          <FilterBar
            filters={<DateRangePicker value={dateRange} onChange={range => { setDateRange(range); setPage(1) }} />}
            hasActiveFilters={!!(dateRange.from || dateRange.to)}
            onReset={() => { setDateRange({}); setPage(1) }}
          />
        </div>
        {loadingLedger ? <LoadingState /> : (
          <>
            <DataTable
              columns={[
                { key: 'created_at', header: 'Date', render: e => <span className="text-xs text-muted-fg">{new Date(e.created_at).toLocaleString()}</span> },
                { key: 'description', header: 'Description' },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: e => (
                    <AmountDisplay
                      amount={e.amount}
                      currency={e.currency}
                      positive={e.entry_type === 'credit'}
                      negative={e.entry_type === 'debit'}
                    />
                  ),
                },
                {
                  key: 'balance_after',
                  header: 'Balance',
                  render: e => <AmountDisplay amount={e.balance_after} currency={e.currency} />,
                },
              ]}
              data={ledgerData?.data ?? []}
              getRowId={e => e.id}
              emptyTitle="No transactions"
              emptyDescription="No ledger entries for this period."
            />
            <Pagination page={page} totalPages={totalPages} total={ledgerData?.meta?.total} pageSize={20} onChange={setPage} />
          </>
        )}
      </ContentCard>
    </div>
  )
}
