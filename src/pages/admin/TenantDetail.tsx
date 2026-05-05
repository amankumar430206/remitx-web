import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { ContentCard } from '@/layouts/ContentCard'
import { useAdminTenant, useUpdateAdminTenant, useSetTenantStatus } from '@/hooks/useAdmin'

const schema = z.object({
  name: z.string().min(2),
})

type FormValues = z.infer<typeof schema>

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning'> = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
}

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const [editing, setEditing] = useState(false)
  const [statusDialog, setStatusDialog] = useState(false)

  const { data: tenant, isLoading, isError, refetch } = useAdminTenant(id ?? '')
  const updateMutation = useUpdateAdminTenant()
  const setStatusMutation = useSetTenantStatus()

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
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
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

      <ContentCard>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Tenant overview</h3>
          <Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'} className="capitalize">{tenant.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <div><span className="text-muted-fg">Name</span><p className="font-medium mt-0.5">{tenant.name}</p></div>
          <div><span className="text-muted-fg">Slug</span><p className="font-mono text-xs mt-0.5">{tenant.slug}</p></div>
          <div><span className="text-muted-fg">Created</span><p className="font-medium mt-0.5">{new Date(tenant.created_at).toLocaleDateString()}</p></div>
        </div>
      </ContentCard>

      {editing && (
        <ContentCard>
          <form onSubmit={handleSubmit(onSave)}>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Edit tenant</h3>
              <FormField label="Name" error={errors.name?.message} required htmlFor="t-name">
                <Input id="t-name" {...register('name')} error={!!errors.name} />
              </FormField>
              {updateMutation.isError && (
                <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                  Could not save changes. Please try again.
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
