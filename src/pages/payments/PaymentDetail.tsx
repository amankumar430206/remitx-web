import { useParams } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Timeline } from '@/components/ui/organisms/Timeline'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { ContentCard } from '@/layouts/ContentCard'
import { usePayment } from '@/hooks/usePayments'
import { useAuthStore } from '@/stores/authStore'
import paymentsApi from '@/api/payments'
import adminApi from '@/api/admin'
import { getApiError } from '@/lib/apiError'
import { downloadReceiptPdf, copyReceiptText } from '@/lib/receipt'
import { cn } from '@/lib/utils'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string
  value: React.ReactNode
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-fg shrink-0">{label}</span>
      <span
        className={cn(
          'text-sm font-medium text-foreground text-right flex-1',
          mono && 'font-mono text-xs',
        )}
      >
        {value}
      </span>
    </div>
  )
}

function NavPills({ items }: { items: Array<{ label: string; id: string }> }) {
  if (items.length === 0) return null
  const scrollTo = (id: string) => {
    const el = document.getElementById(id)
    if (!el) return
    const top = el.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.2
    window.scrollTo({ top, behavior: 'smooth' })
  }
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          onClick={() => scrollTo(item.id)}
          className="shrink-0 inline-flex items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-muted-fg transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
        >
          {item.label}
          <svg className="h-2.5 w-2.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      ))}
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

// ─── Icon set (re-used inline) ────────────────────────────────────────────────

const Icons = {
  check: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  warn: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  info: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  x: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  shield: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  clock: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  refresh: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  transfer: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
    </svg>
  ),
  user: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  users: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  bank: (
    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
}

// ─── Status context configs ───────────────────────────────────────────────────

const STATUS_CONTEXT = {
  pending_compliance: {
    color: 'border-warning/40 bg-warning/5',
    iconColor: 'text-warning-fg',
    title: 'Compliance review required',
    body: 'This payment was flagged by AML screening and is awaiting a compliance officer review. Approve to release for processing, or reject to return the payment.',
    icon: 'shield',
  },
  pending_manual_processing: {
    color: 'border-primary/30 bg-primary/5',
    iconColor: 'text-primary',
    title: 'Awaiting manual settlement',
    body: 'The payment has been approved and is queued for manual bank transfer. Execute the transfer externally, then mark this payment complete with the provider reference.',
    icon: 'bank',
  },
  processing: {
    color: 'border-primary/30 bg-primary/5',
    iconColor: 'text-primary',
    title: 'Payment is processing',
    body: 'The payment has been dispatched to the provider. Once the transfer settles externally you can mark it complete, or fail it to reverse the debit.',
    icon: 'refresh',
  },
} as const

// ─── Component ────────────────────────────────────────────────────────────────

export function PaymentDetail() {
  const { id } = useParams<{ id: string }>()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)

  const { data: payment, isLoading, isError, refetch } = usePayment(id ?? '')

  // ── dialog state ──────────────────────────────────────────────────────────
  const [showRejectDialog,   setShowRejectDialog]   = useState(false)
  const [rejectNote,         setRejectNote]         = useState('')
  const [showCancelDialog,   setShowCancelDialog]   = useState(false)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [showFailDialog,     setShowFailDialog]     = useState(false)
  const [processNotes,       setProcessNotes]       = useState('')
  const [providerRef,        setProviderRef]        = useState('')
  const [copied,             setCopied]             = useState(false)
  const [showBackToTop,      setShowBackToTop]      = useState(false)

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // ── mutations ─────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['payments', id] })
    qc.invalidateQueries({ queryKey: ['payments'] })
  }

  const approveMutation = useMutation({
    mutationFn: () => paymentsApi.approve(id!),
    onSuccess: invalidate,
  })

  const rejectMutation = useMutation({
    mutationFn: () => paymentsApi.reject(id!, rejectNote),
    onSuccess: () => { invalidate(); setShowRejectDialog(false) },
  })

  const cancelMutation = useMutation({
    mutationFn: () => paymentsApi.cancel(id!),
    onSuccess: () => { invalidate(); setShowCancelDialog(false) },
  })

  const completeMutation = useMutation({
    mutationFn: () => adminApi.payments.process(id!, 'complete', processNotes || undefined, providerRef || undefined),
    onSuccess: () => { invalidate(); setShowCompleteDialog(false); setProcessNotes(''); setProviderRef('') },
  })

  const failMutation = useMutation({
    mutationFn: () => adminApi.payments.process(id!, 'fail', processNotes || undefined),
    onSuccess: () => { invalidate(); setShowFailDialog(false); setProcessNotes('') },
  })

  if (isLoading) return <LoadingState message="Loading payment details…" />
  if (isError || !payment) return <ErrorState title="Payment not found" onRetry={refetch} />

  // ── role / status derivations ─────────────────────────────────────────────
  const isSuperAdmin  = user?.role === 'super_admin'
  const isAdminRole   = isSuperAdmin || user?.role === 'client_admin'
  const isOwnPayment  = payment.user_id === user?.id
  const isTerminal    = ['completed', 'failed', 'rejected', 'cancelled'].includes(payment.status)

  /** Approve/reject: pending_approval or pending_compliance */
  const canApprove = ['pending_approval', 'pending_compliance'].includes(payment.status) &&
    (isSuperAdmin || user?.role === 'client_admin' || user?.role === 'checker')

  /** Ops: complete / fail — super_admin only */
  const canProcess = isSuperAdmin &&
    ['pending_manual_processing', 'processing'].includes(payment.status)

  /** Initiator can cancel while still actionable */
  const canCancel = ['pending_approval', 'pending_compliance', 'pending_manual_processing'].includes(payment.status) &&
    isOwnPayment

  const anyMutationPending =
    approveMutation.isPending || rejectMutation.isPending ||
    completeMutation.isPending || failMutation.isPending || cancelMutation.isPending

  // ── status history helpers ────────────────────────────────────────────────
  const history = payment.status_history ?? []

  const timelineEvents = history.map(h => ({
    id: h.id,
    status: h.status,
    note: h.notes,
    timestamp: h.created_at,
    actor: h.actor_type,
  }))

  /** Last notes entry for a given status */
  const lastNotesFor = (s: string) =>
    [...history].reverse().find(h => h.status === s)?.notes

  const rejectionReason  = lastNotesFor('rejected')
  const failureReason    = lastNotesFor('failed')
  const cancellationNote = lastNotesFor('cancelled')
  const amlNote          = history.find(h => h.status === 'pending_compliance')?.notes

  // ── dual approval: first approval already recorded ────────────────────────
  const hasFirstApproval  = payment.status === 'pending_approval' && !!payment.checker_id
  const checkerName = payment.checker_first_name
    ? `${payment.checker_first_name} ${payment.checker_last_name ?? ''}`.trim()
    : payment.checker_email

  // ── submitter display ─────────────────────────────────────────────────────
  const submitterName = payment.submitter_first_name
    ? `${payment.submitter_first_name} ${payment.submitter_last_name ?? ''}`.trim()
    : payment.submitter_email

  const statusCtx = STATUS_CONTEXT[payment.status as keyof typeof STATUS_CONTEXT] ?? null

  const printPaymentDetails = () => {
    const win = window.open('', '_blank', 'width=720,height=800')
    if (!win) return
    const rows: [string, string][] = [
      ['Reference',     payment.reference ?? payment.id],
      ['Status',        payment.status.replace(/_/g, ' ')],
      ['Send',          `${parseFloat(payment.source_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${payment.source_currency}`],
      ['Receive',       `${parseFloat(payment.dest_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} ${payment.dest_currency}`],
      ['Exchange rate', `1 ${payment.source_currency} = ${parseFloat(payment.exchange_rate).toFixed(4)} ${payment.dest_currency}`],
      ['Fee',           `${parseFloat(payment.fee_amount ?? '0').toFixed(2)} ${payment.source_currency}`],
      ['Purpose',       payment.purpose_code],
      ['Submitted',     new Date(payment.created_at).toLocaleString()],
      ...(payment.completed_at ? [['Completed', new Date(payment.completed_at).toLocaleString()] as [string,string]] : []),
      ...(payment.note ? [['Note', payment.note] as [string,string]] : []),
      ['Recipient',     payment.beneficiary_name ?? '—'],
      ['Country',       payment.beneficiary_country_code ?? '—'],
      ...(payment.beneficiary_bank_name       ? [['Bank',           payment.beneficiary_bank_name]       as [string,string]] : []),
      ...(payment.beneficiary_account_number  ? [['Account no.',    payment.beneficiary_account_number]  as [string,string]] : []),
      ...(payment.beneficiary_iban            ? [['IBAN',           payment.beneficiary_iban]            as [string,string]] : []),
      ...(payment.beneficiary_swift_bic       ? [['SWIFT / BIC',    payment.beneficiary_swift_bic]       as [string,string]] : []),
      ...(payment.account_number_ref          ? [['Source account', payment.account_number_ref]          as [string,string]] : []),
      ...(payment.provider_payment_id         ? [['Provider ref',   payment.provider_payment_id]         as [string,string]] : []),
    ]
    const html = `<!DOCTYPE html><html><head>
<title>Payment ${payment.reference ?? payment.id}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; color: #111827; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 20px; font-weight: 700; margin-bottom: 2px; }
  .meta { color: #6B7280; font-size: 11px; margin-bottom: 28px; }
  table { width: 100%; border-collapse: collapse; }
  tr { border-bottom: 1px solid #E5E7EB; }
  tr:last-child { border-bottom: none; }
  td { padding: 9px 6px; vertical-align: top; }
  td:first-child { color: #6B7280; width: 38%; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; padding-top: 11px; }
  td:last-child { font-weight: 600; }
</style>
</head><body>
<h1>Payment Details</h1>
<p class="meta">Printed ${new Date().toLocaleString()} · ${payment.reference ?? payment.id}</p>
<table>${rows.map(([l, v]) => `<tr><td>${l}</td><td>${v}</td></tr>`).join('')}</table>
</body></html>`
    win.document.write(html)
    win.document.close()
    win.focus()
    win.print()
    win.onafterprint = () => win.close()
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <PageHeader
        title="Payment details"
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: `#${id?.slice(0, 8)}…` },
        ]}
        actions={
          <div className="flex items-center gap-2 flex-wrap justify-end print:hidden">

            {/* Approve / Reject */}
            {canApprove && (!isOwnPayment || isSuperAdmin) && (
              <>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setShowRejectDialog(true)}
                  disabled={anyMutationPending}
                >
                  Reject
                </Button>
                <Button
                  size="sm"
                  loading={approveMutation.isPending}
                  disabled={anyMutationPending && !approveMutation.isPending}
                  onClick={() => approveMutation.mutate()}
                >
                  Approve
                </Button>
              </>
            )}

            {/* Ops: Complete / Fail */}
            {canProcess && (
              <>
                <Button
                  variant="outline" size="sm"
                  onClick={() => { setProcessNotes(''); setShowFailDialog(true) }}
                  disabled={anyMutationPending}
                  className="border-danger/40 text-danger-fg hover:bg-danger/5"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Mark as failed
                </Button>
                <Button
                  size="sm"
                  loading={completeMutation.isPending}
                  disabled={anyMutationPending && !completeMutation.isPending}
                  onClick={() => { setProcessNotes(''); setProviderRef(''); setShowCompleteDialog(true) }}
                  className="bg-success text-success-fg hover:bg-success/90"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Mark as complete
                </Button>
              </>
            )}

            {/* Cancel */}
            {canCancel && (
              <Button
                variant="ghost" size="sm"
                onClick={() => setShowCancelDialog(true)}
                disabled={anyMutationPending}
              >
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
                    onSelect={() => downloadReceiptPdf(payment)}
                  >
                    <svg className="h-4 w-4 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download PDF
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-overlay outline-none transition-colors"
                    onSelect={printPaymentDetails}
                  >
                    <svg className="h-4 w-4 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                    </svg>
                    Print page
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

      {/* ══════════════════════════════════════════════════════════════════════
          STATUS BANNERS — ordered by priority
      ══════════════════════════════════════════════════════════════════════ */}

      {/* ── 1. Completed ──────────────────────────────────────────────────── */}
      {payment.status === 'completed' && (
        <div className="flex items-start gap-3 rounded-xl border border-success/40 bg-success/10 px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success/20 text-success-fg">
            {Icons.check}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-success-fg">Transfer complete</span>
            <span className="text-xs text-success-fg/80 leading-relaxed">
              Funds were successfully delivered to {payment.beneficiary_name ?? 'the recipient'}.
              {payment.completed_at && (
                <> Settled {new Date(payment.completed_at).toLocaleString()}.</>
              )}
              {payment.provider_payment_id && (
                <> Provider ref: <span className="font-mono">{payment.provider_payment_id}</span>.</>
              )}
            </span>
          </div>
        </div>
      )}

      {/* ── 2. Rejected ───────────────────────────────────────────────────── */}
      {payment.status === 'rejected' && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger-fg">
            {Icons.x}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-danger-fg">Payment rejected</span>
            {rejectionReason ? (
              <span className="text-xs text-danger-fg/80 leading-relaxed">
                Reason: {rejectionReason}
              </span>
            ) : (
              <span className="text-xs text-danger-fg/70">No reason was recorded.</span>
            )}
          </div>
        </div>
      )}

      {/* ── 3. Failed ─────────────────────────────────────────────────────── */}
      {payment.status === 'failed' && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-danger/20 text-danger-fg">
            {Icons.warn}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-danger-fg">Payment failed</span>
            {failureReason ? (
              <span className="text-xs text-danger-fg/80 leading-relaxed">
                {failureReason} — The debit has been reversed and the balance restored.
              </span>
            ) : (
              <span className="text-xs text-danger-fg/70">
                The payment could not be completed. The debit has been reversed.
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── 4. Cancelled ──────────────────────────────────────────────────── */}
      {payment.status === 'cancelled' && (
        <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-overlay px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted/30 text-muted-fg">
            {Icons.x}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">Payment cancelled</span>
            <span className="text-xs text-muted-fg leading-relaxed">
              {cancellationNote ?? 'This payment was cancelled before it was processed.'}
            </span>
          </div>
        </div>
      )}

      {/* ── 5. Awaiting approval — own payment, not super_admin ───────────── */}
      {canApprove && isOwnPayment && !isSuperAdmin && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-warning/20 text-warning-fg">
            {Icons.clock}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-warning-fg">Awaiting approval</span>
            <span className="text-xs text-warning-fg/80 leading-relaxed">
              You submitted this payment. Another authorised user (checker or admin) must approve it before it can be processed.
            </span>
          </div>
        </div>
      )}

      {/* ── 6. Dual approval: first approval done, waiting for second ─────── */}
      {hasFirstApproval && !isOwnPayment && (
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3.5">
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            {Icons.users}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-foreground">First approval recorded</span>
            <span className="text-xs text-muted-fg leading-relaxed">
              {checkerName ?? 'A checker'} provided first approval. A second authorised checker must approve to finalise.
            </span>
          </div>
        </div>
      )}

      {/* ── 7. Compliance / manual / processing context (admin view) ─────── */}
      {statusCtx && !isTerminal && (isAdminRole || canApprove) && (
        <div className={cn('flex items-start gap-3 rounded-xl border px-4 py-3.5', statusCtx.color)}>
          <div className={cn('mt-0.5 shrink-0', statusCtx.iconColor)}>
            {payment.status === 'pending_compliance' ? Icons.shield :
              payment.status === 'processing' ? Icons.refresh : Icons.bank}
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">{statusCtx.title}</p>
            <p className="text-xs text-muted-fg mt-0.5 leading-relaxed">{statusCtx.body}</p>
            {amlNote && payment.status === 'pending_compliance' && (
              <p className="mt-2 rounded-lg bg-warning/10 border border-warning/20 px-3 py-1.5 text-xs text-warning-fg leading-relaxed">
                AML note: {amlNote}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HERO CARD
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-background p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative flex items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-fg uppercase tracking-wider">You send</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {parseFloat(payment.source_amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-lg font-semibold text-muted-fg">{payment.source_currency}</span>
            </div>
          </div>

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

          <div className="flex flex-col gap-1 items-end">
            <span className="text-xs font-medium text-muted-fg uppercase tracking-wider">They receive</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-foreground tabular-nums">
                {parseFloat(payment.dest_amount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
              <span className="text-lg font-semibold text-muted-fg">{payment.dest_currency}</span>
            </div>
          </div>
        </div>

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
              Fee:{' '}
              <span className="font-medium text-foreground">
                {parseFloat(payment.fee_amount ?? '0').toFixed(2)} {payment.source_currency}
              </span>
            </span>
            <span>{new Date(payment.created_at).toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* ── Print-only header ─────────────────────────────────────────────── */}
      <div className="hidden print:block border-b border-border pb-4">
        <p className="text-xs text-muted-fg uppercase tracking-widest mb-1">Payment receipt</p>
        <p className="text-lg font-bold text-foreground">{payment.reference ?? payment.id}</p>
        <p className="text-xs text-muted-fg mt-0.5">Printed {new Date().toLocaleString()}</p>
      </div>

      {/* ── Section quick-nav ─────────────────────────────────────────────── */}
      <div className="print:hidden">
      <NavPills items={[
        { label: 'Transfer details', id: 'section-transfer' },
        { label: 'Recipient',        id: 'section-recipient' },
        ...((payment.account_currency || payment.account_number_ref)
          ? [{ label: 'Source account', id: 'section-account' }] : []),
        ...((payment.submitter_email || payment.checker_email)
          ? [{ label: 'People', id: 'section-people' }] : []),
        ...(isAdminRole
          ? [{ label: 'Provider details', id: 'section-provider' }] : []),
        ...(timelineEvents.length > 0
          ? [{ label: 'Status history', id: 'section-history' }] : []),
      ]} />
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          DETAIL CARDS GRID
      ══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Transfer details */}
        <div id="section-transfer"><ContentCard>
          <SectionHeader title="Transfer details" icon={Icons.transfer} />
          <InfoRow
            label="Exchange rate"
            value={`1 ${payment.source_currency} = ${parseFloat(payment.exchange_rate).toFixed(4)} ${payment.dest_currency}`}
          />
          <InfoRow label="Fee" value={<AmountDisplay amount={payment.fee_amount} currency={payment.source_currency} />} />
          <InfoRow label="Purpose" value={payment.purpose_code} />
          {payment.note && <InfoRow label="Submitter note" value={payment.note} />}
          {payment.reference && <InfoRow label="Reference" value={payment.reference} mono />}
          <InfoRow label="Payment ID" value={payment.id} mono />
          <InfoRow label="Submitted" value={new Date(payment.created_at).toLocaleString()} />
          {payment.completed_at && (
            <InfoRow label="Completed" value={new Date(payment.completed_at).toLocaleString()} />
          )}
        </ContentCard></div>

        {/* Recipient / Beneficiary */}
        <div id="section-recipient"><ContentCard>
          <SectionHeader title="Recipient" icon={Icons.user} />
          <InfoRow label="Name"    value={payment.beneficiary_name    ?? '—'} />
          <InfoRow label="Country" value={payment.beneficiary_country_code ?? '—'} />
          {payment.beneficiary_currency && (
            <InfoRow label="Currency" value={payment.beneficiary_currency} />
          )}
          {payment.beneficiary_bank_name && (
            <InfoRow label="Bank" value={payment.beneficiary_bank_name} />
          )}
          {payment.beneficiary_account_number && (
            <InfoRow label="Account no." value={payment.beneficiary_account_number} mono />
          )}
          {payment.beneficiary_iban && (
            <InfoRow label="IBAN" value={payment.beneficiary_iban} mono />
          )}
          {payment.beneficiary_swift_bic && (
            <InfoRow label="SWIFT / BIC" value={payment.beneficiary_swift_bic} mono />
          )}
        </ContentCard></div>
      </div>

      {/* ── Source account ────────────────────────────────────────────────── */}
      {(payment.account_currency || payment.account_number_ref) && (
        <div id="section-account"><ContentCard>
          <SectionHeader title="Source account" icon={Icons.bank} />
          {payment.account_currency && (
            <InfoRow label="Account currency" value={payment.account_currency} />
          )}
          {payment.account_number_ref && (
            <InfoRow label="Account number" value={payment.account_number_ref} mono />
          )}
        </ContentCard></div>
      )}

      {/* ── People (submitter + checker) ──────────────────────────────────── */}
      {(payment.submitter_email || payment.checker_email) && (
        <div id="section-people"><ContentCard>
          <SectionHeader title="People" icon={Icons.users} />
          {payment.submitter_email && (
            <div className="flex items-start justify-between gap-4 py-3 border-b border-border">
              <span className="text-xs text-muted-fg shrink-0">Submitted by</span>
              <div className="text-right">
                {submitterName && (
                  <p className="text-sm font-medium text-foreground">{submitterName}</p>
                )}
                <p className="text-xs text-muted-fg">{payment.submitter_email}</p>
              </div>
            </div>
          )}
          {payment.checker_email && (
            <div className="flex items-start justify-between gap-4 py-3 last:border-0">
              <span className="text-xs text-muted-fg shrink-0">
                {payment.status === 'pending_approval' && payment.checker_id
                  ? 'First approver'
                  : 'Approved by'}
              </span>
              <div className="text-right">
                {checkerName && (
                  <p className="text-sm font-medium text-foreground">{checkerName}</p>
                )}
                <p className="text-xs text-muted-fg">{payment.checker_email}</p>
              </div>
            </div>
          )}
        </ContentCard></div>
      )}

      {/* ── Provider details (admin only) ─────────────────────────────────── */}
      {isAdminRole && (
        <div id="section-provider"><ContentCard>
          <SectionHeader title="Provider details" icon={Icons.transfer} />
          <InfoRow
            label="Provider"
            value={
              <span className="inline-flex items-center rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-mono text-foreground">
                {payment.provider_name ?? 'manual'}
              </span>
            }
          />
          {payment.provider_payment_id && (
            <InfoRow label="Provider payment ID" value={payment.provider_payment_id} mono />
          )}
          {!payment.provider_payment_id && (
            <InfoRow label="Provider payment ID" value="—" />
          )}
          {payment.ops_notes && (
            <InfoRow label="Ops notes" value={payment.ops_notes} />
          )}
          {isSuperAdmin && payment.tenant_name && (
            <InfoRow label="Client" value={payment.tenant_name} />
          )}
        </ContentCard></div>
      )}

      {/* ── Status timeline ───────────────────────────────────────────────── */}
      {timelineEvents.length > 0 && (
        <div id="section-history"><ContentCard>
          <SectionHeader
            title="Status history"
            icon={
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <Timeline events={timelineEvents} />
        </ContentCard></div>
      )}

      {/* ── Mutation errors ───────────────────────────────────────────────── */}
      {(approveMutation.isError || rejectMutation.isError || completeMutation.isError ||
        failMutation.isError || cancelMutation.isError) && (
        <div className="print:hidden flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          {getApiError(
            approveMutation.error ?? rejectMutation.error ??
            completeMutation.error ?? failMutation.error ?? cancelMutation.error,
            'Action failed. Please try again.',
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          DIALOGS
      ══════════════════════════════════════════════════════════════════════ */}

      {/* Reject */}
      <ConfirmDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        title="Reject payment"
        description="Provide a reason for rejecting this payment. The submitter will see this message."
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => rejectMutation.mutate()}
        loading={rejectMutation.isPending}
        disabled={rejectNote.trim().length < 5}
      >
        <Textarea
          value={rejectNote}
          onChange={e => setRejectNote(e.target.value)}
          placeholder="Enter rejection reason (minimum 5 characters)…"
          rows={3}
        />
      </ConfirmDialog>

      {/* Cancel */}
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

      {/* Mark as complete */}
      <ConfirmDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        title="Mark payment as complete"
        description="Confirm that the funds have been successfully transferred to the recipient."
        confirmLabel="Mark as complete"
        variant="default"
        onConfirm={() => completeMutation.mutate()}
        loading={completeMutation.isPending}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Provider reference <span className="text-muted-fg font-normal">(optional)</span>
            </label>
            <Input
              value={providerRef}
              onChange={e => setProviderRef(e.target.value)}
              placeholder="Transaction ID from banking portal…"
              maxLength={128}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-foreground">
              Notes <span className="text-muted-fg font-normal">(optional)</span>
            </label>
            <Textarea
              value={processNotes}
              onChange={e => setProcessNotes(e.target.value)}
              placeholder="Any additional notes for the audit trail…"
              rows={2}
            />
          </div>
        </div>
      </ConfirmDialog>

      {/* Mark as failed */}
      <ConfirmDialog
        open={showFailDialog}
        onOpenChange={setShowFailDialog}
        title="Mark payment as failed"
        description="The debit will be reversed and the sender's balance restored. This action cannot be undone."
        confirmLabel="Mark as failed"
        variant="danger"
        onConfirm={() => failMutation.mutate()}
        loading={failMutation.isPending}
        disabled={processNotes.trim().length < 3}
      >
        <div>
          <label className="mb-1.5 block text-xs font-medium text-foreground">
            Reason <span className="text-danger-fg">*</span>
          </label>
          <Textarea
            value={processNotes}
            onChange={e => setProcessNotes(e.target.value)}
            placeholder="Why did this payment fail?…"
            rows={3}
          />
          <p className="mt-1 text-xs text-muted-fg">Minimum 3 characters required.</p>
        </div>
      </ConfirmDialog>

      {/* ── Back to top ───────────────────────────────────────────────────── */}
      {showBackToTop && (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="print:hidden fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface shadow-lg transition-all duration-200 hover:bg-surface-overlay hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
          aria-label="Back to top"
        >
          <svg className="h-4 w-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
          </svg>
        </button>
      )}
    </div>
  )
}
