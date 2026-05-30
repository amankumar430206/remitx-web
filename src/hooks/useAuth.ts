import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import authApi from '@/api/auth'
import tenantsApi from '@/api/tenants'
import type { LoginPayload } from '@/api/auth'

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth, tenantSlug } = useAuthStore()
  const applyTheme = useThemeStore(s => s.applyTheme)
  const clearTheme = useThemeStore(s => s.clearTheme)
  const navigate = useNavigate()
  const qc = useQueryClient()

  const login = async (payload: LoginPayload, slug: string) => {
    const { data } = await authApi.login(payload, slug)
    const res = data.data
    if (res.mfaRequired) {
      return { mfaRequired: true, mfaChallengeToken: res.tempToken }
    }
    // Set auth first so the interceptor picks up the new token + tenant slug
    setAuth(res.user, res.accessToken, res.refreshToken, slug)

    // Fetch and apply this tenant's theme immediately — before navigating.
    // Pre-populate the query cache so AppShell doesn't need to re-fetch on mount.
    try {
      const themeRes = await tenantsApi.theme()
      const themeData = themeRes.data.data
      applyTheme(themeData)
      qc.setQueryData(['tenant-theme'], themeData)
    } catch { /* non-fatal — AppShell will retry on mount */ }

    return { mfaRequired: false }
  }

  const logout = async () => {
    try { await authApi.logout() } catch { /* ignore */ }
    // Clear theme CSS vars + Zustand state so next tenant starts clean
    clearTheme()
    // Drop the cached theme so AppShell fetches fresh on next login
    qc.removeQueries({ queryKey: ['tenant-theme'] })
    clearAuth()
    navigate('/login')
  }

  return { user, isAuthenticated, tenantSlug, login, logout }
}
