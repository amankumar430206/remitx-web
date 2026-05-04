import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import kycApi from '@/api/kyc'

export function useKycStatus() {
  return useQuery({
    queryKey: ['kyc-status'],
    queryFn: () => kycApi.status().then(r => r.data.data),
  })
}

export function useInitiateKyc() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => kycApi.initiate().then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kyc-status'] }),
  })
}
