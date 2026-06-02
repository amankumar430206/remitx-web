import { apiClient } from './client'

// Raw payment row returned by /reporting/transactions
export interface TransactionRow {
  id: string
  reference: string
  status: string
  source_amount: string
  source_currency: string
  dest_amount: string
  dest_currency: string
  fee_amount: string
  exchange_rate: string
  purpose_code: string
  provider_name: string
  provider_payment_id: string | null
  user_id: string
  beneficiary_id: string
  beneficiary_name: string | null
  beneficiary_country: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

// Reconciliation report row from reconciliation_reports table
export interface ReconciliationRow {
  id: string
  report_date: string
  total_payments: number
  total_amount: string
  matched_count: number
  unmatched_count: number
  exceptions: unknown[]
  status: string
}

export interface TransactionFilter {
  page?: number
  limit?: number
  from?: string
  to?: string
  status?: string
  currency?: string
  direction?: 'debit' | 'credit'
  search?: string
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
