import { useState } from 'react'
import { getApiError } from '@/lib/apiError'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { ContentCard } from '@/layouts/ContentCard'
import {
  useAdminTenant,
  useUpdateAdminTenant,
  useSetTenantStatus,
  useTenantUsers,
  useProviderConfig,
  useUpdateProviderConfig,
} from '@/hooks/useAdmin'
import type { TenantUser, CorridorConfig } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const schema = z.object({
  name: z.string().min(2),
})
type FormValues = z.infer<typeof schema>

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
  inactive: 'default',
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  client_admin: 'Client admin',
  maker: 'Maker',
  checker: 'Checker',
  viewer: 'Viewer',
}

const userColumns: Column<TenantUser>[] = [
  {
    key: 'email',
    header: 'User',
    render: row => (
      <div>
        <p className="text-sm font-medium text-foreground">
          {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-xs text-muted-fg">{row.email}</p>
      </div>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    render: row => (
      <span className="inline-flex items-center rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-medium text-primary">
        {ROLE_LABEL[row.role] ?? row.role}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: row => (
      <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">{row.status}</Badge>
    ),
  },
  {
    key: 'kyc_status',
    header: 'KYC',
    render: row => row.kyc_status ? (
      <Badge variant={row.kyc_status === 'approved' ? 'success' : row.kyc_status === 'rejected' ? 'danger' : 'warning'} className="capitalize">
        {row.kyc_status}
      </Badge>
    ) : <span className="text-xs text-muted-fg">—</span>,
  },
  {
    key: 'created_at',
    header: 'Joined',
    render: row => new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  },
]

const corridorColumns: Column<CorridorConfig>[] = [
  {
    key: 'source_currency',
    header: 'Source',
    render: row => <span className="font-mono text-xs font-semibold text-foreground">{row.source_currency}</span>,
  },
  {
    key: 'dest_currency',
    header: 'Destination',
    render: row => (
      <span className="font-mono text-xs font-semibold text-foreground">
        {row.dest_currency ?? <span className="text-muted-fg">Any</span>}
      </span>
    ),
  },
  {
    key: 'provider_name',
    header: 'Provider',
    render: row => (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-mono text-foreground">
        {row.provider_name}
      </span>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    render: row => <span className="text-xs tabular-nums text-muted-fg">{row.priority}</span>,
  },
  {
    key: 'is_active',
    header: 'Active',
    render: row => (
      <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Yes' : 'No'}</Badge>
    ),
  },
]

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const [editing, setEditing] = useState(false)
  const [statusDialog, setStatusDialog] = useState(false)

  const { data: tenant, isLoading, isError, refetch } = useAdminTenant(id ?? '')
  const { data: users, isLoading: loadingUsers } = useTenantUsers(id ?? '')
  const { data: corridors, isLoading: loadingCorridors } = useProviderConfig(id ?? '')
  const updateMutation = useUpdateAdminTenant()
  const setStatusMutation = useSetTenantStatus()
  const updateProvidersMutation = useUpdateProviderConfig()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onEdit = () => {
    if (tenant) {
      reset({ name: tenant.name })
      setEditing(true)
    }
  }

  const onSave = (values: FormValues) => {
    if (!id) return
    updateMutation.mutate({ id, name: values.name }, { onSuccess: () => setEditing(false) })
  }

  const onToggleStatus = () => {
    if (!id || !tenant) return
    const next = tenant.status === 'active' ? 'suspended' : 'active'
    setStatusMutation.mutate({ id, status: next }, { onSuccess: () => setStatusDialog(false) })
  }

  if (isLoading) return <LoadingState message="Loading tenant…" />
  if (isError || !tenant) return <ErrorState title="Tenant not found" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PageHeader
        title={tenant.name}
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: tenant.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
                <Button
                  variant={tenant.status === 'active' ? 'danger' : 'outline'}
                  size="sm"
                  onClick={() => setStatusDialog(true)}
                  loading={setStatusMutation.isPending}
                >
                  {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            )}
          </div>
        }
      />

      {/* ── Overview ── */}
      <ContentCard>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          <Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'} className="capitalize">{tenant.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-xs text-muted-fg">Name</span>
            <p className="font-medium mt-0.5 text-foreground">{tenant.name}</p>
          </div>
          <div>
            <span className="text-xs text-muted-fg">Slug</span>
            <p className="font-mono text-xs mt-0.5 text-foreground">{tenant.slug}</p>
          </div>
          <div>
            <span className="text-xs text-muted-fg">Created</span>
            <p className="font-medium mt-0.5 text-foreground">
              {new Date(tenant.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </ContentCard>

      {/* ── Edit form ── */}
      {editing && (
        <ContentCard>
          <form onSubmit={handleSubmit(onSave)}>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Edit tenant</h3>
              <FormField label="Name" error={errors.name?.message} required htmlFor="t-name">
                <Input id="t-name" {...register('name')} error={!!errors.name} />
              </FormField>
              {updateMutation.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {getApiError(updateMutation.error, 'Could not save changes. Please try again.')}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>Save changes</Button>
              </div>
            </div>
          </form>
        </ContentCard>
      )}

      {/* ── Users ── */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Users</h3>
            {users && (
              <p className="text-xs text-muted-fg">{users.length} member{users.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {loadingUsers ? (
          <LoadingState message="Loading users…" />
        ) : (
          <DataTable
            columns={userColumns}
            data={users ?? []}
            getRowId={row => row.id}
            emptyTitle="No users yet"
            emptyDescription="Users will appear here once they accept an invite."
          />
        )}
      </ContentCard>

      {/* ── Provider config ── */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Payment corridors</h3>
            <p className="text-xs text-muted-fg">Provider routing rules for this tenant</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={updateProvidersMutation.isPending}
            onClick={() => {
              if (!id || !corridors) return
              updateProvidersMutation.mutate({
                tenantId: id,
                corridors: corridors.map(c => ({
                  sourceCurrency: c.source_currency,
                  ...(c.dest_currency ? { destCurrency: c.dest_currency } : {}),
                  providerName: c.provider_name,
                  priority: c.priority,
                })),
              })
            }}
          >
            Refresh
          </Button>
        </div>
        {loadingCorridors ? (
          <LoadingState message="Loading corridors…" />
        ) : !corridors?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border">
              <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-sm text-muted-fg">No corridors configured</p>
            <p className="text-xs text-muted-fg">This tenant uses the default provider for all corridors.</p>
          </div>
        ) : (
          <DataTable
            columns={corridorColumns}
            data={corridors}
            getRowId={row => row.id}
            emptyTitle="No corridors"
          />
        )}
      </ContentCard>

      <ConfirmDialog
        open={statusDialog}
        onOpenChange={setStatusDialog}
        title={tenant.status === 'active' ? 'Suspend tenant' : 'Activate tenant'}
        description={
          tenant.status === 'active'
            ? `Suspend "${tenant.name}"? All users will lose access immediately.`
            : `Activate "${tenant.name}"? All users will regain access.`
        }
        confirmLabel={tenant.status === 'active' ? 'Suspend' : 'Activate'}
        variant={tenant.status === 'active' ? 'danger' : 'primary'}
        onConfirm={onToggleStatus}
        loading={setStatusMutation.isPending}
      />
    </div>
  )
}
