import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FilterBar } from '@/components/ui/organisms/FilterBar'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useAdminTenants } from '@/hooks/useAdmin'
import type { AdminTenant } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
}

const columns: Column<AdminTenant>[] = [
  { key: 'name', header: 'Name' },
  { key: 'slug', header: 'Slug', render: row => <span className="font-mono text-xs">{row.slug}</span> },
  { key: 'plan', header: 'Plan', render: row => <Badge variant="secondary" className="capitalize">{row.plan}</Badge> },
  {
    key: 'status',
    header: 'Status',
    render: row => <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">{row.status}</Badge>,
  },
  { key: 'usersCount', header: 'Users', render: row => String(row.usersCount) },
  { key: 'paymentsCount', header: 'Payments', render: row => String(row.paymentsCount) },
  { key: 'createdAt', header: 'Created', render: row => new Date(row.createdAt).toLocaleDateString() },
]

export function TenantList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading } = useAdminTenants({ page, limit: 20, status: status || undefined })
  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenants"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Tenants' }]}
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tenants…"
        filters={
          <Select
            value={status}
            onValueChange={setStatus}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        }
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          getRowId={row => row.id}
          onRowClick={row => navigate(`/admin/tenants/${row.id}`)}
          emptyTitle="No tenants"
        />
      </ContentCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-fg">
          <span>{total} tenants</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      )}
    </div>
  )
}
