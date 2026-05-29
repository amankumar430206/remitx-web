import { useQuery } from '@tanstack/react-query'
import paymentsApi from '@/api/payments'

export function usePayments(params?: { page?: number; limit?: number; status?: string; from?: string; to?: string; search?: string }) {
  return useQuery({
    queryKey: ['payments', params],
    queryFn: ({ signal }) => paymentsApi.list(params, signal).then(r => r.data),
  })
}

export function usePayment(id: string) {
  return useQuery({
    queryKey: ['payments', id],
    queryFn: () => paymentsApi.get(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useApprovalQueue() {
  return useQuery({
    queryKey: ['approval-queue'],
    queryFn: () => paymentsApi.approvalQueue().then(r => r.data),
    refetchInterval: 30_000,
  })
}
