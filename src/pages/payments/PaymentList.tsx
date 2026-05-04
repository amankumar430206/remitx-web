import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { SplitPane } from '@/layouts/SplitPane'
import { usePayments, usePayment } from '@/hooks/usePayments'
import type { Payment } from '@/api/payments'

const STATUS_OPTIONS = [
  { label: 'All statuses', value: '' },
  { label: 'Pending approval', value: 'pending_approval' },
  { label: 'Approved', value: 'approved' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Failed', value: 'failed' },
]

// ─── Detail panel (right side of SplitPane) ──────────────────────────────────

function PaymentQuickView({ id, onOpenFull }: { id: string; onOpenFull: () => void }) {
  const { data: payment, isLoading } = usePayment(id)

  if (isLoading) return <LoadingState message="Loading payment…" />
  if (!payment) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center py-3 border-b border-border">
        <p className="text-2xl font-bold text-foreground">
          <AmountDisplay amount={payment.sourceAmount} currency={payment.sourceCurrency} size="lg" />
        </p>
        <p className="text-sm text-muted-fg mt-1">
          → <AmountDisplay amount={payment.destinationAmount} currency={payment.destinationCurrency} />
        </p>
        <div className="mt-2 flex justify-center">
          <StatusBadge status={payment.status} />
        </div>
      </div>

      <DetailRow label="Recipient" value={payment.beneficiary?.name ?? '—'} />
      <DetailRow label="Country" value={payment.beneficiary?.countryCode ?? '—'} />
      <DetailRow label="Exchange rate" value={`1 ${payment.sourceCurrency} = ${parseFloat(payment.exchangeRate).toFixed(4)} ${payment.destinationCurrency}`} />
      <DetailRow label="Fee" value={<AmountDisplay amount={payment.feeAmount} currency={payment.sourceCurrency} />} />
      <DetailRow label="Purpose" value={payment.purposeCode} />
      {payment.reference && <DetailRow label="Reference" value={payment.reference} />}
      <DetailRow label="Submitted" value={new Date(payment.createdAt).toLocaleString()} />
      {payment.completedAt && <DetailRow label="Completed" value={new Date(payment.completedAt).toLocaleString()} />}

      <Button variant="outline" size="sm" className="w-full mt-2" onClick={onOpenFull}>
        View full details
      </Button>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-xs text-muted-fg shrink-0">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value}</span>
    </div>
  )
}

// ─── Main PaymentList ─────────────────────────────────────────────────────────

export function PaymentList() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError } = usePayments({ page, limit: 20, status: status || undefined })

  const payments = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const columns = [
    {
      key: 'beneficiary',
      header: 'Recipient',
      render: (p: Payment) => (
        <div>
          <p className="font-medium text-foreground">{p.beneficiary?.name ?? '—'}</p>
          <p className="text-xs text-muted-fg">{p.beneficiary?.countryCode}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'You send',
      render: (p: Payment) => <AmountDisplay amount={p.sourceAmount} currency={p.sourceCurrency} />,
    },
    {
      key: 'destination',
      header: 'They receive',
      render: (p: Payment) => <AmountDisplay amount={p.destinationAmount} currency={p.destinationCurrency} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: Payment) => <StatusBadge status={p.status} />,
    },
    {
      key: 'date',
      header: 'Date',
      render: (p: Payment) => (
        <span className="text-xs text-muted-fg">{new Date(p.createdAt).toLocaleDateString()}</span>
      ),
    },
  ]

  const list = (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1) }}
          className="rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {status && (
          <button
            onClick={() => { setStatus(''); setPage(1) }}
            className="text-xs text-muted-fg hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <ContentCard padding="none">
        {isLoading ? (
          <LoadingState message="Loading payments…" />
        ) : isError ? (
          <ErrorState title="Could not load payments" onRetry={() => qc.invalidateQueries({ queryKey: ['payments'] })} />
        ) : (
          <>
            <DataTable
              columns={columns}
              data={payments}
              getRowId={p => p.id}
              selectedIds={selectedId ? [selectedId] : []}
              onRowClick={p => setSelectedId(prev => prev === p.id ? null : p.id)}
              emptyTitle="No payments found"
              emptyDescription="Try changing the filters or send your first payment."
            />

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="text-xs text-muted-fg">{total} payments total</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1}>
                    Previous
                  </Button>
                  <Badge variant="secondary">{page} / {totalPages}</Badge>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page === totalPages}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </ContentCard>
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        actions={
          <Button onClick={() => navigate('/payments/new')}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Send payment
          </Button>
        }
      />

      <SplitPane
        left={list}
        leftWidth="flex-1"
        right={selectedId ? (
          <PaymentQuickView
            id={selectedId}
            onOpenFull={() => navigate(`/payments/${selectedId}`)}
          />
        ) : undefined}
        rightTitle={selectedId ? 'Payment details' : undefined}
        onCloseRight={selectedId ? () => setSelectedId(null) : undefined}
      />
    </div>
  )
}
