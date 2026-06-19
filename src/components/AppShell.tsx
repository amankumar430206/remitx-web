import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { PageLayout } from '@/layouts/PageLayout'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { usePermissions } from '@/hooks/usePermissions'
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
  reports: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  settings: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  admin: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  ),
  tenants: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  network: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  assistant: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
    </svg>
  ),
}

export function AppShell() {
  const user = useAuthStore(s => s.user)
  const tenantSlug = useAuthStore(s => s.tenantSlug)
  const navigate = useNavigate()
  const applyTheme = useThemeStore(s => s.applyTheme)
  const logoUrl        = useThemeStore(s => s.theme?.logoUrl ?? null)
  const themeDisplayName = useThemeStore(s => s.theme?.tenantName ?? null)
  const setFlags = useFeatureFlagStore(s => s.setFlags)
  const { data: approvalData } = useApprovalQueue()

  useQuery({
    queryKey: ['tenant-theme'],
    queryFn: () => tenantsApi.theme().then(r => { applyTheme(r.data.data); return r.data.data }),
    staleTime: 0,   // always re-fetch on mount — theme must reflect current tenant
    retry: false,
  })

  useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => tenantsApi.getFeatureFlags().then(r => { setFlags(r.data.data); return r.data.data }),
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

  const { has } = usePermissions()
  const pendingApprovals = approvalData?.data?.length ?? 0

  const flagClientBranding = useFeatureFlag('client_branding')
  const flagPayments = useFeatureFlag('payments')
  const flagAccounts = useFeatureFlag('accounts')
  const flagBeneficiaries = useFeatureFlag('beneficiaries')
  const flagFxRates = useFeatureFlag('fx_rates')
  const flagNetwork = useFeatureFlag('network')
  const flagKyc = useFeatureFlag('kyc')
  const flagAssistant = useFeatureFlag('ai_assistant')
  const flagReports = useFeatureFlag('reports')

  // A user should see Payments if they can do anything payments-related
  const canSeePayments = has('payments:view') || has('payments:view_all') || has('payments:create') || has('payments:approve')

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: NAV_ICONS.dashboard },
    ...(has('admin:config') ? [{ label: 'Tenants', href: '/admin/tenants', icon: NAV_ICONS.tenants }] : []),
    ...(flagPayments && canSeePayments ? [{ label: 'Payments', href: '/payments', icon: NAV_ICONS.payments, badge: pendingApprovals }] : []),
    ...(flagAccounts && has('accounts:view') ? [{ label: 'Accounts', href: '/accounts', icon: NAV_ICONS.accounts }] : []),
    ...(flagBeneficiaries && has('beneficiaries:view') ? [{ label: 'Beneficiaries', href: '/beneficiaries', icon: NAV_ICONS.beneficiaries }] : []),
    ...(flagFxRates && has('fx_rates:view') ? [{ label: 'FX Rates', href: '/fx-rates', icon: NAV_ICONS.fxRates }] : []),
    ...(flagNetwork && has('network:view') ? [{ label: 'Network', href: '/network', icon: NAV_ICONS.network }] : []),
    ...(flagKyc && has('kyc:view') ? [{ label: 'KYC', href: '/kyc', icon: NAV_ICONS.kyc }] : []),
    ...(flagReports && has('reports:view') ? [{ label: 'Reports', href: '/reports/transactions', icon: NAV_ICONS.reports }] : []),
    ...(flagAssistant && has('assistant:view') ? [{ label: 'Assistant', href: '/assistant', icon: NAV_ICONS.assistant }] : []),
    { label: 'Settings', href: '/settings', icon: NAV_ICONS.settings },
    ...(has('admin:config') ? [{ label: 'Admin', href: '/admin/kyc-queue', icon: NAV_ICONS.admin }] : []),
  ]

  return (
    <PageLayout
      navItems={navItems}
      user={user ? { name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email, email: user.email, role: user.role } : undefined}
      onLogout={handleLogout}
      tenantName={flagClientBranding && themeDisplayName ? themeDisplayName : (tenantSlug ?? undefined)}
      logoUrl={flagClientBranding ? logoUrl : null}
    >
      <Outlet />
    </PageLayout>
  )
}
