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
  FEE_CATEGORY_LABELS,
  CORRIDOR_CATEGORIES, SINGLE_CURRENCY_CATEGORIES, NO_CURRENCY_CATEGORIES,
  type FeeCategory, type FeeConfig, type GlobalFeeConfig,
} from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const CURRENCIES = [
  'USD', 'GBP', 'EUR', 'AED', 'INR', 'SGD', 'AUD', 'CAD', 'JPY', 'SAR',
  'PKR', 'NGN', 'CNY', 'PHP', 'BRL', 'IDR', 'EGP', 'TRY', 'VND',
] as const
const CURRENCY_OPTIONS      = CURRENCIES.map(c => ({ value: c, label: c }))
const DEST_CURRENCY_OPTIONS  = [{ value: '', label: 'Any (wildcard)' }, ...CURRENCY_OPTIONS]
const SRC_WILDCARD_OPTIONS   = [{ value: '', label: 'Any currency (wildcard)' }, ...CURRENCY_OPTIONS]

const SECTION_META: Record<FeeCategory, { description: string }> = {
  account_activation:  { description: 'One-time fee charged when a new user account is activated.' },
  iban_creation:       { description: 'Fee charged each time a currency IBAN / wallet account is created.' },
  transaction_send:    { description: 'Fee applied to outbound payments, per source → destination corridor.' },
  transaction_receive: { description: 'Fee applied to inbound payments, per source → destination corridor.' },
  monthly_maintenance: { description: 'Recurring monthly charge per currency account.' },
  amc:                 { description: 'Annual maintenance charge — applies at the tenant level, no currency required.' },
}

const SECTION_ORDER: FeeCategory[] = [
  'account_activation', 'iban_creation',
  'transaction_send', 'transaction_receive',
  'monthly_maintenance', 'amc',
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRate(feeType: 'flat' | 'percent', feeValue: string) {
  return feeType === 'flat' ? parseFloat(feeValue).toFixed(2) : `${parseFloat(feeValue)}%`
}

function findGlobalRule(
  globalConfigs: GlobalFeeConfig[] | undefined,
  category: FeeCategory,
  sourceCurrency: string | null,
  destCurrency: string | null,
): GlobalFeeConfig | undefined {
  if (!globalConfigs) return undefined
  return (
    globalConfigs.find(g => g.fee_category === category && g.source_currency === sourceCurrency && g.dest_currency === destCurrency) ??
    globalConfigs.find(g => g.fee_category === category && g.source_currency === sourceCurrency && g.dest_currency === null) ??
    globalConfigs.find(g => g.fee_category === category && g.source_currency === null && g.dest_currency === null)
  )
}

// ─── Add-form schema ──────────────────────────────────────────────────────────

const makeSchema = (_category: FeeCategory) =>
  z.object({
    sourceCurrency: z.string().optional().nullable(),
    destCurrency:   z.string().optional().nullable(),
    inheritGlobal:  z.boolean().default(false),
    feeType:        z.enum(['flat', 'percent']).optional(),
    feeValue:       z.coerce.number().positive().optional(),
    minFee:         z.coerce.number().min(0).optional().nullable(),
    maxFee:         z.coerce.number().positive().optional().nullable(),
  })

type FormValues = {
  sourceCurrency?: string | null
  destCurrency?: string | null
  inheritGlobal: boolean
  feeType?: 'flat' | 'percent'
  feeValue?: number
  minFee?: number | null
  maxFee?: number | null
}

// ─── Table columns ────────────────────────────────────────────────────────────

function buildColumns(
  category: FeeCategory,
  globalConfigs: GlobalFeeConfig[] | undefined,
  onDelete: (id: string) => void,
  onCustomize: (row: FeeConfig) => void,
  deleting: boolean,
  customizing: boolean,
): Column<FeeConfig>[] {
  const applyCol: Column<FeeConfig> = NO_CURRENCY_CATEGORIES.includes(category)
    ? { key: 'source_currency', header: 'Scope', render: () => <span className="text-xs text-muted-fg italic">Tenant-wide</span> }
    : SINGLE_CURRENCY_CATEGORIES.includes(category)
    ? {
        key: 'source_currency', header: 'Currency',
        render: row => (
          <span className="font-mono text-xs font-bold text-foreground">
            {row.source_currency ?? <span className="font-normal text-muted-fg">Any</span>}
          </span>
        ),
      }
    : {
        key: 'source_currency', header: 'Corridor',
        render: row => (
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
        ),
      }

  return [
    applyCol,
    {
      key: 'fee_type', header: 'Type',
      render: row => row.inherit_global ? (
        <span className="inline-flex items-center gap-1 rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-semibold text-primary">
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
          </svg>
          Same as Global
        </span>
      ) : (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
          row.fee_type === 'flat' ? 'bg-info text-info-fg' : 'bg-primary-subtle text-primary'
        }`}>
          {row.fee_type === 'flat' ? 'Flat' : 'Percent'}
        </span>
      ),
    },
    {
      key: 'fee_value', header: 'Rate',
      render: row => row.inherit_global ? (
        (() => {
          const g = findGlobalRule(globalConfigs, category, row.source_currency, row.dest_currency)
          return g
            ? <span className="text-xs font-medium text-primary">{formatRate(g.fee_type, g.fee_value)}</span>
            : <span className="text-xs text-muted-fg italic">No global rule</span>
        })()
      ) : (
        <span className="font-mono text-sm font-semibold text-foreground">
          {row.fee_type && row.fee_value ? formatRate(row.fee_type, row.fee_value) : '—'}
        </span>
      ),
    },
    {
      key: 'min_fee', header: 'Min / Max',
      render: row => !row.inherit_global && row.fee_type === 'percent' && (row.min_fee || row.max_fee) ? (
        <span className="text-xs text-muted-fg tabular-nums">
          {row.min_fee ? parseFloat(row.min_fee).toFixed(2) : '—'} / {row.max_fee ? parseFloat(row.max_fee).toFixed(2) : '—'}
        </span>
      ) : <span className="text-xs text-muted-fg">—</span>,
    },
    { key: 'is_active', header: 'Active', render: row => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Yes' : 'No'}</Badge> },
    {
      key: 'id', header: '',
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
}

// ─── Per-category section ─────────────────────────────────────────────────────

interface SectionProps {
  category: FeeCategory
  tenantId: string
  rules: FeeConfig[]
  globalConfigs: GlobalFeeConfig[] | undefined
  isLoading: boolean
}

function CategorySection({ category, tenantId, rules, globalConfigs, isLoading }: SectionProps) {
  const [adding, setAdding]             = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)

  const createMutation = useCreateFeeConfig()
  const updateMutation = useUpdateFeeConfig()
  const deleteMutation = useDeleteFeeConfig()

  const isCorridor = CORRIDOR_CATEGORIES.includes(category)
  const isSingle   = SINGLE_CURRENCY_CATEGORIES.includes(category)
  const isNone     = NO_CURRENCY_CATEGORIES.includes(category)

  const schema = makeSchema(category)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { feeType: 'flat', sourceCurrency: '', destCurrency: '', inheritGlobal: false },
  })

  const feeType      = watch('feeType', 'flat')
  const srcCurrency  = watch('sourceCurrency') ?? ''
  const destCurrency = watch('destCurrency')   ?? ''
  const inheritGlobal = watch('inheritGlobal', false)

  const previewGlobal = inheritGlobal
    ? findGlobalRule(globalConfigs, category, srcCurrency || null, destCurrency || null)
    : undefined

  const onAdd = (values: FormValues) => {
    if (!values.inheritGlobal && (!values.feeType || !values.feeValue)) return
    createMutation.mutate(
      {
        tenantId,
        feeCategory:    category,
        sourceCurrency: isNone ? null : (values.sourceCurrency || null),
        destCurrency:   (isNone || isSingle) ? null : (values.destCurrency || null),
        inheritGlobal:  values.inheritGlobal,
        feeType:        values.inheritGlobal ? undefined : values.feeType,
        feeValue:       values.inheritGlobal ? undefined : values.feeValue,
        minFee:         values.inheritGlobal ? undefined : (values.minFee ?? null),
        maxFee:         values.inheritGlobal ? undefined : (values.maxFee ?? null),
      },
      { onSuccess: () => { setAdding(false); reset() } },
    )
  }

  const onCustomize = (row: FeeConfig) => {
    const g = findGlobalRule(globalConfigs, category, row.source_currency, row.dest_currency)
    if (!g) return
    updateMutation.mutate({
      tenantId, feeId: row.id,
      inheritGlobal: false,
      feeType: g.fee_type,
      feeValue: parseFloat(g.fee_value),
      minFee: g.min_fee ? parseFloat(g.min_fee) : null,
      maxFee: g.max_fee ? parseFloat(g.max_fee) : null,
    })
  }

  const confirmDelete = () => {
    if (!deleteDialog) return
    deleteMutation.mutate({ tenantId, feeId: deleteDialog }, { onSuccess: () => setDeleteDialog(null) })
  }

  const columns = buildColumns(
    category, globalConfigs,
    setDeleteDialog, onCustomize,
    deleteMutation.isPending, updateMutation.isPending,
  )

  return (
    <>
      <ContentCard padding="none">
        {/* Section header */}
        <div className="flex items-start justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">{FEE_CATEGORY_LABELS[category]}</h3>
            <p className="mt-0.5 text-xs text-muted-fg">{SECTION_META[category].description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {rules.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-fg tabular-nums">
                {rules.length}
              </span>
            )}
            {!adding && (
              <Button size="sm" variant="outline" onClick={() => setAdding(true)}>
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add rule
              </Button>
            )}
          </div>
        </div>

        {/* Inline add form */}
        {adding && (
          <form onSubmit={handleSubmit(onAdd)} className="border-b border-border bg-muted/40 px-5 py-4">
            {!inheritGlobal && (
              <div className="flex flex-wrap items-start gap-3">
                {isNone && (
                  <p className="text-xs text-muted-fg italic self-center">No currency needed — applies tenant-wide.</p>
                )}
                {isSingle && (
                  <FormField label="Currency" htmlFor={`${category}-src`}>
                    <Select
                      value={srcCurrency}
                      onValueChange={v => setValue('sourceCurrency', v || null)}
                      options={SRC_WILDCARD_OPTIONS}
                    />
                  </FormField>
                )}
                {isCorridor && (
                  <>
                    <FormField label="Source currency" htmlFor={`${category}-src`}>
                      <Select
                        value={srcCurrency}
                        onValueChange={v => setValue('sourceCurrency', v || null)}
                        options={SRC_WILDCARD_OPTIONS}
                      />
                    </FormField>
                    <FormField label="Destination" htmlFor={`${category}-dst`}>
                      <Select
                        value={destCurrency}
                        onValueChange={v => setValue('destCurrency', v || null)}
                        options={DEST_CURRENCY_OPTIONS}
                      />
                    </FormField>
                  </>
                )}

                <FormField label="Type" htmlFor={`${category}-type`}>
                  <Select
                    value={feeType ?? 'flat'}
                    onValueChange={v => setValue('feeType', v as 'flat' | 'percent')}
                    options={[{ value: 'flat', label: 'Flat' }, { value: 'percent', label: 'Percent' }]}
                  />
                </FormField>
                <FormField
                  label={feeType === 'flat' ? 'Amount' : 'Rate (%)'}
                  error={(errors as any).feeValue?.message}
                  htmlFor={`${category}-val`}
                >
                  <Input
                    id={`${category}-val`}
                    type="number"
                    step="0.00000001"
                    placeholder={feeType === 'flat' ? '10.00' : '0.5'}
                    {...register('feeValue')}
                    error={!!(errors as any).feeValue}
                    className="w-28"
                  />
                </FormField>
                {feeType === 'percent' && (
                  <>
                    <FormField label="Min fee" htmlFor={`${category}-min`}>
                      <Input id={`${category}-min`} type="number" step="0.01" placeholder="0.00" {...register('minFee')} className="w-24" />
                    </FormField>
                    <FormField label="Max fee" htmlFor={`${category}-max`}>
                      <Input id={`${category}-max`} type="number" step="0.01" placeholder="500.00" {...register('maxFee')} className="w-24" />
                    </FormField>
                  </>
                )}
              </div>
            )}

            {/* Same as Global */}
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={inheritGlobal}
                onChange={e => setValue('inheritGlobal', e.target.checked)}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <span className="font-medium text-foreground">Same as Global</span>
              <span className="text-muted-fg">— inherit the platform-wide fee</span>
            </label>

            {inheritGlobal && (
              <div className="mt-2 flex items-center gap-2 rounded-md border border-primary/20 bg-primary-subtle/30 px-3 py-2 text-sm">
                <svg className="h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {previewGlobal ? (
                  <span className="text-foreground">
                    Effective fee: <strong>{formatRate(previewGlobal.fee_type, previewGlobal.fee_value)}</strong>
                    {previewGlobal.fee_type === 'percent' && (previewGlobal.min_fee || previewGlobal.max_fee) && (
                      <span className="ml-1 text-muted-fg">
                        (min {previewGlobal.min_fee ? parseFloat(previewGlobal.min_fee).toFixed(2) : '0'} /
                        max {previewGlobal.max_fee ? parseFloat(previewGlobal.max_fee).toFixed(2) : '∞'})
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-fg italic">No global rule for this category — fee will be zero until one is set.</span>
                )}
              </div>
            )}

            {createMutation.isError && (
              <p className="mt-2 text-xs text-danger-fg">
                {getApiError(createMutation.error, 'Could not save fee rule.')}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button type="submit" size="sm" loading={createMutation.isPending}>Save</Button>
              <Button type="button" size="sm" variant="ghost"
                onClick={() => { setAdding(false); reset(); createMutation.reset() }}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        {/* Rules table */}
        {isLoading ? (
          <LoadingState message="Loading…" />
        ) : rules.length === 0 && !adding ? (
          <p className="px-5 py-6 text-sm text-muted-fg italic">
            No rules configured — falls back to{' '}
            <Link to="/admin/global-fees" className="text-primary underline-offset-2 hover:underline">
              global fee
            </Link>{' '}
            (or zero if none set).
          </p>
        ) : (
          <DataTable columns={columns} data={rules} getRowId={r => r.id} emptyTitle="No rules" />
        )}
      </ContentCard>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={open => { if (!open) setDeleteDialog(null) }}
        title="Delete fee rule"
        description="This rule will be removed. Charges will revert to the global fee (or zero) for this category."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </>
  )
}

// ─── Page component ───────────────────────────────────────────────────────────

interface Props {
  tenantId: string
  tenantName?: string
}

export function TenantFeeRules({ tenantId, tenantName }: Props) {
  const navigate = useNavigate()
  const { data: feeConfigs, isLoading } = useFeeConfigs(tenantId)
  const { data: globalFeeConfigs }       = useGlobalFeeConfigs()

  const byCategory = (cat: FeeCategory) =>
    (feeConfigs ?? []).filter(r => r.fee_category === cat)

  return (
    <div className="flex flex-col gap-4">
      {/* Sub-header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-fg">
          Rules for <span className="font-medium text-foreground">{tenantName ?? 'this tenant'}</span>.
          No custom rule = falls back to{' '}
          <Link to="/admin/global-fees" className="text-primary underline-offset-2 hover:underline">
            global fee
          </Link>.
        </p>
        <Button size="sm" variant="ghost" onClick={() => navigate('/admin/global-fees')}>
          Manage global rules
        </Button>
      </div>

      {SECTION_ORDER.map(category => (
        <CategorySection
          key={category}
          category={category}
          tenantId={tenantId}
          rules={byCategory(category)}
          globalConfigs={globalFeeConfigs}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
