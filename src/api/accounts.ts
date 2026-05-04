import { apiClient } from './client'

export interface Account {
  id: string
  currency: string
  balance: string
  providerRef: string
  createdAt: string
}

export interface LedgerEntry {
  id: string
  entryType: 'credit' | 'debit'
  amount: string
  currency: string
  balanceAfter: string
  description: string
  createdAt: string
  paymentId?: string
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
