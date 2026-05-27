import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Button } from '@/components/ui/atoms/Button'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { useAdminTenant, useSetTenantStatus } from '@/hooks/useAdmin'
import { TenantOverview } from './tenant/TenantOverview'
import { TenantContact } from './tenant/TenantContact'
import { TenantUsers } from './tenant/TenantUsers'
import { TenantCorridors } from './tenant/TenantCorridors'
import { TenantFeeRules } from './tenant/TenantFeeRules'

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const [editing, setEditing] = useState(false)
  const [statusDialog, setStatusDialog] = useState(false)

  const { data: tenant, isLoading, isError, refetch } = useAdminTenant(id ?? '')
  const setStatusMutation = useSetTenantStatus()

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
              <Button
                variant={tenant.status === 'active' ? 'danger' : 'outline'}
                size="sm"
                onClick={() => setStatusDialog(true)}
                loading={setStatusMutation.isPending}
              >
                {tenant.status === 'active' ? 'Suspend' : 'Activate'}
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            )}
          </div>
        }
      />

      <TenantOverview
        tenant={tenant}
        editing={editing}
        onEdit={() => setEditing(true)}
        onCancelEdit={() => setEditing(false)}
      />

      <TenantContact tenantId={tenant.id} />

      <TenantUsers tenantId={tenant.id} />

      <TenantCorridors tenantId={tenant.id} />

      <TenantFeeRules tenantId={tenant.id} />

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
