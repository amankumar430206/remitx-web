import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import type { StatusChipOption, ActiveFilterChip } from '@/components/ui/organisms/SmartFilterBar'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Pagination } from '@/components/ui/atoms/Pagination'
import { ContentCard } from '@/layouts/ContentCard'
import { Drawer } from '@/components/ui/molecules/Drawer'
import { useBeneficiaries } from '@/hooks/useBeneficiaries'
import type { Beneficiary } from '@/api/beneficiaries'

const SCREENING_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  cleared: 'success',
  pending: 'warning',
  flagged: 'danger',
}

const STATUS_CHIPS: StatusChipOption[] = [
  { label: 'All',     value: '',        variant: 'none'    },
  { label: 'Cleared', value: 'cleared', variant: 'success' },
  { label: 'Pending', value: 'pending', variant: 'warning' },
  { label: 'Flagged', value: 'flagged', variant: 'danger'  },
]

function accountDisplay(b: Beneficiary): string {
  const raw = b.iban ?? b.account_number ?? ''
  return raw.length >= 4 ? `••••${raw.slice(-4)}` : raw
}

function BeneficiaryQuickView({ beneficiary, onNavigate }: {
  beneficiary: Beneficiary
  onNavigate: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xl font-bold text-foreground">{beneficiary.name}</p>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={SCREENING_VARIANT[beneficiary.screening_status] ?? 'default'} className="capitalize">
            {beneficiary.screening_status}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-0 text-sm">
        <div className="flex justify-between py-2.5 border-b border-border">
          <span className="text-muted-fg">Country</span>
          <span className="font-medium text-foreground">{beneficiary.country_code}</span>
        </div>
        <div className="flex justify-between py-2.5 border-b border-border">
          <span className="text-muted-fg">Currency</span>
          <span className="font-medium text-foreground">{beneficiary.currency}</span>
        </div>
        {beneficiary.bank_name && (
          <div className="flex justify-between py-2.5 border-b border-border">
            <span className="text-muted-fg">Bank</span>
            <span className="font-medium text-foreground text-right">{beneficiary.bank_name}</span>
          </div>
        )}
        <div className="flex justify-between py-2.5 border-b border-border">
          <span className="text-muted-fg">{beneficiary.iban ? 'IBAN' : 'Account'}</span>
          <span className="font-mono text-xs font-medium text-foreground">{accountDisplay(beneficiary)}</span>
        </div>
        {beneficiary.swift_bic && (
          <div className="flex justify-between py-2.5 border-b border-border">
            <span className="text-muted-fg">SWIFT/BIC</span>
            <span className="font-mono text-xs font-medium text-foreground">{beneficiary.swift_bic}</span>
          </div>
        )}
        <div className="flex justify-between py-2.5">
          <span className="text-muted-fg">Added</span>
          <span className="text-foreground">{new Date(beneficiary.created_at).toLocaleDateString()}</span>
        </div>
      </div>

      <Button size="sm" className="w-full mt-2" onClick={onNavigate}>View full details</Button>
    </div>
  )
}

export function BeneficiaryList() {
  const navigate = useNavigate()
  const [page, setPage]             = useState(1)
  const [search, setSearch]         = useState('')
  const [screening, setScreening]   = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data, isLoading, isError, refetch } = useBeneficiaries({ page, search: search || undefined })
  const beneficiaries = data?.data ?? []
  const total      = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  // Screening status filter is client-side (not supported by API)
  const filtered = screening
    ? beneficiaries.filter(b => b.screening_status === screening)
    : beneficiaries

  const selected = selectedId ? beneficiaries.find(b => b.id === selectedId) ?? null : null

  const clearAll = () => { setSearch(''); setScreening(''); setPage(1) }

  const activeChips = useMemo<ActiveFilterChip[]>(() => [
    ...(screening ? [{
      key: 'screening',
      label: STATUS_CHIPS.find(c => c.value === screening)?.label ?? screening,
      onRemove: () => setScreening(''),
    }] : []),
    ...(search ? [{
      key: 'search',
      label: `"${search}"`,
      onRemove: () => { setSearch(''); setPage(1) },
    }] : []),
  ], [screening, search])

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (b: Beneficiary) => (
        <p className="font-medium text-foreground">{b.name}</p>
      ),
    },
    {
      key: 'country',
      header: 'Country / Currency',
      render: (b: Beneficiary) => (
        <div>
          <p className="text-sm text-foreground">{b.country_code}</p>
          <p className="text-xs text-muted-fg">{b.currency}</p>
        </div>
      ),
    },
    {
      key: 'bank',
      header: 'Bank',
      render: (b: Beneficiary) => (
        <span className="text-sm text-foreground">{b.bank_name ?? '—'}</span>
      ),
    },
    {
      key: 'account',
      header: 'Account',
      render: (b: Beneficiary) => (
        <span className="font-mono text-xs text-muted-fg">{accountDisplay(b)}</span>
      ),
    },
    {
      key: 'screening_status',
      header: 'Screening',
      render: (b: Beneficiary) => (
        <Badge variant={SCREENING_VARIANT[b.screening_status] ?? 'default'} className="capitalize">
          {b.screening_status}
        </Badge>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading beneficiaries…" />
  if (isError) return <ErrorState title="Could not load beneficiaries" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Beneficiaries"
        breadcrumbs={[{ label: 'Beneficiaries' }]}
        actions={
          <Button size="sm" onClick={() => navigate('/beneficiaries/new')}>
            Add beneficiary
          </Button>
        }
      />

      <SmartFilterBar
        search={search}
        onSearchChange={v => { setSearch(v); setPage(1) }}
        searchPlaceholder="Search by name, bank…"
        statusChips={STATUS_CHIPS}
        activeStatus={screening}
        onStatusChange={v => setScreening(v)}
        activeChips={activeChips}
        onClearAll={activeChips.length > 0 ? clearAll : undefined}
      />

      {filtered.length === 0 ? (
        <ContentCard>
          <div className="py-12 text-center">
            <svg className="mx-auto h-10 w-10 text-muted-fg/40 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm font-medium text-foreground">
              {search || screening ? 'No beneficiaries found' : 'No beneficiaries yet'}
            </p>
            <p className="mt-1 text-xs text-muted-fg">
              {search || screening ? 'Try adjusting your filters.' : 'Add a recipient to start sending payments.'}
            </p>
            {!search && !screening && (
              <Button size="sm" className="mt-4" onClick={() => navigate('/beneficiaries/new')}>
                Add your first beneficiary
              </Button>
            )}
          </div>
        </ContentCard>
      ) : (
        <ContentCard padding="none">
          <DataTable
            columns={columns}
            data={filtered}
            getRowId={b => b.id}
            onRowClick={b => setSelectedId(prev => prev === b.id ? null : b.id)}
            emptyTitle="No beneficiaries found"
            emptyDescription="Try adjusting your search."
          />
          <Pagination page={page} totalPages={totalPages} total={total} pageSize={20} onChange={setPage} />
        </ContentCard>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelectedId(null)}
        title="Beneficiary details"
      >
        {selected && (
          <BeneficiaryQuickView
            beneficiary={selected}
            onNavigate={() => navigate(`/beneficiaries/${selected.id}`)}
          />
        )}
      </Drawer>
    </div>
  )
}
