import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import beneficiariesApi, { type CreateBeneficiaryPayload } from '@/api/beneficiaries'

export function useBeneficiaries(params?: { page?: number; limit?: number; search?: string }) {
  return useQuery({
    queryKey: ['beneficiaries', params],
    queryFn: () => beneficiariesApi.list(params).then(r => r.data),
  })
}

export function useBeneficiary(id: string) {
  return useQuery({
    queryKey: ['beneficiaries', id],
    queryFn: () => beneficiariesApi.get(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useCreateBeneficiary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateBeneficiaryPayload) => beneficiariesApi.create(payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  })
}

export function useDeleteBeneficiary() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => beneficiariesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['beneficiaries'] }),
  })
}
