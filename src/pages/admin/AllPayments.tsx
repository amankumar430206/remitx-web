import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { Badge } from '@/components/ui/atoms/Badge'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useAllAdminPayments } from '@/hooks/useAdmin'
import { useAdminTenants } from '@/hooks/useAdmin'
import type { AllPayment } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'
import type { StatusChipOption } from '@/components/ui/organisms/SmartFilterBar'

const PROVIDERS = ['manual', 'zoqq', 'cloudcurrency']

const STATUS_CHIPS: StatusChipOption[] = [
  { label: 'All', value: '', variant: 'none' },
  { label: 'Completed', value: 'completed', variant: 'success' },
  { label: 'Pending approval', value: 'pending_approval', variant: 'warning' },
  { label: 'Processing', value: 'processing', variant: 'primary' },
  { label: 'Pending manual', value: 'pending_manual_processing', variant: 'warning' },
  { label: 'Failed', value: 'failed', variant: 'danger' },
]

const PAGE_SIZE = 20

export function AllPayments() {
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const [tenantId, setTenantId] = useState('')
  const [providerName, setProviderName] = useState('')

  const { data: tenantsData } = useAdminTenants()
  const { data, isLoading } = useAllAdminPayments({
    page,
    limit: PAGE_SIZE,
    tenantId: tenantId || undefined,
    status: status || undefined,
    providerName: providerName || undefined,
  })

  const payments = data?.data ?? []
  const meta = data?.meta

  const activeChips = [
    status     && { key: 'status',   label: `Status: ${status.replace(/_/g, ' ')}`, onRemove: () => { setStatus('');     setPage(1) } },
    tenantId   && { key: 'tenant',   label: `Tenant: ${tenantsData?.find(t => t.id === tenantId)?.name ?? tenantId}`, onRemove: () => { setTenantId('');   setPage(1) } },
    providerName && { key: 'provider', label: `Provider: ${providerName}`,           onRemove: () => { setProviderName(''); setPage(1) } },
  ].filter(Boolean) as { key: string; label: string; onRemove: () => void }[]

  const advancedFilterCount = [tenantId, providerName].filter(Boolean).length

  const columns: Column<AllPayment>[] = [
    {
      key: 'reference',
      header: 'Reference',
      render: row => <span className="font-mono text-xs text-foreground">{row.reference}</span>,
    },
    {
      key: 'tenant_name',
      header: 'Client',
      render: row => (
        <span className="text-sm text-foreground">{row.tenant_name ?? row.tenant_slug ?? '—'}</span>
      ),
    },
    {
      key: 'source_amount',
      header: 'Amount',
      render: row => (
        <span className="text-sm font-medium text-foreground tabular-nums">
          {Number(row.source_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
          <span className="text-muted-fg font-mono text-xs">{row.source_currency}</span>
          {row.dest_currency !== row.source_currency && (
            <span className="ml-1 text-muted-fg text-xs">→ {row.dest_currency}</span>
          )}
        </span>
      ),
    },
    {
      key: 'provider_name',
      header: 'Provider',
      render: row => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-mono text-foreground">
          {row.provider_name ?? 'manual'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: row => (
        <span className="text-xs text-muted-fg tabular-nums">
          {new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="All payments"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Payments' }]}
      />

      <SmartFilterBar
        statusChips={STATUS_CHIPS}
        activeStatus={status}
        onStatusChange={v => { setStatus(v); setPage(1) }}
        advancedFilters={
          <div className="flex flex-wrap items-end gap-4">
            {/* Tenant filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-fg">Client</label>
              <select
                value={tenantId}
                onChange={e => { setTenantId(e.target.value); setPage(1) }}
                className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
              >
                <option value="">All clients</option>
                {(tenantsData ?? []).map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Provider filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-muted-fg">Provider</label>
              <select
                value={providerName}
                onChange={e => { setProviderName(e.target.value); setPage(1) }}
                className="h-8 rounded-md border border-border bg-surface px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
              >
                <option value="">All providers</option>
                {PROVIDERS.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
        }
        activeAdvancedCount={advancedFilterCount}
        activeChips={activeChips}
        onClearAll={() => { setStatus(''); setTenantId(''); setProviderName(''); setPage(1) }}
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={payments}
          loading={isLoading}
          getRowId={row => row.id}
          onRowClick={row => navigate(`/payments/${row.id}`)}
          emptyTitle="No payments found"
          emptyDescription="Try adjusting the filters."
        />

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-5 py-3">
            <p className="text-xs text-muted-fg">
              {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, meta.total)} of {meta.total} payments
            </p>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="h-7 w-7 flex items-center justify-center rounded border border-border text-muted-fg hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-xs text-muted-fg tabular-nums px-1">
                {page} / {meta.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage(p => p + 1)}
                className="h-7 w-7 flex items-center justify-center rounded border border-border text-muted-fg hover:bg-surface-raised disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </ContentCard>
    </div>
  )
}
