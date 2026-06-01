import { apiClient } from './client'
import type { TenantTheme, UpdateThemePayload } from './tenants'

export interface AdminTenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'inactive'
  created_at: string
  user_count: number
  pending_kyc_count: number
}

export interface KycQueueItem {
  id: string
  user_id: string
  email: string
  first_name: string | null
  last_name: string | null
  status: 'submitted' | 'pending'
  documents: TenantContactDocument[]
  created_at: string
}

export interface ManualPaymentQueueItem {
  id: string
  reference: string
  source_currency: string
  source_amount: string
  dest_currency: string
  dest_amount: string
  provider_name: string | null
  status: string
  created_at: string
}

export interface AllPayment {
  id: string
  tenant_id: string
  tenant_name: string | null
  tenant_slug: string | null
  user_id: string
  reference: string
  source_currency: string
  source_amount: string
  dest_currency: string
  dest_amount: string
  exchange_rate: string
  fee_amount: string
  provider_name: string | null
  provider_payment_id: string | null
  purpose_code: string
  status: string
  note: string | null
  ops_notes: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CorridorConfig {
  id: string
  tenant_id: string
  source_currency: string
  dest_currency: string | null
  provider_name: string
  priority: number
  is_active: boolean
}

export interface FeeConfig {
  id: string
  tenant_id: string
  source_currency: string
  dest_currency: string | null
  fee_type: 'flat' | 'percent'
  fee_value: string
  min_fee: string | null
  max_fee: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface TenantUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  status: string
  kyc_status: string | null
  created_at: string
}

export interface TenantBeneficiary {
  id: string
  name: string
  country_code: string
  currency: string
  bank_name: string | null
  account_number: string | null
  iban: string | null
  swift_bic: string | null
  screening_status: string
  is_active: boolean
  created_at: string
}

export interface TenantAccount {
  id: string
  user_id: string
  currency: string
  balance: string
  account_number: string | null
  provider_name: string | null
  status: string
  created_at: string
}

export interface TenantContactDocument {
  type?: string | null
  filename: string
  storedAs?: string
  mimetype?: string
  size?: number
  uploadedAt: string
}

export interface TenantContact {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  role: string
  status: string
  kyc_status: string | null
  created_at: string
  kyc_id: string | null
  kyc_app_status: string | null
  kyc_documents: TenantContactDocument[] | null
  reviewed_at: string | null
  rejection_reason: string | null
}

const admin = {
  tenants: {
    list: () =>
      apiClient.get<{ success: boolean; data: AdminTenant[] }>('/admin/tenants'),

    get: (id: string) =>
      apiClient.get<{ success: boolean; data: AdminTenant }>(`/admin/tenants/${id}`),

    create: (payload: { slug: string; name: string; adminEmail: string }) =>
      apiClient.post<{ success: boolean; data: { tenant: AdminTenant; inviteToken: string } }>(
        '/admin/tenants',
        payload,
      ),

    update: (id: string, payload: { name?: string }) =>
      apiClient.put<{ success: boolean; data: AdminTenant }>(`/admin/tenants/${id}`, payload),

    setStatus: (id: string, status: 'active' | 'suspended' | 'inactive') =>
      apiClient.put<{ success: boolean; data: AdminTenant }>(`/admin/tenants/${id}/status`, { status }),

    getBranding: (id: string) =>
      apiClient.get<{ success: boolean; data: TenantTheme }>(`/admin/tenants/${id}/branding`),

    updateBranding: (id: string, payload: UpdateThemePayload) =>
      apiClient.put<{ success: boolean; data: TenantTheme }>(`/admin/tenants/${id}/branding`, payload),

    resetBranding: (id: string) =>
      apiClient.delete<{ success: boolean; data: TenantTheme }>(`/admin/tenants/${id}/branding`),
  },

  globalTheme: {
    get: () =>
      apiClient.get<{ success: boolean; data: TenantTheme }>('/admin/global-theme'),
  },

  users: {
    list: (tenantId: string) =>
      apiClient.get<{ success: boolean; data: TenantUser[] }>(`/admin/tenants/${tenantId}/users`),
  },

  tenantBeneficiaries: {
    list: (tenantId: string) =>
      apiClient.get<{ success: boolean; data: TenantBeneficiary[] }>(`/admin/tenants/${tenantId}/beneficiaries`),
  },

  tenantAccounts: {
    list: (tenantId: string) =>
      apiClient.get<{ success: boolean; data: TenantAccount[] }>(`/admin/tenants/${tenantId}/accounts`),
  },

  contact: {
    get: (tenantId: string) =>
      apiClient.get<{ success: boolean; data: TenantContact | null }>(`/admin/tenants/${tenantId}/contact`),
  },

  fees: {
    list: (tenantId: string) =>
      apiClient.get<{ success: boolean; data: FeeConfig[] }>(`/admin/tenants/${tenantId}/fee-config`),

    create: (tenantId: string, payload: {
      sourceCurrency: string
      destCurrency?: string | null
      feeType: 'flat' | 'percent'
      feeValue: number
      minFee?: number | null
      maxFee?: number | null
    }) =>
      apiClient.post<{ success: boolean; data: FeeConfig }>(`/admin/tenants/${tenantId}/fee-config`, payload),

    update: (tenantId: string, feeId: string, payload: {
      feeType?: 'flat' | 'percent'
      feeValue?: number
      minFee?: number | null
      maxFee?: number | null
      isActive?: boolean
    }) =>
      apiClient.put<{ success: boolean; data: FeeConfig }>(`/admin/tenants/${tenantId}/fee-config/${feeId}`, payload),

    delete: (tenantId: string, feeId: string) =>
      apiClient.delete(`/admin/tenants/${tenantId}/fee-config/${feeId}`),
  },

  kyc: {
    queue: () =>
      apiClient.get<{ success: boolean; data: KycQueueItem[] }>('/admin/kyc-queue'),

    approve: (tenantId: string, userId: string, note?: string) =>
      apiClient.put(`/admin/tenants/${tenantId}/kyc/${userId}/approve`, { note }),

    reject: (tenantId: string, userId: string, reason: string) =>
      apiClient.put(`/admin/tenants/${tenantId}/kyc/${userId}/reject`, { reason }),

    /** Fetch a KYC document as a Blob for preview or download. */
    fetchDocument: (tenantId: string, userId: string, storedAs: string) =>
      apiClient.get<Blob>(
        `/admin/tenants/${tenantId}/kyc/${userId}/documents/${encodeURIComponent(storedAs)}`,
        { responseType: 'blob' },
      ),
  },

  payments: {
    list: (params?: { page?: number; limit?: number; tenantId?: string; status?: string; providerName?: string }) =>
      apiClient.get<{ success: boolean; data: AllPayment[]; meta: { page: number; limit: number; total: number; totalPages: number } }>(
        '/admin/payments',
        { params },
      ),

    manualQueue: () =>
      apiClient.get<{ success: boolean; data: ManualPaymentQueueItem[] }>('/admin/payments/manual-queue'),

    process: (id: string, action: 'complete' | 'fail', notes?: string, providerRef?: string) =>
      apiClient.put(`/admin/payments/${id}/process`, { action, notes, providerRef }),
  },

  providers: {
    get: (tenantId: string) =>
      apiClient.get<{ success: boolean; data: { corridors: CorridorConfig[]; defaultProviderName: string | null } }>(`/admin/tenants/${tenantId}/provider-config`),

    update: (tenantId: string, corridors: Array<{ sourceCurrency: string; destCurrency?: string; providerName: string; priority?: number }>) =>
      apiClient.put<{ success: boolean; data: { corridors: CorridorConfig[]; defaultProviderName: string | null } }>(`/admin/tenants/${tenantId}/provider-config`, { corridors }),

    addCorridor: (tenantId: string, corridor: { sourceCurrency: string; destCurrency?: string | null; providerName: string; priority?: number }) =>
      apiClient.post<{ success: boolean; data: CorridorConfig }>(`/admin/tenants/${tenantId}/provider-config`, corridor),

    deleteCorridor: (tenantId: string, corridorId: string) =>
      apiClient.delete(`/admin/tenants/${tenantId}/provider-config/${corridorId}`),

    setDefaultProvider: (tenantId: string, providerName: string | null) =>
      apiClient.put<{ success: boolean; data: { id: string; default_provider_name: string | null } }>(
        `/admin/tenants/${tenantId}/default-provider`,
        { providerName },
      ),
  },

  providerDefaults: {
    list: () =>
      apiClient.get<{ success: boolean; data: CorridorConfig[] }>('/admin/provider-defaults'),

    add: (corridor: { sourceCurrency: string; destCurrency?: string | null; providerName: string; priority?: number }) =>
      apiClient.post<{ success: boolean; data: CorridorConfig }>('/admin/provider-defaults', corridor),

    delete: (corridorId: string) =>
      apiClient.delete(`/admin/provider-defaults/${corridorId}`),
  },

  onBehalfPayment: {
    create: (payload: {
      targetUserId: string
      beneficiaryId: string
      accountId: string
      from: string
      to: string
      amount: number
      purposeCode: string
      note?: string | null
    }) =>
      apiClient.post<{ success: boolean; data: { payment: import('./payments').Payment; createdFor: { id: string; email: string } } }>(
        '/admin/payments/on-behalf',
        payload,
      ),
  },
}

export default admin
