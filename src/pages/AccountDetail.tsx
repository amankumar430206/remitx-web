import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader, DataTable, AmountDisplay, LoadingState, ErrorState, DateRangePicker, FilterBar, Timeline } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
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

const CURRENCY_GRADIENT: Record<string, string> = {
  USD: 'from-blue-600 to-blue-800',
  GBP: 'from-violet-600 to-violet-800',
  EUR: 'from-indigo-600 to-indigo-800',
  AED: 'from-emerald-600 to-emerald-800',
  INR: 'from-orange-500 to-orange-700',
}
const currencyGradient = (c: string) => CURRENCY_GRADIENT[c] ?? 'from-slate-600 to-slate-800'

const CURRENCY_FLAG: Record<string, string> = {
  USD: '🇺🇸', GBP: '🇬🇧', EUR: '🇪🇺', AED: '🇦🇪', INR: '🇮🇳',
}

function MetaPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-fg">
        {icon}
        {label}
      </div>
      <p className="truncate text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

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
  const gradient = currencyGradient(account.currency)
  const flag = CURRENCY_FLAG[account.currency] ?? '💱'

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${account.currency} Account`}
        description={`Ref: ${account.provider_account_id ?? account.account_number ?? '—'}`}
        breadcrumbs={[{ label: 'Accounts', href: '/accounts' }, { label: account.currency }]}
        actions={
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setAdjustOpen(true)}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Adjust balance
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} title="Refresh">
              <svg className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </Button>
          </div>
        }
      />

      {/* ── Hero balance card ── */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-8 text-white shadow-lg`}>
        {/* Decorative circles */}
        <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-36 w-36 rounded-full bg-white/5" />
        <div className="pointer-events-none absolute right-32 bottom-0 h-24 w-24 rounded-full bg-white/5" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{flag}</span>
              <div>
                <p className="text-sm font-medium text-white/70">Available balance</p>
                <p className="text-xs text-white/50">{account.currency} account</p>
              </div>
            </div>
            <div className="font-mono text-5xl font-extrabold tracking-tight tabular-nums">
              <AmountDisplay amount={account.balance} currency={account.currency} size="xl" className="text-white [&_*]:text-white" />
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
              account.status === 'active'
                ? 'bg-white/20 text-white'
                : 'bg-black/20 text-white/70'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${account.status === 'active' ? 'bg-emerald-400' : 'bg-white/40'}`} />
              {account.status}
            </span>
            <p className="text-xs text-white/50">
              Opened {new Date(account.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>

      {/* ── Meta pills ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetaPill
          icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>}
          label="Currency"
          value={account.currency}
        />
        <MetaPill
          icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" /></svg>}
          label="Account ref"
          value={account.provider_account_id ?? account.account_number ?? '—'}
        />
        <MetaPill
          icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          label="Status"
          value={account.status.charAt(0).toUpperCase() + account.status.slice(1)}
        />
        <MetaPill
          icon={<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" /></svg>}
          label="Opened"
          value={new Date(account.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        />
      </div>

      {/* ── Recent activity + export ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <ContentCard className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Recent activity</p>
            <span className="text-xs text-muted-fg">{account.recentEntries?.length ?? 0} latest entries</span>
          </div>
          {(account.recentEntries?.length ?? 0) > 0 ? (
            <Timeline
              events={(account.recentEntries ?? []).slice(0, 5).map(e => ({
                id: e.id,
                status: e.entry_type === 'credit' ? 'completed' : 'processing',
                label: e.description,
                description: `Balance after: ${e.currency} ${parseFloat(e.balance_after).toLocaleString('en', { minimumFractionDigits: 2 })}`,
                timestamp: e.created_at,
              }))}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
              </div>
              <p className="text-sm text-muted-fg">No recent activity</p>
            </div>
          )}
        </ContentCard>

        {/* Export statement */}
        <ContentCard>
          <p className="mb-1 text-sm font-semibold text-foreground">Export statement</p>
          <p className="mb-4 text-xs text-muted-fg">Download a dated range statement for reconciliation or compliance.</p>
          <div className="flex flex-col gap-3">
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-fg">Format</p>
              <Select options={FORMAT_OPTIONS} value={exportFormat} onValueChange={setExportFormat} />
            </div>
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-fg">Date range</p>
              <DateRangePicker value={dateRange} onChange={setDateRange} />
            </div>
            <Button
              onClick={handleExport}
              loading={exporting}
              disabled={!dateRange.from || !dateRange.to}
              className="w-full"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              {exporting ? 'Exporting…' : `Download ${exportFormat.toUpperCase()}`}
            </Button>
            {(!dateRange.from || !dateRange.to) && (
              <p className="text-center text-xs text-muted-fg">Select a date range to enable export</p>
            )}
          </div>
        </ContentCard>
      </div>

      {/* ── Ledger ── */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Ledger</p>
            {ledgerData?.meta?.total !== undefined && (
              <p className="text-xs text-muted-fg">{ledgerData.meta.total.toLocaleString()} entries total</p>
            )}
          </div>
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
                {
                  key: 'created_at',
                  header: 'Date & time',
                  render: e => (
                    <div className="flex flex-col">
                      <span className="text-xs font-medium text-foreground">
                        {new Date(e.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className="text-xs text-muted-fg">
                        {new Date(e.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  header: 'Description',
                  render: e => (
                    <div className="flex items-center gap-2">
                      <span className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs ${
                        e.entry_type === 'credit'
                          ? 'bg-success text-success-fg'
                          : 'bg-danger text-danger-fg'
                      }`}>
                        {e.entry_type === 'credit' ? '↓' : '↑'}
                      </span>
                      <span className="text-sm">{e.description}</span>
                    </div>
                  ),
                },
                {
                  key: 'amount',
                  header: 'Amount',
                  render: e => (
                    <AmountDisplay
                      amount={e.amount}
                      currency={e.currency}
                      positive={e.entry_type === 'credit'}
                      negative={e.entry_type === 'debit'}
                      size="sm"
                    />
                  ),
                },
                {
                  key: 'balance_after',
                  header: 'Balance after',
                  render: e => (
                    <AmountDisplay amount={e.balance_after} currency={e.currency} size="sm" />
                  ),
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

      {/* ── Adjust balance dialog ── */}
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
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-muted p-1">
            {(['credit', 'debit'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setAdjustType(t)}
                className={`rounded-lg py-2 text-sm font-semibold capitalize transition-all duration-150 ${
                  adjustType === t
                    ? t === 'credit'
                      ? 'bg-white shadow-sm text-success-fg dark:bg-surface'
                      : 'bg-white shadow-sm text-danger-fg dark:bg-surface'
                    : 'text-muted-fg hover:text-foreground'
                }`}
              >
                {t === 'credit' ? '＋ Credit' : '－ Debit'}
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
              className="font-mono text-lg"
            />
          </FormField>

          <FormField label="Reason / description" required htmlFor="adj-desc">
            <Input
              id="adj-desc"
              placeholder="e.g. Manual top-up, fee reversal…"
              value={adjustDesc}
              onChange={e => setAdjustDesc(e.target.value)}
            />
          </FormField>

          {adjustError && (
            <div className="flex items-center gap-2 rounded-lg border border-danger-border bg-danger px-3 py-2">
              <svg className="h-4 w-4 flex-shrink-0 text-danger-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-sm text-danger-fg">{adjustError}</p>
            </div>
          )}
        </div>
      </ConfirmDialog>
    </div>
  )
}
