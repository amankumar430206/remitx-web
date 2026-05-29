import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { usePaymentStore } from '@/stores/paymentStore'
import fxApi, { type FxQuote } from '@/api/fx'
import paymentsApi from '@/api/payments'
import accountsApi from '@/api/accounts'
import { cn } from '@/lib/utils'
import { getApiError } from '@/lib/apiError'

// ─── Constants ───────────────────────────────────────────────────────────────

const STEPS = ['Recipient', 'Amount', 'Details', 'Confirm'] as const
const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'INR', 'NGN', 'KES']
const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c, label: c }))
const MIN_LOCK_MS = 5 * 60 * 1000 // 5 minute minimum lock display

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

// ─── Step 1 — Recipient ───────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  const [search, setSearch] = useState('')
  const { data, isLoading } = useBeneficiaries({ search, limit: 20 })
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
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-14 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">No beneficiaries found</p>
            <p className="mt-0.5 text-xs text-muted-fg">Try a different name or add a new beneficiary first.</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
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

      <div className="flex justify-end pt-1">
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

function Step2({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { setData, data: stored } = usePaymentStore()
  const [quote, setQuote] = useState<FxQuote | null>(stored.quote ?? null)
  const [quoteLoading, setQuoteLoading] = useState(false)
  const [quoteError, setQuoteError] = useState('')
  const [feeLoading, setFeeLoading] = useState(false)
  const [feePreview, setFeePreview] = useState<{ feeAmount: string; configured: boolean } | null>(
    stored.feeAmount != null ? { feeAmount: stored.feeAmount, configured: stored.feeConfigured ?? false } : null
  )
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

  const fetchQuote = useCallback(async (amount: string, from: string, to: string) => {
    if (!amount || parseFloat(amount) <= 0 || from === to) return
    setQuoteLoading(true)
    setQuoteError('')
    try {
      const res = await fxApi.quote(from, to, amount)
      const q = res.data.data
      // Ensure minimum 5-minute lock period in the display
      const apiExpiry = new Date(q.expiresAt).getTime()
      const minExpiry = Date.now() + MIN_LOCK_MS
      const adjustedQuote: FxQuote = { ...q, expiresAt: new Date(Math.max(apiExpiry, minExpiry)).toISOString() }
      setQuote(adjustedQuote)

      // Fetch fee preview in parallel
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
  }, [setData])

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

  const CurrencySelect = ({ field }: { field: 'sourceCurrency' | 'destinationCurrency' }) => (
    <select
      value={field === 'sourceCurrency' ? sourceCurrency : destinationCurrency}
      onChange={e => setValue(field, e.target.value)}
      className="h-10 rounded-xl border border-border bg-surface-raised px-3 text-sm font-bold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
    >
      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
    </select>
  )

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
            <CurrencySelect field="sourceCurrency" />
          </div>
          {errors.sourceAmount && (
            <p className="mt-1.5 text-xs text-danger-fg">{errors.sourceAmount.message}</p>
          )}
        </div>

        {/* Rate strip */}
        <div className="bg-surface-raised px-4 py-2.5 flex items-center justify-between gap-3">
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
            <CurrencySelect field="destinationCurrency" />
          </div>
        </div>
      </div>

      {/* Fee breakdown */}
      {quote && !quoteLoading && (
        <div className="rounded-xl border border-border bg-surface-raised divide-y divide-border overflow-hidden text-xs">
          {/* Transfer fee row */}
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
            ) : !feePreview.configured ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success-fg">
                No fee configured
              </span>
            ) : parseFloat(feePreview.feeAmount) === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success-fg">
                Free
              </span>
            ) : (
              <span className="font-semibold text-foreground tabular-nums">
                <AmountDisplay amount={feePreview.feeAmount} currency={quote.from} size="sm" />
              </span>
            )}
          </div>
          {/* Total debit row */}
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

      <div className="flex justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={!quote || quoteLoading} className="px-8">Continue</Button>
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

      {/* Transfer summary */}
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

      {/* Form fields */}
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

function ConfirmRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-fg">{label}</span>
      <span className={cn('text-sm font-semibold text-foreground text-right', mono && 'font-mono text-xs')}>{value}</span>
    </div>
  )
}

function Step4({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: stored, reset } = usePaymentStore()
  const idempotencyKey = useRef(stored.idempotencyKey || crypto.randomUUID())
  const q = stored.quote
  const feeAmount = stored.feeAmount ? parseFloat(stored.feeAmount) : 0
  const feeConfigured = stored.feeConfigured ?? false
  const totalDebit = q ? parseFloat(q.fromAmount) + feeAmount : 0

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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">Confirm your payment</h3>
        <p className="text-sm text-muted-fg mt-0.5">Review everything before sending.</p>
      </div>

      {/* Amount hero */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0f172a] border border-white/[0.07] p-6 text-center">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" />
        <p className="relative text-[11px] font-semibold uppercase tracking-widest text-primary/80 mb-3">Total debit</p>
        <p className="relative text-5xl font-bold text-white tabular-nums">
          {q ? totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
          <span className="ml-2 text-2xl font-semibold text-white/50">{q?.from}</span>
        </p>
        {q && (
          <p className="relative mt-3 text-sm text-white/50">
            {stored.beneficiaryName} receives{' '}
            <span className="font-semibold text-white/80 tabular-nums">
              {parseFloat(q.toAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {q.to}
            </span>
          </p>
        )}
      </div>

      {/* Summary rows */}
      <div className="rounded-2xl border border-border bg-surface px-5">
        {q && (
          <>
            <ConfirmRow label="Recipient" value={stored.beneficiaryName ?? '—'} />
            <ConfirmRow
              label="Transfer amount"
              value={`${parseFloat(q.fromAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${q.from}`}
            />
            <ConfirmRow
              label="Transfer fee"
              value={
                stored.feeConfigured == null
                  ? '—'
                  : !feeConfigured
                  ? <span className="text-xs text-success-fg font-semibold">No fee configured</span>
                  : feeAmount === 0
                  ? <span className="text-xs text-success-fg font-semibold">Free</span>
                  : `${feeAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 8 })} ${q.from}`
              }
            />
            <ConfirmRow
              label="Exchange rate"
              value={`1 ${q.from} = ${parseFloat(q.rate).toFixed(4)} ${q.to}`}
              mono
            />
            <ConfirmRow label="Purpose" value={stored.purposeCode ?? '—'} />
            {stored.note && <ConfirmRow label="Note" value={stored.note} />}
          </>
        )}
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised px-4 py-3.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <p className="text-xs text-muted-fg leading-relaxed">
          By confirming, you authorise this payment. It will be reviewed before processing and <strong className="text-foreground font-medium">cannot be reversed</strong> once approved.
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

      <div className="flex justify-between pt-1">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>Back</Button>
        <Button onClick={() => mutate()} loading={isPending} variant="gradient" className="px-8">
          Confirm & send
        </Button>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function NewPayment() {
  const navigate = useNavigate()
  const { step, setStep, reset } = usePaymentStore()
  const isSuperAdmin = useAuthStore(s => s.user?.role === 'super_admin')

  // Always start fresh when entering this page
  useEffect(() => { reset() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const next = () => setStep(step + 1)
  const back = () => { if (step > 1) setStep(step - 1) }
  const cancel = () => { reset(); navigate('/payments') }

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
