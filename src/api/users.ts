import { apiClient } from './client'

export interface User {
  id: string
  name: string
  email: string
  role: string
  status: 'active' | 'invited' | 'disabled'
  mfaEnabled: boolean
  createdAt: string
}

export interface InvitePayload {
  email: string
  name: string
  role: string
}

export interface UpdateUserPayload {
  name?: string
  role?: string
  status?: 'active' | 'disabled'
}

const users = {
  list: (params?: { page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: User[]; meta: { page: number; limit: number; total: number } }>(
      '/users',
      { params }
    ),

  invite: (payload: InvitePayload) =>
    apiClient.post<{ success: boolean; data: User }>('/users/invite', payload),

  update: (id: string, payload: UpdateUserPayload) =>
    apiClient.put<{ success: boolean; data: User }>(`/users/${id}`, payload),

  remove: (id: string) =>
    apiClient.delete(`/users/${id}`),

  updateProfile: (payload: { name: string; email: string }) =>
    apiClient.put('/users/me/profile', payload),

  changePassword: (payload: { currentPassword: string; newPassword: string }) =>
    apiClient.put('/users/me/password', payload),
}

export default users
