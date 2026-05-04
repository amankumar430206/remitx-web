import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/PageLayout'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useApprovalQueue } from '@/hooks/usePayments'
import tenantsApi from '@/api/tenants'

const NAV_ICONS = {
  dashboard: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  payments: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  accounts: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  beneficiaries: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
}

export function AppShell() {
  const user = useAuthStore(s => s.user)
  const tenantSlug = useAuthStore(s => s.tenantSlug)
  const navigate = useNavigate()
  const applyTheme = useThemeStore(s => s.applyTheme)
  const { data: approvalData } = useApprovalQueue()

  useQuery({
    queryKey: ['tenant-theme'],
    queryFn: () => tenantsApi.theme().then(r => { applyTheme(r.data.data); return r.data.data }),
    retry: false,
  })

  const handleLogout = async () => {
    try {
      const { default: authApi } = await import('@/api/auth')
      await authApi.logout()
    } catch { /* ignore */ }
    useAuthStore.getState().clearAuth()
    navigate('/login')
  }

  const pendingApprovals = approvalData?.meta?.total ?? 0

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: NAV_ICONS.dashboard },
    { label: 'Payments', href: '/payments', icon: NAV_ICONS.payments, badge: pendingApprovals },
    { label: 'Accounts', href: '/accounts', icon: NAV_ICONS.accounts },
    { label: 'Beneficiaries', href: '/beneficiaries', icon: NAV_ICONS.beneficiaries },
  ]

  return (
    <PageLayout
      navItems={navItems}
      user={user ? { name: user.name, email: user.email } : undefined}
      onLogout={handleLogout}
      tenantName={tenantSlug ?? undefined}
    >
      <Outlet />
    </PageLayout>
  )
}
