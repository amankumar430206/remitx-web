import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { FormField } from '@/components/ui/molecules/FormField'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { ContentCard } from '@/layouts/ContentCard'
import { getApiError } from '@/lib/apiError'
import {
  useFeeConfigs, useCreateFeeConfig, useUpdateFeeConfig, useDeleteFeeConfig,
  useGlobalFeeConfigs,
} from '@/hooks/useAdmin'
import {
  FEE_CATEGORY_LABELS, FEE_CATEGORY_OPTIONS,
  CORRIDOR_CATEGORIES, SINGLE_CURRENCY_CATEGORIES, NO_CURRENCY_CATEGORIES,
  type FeeCategory, type FeeConfig, type GlobalFeeConfig,
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
  inheritGlobal:  z.boolean().optional().default(false),
  feeType:        z.enum(['flat', 'percent']).optional(),
  feeValue:       z.coerce.number().positive().optional(),
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

function CorridorCell({ row }: { row: FeeConfig }) {
  if (NO_CURRENCY_CATEGORIES.includes(row.fee_category)) {
    return <span className="text-xs text-muted-fg italic">Tenant-wide</span>
  }
  if (SINGLE_CURRENCY_CATEGORIES.includes(row.fee_category)) {
    return (
      <span className="font-mono text-xs font-bold text-foreground">
        {row.source_currency ?? <span className="font-normal text-muted-fg">Any</span>}
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

function formatRate(feeType: 'flat' | 'percent', feeValue: string) {
  return feeType === 'flat'
    ? parseFloat(feeValue).toFixed(2)
    : `${parseFloat(feeValue)}%`
}

function findGlobalRule(
  globalConfigs: GlobalFeeConfig[] | undefined,
  category: FeeCategory,
  sourceCurrency: string | null,
  destCurrency: string | null,
): GlobalFeeConfig | undefined {
  if (!globalConfigs) return undefined
  return (
    globalConfigs.find(g =>
      g.fee_category === category &&
      g.source_currency === sourceCurrency &&
      g.dest_currency === destCurrency,
    ) ??
    globalConfigs.find(g =>
      g.fee_category === category &&
      g.source_currency === sourceCurrency &&
      g.dest_currency === null,
    ) ??
    globalConfigs.find(g =>
      g.fee_category === category &&
      g.source_currency === null &&
      g.dest_currency === null,
    )
  )
}

function GlobalRateChip({ rule }: { rule: GlobalFeeConfig | undefined }) {
  if (!rule) return <span className="text-xs text-muted-fg italic">No global rule</span>
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
      Global: {formatRate(rule.fee_type, rule.fee_value)}
      {rule.fee_type === 'percent' && (rule.min_fee || rule.max_fee) && (
        <span className="text-primary/70">
          ({rule.min_fee ? parseFloat(rule.min_fee).toFixed(2) : '0'}–{rule.max_fee ? parseFloat(rule.max_fee).toFixed(2) : '∞'})
        </span>
      )}
    </span>
  )
}

const buildColumns = (
  globalConfigs: GlobalFeeConfig[] | undefined,
  onDelete: (id: string) => void,
  onCustomize: (row: FeeConfig) => void,
  deleting: boolean,
  customizing: boolean,
): Column<FeeConfig>[] => [
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
    render: row => row.inherit_global ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
        </svg>
        Same as Global
      </span>
    ) : (
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
    render: row => row.inherit_global ? (
      <GlobalRateChip rule={findGlobalRule(globalConfigs, row.fee_category, row.source_currency, row.dest_currency)} />
    ) : (
      <span className="font-mono text-sm font-semibold text-foreground">
        {row.fee_type && row.fee_value ? formatRate(row.fee_type, row.fee_value) : '—'}
      </span>
    ),
  },
  {
    key: 'min_fee',
    header: 'Min / Max',
    render: row =>
      !row.inherit_global && row.fee_type === 'percent' && (row.min_fee || row.max_fee) ? (
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
      <div className="flex items-center gap-1">
        {row.inherit_global && (
          <button
            onClick={() => onCustomize(row)}
            disabled={customizing}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-fg hover:bg-muted transition-colors disabled:opacity-40"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
            </svg>
            Customize
          </button>
        )}
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
      </div>
    ),
  },
]

interface Props {
  tenantId: string
  tenantName?: string
}

export function TenantFeeRules({ tenantId, tenantName }: Props) {
  const navigate = useNavigate()
  const [addingFee, setAddingFee] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FeeCategory | 'all'>('all')

  const { data: feeConfigs, isLoading } = useFeeConfigs(tenantId)
  const { data: globalFeeConfigs } = useGlobalFeeConfigs()
  const createMutation = useCreateFeeConfig()
  const updateMutation = useUpdateFeeConfig()
  const deleteMutation = useDeleteFeeConfig()

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FeeFormValues>({
    resolver: zodResolver(feeSchema),
    defaultValues: {
      feeCategory: 'transaction_send',
      feeType: 'flat',
      sourceCurrency: '',
      destCurrency: '',
      inheritGlobal: false,
    },
  })

  const feeType      = watch('feeType', 'flat')
  const feeCategory  = watch('feeCategory', 'transaction_send')
  const sourceCurrency = watch('sourceCurrency') ?? ''
  const destCurrency   = watch('destCurrency') ?? ''
  const inheritGlobal  = watch('inheritGlobal', false)

  const filteredConfigs = activeTab === 'all'
    ? (feeConfigs ?? [])
    : (feeConfigs ?? []).filter(r => r.fee_category === activeTab)

  const countByCategory = (cat: FeeCategory) =>
    (feeConfigs ?? []).filter(r => r.fee_category === cat).length

  const onAdd = (values: FeeFormValues) => {
    if (!values.inheritGlobal && (!values.feeType || !values.feeValue)) return
    const isNoCurrency = NO_CURRENCY_CATEGORIES.includes(values.feeCategory)
    const isSingle     = SINGLE_CURRENCY_CATEGORIES.includes(values.feeCategory)

    createMutation.mutate(
      {
        tenantId,
        feeCategory:    values.feeCategory,
        sourceCurrency: isNoCurrency ? null : (values.sourceCurrency || null),
        destCurrency:   (isNoCurrency || isSingle) ? null : (values.destCurrency || null),
        inheritGlobal:  values.inheritGlobal ?? false,
        feeType:        values.inheritGlobal ? undefined : values.feeType,
        feeValue:       values.inheritGlobal ? undefined : values.feeValue,
        minFee:         values.inheritGlobal ? undefined : (values.minFee ?? null),
        maxFee:         values.inheritGlobal ? undefined : (values.maxFee ?? null),
      },
      { onSuccess: () => { setAddingFee(false); reset() } },
    )
  }

  const confirmDelete = () => {
    if (!deleteDialog) return
    deleteMutation.mutate(
      { tenantId, feeId: deleteDialog },
      { onSuccess: () => setDeleteDialog(null) },
    )
  }

  // "Customize" converts an inherit_global row into a custom rule using the current global values
  const onCustomize = (row: FeeConfig) => {
    const globalRule = findGlobalRule(globalFeeConfigs, row.fee_category, row.source_currency, row.dest_currency)
    if (!globalRule) return
    updateMutation.mutate({
      tenantId,
      feeId: row.id,
      inheritGlobal: false,
      feeType: globalRule.fee_type,
      feeValue: parseFloat(globalRule.fee_value),
      minFee: globalRule.min_fee ? parseFloat(globalRule.min_fee) : null,
      maxFee: globalRule.max_fee ? parseFloat(globalRule.max_fee) : null,
    })
  }

  // Preview the global rate for the currently selected category + corridor in the add form
  const previewGlobal = inheritGlobal
    ? findGlobalRule(globalFeeConfigs, feeCategory, sourceCurrency || null, destCurrency || null)
    : undefined

  return (
    <>
      <ContentCard padding="none">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Fee rules</h3>
            <p className="text-xs text-muted-fg">
              Rules apply only to{' '}
              <span className="font-medium text-foreground">{tenantName ?? 'this tenant'}</span>
              {' · '}no custom rule = falls back to{' '}
              <Link to="/admin/global-fees" className="text-primary underline-offset-2 hover:underline">
                global fee
              </Link>
            </p>
          </div>
          {!addingFee && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={() => navigate('/admin/global-fees')}>
                Global rules
              </Button>
              <Button size="sm" onClick={() => setAddingFee(true)}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add rule
              </Button>
            </div>
          )}
        </div>

        {/* Add form */}
        {addingFee && (
          <form onSubmit={handleSubmit(onAdd)} className="border-b border-border bg-muted/40 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">New fee rule</p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
              {/* Category */}
              <FormField label="Fee category" error={errors.feeCategory?.message} htmlFor="fc-cat" className="col-span-2 sm:col-span-1">
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

              {/* Currency fields — hidden when inheriting global AND for no-currency categories */}
              {!inheritGlobal && (
                <>
                  {NO_CURRENCY_CATEGORIES.includes(feeCategory) ? (
                    <div className="col-span-2 flex items-end pb-1">
                      <span className="text-xs text-muted-fg italic">AMC is a tenant-wide annual charge — no currency needed.</span>
                    </div>
                  ) : SINGLE_CURRENCY_CATEGORIES.includes(feeCategory) ? (
                    <FormField label="Currency" htmlFor="fc-src">
                      <Select
                        value={sourceCurrency}
                        onValueChange={(v) => setValue('sourceCurrency', v || null, { shouldValidate: true })}
                        options={[{ value: '', label: 'Any currency (wildcard)' }, ...CURRENCY_OPTIONS]}
                      />
                    </FormField>
                  ) : (
                    <>
                      <FormField label="Source currency" error={errors.sourceCurrency?.message} htmlFor="fc-src">
                        <Select
                          value={sourceCurrency}
                          onValueChange={(v) => setValue('sourceCurrency', v, { shouldValidate: true })}
                          options={CURRENCY_OPTIONS}
                        />
                      </FormField>
                      <FormField label="Destination" htmlFor="fc-dst">
                        <Select
                          value={destCurrency ?? ''}
                          onValueChange={(v) => setValue('destCurrency', v || null, { shouldValidate: true })}
                          options={DEST_CURRENCY_OPTIONS}
                        />
                      </FormField>
                    </>
                  )}

                  {/* Fee fields */}
                  <FormField label="Type" error={errors.feeType?.message} htmlFor="fc-type">
                    <Select
                      value={feeType ?? 'flat'}
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
                    htmlFor="fc-val"
                  >
                    <Input
                      id="fc-val"
                      type="number"
                      step="0.00000001"
                      placeholder={feeType === 'flat' ? '10.00' : '0.5'}
                      {...register('feeValue')}
                      error={!!errors.feeValue}
                    />
                  </FormField>
                  {feeType === 'percent' && (
                    <>
                      <FormField label="Min fee" htmlFor="fc-min">
                        <Input id="fc-min" type="number" step="0.01" placeholder="0.00" {...register('minFee')} />
                      </FormField>
                      <FormField label="Max fee" htmlFor="fc-max">
                        <Input id="fc-max" type="number" step="0.01" placeholder="500.00" {...register('maxFee')} />
                      </FormField>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Same as Global checkbox */}
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!inheritGlobal}
                onChange={(e) => setValue('inheritGlobal', e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="font-medium text-foreground">Same as Global</span>
              <span className="text-muted-fg">— inherit the platform-wide fee for this category</span>
            </label>

            {/* Preview of global rate when checkbox is checked */}
            {inheritGlobal && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-primary/20 bg-primary-subtle/30 px-3 py-2 text-sm">
                <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {previewGlobal ? (
                  <span className="text-foreground">
                    Effective fee:{' '}
                    <strong>{formatRate(previewGlobal.fee_type, previewGlobal.fee_value)}</strong>
                    {previewGlobal.fee_type === 'percent' && (previewGlobal.min_fee || previewGlobal.max_fee) && (
                      <span className="ml-1 text-muted-fg">
                        (min {previewGlobal.min_fee ? parseFloat(previewGlobal.min_fee).toFixed(2) : '0'} /
                        max {previewGlobal.max_fee ? parseFloat(previewGlobal.max_fee).toFixed(2) : '∞'})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-fg italic">
                    No global rule configured for this category — fee will be zero until one is set.
                  </span>
                )}
              </div>
            )}

            {createMutation.isError && (
              <p className="mt-2 text-xs text-danger-fg">
                {getApiError(createMutation.error, 'Could not create fee rule.')}
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
          <LoadingState message="Loading fee rules…" />
        ) : !filteredConfigs.length && !addingFee ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
              <svg className="h-4 w-4 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
              </svg>
            </div>
            <p className="text-sm text-muted-fg">
              {activeTab === 'all'
                ? 'No fee rules — all charges use global fee (or free if none set)'
                : `No fee rules for "${FEE_CATEGORY_LABELS[activeTab]}"`}
            </p>
          </div>
        ) : (
          <DataTable
            columns={buildColumns(globalFeeConfigs, onDelete, onCustomize, deleteMutation.isPending, updateMutation.isPending)}
            data={filteredConfigs}
            getRowId={row => row.id}
            emptyTitle="No fee rules"
          />
        )}
      </ContentCard>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}
        title="Delete fee rule"
        description="This rule will be permanently removed. Charges will revert to the global fee (or zero if none) for this category."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </>
  )

  function onDelete(feeId: string) { setDeleteDialog(feeId) }
}
