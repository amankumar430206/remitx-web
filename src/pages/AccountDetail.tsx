import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, DataTable, AmountDisplay, LoadingState, ErrorState, DateRangePicker, FilterBar, Timeline } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { Select } from '@/components/ui/atoms/Select'
import { Pagination } from '@/components/ui/atoms/Pagination'
import { ContentCard } from '@/layouts/ContentCard'
import { useAccount, useAccountLedger, useAdjustBalance } from '@/hooks/useAccounts'
import accountsApi from '@/api/accounts'
import { useAuthStore } from '@/stores/authStore'
import { getApiError } from '@/lib/apiError'
import { Input } from '@/components/ui/atoms/Input'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { FormField } from '@/components/ui/molecules/FormField'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'
import { format } from 'date-fns'

const FORMAT_OPTIONS = [
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
  { value: 'mt940', label: 'MT940' },
]

const ADMIN_ROLES = new Set(['super_admin', 'client_admin'])

export function AccountDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const isAdmin = ADMIN_ROLES.has(user?.role ?? '')

  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState<DateRange>({})
  const [exportFormat, setExportFormat] = useState('csv')
  const [exporting, setExporting] = useState(false)

  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustType, setAdjustType] = useState<'credit' | 'debit'>('credit')
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustDesc, setAdjustDesc] = useState('')
  const [adjustError, setAdjustError] = useState('')

  const adjustMutation = useAdjustBalance(id!)

  const { data: account, isLoading: loadingAccount, isError: accountError, refetch, isFetching } = useAccount(id!)
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

  const closeAdjust = () => {
    setAdjustOpen(false)
    setAdjustAmount('')
    setAdjustDesc('')
    setAdjustError('')
    setAdjustType('credit')
  }

  const handleAdjust = () => {
    setAdjustError('')
    const amt = parseFloat(adjustAmount)
    if (!adjustAmount || isNaN(amt) || amt <= 0) {
      setAdjustError('Enter a valid positive amount.')
      return
    }
    if (!adjustDesc.trim()) {
      setAdjustError('Description is required.')
      return
    }
    adjustMutation.mutate(
      { type: adjustType, amount: adjustAmount, description: adjustDesc.trim() },
      {
        onSuccess: closeAdjust,
        onError: (err) => setAdjustError(getApiError(err, 'Adjustment failed. Please try again.')),
      }
    )
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
            {isAdmin && (
              <Button variant="outline" onClick={() => setAdjustOpen(true)}>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adjust balance
              </Button>
            )}
            <Button variant="outline" onClick={() => refetch()} disabled={isFetching} title="Refresh balance">
              <svg className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
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

      {/* Adjust balance dialog — admin only */}
      <ConfirmDialog
        open={adjustOpen}
        onOpenChange={open => { if (!open) closeAdjust() }}
        title="Adjust balance"
        description={`Manually credit or debit the ${account.currency} account. A ledger entry will be created with the reason you provide.`}
        confirmLabel={adjustType === 'credit' ? 'Credit account' : 'Debit account'}
        variant={adjustType === 'debit' ? 'danger' : 'primary'}
        onConfirm={handleAdjust}
        loading={adjustMutation.isPending}
      >
        <div className="flex flex-col gap-4">
          {/* Credit / Debit toggle */}
          <div className="flex rounded-lg border border-border overflow-hidden">
            {(['credit', 'debit'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setAdjustType(t)}
                className={`flex-1 py-2 text-sm font-semibold capitalize transition-colors ${
                  adjustType === t
                    ? t === 'credit'
                      ? 'bg-success text-success-fg'
                      : 'bg-danger text-danger-fg'
                    : 'bg-surface text-muted-fg hover:bg-surface/80'
                }`}
              >
                {t === 'credit' ? '+ Credit' : '− Debit'}
              </button>
            ))}
          </div>

          <FormField label={`Amount (${account.currency})`} required htmlFor="adj-amount">
            <Input
              id="adj-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={adjustAmount}
              onChange={e => setAdjustAmount(e.target.value)}
              className="font-mono"
            />
          </FormField>

          <FormField label="Reason / description" required htmlFor="adj-desc">
            <Input
              id="adj-desc"
              placeholder="e.g. Manual top-up, Fee reversal…"
              value={adjustDesc}
              onChange={e => setAdjustDesc(e.target.value)}
            />
          </FormField>

          {adjustError && (
            <p className="text-sm text-danger-fg">{adjustError}</p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  )
}
