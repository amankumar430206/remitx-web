import { useQuery } from '@tanstack/react-query'
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
