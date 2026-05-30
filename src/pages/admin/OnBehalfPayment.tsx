import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Button } from '@/components/ui/atoms/Button'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { Badge } from '@/components/ui/atoms/Badge'
import { Select } from '@/components/ui/atoms/Select'
import { Input } from '@/components/ui/atoms/Input'
import { FormField } from '@/components/ui/molecules/FormField'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import {
  useAdminTenants,
  useTenantUsers,
  useAdminTenantBeneficiaries,
  useAdminTenantAccounts,
  useCreateOnBehalfPayment,
} from '@/hooks/useAdmin'
import type { TenantUser, TenantBeneficiary, TenantAccount } from '@/api/admin'
import fxApi, { type FxQuote } from '@/api/fx'
import paymentsApi from '@/api/payments'
import { getApiError } from '@/lib/apiError'
import { cn } from '@/lib/utils'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = ['Payee', 'Beneficiary', 'Amount', 'Confirm'] as const

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'INR', 'NGN', 'KES']

const PURPOSE_OPTIONS = [
  { value: '',           label: 'Select purpose…' },
  { value: 'TRADE',      label: 'Trade / Goods' },
  { value: 'SUPPLIER',   label: 'Supplier Payment' },
  { value: 'SALARY',     label: 'Salary / Wages' },
  { value: 'SERVICES',   label: 'Services' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'OTHER',      label: 'Other' },
]

// ─── Step bar ─────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {STEPS.map((label, i) => {
        const idx = i + 1
        const done   = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center gap-1.5 flex-1 last:flex-none">
            <div className={cn(
              'flex items-center gap-1.5 rounded-full text-xs font-semibold transition-all duration-300 whitespace-nowrap',
              active ? 'bg-primary text-white px-3 py-1.5 shadow shadow-primary/30' :
              done   ? 'bg-primary/10 text-primary px-3 py-1.5' :
                       'text-muted-fg/50 px-1',
            )}>
              {done ? (
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className={cn(
                  'h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                  active ? 'bg-white/25 text-white' : 'bg-border text-muted-fg',
                )}>
                  {idx}
                </span>
              )}
              <span className={cn('hidden sm:inline', !active && !done && 'hidden')}>{label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px rounded-full overflow-hidden bg-border">
                <div className={cn('h-full bg-primary rounded-full transition-all duration-500', done ? 'w-full' : 'w-0')} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Context banner (shown from step 2 onwards) ───────────────────────────────

function ContextBanner({
  user, tenantName,
}: {
  user: TenantUser
  tenantName: string
}) {
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  const roleLabel = user.role.replace(/_/g, ' ')
  return (
    <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-2.5 text-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary font-bold text-xs">
        {name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-foreground truncate">{name}</p>
        <p className="text-xs text-muted-fg">{tenantName} · <span className="capitalize">{roleLabel}</span></p>
      </div>
      <Badge variant="default" className="shrink-0 text-[10px]">Paying on behalf</Badge>
    </div>
  )
}

// ─── Step 1 — Select Payee ────────────────────────────────────────────────────

function Step1({
  onNext,
  initialTenantId,
  initialUserId,
}: {
  onNext: (tenantId: string, tenantName: string, user: TenantUser) => void
  initialTenantId?: string
  initialUserId?: string
}) {
  const [tenantId, setTenantId] = useState(initialTenantId ?? '')
  const [userSearch, setUserSearch] = useState('')
  const [selectedUserId, setSelectedUserId] = useState(initialUserId ?? '')

  const { data: tenants, isLoading: tenantsLoading } = useAdminTenants()
  const { data: users, isLoading: usersLoading } = useTenantUsers(tenantId)

  const tenantOptions = [
    { value: '', label: 'Select tenant…' },
    ...(tenants ?? []).map(t => ({ value: t.id, label: `${t.name} (${t.slug})` })),
  ]

  const filtered = (users ?? []).filter(u => {
    if (!userSearch) return true
    const q = userSearch.toLowerCase()
    const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.toLowerCase()
    return fullName.includes(q) || u.email.toLowerCase().includes(q)
  })

  const selectedUser = users?.find(u => u.id === selectedUserId)
  const selectedTenantName = tenants?.find(t => t.id === tenantId)?.name ?? ''

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Who are you paying on behalf of?</h3>
        <p className="text-sm text-muted-fg mt-0.5">Select the tenant and user whose account will be debited.</p>
      </div>

      {/* Tenant selector */}
      <FormField label="Tenant">
        <Select
          value={tenantId}
          onValueChange={(v) => { setTenantId(v); setSelectedUserId('') }}
          options={tenantOptions}
          disabled={tenantsLoading}
        />
      </FormField>

      {/* User list */}
      {tenantId && (
        <>
          <SearchInput
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            onClear={() => setUserSearch('')}
            placeholder="Search by name or email…"
          />

          {usersLoading ? (
            <div className="flex justify-center py-10"><Spinner size="md" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
              <p className="text-sm font-semibold text-foreground">No users found</p>
              <p className="text-xs text-muted-fg">Try a different search term.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map(u => {
                const isSelected = selectedUserId === u.id
                const name = [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email
                const initials = name.slice(0, 2).toUpperCase()
                const roleLabel = u.role.replace(/_/g, ' ')
                return (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn(
                      'flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-150',
                      isSelected
                        ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                        : 'border-border bg-surface hover:border-primary/40',
                    )}
                  >
                    <div className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold select-none',
                      isSelected ? 'bg-primary text-white' : 'bg-surface-raised text-foreground',
                    )}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{name}</p>
                      <p className="text-xs text-muted-fg truncate mt-0.5">
                        {u.email}
                        {u.phone && <> · {u.phone}</>}
                      </p>
                      <p className="text-[11px] text-muted-fg/70 mt-0.5 capitalize">{roleLabel}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <Badge
                        variant={u.status === 'active' ? 'success' : 'default'}
                        className="text-[10px]"
                      >
                        {u.status}
                      </Badge>
                      <div className={cn(
                        'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all',
                        isSelected ? 'border-primary bg-primary' : 'border-border',
                      )}>
                        {isSelected && (
                          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}

      <div className="flex justify-end pt-1">
        <Button
          onClick={() => selectedUser && onNext(tenantId, selectedTenantName, selectedUser)}
          disabled={!selectedUser}
          className="px-8"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

// ─── Step 2 — Select Beneficiary ─────────────────────────────────────────────

function Step2({
  tenantId,
  tenantName,
  user,
  onNext,
  onBack,
}: {
  tenantId: string
  tenantName: string
  user: TenantUser
  onNext: (beneficiary: TenantBeneficiary) => void
  onBack: () => void
}) {
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const { data: beneficiaries, isLoading } = useAdminTenantBeneficiaries(tenantId)

  const filtered = (beneficiaries ?? []).filter(b => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      b.name.toLowerCase().includes(q) ||
      b.currency.toLowerCase().includes(q) ||
      b.country_code.toLowerCase().includes(q) ||
      (b.bank_name ?? '').toLowerCase().includes(q)
    )
  })

  const selected = beneficiaries?.find(b => b.id === selectedId)

  return (
    <div className="flex flex-col gap-5">
      <ContextBanner user={user} tenantName={tenantName} />

      <div>
        <h3 className="text-base font-semibold text-foreground">Select beneficiary</h3>
        <p className="text-sm text-muted-fg mt-0.5">Choose who receives the payment.</p>
      </div>

      <SearchInput
        value={search}
        onChange={e => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        placeholder="Search by name, currency, or bank…"
      />

      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner size="md" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border py-12 text-center">
          <p className="text-sm font-semibold text-foreground">No beneficiaries found</p>
          <p className="text-xs text-muted-fg">This tenant has no active beneficiaries.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(b => {
            const isSelected = selectedId === b.id
            const initials = b.name.slice(0, 2).toUpperCase()
            const accountRef = b.iban ?? b.account_number ?? '—'
            return (
              <button
                key={b.id}
                onClick={() => setSelectedId(b.id)}
                className={cn(
                  'flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-150',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                    : 'border-border bg-surface hover:border-primary/40',
                )}
              >
                <div className={cn(
                  'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold select-none',
                  isSelected ? 'bg-primary text-white' : 'bg-surface-raised text-foreground',
                )}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm">{b.name}</p>
                  <p className="text-xs text-muted-fg truncate mt-0.5">
                    {b.bank_name ? `${b.bank_name} · ` : ''}{accountRef} · {b.country_code}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-foreground">{b.currency}</span>
                  <div className={cn(
                    'h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all',
                    isSelected ? 'border-primary bg-primary' : 'border-border',
                  )}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      <div className="flex justify-between pt-1">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button
          onClick={() => selected && onNext(selected)}
          disabled={!selected}
          className="px-8"
        >
          Continue
        </Button>
      </div>
    </div>
  )
}

// ─── Step 3 — Amount ──────────────────────────────────────────────────────────

function Step3({
  tenantId,
  tenantName,
  user,
  beneficiary,
  onNext,
  onBack,
}: {
  tenantId: string
  tenantName: string
  user: TenantUser
  beneficiary: TenantBeneficiary
  onNext: (account: TenantAccount, sourceCurrency: string, destCurrency: string, amount: string, quote: FxQuote, feeAmount: string, feeConfigured: boolean) => void
  onBack: () => void
}) {
  const [sourceCurrency, setSourceCurrency] = useState(beneficiary.currency ?? 'USD')
  const [destCurrency, setDestCurrency] = useState(beneficiary.currency ?? 'GBP')
  const [amount, setAmount] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [quote, setQuote] = useState<FxQuote | null>(null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [feePreview, setFeePreview] = useState<{ feeAmount: string; configured: boolean } | null>(null)
  const [feeLoading, setFeeLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: accounts, isLoading: accountsLoading } = useAdminTenantAccounts(tenantId)

  // Auto-select first account matching currency
  useEffect(() => {
    if (!accounts) return
    const match = accounts.find(a => a.currency === sourceCurrency) ?? accounts[0]
    if (match) setSelectedAccountId(match.id)
  }, [accounts, sourceCurrency])

  const fetchQuote = useCallback(async (amt: string, from: string, to: string) => {
    if (!amt || parseFloat(amt) <= 0 || from === to) { setQuote(null); return }
    setQuoteLoading(true)
    setQuoteError('')
    try {
      const res = await fxApi.quote(from, to, amt)
      const q = res.data.data
      setQuote(q)

      setFeeLoading(true)
      try {
        const feeRes = await paymentsApi.feePreview(from, to, q.fromAmount)
        setFeePreview(feeRes.data.data)
      } catch {
        setFeePreview(null)
      } finally {
        setFeeLoading(false)
      }
    } catch (err) {
      setQuoteError(getApiError(err, 'Failed to get rate. Try again.'))
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchQuote(amount, sourceCurrency, destCurrency), 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [amount, sourceCurrency, destCurrency, fetchQuote])

  const selectedAccount = accounts?.find(a => a.id === selectedAccountId)
  const canContinue = !!quote && !!selectedAccount && !quoteLoading && parseFloat(amount) > 0

  const handleContinue = () => {
    if (!quote || !selectedAccount) return
    onNext(
      selectedAccount,
      sourceCurrency,
      destCurrency,
      amount,
      quote,
      feePreview?.feeAmount ?? '0',
      feePreview?.configured ?? false,
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ContextBanner user={user} tenantName={tenantName} />

      <div>
        <h3 className="text-base font-semibold text-foreground">Amount</h3>
        <p className="text-sm text-muted-fg mt-0.5">Set the transfer amount and currencies.</p>
      </div>

      {/* Account selector */}
      {accountsLoading ? (
        <LoadingState message="Loading accounts…" />
      ) : (accounts?.length ?? 0) === 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning-fg/40 bg-warning/20 px-4 py-3.5 text-sm text-warning-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>No active accounts for this tenant. Provision one first.</span>
        </div>
      ) : (
        <FormField label="Debit account">
          <div className="flex flex-col gap-2">
            {(accounts ?? []).map(acc => {
              const isSelected = selectedAccountId === acc.id
              const bal = parseFloat(acc.balance ?? '0')
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => { setSelectedAccountId(acc.id); setSourceCurrency(acc.currency) }}
                  className={cn(
                    'flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all',
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-primary/30',
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold',
                      isSelected ? 'bg-primary text-white' : 'bg-surface-raised text-foreground',
                    )}>
                      {acc.currency}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{acc.currency} account</p>
                      {acc.account_number && (
                        <p className="text-xs text-muted-fg font-mono">{acc.account_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold tabular-nums text-foreground">
                      {bal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className="text-xs text-muted-fg">{acc.currency} balance</p>
                  </div>
                </button>
              )
            })}
          </div>
        </FormField>
      )}

      {/* Amount corridor */}
      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">
        {/* You send */}
        <div className="bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2">Send amount</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-fg/25 focus:outline-none tabular-nums"
            />
            <select
              value={sourceCurrency}
              onChange={e => setSourceCurrency(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Rate strip */}
        <div className="bg-surface-raised px-4 py-2.5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-muted-fg">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {quoteLoading ? (
              <div className="flex items-center gap-1.5"><Spinner size="sm" /><span>Getting rate…</span></div>
            ) : quote ? (
              <span className="font-medium tabular-nums">
                1 {quote.from} = <span className="text-foreground font-semibold">{parseFloat(quote.rate).toFixed(4)}</span> {quote.to}
              </span>
            ) : (
              <span>Enter amount to see rate</span>
            )}
          </div>
        </div>

        {/* They receive */}
        <div className="bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2">Beneficiary receives</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {quoteLoading ? (
                <div className="flex items-center gap-2 h-9"><Spinner size="sm" /></div>
              ) : quote ? (
                <span className="text-3xl font-bold text-foreground tabular-nums">
                  {parseFloat(quote.toAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-3xl font-bold text-muted-fg/25">—</span>
              )}
            </div>
            <select
              value={destCurrency}
              onChange={e => setDestCurrency(e.target.value)}
              className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      {quote && !quoteLoading && (
        <div className="rounded-xl border border-border bg-surface-raised divide-y divide-border overflow-hidden text-xs">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-muted-fg">Transfer fee</span>
            {feeLoading ? <Spinner size="sm" /> :
              !feePreview ? <span className="text-muted-fg italic">—</span> :
              !feePreview.configured ? (
                <span className="text-[11px] font-semibold text-success-fg">No fee configured</span>
              ) : parseFloat(feePreview.feeAmount) === 0 ? (
                <span className="text-[11px] font-semibold text-success-fg">Free</span>
              ) : (
                <span className="font-semibold text-foreground tabular-nums">
                  {parseFloat(feePreview.feeAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} {quote.from}
                </span>
              )
            }
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-surface">
            <span className="text-muted-fg">Total debit</span>
            <span className="font-semibold text-foreground tabular-nums">
              {(parseFloat(quote.fromAmount) + parseFloat(feePreview?.feeAmount ?? '0'))
                .toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {quote.from}
            </span>
          </div>
        </div>
      )}

      {quoteError && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {quoteError}
        </div>
      )}

      <div className="flex justify-between pt-1">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button onClick={handleContinue} disabled={!canContinue} className="px-8">Continue</Button>
      </div>
    </div>
  )
}

// ─── Step 4 — Details + Confirm ───────────────────────────────────────────────

function SummaryRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-border last:border-0 gap-4">
      <span className="text-xs text-muted-fg shrink-0">{label}</span>
      <span className={cn('text-sm font-semibold text-foreground text-right', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

function Step4({
  tenantName,
  user,
  beneficiary,
  account,
  sourceCurrency,
  destCurrency,
  amount,
  quote,
  feeAmount,
  feeConfigured,
  onBack,
}: {
  tenantName: string
  user: TenantUser
  beneficiary: TenantBeneficiary
  account: TenantAccount
  sourceCurrency: string
  destCurrency: string
  amount: string
  quote: FxQuote
  feeAmount: string
  feeConfigured: boolean
  onBack: () => void
}) {
  const navigate = useNavigate()
  const [purposeCode, setPurposeCode] = useState('')
  const [note, setNote] = useState('')
  const [purposeError, setPurposeError] = useState('')
  const mutation = useCreateOnBehalfPayment()

  const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email
  const fee = parseFloat(feeAmount)
  const totalDebit = parseFloat(amount) + fee

  const handleSubmit = () => {
    if (!purposeCode) { setPurposeError('Required'); return }
    setPurposeError('')
    mutation.mutate(
      {
        targetUserId: user.id,
        beneficiaryId: beneficiary.id,
        accountId: account.id,
        from: sourceCurrency,
        to: destCurrency,
        amount: parseFloat(amount),
        purposeCode,
        note: note || null,
      },
      {
        onSuccess: (data) => {
          navigate(`/payments/${data.payment.id}`)
        },
      },
    )
  }

  return (
    <div className="flex flex-col gap-5">
      <ContextBanner user={user} tenantName={tenantName} />

      <div>
        <h3 className="text-base font-semibold text-foreground">Confirm payment</h3>
        <p className="text-sm text-muted-fg mt-0.5">Review everything and add the payment purpose.</p>
      </div>

      {/* Amount hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f172a] border border-white/[0.07] p-6 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <p className="relative text-[11px] font-semibold uppercase tracking-widest text-primary/80 mb-3">Total debit</p>
        <p className="relative text-5xl font-bold text-white tabular-nums">
          {totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          <span className="ml-2 text-2xl font-semibold text-white/50">{sourceCurrency}</span>
        </p>
        <p className="relative mt-3 text-sm text-white/50">
          {beneficiary.name} receives{' '}
          <span className="font-semibold text-white/80 tabular-nums">
            {parseFloat(quote.toAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {destCurrency}
          </span>
        </p>
      </div>

      {/* Summary */}
      <div className="rounded-2xl border border-border bg-surface px-5">
        <SummaryRow label="Paying on behalf of" value={<span className="text-primary">{userName}</span>} />
        <SummaryRow label="Tenant" value={tenantName} />
        <SummaryRow label="Recipient" value={beneficiary.name} />
        <SummaryRow label="Debit account" value={`${account.currency}${account.account_number ? ' · ' + account.account_number : ''}`} />
        <SummaryRow label="Transfer amount" value={`${parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${sourceCurrency}`} />
        <SummaryRow
          label="Transfer fee"
          value={
            !feeConfigured
              ? <span className="text-success-fg text-xs">No fee configured</span>
              : fee === 0
              ? <span className="text-success-fg text-xs">Free</span>
              : `${fee.toLocaleString(undefined, { minimumFractionDigits: 2 })} ${sourceCurrency}`
          }
        />
        <SummaryRow
          label="Exchange rate"
          value={`1 ${quote.from} = ${parseFloat(quote.rate).toFixed(4)} ${quote.to}`}
          mono
        />
      </div>

      {/* Purpose + Note */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <FormField label="Purpose of payment" error={purposeError} required>
          <Select
            value={purposeCode}
            onValueChange={v => { setPurposeCode(v); if (v) setPurposeError('') }}
            options={PURPOSE_OPTIONS}
          />
        </FormField>
        <FormField label="Internal note (optional)">
          <Input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Reference, incident ID, or note for this override…"
            maxLength={1024}
          />
        </FormField>
      </div>

      {/* Admin notice */}
      <div className="flex items-start gap-3 rounded-xl border border-warning-fg/40 bg-warning/20 px-4 py-3.5">
        <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <p className="text-xs text-warning-fg leading-relaxed">
          This payment will be created on behalf of <strong className="font-semibold">{userName}</strong> and audited under your admin account. This action is logged and cannot be reversed once approved.
        </p>
      </div>

      {mutation.isError && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {getApiError(mutation.error, 'Failed to submit. Please try again.')}
        </div>
      )}

      <div className="flex justify-between pt-1">
        <Button variant="outline" onClick={onBack} disabled={mutation.isPending}>Back</Button>
        <Button onClick={handleSubmit} loading={mutation.isPending} variant="gradient" className="px-8">
          Submit on behalf
        </Button>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function OnBehalfPayment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialTenantId = searchParams.get('tenantId') ?? undefined
  const initialUserId   = searchParams.get('userId')   ?? undefined
  const [step, setStep] = useState(1)

  // Selections accumulated across steps
  const [tenantId, setTenantId]       = useState('')
  const [tenantName, setTenantName]   = useState('')
  const [user, setUser]               = useState<TenantUser | null>(null)
  const [beneficiary, setBeneficiary] = useState<TenantBeneficiary | null>(null)
  const [account, setAccount]         = useState<TenantAccount | null>(null)
  const [sourceCurrency, setSourceCurrency] = useState('USD')
  const [destCurrency, setDestCurrency]     = useState('GBP')
  const [amount, setAmount]           = useState('')
  const [quote, setQuote]             = useState<FxQuote | null>(null)
  const [feeAmount, setFeeAmount]     = useState('0')
  const [feeConfigured, setFeeConfigured] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payment on behalf"
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Payments', href: '/admin/manual-payments' },
          { label: 'On behalf' },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>Cancel</Button>
        }
      />

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <StepBar current={step} />

        {step === 1 && (
          <Step1
            initialTenantId={initialTenantId}
            initialUserId={initialUserId}
            onNext={(tid, tname, u) => {
              setTenantId(tid); setTenantName(tname); setUser(u)
              setStep(2)
            }}
          />
        )}

        {step === 2 && user && (
          <Step2
            tenantId={tenantId}
            tenantName={tenantName}
            user={user}
            onNext={(b) => { setBeneficiary(b); setDestCurrency(b.currency); setStep(3) }}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && user && beneficiary && (
          <Step3
            tenantId={tenantId}
            tenantName={tenantName}
            user={user}
            beneficiary={beneficiary}
            onNext={(acc, from, to, amt, q, fee, feeConf) => {
              setAccount(acc)
              setSourceCurrency(from)
              setDestCurrency(to)
              setAmount(amt)
              setQuote(q)
              setFeeAmount(fee)
              setFeeConfigured(feeConf)
              setStep(4)
            }}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && user && beneficiary && account && quote && (
          <Step4
            tenantName={tenantName}
            user={user}
            beneficiary={beneficiary}
            account={account}
            sourceCurrency={sourceCurrency}
            destCurrency={destCurrency}
            amount={amount}
            quote={quote}
            feeAmount={feeAmount}
            feeConfigured={feeConfigured}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  )
}
