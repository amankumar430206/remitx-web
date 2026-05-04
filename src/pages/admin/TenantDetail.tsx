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
import { Toggle } from '@/components/ui/atoms/Toggle'
import { ContentCard } from '@/layouts/ContentCard'
import { useAdminTenant, useUpdateAdminTenant, useSuspendTenant, useActivateTenant } from '@/hooks/useAdmin'

const schema = z.object({
  name: z.string().min(2),
  plan: z.string().min(1),
  maxPaymentAmount: z.string().min(1),
  kycEnabled: z.boolean(),
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
  const [suspendDialog, setSuspendDialog] = useState(false)

  const { data: tenant, isLoading, isError, refetch } = useAdminTenant(id ?? '')
  const updateMutation = useUpdateAdminTenant()
  const suspendMutation = useSuspendTenant()
  const activateMutation = useActivateTenant()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onEdit = () => {
    if (tenant) {
      reset({
        name: tenant.name,
        plan: tenant.plan,
        maxPaymentAmount: tenant.maxPaymentAmount,
        kycEnabled: tenant.kycEnabled,
      })
      setEditing(true)
    }
  }

  const onSave = (values: FormValues) => {
    if (!id) return
    updateMutation.mutate({ id, payload: values }, { onSuccess: () => setEditing(false) })
  }

  const onToggleStatus = () => {
    if (!id) return
    if (tenant?.status === 'active') suspendMutation.mutate(id)
    else activateMutation.mutate(id)
    setSuspendDialog(false)
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
                  onClick={() => setSuspendDialog(true)}
                  loading={suspendMutation.isPending || activateMutation.isPending}
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
          <div><span className="text-muted-fg">Slug</span><p className="font-mono text-xs mt-0.5">{tenant.slug}</p></div>
          <div><span className="text-muted-fg">Plan</span><p className="font-medium mt-0.5">{tenant.plan}</p></div>
          <div><span className="text-muted-fg">Users</span><p className="font-medium mt-0.5">{tenant.usersCount}</p></div>
          <div><span className="text-muted-fg">Payments</span><p className="font-medium mt-0.5">{tenant.paymentsCount}</p></div>
          <div><span className="text-muted-fg">Created</span><p className="font-medium mt-0.5">{new Date(tenant.createdAt).toLocaleDateString()}</p></div>
          <div><span className="text-muted-fg">KYC required</span><p className="font-medium mt-0.5">{tenant.kycEnabled ? 'Yes' : 'No'}</p></div>
        </div>
      </ContentCard>

      {editing && (
        <ContentCard>
          <form onSubmit={handleSubmit(onSave)}>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Edit configuration</h3>
              <FormField label="Name" error={errors.name?.message} required htmlFor="t-name">
                <Input id="t-name" {...register('name')} error={!!errors.name} />
              </FormField>
              <div className="grid grid-cols-2 gap-4">
                <FormField label="Plan" error={errors.plan?.message} required htmlFor="t-plan">
                  <Input id="t-plan" {...register('plan')} error={!!errors.plan} />
                </FormField>
                <FormField label="Max payment amount" error={errors.maxPaymentAmount?.message} required htmlFor="t-max">
                  <Input id="t-max" {...register('maxPaymentAmount')} className="font-mono" error={!!errors.maxPaymentAmount} />
                </FormField>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-foreground">KYC required</p>
                  <p className="text-xs text-muted-fg">Require identity verification before payments</p>
                </div>
                <Toggle checked={watch('kycEnabled')} onCheckedChange={v => setValue('kycEnabled', v)} />
              </div>
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
        open={suspendDialog}
        onOpenChange={setSuspendDialog}
        title={tenant.status === 'active' ? 'Suspend tenant' : 'Activate tenant'}
        description={
          tenant.status === 'active'
            ? `Suspend "${tenant.name}"? All users will lose access immediately.`
            : `Activate "${tenant.name}"? All users will regain access.`
        }
        confirmLabel={tenant.status === 'active' ? 'Suspend' : 'Activate'}
        variant={tenant.status === 'active' ? 'danger' : 'primary'}
        onConfirm={onToggleStatus}
        loading={suspendMutation.isPending || activateMutation.isPending}
      />
    </div>
  )
}
