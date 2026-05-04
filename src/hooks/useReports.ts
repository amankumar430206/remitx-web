import { useQuery } from '@tanstack/react-query'
import reportsApi from '@/api/reports'
import type { TransactionFilter } from '@/api/reports'

export function useTransactions(params?: TransactionFilter) {
  return useQuery({
    queryKey: ['reports-transactions', params],
    queryFn: () => reportsApi.transactions(params).then(r => r.data),
  })
}

export function useReconciliation(params?: { from?: string; to?: string }) {
  return useQuery({
    queryKey: ['reports-reconciliation', params],
    queryFn: () => reportsApi.reconciliation(params).then(r => r.data.data),
    enabled: !!(params?.from && params?.to),
  })
}
