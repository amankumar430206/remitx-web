import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { StatCard, PageHeader, DataTable, StatusBadge, AmountDisplay, LoadingState, ErrorState } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { useAccounts } from '@/hooks/useAccounts'
import { usePayments } from '@/hooks/usePayments'
import { useAuthStore } from '@/stores/authStore'
import { ContentCard } from '@/layouts/ContentCard'

export function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accessToken = useAuthStore(s => s.accessToken)
  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsError } = usePayments({ limit: 10 })

  // SSE — real-time payment status updates via /notifications/stream
  useEffect(() => {
    if (!accessToken) return
    const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'
    const url = `${base}/api/v1/notifications/stream`
    const evtSource = new EventSource(`${url}?token=${encodeURIComponent(accessToken)}`)

    evtSource.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'payment.status_changed') {
          queryClient.invalidateQueries({ queryKey: ['payments'] })
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
        }
        if (msg.type !== 'connected') {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      } catch { /* ignore parse errors */ }
    }

    return () => { evtSource.close() }
  }, [accessToken, queryClient])

  const totalBalance = (accounts ?? []).reduce((sum, a) => sum + parseFloat(a.balance), 0)
  const pendingCount = (paymentsData?.data ?? []).filter(p => p.status === 'pending_approval').length

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        actions={
          <Button onClick={() => navigate('/payments/new')}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Send payment
          </Button>
        }
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingAccounts ? (
          Array.from({ length: 4 }).map((_, i) => <StatCard key={i} title="Loading…" value="" loading />)
        ) : (
          <>
            <StatCard
              title="Total balance"
              value={<AmountDisplay amount={totalBalance} currency="USD" size="lg" />}
              description="Across all accounts"
            />
            {accounts?.slice(0, 3).map(a => (
              <StatCard
                key={a.id}
                title={`${a.currency} account`}
                value={<AmountDisplay amount={a.balance} currency={a.currency} size="lg" />}
                onClick={() => navigate(`/accounts/${a.id}`)}
              />
            ))}
          </>
        )}
      </div>

      {/* Recent payments */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Recent payments</h2>
          <div className="flex items-center gap-3">
            {pendingCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/payments/approval-queue')}>
                {pendingCount} pending approval
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => navigate('/payments')}>View all</Button>
          </div>
        </div>
        {loadingPayments ? (
          <LoadingState message="Loading payments…" />
        ) : paymentsError ? (
          <ErrorState title="Could not load payments" onRetry={() => queryClient.invalidateQueries({ queryKey: ['payments'] })} />
        ) : (
          <DataTable
            columns={[
              {
                key: 'beneficiary',
                header: 'Recipient',
                render: p => (
                  <div>
                    <p className="font-medium text-foreground">{p.beneficiary?.name ?? '—'}</p>
                    <p className="text-xs text-muted-fg">{p.beneficiary?.countryCode}</p>
                  </div>
                ),
              },
              {
                key: 'amount',
                header: 'Amount',
                render: p => <AmountDisplay amount={p.sourceAmount} currency={p.sourceCurrency} />,
              },
              {
                key: 'fx',
                header: 'You send',
                render: p => <AmountDisplay amount={p.destinationAmount} currency={p.destinationCurrency} />,
              },
              {
                key: 'status',
                header: 'Status',
                render: p => <StatusBadge status={p.status} />,
              },
              {
                key: 'createdAt',
                header: 'Date',
                render: p => <span className="text-muted-fg text-xs">{new Date(p.createdAt).toLocaleDateString()}</span>,
              },
            ]}
            data={paymentsData?.data ?? []}
            getRowId={p => p.id}
            onRowClick={p => navigate(`/payments/${p.id}`)}
            emptyTitle="No payments yet"
            emptyDescription="Send your first payment to get started."
          />
        )}
      </ContentCard>
    </div>
  )
}
