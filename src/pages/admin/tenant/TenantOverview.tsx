import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { FormField } from '@/components/ui/molecules/FormField'
import { ContentCard } from '@/layouts/ContentCard'
import { getApiError } from '@/lib/apiError'
import { useUpdateAdminTenant } from '@/hooks/useAdmin'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { AdminTenant } from '@/api/admin'

const schema = z.object({ name: z.string().min(2) })
type FormValues = z.infer<typeof schema>

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
  inactive: 'default',
}

interface Props {
  tenant: AdminTenant
  editing: boolean
  onEdit: () => void
  onCancelEdit: () => void
}

export function TenantOverview({ tenant, editing, onEdit, onCancelEdit }: Props) {
  const updateMutation = useUpdateAdminTenant()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: tenant.name },
  })

  const onSave = (values: FormValues) => {
    updateMutation.mutate(
      { id: tenant.id, name: values.name },
      { onSuccess: () => onCancelEdit() },
    )
  }

  const handleEdit = () => {
    reset({ name: tenant.name })
    onEdit()
  }

  return (
    <>
      <ContentCard>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          <Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'} className="capitalize">
            {tenant.status}
          </Badge>
          {!editing && (
            <Button variant="outline" size="sm" className="ml-auto" onClick={handleEdit}>
              Edit
            </Button>
          )}
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
              {new Date(tenant.created_at).toLocaleDateString('en-GB', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
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
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {getApiError(updateMutation.error, 'Could not save changes. Please try again.')}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={onCancelEdit}>Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>Save changes</Button>
              </div>
            </div>
          </form>
        </ContentCard>
      )}
    </>
  )
}
