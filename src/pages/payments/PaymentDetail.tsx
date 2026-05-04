import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Timeline } from '@/components/ui/organisms/Timeline'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Button } from '@/components/ui/atoms/Button'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { ContentCard } from '@/layouts/ContentCard'
import { usePayment } from '@/hooks/usePayments'
import { useAuthStore } from '@/stores/authStore'
import paymentsApi from '@/api/payments'

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-fg shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-foreground text-right flex-1">{value}</span>
    </div>
  )
}

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  const { data: payment, isLoading, isError, refetch } = usePayment(id ?? '')

  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  const approveMutation = useMutation({
    mutationFn: () => paymentsApi.approve(id!),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payments', id] }),
  })

  const rejectMutation = useMutation({
    mutationFn: () => paymentsApi.reject(id!, rejectNote),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', id] })
      setShowRejectDialog(false)
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => paymentsApi.cancel(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments', id] })
      setShowCancelDialog(false)
    },
  })

  if (isLoading) return <LoadingState message="Loading payment details…" />
  if (isError || !payment) return (
    <ErrorState title="Payment not found" onRetry={refetch} />
  )

  const canApprove = payment.status === 'pending_approval' && (user?.role === 'admin' || user?.role === 'checker')
  const isOwnPayment = payment.initiatorId === user?.id
  const canCancel = ['pending_approval', 'approved'].includes(payment.status) && isOwnPayment

  const timelineEvents = (payment.statusHistory ?? []).map(h => ({
    id: h.id,
    status: h.status,
    note: h.note,
    timestamp: h.createdAt,
    actor: h.actorType,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <PageHeader
        title="Payment details"
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: `#${id?.slice(0, 8)}…` }]}
        actions={
          <div className="flex items-center gap-2">
            {canApprove && !isOwnPayment && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={approveMutation.isPending || rejectMutation.isPending}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  loading={approveMutation.isPending}
                  disabled={rejectMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  Approve
                </Button>
              </>
            )}
            {canApprove && isOwnPayment && (
              <span className="text-xs text-muted-fg italic">Awaiting approval from another user</span>
            )}
            {canCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelMutation.isPending}
              >
                Cancel payment
              </Button>
            )}
          </div>
        }
      />

      {/* Summary banner */}
      <ContentCard>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-3xl font-bold text-foreground">
              <AmountDisplay amount={payment.sourceAmount} currency={payment.sourceCurrency} size="lg" />
            </p>
            <p className="text-sm text-muted-fg mt-1">
              → <AmountDisplay amount={payment.destinationAmount} currency={payment.destinationCurrency} /> to {payment.beneficiary?.name ?? '—'}
            </p>
          </div>
          <StatusBadge status={payment.status} />
        </div>
      </ContentCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Payment info */}
        <ContentCard>
          <h3 className="text-sm font-semibold text-foreground mb-3">Transfer details</h3>
          <DetailRow label="Exchange rate" value={`1 ${payment.sourceCurrency} = ${parseFloat(payment.exchangeRate).toFixed(4)} ${payment.destinationCurrency}`} />
          <DetailRow label="Fee" value={<AmountDisplay amount={payment.feeAmount} currency={payment.sourceCurrency} />} />
          <DetailRow label="Purpose" value={payment.purposeCode} />
          {payment.reference && <DetailRow label="Reference" value={payment.reference} />}
          <DetailRow label="Payment ID" value={<span className="font-mono text-xs">{payment.id}</span>} />
        </ContentCard>

        {/* Recipient info */}
        <ContentCard>
          <h3 className="text-sm font-semibold text-foreground mb-3">Recipient</h3>
          <DetailRow label="Name" value={payment.beneficiary?.name ?? '—'} />
          <DetailRow label="Country" value={payment.beneficiary?.countryCode ?? '—'} />
          <DetailRow label="Submitted" value={new Date(payment.createdAt).toLocaleString()} />
          {payment.completedAt && <DetailRow label="Completed" value={new Date(payment.completedAt).toLocaleString()} />}
        </ContentCard>
      </div>

      {/* Status history timeline */}
      {timelineEvents.length > 0 && (
        <ContentCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Status history</h3>
          <Timeline events={timelineEvents} />
        </ContentCard>
      )}

      {/* Approve/reject errors */}
      {(approveMutation.isError || rejectMutation.isError) && (
        <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
          Action failed. Please try again.
        </div>
      )}

      {/* Reject dialog */}
      <ConfirmDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        title="Reject payment"
        description="Please provide a reason for rejecting this payment. This will be visible to the submitter."
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => rejectMutation.mutate()}
        loading={rejectMutation.isPending}
        disabled={rejectNote.trim().length < 5}
      >
        <Textarea
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          placeholder="Enter rejection reason (required)…"
          rows={3}
        />
      </ConfirmDialog>

      {/* Cancel dialog */}
      <ConfirmDialog
        open={showCancelDialog}
        onOpenChange={setShowCancelDialog}
        title="Cancel payment"
        description="Are you sure you want to cancel this payment? This action cannot be undone."
        confirmLabel="Cancel payment"
        variant="danger"
        onConfirm={() => cancelMutation.mutate()}
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
