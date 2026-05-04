import { useState, useEffect, useMemo } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { ContentCard } from '@/layouts/ContentCard'
import { useFxRates, useFxQuote } from '@/hooks/useFxRates'

function RelativeTime({ date }: { date: string }) {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diff < 60) return <span>{diff}s ago</span>
  if (diff < 3600) return <span>{Math.floor(diff / 60)}m ago</span>
  return <span>{Math.floor(diff / 3600)}h ago</span>
}

export function FxRates() {
  const { data: rates, isLoading, isError, refetch } = useFxRates()

  const [calcFrom, setCalcFrom] = useState('')
  const [calcTo, setCalcTo] = useState('')
  const [calcAmount, setCalcAmount] = useState('')
  const [debouncedAmount, setDebouncedAmount] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setDebouncedAmount(calcAmount), 500)
    return () => clearTimeout(t)
  }, [calcAmount])

  const currencies = useMemo(() => {
    const all = (rates ?? []).flatMap(r => [r.from, r.to])
    return [...new Set(all)].sort()
  }, [rates])

  useEffect(() => {
    if (currencies.length >= 2 && !calcFrom) {
      setCalcFrom(currencies[0])
      setCalcTo(currencies[1])
    }
  }, [currencies, calcFrom])

  const { data: quote, isFetching: quoteFetching } = useFxQuote(calcFrom, calcTo, debouncedAmount)

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
      </ContentCard>

      {/* Rates grid */}
      <ContentCard>
        <h3 className="text-sm font-semibold text-foreground mb-4">Live rates</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(rates ?? []).map(rate => (
            <div
              key={`${rate.from}-${rate.to}`}
              className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-4 py-3"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {rate.from} → {rate.to}
                </p>
                <p className="text-xs text-muted-fg mt-0.5">
                  Updated <RelativeTime date={rate.updatedAt} />
                </p>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-foreground">
                  {parseFloat(rate.rate).toFixed(4)}
                </p>
                <p className="text-xs text-muted-fg">per 1 {rate.from}</p>
              </div>
            </div>
          ))}
        </div>
        {(rates ?? []).length === 0 && (
          <p className="py-6 text-center text-sm text-muted-fg">No rates available.</p>
        )}
      </ContentCard>
    </div>
  )
}
