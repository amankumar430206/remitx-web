import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import accountsApi from '@/api/accounts'

export function useAccounts() {
  return useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list().then(r => r.data.data),
  })
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: ['accounts', id],
    queryFn: () => accountsApi.get(id).then(r => r.data.data),
    enabled: !!id,
  })
}

export function useAccountLedger(id: string, params?: { from?: string; to?: string; page?: number }) {
  return useQuery({
    queryKey: ['accounts', id, 'ledger', params],
    queryFn: () => accountsApi.ledger(id, params).then(r => r.data),
    enabled: !!id,
  })
}

export function useAdjustBalance(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { type: 'credit' | 'debit'; amount: string; description: string }) =>
      accountsApi.adjust(id, payload).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['accounts', id] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
    },
  })
}
