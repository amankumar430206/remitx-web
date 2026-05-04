import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
import { SettingsLayout } from '@/layouts/SettingsLayout'
import { Login } from '@/pages/Login'
import { MfaChallenge } from '@/pages/MfaChallenge'
import { MfaSetup } from '@/pages/MfaSetup'
import { PasswordReset } from '@/pages/PasswordReset'
import { InviteAccept } from '@/pages/InviteAccept'
import { Dashboard } from '@/pages/Dashboard'
import { AccountList } from '@/pages/AccountList'
import { AccountDetail } from '@/pages/AccountDetail'
import { DesignSystem } from '@/pages/DesignSystem'
import { PaymentList } from '@/pages/payments/PaymentList'
import { PaymentDetail } from '@/pages/payments/PaymentDetail'
import { NewPayment } from '@/pages/payments/NewPayment'
import { ApprovalQueue } from '@/pages/payments/ApprovalQueue'
import { BeneficiaryList } from '@/pages/BeneficiaryList'
import { BeneficiaryNew } from '@/pages/BeneficiaryNew'
import { BeneficiaryDetail } from '@/pages/BeneficiaryDetail'
import { FxRates } from '@/pages/FxRates'
import { KycStatus } from '@/pages/KYC/KycStatus'
import { KycVerify } from '@/pages/KYC/KycVerify'
import { Statement } from '@/pages/reports/Statement'
import { Transactions } from '@/pages/reports/Transactions'
import { Reconciliation } from '@/pages/reports/Reconciliation'
import { Profile } from '@/pages/settings/Profile'
import { Mfa } from '@/pages/settings/Mfa'
import { Notifications } from '@/pages/settings/Notifications'
import { Users } from '@/pages/settings/Users'
import { Permissions } from '@/pages/settings/Permissions'
import { SubClients } from '@/pages/settings/SubClients'
import { Theme } from '@/pages/settings/Theme'
import { TenantList } from '@/pages/admin/TenantList'
import { TenantDetail } from '@/pages/admin/TenantDetail'
import { KycQueue } from '@/pages/admin/KycQueue'
import { ManualPaymentQueue } from '@/pages/admin/ManualPaymentQueue'
import { ProviderConfig } from '@/pages/admin/ProviderConfig'

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
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/mfa/challenge" element={<MfaChallenge />} />
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route path="/invite/accept" element={<InviteAccept />} />
          <Route path="/design-system" element={<DesignSystem />} />

          {/* Protected */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppShell />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/accounts" element={<AccountList />} />
              <Route path="/accounts/:id" element={<AccountDetail />} />
              {/* Payments */}
              <Route path="/payments" element={<PaymentList />} />
              <Route path="/payments/new" element={<NewPayment />} />
              <Route path="/payments/approval-queue" element={<ApprovalQueue />} />
              <Route path="/payments/:id" element={<PaymentDetail />} />
              {/* Beneficiaries */}
              <Route path="/beneficiaries" element={<BeneficiaryList />} />
              <Route path="/beneficiaries/new" element={<BeneficiaryNew />} />
              <Route path="/beneficiaries/:id" element={<BeneficiaryDetail />} />
              {/* FX */}
              <Route path="/fx-rates" element={<FxRates />} />
              {/* KYC */}
              <Route path="/kyc" element={<KycStatus />} />
              <Route path="/kyc/verify" element={<KycVerify />} />
              {/* Reports */}
              <Route path="/reports/statement" element={<Statement />} />
              <Route path="/reports/transactions" element={<Transactions />} />
              <Route path="/reports/reconciliation" element={<Reconciliation />} />
              {/* Settings */}
              <Route path="/settings" element={<SettingsLayout />}>
                <Route index element={<Navigate to="/settings/profile" replace />} />
                <Route path="profile" element={<Profile />} />
                <Route path="mfa" element={<Mfa />} />
                <Route path="notifications" element={<Notifications />} />
                <Route path="users" element={<Users />} />
                <Route path="permissions" element={<Permissions />} />
                <Route path="sub-clients" element={<SubClients />} />
                <Route path="theme" element={<Theme />} />
              </Route>
              {/* Admin */}
              <Route path="/admin/tenants" element={<TenantList />} />
              <Route path="/admin/tenants/:id" element={<TenantDetail />} />
              <Route path="/admin/kyc-queue" element={<KycQueue />} />
              <Route path="/admin/manual-payments" element={<ManualPaymentQueue />} />
              <Route path="/admin/providers" element={<ProviderConfig />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
