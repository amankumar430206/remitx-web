import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format, parseISO, differenceInDays } from 'date-fns'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { ContentCard } from '@/layouts/ContentCard'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import {
  useScheduledPayments,
  useCancelScheduledPayment,
} from '@/hooks/useScheduledPayments'
import type { ScheduledPayment, ScheduleStatus } from '@/api/scheduledPayments'
import type { Column } from '@/components/ui/organisms/DataTable'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<ScheduleStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  active:    'success',
  cancelled: 'danger',
  completed: 'default',
}

const FREQUENCY_LABELS: Record<string, string> = {
  once:    'One-time',
  weekly:  'Weekly',
  monthly: 'Monthly',
}

const STATUS_CHIPS = [
  { value: '',           label: 'All'       },
  { value: 'active',     label: 'Active'    },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
]

// ─── Page (inner) ─────────────────────────────────────────────────────────────

function ScheduledPaymentsInner() {
  const navigate                        = useNavigate()
  const [statusFilter, setStatusFilter] = useState('')
  const [cancelId, setCancelId]         = useState<string | null>(null)

  const { data, isLoading, isError } = useScheduledPayments(
    statusFilter ? { status: statusFilter } : undefined
  )
  const cancelMutation = useCancelScheduledPayment()

  const rows = data?.data ?? []

  const columns: Column<ScheduledPayment>[] = [
    {
      key: 'scheduled_for',
      header: 'Next run',
      render: row => {
        const daysLeft = row.status === 'active'
          ? differenceInDays(parseISO(row.scheduled_for), new Date())
          : null
        return (
          <div className="flex items-center gap-2">
            {row.balance_insufficient && row.status === 'active' && (
              <span title="Insufficient balance" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-danger/15 text-danger-fg">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </span>
            )}
            <div>
              <span className="block text-sm tabular-nums">
                {row.status === 'active'
                  ? format(parseISO(row.scheduled_for), 'dd MMM yyyy, HH:mm')
                  : <span className="text-muted-fg italic">—</span>}
              </span>
              {daysLeft !== null && (
                <span className={`block text-xs tabular-nums ${daysLeft <= 1 ? 'text-danger-fg' : daysLeft <= 3 ? 'text-warning-fg' : 'text-muted-fg'}`}>
                  {daysLeft <= 0 ? 'Due today' : `${daysLeft}d away`}
                </span>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'source_currency',
      header: 'Amount',
      render: row => (
        <span className="font-mono text-sm font-semibold tabular-nums">
          {parseFloat(row.source_amount).toFixed(2)} {row.source_currency}
          <span className="text-muted-fg font-normal mx-1">→</span>
          {row.dest_currency}
        </span>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      render: row => (
        <span className="text-sm text-muted-fg">{FREQUENCY_LABELS[row.frequency] ?? row.frequency}</span>
      ),
    },
    {
      key: 'execution_count',
      header: 'Runs',
      render: row => (
        <span className="text-sm tabular-nums text-muted-fg">{row.execution_count}</span>
      ),
    },
    {
      key: 'last_executed_at',
      header: 'Last run',
      render: row => (
        <span className="text-xs text-muted-fg tabular-nums">
          {row.last_executed_at
            ? format(parseISO(row.last_executed_at), 'dd MMM yyyy')
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <div className="flex items-center gap-1.5">
          <Badge variant={STATUS_VARIANT[row.status] ?? 'default'}>
            {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
          </Badge>
          {row.balance_insufficient && row.status === 'active' && (
            <Badge variant="danger">Low balance</Badge>
          )}
        </div>
      ),
    },
    {
      key: 'id',
      header: '',
      render: row => (
        <div className="flex items-center justify-end gap-1">
          {row.status === 'active' && row.balance_insufficient && (
            <button
              onClick={e => { e.stopPropagation(); navigate(`/accounts/${row.account_id}`) }}
              className="rounded px-2 py-1 text-xs text-primary hover:bg-primary-subtle transition-colors"
            >
              Fund
            </button>
          )}
          {row.status === 'active' && (
            <button
              onClick={e => { e.stopPropagation(); setCancelId(row.id) }}
              className="rounded px-2 py-1 text-xs text-danger-fg hover:bg-danger/10 transition-colors"
            >
              Cancel
            </button>
          )}
          <svg className="h-4 w-4 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scheduled payments"
        description="One-time and recurring payments that execute automatically at the scheduled time."
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Scheduled payments' },
        ]}
        actions={
          <Link to="/payments/scheduled/new">
            <Button>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Schedule payment
            </Button>
          </Link>
        }
      />

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              statusFilter === chip.value
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <ContentCard padding="none">
          <LoadingState message="Loading scheduled payments…" />
        </ContentCard>
      ) : isError ? (
        <ContentCard padding="none">
          <ErrorState message="Could not load scheduled payments." />
        </ContentCard>
      ) : rows.length === 0 && !statusFilter ? (
        /* ── First-time / empty state guide ── */
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="flex flex-col items-center gap-2 border-b border-border bg-surface-raised/40 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-subtle text-primary">
              <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">No scheduled payments yet</p>
              <p className="mt-1 max-w-sm text-sm text-muted-fg">
                Automate recurring transfers — pay suppliers, salaries, or regular remittances without logging in each time.
              </p>
            </div>
            <Link to="/payments/scheduled/new" className="mt-2">
              <Button>
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Schedule your first payment
              </Button>
            </Link>
          </div>

          {/* How it works steps */}
          <div className="grid divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {[
              {
                step: '1',
                title: 'Choose a beneficiary & amount',
                body: 'Pick a saved beneficiary, select your source account and currencies, and enter the amount.',
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
              },
              {
                step: '2',
                title: 'Set frequency & date',
                body: 'Pick one-time, weekly, or monthly. Set the first run date and an optional end date for recurring.',
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
              {
                step: '3',
                title: 'We handle the rest',
                body: "The payment executes automatically at the scheduled time using a live FX rate. You'll be notified if your balance is low.",
                icon: (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
              },
            ].map(item => (
              <div key={item.step} className="flex flex-col gap-3 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-primary">
                    {item.icon}
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-muted-fg">Step {item.step}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="mt-0.5 text-xs text-muted-fg leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <ContentCard padding="none">
          <DataTable
            columns={columns}
            data={rows}
            getRowId={r => r.id}
            onRowClick={r => navigate(`/payments/scheduled/${r.id}`)}
            emptyTitle="No matching scheduled payments"
            emptyDescription="Try a different status filter."
          />
        </ContentCard>
      )}

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={open => { if (!open) setCancelId(null) }}
        title="Cancel scheduled payment"
        description="This scheduled payment will be cancelled and will no longer execute. This cannot be undone."
        confirmLabel="Cancel payment"
        variant="danger"
        onConfirm={() => {
          if (!cancelId) return
          cancelMutation.mutate(cancelId, { onSuccess: () => setCancelId(null) })
        }}
        loading={cancelMutation.isPending}
      />
    </div>
  )
}

// ─── Feature-gated export ─────────────────────────────────────────────────────

export function ScheduledPayments() {
  const enabled = useFeatureFlag('payment_scheduling')

  if (!enabled) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Scheduled payments"
          description="One-time and recurring payments that execute automatically at the scheduled time."
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Scheduled payments' },
          ]}
        />
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface py-20 text-center">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-muted-fg">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-foreground">Scheduled payments is disabled</p>
          <p className="mt-1 text-xs text-muted-fg">Enable it in Settings → Features to use this feature.</p>
        </div>
      </div>
    )
  }

  return <ScheduledPaymentsInner />
}
