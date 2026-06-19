import { useQuery } from '@tanstack/react-query'
import fxApi from '@/api/fx'

export function useFxRates() {
  return useQuery({
    queryKey: ['fx-rates'],
    queryFn: () => fxApi.rates().then(r => r.data.data),
    staleTime: 60_000,
    refetchInterval: 60_000,
  })
}

export function useFxRatesList() {
  const q = useFxRates()
  return {
    ...q,
    rates: q.data?.rates ?? [],
    provider: q.data?.provider ?? 'market',
  }
}

export function useFxQuote(from: string, to: string, amount: string) {
  return useQuery({
    queryKey: ['fx-quote', from, to, amount],
    queryFn: () => fxApi.quote(from, to, amount).then(r => r.data.data),
    enabled: !!from && !!to && !!amount && parseFloat(amount) > 0,
    staleTime: 25_000,
    gcTime: 30_000,
  })
}
