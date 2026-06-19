import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { Button } from '@/components/ui/atoms/Button'
import { ContentCard } from '@/layouts/ContentCard'
import { useFxRatesList, useFxQuote } from '@/hooks/useFxRates'
import fxApi, { type ZoqqQuoteType, type ZoqqLockPeriod, type ZoqqConversionSchedule } from '@/api/fx'
import { usePaymentStore } from '@/stores/paymentStore'

export function FxRates() {
  const { rates, provider, isLoading, isError, refetch } = useFxRatesList()
  const navigate = useNavigate()
  const { setData } = usePaymentStore()

  const [calcFrom, setCalcFrom] = useState('')
  const [calcTo, setCalcTo] = useState('')
  const [calcAmount, setCalcAmount] = useState('')
  const [debouncedAmount, setDebouncedAmount] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(calcAmount), 500)
    return () => clearTimeout(t)
  }, [calcAmount])

  const currencies = useMemo(() => {
    const all = rates.flatMap(r => [r.from, r.to])
    return [...new Set(all)].sort()
  }, [rates])

  useEffect(() => {
    if (currencies.length >= 2 && !calcFrom) {
      setCalcFrom(currencies[0])
      setCalcTo(currencies[1])
    }
  }, [currencies, calcFrom])

  const { data: quote, isFetching: quoteFetching } = useFxQuote(calcFrom, calcTo, debouncedAmount)

  const [zoqqQuoteType,          setZoqqQuoteType]          = useState<ZoqqQuoteType>('payout')
  const [zoqqLockPeriod,         setZoqqLockPeriod]         = useState<ZoqqLockPeriod>('15_mins')
  const [zoqqConversionSchedule, setZoqqConversionSchedule] = useState<ZoqqConversionSchedule>('immediate')

  const { mutate: payNow, isPending: payNowLoading } = useMutation({
    mutationFn: () => fxApi.quote(calcFrom, calcTo, calcAmount, {
      quoteType: zoqqQuoteType,
      lockPeriod: zoqqLockPeriod,
      conversionSchedule: zoqqConversionSchedule,
    }),
    onSuccess: (res) => {
      const q = res.data.data
      setData({ sourceCurrency: calcFrom, destinationCurrency: calcTo, sourceAmount: calcAmount, quote: q })
      navigate(`/payments/new?quoteId=${encodeURIComponent(q.quoteId)}&from=${calcFrom}&to=${calcTo}&amount=${encodeURIComponent(calcAmount)}`)
    },
  })

  const canPayNow = provider === 'zoqq' && !!calcFrom && !!calcTo && parseFloat(calcAmount) > 0

  if (isLoading) return <LoadingState message="Loading exchange rates…" />
  if (isError) return <ErrorState title="Could not load rates" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      <PageHeader
        title="FX Rates"
        breadcrumbs={[{ label: 'FX Rates' }]}
      />

      {/* Calculator */}
      <ContentCard>
        <h3 className="text-sm font-semibold text-foreground mb-4">Currency calculator</h3>
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">You send</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={calcAmount}
                onChange={e => setCalcAmount(e.target.value)}
                placeholder="0.00"
                className="flex-1 h-9 rounded border border-border bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <select
                value={calcFrom}
                onChange={e => setCalcFrom(e.target.value)}
                className="h-9 rounded border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currencies.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center pb-1">
            <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          </div>

          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-sm font-medium text-foreground">They receive</label>
            <div className="flex gap-2">
              <div className="flex-1 h-9 rounded border border-border bg-surface-raised px-3 text-sm flex items-center text-foreground font-medium">
                {quoteFetching ? (
                  <Spinner size="sm" />
                ) : quote ? (
                  parseFloat(quote.toAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                ) : (
                  <span className="text-muted-fg">—</span>
                )}
              </div>
              <select
                value={calcTo}
                onChange={e => setCalcTo(e.target.value)}
                className="h-9 rounded border border-border bg-surface px-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {currencies.filter(c => c !== calcFrom).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {quote && (
          <p className="mt-3 text-xs text-muted-fg">
            Rate: 1 {calcFrom} = {parseFloat(quote.rate).toFixed(4)} {calcTo}
            {' · '}
            Spread: {parseFloat(quote.spread).toFixed(4)}%
            {' · '}
            Quote expires in ~30s
          </p>
        )}

        {canPayNow && (
          <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3">
            {/* Quote type */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-fg w-32 shrink-0">Quote type</span>
              {(['payout', 'conversion'] as const).map(t => (
                <button key={t} type="button" onClick={() => setZoqqQuoteType(t)}
                  className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold transition-all ${
                    zoqqQuoteType === t
                      ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                      : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {t === 'payout' ? 'Payout' : 'Conversion'}
                </button>
              ))}
            </div>

            {/* Lock period */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-fg w-32 shrink-0">Lock period</span>
              {(['5_mins', '15_mins', '1_hour', '4_hours', '8_hours', '24_hours'] as const).map(lp => (
                <button key={lp} type="button" onClick={() => setZoqqLockPeriod(lp)}
                  className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold transition-all ${
                    zoqqLockPeriod === lp
                      ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                      : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {lp.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Conversion schedule */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-fg w-32 shrink-0">Convert</span>
              {(['immediate', 'end_of_day', 'next_day', '2_days'] as const).map(cs => (
                <button key={cs} type="button" onClick={() => setZoqqConversionSchedule(cs)}
                  className={`rounded-full border px-3 py-0.5 text-[11px] font-semibold transition-all ${
                    zoqqConversionSchedule === cs
                      ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                      : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
                  }`}
                >
                  {cs === 'immediate' ? 'Immediately' : cs === 'end_of_day' ? 'End of day' : cs === 'next_day' ? 'Next day' : 'In 2 days'}
                </button>
              ))}
            </div>

            <div className="flex justify-end">
              <Button
                onClick={() => payNow()}
                loading={payNowLoading}
                variant="gradient"
                size="sm"
              >
                Pay now →
              </Button>
            </div>
          </div>
        )}
      </ContentCard>

      {/* Rates grid */}
      <ContentCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">Live rates</h3>
          {provider === 'zoqq' ? (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-success-fg bg-success/10 border border-success/20 rounded-full px-2.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-success-fg animate-pulse" />
              Live via Zoqq
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-fg bg-surface border border-border rounded-full px-2.5 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-muted-fg" />
              Market rates
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rates.map(rate => (
            <div
              key={`${rate.from}-${rate.to}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {rate.from} → {rate.to}
                </p>
                <p className="text-xs text-muted-fg mt-0.5">
                  Mid: {parseFloat(rate.midRate).toFixed(4)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-foreground">
                  {parseFloat(rate.clientRate).toFixed(4)}
                </p>
                <p className="text-xs text-muted-fg">per 1 {rate.from}</p>
              </div>
            </div>
          ))}
        </div>
        {rates.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-fg">No rates available.</p>
        )}
      </ContentCard>
    </div>
  )
}
