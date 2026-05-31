import { useParams, useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
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
import { getApiError } from '@/lib/apiError'
import { printReceiptAsTextPdf, copyReceiptText } from '@/lib/receipt'

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-fg shrink-0">{label}</span>
      <span className={`text-sm font-medium text-foreground text-right flex-1 ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
  const [copied, setCopied] = useState(false)

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
  if (isError || !payment) return <ErrorState title="Payment not found" onRetry={refetch} />

  const isSuperAdmin = user?.role === 'super_admin'
  const isOwnPayment = payment.user_id === user?.id
  const canApprove = payment.status === 'pending_approval' &&
    (isSuperAdmin || user?.role === 'client_admin' || user?.role === 'checker')
  const canCancel = ['pending_approval', 'pending_compliance', 'pending_manual_processing'].includes(payment.status) && isOwnPayment

  const timelineEvents = (payment.status_history ?? []).map(h => ({
    id: h.id,
    status: h.status,
    note: h.notes,
    timestamp: h.created_at,
    actor: h.actor_type,
  }))

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      <PageHeader
        title="Payment details"
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: `#${id?.slice(0, 8)}…` }]}
        actions={
          <div className="flex items-center gap-2">
            {canApprove && (!isOwnPayment || isSuperAdmin) && (
              <>
                <Button variant="outline" size="sm" onClick={() => setShowRejectDialog(true)} disabled={approveMutation.isPending || rejectMutation.isPending}>
                  Reject
                </Button>
                <Button size="sm" loading={approveMutation.isPending} disabled={rejectMutation.isPending} onClick={() => approveMutation.mutate()}>
                  Approve
                </Button>
              </>
            )}
            {canApprove && isOwnPayment && !isSuperAdmin && (
              <span className="text-xs text-muted-fg italic">Awaiting approval from another user</span>
            )}
            {canCancel && (
              <Button variant="ghost" size="sm" onClick={() => setShowCancelDialog(true)} disabled={cancelMutation.isPending}>
                Cancel payment
              </Button>
            )}

            {/* Share receipt */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button variant="outline" size="sm">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share receipt
                  <svg className="h-3 w-3 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={6}
                  className="z-50 min-w-[180px] rounded-xl border border-border bg-surface p-1.5 card-shadow-md animate-in fade-in-0 zoom-in-95"
                >
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-overlay outline-none transition-colors"
                    onSelect={() => printReceiptAsTextPdf(payment)}
                  >
                    <svg className="h-4 w-4 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-overlay outline-none transition-colors"
                    onSelect={async () => {
                      const ok = await copyReceiptText(payment)
                      if (ok) { setCopied(true); setTimeout(() => setCopied(false), 2000) }
                    }}
                  >
                    <svg className="h-4 w-4 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                    </svg>
                    {copied ? 'Copied!' : 'Copy as text'}
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        }
      />

      {/* ── Hero card ── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-background p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        {/* Amount corridor */}
        <div className="relative flex items-center justify-between gap-4">
          {/* Source */}
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-fg uppercase tracking-wider">You send</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {parseFloat(payment.source_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-lg font-semibold text-muted-fg">{payment.source_currency}</span>
            </div>
          </div>

          {/* Arrow + rate */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-2">
              <div className="h-px w-8 bg-border" />
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-surface shadow-sm">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </div>
              <div className="h-px w-8 bg-border" />
            </div>
            <span className="text-xs text-muted-fg tabular-nums whitespace-nowrap">
              1 {payment.source_currency} = {parseFloat(payment.exchange_rate).toFixed(4)} {payment.dest_currency}
            </span>
          </div>

          {/* Dest */}
          <div className="flex flex-col gap-1 items-end">
            <span className="text-xs font-medium text-muted-fg uppercase tracking-wider">They receive</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {parseFloat(payment.dest_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-lg font-semibold text-muted-fg">{payment.dest_currency}</span>
            </div>
          </div>
        </div>

        {/* Status + meta row */}
        <div className="relative mt-5 pt-4 border-t border-border flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <StatusBadge status={payment.status} />
            {payment.beneficiary_name && (
              <span className="text-sm text-muted-fg">
                → <span className="font-medium text-foreground">{payment.beneficiary_name}</span>
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-fg">
            <span>
              Fee: <span className="font-medium text-foreground">
                {parseFloat(payment.fee_amount ?? '0').toFixed(2)} {payment.source_currency}
              </span>
            </span>
            <span>{new Date(payment.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Details grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Transfer info */}
        <ContentCard>
          <SectionHeader
            title="Transfer details"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          />
          <InfoRow label="Exchange rate" value={`1 ${payment.source_currency} = ${parseFloat(payment.exchange_rate).toFixed(4)} ${payment.dest_currency}`} />
          <InfoRow label="Fee" value={<AmountDisplay amount={payment.fee_amount} currency={payment.source_currency} />} />
          <InfoRow label="Purpose" value={payment.purpose_code} />
          {payment.reference && <InfoRow label="Reference" value={payment.reference} mono />}
          <InfoRow label="Payment ID" value={payment.id} mono />
        </ContentCard>

        {/* Recipient info */}
        <ContentCard>
          <SectionHeader
            title="Recipient"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            }
          />
          <InfoRow label="Name" value={payment.beneficiary_name ?? '—'} />
          <InfoRow label="Country" value={payment.beneficiary_country_code ?? '—'} />
          <InfoRow label="Submitted" value={new Date(payment.created_at).toLocaleString()} />
          {payment.completed_at && (
            <InfoRow label="Completed" value={new Date(payment.completed_at).toLocaleString()} />
          )}
          {payment.note && <InfoRow label="Note" value={payment.note} />}
        </ContentCard>
      </div>

      {/* ── Provider details (super_admin only) ── */}
      {isSuperAdmin && (
        <ContentCard>
          <SectionHeader
            title="Provider details"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            }
          />
          <InfoRow
            label="Provider"
            value={
              <span className="inline-flex items-center rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-mono text-foreground">
                {payment.provider_name ?? 'manual'}
              </span>
            }
          />
          <InfoRow label="Provider payment ID" value={payment.provider_payment_id ?? '—'} mono />
          {payment.ops_notes && <InfoRow label="Ops notes" value={payment.ops_notes} />}
        </ContentCard>
      )}

      {/* ── Status timeline ── */}
      {timelineEvents.length > 0 && (
        <ContentCard>
          <SectionHeader
            title="Status history"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Timeline events={timelineEvents} />
        </ContentCard>
      )}

      {/* ── Errors ── */}
      {(approveMutation.isError || rejectMutation.isError) && (
        <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {getApiError(approveMutation.error ?? rejectMutation.error, 'Action failed. Please try again.')}
        </div>
      )}

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
