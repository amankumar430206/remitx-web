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
  quoteId: string
  sourceAmount: string
  sourceCurrency: string
  destinationCurrency: string
  purposeCode: string
  reference?: string
}

const payments = {
  list: (params?: { page?: number; limit?: number; status?: string; from?: string; to?: string }) =>
    apiClient.get<{ success: boolean; data: Payment[]; meta: { page: number; limit: number; total: number } }>('/payments', { params }),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: Payment }>(`/payments/${id}`),

  submit: (payload: SubmitPaymentPayload, idempotencyKey: string) =>
    apiClient.post<{ success: boolean; data: Payment }>('/payments', payload, {
      headers: { 'X-Idempotency-Key': idempotencyKey },
    }),

  approve: (id: string, note?: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/approve`, { note }),

  reject: (id: string, reason: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/reject`, { reason }),

  cancel: (id: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/cancel`),

  approvalQueue: () =>
    apiClient.get<{ success: boolean; data: Payment[] }>('/payments/approval-queue'),
}

export default payments
