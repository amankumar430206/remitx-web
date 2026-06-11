import { Navigate, Outlet } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'

interface Props {
  permission: string
  redirectTo?: string
}

/**
 * Route guard: renders child routes only when the current user holds `permission`.
 * On deny, redirects to `redirectTo` (default: /dashboard).
 * The global 403 interceptor in apiClient handles the toast — no toast here so it
 * doesn't fire on every direct URL entry before auth has fully hydrated.
 */
export function RequirePermission({ permission, redirectTo = '/dashboard' }: Props) {
  const { has } = usePermissions()
  if (!has(permission)) return <Navigate to={redirectTo} replace />
  return <Outlet />
}
