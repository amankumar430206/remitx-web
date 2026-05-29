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

  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search)
  const [preset, setPreset] = useState<Preset>('30d')
  const [dateRange, setDateRange] = useState<DateRange>(() => presetToRange('30d'))
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const handlePreset = (p: Preset) => { setPreset(p); setDateRange(presetToRange(p)); setPage(1) }
  const handleCustomRange = (range: DateRange) => {
    if (range.startDate) { setPreset('custom'); setDateRange(range); setPage(1) }
  }

  const { data, isLoading, isError } = usePayments({
    page,
    limit: 20,
    status: status || undefined,
    search: debouncedSearch || undefined,
    from: dateRange.startDate ? dateRange.startDate.toISOString().slice(0, 10) : undefined,
    to: dateRange.endDate ? dateRange.endDate.toISOString().slice(0, 10) : undefined,
  })

  const payments = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

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

  const clearAll = () => { setStatus(''); setSearch(''); handlePreset('30d'); setPage(1) }

  const activeChips = useMemo<ActiveFilterChip[]>(() => [
    ...(status ? [{
      key: 'status',
      label: STATUS_CHIPS.find(c => c.value === status)?.label ?? status,
      onRemove: () => { setStatus(''); setPage(1) },
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
  ], [status, preset, dateRange, search])

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
