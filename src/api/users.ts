import { apiClient } from './client'

export interface User {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  role: string
  status: 'active' | 'invited' | 'inactive' | 'suspended'
  kyc_status: string
  created_at: string
}

export interface InvitePayload {
  email: string
  role: string
  firstName?: string
  lastName?: string
}

const users = {
  list: () =>
    apiClient.get<{ success: boolean; data: User[] }>('/tenants/users'),

  get: (id: string) =>
    apiClient.get<{ success: boolean; data: User }>(`/tenants/users/${id}`),

  invite: (payload: InvitePayload) =>
    apiClient.post<{ success: boolean; data: { user: User; inviteToken: string } }>(
      '/tenants/users/invite',
      payload,
    ),

  updateStatus: (id: string, status: string) =>
    apiClient.put<{ success: boolean; data: User }>(`/tenants/users/${id}/status`, { status }),

  updatePermissions: (id: string, role: string) =>
    apiClient.put<{ success: boolean; data: User }>(`/tenants/users/${id}/permissions`, { role }),

  updateProfile: (payload: { firstName?: string; lastName?: string }) =>
    apiClient.put<{ success: boolean; data: User }>('/auth/me', payload),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    apiClient.post<{ success: boolean; data: { message: string } }>('/auth/password/change', payload),
}

export default users
