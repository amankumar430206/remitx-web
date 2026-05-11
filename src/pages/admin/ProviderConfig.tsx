import { useState } from 'react'
import { getApiError } from '@/lib/apiError'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { EmptyState } from '@/components/ui/molecules/EmptyState'
import { FormField } from '@/components/ui/molecules/FormField'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useProviderConfig, useUpdateProviderConfig } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import type { CorridorConfig } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const PROVIDERS = ['manual', 'zoqq', 'cloudcurrency']

const corridorSchema = z.object({
  sourceCurrency: z.string().length(3, 'Must be 3-letter currency code').toUpperCase(),
  destCurrency: z.string().length(3, 'Must be 3-letter currency code').toUpperCase().or(z.literal('')).optional(),
  providerName: z.string().min(1, 'Select a provider'),
  priority: z.coerce.number().int().min(1).optional(),
})

type CorridorForm = z.infer<typeof corridorSchema>

export function ProviderConfig() {
  const tenantId = useAuthStore(s => s.user?.tenant_id ?? '')
  const [addOpen, setAddOpen] = useState(false)

  const { data: corridors, isLoading, isError, refetch } = useProviderConfig(tenantId)
  const updateMutation = useUpdateProviderConfig()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CorridorForm>({
    resolver: zodResolver(corridorSchema),
    defaultValues: { priority: 1, providerName: 'manual' },
  })

  const onAddCorridor = (values: CorridorForm) => {
    const existing = (corridors ?? []).map(c => ({
      sourceCurrency: c.source_currency,
      destCurrency: c.dest_currency ?? undefined,
      providerName: c.provider_name,
      priority: c.priority,
    }))
    const newCorridor = {
      sourceCurrency: values.sourceCurrency.toUpperCase(),
      destCurrency: values.destCurrency?.toUpperCase() || undefined,
      providerName: values.providerName,
      priority: values.priority ?? 1,
    }
    updateMutation.mutate(
      { tenantId, corridors: [...existing, newCorridor] },
      { onSuccess: () => { setAddOpen(false); reset() } },
    )
  }

  const onRemove = (corridor: CorridorConfig) => {
    const remaining = (corridors ?? [])
      .filter(c => c.id !== corridor.id)
      .map(c => ({
        sourceCurrency: c.source_currency,
        destCurrency: c.dest_currency ?? undefined,
        providerName: c.provider_name,
        priority: c.priority,
      }))
    updateMutation.mutate({ tenantId, corridors: remaining })
  }

  const columns: Column<CorridorConfig>[] = [
    {
      key: 'source_currency',
      header: 'From',
      render: row => <span className="font-mono font-semibold text-sm">{row.source_currency}</span>,
    },
    {
      key: 'dest_currency',
      header: 'To',
      render: row => (
        <span className="font-mono text-sm">
          {row.dest_currency ?? <span className="text-muted-fg italic">any</span>}
        </span>
      ),
    },
    {
      key: 'provider_name',
      header: 'Provider',
      render: row => <Badge variant="secondary" className="capitalize">{row.provider_name}</Badge>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: row => <span className="text-sm text-muted-fg">{row.priority}</span>,
    },
    {
      key: 'is_active',
      header: 'Active',
      render: row => row.is_active
        ? <Badge variant="success">Active</Badge>
        : <Badge variant="default">Inactive</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: row => (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger-fg hover:text-danger-fg"
          onClick={e => { e.stopPropagation(); onRemove(row) }}
          loading={updateMutation.isPending}
        >
          Remove
        </Button>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading provider config…" />
  if (isError) return <ErrorState title="Could not load configuration" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Provider configuration"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Providers' }]}
        actions={
          <Button onClick={() => setAddOpen(true)}>Add corridor</Button>
        }
      />

      <ContentCard padding="none">
        {(corridors ?? []).length === 0 ? (
          <EmptyState
            title="No corridors configured"
            description="Add a corridor to route payments through a specific provider."
          />
        ) : (
          <DataTable
            columns={columns}
            data={corridors ?? []}
            getRowId={c => c.id}
          />
        )}
      </ContentCard>

      {updateMutation.isError && (
        <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
          {getApiError(updateMutation.error, 'Could not save configuration. Please try again.')}
        </div>
      )}

      {/* Add corridor dialog */}
      <ConfirmDialog
        open={addOpen}
        onOpenChange={open => { if (!open) { setAddOpen(false); reset() } }}
        title="Add payment corridor"
        description="Define which provider handles a currency corridor. Leave destination empty for a wildcard (any currency from source)."
        confirmLabel="Add corridor"
        onConfirm={handleSubmit(onAddCorridor)}
        loading={updateMutation.isPending}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Source currency" htmlFor="sourceCurrency" error={errors.sourceCurrency?.message} required>
            <Input id="sourceCurrency" placeholder="USD" {...register('sourceCurrency')} error={!!errors.sourceCurrency} />
          </FormField>
          <FormField label="Destination currency" htmlFor="destCurrency" error={errors.destCurrency?.message}>
            <Input id="destCurrency" placeholder="GBP (leave blank for wildcard)" {...register('destCurrency')} error={!!errors.destCurrency} />
          </FormField>
          <FormField label="Provider" htmlFor="providerName" error={errors.providerName?.message} required>
            <Select id="providerName" {...register('providerName')} error={!!errors.providerName}>
              {PROVIDERS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Priority" htmlFor="priority" error={errors.priority?.message}>
            <Input id="priority" type="number" min={1} {...register('priority')} error={!!errors.priority} className="w-24" />
          </FormField>
        </div>
      </ConfirmDialog>
    </div>
  )
}
