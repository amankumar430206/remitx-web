import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { useAuthStore } from '@/stores/authStore'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import type { StatusChipOption, ActiveFilterChip } from '@/components/ui/organisms/SmartFilterBar'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Pagination } from '@/components/ui/atoms/Pagination'
import { ContentCard } from '@/layouts/ContentCard'
import { Drawer } from '@/components/ui/molecules/Drawer'
import { usePayments, usePayment } from '@/hooks/usePayments'
import { useAdminTenants } from '@/hooks/useAdmin'
import { useDebounce } from '@/hooks/useDebounce'
import type { Payment } from '@/api/payments'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'


type Preset = '7d' | '30d' | '3m' | '6m' | 'custom'

const PRESETS: { label: string; value: Preset }[] = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '3 months', value: '3m' },
  { label: '6 months', value: '6m' },
]

function presetToRange(preset: Preset): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)
  if (preset === '7d') startDate.setDate(today.getDate() - 6)
  else if (preset === '30d') startDate.setDate(today.getDate() - 29)
  else if (preset === '3m') startDate.setMonth(today.getMonth() - 3)
  else if (preset === '6m') startDate.setMonth(today.getMonth() - 6)
  return { startDate, endDate: today }
}

const STATUS_CHIPS: StatusChipOption[] = [
  { label: 'All',        value: '',                variant: 'none'    },
  { label: 'Pending',    value: 'pending_approval', variant: 'warning' },
  { label: 'Processing', value: 'processing',       variant: 'primary' },
  { label: 'Approved',   value: 'approved',         variant: 'success' },
  { label: 'Completed',  value: 'completed',        variant: 'success' },
  { label: 'Rejected',   value: 'rejected',         variant: 'danger'  },
  { label: 'Failed',     value: 'failed',           variant: 'danger'  },
  { label: 'Cancelled',  value: 'cancelled',        variant: 'default' },
]

const DIRECTION_CHIPS: StatusChipOption[] = [
  { label: 'All',    value: '',       variant: 'none'    },
  { label: 'Debit',  value: 'debit',  variant: 'danger'  },
  { label: 'Credit', value: 'credit', variant: 'success' },
]

function DirectionBadge({ direction }: { direction: 'debit' | 'credit' }) {
  return direction === 'debit' ? (
    <span className="inline-flex items-center gap-1 rounded-full bg-danger/10 border border-danger/20 px-2 py-0.5 text-[11px] font-semibold text-danger-fg">
      <span className="text-[9px]">▼</span> Debit
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full bg-success/10 border border-success/20 px-2 py-0.5 text-[11px] font-semibold text-success-fg">
      <span className="text-[9px]">▲</span> Credit
    </span>
  )
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Detail panel (right side of SplitPane) ──────────────────────────────────

function PaymentQuickView({ id, onOpenFull }: { id: string; onOpenFull: () => void }) {
  const { data: payment, isLoading } = usePayment(id)

  if (isLoading) return <LoadingState message="Loading payment…" />
  if (!payment) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center py-3 border-b border-border">
        <p className="text-2xl font-bold text-foreground">
          <AmountDisplay amount={payment.source_amount} currency={payment.source_currency} size="lg" />
        </p>
        <p className="text-sm text-muted-fg mt-1">
          → <AmountDisplay amount={payment.dest_amount} currency={payment.dest_currency} />
        </p>
        <div className="mt-2 flex justify-center">
          <StatusBadge status={payment.status} />
        </div>
      </div>

      <DetailRow label="Recipient" value={payment.beneficiary_name ?? '—'} />
      <DetailRow label="Country" value={payment.beneficiary_country_code ?? '—'} />
      <DetailRow label="Exchange rate" value={`1 ${payment.source_currency} = ${parseFloat(payment.exchange_rate).toFixed(4)} ${payment.dest_currency}`} />
      <DetailRow label="Fee" value={<AmountDisplay amount={payment.fee_amount} currency={payment.source_currency} />} />
      <DetailRow label="Purpose" value={payment.purpose_code} />
      {payment.reference && <DetailRow label="Reference" value={payment.reference} />}
      <DetailRow label="Submitted" value={new Date(payment.created_at).toLocaleString()} />
      {payment.completed_at && <DetailRow label="Completed" value={new Date(payment.completed_at).toLocaleString()} />}

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
  const isSuperAdmin = useAuthStore(s => s.user?.role === 'super_admin')
  const isAdmin = useAuthStore(s => s.user?.role === 'admin' || s.user?.role === 'super_admin')

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [direction, setDirection] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [preset, setPreset] = useState<Preset>('30d')
  const [dateRange, setDateRange] = useState<DateRange>(() => presetToRange('30d'))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedTenantId, setSelectedTenantId] = useState<string>('')

  const { data: tenantsList } = useAdminTenants()
  const tenants = isSuperAdmin ? (tenantsList ?? []) : []

  const handlePreset = (p: Preset) => { setPreset(p); setDateRange(presetToRange(p)); setPage(1) }
  const handleCustomRange = (range: DateRange) => {
    if (range.startDate) { setPreset('custom'); setDateRange(range); setPage(1) }
  }

  const { data, isLoading, isError } = usePayments({
    page,
    limit: 20,
    status: status || undefined,
    direction: isSuperAdmin ? undefined : (direction || undefined),
    search: debouncedSearch || undefined,
    from: dateRange.startDate ? dateRange.startDate.toISOString().slice(0, 10) : undefined,
    to: dateRange.endDate ? dateRange.endDate.toISOString().slice(0, 10) : undefined,
    tenantId: isSuperAdmin ? (selectedTenantId || undefined) : undefined,
  })

  const payments = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const columns = [
    ...(isSuperAdmin ? [{
      key: 'tenant',
      header: 'Client',
      render: (p: Payment) => (
        <span className="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted-fg">
          {p.tenant_name ?? p.tenant_slug ?? '—'}
        </span>
      ),
    }] : [{
      key: 'direction',
      header: 'Type',
      render: (_p: Payment) => <DirectionBadge direction="debit" />,
    }]),
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
      key: 'status',
      header: 'Status',
      render: (p: Payment) => <StatusBadge status={p.status} />,
    },
    {
      key: 'date',
      header: 'Date',
      render: (p: Payment) => (
        <span className="text-xs text-muted-fg">{new Date(p.created_at).toLocaleDateString()}</span>
      ),
    },
  ]

  const clearAll = () => { setStatus(''); setDirection(''); setSearch(''); setSelectedTenantId(''); handlePreset('30d'); setPage(1) }

  const activeChips = useMemo<ActiveFilterChip[]>(() => [
    ...(status ? [{
      key: 'status',
      label: STATUS_CHIPS.find(c => c.value === status)?.label ?? status,
      onRemove: () => { setStatus(''); setPage(1) },
    }] : []),
    ...(direction ? [{
      key: 'direction',
      label: direction.charAt(0).toUpperCase() + direction.slice(1),
      onRemove: () => { setDirection(''); setPage(1) },
    }] : []),
    ...(selectedTenantId ? [{
      key: 'tenant',
      label: tenants.find(t => t.id === selectedTenantId)?.name ?? selectedTenantId,
      onRemove: () => { setSelectedTenantId(''); setPage(1) },
    }] : []),
    ...(preset !== '30d' ? [{
      key: 'date',
      label: preset === 'custom' && dateRange.startDate && dateRange.endDate
        ? `${fmtDate(dateRange.startDate)} → ${fmtDate(dateRange.endDate)}`
        : PRESETS.find(p => p.value === preset)?.label ?? preset,
      onRemove: () => { handlePreset('30d') },
    }] : []),
    ...(search ? [{
      key: 'search',
      label: `"${search}"`,
      onRemove: () => { setSearch(''); setPage(1) },
    }] : []),
  ], [status, direction, selectedTenantId, tenants, preset, dateRange, search])

  const list = (
    <div className="flex flex-col gap-3">
      <SmartFilterBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search recipient, reference…"
        presets={PRESETS}
        activePreset={preset}
        onPresetChange={p => handlePreset(p as Preset)}
        dateRange={dateRange}
        onCustomRange={handleCustomRange}
        statusChips={STATUS_CHIPS}
        activeStatus={status}
        onStatusChange={v => { setStatus(v); setPage(1) }}
        advancedFilters={
          <div className="flex flex-col gap-3">
            {isSuperAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-fg">Client</label>
                <select
                  value={selectedTenantId}
                  onChange={e => { setSelectedTenantId(e.target.value); setPage(1) }}
                  className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">All clients</option>
                  {tenants.map(t => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
            )}
            {!isSuperAdmin && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-muted-fg">Type</label>
                <div className="flex gap-1.5">
                  {DIRECTION_CHIPS.map(chip => (
                    <button
                      key={chip.value}
                      type="button"
                      onClick={() => { setDirection(chip.value); setPage(1) }}
                      className={[
                        'px-3 py-1.5 rounded-md text-xs font-medium border transition-colors',
                        direction === chip.value
                          ? chip.value === 'debit'
                            ? 'bg-danger/10 border-danger/30 text-danger-fg'
                            : chip.value === 'credit'
                            ? 'bg-success/10 border-success/30 text-success-fg'
                            : 'bg-primary text-primary-fg border-primary'
                          : 'bg-surface border-border text-muted-fg hover:text-foreground hover:border-border-strong',
                      ].join(' ')}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        }
        activeAdvancedCount={(direction ? 1 : 0) + (selectedTenantId ? 1 : 0)}
        activeChips={activeChips}
        onClearAll={activeChips.length > 0 ? clearAll : undefined}
      />

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

            <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onChange={setPage} />
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
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link to="/admin/manual-payments">
                <Button variant="outline">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                  Manual requests
                </Button>
              </Link>
            )}
            {isSuperAdmin && (
              <Link to="/admin/payments/on-behalf">
                <Button variant="outline">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Pay on behalf
                </Button>
              </Link>
            )}
            <Button onClick={() => navigate('/payments/new')}>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Send payment
            </Button>
          </div>
        }
      />

      {list}

      <Drawer
        open={!!selectedId}
        onClose={() => setSelectedId(null)}
        title="Payment details"
      >
        {selectedId && (
          <PaymentQuickView
            id={selectedId}
            onOpenFull={() => navigate(`/payments/${selectedId}`)}
          />
        )}
      </Drawer>
    </div>
  )
}
