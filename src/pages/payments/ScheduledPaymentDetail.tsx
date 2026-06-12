import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { format, parseISO, differenceInDays } from 'date-fns'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { ContentCard } from '@/layouts/ContentCard'
import { useAuthStore } from '@/stores/authStore'
import { getApiError } from '@/lib/apiError'
import {
  useScheduledPayment,
  useCancelScheduledPayment,
  useSkipScheduledPayment,
  useExecuteScheduledPayment,
} from '@/hooks/useScheduledPayments'
import type { ScheduledPayment } from '@/api/scheduledPayments'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FREQ_LABELS: Record<string, string> = { once: 'One-time', weekly: 'Weekly', monthly: 'Monthly' }
const PURPOSE_LABELS: Record<string, string> = {
  TRADE: 'Trade / Goods', SUPPLIER: 'Supplier Payment', SALARY: 'Salary / Wages',
  SERVICES: 'Services', CONTRACTOR: 'Contractor', OTHER: 'Other',
}

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-fg shrink-0">{label}</span>
      <span className={`text-sm font-medium text-foreground text-right ${mono ? 'font-mono text-xs' : ''}`}>
        {value}
      </span>
    </div>
  )
}

function StatusChip({ schedule }: { schedule: ScheduledPayment }) {
  const daysLeft = schedule.status === 'active'
    ? differenceInDays(parseISO(schedule.scheduled_for), new Date())
    : null
  const isOverdue = daysLeft !== null && daysLeft < 0
  const isDueToday = daysLeft !== null && daysLeft === 0

  if (schedule.status === 'cancelled') return <Badge variant="danger">Cancelled</Badge>
  if (schedule.status === 'completed') return <Badge variant="default">Completed</Badge>
  if (isOverdue || isDueToday) return <Badge variant="warning">Due {isDueToday ? 'today' : 'overdue'}</Badge>
  if (schedule.balance_insufficient) return <Badge variant="danger">Insufficient funds</Badge>
  return <Badge variant="success">Active</Badge>
}

// ─── Action panel ─────────────────────────────────────────────────────────────

function ActionPanel({ schedule }: { schedule: ScheduledPayment }) {
  const navigate   = useNavigate()
  const user       = useAuthStore(s => s.user)
  const canExecute = ['super_admin', 'client_admin'].includes(user?.role ?? '')
  const isOwner    = user?.sub === schedule.user_id || canExecute

  const executeMut = useExecuteScheduledPayment()
  const skipMut    = useSkipScheduledPayment()
  const cancelMut  = useCancelScheduledPayment()

  const [confirmAction, setConfirmAction] = useState<'cancel' | 'skip' | 'execute' | null>(null)
  const [actionError, setActionError]     = useState('')

  if (schedule.status !== 'active') return null

  const daysLeft = differenceInDays(parseISO(schedule.scheduled_for), new Date())
  const isDue    = daysLeft <= 0

  const handleExecute = () => {
    setActionError('')
    executeMut.mutate(schedule.id, {
      onSuccess: (data) => navigate(`/payments/${data.payment.id}`),
      onError: (err) => setActionError(getApiError(err, 'Execution failed.')),
    })
  }

  const handleSkip = () => {
    setActionError('')
    skipMut.mutate(schedule.id, {
      onError: (err) => setActionError(getApiError(err, 'Skip failed.')),
    })
  }

  const handleCancel = () => {
    setActionError('')
    cancelMut.mutate(schedule.id, {
      onSuccess: () => navigate('/payments/scheduled'),
      onError: (err) => setActionError(getApiError(err, 'Cancel failed.')),
    })
  }

  return (
    <ContentCard>
      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-fg">Actions</p>

      <div className="flex flex-col gap-3">
        {/* Fund account — shown when balance is low */}
        {schedule.balance_insufficient && (
          <Link to={`/accounts/${schedule.account_id}`}>
            <Button variant="outline" className="w-full justify-start gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold">Fund account</p>
                <p className="text-xs text-muted-fg">Top up your source account to ensure this payment executes</p>
              </div>
            </Button>
          </Link>
        )}

        {/* Execute now — admins or when payment is due */}
        {(isDue || canExecute) && (
          <button
            onClick={() => setConfirmAction('execute')}
            className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/8 px-4 py-3 text-left hover:bg-success/12 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-success/20 text-success-fg">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-success-fg">Execute now</p>
              <p className="text-xs text-muted-fg">Trigger this payment immediately using a live FX rate</p>
            </div>
          </button>
        )}

        {/* Skip this time — recurring only */}
        {schedule.frequency !== 'once' && isOwner && (
          <button
            onClick={() => setConfirmAction('skip')}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left hover:border-primary/40 hover:bg-primary-subtle transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-raised text-muted-fg">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061A1.125 1.125 0 013 16.811V8.69zM12.75 8.689c0-.864.933-1.406 1.683-.977l7.108 4.061a1.125 1.125 0 010 1.954l-7.108 4.061a1.125 1.125 0 01-1.683-.977V8.69z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Skip this occurrence</p>
              <p className="text-xs text-muted-fg">
                Advance to the next {schedule.frequency === 'weekly' ? 'week' : 'month'} without executing
              </p>
            </div>
          </button>
        )}

        {/* Cancel schedule */}
        {isOwner && (
          <button
            onClick={() => setConfirmAction('cancel')}
            className="flex items-center gap-3 rounded-xl border border-danger/20 bg-surface px-4 py-3 text-left hover:bg-danger/5 transition-colors"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-danger/10 text-danger-fg">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-danger-fg">Cancel schedule</p>
              <p className="text-xs text-muted-fg">Permanently stop this scheduled payment</p>
            </div>
          </button>
        )}

        {actionError && (
          <p className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger-fg">
            {actionError}
          </p>
        )}
      </div>

      {/* Execute confirm */}
      <ConfirmDialog
        open={confirmAction === 'execute'}
        onOpenChange={open => { if (!open) setConfirmAction(null) }}
        title="Execute payment now?"
        description={`This will immediately send ${parseFloat(schedule.source_amount).toFixed(2)} ${schedule.source_currency} using the current live FX rate. The payment will follow the normal approval workflow.`}
        confirmLabel="Execute now"
        variant="default"
        onConfirm={handleExecute}
        loading={executeMut.isPending}
      />

      {/* Skip confirm */}
      <ConfirmDialog
        open={confirmAction === 'skip'}
        onOpenChange={open => { if (!open) setConfirmAction(null) }}
        title="Skip this occurrence?"
        description={`The current scheduled date will be skipped. The next run date will advance by one ${schedule.frequency === 'weekly' ? 'week' : 'month'}.`}
        confirmLabel="Skip this time"
        variant="default"
        onConfirm={handleSkip}
        loading={skipMut.isPending}
      />

      {/* Cancel confirm */}
      <ConfirmDialog
        open={confirmAction === 'cancel'}
        onOpenChange={open => { if (!open) setConfirmAction(null) }}
        title="Cancel this scheduled payment?"
        description="This will permanently stop the schedule. It cannot be reactivated."
        confirmLabel="Cancel schedule"
        variant="danger"
        onConfirm={handleCancel}
        loading={cancelMut.isPending}
      />
    </ContentCard>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ScheduledPaymentDetail() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: schedule, isLoading, isError, error } = useScheduledPayment(id!)

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto">
        <LoadingState message="Loading scheduled payment…" />
      </div>
    )
  }

  if (isError || !schedule) {
    return (
      <div className="max-w-lg mx-auto">
        <ErrorState
          title="Scheduled payment not found"
          message={getApiError(error, 'This scheduled payment could not be loaded.')}
        />
      </div>
    )
  }

  const daysLeft    = schedule.status === 'active'
    ? differenceInDays(parseISO(schedule.scheduled_for), new Date())
    : null
  const isOverdue   = daysLeft !== null && daysLeft < 0
  const isDueToday  = daysLeft !== null && daysLeft === 0

  const amountLabel = `${parseFloat(schedule.source_amount).toFixed(2)} ${schedule.source_currency} → ${schedule.dest_currency}`

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <PageHeader
        title="Scheduled payment"
        description={amountLabel}
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Scheduled payments', href: '/payments/scheduled' },
          { label: amountLabel },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/payments/scheduled')}>
            Back
          </Button>
        }
      />

      {/* ── Due today / overdue banner ── */}
      {(isDueToday || isOverdue) && schedule.status === 'active' && (
        <div className="flex items-start gap-3 rounded-xl border border-warning-fg/40 bg-warning/15 px-4 py-3.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-warning-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-warning-fg">
            {isOverdue
              ? 'This payment is overdue — it may still be executing, or balance was insufficient at the scheduled time.'
              : 'This payment is due today. Use "Execute now" below to trigger it immediately.'}
          </p>
        </div>
      )}

      {/* ── Insufficient funds banner ── */}
      {schedule.balance_insufficient && schedule.status === 'active' && (
        <div className="flex items-start gap-3 rounded-xl border border-danger/30 bg-danger/8 px-4 py-3.5">
          <svg className="mt-0.5 h-4 w-4 shrink-0 text-danger-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <p className="text-sm text-danger-fg">
            Account balance is insufficient for this payment. Fund your account or cancel the schedule.
          </p>
        </div>
      )}

      {/* ── Summary card ── */}
      <ContentCard>
        {/* Status header */}
        <div className="flex items-center justify-between pb-4 mb-1 border-b border-border">
          <div>
            <p className="text-xl font-bold tabular-nums text-foreground">
              {parseFloat(schedule.source_amount).toFixed(2)} {schedule.source_currency}
            </p>
            <p className="text-sm text-muted-fg mt-0.5">→ {schedule.dest_currency}</p>
          </div>
          <StatusChip schedule={schedule} />
        </div>

        <InfoRow label="Frequency" value={FREQ_LABELS[schedule.frequency] ?? schedule.frequency} />
        <InfoRow
          label={schedule.frequency === 'once' ? 'Scheduled for' : 'Next run'}
          value={
            schedule.status === 'active'
              ? <span className={isOverdue || isDueToday ? 'text-warning-fg' : ''}>
                  {format(parseISO(schedule.scheduled_for), 'dd MMM yyyy, HH:mm')}
                  {daysLeft !== null && daysLeft >= 0 && daysLeft <= 7 && (
                    <span className="ml-1.5 text-xs text-muted-fg">
                      ({daysLeft === 0 ? 'today' : `${daysLeft}d`})
                    </span>
                  )}
                </span>
              : <span className="text-muted-fg">—</span>
          }
        />
        {schedule.end_date && (
          <InfoRow label="End date" value={format(parseISO(schedule.end_date), 'dd MMM yyyy')} />
        )}
        <InfoRow label="Purpose" value={PURPOSE_LABELS[schedule.purpose_code] ?? schedule.purpose_code} />
        {schedule.note && <InfoRow label="Note" value={schedule.note} />}
      </ContentCard>

      {/* ── Execution history ── */}
      <ContentCard>
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-muted-fg">Execution history</p>
        <InfoRow label="Total runs" value={schedule.execution_count} />
        <InfoRow
          label="Last executed"
          value={schedule.last_executed_at
            ? format(parseISO(schedule.last_executed_at), 'dd MMM yyyy, HH:mm')
            : 'Never'}
        />
        {schedule.last_payment_id && (
          <InfoRow
            label="Last payment"
            value={
              <Link
                to={`/payments/${schedule.last_payment_id}`}
                className="text-primary hover:underline text-xs font-mono"
              >
                View payment →
              </Link>
            }
          />
        )}
        <InfoRow label="Created" value={format(parseISO(schedule.created_at), 'dd MMM yyyy, HH:mm')} />
      </ContentCard>

      {/* ── Actions ── */}
      <ActionPanel schedule={schedule} />
    </div>
  )
}
