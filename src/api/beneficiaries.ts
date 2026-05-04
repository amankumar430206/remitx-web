import { apiClient } from './client'

export interface Beneficiary {
  id: string
  name: string
  countryCode: string
  currency: string
  bankName: string
  accountNumber: string
  routingCode?: string
  swiftCode?: string
  type: 'individual' | 'business'
  status: 'active' | 'inactive'
  createdAt: string
  updatedAt: string
}

export interface CreateBeneficiaryPayload {
  name: string
  countryCode: string
  currency: string
  bankName: string
  accountNumber: string
  routingCode?: string
  swiftCode?: string
  type: 'individual' | 'business'
}

const beneficiaries = {
  list: (params?: { page?: number; limit?: number; search?: string; countryCode?: string }) =>
    apiClient.get<{ success: boolean; data: Beneficiary[]; meta: { page: number; limit: number; total: number } }>(
      '/beneficiaries',
      { params }
    ),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: Beneficiary }>(`/beneficiaries/${id}`),

  create: (payload: CreateBeneficiaryPayload) =>
    apiClient.post<{ success: boolean; data: Beneficiary }>('/beneficiaries', payload),

  update: (id: string, payload: Partial<CreateBeneficiaryPayload>) =>
    apiClient.put<{ success: boolean; data: Beneficiary }>(`/beneficiaries/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/beneficiaries/${id}`),
}

export default beneficiaries
