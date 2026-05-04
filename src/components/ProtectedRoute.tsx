import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated)
  const hasHydrated = useAuthStore(s => s._hasHydrated)

  // Wait for Zustand to rehydrate from localStorage before deciding
  if (!hasHydrated) return null

  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <Outlet />
}
