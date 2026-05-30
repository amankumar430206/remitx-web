import { apiClient } from './client'

export interface TenantTheme {
  primaryColor: string
  secondaryColor: string
  logoUrl?: string | null
  faviconUrl?: string | null
  fontFamily: string
  tenantName: string
  /** true = tenant has their own saved branding; false = inheriting global platform theme */
  hasCustomTheme?: boolean
}

export interface UpdateThemePayload {
  primaryColor?: string
  secondaryColor?: string
  fontFamily?: string
  companyName?: string
  logoUrl?: string | null
}

export interface RolePermissions {
  role: string
  permissions: string[]
}

const tenants = {
  theme: () => apiClient.get<{ success: boolean; data: TenantTheme }>('/tenants/theme'),
  updateTheme: (payload: UpdateThemePayload) =>
    apiClient.put<{ success: boolean; data: TenantTheme }>('/tenants/theme', payload),
  config: () => apiClient.get<{ success: boolean; data: { name: string; slug: string } }>('/tenants/config'),
  getFeatureFlags: () =>
    apiClient.get<{ success: boolean; data: Record<string, boolean> }>('/tenants/feature-flags'),
  updateFeatureFlags: (flags: Record<string, boolean>) =>
    apiClient.put<{ success: boolean; data: Record<string, boolean> }>('/tenants/feature-flags', flags),
  listRoles: () =>
    apiClient.get<{ success: boolean; data: RolePermissions[] }>('/tenants/roles'),
  upsertRole: (role: string, permissions: string[]) =>
    apiClient.post<{ success: boolean; data: RolePermissions }>('/tenants/roles', { role, permissions }),
}

export default tenants
