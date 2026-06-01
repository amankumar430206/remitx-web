import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { Badge } from '@/components/ui/atoms/Badge'
import { FormField } from '@/components/ui/molecules/FormField'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { ContentCard } from '@/layouts/ContentCard'
import { getApiError } from '@/lib/apiError'
import { useGlobalFeeConfigs, useCreateGlobalFeeConfig, useDeleteGlobalFeeConfig } from '@/hooks/useAdmin'
import type { GlobalFeeConfig } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const CURRENCIES = [
  'USD', 'GBP', 'EUR', 'AED', 'INR', 'SGD', 'AUD', 'CAD', 'JPY', 'SAR',
  'PKR', 'NGN', 'CNY', 'PHP', 'BRL', 'IDR', 'EGP', 'TRY', 'VND',
] as const
const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c, label: c }))
const DEST_CURRENCY_OPTIONS = [{ value: '', label: 'Any (wildcard)' }, ...CURRENCY_OPTIONS]

const feeSchema = z.object({
  sourceCurrency: z.string().min(1, 'Required'),
  destCurrency:   z.string().optional(),
  feeType:        z.enum(['flat', 'percent']),
  feeValue:       z.coerce.number().positive(),
  minFee:         z.coerce.number().min(0).optional().nullable(),
  maxFee:         z.coerce.number().positive().optional().nullable(),
})
type FeeFormValues = z.infer<typeof feeSchema>

const feeColumns = (onDelete: (id: string) => void, deleting: boolean): Column<GlobalFeeConfig>[] => [
  {
    key: 'source_currency',
    header: 'Corridor',
    render: row => (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-bold text-foreground">{row.source_currency}</span>
        <svg className="h-3 w-3 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span className="font-mono text-xs font-bold text-foreground">
          {row.dest_currency ?? <span className="font-normal text-muted-fg">Any</span>}
        </span>
      </div>
    ),
  },
  {
    key: 'fee_type',
    header: 'Type',
    render: row => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
        row.fee_type === 'flat' ? 'bg-info text-info-fg' : 'bg-primary-subtle text-primary'
      }`}>
        {row.fee_type === 'flat' ? 'Flat' : 'Percent'}
      </span>
    ),
  },
  {
    key: 'fee_value',
    header: 'Rate',
    render: row => (
      <span className="font-mono text-sm font-semibold text-foreground">
        {row.fee_type === 'flat'
          ? parseFloat(row.fee_value).toFixed(2)
          : `${parseFloat(row.fee_value)}%`}
      </span>
    ),
  },
  {
    key: 'min_fee',
    header: 'Min / Max',
    render: row =>
      row.fee_type === 'percent' && (row.min_fee || row.max_fee) ? (
        <span className="text-xs text-muted-fg tabular-nums">
          {row.min_fee ? parseFloat(row.min_fee).toFixed(2) : '—'}
          {' / '}
          {row.max_fee ? parseFloat(row.max_fee).toFixed(2) : '—'}
        </span>
      ) : (
        <span className="text-xs text-muted-fg">—</span>
      ),
  },
  {
    key: 'is_active',
    header: 'Active',
    render: row => (
      <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Yes' : 'No'}</Badge>
    ),
  },
  {
    key: 'id',
    header: '',
    render: row => (
      <button
        onClick={() => onDelete(row.id)}
        disabled={deleting}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger-fg hover:bg-danger transition-colors disabled:opacity-40"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    ),
  },
]

export function GlobalFeeRules() {
  const [addingFee, setAddingFee] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)

  const { data: feeConfigs, isLoading } = useGlobalFeeConfigs()
  const createMutation = useCreateGlobalFeeConfig()
  const deleteMutation = useDeleteGlobalFeeConfig()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: { feeType: 'flat', sourceCurrency: '', destCurrency: '' },
  })

  const feeType = watch('feeType', 'flat')
  const sourceCurrency = watch('sourceCurrency', '')
  const destCurrency = watch('destCurrency', '')

  const onAdd = (values: FeeFormValues) => {
    createMutation.mutate(
      {
        sourceCurrency: values.sourceCurrency,
        destCurrency: values.destCurrency || null,
        feeType: values.feeType,
        feeValue: values.feeValue,
        minFee: values.minFee ?? null,
        maxFee: values.maxFee ?? null,
      },
      {
        onSuccess: () => {
          setAddingFee(false)
          reset()
        },
      },
    )
  }

  const confirmDelete = () => {
    if (!deleteDialog) return
    deleteMutation.mutate(deleteDialog, { onSuccess: () => setDeleteDialog(null) })
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Global fee rules"
        description="Default fees applied to all tenants that have no corridor-specific configuration."
      />

      <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-fg">
        <strong>Heads up:</strong> Changes here apply to every tenant that hasn't set a custom or
        "Same as Global" rule for that corridor. Tenants with their own rules are unaffected.
      </div>

      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Global fee rules</h3>
            <p className="text-xs text-muted-fg">Inherited by tenants with no custom rule for a corridor</p>
          </div>
          {!addingFee && (
            <Button size="sm" onClick={() => setAddingFee(true)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add rule
            </Button>
          )}
        </div>

        {addingFee && (
          <form onSubmit={handleSubmit(onAdd)} className="border-b border-border bg-muted/40 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">New global rule</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <FormField label="Source" error={errors.sourceCurrency?.message} htmlFor="gfc-src">
                <Select
                  value={sourceCurrency}
                  onValueChange={(v) => setValue('sourceCurrency', v, { shouldValidate: true })}
                  options={CURRENCY_OPTIONS}
                />
              </FormField>
              <FormField label="Destination" htmlFor="gfc-dst">
                <Select
                  value={destCurrency ?? ''}
                  onValueChange={(v) => setValue('destCurrency', v || undefined, { shouldValidate: true })}
                  options={DEST_CURRENCY_OPTIONS}
                />
              </FormField>
              <FormField label="Type" error={errors.feeType?.message} htmlFor="gfc-type">
                <Select
                  value={feeType}
                  onValueChange={(v) => setValue('feeType', v as 'flat' | 'percent', { shouldValidate: true })}
                  options={[
                    { value: 'flat', label: 'Flat' },
                    { value: 'percent', label: 'Percent' },
                  ]}
                />
              </FormField>
              <FormField
                label={feeType === 'flat' ? 'Amount' : 'Rate (%)'}
                error={errors.feeValue?.message}
                htmlFor="gfc-val"
              >
                <Input
                  id="gfc-val"
                  type="number"
                  step="0.00000001"
                  placeholder={feeType === 'flat' ? '10.00' : '0.5'}
                  {...register('feeValue')}
                  error={!!errors.feeValue}
                />
              </FormField>
              {feeType === 'percent' && (
                <>
                  <FormField label="Min fee" htmlFor="gfc-min">
                    <Input id="gfc-min" type="number" step="0.01" placeholder="0.00" {...register('minFee')} />
                  </FormField>
                  <FormField label="Max fee" htmlFor="gfc-max">
                    <Input id="gfc-max" type="number" step="0.01" placeholder="500.00" {...register('maxFee')} />
                  </FormField>
                </>
              )}
            </div>
            {createMutation.isError && (
              <p className="mt-2 text-xs text-danger-fg">
                {getApiError(createMutation.error, 'Could not create global fee rule.')}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button type="submit" size="sm" loading={createMutation.isPending}>Save rule</Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => { setAddingFee(false); reset(); createMutation.reset() }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {isLoading ? (
          <LoadingState message="Loading global fee rules…" />
        ) : !feeConfigs?.length && !addingFee ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
              <svg className="h-4 w-4 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
              </svg>
            </div>
            <p className="text-sm text-muted-fg">No global rules — tenants without custom rules pay zero fee</p>
          </div>
        ) : (
          <DataTable
            columns={feeColumns(setDeleteDialog, deleteMutation.isPending)}
            data={feeConfigs ?? []}
            getRowId={row => row.id}
            emptyTitle="No global fee rules"
          />
        )}
      </ContentCard>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}
        title="Delete global fee rule"
        description="This global rule will be removed. Tenants inheriting it will fall back to zero fee for this corridor."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
