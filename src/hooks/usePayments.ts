import { useQuery } from '@tanstack/react-query'
import paymentsApi from '@/api/payments'

export function usePayments(params?: { page?: number; limit?: number; status?: string; direction?: string; from?: string; to?: string; search?: string; tenantId?: string }) {
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

export function useApprovalQueue(tenantId?: string) {
  return useQuery({
    queryKey: ['approval-queue', tenantId],
    queryFn: () => paymentsApi.approvalQueue(tenantId).then(r => r.data),
    refetchInterval: 30_000,
  })
}
