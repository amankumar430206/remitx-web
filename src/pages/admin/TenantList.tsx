import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FilterBar } from '@/components/ui/organisms/FilterBar'
import { Badge } from '@/components/ui/atoms/Badge'
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
  {
    key: 'status',
    header: 'Status',
    render: row => <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">{row.status}</Badge>,
  },
  { key: 'created_at', header: 'Created', render: row => new Date(row.created_at).toLocaleDateString() },
]

export function TenantList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  const { data, isLoading } = useAdminTenants()

  const filtered = (data ?? []).filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !status || t.status === status
    return matchesSearch && matchesStatus
  })

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
          data={filtered}
          loading={isLoading}
          getRowId={row => row.id}
          onRowClick={row => navigate(`/admin/tenants/${row.id}`)}
          emptyTitle="No tenants"
        />
      </ContentCard>
    </div>
  )
}
