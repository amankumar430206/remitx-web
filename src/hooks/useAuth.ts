import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import authApi from '@/api/auth'
import type { LoginPayload } from '@/api/auth'

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth, tenantSlug } = useAuthStore()
  const navigate = useNavigate()

  const login = async (payload: LoginPayload, slug: string) => {
    const { data } = await authApi.login(payload)
    const res = data.data
    if (res.mfaRequired) {
      return { mfaRequired: true, mfaChallengeToken: res.mfaChallengeToken }
    }
    setAuth(res.user, res.accessToken, res.refreshToken, slug)
    return { mfaRequired: false }
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    clearAuth()
    navigate('/login')
  }

  return { user, isAuthenticated, tenantSlug, login, logout }
}
