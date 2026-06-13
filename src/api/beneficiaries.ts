import { apiClient } from './client'

export interface Beneficiary {
  id: string
  entity_type: 'INDIVIDUAL' | 'COMPANY'
  name: string
  first_name?: string | null
  last_name?: string | null
  country_code: string
  currency: string
  bank_name?: string | null
  bank_address?: string | null
  account_name?: string | null
  account_number?: string | null
  routing_number?: string | null
  sort_code?: string | null
  ifsc_code?: string | null
  iban?: string | null
  swift_bic?: string | null
  transfer_method?: string | null
  address_line1?: string | null
  address_line2?: string | null
  city?: string | null
  state?: string | null
  postal_code?: string | null
  purpose_code?: string | null
  screening_status: 'pending' | 'cleared' | 'flagged' | 'blocked'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CreateBeneficiaryPayload {
  entityType: 'INDIVIDUAL' | 'COMPANY'
  name: string
  firstName?: string | null
  lastName?: string | null
  countryCode: string
  currency: string
  purposeCode: string
  transferMethod?: string | null
  bankName?: string | null
  bankAddress?: string | null
  accountName?: string | null
  accountNumber?: string | null
  routingNumber?: string | null
  sortCode?: string | null
  ifscCode?: string | null
  iban?: string | null
  swiftBic?: string | null
  addressLine1?: string | null
  addressLine2?: string | null
  city?: string | null
  state?: string | null
  postalCode?: string | null
}

export type UpdateBeneficiaryPayload = Partial<CreateBeneficiaryPayload>

const beneficiaries = {
  list: (params?: { page?: number; limit?: number; search?: string }, signal?: AbortSignal) =>
    apiClient.get<{ success: boolean; data: Beneficiary[]; meta: { page: number; limit: number; total: number } }>(
      '/beneficiaries',
      { params, signal }
    ),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: Beneficiary }>(`/beneficiaries/${id}`),

  create: (payload: CreateBeneficiaryPayload) =>
    apiClient.post<{ success: boolean; data: Beneficiary }>('/beneficiaries', payload),

  update: (id: string, payload: UpdateBeneficiaryPayload) =>
    apiClient.put<{ success: boolean; data: Beneficiary }>(`/beneficiaries/${id}`, payload),

  delete: (id: string) =>
    apiClient.delete(`/beneficiaries/${id}`),
}

export default beneficiaries
