import { apiClient } from './client'

export interface Payment {
  id: string
  status: string
  source_amount: string
  source_currency: string
  dest_amount: string
  dest_currency: string
  fee_amount: string
  exchange_rate: string
  purpose_code: string
  reference?: string
  idempotency_key: string
  user_id: string
  beneficiary_id: string
  created_at: string
  updated_at: string
  completed_at?: string
  beneficiary_name?: string | null
  beneficiary_country_code?: string | null
  provider_name?: string | null
  provider_payment_id?: string | null
  ops_notes?: string | null
  note?: string | null
  status_history?: Array<{
    id: string
    status: string
    actor_id: string
    actor_type: string
    notes?: string
    created_at: string
  }>
}

export interface SubmitPaymentPayload {
  beneficiaryId: string
  accountId: string
  quoteId: string
  purposeCode: string
  note?: string
}

export interface FeePreview {
  feeAmount: string
  configured: boolean
}

const payments = {
  list: (params?: { page?: number; limit?: number; status?: string; direction?: string; from?: string; to?: string; search?: string }, signal?: AbortSignal) =>
    apiClient.get<{ success: boolean; data: Payment[]; meta: { page: number; limit: number; total: number } }>('/payments', { params, signal }),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: Payment }>(`/payments/${id}`),

  submit: (payload: SubmitPaymentPayload, idempotencyKey: string) =>
    apiClient.post<{ success: boolean; data: Payment }>('/payments', payload, {
      headers: { 'Idempotency-Key': idempotencyKey },
    }),

  approve: (id: string, note?: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/approve`, { note }),

  reject: (id: string, reason: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/reject`, { reason }),

  cancel: (id: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/cancel`),

  approvalQueue: () =>
    apiClient.get<{ success: boolean; data: Payment[] }>('/payments/approval-queue'),

  feePreview: (from: string, to: string, amount: string) =>
    apiClient.get<{ success: boolean; data: FeePreview }>('/payments/fee-preview', {
      params: { from, to, amount },
    }),
}

export default payments
