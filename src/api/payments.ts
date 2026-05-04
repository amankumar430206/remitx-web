import { apiClient } from './client'

export interface Payment {
  id: string
  status: string
  sourceAmount: string
  sourceCurrency: string
  destinationAmount: string
  destinationCurrency: string
  feeAmount: string
  exchangeRate: string
  purposeCode: string
  reference?: string
  idempotencyKey: string
  initiatorId: string
  beneficiaryId: string
  createdAt: string
  updatedAt: string
  completedAt?: string
  beneficiary?: { name: string; countryCode: string }
  statusHistory?: Array<{
    id: string
    status: string
    actorId: string
    actorType: string
    note?: string
    createdAt: string
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

  reject: (id: string, note: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/reject`, { note }),

  cancel: (id: string) =>
    apiClient.put<{ success: boolean; data: Payment }>(`/payments/${id}/cancel`),

  approvalQueue: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: Payment[]; meta: { page: number; limit: number; total: number } }>('/payments/approval-queue', { params }),
}

export default payments
