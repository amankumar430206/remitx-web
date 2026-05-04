import { apiClient } from './client'

export interface AdminTenant {
  id: string
  name: string
  slug: string
  status: 'active' | 'suspended' | 'pending'
  plan: string
  usersCount: number
  paymentsCount: number
  createdAt: string
  primaryColor?: string
  secondaryColor?: string
}

export interface AdminTenantDetail extends AdminTenant {
  logoUrl?: string
  fontFamily?: string
  kycEnabled: boolean
  maxPaymentAmount: string
  allowedCurrencies: string[]
}

export interface KycQueueItem {
  id: string
  userId: string
  userName: string
  userEmail: string
  tenantName: string
  status: 'submitted' | 'under_review'
  submittedAt: string
  documents: Array<{ id: string; type: string; filename: string; status: string }>
}

export interface ManualPaymentQueueItem {
  id: string
  reference: string
  tenantName: string
  amount: string
  currency: string
  status: string
  beneficiaryName: string
  createdAt: string
}

export interface ProviderConfig {
  id: string
  name: string
  type: string
  enabled: boolean
  priority: number
  currencies: string[]
  config: Record<string, string>
}

const admin = {
  tenants: {
    list: (params?: { page?: number; limit?: number; status?: string }) =>
      apiClient.get<{ success: boolean; data: AdminTenant[]; meta: { page: number; limit: number; total: number } }>(
        '/admin/tenants',
        { params }
      ),

    get: (id: string) =>
      apiClient.get<{ success: boolean; data: AdminTenantDetail }>(`/admin/tenants/${id}`),

    update: (id: string, payload: Partial<AdminTenantDetail>) =>
      apiClient.put<{ success: boolean; data: AdminTenantDetail }>(`/admin/tenants/${id}`, payload),

    suspend: (id: string) =>
      apiClient.put(`/admin/tenants/${id}/suspend`),

    activate: (id: string) =>
      apiClient.put(`/admin/tenants/${id}/activate`),
  },

  kyc: {
    queue: (params?: { page?: number; limit?: number }) =>
      apiClient.get<{ success: boolean; data: KycQueueItem[]; meta: { page: number; limit: number; total: number } }>(
        '/admin/kyc/queue',
        { params }
      ),

    approve: (id: string, note?: string) =>
      apiClient.put(`/admin/kyc/${id}/approve`, { note }),

    reject: (id: string, reason: string) =>
      apiClient.put(`/admin/kyc/${id}/reject`, { reason }),
  },

  payments: {
    manualQueue: (params?: { page?: number; limit?: number }) =>
      apiClient.get<{ success: boolean; data: ManualPaymentQueueItem[]; meta: { page: number; limit: number; total: number } }>(
        '/admin/payments/manual-queue',
        { params }
      ),

    process: (id: string, note?: string) =>
      apiClient.put(`/admin/payments/${id}/process`, { note }),

    fail: (id: string, reason: string) =>
      apiClient.put(`/admin/payments/${id}/fail`, { reason }),
  },

  providers: {
    list: () =>
      apiClient.get<{ success: boolean; data: ProviderConfig[] }>('/admin/providers'),

    update: (id: string, payload: Partial<ProviderConfig>) =>
      apiClient.put<{ success: boolean; data: ProviderConfig }>(`/admin/providers/${id}`, payload),
  },
}

export default admin
