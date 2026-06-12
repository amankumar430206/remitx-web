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
import {
  FEE_CATEGORY_LABELS, FEE_CATEGORY_OPTIONS,
  CORRIDOR_CATEGORIES, SINGLE_CURRENCY_CATEGORIES, NO_CURRENCY_CATEGORIES,
  type FeeCategory, type GlobalFeeConfig,
} from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const CURRENCIES = [
  'USD', 'GBP', 'EUR', 'AED', 'INR', 'SGD', 'AUD', 'CAD', 'JPY', 'SAR',
  'PKR', 'NGN', 'CNY', 'PHP', 'BRL', 'IDR', 'EGP', 'TRY', 'VND',
] as const
const CURRENCY_OPTIONS = CURRENCIES.map(c => ({ value: c, label: c }))
const DEST_CURRENCY_OPTIONS = [{ value: '', label: 'Any (wildcard)' }, ...CURRENCY_OPTIONS]

const ALL_CATEGORIES = Object.keys(FEE_CATEGORY_LABELS) as FeeCategory[]

const feeSchema = z.object({
  feeCategory:    z.enum(ALL_CATEGORIES as [FeeCategory, ...FeeCategory[]]),
  sourceCurrency: z.string().optional().nullable(),
  destCurrency:   z.string().optional().nullable(),
  feeType:        z.enum(['flat', 'percent']),
  feeValue:       z.coerce.number().positive(),
  minFee:         z.coerce.number().min(0).optional().nullable(),
  maxFee:         z.coerce.number().positive().optional().nullable(),
})
type FeeFormValues = z.infer<typeof feeSchema>

function CategoryBadge({ category }: { category: FeeCategory }) {
  const colors: Record<FeeCategory, string> = {
    account_activation:  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    iban_creation:       'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
    transaction_send:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    transaction_receive: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300',
    monthly_maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    amc:                 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colors[category]}`}>
      {FEE_CATEGORY_LABELS[category]}
    </span>
  )
}

function CorridorCell({ row }: { row: GlobalFeeConfig }) {
  if (NO_CURRENCY_CATEGORIES.includes(row.fee_category)) {
    return <span className="text-xs text-muted-fg italic">Tenant-wide</span>
  }
  if (SINGLE_CURRENCY_CATEGORIES.includes(row.fee_category)) {
    return (
      <span className="font-mono text-xs font-bold text-foreground">
        {row.source_currency ?? <span className="font-normal text-muted-fg">Any currency</span>}
      </span>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs font-bold text-foreground">
        {row.source_currency ?? <span className="font-normal text-muted-fg">Any</span>}
      </span>
      <svg className="h-3 w-3 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
      </svg>
      <span className="font-mono text-xs font-bold text-foreground">
        {row.dest_currency ?? <span className="font-normal text-muted-fg">Any</span>}
      </span>
    </div>
  )
}

const buildColumns = (onDelete: (id: string) => void, deleting: boolean): Column<GlobalFeeConfig>[] => [
  {
    key: 'fee_category',
    header: 'Category',
    render: row => <CategoryBadge category={row.fee_category} />,
  },
  {
    key: 'source_currency',
    header: 'Applies to',
    render: row => <CorridorCell row={row} />,
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

function CurrencyFields({
  category,
  sourceCurrency,
  destCurrency,
  onSourceChange,
  onDestChange,
  sourceError,
}: {
  category: FeeCategory
  sourceCurrency: string
  destCurrency: string
  onSourceChange: (v: string) => void
  onDestChange: (v: string) => void
  sourceError?: string
}) {
  if (NO_CURRENCY_CATEGORIES.includes(category)) {
    return (
      <div className="rounded-md border border-border bg-muted/30 px-3 py-2 text-xs text-muted-fg col-span-2">
        AMC is a tenant-wide annual charge — no currency needed.
      </div>
    )
  }
  if (SINGLE_CURRENCY_CATEGORIES.includes(category)) {
    return (
      <FormField label="Currency" error={sourceError} htmlFor="gfc-src">
        <Select
          value={sourceCurrency}
          onValueChange={onSourceChange}
          options={[{ value: '', label: 'Any currency (wildcard)' }, ...CURRENCY_OPTIONS]}
        />
      </FormField>
    )
  }
  // Corridor: source + optional dest
  return (
    <>
      <FormField label="Source currency" error={sourceError} htmlFor="gfc-src">
        <Select value={sourceCurrency} onValueChange={onSourceChange} options={CURRENCY_OPTIONS} />
      </FormField>
      <FormField label="Destination" htmlFor="gfc-dst">
        <Select
          value={destCurrency}
          onValueChange={onDestChange}
          options={DEST_CURRENCY_OPTIONS}
        />
      </FormField>
    </>
  )
}

export function GlobalFeeRules() {
  const [addingFee, setAddingFee] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FeeCategory | 'all'>('all')

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
    defaultValues: { feeCategory: 'transaction_send', feeType: 'flat', sourceCurrency: '', destCurrency: '' },
  })

  const feeType      = watch('feeType', 'flat')
  const feeCategory  = watch('feeCategory', 'transaction_send')
  const sourceCurrency = watch('sourceCurrency') ?? ''
  const destCurrency   = watch('destCurrency') ?? ''

  const filteredConfigs = activeTab === 'all'
    ? (feeConfigs ?? [])
    : (feeConfigs ?? []).filter(r => r.fee_category === activeTab)

  const countByCategory = (cat: FeeCategory) =>
    (feeConfigs ?? []).filter(r => r.fee_category === cat).length

  const onAdd = (values: FeeFormValues) => {
    const isNoCurrency = NO_CURRENCY_CATEGORIES.includes(values.feeCategory)
    const isSingle     = SINGLE_CURRENCY_CATEGORIES.includes(values.feeCategory)

    createMutation.mutate(
      {
        feeCategory:    values.feeCategory,
        sourceCurrency: isNoCurrency ? null : (values.sourceCurrency || null),
        destCurrency:   (isNoCurrency || isSingle) ? null : (values.destCurrency || null),
        feeType:        values.feeType,
        feeValue:       values.feeValue,
        minFee:         values.minFee ?? null,
        maxFee:         values.maxFee ?? null,
      },
      {
        onSuccess: () => { setAddingFee(false); reset() },
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
        description="Platform-wide defaults applied to every tenant that has no corridor-specific override."
      />

      <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-fg">
        <strong>Heads up:</strong> Changes here affect every tenant that hasn't set a custom rule for that category/corridor. Tenants with their own rules are unaffected.
      </div>

      <ContentCard padding="none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Global fee rules</h3>
            <p className="text-xs text-muted-fg">Inherited by tenants with no custom rule for a category/corridor</p>
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

        {/* Add form */}
        {addingFee && (
          <form onSubmit={handleSubmit(onAdd)} className="border-b border-border bg-muted/40 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">New global rule</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {/* Category */}
              <FormField label="Fee category" error={errors.feeCategory?.message} htmlFor="gfc-cat" className="col-span-2 sm:col-span-1">
                <Select
                  value={feeCategory}
                  onValueChange={(v) => {
                    setValue('feeCategory', v as FeeCategory, { shouldValidate: true })
                    setValue('sourceCurrency', '')
                    setValue('destCurrency', '')
                  }}
                  options={FEE_CATEGORY_OPTIONS}
                />
              </FormField>

              {/* Currency fields — context-aware */}
              <CurrencyFields
                category={feeCategory}
                sourceCurrency={sourceCurrency}
                destCurrency={destCurrency}
                onSourceChange={(v) => setValue('sourceCurrency', v, { shouldValidate: true })}
                onDestChange={(v) => setValue('destCurrency', v || undefined, { shouldValidate: true })}
                sourceError={errors.sourceCurrency?.message}
              />

              {/* Fee type + value */}
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
                type="button" size="sm" variant="ghost"
                onClick={() => { setAddingFee(false); reset(); createMutation.reset() }}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Category tabs */}
        <div className="flex gap-0.5 overflow-x-auto border-b border-border bg-muted/30 px-4 pt-3 pb-0">
          {(['all', ...ALL_CATEGORIES] as Array<'all' | FeeCategory>).map(tab => {
            const count = tab === 'all' ? (feeConfigs?.length ?? 0) : countByCategory(tab)
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex shrink-0 items-center gap-1.5 rounded-t-md border border-b-0 px-3 py-2 text-xs font-medium transition-colors ${
                  activeTab === tab
                    ? 'border-border bg-surface text-foreground'
                    : 'border-transparent text-muted-fg hover:text-foreground'
                }`}
              >
                {tab === 'all' ? 'All' : FEE_CATEGORY_LABELS[tab]}
                {count > 0 && (
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                    activeTab === tab ? 'bg-primary text-white' : 'bg-muted text-muted-fg'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Table */}
        {isLoading ? (
          <LoadingState message="Loading global fee rules…" />
        ) : !filteredConfigs.length && !addingFee ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
              <svg className="h-4 w-4 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
              </svg>
            </div>
            <p className="text-sm text-muted-fg">
              {activeTab === 'all'
                ? 'No global rules — tenants without custom rules pay zero fee'
                : `No global rules for "${FEE_CATEGORY_LABELS[activeTab]}"`}
            </p>
          </div>
        ) : (
          <DataTable
            columns={buildColumns(setDeleteDialog, deleteMutation.isPending)}
            data={filteredConfigs}
            getRowId={row => row.id}
            emptyTitle="No global fee rules"
          />
        )}
      </ContentCard>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}
        title="Delete global fee rule"
        description="This global rule will be removed. Tenants inheriting it will fall back to zero fee for this category."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
