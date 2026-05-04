import { apiClient } from './client'

export interface TransactionRow {
  id: string
  date: string
  description: string
  amount: string
  currency: string
  type: 'credit' | 'debit'
  status: string
  balance: string
}

export interface ReconciliationRow {
  date: string
  openingBalance: string
  credits: string
  debits: string
  closingBalance: string
  exceptions: number
}

export interface TransactionFilter {
  page?: number
  limit?: number
  from?: string
  to?: string
  status?: string
  currency?: string
}

const reports = {
  statementExport: (params: { accountId: string; from: string; to: string; format: 'csv' | 'pdf' }) =>
    apiClient.get('/reports/statement', { params, responseType: 'blob' }),

  transactions: (params?: TransactionFilter) =>
    apiClient.get<{ success: boolean; data: TransactionRow[]; meta: { page: number; limit: number; total: number } }>(
      '/reports/transactions',
      { params }
    ),

  transactionsExport: (params: Omit<TransactionFilter, 'page' | 'limit'> & { format: 'csv' | 'pdf' }) =>
    apiClient.get('/reports/transactions/export', { params, responseType: 'blob' }),

  reconciliation: (params?: { from?: string; to?: string }) =>
    apiClient.get<{ success: boolean; data: ReconciliationRow[] }>('/reports/reconciliation', { params }),
}

export default reports
