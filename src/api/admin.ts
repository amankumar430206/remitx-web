import { apiClient } from './client'

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
  documents: Array<{ filename: string; type: string; path: string }>
  created_at: string
}

export interface ManualPaymentQueueItem {
  id: string
  reference: string
  source_currency: string
  source_amount: string
  dest_currency: string
  dest_amount: string
  status: string
  created_at: string
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
  },

  users: {
    list: (tenantId: string) =>
      apiClient.get<{ success: boolean; data: TenantUser[] }>(`/admin/tenants/${tenantId}/users`),
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
  },

  payments: {
    list: (params?: { page?: number; limit?: number; tenantId?: string; status?: string }) =>
      apiClient.get<{ success: boolean; data: ManualPaymentQueueItem[]; meta: { page: number; limit: number; total: number } }>(
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
      apiClient.get<{ success: boolean; data: CorridorConfig[] }>(`/admin/tenants/${tenantId}/provider-config`),

    update: (tenantId: string, corridors: Array<{ sourceCurrency: string; destCurrency?: string; providerName: string; priority?: number }>) =>
      apiClient.put<{ success: boolean; data: CorridorConfig[] }>(`/admin/tenants/${tenantId}/provider-config`, { corridors }),
  },
}

export default admin
