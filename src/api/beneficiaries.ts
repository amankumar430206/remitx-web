import { apiClient } from './client'

export interface Beneficiary {
  id: string
  name: string
  country_code: string
  currency: string
  bank_name?: string | null
  account_number?: string | null
  routing_number?: string | null
  sort_code?: string | null
  ifsc_code?: string | null
  iban?: string | null
  swift_bic?: string | null
  purpose_code?: string | null
  screening_status: 'pending' | 'cleared' | 'flagged'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateBeneficiaryPayload {
  name: string
  countryCode: string
  currency: string
  bankName?: string
  purposeCode: string
  accountNumber?: string
  routingNumber?: string
  sortCode?: string
  ifscCode?: string
  iban?: string
  swiftBic?: string
}

const beneficiaries = {
  list: (params?: { page?: number; limit?: number; search?: string }) =>
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
