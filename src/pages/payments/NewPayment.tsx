import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { FormField } from '@/components/ui/molecules/FormField'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { ContentCard } from '@/layouts/ContentCard'
import { useBeneficiaries } from '@/hooks/useBeneficiaries'
import { usePaymentStore } from '@/stores/paymentStore'
import fxApi, { type FxQuote } from '@/api/fx'
import paymentsApi from '@/api/payments'
import { cn } from '@/lib/utils'

// ─── Step indicator ──────────────────────────────────────────────────────────

const STEPS = ['Recipient', 'Amount & FX', 'Review', 'Confirm'] as const

function StepBar({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => {
        const idx = i + 1
        const done = idx < current
        const active = idx === current
        return (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors',
                  done && 'bg-primary text-white',
                  active && 'bg-primary text-white ring-4 ring-primary/20',
                  !done && !active && 'bg-surface-overlay text-muted-fg'
                )}
              >
                {done ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : idx}
              </div>
              <span className={cn('mt-1 text-xs whitespace-nowrap', active ? 'text-primary font-medium' : 'text-muted-fg')}>
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn('flex-1 h-px mx-2 mb-5', done ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── FX Countdown ────────────────────────────────────────────────────────────

function FxCountdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
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

  const pct = Math.min(100, (secs / 30) * 100)
  const urgent = secs <= 10

  return (
    <div className="flex items-center gap-2">
      <div className="relative h-7 w-7">
        <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
          <circle cx="14" cy="14" r="11" fill="none" stroke="var(--color-border)" strokeWidth="2.5" />
          <circle
            cx="14" cy="14" r="11" fill="none"
            stroke={urgent ? 'var(--color-error)' : 'var(--color-primary)'}
            strokeWidth="2.5"
            strokeDasharray={`${2 * Math.PI * 11}`}
            strokeDashoffset={`${2 * Math.PI * 11 * (1 - pct / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <span className={cn('absolute inset-0 flex items-center justify-center text-[9px] font-bold', urgent ? 'text-error' : 'text-primary')}>
          {secs}
        </span>
      </div>
      <span className={cn('text-xs', urgent ? 'text-error' : 'text-muted-fg')}>
        {urgent ? 'Refreshing soon…' : 'Rate locked'}
      </span>
    </div>
  )
}

// ─── Step 1 — Beneficiary ────────────────────────────────────────────────────

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
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-fg">Search and select the recipient for this payment.</p>
      <SearchInput value={search} onChange={e => setSearch(e.target.value)} onClear={() => setSearch('')} placeholder="Search by name or account number…" />

      {isLoading && <div className="flex justify-center py-8"><Spinner size="md" /></div>}

      {!isLoading && (data?.data?.length ?? 0) === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center">
          <p className="text-sm text-muted-fg">No beneficiaries found.</p>
          <p className="mt-1 text-xs text-muted-fg">Try a different search or add a new beneficiary first.</p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {(data?.data ?? []).map(b => (
          <button
            key={b.id}
            onClick={() => handleSelect(b.id, b.name, b.countryCode)}
            className={cn(
              'flex items-center gap-3 rounded-lg border p-3 text-left transition-all',
              selected === b.id
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-surface hover:border-primary/40'
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-overlay font-semibold text-sm text-foreground">
              {b.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground">{b.name}</p>
              <p className="text-xs text-muted-fg truncate">{b.bankName} · {b.accountNumber} · {b.countryCode}</p>
            </div>
            {selected === b.id && (
              <svg className="h-4 w-4 shrink-0 text-primary" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!selected}>Continue</Button>
      </div>
    </div>
  )
}

// ─── Step 2 — Amount + FX ────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD', 'CAD', 'INR', 'NGN', 'KES']

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { register, watch, handleSubmit, formState: { errors } } = useForm<AmountFormValues>({
    resolver: zodResolver(amountSchema),
    defaultValues: {
      sourceAmount: stored.sourceAmount ?? '',
      sourceCurrency: stored.sourceCurrency ?? 'USD',
      destinationCurrency: stored.destinationCurrency ?? 'EUR',
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
      setQuote(q)
      setData({ quote: q })
    } catch {
      setQuoteError('Failed to get rate. Please try again.')
      setQuote(null)
    } finally {
      setQuoteLoading(false)
    }
  }, [setData])

  // Debounce quote fetch on amount/currency change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchQuote(sourceAmount, sourceCurrency, destinationCurrency)
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [sourceAmount, sourceCurrency, destinationCurrency, fetchQuote])

  const onSubmit = (values: AmountFormValues) => {
    if (!quote) return
    setData({
      sourceAmount: values.sourceAmount,
      sourceCurrency: values.sourceCurrency,
      destinationCurrency: values.destinationCurrency,
      quote,
    })
    onNext()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <p className="text-sm text-muted-fg">Enter the amount you want to send.</p>

      <div className="grid grid-cols-2 gap-4">
        <FormField label="You send" error={errors.sourceAmount?.message}>
          <div className="flex">
            <Input
              {...register('sourceAmount')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="rounded-r-none"
            />
            <select
              {...register('sourceCurrency')}
              className="rounded-l-none border border-l-0 border-input bg-surface-overlay px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </FormField>

        <FormField label="Recipient gets" error={errors.destinationCurrency?.message}>
          <select
            {...register('destinationCurrency')}
            className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </FormField>
      </div>

      {/* FX Quote card */}
      <div className="rounded-lg border border-border bg-surface-overlay p-4">
        {quoteLoading && (
          <div className="flex items-center gap-2 text-sm text-muted-fg">
            <Spinner size="sm" /> Fetching live rate…
          </div>
        )}
        {quoteError && <p className="text-sm text-error">{quoteError}</p>}
        {!quoteLoading && !quoteError && !quote && (
          <p className="text-sm text-muted-fg">Enter an amount to see the live rate.</p>
        )}
        {!quoteLoading && quote && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-fg">Exchange rate</span>
              <FxCountdown expiresAt={quote.expiresAt} onExpire={() => fetchQuote(sourceAmount, sourceCurrency, destinationCurrency)} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold text-foreground">
                1 {quote.from} = {parseFloat(quote.rate).toFixed(4)} {quote.to}
              </span>
            </div>
            <div className="h-px bg-border" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-muted-fg">You send</p>
                <p className="font-semibold text-foreground"><AmountDisplay amount={quote.fromAmount} currency={quote.from} /></p>
              </div>
              <div>
                <p className="text-muted-fg">Recipient gets</p>
                <p className="font-semibold text-foreground"><AmountDisplay amount={quote.toAmount} currency={quote.to} /></p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit" disabled={!quote || quoteLoading}>Continue</Button>
      </div>
    </form>
  )
}

// ─── Step 3 — Review ─────────────────────────────────────────────────────────

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-fg">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  )
}

const detailsSchema = z.object({
  purposeCode: z.string().min(1, 'Required'),
  reference: z.string().max(140).optional(),
})
type DetailsFormValues = z.infer<typeof detailsSchema>

const PURPOSE_CODES = [
  { value: 'TRADE', label: 'Trade / Goods' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'SALARY', label: 'Salary / Wages' },
  { value: 'FAMILY', label: 'Family Support' },
  { value: 'INVESTMENT', label: 'Investment' },
  { value: 'OTHER', label: 'Other' },
]

function Step3({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const { data: stored, setData } = usePaymentStore()
  const { register, handleSubmit, formState: { errors } } = useForm<DetailsFormValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { purposeCode: stored.purposeCode ?? '', reference: stored.reference ?? '' },
  })

  const onSubmit = (values: DetailsFormValues) => {
    setData({ purposeCode: values.purposeCode, reference: values.reference ?? '' })
    onNext()
  }

  const q = stored.quote

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
      <ContentCard>
        <h3 className="text-sm font-semibold text-foreground mb-2">Recipient</h3>
        <ReviewRow label="Name" value={stored.beneficiaryName ?? '—'} />
        <ReviewRow label="Country" value={stored.beneficiaryCountry ?? '—'} />
      </ContentCard>

      {q && (
        <ContentCard>
          <h3 className="text-sm font-semibold text-foreground mb-2">Transfer</h3>
          <ReviewRow label="You send" value={<AmountDisplay amount={q.fromAmount} currency={q.from} />} />
          <ReviewRow label="Recipient gets" value={<AmountDisplay amount={q.toAmount} currency={q.to} />} />
          <ReviewRow label="Exchange rate" value={`1 ${q.from} = ${parseFloat(q.rate).toFixed(4)} ${q.to}`} />
          <ReviewRow label="Spread" value={`${q.spread}%`} />
        </ContentCard>
      )}

      <FormField label="Purpose of payment" error={errors.purposeCode?.message} required>
        <select
          {...register('purposeCode')}
          className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="">Select purpose…</option>
          {PURPOSE_CODES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </FormField>

      <FormField label="Reference (optional)" error={errors.reference?.message}>
        <Input {...register('reference')} placeholder="Invoice #, order ref…" maxLength={140} />
      </FormField>

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack}>Back</Button>
        <Button type="submit">Review & confirm</Button>
      </div>
    </form>
  )
}

// ─── Step 4 — Confirm ────────────────────────────────────────────────────────

function Step4({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: stored, reset } = usePaymentStore()
  const idempotencyKey = useRef(stored.idempotencyKey || crypto.randomUUID())

  const { mutate, isPending, isError, error } = useMutation({
    mutationFn: () => {
      if (!stored.beneficiaryId || !stored.quote || !stored.sourceAmount || !stored.sourceCurrency || !stored.destinationCurrency || !stored.purposeCode) {
        throw new Error('Missing payment data')
      }
      return paymentsApi.submit(
        {
          beneficiaryId: stored.beneficiaryId,
          quoteId: stored.quote.quoteId,
          sourceAmount: stored.sourceAmount,
          sourceCurrency: stored.sourceCurrency,
          destinationCurrency: stored.destinationCurrency,
          purposeCode: stored.purposeCode,
          reference: stored.reference || undefined,
        },
        idempotencyKey.current
      )
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      reset()
      navigate(`/payments/${res.data.data.id}`)
    },
  })

  const q = stored.quote

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-lg border border-border bg-surface-overlay p-5 text-center">
        <p className="text-4xl font-bold text-foreground">
          {q ? <AmountDisplay amount={q.fromAmount} currency={q.from} size="lg" /> : '—'}
        </p>
        <p className="mt-1 text-sm text-muted-fg">
          → {q ? <AmountDisplay amount={q.toAmount} currency={q.to} /> : '—'} to {stored.beneficiaryName}
        </p>
      </div>

      <p className="text-xs text-center text-muted-fg">
        By confirming, you authorise this payment. Once submitted it will be reviewed before processing.
      </p>

      {isError && (
        <div className="rounded-md bg-error/10 border border-error/30 px-4 py-2 text-sm text-error">
          {(error as Error).message || 'Submission failed. Please try again.'}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} disabled={isPending}>Back</Button>
        <Button onClick={() => mutate()} loading={isPending}>
          Confirm & send
        </Button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function NewPayment() {
  const navigate = useNavigate()
  const { step, setStep } = usePaymentStore()

  const next = () => setStep(step + 1)
  const back = () => { if (step > 1) setStep(step - 1) }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title="Send payment"
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'New payment' }]}
        actions={<Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>Cancel</Button>}
      />
      <ContentCard>
        <StepBar current={step} />
        {step === 1 && <Step1 onNext={next} />}
        {step === 2 && <Step2 onNext={next} onBack={back} />}
        {step === 3 && <Step3 onNext={next} onBack={back} />}
        {step === 4 && <Step4 onBack={back} />}
      </ContentCard>
    </div>
  )
}
