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

export interface Role {
  /** Stable slug, stored on users. Alias `role` kept for backward compat. */
  key: string
  role: string
  name: string
  description: string | null
  isSystem: boolean
  permissions: string[]
  userCount: number
}

/** @deprecated use Role */
export interface RolePermissions {
  role: string
  permissions: string[]
}

export interface PermissionCatalogGroup {
  domain: string
  label: string
  permissions: Array<{ key: string; label: string; wildcard?: boolean }>
}

export interface RoleTemplate {
  key: string
  name: string
  description: string
  permissions: string[]
}

export interface CreateRolePayload {
  name: string
  key?: string
  description?: string | null
  permissions: string[]
}

export interface UpdateRolePayload {
  name?: string
  description?: string | null
  permissions?: string[]
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
  permissionCatalog: () =>
    apiClient.get<{ success: boolean; data: PermissionCatalogGroup[] }>('/tenants/permissions/catalog'),
  roleTemplates: () =>
    apiClient.get<{ success: boolean; data: RoleTemplate[] }>('/tenants/role-templates'),
  listRoles: () =>
    apiClient.get<{ success: boolean; data: Role[] }>('/tenants/roles'),
  createRole: (payload: CreateRolePayload) =>
    apiClient.post<{ success: boolean; data: Role }>('/tenants/roles', payload),
  updateRole: (key: string, payload: UpdateRolePayload) =>
    apiClient.put<{ success: boolean; data: Role }>(`/tenants/roles/${key}`, payload),
  deleteRole: (key: string) =>
    apiClient.delete<{ success: boolean; data: { key: string; deleted: boolean } }>(`/tenants/roles/${key}`),
}

export default tenants
