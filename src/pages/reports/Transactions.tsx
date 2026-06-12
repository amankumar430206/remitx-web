import { useState, useMemo } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import type { StatusChipOption, ActiveFilterChip } from '@/components/ui/organisms/SmartFilterBar'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { AmountDisplay } from '@/components/ui/molecules/AmountDisplay'
import { Button } from '@/components/ui/atoms/Button'
import { Pagination } from '@/components/ui/atoms/Pagination'
import { ContentCard } from '@/layouts/ContentCard'
import { useTransactions } from '@/hooks/useReports'
import { useAdminTenants } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import { useDebounce } from '@/hooks/useDebounce'
import reportsApi from '@/api/reports'
import { toLocalDateStr } from '@/lib/utils'
import type { DateRange } from '@/components/ui/molecules/DateRangePicker'
import type { Column } from '@/components/ui/organisms/DataTable'
import type { TransactionRow } from '@/api/reports'

type Preset = '7d' | '30d' | '3m' | '6m' | 'ytd' | 'custom'

const PRESETS: { label: string; value: Preset }[] = [
  { label: '7 days',      value: '7d'  },
  { label: '30 days',     value: '30d' },
  { label: '3 months',    value: '3m'  },
  { label: '6 months',    value: '6m'  },
  { label: 'Year to date', value: 'ytd' },
]

const STATUS_CHIPS: StatusChipOption[] = [
  { label: 'All',        value: '',                 variant: 'none'    },
  { label: 'Pending',    value: 'pending_approval', variant: 'warning' },
  { label: 'Processing', value: 'processing',       variant: 'primary' },
  { label: 'Approved',   value: 'approved',         variant: 'success' },
  { label: 'Completed',  value: 'completed',        variant: 'success' },
  { label: 'Rejected',   value: 'rejected',         variant: 'danger'  },
  { label: 'Failed',     value: 'failed',           variant: 'danger'  },
  { label: 'Cancelled',  value: 'cancelled',        variant: 'default' },
]

const DIRECTION_CHIPS: StatusChipOption[] = [
  { label: 'All',    value: '',       variant: 'none'   },
  { label: 'Debit',  value: 'debit',  variant: 'danger' },
  { label: 'Credit', value: 'credit', variant: 'success'},
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'AED', 'INR', 'SGD', 'CAD', 'AUD', 'CHF', 'HKD', 'NGN', 'KES']

function presetToRange(preset: Preset): DateRange {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const startDate = new Date(today)

  if (preset === '7d')  startDate.setDate(today.getDate() - 6)
  else if (preset === '30d') startDate.setDate(today.getDate() - 29)
  else if (preset === '3m')  startDate.setMonth(today.getMonth() - 3)
  else if (preset === '6m')  startDate.setMonth(today.getMonth() - 6)
  else if (preset === 'ytd') startDate.setMonth(0, 1)

  return { startDate, endDate: today }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const columns: Column<TransactionRow>[] = [
  {
    key: 'reference',
    header: 'Reference',
    render: row => (
      <span className="font-mono text-xs font-semibold text-foreground tracking-wide">
        {row.reference ?? '—'}
      </span>
    ),
  },
  {
    key: 'created_at',
    header: 'Date',
    render: row => (
      <div className="flex flex-col gap-0.5">
        <span className="text-xs text-foreground">{new Date(row.created_at).toLocaleDateString()}</span>
        {row.completed_at && (
          <span className="text-[10px] text-muted-fg">
            Settled {new Date(row.completed_at).toLocaleDateString()}
          </span>
        )}
      </div>
    ),
  },
  {
    key: 'beneficiary_id',
    header: 'Beneficiary',
    render: row => row.beneficiary_name ? (
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">{row.beneficiary_name}</span>
        {row.beneficiary_country && (
          <span className="text-[10px] text-muted-fg uppercase tracking-wide">{row.beneficiary_country}</span>
        )}
      </div>
    ) : (
      <span className="text-xs text-muted-fg">—</span>
    ),
  },
  {
    key: 'source_amount',
    header: 'You sent',
    render: row => <AmountDisplay amount={row.source_amount} currency={row.source_currency} negative />,
  },
  {
    key: 'dest_amount',
    header: 'Recipient got',
    render: row => <AmountDisplay amount={row.dest_amount} currency={row.dest_currency} positive />,
  },
  {
    key: 'exchange_rate',
    header: 'Rate',
    render: row => (
      <span className="font-mono text-xs text-muted-fg tabular-nums">
        {parseFloat(row.exchange_rate).toFixed(4)}
      </span>
    ),
  },
  {
    key: 'fee_amount',
    header: 'Fee',
    render: row => (
      <span className="font-mono text-xs tabular-nums text-foreground">
        {parseFloat(row.fee_amount) === 0
          ? <span className="text-muted-fg">Free</span>
          : <AmountDisplay amount={row.fee_amount} currency={row.source_currency} />}
      </span>
    ),
  },
  {
    key: 'purpose_code',
    header: 'Purpose',
    render: row => (
      <span className="capitalize text-xs text-muted-fg">
        {row.purpose_code?.toLowerCase().replace(/_/g, ' ') ?? '—'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: row => <StatusBadge status={row.status} />,
  },
]

export function Transactions() {
  const user = useAuthStore(s => s.user)
  const isSuperAdmin = user?.role === 'super_admin'

  const [page, setPage]                     = useState(1)
  const [preset, setPreset]                 = useState<Preset>('30d')
  const [dateRange, setDateRange]           = useState<DateRange>(() => presetToRange('30d'))
  const [status, setStatus]                 = useState('')
  const [direction, setDirection]           = useState('')
  const [currency, setCurrency]             = useState('')
  const [selectedTenantId, setSelectedTenantId] = useState('')
  const [search, setSearch]                 = useState('')
  const debouncedSearch                     = useDebounce(search)
  const [exporting, setExporting]           = useState(false)

  const { data: tenantsList } = useAdminTenants()
  const tenants = isSuperAdmin ? (tenantsList ?? []) : []

  const handlePreset = (p: Preset) => {
    setPreset(p)
    setDateRange(presetToRange(p))
    setPage(1)
  }

  const handleCustomRange = (range: DateRange) => {
    if (range.startDate) { setPreset('custom'); setDateRange(range); setPage(1) }
  }

  const clearAll = () => {
    setSearch('')
    setStatus('')
    setDirection('')
    setCurrency('')
    setSelectedTenantId('')
    handlePreset('30d')
  }

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
      onRemove: () => handlePreset('30d'),
    }] : []),
    ...(currency ? [{
      key: 'currency',
      label: currency.toUpperCase(),
      onRemove: () => { setCurrency(''); setPage(1) },
    }] : []),
    ...(search ? [{
      key: 'search',
      label: `"${search}"`,
      onRemove: () => setSearch(''),
    }] : []),
  ], [status, direction, currency, selectedTenantId, tenants, preset, dateRange, search])

  const params = {
    page,
    limit: 20,
    search: debouncedSearch || undefined,
    status: status || undefined,
    direction: (direction as 'debit' | 'credit') || undefined,
    currency: currency || undefined,
    tenantId: isSuperAdmin ? (selectedTenantId || undefined) : undefined,
    from: dateRange.startDate ? toLocalDateStr(dateRange.startDate) : undefined,
    to: dateRange.endDate ? toLocalDateStr(dateRange.endDate) : undefined,
  }

  const { data, isLoading } = useTransactions(params)
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)


  const handleExport = async (format: 'csv' | 'pdf') => {
    setExporting(true)
    try {
      const { page: _page, limit: _limit, ...exportParams } = params
      const res = await reportsApi.transactionsExport({ ...exportParams, format })
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions.${format}`
      a.click()
      window.URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Transaction report"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Transactions' }]}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" loading={exporting} onClick={() => handleExport('csv')}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" loading={exporting} onClick={() => handleExport('pdf')}>
              Export PDF
            </Button>
          </div>
        }
      />

      <SmartFilterBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search transactions…"
        presets={PRESETS}
        activePreset={preset}
        onPresetChange={p => handlePreset(p as Preset)}
        dateRange={preset === 'custom' ? dateRange : undefined}
        onCustomRange={handleCustomRange}
        statusChips={STATUS_CHIPS}
        activeStatus={status}
        onStatusChange={v => { setStatus(v); setPage(1) }}
        advancedFilters={
          <div className="flex flex-col gap-4">
            {isSuperAdmin && (
              <div className="flex flex-col gap-1.5">
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
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-fg">Type</label>
              <div className="flex gap-1.5">
                {DIRECTION_CHIPS.map(chip => (
                  <button
                    key={chip.value}
                    type="button"
                    onClick={() => { setDirection(chip.value); setPage(1) }}
                    className={[
                      'h-7 px-3 rounded-full text-xs font-semibold border transition-all',
                      direction === chip.value
                        ? chip.value === 'debit'
                          ? 'bg-danger/10 border-danger/30 text-danger-fg'
                          : chip.value === 'credit'
                          ? 'bg-success/10 border-success/30 text-success-fg'
                          : 'bg-primary text-primary-fg border-primary'
                        : 'bg-transparent border-border text-muted-fg hover:border-border-strong hover:text-foreground',
                    ].join(' ')}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-fg">Currency</label>
              <div className="flex flex-wrap gap-1.5">
                {CURRENCIES.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => { setCurrency(prev => prev === c ? '' : c); setPage(1) }}
                    className={[
                      'h-7 px-3 rounded-full text-xs font-semibold border transition-all font-mono',
                      currency === c
                        ? 'bg-primary text-primary-fg border-primary'
                        : 'bg-transparent border-border text-muted-fg hover:border-border-strong hover:text-foreground',
                    ].join(' ')}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </div>
        }
        activeAdvancedCount={(direction ? 1 : 0) + (currency ? 1 : 0) + (selectedTenantId ? 1 : 0)}
        activeChips={activeChips}
        onClearAll={activeChips.length > 0 ? clearAll : undefined}
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          emptyTitle="No transactions found"
        />
      </ContentCard>

      <ContentCard padding="none">
        <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onChange={setPage} />
      </ContentCard>
    </div>
  )
}
