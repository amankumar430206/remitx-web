import { apiClient } from './client'

export interface Account {
  id: string
  currency: string
  balance: string
  account_number?: string
  provider_name?: string
  provider_account_id?: string
  status: string
  created_at: string
}

export interface LedgerEntry {
  id: string
  entry_type: 'credit' | 'debit'
  amount: string
  currency: string
  balance_after: string
  description: string
  created_at: string
  payment_id?: string
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  meta: { page: number; limit: number; total: number }
}

const accounts = {
  list: () =>
    apiClient.get<{ success: boolean; data: Account[] }>('/accounts'),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: Account & { recentEntries: LedgerEntry[] } }>(`/accounts/${id}`),

  ledger: (id: string, params?: { from?: string; to?: string; page?: number; limit?: number }) =>
    apiClient.get<PaginatedResponse<LedgerEntry>>(`/accounts/${id}/ledger`, { params }),

  create: (currency: string) =>
    apiClient.post<{ success: boolean; data: Account }>('/accounts', { currency }),

  downloadStatement: (id: string, params: { from: string; to: string; format: 'csv' | 'pdf' | 'mt940' }) =>
    apiClient.get(`/reporting/statement`, { params: { accountId: id, ...params }, responseType: 'blob' }),
}

export default accounts
