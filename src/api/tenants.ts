import { apiClient } from './client'

export interface TenantTheme {
  primaryColor: string
  secondaryColor: string
  logoUrl?: string
  fontFamily: string
  tenantName: string
}

const tenants = {
  theme: () => apiClient.get<{ success: boolean; data: TenantTheme }>('/tenants/theme'),
  config: () => apiClient.get<{ success: boolean; data: { name: string; slug: string } }>('/tenants/config'),
  getFeatureFlags: () =>
    apiClient.get<{ success: boolean; data: Record<string, boolean> }>('/tenants/feature-flags'),
  updateFeatureFlags: (flags: Record<string, boolean>) =>
    apiClient.put<{ success: boolean; data: Record<string, boolean> }>('/tenants/feature-flags', flags),
}

export default tenants
