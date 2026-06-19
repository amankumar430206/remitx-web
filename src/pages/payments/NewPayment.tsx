import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { FormField } from '@/components/ui/molecules/FormField'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { ContentCard } from '@/layouts/ContentCard'
import { useBeneficiaries } from '@/hooks/useBeneficiaries'
import { useAccounts } from '@/hooks/useAccounts'
import { useDebounce } from '@/hooks/useDebounce'
import { usePaymentStore } from '@/stores/paymentStore'
import fxApi, { type FxQuote, type ZoqqQuoteType, type ZoqqLockPeriod, type ZoqqConversionSchedule } from '@/api/fx'
import { useFxRatesList } from '@/hooks/useFxRates'
import paymentsApi from '@/api/payments'
import accountsApi from '@/api/accounts'
import { cn } from '@/lib/utils'
import { getApiError } from '@/lib/apiError'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = ['Recipient', 'Amount', 'Details', 'Confirm'] as const
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'INR', 'NGN', 'KES']
const MIN_LOCK_MS = 5 * 60 * 1000

// ─── Step bar ────────────────────────────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-8">
      {STEPS.map((label, i) => {
        const idx = i + 1
        const done = idx < current
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

// ─── Rate lock pill ──────────────────────────────────────────────────────────

function RateLockPill({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [secs, setSecs] = useState(0)

  useEffect(() => {
    const tick = () => {
      const remaining = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecs(remaining)
      if (remaining === 0) onExpire()
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onExpire])

  const mins = Math.floor(secs / 60)
  const s = secs % 60
  const timeStr = `${mins}:${String(s).padStart(2, '0')}`
  const urgent = secs > 0 && secs <= 30
  const expired = secs === 0

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors',
      expired  ? 'bg-danger/10 border-danger/30 text-danger-fg' :
      urgent   ? 'bg-warning/20 border-warning-fg/30 text-warning-fg' :
                 'bg-emerald-500/10 border-emerald-500/25 text-emerald-600 dark:text-emerald-400',
    )}>
      <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
      </svg>
      {expired ? 'Rate expired' : `Locked · ${timeStr}`}
    </span>
  )
}

// ─── Currency dropdown ────────────────────────────────────────────────────────

function CurrencyDropdown({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm font-bold text-foreground hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-primary/40 transition-colors cursor-pointer whitespace-nowrap"
        >
          <span>{value}</span>
          <svg className="h-3 w-3 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 w-[110px] max-h-64 overflow-y-auto rounded-xl border border-border bg-surface p-1 shadow-lg animate-in fade-in-0 zoom-in-95"
        >
          {CURRENCIES.map(c => (
            <DropdownMenu.Item
              key={c}
              className={cn(
                'flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold outline-none transition-colors select-none',
                c === value ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-surface-overlay',
              )}
              onSelect={() => onChange(c)}
            >
              {c === value ? (
                <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="h-3 w-3 shrink-0" />
              )}
              {c}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}

// ─── Step 1 — Recipient ───────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const { data, isLoading } = useBeneficiaries({ search: debouncedSearch, limit: 20 })
  const { setData, data: stored } = usePaymentStore()
  const [selected, setSelected] = useState(stored.beneficiaryId ?? '')

  const handleSelect = (id: string, name: string, country: string) => {
    setSelected(id)
    setData({ beneficiaryId: id, beneficiaryName: name, beneficiaryCountry: country })
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Who are you sending to?</h3>
        <p className="text-sm text-muted-fg mt-0.5">Search your saved beneficiaries.</p>
      </div>

      <SearchInput
        value={search}
        onChange={e => setSearch(e.target.value)}
        onClear={() => setSearch('')}
        placeholder="Search by name or account…"
      />

      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="md" />
        </div>
      )}

      {!isLoading && (data?.data?.length ?? 0) === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-border py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No beneficiaries found</p>
            <p className="mt-0.5 text-xs text-muted-fg">
              {search ? 'Try a different name or clear the search.' : 'Add a recipient to get started.'}
            </p>
          </div>
          {!search && (
            <Link to="/beneficiaries/new">
              <Button size="sm" variant="outline">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add beneficiary
              </Button>
            </Link>
          )}
        </div>
      )}

      <div className={cn('flex flex-col gap-2', (data?.data?.length ?? 0) > 10 && 'max-h-[480px] overflow-y-auto pr-1')}>
        {(data?.data ?? []).map(b => {
          const isSelected = selected === b.id
          const initials = b.name.slice(0, 2).toUpperCase()
          return (
            <button
              key={b.id}
              onClick={() => handleSelect(b.id, b.name, b.country_code)}
              className={cn(
                'flex items-center gap-3.5 rounded-2xl border p-4 text-left transition-all duration-150',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm shadow-primary/10'
                  : 'border-border bg-surface hover:border-primary/40',
              )}
            >
              <div className={cn(
                'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold select-none',
                isSelected ? 'bg-primary text-white shadow-sm shadow-primary/30' : 'bg-surface-raised text-foreground',
              )}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground text-sm">{b.name}</p>
                <p className="text-xs text-muted-fg truncate mt-0.5">
                  {b.bank_name}{b.bank_name && ' · '}{b.account_number ?? b.iban} · {b.country_code}
                </p>
              </div>
              <div className={cn(
                'h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-all',
                isSelected ? 'border-primary bg-primary' : 'border-border bg-transparent',
              )}>
                {isSelected && (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-1">
        <Link to="/beneficiaries/new">
          <Button type="button" variant="ghost" size="sm">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add beneficiary
          </Button>
        </Link>
        <Button onClick={onNext} disabled={!selected} className="px-8">Continue</Button>
      </div>
    </div>
  )
}

// ─── Step 2 — Amount + FX ────────────────────────────────────────────────────

const amountSchema = z.object({
  sourceAmount: z.string().min(1).refine(v => parseFloat(v) > 0, 'Must be positive'),
  sourceCurrency: z.string().min(3),
  destinationCurrency: z.string().min(3),
})
type AmountFormValues = z.infer<typeof amountSchema>

const LOCK_PERIOD_LABELS: Record<ZoqqLockPeriod, string> = {
  '5_mins': '5 min', '15_mins': '15 min', '1_hour': '1 hr',
  '4_hours': '4 hr', '8_hours': '8 hr', '24_hours': '24 hr',
}
const CONVERSION_SCHEDULE_LABELS: Record<ZoqqConversionSchedule, string> = {
  immediate: 'Immediately', end_of_day: 'End of day', next_day: 'Next day', '2_days': 'In 2 days',
}

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { setData, data: stored } = usePaymentStore()
  const { provider } = useFxRatesList()
  const isZoqq = provider === 'zoqq'

  const [quote, setQuote] = useState<FxQuote | null>(stored.quote ?? null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [feeLoading, setFeeLoading] = useState(false)
  const [feePreview, setFeePreview] = useState<{ feeAmount: string; configured: boolean } | null>(
    stored.feeAmount != null ? { feeAmount: stored.feeAmount, configured: stored.feeConfigured ?? false } : null
  )
  const [balanceVisible, setBalanceVisible] = useState(true)
  const [lockMins, setLockMins] = useState(5)
  const lockMinsRef = useRef(5)
  // Zoqq-specific options — pre-fill from existing quote if coming from FX page
  const [zoqqQuoteType,          setZoqqQuoteType]          = useState<ZoqqQuoteType>(stored.quote?.quoteType ?? 'payout')
  const [zoqqLockPeriod,         setZoqqLockPeriod]         = useState<ZoqqLockPeriod>(stored.quote?.lockPeriod ?? '15_mins')
  const [zoqqConversionSchedule, setZoqqConversionSchedule] = useState<ZoqqConversionSchedule>(stored.quote?.conversionSchedule ?? 'immediate')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then(r => r.data.data),
  })

  const { register, watch, handleSubmit, setValue, formState: { errors } } = useForm<AmountFormValues>({
    resolver: zodResolver(amountSchema),
    defaultValues: {
      sourceAmount: stored.sourceAmount ?? '',
      sourceCurrency: stored.sourceCurrency ?? 'USD',
      destinationCurrency: stored.destinationCurrency ?? 'GBP',
    },
  })

  const sourceAmount = watch('sourceAmount')
  const sourceCurrency = watch('sourceCurrency')
  const destinationCurrency = watch('destinationCurrency')

  const accountsLoaded = accountsData !== undefined
  const matchingAccount = accountsData?.find(a => a.currency === sourceCurrency && a.status === 'active')
  const accountBalance = matchingAccount ? parseFloat(matchingAccount.balance) : null
  const parsedAmount = parseFloat(sourceAmount) || 0
  const exceedsBalance = accountBalance !== null && parsedAmount > 0 && parsedAmount > accountBalance
  const noAccount = accountsLoaded && !matchingAccount
  const zeroBalance = accountsLoaded && matchingAccount !== undefined && accountBalance !== null && accountBalance === 0
  const balanceBlocked = exceedsBalance || noAccount || zeroBalance

  const handleLockChange = useCallback((mins: number) => {
    setLockMins(mins)
    lockMinsRef.current = mins
    setQuote(prev => {
      if (!prev) return prev
      const updated = { ...prev, expiresAt: new Date(Date.now() + mins * 60 * 1000).toISOString() }
      setData({ quote: updated })
      return updated
    })
  }, [setData])

  const fetchQuote = useCallback(async (amount: string, from: string, to: string) => {
    if (!amount || parseFloat(amount) <= 0 || from === to) return
    setQuoteLoading(true)
    setQuoteError('')
    try {
      const opts = isZoqq
        ? { quoteType: zoqqQuoteType, lockPeriod: zoqqLockPeriod, conversionSchedule: zoqqConversionSchedule }
        : undefined
      const res = await fxApi.quote(from, to, amount, opts)
      const q = res.data.data
      // For non-Zoqq: client-side lock extension via lockMins pill; for Zoqq: use API-returned expiresAt
      const adjustedQuote: FxQuote = isZoqq
        ? q
        : { ...q, expiresAt: new Date(Date.now() + lockMinsRef.current * 60 * 1000).toISOString() }
      setQuote(adjustedQuote)

      setFeeLoading(true)
      try {
        const feeRes = await paymentsApi.feePreview(from, to, q.fromAmount)
        const fp = feeRes.data.data
        setFeePreview(fp)
        setData({ quote: adjustedQuote, feeAmount: fp.feeAmount, feeConfigured: fp.configured })
      } catch {
        setFeePreview(null)
        setData({ quote: adjustedQuote, feeAmount: null, feeConfigured: null })
      } finally {
        setFeeLoading(false)
      }
    } catch (err) {
      setQuoteError(getApiError(err, 'Failed to get rate. Please try again.'))
      setQuote(null)
      setFeePreview(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [setData, isZoqq, zoqqQuoteType, zoqqLockPeriod, zoqqConversionSchedule])

  const handleExpire = useCallback(() => {
    fetchQuote(sourceAmount, sourceCurrency, destinationCurrency)
  }, [fetchQuote, sourceAmount, sourceCurrency, destinationCurrency])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchQuote(sourceAmount, sourceCurrency, destinationCurrency)
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [sourceAmount, sourceCurrency, destinationCurrency, fetchQuote])

  const onSubmit = (values: AmountFormValues) => {
    if (!quote) return
    const account = accountsData?.find(a => a.currency === values.sourceCurrency && a.status === 'active')
      ?? accountsData?.[0]
    if (!account) {
      setQuoteError(`No ${values.sourceCurrency} account found. Please provision one first.`)
      return
    }
    setData({
      accountId: account.id,
      sourceAmount: values.sourceAmount,
      sourceCurrency: values.sourceCurrency,
      destinationCurrency: values.destinationCurrency,
      quote,
    })
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">How much are you sending?</h3>
        <p className="text-sm text-muted-fg mt-0.5">Enter the amount and we'll find the best rate.</p>
      </div>

      {/* Stacked amount corridor */}
      <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border">

        {/* You send */}
        <div className="bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2">You send</p>
          <div className="flex items-center gap-3">
            <input
              {...register('sourceAmount')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="flex-1 min-w-0 bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-fg/25 focus:outline-none tabular-nums"
            />
            <CurrencyDropdown value={sourceCurrency} onChange={v => setValue('sourceCurrency', v)} />
          </div>
          {errors.sourceAmount && (
            <p className="mt-1.5 text-xs text-danger-fg">{errors.sourceAmount.message}</p>
          )}

          {/* Balance pill + warnings */}
          {accountsLoaded && (
            <div className="mt-2.5 flex items-center gap-2 flex-wrap">
              {matchingAccount ? (
                <div className="flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-xs">
                  <span className="text-muted-fg">Available:</span>
                  {balanceVisible ? (
                    <span className={cn('font-semibold tabular-nums', exceedsBalance ? 'text-danger-fg' : 'text-foreground')}>
                      {accountBalance!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {sourceCurrency}
                    </span>
                  ) : (
                    <span className="font-semibold text-muted-fg tracking-widest text-[10px]">••••••</span>
                  )}
                  <button
                    type="button"
                    onClick={() => setBalanceVisible(v => !v)}
                    className="text-muted-fg hover:text-foreground transition-colors ml-0.5"
                  >
                    {balanceVisible ? (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    ) : (
                      <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-full border border-warning/40 bg-warning/5 px-2.5 py-1 text-xs">
                  <svg className="h-3 w-3 text-warning-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="text-warning-fg">No {sourceCurrency} account.</span>
                  <Link to="/accounts" className="font-semibold text-primary hover:underline">
                    Provision one →
                  </Link>
                </div>
              )}

              {exceedsBalance && balanceVisible && (
                <span className="inline-flex items-center gap-1 rounded-full border border-danger/30 bg-danger/10 px-2.5 py-1 text-[11px] font-semibold text-danger-fg">
                  <svg className="h-3 w-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  Exceeds balance
                </span>
              )}
            </div>
          )}
        </div>

        {/* Rate strip */}
        <div className="bg-surface-raised px-4 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-fg min-w-0">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {quoteLoading ? (
                <div className="flex items-center gap-1.5">
                  <Spinner size="sm" />
                  <span>Fetching rate…</span>
                </div>
              ) : quote ? (
                <span className="font-medium tabular-nums">
                  1 {quote.from} = <span className="text-foreground font-semibold">{parseFloat(quote.rate).toFixed(4)}</span> {quote.to}
                </span>
              ) : (
                <span>Enter amount to see rate</span>
              )}
            </div>
            {quote && !quoteLoading && (
              <RateLockPill expiresAt={quote.expiresAt} onExpire={handleExpire} />
            )}
          </div>

          {/* Lock duration — Zoqq uses API lock periods; non-Zoqq uses client-side pills */}
          {quote && !quoteLoading && !isZoqq && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-muted-fg shrink-0">Lock for</span>
              {[5, 15, 30, 60].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleLockChange(m)}
                  className={cn(
                    'rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-150',
                    lockMins === m
                      ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                      : 'border-border bg-transparent text-muted-fg hover:border-primary/50 hover:text-foreground',
                  )}
                >
                  {m}m
                </button>
              ))}
            </div>
          )}

          {/* Zoqq-specific options */}
          {isZoqq && (
            <div className="flex flex-col gap-1.5 pt-0.5">
              {/* Lock period */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-fg w-24 shrink-0">Lock period</span>
                {(['5_mins', '15_mins', '1_hour', '4_hours', '8_hours', '24_hours'] as const).map(lp => (
                  <button key={lp} type="button" onClick={() => setZoqqLockPeriod(lp)}
                    className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-150',
                      zoqqLockPeriod === lp
                        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                        : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {LOCK_PERIOD_LABELS[lp]}
                  </button>
                ))}
              </div>
              {/* Quote type */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-fg w-24 shrink-0">Quote type</span>
                {(['payout', 'conversion'] as const).map(qt => (
                  <button key={qt} type="button" onClick={() => setZoqqQuoteType(qt)}
                    className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-150',
                      zoqqQuoteType === qt
                        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                        : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {qt === 'payout' ? 'Payout' : 'Conversion'}
                  </button>
                ))}
              </div>
              {/* Conversion schedule */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-muted-fg w-24 shrink-0">Convert</span>
                {(['immediate', 'end_of_day', 'next_day', '2_days'] as const).map(cs => (
                  <button key={cs} type="button" onClick={() => setZoqqConversionSchedule(cs)}
                    className={cn('rounded-full border px-2.5 py-0.5 text-[11px] font-semibold transition-all duration-150',
                      zoqqConversionSchedule === cs
                        ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                        : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
                    )}
                  >
                    {CONVERSION_SCHEDULE_LABELS[cs]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* They receive */}
        <div className="bg-surface p-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-fg mb-2">They receive</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              {quoteLoading ? (
                <div className="flex items-center gap-2 h-9">
                  <Spinner size="sm" />
                </div>
              ) : quote ? (
                <span className="text-3xl font-bold text-foreground tabular-nums">
                  {parseFloat(quote.toAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              ) : (
                <span className="text-3xl font-bold text-muted-fg/25">—</span>
              )}
            </div>
            <CurrencyDropdown value={destinationCurrency} onChange={v => setValue('destinationCurrency', v)} />
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      {quote && !quoteLoading && (
        <div className="rounded-xl border border-border bg-surface-raised divide-y divide-border overflow-hidden text-xs">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-1.5 text-muted-fg">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Transfer fee
            </div>
            {feeLoading ? (
              <Spinner size="sm" />
            ) : feePreview == null ? (
              <span className="text-muted-fg italic">—</span>
            ) : !feePreview.configured || parseFloat(feePreview.feeAmount) === 0 ? (
              <span className="font-semibold text-foreground tabular-nums">
                0.00 {sourceCurrency}
              </span>
            ) : (
              <span className="font-semibold text-foreground tabular-nums">
                <AmountDisplay amount={feePreview.feeAmount} currency={quote.from} size="sm" />
              </span>
            )}
          </div>
          <div className="flex items-center justify-between px-4 py-3 bg-surface">
            <div className="flex items-center gap-1.5 text-muted-fg">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Total debit
            </div>
            <span className="font-semibold text-foreground tabular-nums">
              {feePreview && parseFloat(feePreview.feeAmount) > 0
                ? <AmountDisplay
                    amount={String(parseFloat(quote.fromAmount) + parseFloat(feePreview.feeAmount))}
                    currency={quote.from}
                    size="sm"
                  />
                : <AmountDisplay amount={quote.fromAmount} currency={quote.from} size="sm" />
              }
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

      {balanceBlocked && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>
            {noAccount
              ? `You don't have an active ${sourceCurrency} account. Open one from Accounts before sending.`
              : zeroBalance
              ? `Your ${sourceCurrency} account has no funds. Please top up before proceeding.`
              : `Amount exceeds your available ${sourceCurrency} balance. Reduce the amount or top up your account.`}
          </span>
        </div>
      )}

      <div className="flex justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={!quote || quoteLoading || balanceBlocked} className="px-8">Continue</Button>
      </div>
    </form>
  )
}

// ─── Step 3 — Details ────────────────────────────────────────────────────────

const detailsSchema = z.object({
  purposeCode: z.string().min(1, 'Required'),
  note: z.string().max(1024).optional(),
})
type DetailsFormValues = z.infer<typeof detailsSchema>

const PURPOSE_OPTIONS = [
  { value: '',           label: 'Select purpose…' },
  { value: 'TRADE',      label: 'Trade / Goods' },
  { value: 'SUPPLIER',   label: 'Supplier Payment' },
  { value: 'SALARY',     label: 'Salary / Wages' },
  { value: 'SERVICES',   label: 'Services' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'OTHER',      label: 'Other' },
]

function Step3({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: stored, setData } = usePaymentStore()
  const { handleSubmit, watch, setValue, formState: { errors } } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { purposeCode: stored.purposeCode ?? '', note: stored.note ?? '' },
  })
  const [note, setNote] = useState(stored.note ?? '')
  const purposeCode = watch('purposeCode', stored.purposeCode ?? '')
  const q = stored.quote

  const onSubmit = (values: DetailsFormValues) => {
    setData({ purposeCode: values.purposeCode, note: values.note ?? '' })
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Payment details</h3>
        <p className="text-sm text-muted-fg mt-0.5">Almost there — a few more details required.</p>
      </div>

      {q && (
        <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 mb-1">You send</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {parseFloat(q.fromAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="ml-1.5 text-sm font-semibold text-muted-fg">{q.from}</span>
              </p>
            </div>
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 border border-primary/20 text-primary">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary/70 mb-1">They receive</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {parseFloat(q.toAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                <span className="ml-1.5 text-sm font-semibold text-muted-fg">{q.to}</span>
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-primary/10 flex items-center justify-between text-xs">
            <span className="text-muted-fg">To: <span className="font-semibold text-foreground">{stored.beneficiaryName}</span></span>
            <span className="tabular-nums text-muted-fg font-mono">1 {q.from} = {parseFloat(q.rate).toFixed(4)} {q.to}</span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5">
        <FormField label="Purpose of payment" error={errors.purposeCode?.message} required>
          <Select
            value={purposeCode}
            onValueChange={v => setValue('purposeCode', v, { shouldValidate: true })}
            options={PURPOSE_OPTIONS}
          />
        </FormField>
        <FormField label="Note to recipient (optional)">
          <Input
            value={note}
            onChange={e => { setNote(e.target.value); setValue('note', e.target.value) }}
            placeholder="Invoice #, order reference, or message…"
            maxLength={1024}
          />
        </FormField>
      </div>

      <div className="flex justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" className="px-8">Review payment</Button>
      </div>
    </form>
  )
}

// ─── Step 4 — Confirm ────────────────────────────────────────────────────────

function Step4({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const { data: stored, reset } = usePaymentStore()
  const idempotencyKey = useRef(stored.idempotencyKey || crypto.randomUUID())
  const q = stored.quote
  const feeAmount = stored.feeAmount ? parseFloat(stored.feeAmount) : 0
  const feeConfigured = stored.feeConfigured ?? false
  const hasFee = feeConfigured && feeAmount > 0
  const totalDebit = q ? parseFloat(q.fromAmount) + feeAmount : 0
  const kycPending = user?.kyc_status !== 'approved'
  const beneInitials = (stored.beneficiaryName ?? '?').slice(0, 2).toUpperCase()

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => {
      if (!stored.beneficiaryId || !stored.accountId || !stored.quote || !stored.purposeCode) {
        throw new Error('Missing payment data')
      }
      return paymentsApi.submit(
        {
          beneficiaryId: stored.beneficiaryId,
          accountId: stored.accountId,
          quoteId: stored.quote.quoteId,
          purposeCode: stored.purposeCode,
          note: stored.note || undefined,
        },
        idempotencyKey.current,
      )
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      reset()
      navigate(`/payments/${res.data.data.id}`)
    },
  })

  const fmt = (n: string | number, decimals = 2) =>
    parseFloat(String(n)).toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

  return (
    <div className="flex flex-col gap-4">
      {/* Header + rate lock */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-foreground">Confirm your payment</h3>
          <p className="text-sm text-muted-fg mt-0.5">Review everything before sending.</p>
        </div>
        {q && (
          <div className="shrink-0 pt-0.5">
            <RateLockPill expiresAt={q.expiresAt} onExpire={onBack} />
          </div>
        )}
      </div>

      {/* Transfer direction hero */}
      {q && (
        <div className="overflow-hidden rounded-2xl bg-[#0d1117] border border-white/[0.07]">
          <div className="grid grid-cols-[1fr_auto_1fr]">
            {/* You send */}
            <div className="flex flex-col items-center gap-1.5 p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">You send</p>
              <p className="text-3xl font-bold text-white tabular-nums leading-none">
                {fmt(q.fromAmount)}
              </p>
              <span className="inline-flex items-center rounded-full bg-white/8 border border-white/10 px-2.5 py-0.5 text-[11px] font-bold text-white/50">
                {q.from}
              </span>
            </div>

            {/* Center arrow + rate */}
            <div className="flex flex-col items-center justify-center gap-2 px-2 py-5 border-x border-white/[0.07]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20 border border-primary/30">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <div className="rounded-full bg-white/[0.04] border border-white/[0.07] px-2 py-1 text-center">
                <span className="block text-[10px] font-mono text-white/30 leading-snug whitespace-nowrap">
                  1 {q.from} = {parseFloat(q.rate).toFixed(4)} {q.to}
                </span>
              </div>
            </div>

            {/* They receive */}
            <div className="flex flex-col items-center gap-1.5 p-5 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400/50">They receive</p>
              <p className="text-3xl font-bold text-emerald-400 tabular-nums leading-none">
                {fmt(q.toAmount)}
              </p>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400/70">
                {q.to}
              </span>
            </div>
          </div>

          {/* Total debit footer — only shown when there's a fee */}
          {hasFee && (
            <div className="flex items-center justify-between border-t border-white/[0.07] bg-white/[0.02] px-5 py-3">
              <span className="text-xs text-white/30">Total debit (incl. fee)</span>
              <span className="text-sm font-bold text-white tabular-nums">
                {fmt(totalDebit)} {q.from}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recipient card */}
      <div className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg mb-3">Recipient</p>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary select-none">
            {beneInitials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{stored.beneficiaryName ?? '—'}</p>
            <p className="text-xs text-muted-fg mt-0.5">{stored.beneficiaryCountry ?? ''}</p>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-semibold text-success-fg shrink-0">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Verified
          </div>
        </div>
      </div>

      {/* Transfer details with icon rows */}
      {q && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden divide-y divide-border">
          {/* Fee */}
          {stored.feeConfigured != null && (
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-muted-fg">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="flex-1 text-sm text-muted-fg">Transfer fee</span>
              {!feeConfigured || feeAmount === 0 ? (
                <span className="text-sm font-semibold text-foreground tabular-nums">0.00 {q.from}</span>
              ) : (
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {fmt(feeAmount, 8).replace(/\.?0+$/, '')} {q.from}
                </span>
              )}
            </div>
          )}

          {/* Exchange rate */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-muted-fg">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
            </div>
            <span className="flex-1 text-sm text-muted-fg">Exchange rate</span>
            <span className="font-mono text-xs text-foreground font-semibold tabular-nums">
              1 {q.from} = {parseFloat(q.rate).toFixed(4)} {q.to}
            </span>
          </div>

          {/* Purpose */}
          <div className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-muted-fg">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
              </svg>
            </div>
            <span className="flex-1 text-sm text-muted-fg">Purpose</span>
            <span className="text-sm font-semibold text-foreground">{stored.purposeCode ?? '—'}</span>
          </div>

          {/* Note */}
          {stored.note && (
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface-raised text-muted-fg mt-0.5">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <span className="flex-1 text-sm text-muted-fg pt-0.5">Note</span>
              <span className="text-sm font-semibold text-foreground text-right max-w-[55%] leading-snug">{stored.note}</span>
            </div>
          )}
        </div>
      )}

      {/* KYC warning */}
      {kycPending && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/5 px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/15">
            <svg className="h-4 w-4 text-warning-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Complete identity verification</p>
            <p className="text-xs text-muted-fg mt-0.5 leading-relaxed">
              Your KYC documents must be verified before this payment can be processed.
            </p>
          </div>
          <Link to="/kyc" className="shrink-0 mt-0.5">
            <Button variant="outline" size="sm">Start KYC →</Button>
          </Link>
        </div>
      )}

      {/* Authorization disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
        </div>
        <p className="text-xs text-muted-fg leading-relaxed">
          By confirming, you authorise this payment. It will be reviewed before processing and{' '}
          <strong className="text-foreground font-medium">cannot be reversed</strong> once approved.
        </p>
      </div>

      {/* Error */}
      {isError && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {getApiError(error, 'Submission failed. Please try again.')}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-3 pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>Back</Button>
        <Button onClick={() => mutate()} loading={isPending} variant="gradient" className="flex-1 gap-2">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          Confirm & send
        </Button>
      </div>
    </div>
  )
}

// ─── Pre-flight checklist ─────────────────────────────────────────────────────

interface PreflightItem {
  key: string
  label: string
  description: string
  href: string
  cta: string
  icon: React.ReactNode
}

function PreflightBanner({ items }: { items: PreflightItem[] }) {
  if (items.length === 0) return null
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4">
      <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning-fg">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
        Complete before sending
      </p>
      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div key={item.key} className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning-fg">
              {item.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-fg mt-0.5">{item.description}</p>
            </div>
            <Link to={item.href} className="shrink-0 mt-0.5">
              <Button variant="outline" size="sm">{item.cta}</Button>
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function NewPayment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { step, setStep, reset, setData } = usePaymentStore()
  const user = useAuthStore(s => s.user)
  const isSuperAdmin = user?.role === 'super_admin'
  const { data: prefetchAccounts } = useAccounts()
  const { data: prefetchBenes } = useBeneficiaries({ limit: 1 })

  useEffect(() => {
    const quoteId = searchParams.get('quoteId')
    if (quoteId) {
      // Coming from FX rates page — store already seeded, skip reset and jump to step 2.
      // On refresh the store is empty but Step2's debounce refetches the quote automatically.
      const from = searchParams.get('from')
      const to = searchParams.get('to')
      const amount = searchParams.get('amount')
      if (from && to && amount) setData({ sourceCurrency: from, destinationCurrency: to, sourceAmount: amount })
      setStep(2)
    } else {
      reset()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => setStep(step + 1)
  const back = () => { if (step > 1) setStep(step - 1) }
  const cancel = () => { reset(); navigate('/payments') }

  const kycOk = user?.kyc_status === 'approved' || user?.kyc_status === 'completed'
  const hasAccounts = (prefetchAccounts?.length ?? 0) > 0
  const hasBeneficiaries = (prefetchBenes?.data?.length ?? 0) > 0
  const accountsResolved = prefetchAccounts !== undefined
  const benesResolved = prefetchBenes !== undefined

  const preflightItems: PreflightItem[] = [
    !kycOk && {
      key: 'kyc',
      label: 'Complete identity verification',
      description: 'Your KYC must be approved before payments can be processed.',
      href: '/kyc',
      cta: 'Start KYC →',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    accountsResolved && !hasAccounts && {
      key: 'accounts',
      label: 'No payment account found',
      description: 'Provision at least one active account to send from.',
      href: '/accounts',
      cta: 'View accounts',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
    benesResolved && !hasBeneficiaries && {
      key: 'benes',
      label: 'No beneficiaries added',
      description: 'Add a recipient before you can send a payment.',
      href: '/beneficiaries/new',
      cta: 'Add beneficiary',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ].filter(Boolean) as PreflightItem[]

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <PageHeader
        title="Send payment"
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'New payment' }]}
        actions={
          <div className="flex items-center gap-2">
            {isSuperAdmin && (
              <Link to="/admin/payments/on-behalf" onClick={reset}>
                <Button variant="outline" size="sm">
                  Pay on behalf
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="sm" onClick={cancel}>Cancel</Button>
          </div>
        }
      />

      {step === 1 && <PreflightBanner items={preflightItems} />}

      <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
        <StepBar current={step} />
        {step === 1 && <Step1 onNext={next} />}
        {step === 2 && <Step2 onNext={next} onBack={back} />}
        {step === 3 && <Step3 onNext={next} onBack={back} />}
        {step === 4 && <Step4 onBack={back} />}
      </div>
    </div>
  )
}
