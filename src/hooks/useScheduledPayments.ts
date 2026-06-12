import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import scheduledPaymentsApi, {
  type CreateScheduledPaymentPayload,
  type UpdateScheduledPaymentPayload,
} from '@/api/scheduledPayments'

const QK = 'scheduled-payments'

export function useScheduledPayments(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: [QK, params],
    queryFn: () => scheduledPaymentsApi.list(params).then(r => r.data),
  })
}

export function useScheduledPayment(id: string) {
  return useQuery({
    queryKey: [QK, id],
    queryFn: () => scheduledPaymentsApi.get(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCreateScheduledPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateScheduledPaymentPayload) =>
      scheduledPaymentsApi.create(payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useUpdateScheduledPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & UpdateScheduledPaymentPayload) =>
      scheduledPaymentsApi.update(id, payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}

export function useCancelScheduledPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => scheduledPaymentsApi.cancel(id).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: [QK] }),
  })
}
