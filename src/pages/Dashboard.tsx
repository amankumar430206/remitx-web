import { useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { format, parseISO, differenceInDays } from 'date-fns'
import { PageHeader, DataTable, StatusBadge, AmountDisplay, LoadingState, ErrorState } from '@/components/ui/index'
import { Button } from '@/components/ui/atoms/Button'
import { useAccounts } from '@/hooks/useAccounts'
import { usePayments } from '@/hooks/usePayments'
import { useBeneficiaries } from '@/hooks/useBeneficiaries'
import { useAuthStore } from '@/stores/authStore'
import { ContentCard } from '@/layouts/ContentCard'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'
import { useScheduledPayments, useCancelScheduledPayment } from '@/hooks/useScheduledPayments'
import type { ScheduledPayment } from '@/api/scheduledPayments'

const CURRENCY_GRADIENT: Record<string, { from: string; to: string; flag: string }> = {
  USD: { from: '#1d4ed8', to: '#1e3a8a', flag: '🇺🇸' },
  GBP: { from: '#6d28d9', to: '#4c1d95', flag: '🇬🇧' },
  EUR: { from: '#4338ca', to: '#312e81', flag: '🇪🇺' },
  AED: { from: '#065f46', to: '#064e3b', flag: '🇦🇪' },
  INR: { from: '#c2410c', to: '#7c2d12', flag: '🇮🇳' },
}
const currencyStyle = (c: string) => CURRENCY_GRADIENT[c] ?? { from: '#334155', to: '#1e293b', flag: '💱' }

const FREQ_LABELS: Record<string, string> = { once: 'One-time', weekly: 'Weekly', monthly: 'Monthly' }

// ─── Insufficient-funds alert banner ─────────────────────────────────────────

function InsufficientFundsAlert({ schedule }: { schedule: ScheduledPayment }) {
  const navigate    = useNavigate()
  const cancelMut   = useCancelScheduledPayment()
  const daysLeft    = differenceInDays(parseISO(schedule.scheduled_for), new Date())
  const daysDisplay = daysLeft <= 0 ? 'today' : `in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}`

  return (
    <div className="flex items-start gap-4 rounded-xl border border-danger/40 bg-danger/8 px-4 py-3">
      {/* Icon */}
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-danger/15">
        <svg className="h-4 w-4 text-danger-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-danger-fg">
          Insufficient funds — scheduled payment due {daysDisplay}
        </p>
        <p className="mt-0.5 text-xs text-danger-fg/70">
          {parseFloat(schedule.source_amount).toFixed(2)} {schedule.source_currency}
          {' → '}{schedule.dest_currency}
          {' · '}{FREQ_LABELS[schedule.frequency] ?? schedule.frequency}
          {' · '}{format(parseISO(schedule.scheduled_for), 'dd MMM yyyy, HH:mm')}
        </p>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        <Link to={`/payments/scheduled/${schedule.id}`}>
          <Button size="sm" variant="ghost" className="text-danger-fg hover:bg-danger/10">
            View details
          </Button>
        </Link>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/accounts/${schedule.account_id}`)}
          className="border-danger/40 text-danger-fg hover:bg-danger/10"
        >
          Fund account
        </Button>
        <Button
          size="sm"
          variant="ghost"
          loading={cancelMut.isPending}
          onClick={() => cancelMut.mutate(schedule.id)}
          className="text-danger-fg hover:bg-danger/10"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Next scheduled payment widget ───────────────────────────────────────────

function NextScheduledWidget({ schedule }: { schedule: ScheduledPayment }) {
  const daysLeft = differenceInDays(parseISO(schedule.scheduled_for), new Date())

  return (
    <Link to={`/payments/scheduled/${schedule.id}`} className="block group">
      <div className="flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-primary/40 hover:bg-primary-subtle">
        {/* Calendar icon */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-subtle text-primary">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-fg">Next scheduled payment</p>
          <p className="mt-0.5 text-sm font-semibold text-foreground tabular-nums">
            {parseFloat(schedule.source_amount).toFixed(2)} {schedule.source_currency}
            <span className="font-normal text-muted-fg mx-1">→</span>
            {schedule.dest_currency}
          </p>
          <p className="text-xs text-muted-fg">
            {format(parseISO(schedule.scheduled_for), 'dd MMM yyyy, HH:mm')}
            {' · '}
            {daysLeft <= 0 ? 'Due today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''} away`}
            {' · '}
            {FREQ_LABELS[schedule.frequency] ?? schedule.frequency}
          </p>
        </div>

        <svg className="h-4 w-4 shrink-0 text-muted-fg opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </Link>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const navigate         = useNavigate()
  const queryClient      = useQueryClient()
  const accessToken      = useAuthStore(s => s.accessToken)
  const user             = useAuthStore(s => s.user)
  const schedulingEnabled = useFeatureFlag('payment_scheduling')

  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: paymentsData, isLoading: loadingPayments, isError: paymentsError } = usePayments({ limit: 10 })
  const { data: beneficiariesData } = useBeneficiaries({ limit: 1 })
  const { data: scheduledData } = useScheduledPayments(
    schedulingEnabled ? { status: 'active' } : undefined
  )

  useEffect(() => {
    if (!accessToken) return
    let active = true
    const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:3000'
    const url = `${base}/api/v1/notifications/stream`
    const evtSource = new EventSource(`${url}?token=${encodeURIComponent(accessToken)}`)

    evtSource.onmessage = (e) => {
      if (!active) return
      try {
        const msg = JSON.parse(e.data)
        if (msg.type === 'payment.status_changed') {
          queryClient.invalidateQueries({ queryKey: ['payments'] })
          queryClient.invalidateQueries({ queryKey: ['accounts'] })
        }
        if (msg.type !== 'connected') {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
          if (msg.type === 'notification.new') {
            queryClient.invalidateQueries({ queryKey: ['scheduled-payments'] })
          }
        }
      } catch { /* ignore parse errors */ }
    }

    return () => { active = false; evtSource.close() }
  }, [accessToken, queryClient])

  const activeSchedules    = (scheduledData?.data ?? []).filter(s => s.status === 'active')
  const insufficientAlerts = schedulingEnabled
    ? activeSchedules.filter(s => s.balance_insufficient)
    : []
  // Payments due today or overdue (excluding already-flagged balance alerts)
  const dueToday = schedulingEnabled
    ? activeSchedules.filter(s => {
        const days = differenceInDays(parseISO(s.scheduled_for), new Date())
        return days <= 0
      })
    : []
  const nextScheduled = schedulingEnabled
    ? activeSchedules
        .filter(s => !s.balance_insufficient && differenceInDays(parseISO(s.scheduled_for), new Date()) > 0)
        .sort((a, b) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0]
    : null

  const totalBalance  = (accounts ?? []).reduce((sum, a) => sum + parseFloat(a.balance), 0)
  const pendingCount  = (paymentsData?.data ?? []).filter(p => p.status === 'pending_approval').length
  const greeting      = user?.first_name ? `Welcome back, ${user.first_name}.` : 'Welcome back.'

  const kycOk          = user?.kyc_status === 'approved'
  const hasAccounts    = (accounts?.length ?? 0) > 0
  const hasBeneficiaries = (beneficiariesData?.data?.length ?? 0) > 0
  const setupItems = [
    !kycOk && {
      key: 'kyc', label: 'Complete identity verification',
      description: 'Submit your KYC documents so your account can be fully activated.',
      href: '/kyc', cta: 'Start KYC',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
    accounts !== undefined && !hasAccounts && {
      key: 'accounts', label: 'Provision a payment account',
      description: 'Open at least one active account in your preferred currency.',
      href: '/accounts', cta: 'View accounts',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
        </svg>
      ),
    },
    beneficiariesData !== undefined && !hasBeneficiaries && {
      key: 'benes', label: 'Add your first beneficiary',
      description: "Save a recipient's bank details so you can send payments to them.",
      href: '/beneficiaries/new', cta: 'Add beneficiary',
      icon: (
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
    },
  ].filter(Boolean) as Array<{ key: string; label: string; description: string; href: string; cta: string; icon: React.ReactNode }>

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description={greeting}
        actions={
          <Button size="sm" onClick={() => navigate('/payments/new')}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Send payment
          </Button>
        }
      />

      {/* ── HIGH ALERT: insufficient funds on scheduled payments ── */}
      {insufficientAlerts.length > 0 && (
        <div className="flex flex-col gap-2">
          {insufficientAlerts.map(s => (
            <InsufficientFundsAlert key={s.id} schedule={s} />
          ))}
        </div>
      )}

      {/* ── Due today / overdue scheduled payments ── */}
      {dueToday.length > 0 && (
        <div className="rounded-xl border border-warning-fg/30 bg-warning/10 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-warning-fg/20 px-4 py-3">
            <svg className="h-4 w-4 text-warning-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm font-semibold text-warning-fg">
              {dueToday.length === 1 ? '1 payment due today' : `${dueToday.length} payments due today`}
            </p>
          </div>
          <div className="flex flex-col divide-y divide-warning-fg/10">
            {dueToday.map(s => {
              const days = differenceInDays(parseISO(s.scheduled_for), new Date())
              return (
                <Link
                  key={s.id}
                  to={`/payments/scheduled/${s.id}`}
                  className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-warning/15 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-warning/20 text-warning-fg">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground tabular-nums">
                        {parseFloat(s.source_amount).toFixed(2)} {s.source_currency}
                        <span className="font-normal text-muted-fg mx-1">→</span>
                        {s.dest_currency}
                      </p>
                      <p className="text-xs text-muted-fg">
                        {days < 0 ? `Overdue by ${Math.abs(days)}d` : 'Due today'}
                        {' · '}
                        {format(parseISO(s.scheduled_for), 'dd MMM yyyy, HH:mm')}
                      </p>
                    </div>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-muted-fg opacity-0 transition-opacity group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Account balance cards ── */}
      {loadingAccounts ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-surface border border-border" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Total balance hero card */}
          <div
            className="relative col-span-1 overflow-hidden rounded-2xl p-5 text-white shadow-lg sm:col-span-2 lg:col-span-1"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e3a8a 100%)' }}
          >
            <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/5" />
            <div className="pointer-events-none absolute -bottom-4 -left-4 h-20 w-20 rounded-full bg-white/5" />
            <div className="relative flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-white/60">Total balance</p>
              <p className="font-mono text-3xl font-extrabold tabular-nums tracking-tight text-white">
                {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(totalBalance)}
              </p>
              <p className="text-xs text-white/40">Across {accounts?.length ?? 0} account{(accounts?.length ?? 0) !== 1 ? 's' : ''}</p>
            </div>
          </div>

          {/* Per-currency cards */}
          {(accounts ?? []).slice(0, 3).map(a => {
            const cs = currencyStyle(a.currency)
            return (
              <button
                key={a.id}
                onClick={() => navigate(`/accounts/${a.id}`)}
                className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg transition-all duration-150 hover:-translate-y-0.5 hover:shadow-xl text-left group"
                style={{ background: `linear-gradient(135deg, ${cs.from} 0%, ${cs.to} 100%)` }}
              >
                <div className="pointer-events-none absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5" />
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-lg leading-none">{cs.flag}</span>
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-semibold text-white/80">{a.status}</span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/60">{a.currency} balance</p>
                    <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">
                      {new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(parseFloat(a.balance))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-white/50 opacity-0 transition-opacity group-hover:opacity-100">
                    <span>View ledger</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                    </svg>
                  </div>
                </div>
              </button>
            )
          })}

          {(accounts?.length ?? 0) < 3 && (
            <button
              onClick={() => navigate('/accounts')}
              className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface p-5 text-center transition-colors hover:border-primary/50 hover:bg-primary-subtle"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-subtle">
                <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-xs font-medium text-muted-fg">Open new account</p>
            </button>
          )}
        </div>
      )}

      {/* ── Quick stats strip ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: 'Active accounts',
            value: (accounts ?? []).filter(a => a.status === 'active').length,
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
              </svg>
            ),
          },
          {
            label: 'Pending approvals',
            value: pendingCount,
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ),
            onClick: pendingCount > 0 ? () => navigate('/payments/approval-queue') : undefined,
            highlight: pendingCount > 0,
          },
          {
            label: 'Payments today',
            value: (paymentsData?.data ?? []).filter(p => new Date(p.created_at).toDateString() === new Date().toDateString()).length,
            icon: (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75h4.875a2.625 2.625 0 010 5.25H12M8.25 9.75L10.5 7.5M8.25 9.75L10.5 12m9-7.243V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
            ),
          },
          {
            label: schedulingEnabled ? 'Scheduled' : 'Currencies',
            value: schedulingEnabled
              ? activeSchedules.length
              : new Set((accounts ?? []).map(a => a.currency)).size,
            icon: schedulingEnabled ? (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
              </svg>
            ),
            onClick: schedulingEnabled && activeSchedules.length > 0
              ? () => navigate('/payments/scheduled')
              : undefined,
          },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.onClick}
            disabled={!item.onClick}
            className={`group relative flex flex-col gap-2 rounded-xl border p-4 text-left transition-all ${
              item.onClick
                ? 'cursor-pointer border-border bg-surface hover:border-primary/40 hover:bg-primary-subtle hover:shadow-sm'
                : 'cursor-default border-border bg-surface'
            }`}
          >
            {item.onClick && (
              <span className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full transition-all group-hover:scale-110 ${item.highlight ? 'bg-warning/20 text-warning-fg' : 'bg-primary-subtle text-primary'}`}>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </span>
            )}
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.highlight ? 'bg-warning text-warning-fg' : 'bg-primary-subtle text-primary'}`}>
              {item.icon}
            </div>
            <div>
              <p className={`text-xl font-bold tabular-nums ${item.highlight ? 'text-warning-fg' : 'text-foreground'}`}>
                {loadingAccounts || loadingPayments ? '—' : item.value}
              </p>
              <p className="text-xs text-muted-fg">{item.label}</p>
            </div>
          </button>
        ))}
      </div>

      {/* ── Next scheduled payment ── */}
      {schedulingEnabled && nextScheduled && (
        <NextScheduledWidget schedule={nextScheduled} />
      )}

      {/* ── Setup checklist ── */}
      {setupItems.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border px-5 py-4">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Get started</h2>
              <p className="text-xs text-muted-fg">{setupItems.length} step{setupItems.length !== 1 ? 's' : ''} remaining before you can send payments</p>
            </div>
          </div>
          <div className="divide-y divide-border">
            {setupItems.map((item, idx) => (
              <div key={item.key} className="flex items-center gap-4 px-5 py-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-raised text-muted-fg">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-border text-[10px] font-bold text-muted-fg">{idx + 1}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-fg mt-0.5">{item.description}</p>
                </div>
                <Link to={item.href}>
                  <Button variant="outline" size="sm">{item.cta}</Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent payments ── */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Recent payments</h2>
            {paymentsData?.meta?.total !== undefined && (
              <p className="text-xs text-muted-fg">{paymentsData.meta.total} total</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => navigate('/payments/approval-queue')}>
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-warning text-xs font-bold text-warning-fg">{pendingCount}</span>
                Pending approval
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
                key: 'beneficiary', header: 'Recipient',
                render: p => (
                  <div>
                    <p className="text-sm font-semibold text-foreground">{p.beneficiary_name ?? '—'}</p>
                    <p className="text-xs text-muted-fg">{p.beneficiary_country_code}</p>
                  </div>
                ),
              },
              { key: 'amount', header: 'Amount', render: p => <AmountDisplay amount={p.source_amount} currency={p.source_currency} size="sm" /> },
              { key: 'fx', header: 'They receive', render: p => <AmountDisplay amount={p.dest_amount} currency={p.dest_currency} size="sm" /> },
              { key: 'status', header: 'Status', render: p => <StatusBadge status={p.status} /> },
              {
                key: 'created_at', header: 'Date',
                render: p => (
                  <div className="flex flex-col">
                    <span className="text-xs font-medium text-foreground">
                      {new Date(p.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    <span className="text-xs text-muted-fg">
                      {new Date(p.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ),
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
