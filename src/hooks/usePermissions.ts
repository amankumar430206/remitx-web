import { useMemo } from 'react'
import { useAuthStore } from '@/stores/authStore'

// Decode the `permissions` claim from the JWT access token (no verification —
// purely for client-side UI gating; the backend re-checks every request).
function decodePermissions(token: string | null): string[] {
  if (!token) return []
  try {
    const payload = token.split('.')[1]
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const claims = JSON.parse(json)
    return Array.isArray(claims.permissions) ? claims.permissions : []
  } catch {
    return []
  }
}

/**
 * Dynamic, permission-based access checks for the UI. Mirrors the backend
 * `authorize` middleware: a `<domain>:<action>` is granted if held directly or
 * via the `<domain>:*` wildcard. Never gate on hardcoded role names — use this.
 */
export function usePermissions() {
  const token = useAuthStore(s => s.accessToken)
  const permissions = useMemo(() => decodePermissions(token), [token])

  const has = useMemo(() => {
    const set = new Set(permissions)
    return (permission: string): boolean => {
      if (set.has(permission)) return true
      const domain = permission.split(':')[0]
      return set.has(`${domain}:*`)
    }
  }, [permissions])

  return { permissions, has }
}
