import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import { SettingsLayout } from '@/layouts/SettingsLayout'
import { PageSkeleton } from '@/components/PageSkeleton'
import { PageErrorBoundary } from '@/components/PageErrorBoundary'

// Public pages — eager (needed immediately on first load)
import { Login } from '@/pages/Login'
import { MfaChallenge } from '@/pages/MfaChallenge'
import { MfaSetup } from '@/pages/MfaSetup'
import { PasswordReset } from '@/pages/PasswordReset'
import { InviteAccept } from '@/pages/InviteAccept'

// Protected pages — lazy loaded (code split per route)
const Dashboard           = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const AccountList         = lazy(() => import('@/pages/AccountList').then(m => ({ default: m.AccountList })))
const AccountDetail       = lazy(() => import('@/pages/AccountDetail').then(m => ({ default: m.AccountDetail })))
const PaymentList         = lazy(() => import('@/pages/payments/PaymentList').then(m => ({ default: m.PaymentList })))
const PaymentDetail       = lazy(() => import('@/pages/payments/PaymentDetail').then(m => ({ default: m.PaymentDetail })))
const NewPayment          = lazy(() => import('@/pages/payments/NewPayment').then(m => ({ default: m.NewPayment })))
const ApprovalQueue       = lazy(() => import('@/pages/payments/ApprovalQueue').then(m => ({ default: m.ApprovalQueue })))
const BeneficiaryList     = lazy(() => import('@/pages/BeneficiaryList').then(m => ({ default: m.BeneficiaryList })))
const BeneficiaryNew      = lazy(() => import('@/pages/BeneficiaryNew').then(m => ({ default: m.BeneficiaryNew })))
const BeneficiaryDetail   = lazy(() => import('@/pages/BeneficiaryDetail').then(m => ({ default: m.BeneficiaryDetail })))
const FxRates             = lazy(() => import('@/pages/FxRates').then(m => ({ default: m.FxRates })))
const KycStatus           = lazy(() => import('@/pages/KYC/KycStatus').then(m => ({ default: m.KycStatus })))
const KycVerify           = lazy(() => import('@/pages/KYC/KycVerify').then(m => ({ default: m.KycVerify })))
const Statement           = lazy(() => import('@/pages/reports/Statement').then(m => ({ default: m.Statement })))
const Transactions        = lazy(() => import('@/pages/reports/Transactions').then(m => ({ default: m.Transactions })))
const Reconciliation      = lazy(() => import('@/pages/reports/Reconciliation').then(m => ({ default: m.Reconciliation })))
const Profile             = lazy(() => import('@/pages/settings/Profile').then(m => ({ default: m.Profile })))
const Mfa                 = lazy(() => import('@/pages/settings/Mfa').then(m => ({ default: m.Mfa })))
const Notifications       = lazy(() => import('@/pages/settings/Notifications').then(m => ({ default: m.Notifications })))
const Users               = lazy(() => import('@/pages/settings/Users').then(m => ({ default: m.Users })))
const Permissions         = lazy(() => import('@/pages/settings/Permissions').then(m => ({ default: m.Permissions })))
const SubClients          = lazy(() => import('@/pages/settings/SubClients').then(m => ({ default: m.SubClients })))
const Theme               = lazy(() => import('@/pages/settings/Theme').then(m => ({ default: m.Theme })))
const FeatureFlags        = lazy(() => import('@/pages/settings/FeatureFlags').then(m => ({ default: m.FeatureFlags })))
const TenantList          = lazy(() => import('@/pages/admin/TenantList').then(m => ({ default: m.TenantList })))
const TenantDetail        = lazy(() => import('@/pages/admin/TenantDetail').then(m => ({ default: m.TenantDetail })))
const KycQueue            = lazy(() => import('@/pages/admin/KycQueue').then(m => ({ default: m.KycQueue })))
const ManualPaymentQueue  = lazy(() => import('@/pages/admin/ManualPaymentQueue').then(m => ({ default: m.ManualPaymentQueue })))
const ProviderConfig      = lazy(() => import('@/pages/admin/ProviderConfig').then(m => ({ default: m.ProviderConfig })))
const DesignSystem        = lazy(() => import('@/pages/DesignSystem').then(m => ({ default: m.DesignSystem })))

// Wraps each route element with an isolated error boundary + suspense skeleton.
// A crash or slow load in one page never affects the rest of the app.
function page(element: ReactNode) {
  return (
    <PageErrorBoundary>
      <Suspense fallback={<PageSkeleton />}>
        {element}
      </Suspense>
    </PageErrorBoundary>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public — no lazy needed */}
          <Route path="/login" element={<Login />} />
          <Route path="/mfa/challenge" element={<MfaChallenge />} />
          <Route path="/mfa/setup" element={<MfaSetup />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route path="/invite/accept" element={<InviteAccept />} />
          <Route path="/design-system" element={page(<DesignSystem />)} />

          {/* Protected — all lazy with per-page error isolation */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={page(<Dashboard />)} />

              {/* Accounts */}
              <Route path="/accounts" element={page(<AccountList />)} />
              <Route path="/accounts/:id" element={page(<AccountDetail />)} />

              {/* Payments */}
              <Route path="/payments" element={page(<PaymentList />)} />
              <Route path="/payments/new" element={page(<NewPayment />)} />
              <Route path="/payments/approval-queue" element={page(<ApprovalQueue />)} />
              <Route path="/payments/:id" element={page(<PaymentDetail />)} />

              {/* Beneficiaries */}
              <Route path="/beneficiaries" element={page(<BeneficiaryList />)} />
              <Route path="/beneficiaries/new" element={page(<BeneficiaryNew />)} />
              <Route path="/beneficiaries/:id" element={page(<BeneficiaryDetail />)} />

              {/* FX */}
              <Route path="/fx-rates" element={page(<FxRates />)} />

              {/* KYC */}
              <Route path="/kyc" element={page(<KycStatus />)} />
              <Route path="/kyc/verify" element={page(<KycVerify />)} />

              {/* Reports */}
              <Route path="/reports/statement" element={page(<Statement />)} />
              <Route path="/reports/transactions" element={page(<Transactions />)} />
              <Route path="/reports/reconciliation" element={page(<Reconciliation />)} />

              {/* Settings */}
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/settings/profile" replace />} />
                <Route path="profile" element={page(<Profile />)} />
                <Route path="mfa" element={page(<Mfa />)} />
                <Route path="notifications" element={page(<Notifications />)} />
                <Route path="users" element={page(<Users />)} />
                <Route path="permissions" element={page(<Permissions />)} />
                <Route path="sub-clients" element={page(<SubClients />)} />
                <Route path="theme" element={page(<Theme />)} />
                <Route path="features" element={page(<FeatureFlags />)} />
              </Route>

              {/* Admin */}
              <Route path="/admin/tenants" element={page(<TenantList />)} />
              <Route path="/admin/tenants/:id" element={page(<TenantDetail />)} />
              <Route path="/admin/kyc-queue" element={page(<KycQueue />)} />
              <Route path="/admin/manual-payments" element={page(<ManualPaymentQueue />)} />
              <Route path="/admin/providers" element={page(<ProviderConfig />)} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
