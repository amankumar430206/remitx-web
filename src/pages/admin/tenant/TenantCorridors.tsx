import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { cn } from '@/lib/utils'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { FormField } from '@/components/ui/molecules/FormField'
import { ContentCard } from '@/layouts/ContentCard'
import { useProviderConfig, useAddTenantCorridor, useDeleteTenantCorridor, useSetTenantDefaultProvider } from '@/hooks/useAdmin'
import type { CorridorConfig } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const PROVIDERS = ['manual', 'zoqq', 'cloudcurrency']

const corridorSchema = z.object({
  sourceCurrency: z
    .string()
    .transform(v => v.toUpperCase())
    .refine(v => v === '' || v.length === 3, { message: 'Must be 3-letter code or blank' })
    .optional(),
  destCurrency: z
    .string()
    .transform(v => v.toUpperCase())
    .refine(v => v === '' || v.length === 3, { message: 'Must be 3-letter code or blank' })
    .optional(),
  providerName: z.string().min(1, 'Select a provider'),
  priority: z.coerce.number().int().min(1).optional(),
})

type CorridorForm = z.infer<typeof corridorSchema>

interface Props {
  tenantId: string
}

export function TenantCorridors({ tenantId }: Props) {
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CorridorConfig | null>(null)
  const [defaultProvider, setDefaultProvider] = useState<string>('')
  const [defaultSaved, setDefaultSaved] = useState(false)

  const { data: providerConfig, isLoading } = useProviderConfig(tenantId)
  const corridors = providerConfig?.corridors ?? []
  const addMutation = useAddTenantCorridor()
  const deleteMutation = useDeleteTenantCorridor()
  const setDefaultMutation = useSetTenantDefaultProvider()

  // Sync local state when data first loads (run once)
  useEffect(() => {
    if (providerConfig !== undefined) {
      setDefaultProvider(providerConfig.defaultProviderName ?? '')
    }
  }, [providerConfig?.defaultProviderName]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSaveDefault = () => {
    setDefaultMutation.mutate(
      { tenantId, providerName: defaultProvider || null },
      {
        onSuccess: () => {
          setDefaultSaved(true)
          setTimeout(() => setDefaultSaved(false), 2000)
        },
      },
    )
  }

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CorridorForm>({
    resolver: zodResolver(corridorSchema),
    defaultValues: { priority: 1, providerName: 'manual' },
  })

  const onAdd = (values: CorridorForm) => {
    addMutation.mutate(
      {
        tenantId,
        corridor: {
          sourceCurrency: values.sourceCurrency || null,
          destCurrency: values.destCurrency || null,
          providerName: values.providerName,
          priority: values.priority ?? 1,
        },
      },
      { onSuccess: () => { setAddOpen(false); reset() } },
    )
  }

  const onConfirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(
      { tenantId, corridorId: deleteTarget.id },
      { onSuccess: () => setDeleteTarget(null) },
    )
  }

  const columns: Column<CorridorConfig>[] = [
    {
      key: 'source_currency',
      header: 'From',
      render: row => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.source_currency ?? <span className="text-muted-fg italic">Any</span>}
        </span>
      ),
    },
    {
      key: 'dest_currency',
      header: 'To',
      render: row => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.dest_currency ?? <span className="text-muted-fg italic">Any</span>}
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
    {
      key: 'actions',
      header: '',
      render: row => (
        <Button
          variant="ghost"
          size="sm"
          className="text-danger-fg hover:text-danger-fg"
          onClick={e => { e.stopPropagation(); setDeleteTarget(row) }}
        >
          Remove
        </Button>
      ),
    },
  ]

  return (
    <>
      {/* ── Default provider card ── */}
      <ContentCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Default provider</h3>
            <p className="text-xs text-muted-fg mt-0.5 max-w-sm">
              Catch-all provider for this client. Applied after any corridor-specific rules
              and before the global platform defaults.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select
              value={defaultProvider}
              onChange={e => { setDefaultProvider(e.target.value); setDefaultSaved(false) }}
              className={cn(
                'h-9 min-w-[160px] rounded border bg-surface px-3 py-1 text-sm text-foreground shadow-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                'border-border hover:border-border-strong',
              )}
            >
              <option value="">— None (use global) —</option>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <Button
              size="sm"
              onClick={handleSaveDefault}
              loading={setDefaultMutation.isPending}
              disabled={defaultProvider === (providerConfig?.defaultProviderName ?? '')}
            >
              {defaultSaved ? '✓ Saved' : 'Save'}
            </Button>
          </div>
        </div>
        {/* Resolution legend */}
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-fg">
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary font-medium">1. Corridor rules below</span>
          <span className="text-muted-fg/50">→</span>
          <span className={cn('rounded-full px-2 py-0.5 font-medium',
            defaultProvider
              ? 'bg-success/10 text-success-fg'
              : 'bg-surface border border-border text-muted-fg'
          )}>
            2. This default {defaultProvider ? `(${defaultProvider})` : '(not set)'}
          </span>
          <span className="text-muted-fg/50">→</span>
          <span className="rounded-full bg-surface border border-border px-2 py-0.5 font-medium">3. Global platform</span>
          <span className="text-muted-fg/50">→</span>
          <span className="rounded-full bg-surface border border-border px-2 py-0.5 font-medium">4. manual</span>
        </div>
      </ContentCard>

      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Payment corridors</h3>
            <p className="text-xs text-muted-fg mt-0.5">
              Provider routing rules for this client. Overrides global defaults.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Add corridor
          </Button>
        </div>

        {isLoading ? (
          <LoadingState message="Loading corridors…" />
        ) : !corridors?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border">
              <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No custom corridors</p>
              <p className="text-xs text-muted-fg mt-0.5">This client inherits the platform-wide global defaults.</p>
            </div>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={corridors}
            getRowId={row => row.id}
            emptyTitle="No corridors"
          />
        )}
      </ContentCard>

      {/* Add corridor dialog */}
      <ConfirmDialog
        open={addOpen}
        onOpenChange={open => { if (!open) { setAddOpen(false); reset() } }}
        title="Add payment corridor"
        description="Route payments through a specific provider. Leave source and/or destination blank to create a wildcard rule — blank both for any-to-any."
        confirmLabel="Add corridor"
        onConfirm={handleSubmit(onAdd)}
        loading={addMutation.isPending}
      >
        <div className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From currency" htmlFor="sourceCurrency" error={errors.sourceCurrency?.message} hint="Blank = any source">
              <Input id="sourceCurrency" placeholder="USD or blank" className="font-mono uppercase" {...register('sourceCurrency')} error={!!errors.sourceCurrency} />
            </FormField>
            <FormField label="To currency" htmlFor="destCurrency" error={errors.destCurrency?.message} hint="Blank = any destination">
              <Input id="destCurrency" placeholder="GBP or blank" className="font-mono uppercase" {...register('destCurrency')} error={!!errors.destCurrency} />
            </FormField>
          </div>
          <FormField label="Provider" htmlFor="providerName" error={errors.providerName?.message} required>
            <select
              id="providerName"
              {...register('providerName')}
              className={cn(
                'h-9 w-full rounded border bg-surface px-3 py-1 text-sm text-foreground shadow-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1',
                errors.providerName ? 'border-danger-fg' : 'border-border hover:border-border-strong',
              )}
            >
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </FormField>
          <FormField label="Priority" htmlFor="priority" error={errors.priority?.message}>
            <Input id="priority" type="number" min={1} {...register('priority')} error={!!errors.priority} className="w-24" />
          </FormField>
        </div>
      </ConfirmDialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Remove corridor"
        description={`Remove the ${deleteTarget?.source_currency ?? 'Any'} → ${deleteTarget?.dest_currency ?? 'Any'} corridor? This client will fall back to global defaults.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={onConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </>
  )
}
