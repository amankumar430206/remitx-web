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
  fxRates: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  kyc: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
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
    { label: 'FX Rates', href: '/fx-rates', icon: NAV_ICONS.fxRates },
    { label: 'KYC', href: '/kyc', icon: NAV_ICONS.kyc },
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
