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
              {/* Placeholder routes — filled by later phases */}
              <Route path="/payments/*" element={<ComingSoon title="Payments" />} />
              <Route path="/beneficiaries/*" element={<ComingSoon title="Beneficiaries" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <p className="text-2xl font-bold text-foreground">{title}</p>
      <p className="mt-2 text-sm text-muted-fg">Coming in the next phase.</p>
    </div>
  )
}

export default App
