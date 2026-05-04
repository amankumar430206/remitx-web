import { apiClient } from './client'

export interface LoginPayload { email: string; password: string; mfaCode?: string }
export interface LoginResponse {
  accessToken: string
  refreshToken: string
  mfaRequired?: boolean
  mfaChallengeToken?: string
  user: { id: string; email: string; name: string; role: string }
}

export interface MfaSetupResponse { secret: string; qrUri: string; backupCodes: string[] }

const auth = {
  login: (payload: LoginPayload, tenantSlug: string) =>
    apiClient.post<{ success: boolean; data: LoginResponse }>('/auth/login', payload, {
      headers: { 'X-Tenant-Slug': tenantSlug },
    }),

  refresh: (refreshToken: string) =>
    apiClient.post<{ success: boolean; data: { accessToken: string; refreshToken: string } }>('/auth/refresh', { refreshToken }),

  logout: () => apiClient.post('/auth/logout'),

  me: () => apiClient.get<{ success: boolean; data: { id: string; email: string; name: string; role: string; kycStatus: string } }>('/auth/me'),

  mfaSetup: () =>
    apiClient.post<{ success: boolean; data: MfaSetupResponse }>('/auth/mfa/setup'),

  mfaVerify: (code: string) =>
    apiClient.post('/auth/mfa/verify', { code }),

  mfaChallenge: (token: string, code: string) =>
    apiClient.post<{ success: boolean; data: LoginResponse }>('/auth/mfa/challenge', { challengeToken: token, code }),

  passwordResetRequest: (email: string) =>
    apiClient.post('/auth/password/reset-request', { email }),

  passwordReset: (token: string, password: string) =>
    apiClient.post('/auth/password/reset', { token, password }),

  inviteAccept: (token: string, password: string) =>
    apiClient.post('/auth/invite/accept', { token, password }),
}

export default auth
