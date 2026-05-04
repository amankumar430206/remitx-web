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
}

export default tenants
