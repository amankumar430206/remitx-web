import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { ContentCard } from '@/layouts/ContentCard'
import { useApprovalQueue } from '@/hooks/usePayments'
import { useAuthStore } from '@/stores/authStore'
import paymentsApi from '@/api/payments'
import { getApiError } from '@/lib/apiError'
import type { Payment } from '@/api/payments'

export function ApprovalQueue() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  const [page, setPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectNote, setRejectNote] = useState('')

  const { data, isLoading, isError, refetch } = useApprovalQueue()
  const payments = data?.data ?? []
  const total = payments.length
  const totalPages = Math.ceil(total / 20)

  const isChecker = user?.role === 'admin' || user?.role === 'checker'

  // Approve multiple
  const approveMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map(id => paymentsApi.approve(id)))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['approval-queue'] })
      setSelectedIds([])
    },
  })

  // Reject multiple
  const rejectMutation = useMutation({
    mutationFn: async ({ ids, note }: { ids: string[]; note: string }) => {
      await Promise.all(ids.map(id => paymentsApi.reject(id, note)))
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['approval-queue'] })
      setSelectedIds([])
      setRejectNote('')
      setShowRejectDialog(false)
    },
  })

  const columns = [
    {
      key: 'beneficiary',
      header: 'Recipient',
      render: (p: Payment) => (
        <div>
          <p className="font-medium text-foreground">{p.beneficiary_name ?? '—'}</p>
          <p className="text-xs text-muted-fg">{p.beneficiary_country_code}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'You send',
      render: (p: Payment) => <AmountDisplay amount={p.source_amount} currency={p.source_currency} />,
    },
    {
      key: 'destination',
      header: 'They receive',
      render: (p: Payment) => <AmountDisplay amount={p.dest_amount} currency={p.dest_currency} />,
    },
    {
      key: 'rate',
      header: 'Rate',
      render: (p: Payment) => (
        <span className="text-xs text-muted-fg">
          1 {p.source_currency} = {parseFloat(p.exchange_rate).toFixed(4)} {p.dest_currency}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: Payment) => <StatusBadge status={p.status} />,
    },
    {
      key: 'submitted',
      header: 'Submitted',
      render: (p: Payment) => (
        <span className="text-xs text-muted-fg">{new Date(p.created_at).toLocaleString()}</span>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading approval queue…" />
  if (isError) return <ErrorState title="Could not load queue" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Approval queue"
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Approval queue' }]}
        actions={
          total > 0 && (
            <Badge variant="warning" className="text-sm px-3 py-1">
              {total} pending
            </Badge>
          )
        }
      />

      {/* Bulk action bar */}
      {isChecker && selectedIds.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary-subtle-border bg-primary-subtle px-4 py-3">
          <span className="text-sm font-medium text-foreground">{selectedIds.length} selected</span>
          <div className="ml-auto flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRejectDialog(true)}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              Reject selected
            </Button>
            <Button
              size="sm"
              loading={approveMutation.isPending}
              disabled={rejectMutation.isPending}
              onClick={() => approveMutation.mutate(selectedIds)}
            >
              Approve {selectedIds.length}
            </Button>
          </div>
        </div>
      )}

      {(approveMutation.isError || rejectMutation.isError) && (
        <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
          {getApiError(approveMutation.error ?? rejectMutation.error, 'Action failed. Please try again.')}
        </div>
      )}

      {payments.length === 0 ? (
        <ContentCard>
          <div className="py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-muted-fg/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-medium text-foreground">All clear!</p>
            <p className="mt-1 text-xs text-muted-fg">No payments are waiting for approval.</p>
          </div>
        </ContentCard>
      ) : (
        <ContentCard padding="none">
          <DataTable
            columns={columns}
            data={payments}
            getRowId={p => p.id}
            selectable={isChecker}
            selectedIds={selectedIds}
            onSelectionChange={isChecker ? setSelectedIds : undefined}
            onRowClick={p => navigate(`/payments/${p.id}`)}
            emptyTitle="No pending payments"
            emptyDescription="All payments have been processed."
          />

          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <span className="text-xs text-muted-fg">{total} pending approvals</span>
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
        </ContentCard>
      )}

      {/* Bulk reject dialog */}
      <ConfirmDialog
        open={showRejectDialog}
        onOpenChange={open => { setShowRejectDialog(open); if (!open) setRejectNote('') }}
        title={`Reject ${selectedIds.length} payment${selectedIds.length !== 1 ? 's' : ''}`}
        description="Provide a reason for rejection. This will be visible to the submitters of all selected payments."
        confirmLabel="Reject all selected"
        variant="danger"
        onConfirm={() => rejectMutation.mutate({ ids: selectedIds, note: rejectNote })}
        loading={rejectMutation.isPending}
        disabled={rejectNote.trim().length < 5}
      >
        <Textarea
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          placeholder="Enter rejection reason (required, min 5 chars)…"
          rows={3}
        />
      </ConfirmDialog>
    </div>
  )
}
