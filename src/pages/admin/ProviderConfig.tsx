import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { FormField } from '@/components/ui/molecules/FormField'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import {
  useGlobalProviderConfig,
  useAddGlobalCorridor,
  useDeleteGlobalCorridor,
} from '@/hooks/useAdmin'
import type { CorridorConfig } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const PROVIDERS = ['manual', 'zoqq', 'cloudcurrency']

const corridorSchema = z.object({
  sourceCurrency: z.string().length(3, 'Must be 3-letter code').toUpperCase(),
  destCurrency: z
    .string()
    .transform(v => v.toUpperCase())
    .refine(v => v === '' || v.length === 3, { message: 'Must be 3-letter code or blank' })
    .optional(),
  providerName: z.string().min(1, 'Select a provider'),
  priority: z.coerce.number().int().min(1).optional(),
})
type CorridorForm = z.infer<typeof corridorSchema>

export function ProviderConfig() {
  const [addOpen, setAddOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<CorridorConfig | null>(null)

  const { data: corridors, isLoading, isError, refetch } = useGlobalProviderConfig()
  const addMutation = useAddGlobalCorridor()
  const deleteMutation = useDeleteGlobalCorridor()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CorridorForm>({
    resolver: zodResolver(corridorSchema),
    defaultValues: { priority: 1, providerName: 'manual' },
  })

  const onAdd = (values: CorridorForm) => {
    addMutation.mutate(
      {
        sourceCurrency: values.sourceCurrency,
        destCurrency: values.destCurrency || null,
        providerName: values.providerName,
        priority: values.priority ?? 1,
      },
      { onSuccess: () => { setAddOpen(false); reset() } },
    )
  }

  const onConfirmDelete = () => {
    if (!deleteTarget) return
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  const columns: Column<CorridorConfig>[] = [
    {
      key: 'source_currency',
      header: 'From',
      render: row => (
        <span className="font-mono text-xs font-semibold text-foreground">{row.source_currency}</span>
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
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-subtle border border-primary/20 px-2.5 py-0.5 text-xs font-mono font-medium text-primary">
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

  if (isLoading) return <LoadingState message="Loading provider config…" />
  if (isError) return <ErrorState title="Could not load configuration" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 max-w-5xl">
      <PageHeader
        title="Provider configuration"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Providers' }]}
        actions={
          <Button onClick={() => setAddOpen(true)}>Add corridor</Button>
        }
      />

      {/* Explanation card */}
      <ContentCard>
        <div className="flex gap-4">
          {/* Route diagram */}
          <div className="flex-shrink-0 flex flex-col gap-2">
            <RouteStep
              label="Payment submitted"
              sub="Tenant corridor config checked first"
              icon="arrow-right"
              highlight
            />
            <RouteStep
              label="Global defaults"
              sub="Applied if no tenant rule matches (configured here)"
              icon="globe"
              highlight
            />
            <RouteStep
              label="DEFAULT_PROVIDER"
              sub="Env var fallback — 'manual' unless changed"
              icon="cog"
            />
          </div>
          <div className="border-l border-border pl-4 flex-1">
            <h4 className="text-sm font-semibold text-foreground mb-1">How provider routing works</h4>
            <p className="text-xs text-muted-fg leading-relaxed mb-3">
              When a payment is submitted, RemitX resolves the provider using a three-level priority chain:
            </p>
            <ol className="flex flex-col gap-1.5 text-xs text-muted-fg list-decimal list-inside">
              <li><span className="font-medium text-foreground">Client-specific corridors</span> — configured on each Tenant's Providers tab. Highest priority.</li>
              <li><span className="font-medium text-foreground">Global defaults</span> — configured on this page. Applied when the client has no matching rule.</li>
              <li><span className="font-medium text-foreground">DEFAULT_PROVIDER env var</span> — platform-wide fallback, defaults to <code className="bg-surface px-1 rounded text-[10px]">manual</code>.</li>
            </ol>
            <p className="mt-3 text-xs text-muted-fg">
              A <span className="font-medium text-foreground">wildcard corridor</span> (To: blank) matches any destination currency from the source. An exact corridor (e.g. USD → GBP) takes precedence over a wildcard.
            </p>
          </div>
        </div>
      </ContentCard>

      {/* Global corridors table */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Global default corridors</h3>
            <p className="text-xs text-muted-fg mt-0.5">
              Applied to all clients that have no matching corridor configured.
            </p>
          </div>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            Add corridor
          </Button>
        </div>

        {(corridors ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-14 text-center px-6">
            <div className="h-10 w-10 rounded-full bg-surface border border-border flex items-center justify-center">
              <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">No global corridors set</p>
              <p className="text-xs text-muted-fg mt-0.5">
                All tenants without custom corridors will fall back to <code className="bg-surface px-1 rounded text-[10px]">DEFAULT_PROVIDER</code>.
              </p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
              Add first corridor
            </Button>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={corridors ?? []}
            getRowId={c => c.id}
          />
        )}
      </ContentCard>

      {/* Info panel for per-client */}
      <ContentCard>
        <div className="flex items-start gap-3">
          <svg className="h-4 w-4 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-xs text-muted-fg leading-relaxed">
            To configure provider routing for a <span className="font-semibold text-foreground">specific client</span>, go to{' '}
            <span className="font-semibold text-foreground">Tenants → [Client] → Providers</span>.
            Client-specific corridors always override the global defaults configured here.
          </p>
        </div>
      </ContentCard>

      {/* Add corridor dialog */}
      <ConfirmDialog
        open={addOpen}
        onOpenChange={open => { if (!open) { setAddOpen(false); reset() } }}
        title="Add global corridor"
        description="This default applies to all clients without a matching client-specific corridor. Leave destination blank for a wildcard."
        confirmLabel="Add corridor"
        onConfirm={handleSubmit(onAdd)}
        loading={addMutation.isPending}
      >
        <div className="flex flex-col gap-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="From currency" htmlFor="sourceCurrency" error={errors.sourceCurrency?.message} required>
              <Input id="sourceCurrency" placeholder="USD" className="font-mono uppercase" {...register('sourceCurrency')} error={!!errors.sourceCurrency} />
            </FormField>
            <FormField label="To currency" htmlFor="destCurrency" error={errors.destCurrency?.message}>
              <Input id="destCurrency" placeholder="GBP or blank" className="font-mono uppercase" {...register('destCurrency')} error={!!errors.destCurrency} />
            </FormField>
          </div>
          <FormField label="Provider" htmlFor="providerName" error={errors.providerName?.message} required>
            <Select id="providerName" {...register('providerName')} error={!!errors.providerName}>
              {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
            </Select>
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
        title="Remove global corridor"
        description={`Remove the ${deleteTarget?.source_currency}${deleteTarget?.dest_currency ? ` → ${deleteTarget.dest_currency}` : ' (wildcard)'} global default? Clients using this fallback will fall through to DEFAULT_PROVIDER.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={onConfirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}

// ─── Route step illustration ──────────────────────────────────────────────────

function RouteStep({ label, sub, icon, highlight }: {
  label: string
  sub: string
  icon: 'arrow-right' | 'globe' | 'cog'
  highlight?: boolean
}) {
  const icons: Record<typeof icon, React.ReactNode> = {
    'arrow-right': (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    ),
    globe: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
      </svg>
    ),
    cog: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  }

  return (
    <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${highlight ? 'bg-primary-subtle' : 'bg-surface'}`}>
      <div className={`flex-shrink-0 h-6 w-6 rounded-full flex items-center justify-center ${highlight ? 'bg-primary text-white' : 'bg-muted text-muted-fg'}`}>
        {icons[icon]}
      </div>
      <div>
        <p className={`text-xs font-semibold ${highlight ? 'text-primary' : 'text-muted-fg'}`}>{label}</p>
        <p className="text-[10px] text-muted-fg leading-tight">{sub}</p>
      </div>
    </div>
  )
}
