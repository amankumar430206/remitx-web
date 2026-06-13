import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { PageHeader, AmountDisplay, LoadingState, ErrorState, ConfirmDialog, FormField } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Select } from '@/components/ui/atoms/Select'
import { Input } from '@/components/ui/atoms/Input'
import { useAccounts } from '@/hooks/useAccounts'
import accountsApi, { type Account } from '@/api/accounts'

const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'AED', label: 'AED — UAE Dirham' },
  { value: 'INR', label: 'INR — Indian Rupee' },
]

const CURRENCY_META: Record<string, {
  flag: string
  cardGradient: string   // full card bg gradient (theme-neutral)
  chipGradient: string   // currency chip bg
  chipBorder: string
  chipText: string
  accentFrom: string     // top accent line color
  dot: string            // status dot color override
}> = {
  USD: {
    flag: '🇺🇸',
    cardGradient: 'from-blue-500/[0.13] via-blue-400/[0.06] to-indigo-500/[0.04]',
    chipGradient: 'from-blue-500/25 to-blue-600/20',
    chipBorder:   'border-blue-500/30',
    chipText:     'text-blue-500 dark:text-blue-400',
    accentFrom:   'from-blue-500/0 via-blue-400/70 to-blue-500/0',
    dot:          'bg-blue-400',
  },
  GBP: {
    flag: '🇬🇧',
    cardGradient: 'from-violet-500/[0.13] via-violet-400/[0.06] to-purple-500/[0.04]',
    chipGradient: 'from-violet-500/25 to-violet-600/20',
    chipBorder:   'border-violet-500/30',
    chipText:     'text-violet-500 dark:text-violet-400',
    accentFrom:   'from-violet-500/0 via-violet-400/70 to-violet-500/0',
    dot:          'bg-violet-400',
  },
  EUR: {
    flag: '🇪🇺',
    cardGradient: 'from-indigo-500/[0.13] via-indigo-400/[0.06] to-blue-500/[0.04]',
    chipGradient: 'from-indigo-500/25 to-indigo-600/20',
    chipBorder:   'border-indigo-500/30',
    chipText:     'text-indigo-500 dark:text-indigo-400',
    accentFrom:   'from-indigo-500/0 via-indigo-400/70 to-indigo-500/0',
    dot:          'bg-indigo-400',
  },
  AED: {
    flag: '🇦🇪',
    cardGradient: 'from-emerald-500/[0.13] via-emerald-400/[0.06] to-teal-500/[0.04]',
    chipGradient: 'from-emerald-500/25 to-emerald-600/20',
    chipBorder:   'border-emerald-500/30',
    chipText:     'text-emerald-600 dark:text-emerald-400',
    accentFrom:   'from-emerald-500/0 via-emerald-400/70 to-emerald-500/0',
    dot:          'bg-emerald-400',
  },
  INR: {
    flag: '🇮🇳',
    cardGradient: 'from-orange-500/[0.13] via-orange-400/[0.06] to-amber-500/[0.04]',
    chipGradient: 'from-orange-500/25 to-orange-600/20',
    chipBorder:   'border-orange-500/30',
    chipText:     'text-orange-600 dark:text-orange-400',
    accentFrom:   'from-orange-500/0 via-orange-400/70 to-orange-500/0',
    dot:          'bg-orange-400',
  },
}
const DEFAULT_META = {
  flag: '💱',
  cardGradient: 'from-slate-500/[0.10] via-slate-400/[0.05] to-transparent',
  chipGradient: 'from-slate-500/20 to-slate-600/15',
  chipBorder:   'border-slate-500/25',
  chipText:     'text-slate-500 dark:text-slate-400',
  accentFrom:   'from-slate-500/0 via-slate-400/60 to-slate-500/0',
  dot:          'bg-slate-400',
}
const currencyMeta = (c: string) => CURRENCY_META[c] ?? DEFAULT_META

function AccountCard({ account, onClick }: { account: Account; onClick: () => void }) {
  const meta = currencyMeta(account.currency)
  const isActive = account.status === 'active'

  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111827] p-5 text-left shadow-md transition-all duration-200 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      {/* Per-currency gradient wash */}
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${meta.cardGradient}`} />
      {/* Bottom-right ambient blob */}
      <div className={`pointer-events-none absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-gradient-to-br ${meta.cardGradient} blur-2xl opacity-70`} />

      {/* Top row */}
      <div className="relative flex items-start justify-between gap-2">
        <div className={`flex items-center gap-2 rounded-lg border bg-gradient-to-br px-3 py-1.5 ${meta.chipBorder} ${meta.chipGradient}`}>
          <span className="text-sm leading-none">{meta.flag}</span>
          <span className={`text-sm font-bold tracking-wide ${meta.chipText}`}>{account.currency}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-slate-500'}`} />
          <span className="text-xs font-medium capitalize text-slate-400">{account.status}</span>
        </div>
      </div>

      {/* Balance */}
      <div className="relative">
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500">Available balance</p>
        <div className="[&_.text-foreground]:!text-white [&_.text-muted-fg]:!text-slate-500">
          <AmountDisplay amount={account.balance} currency={account.currency} size="xl" />
        </div>
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between border-t border-white/[0.07] pt-3">
        <span className="font-mono text-xs text-slate-500 truncate max-w-[60%]">
          {account.label || account.provider_account_id || account.account_number || 'No ref'}
        </span>
        <div className="flex items-center gap-1 text-xs text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
          <span>View</span>
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      </div>

      {/* Hover accent top line */}
      <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${meta.accentFrom} opacity-0 transition-opacity group-hover:opacity-100`} />
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

const FEES = [
  { label: 'Account opening',     value: 'Free' },
  { label: 'Monthly maintenance', value: 'Free' },
  { label: 'Incoming transfers',  value: 'Free' },
  { label: 'Outgoing transfers',  value: 'Platform rate' },
  { label: 'FX conversion',       value: 'Spread applies' },
]

export function AccountList() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: accounts = [], isLoading, isError, isFetching } = useAccounts()
  const [createOpen, setCreateOpen] = useState(false)
  const [currency, setCurrency] = useState('')
  const [label, setLabel]       = useState('')

  const defaultLabel = currency ? `My ${currency} Account` : ''

  const closeCreate = () => { setCreateOpen(false); setCurrency(''); setLabel('') }

  const createMutation = useMutation({
    mutationFn: () => accountsApi.create({ currency, label: label.trim() || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] })
      closeCreate()
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
        onOpenChange={open => { if (!open) closeCreate(); else setCreateOpen(true) }}
        title="Open a new account"
        description="Provision a multi-currency ledger account. Funds are held in your RemitX wallet."
        confirmLabel="Open account"
        onConfirm={() => currency && createMutation.mutate()}
        loading={createMutation.isPending}
        disabled={!currency}
      >
        <div className="flex flex-col gap-4">
          {/* Currency + label */}
          <FormField label="Currency" htmlFor="new-currency" required>
            <Select
              id="new-currency"
              options={CURRENCIES}
              value={currency}
              onValueChange={v => { setCurrency(v); setLabel('') }}
              placeholder="Select currency…"
            />
          </FormField>

          <FormField
            label="Account label"
            htmlFor="new-label"
            hint={currency ? `Default: "${defaultLabel}"` : undefined}
          >
            <Input
              id="new-label"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={defaultLabel || 'e.g. Operations USD'}
              maxLength={128}
            />
          </FormField>

          {/* Fees breakdown */}
          <div className="rounded-lg border border-border bg-surface/60 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface">
              <svg className="h-3.5 w-3.5 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              <span className="text-xs font-semibold text-foreground">Fees &amp; charges</span>
            </div>
            <div className="divide-y divide-border">
              {FEES.map(({ label: fl, value }) => (
                <div key={fl} className="flex items-center justify-between px-3 py-2">
                  <span className="text-xs text-muted-fg">{fl}</span>
                  <span className={`text-xs font-semibold ${value === 'Free' ? 'text-success-fg' : 'text-foreground'}`}>
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ConfirmDialog>
    </div>
  )
}
