import { apiClient } from './client'

export interface AdminTenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'inactive'
  created_at: string
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

export interface TenantUser {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  status: string
  kyc_status: string | null
  created_at: string
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
