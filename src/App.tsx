import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/AppShell'
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
              <Route path="/settings/mfa" element={<MfaSetup />} />
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
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

export default App
