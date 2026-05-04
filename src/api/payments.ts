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
  statusHistory?: Array<{ status: string; actorId: string; actorType: string; note?: string; createdAt: string }>
}

const payments = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    apiClient.get<{ success: boolean; data: Payment[]; meta: { page: number; limit: number; total: number } }>('/payments', { params }),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: Payment }>(`/payments/${id}`),

  approvalQueue: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: Payment[]; meta: { page: number; limit: number; total: number } }>('/payments/approval-queue', { params }),
}

export default payments
