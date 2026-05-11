import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { PageHeader, AmountDisplay, LoadingState, ErrorState, ConfirmDialog, FormField } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Select } from '@/components/ui/atoms/Select'
import { useAccounts } from '@/hooks/useAccounts'
import accountsApi, { type Account } from '@/api/accounts'

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

const CURRENCY_META: Record<string, { flag: string; color: string; bg: string; border: string }> = {
  USD: { flag: '🇺🇸', color: 'text-blue-700 dark:text-blue-400',   bg: 'bg-blue-50 dark:bg-blue-950/40',   border: 'border-blue-200 dark:border-blue-800' },
  GBP: { flag: '🇬🇧', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800' },
  EUR: { flag: '🇪🇺', color: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-800' },
  AED: { flag: '🇦🇪', color: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
  INR: { flag: '🇮🇳', color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800' },
}
const currencyMeta = (c: string) => CURRENCY_META[c] ?? { flag: '💱', color: 'text-slate-700 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-900/40', border: 'border-slate-200 dark:border-slate-700' }

function AccountCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const meta = currencyMeta(account.currency)
  const isActive = account.status === 'active'

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-4 rounded-xl border border-border bg-surface p-5 text-left transition-all duration-150 hover:border-primary/40 hover:shadow-[0_4px_24px_-4px_rgba(37,99,235,0.12)] hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 ${meta.bg} ${meta.border}`}>
          <span className="text-base leading-none">{meta.flag}</span>
          <span className={`text-sm font-bold tracking-wide ${meta.color}`}>{account.currency}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-success-fg' : 'bg-muted-fg'}`} />
          <span className="text-xs font-medium capitalize text-muted-fg">{account.status}</span>
        </div>
      </div>

      {/* Balance */}
      <div>
        <p className="mb-0.5 text-xs font-medium uppercase tracking-widest text-muted-fg">Available balance</p>
        <AmountDisplay amount={account.balance} currency={account.currency} size="xl" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-mono text-xs text-muted-fg">
          {account.provider_account_id ?? account.account_number ?? 'No ref'}
        </span>
        <div className="flex items-center gap-1 text-xs text-muted-fg opacity-0 transition-opacity group-hover:opacity-100">
          <span>View</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>

      {/* Hover accent line */}
      <div className="absolute inset-x-0 top-0 h-px rounded-t-xl bg-gradient-to-r from-transparent via-primary/50 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
    </button>
  )
}

function SummaryBar({ accounts }: { accounts: Account[] }) {
  const active = accounts.filter(a => a.status === 'active').length
  const currencies = new Set(accounts.map(a => a.currency)).size

  return (
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: 'Total accounts', value: accounts.length, sub: `${active} active` },
        { label: 'Currencies', value: currencies, sub: 'unique currencies' },
        { label: 'Status', value: active === accounts.length ? 'All active' : `${accounts.length - active} inactive`, sub: 'account health', highlight: active === accounts.length },
      ].map(item => (
        <div key={item.label} className="flex flex-col gap-1 rounded-xl border border-border bg-surface px-5 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-fg">{item.label}</p>
          <p className={`text-2xl font-bold tabular-nums ${item.highlight ? 'text-success-fg' : 'text-foreground'}`}>
            {item.value}
          </p>
          <p className="text-xs text-muted-fg">{item.sub}</p>
        </div>
      ))}
    </div>
  )
}

export function AccountList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: accounts = [], isLoading, isError, isFetching } = useAccounts()
  const [createOpen, setCreateOpen] = useState(false)
  const [currency, setCurrency] = useState('')

  const createMutation = useMutation({
    mutationFn: (c: string) => accountsApi.create(c),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      setCreateOpen(false)
      setCurrency('')
    },
  })

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Accounts"
        description="Multi-currency accounts and ledger balances."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })}
              disabled={isFetching}
            >
              <svg className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isFetching ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              New account
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState onRetry={() => queryClient.invalidateQueries({ queryKey: ['accounts'] })} />
      ) : accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-subtle">
            <svg className="h-7 w-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No accounts yet</p>
            <p className="mt-1 text-sm text-muted-fg">Provision your first currency account to start transacting.</p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>Create first account</Button>
        </div>
      ) : (
        <>
          <SummaryBar accounts={accounts} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {accounts.map(account => (
              <AccountCard
                key={account.id}
                account={account}
                onClick={() => navigate(`/accounts/${account.id}`)}
              />
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={createOpen}
        onOpenChange={open => { setCreateOpen(open); if (!open) setCurrency('') }}
        title="Open a new account"
        description="Choose the currency for your new ledger account. You can provision multiple currencies."
        confirmLabel="Open account"
        onConfirm={() => currency && createMutation.mutate(currency)}
        loading={createMutation.isPending}
      >
        <FormField label="Currency" htmlFor="new-currency" required>
          <Select id="new-currency" options={CURRENCIES} value={currency} onValueChange={setCurrency} placeholder="Select currency…" />
        </FormField>
      </ConfirmDialog>
    </div>
  )
}
