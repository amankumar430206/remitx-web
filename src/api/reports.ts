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
  id: string
  report_date: string
  total_payments: number
  total_amount: string
  matched_count: number
  unmatched_count: number
  status: string
  exceptions: unknown[]
}

export interface TransactionFilter {
  page?: number
  limit?: number
  from?: string
  to?: string
  status?: string
  currency?: string
  format?: 'json' | 'csv' | 'pdf'
}

const reports = {
  statement: (params: { accountId: string; from: string; to: string; format?: 'json' | 'csv' | 'pdf' | 'mt940' }) => {
    const isBlob = params.format && params.format !== 'json'
    return apiClient.get('/reporting/statement', {
      params,
      responseType: isBlob ? 'blob' : 'json',
    })
  },

  transactions: (params?: Omit<TransactionFilter, 'format'>) =>
    apiClient.get<{ success: boolean; data: TransactionRow[]; meta: { page: number; limit: number; total: number } }>(
      '/reporting/transactions',
      { params },
    ),

  transactionsExport: (params: Omit<TransactionFilter, 'page' | 'limit'> & { format: 'csv' | 'pdf' }) =>
    apiClient.get('/reporting/transactions', { params, responseType: 'blob' }),

  reconciliation: (params?: { from?: string; to?: string }) =>
    apiClient.get<{ success: boolean; data: ReconciliationRow[] }>('/reporting/reconciliation', { params }),

  fxSummary: (params?: { from?: string; to?: string }) =>
    apiClient.get<{ success: boolean; data: unknown }>('/reporting/fx-summary', { params }),

  audit: (params?: { from?: string; to?: string; action?: string; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: unknown[]; meta: { page: number; limit: number; total: number } }>(
      '/reporting/audit',
      { params },
    ),
}

export default reports
