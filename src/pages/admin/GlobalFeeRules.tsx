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
  FEE_CATEGORY_LABELS,
  CORRIDOR_CATEGORIES, SINGLE_CURRENCY_CATEGORIES, NO_CURRENCY_CATEGORIES,
  type FeeCategory, type GlobalFeeConfig,
} from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const CURRENCIES = [
  'USD', 'GBP', 'EUR', 'AED', 'INR', 'SGD', 'AUD', 'CAD', 'JPY', 'SAR',
  'PKR', 'NGN', 'CNY', 'PHP', 'BRL', 'IDR', 'EGP', 'TRY', 'VND',
] as const
const CURRENCY_OPTIONS     = CURRENCIES.map(c => ({ value: c, label: c }))
const DEST_CURRENCY_OPTIONS = [{ value: '', label: 'Any (wildcard)' }, ...CURRENCY_OPTIONS]
const SRC_WILDCARD_OPTIONS  = [{ value: '', label: 'Any currency (wildcard)' }, ...CURRENCY_OPTIONS]

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

// ─── Add-form schema ──────────────────────────────────────────────────────────

const makeSchema = (category: FeeCategory) =>
  z.object({
    sourceCurrency: CORRIDOR_CATEGORIES.includes(category)
      ? z.string().min(1, 'Required')
      : z.string().optional().nullable(),
    destCurrency:   z.string().optional().nullable(),
    feeType:        z.enum(['flat', 'percent']),
    feeValue:       z.coerce.number().positive('Required'),
    minFee:         z.coerce.number().min(0).optional().nullable(),
    maxFee:         z.coerce.number().positive().optional().nullable(),
  })

type FormValues = {
  sourceCurrency?: string | null
  destCurrency?: string | null
  feeType: 'flat' | 'percent'
  feeValue: number
  minFee?: number | null
  maxFee?: number | null
}

// ─── Table columns ────────────────────────────────────────────────────────────

function rateCell(row: GlobalFeeConfig) {
  return (
    <span className="font-mono text-sm font-semibold text-foreground">
      {row.fee_type === 'flat'
        ? parseFloat(row.fee_value).toFixed(2)
        : `${parseFloat(row.fee_value)}%`}
    </span>
  )
}

function minMaxCell(row: GlobalFeeConfig) {
  return row.fee_type === 'percent' && (row.min_fee || row.max_fee) ? (
    <span className="text-xs text-muted-fg tabular-nums">
      {row.min_fee ? parseFloat(row.min_fee).toFixed(2) : '—'} / {row.max_fee ? parseFloat(row.max_fee).toFixed(2) : '—'}
    </span>
  ) : <span className="text-xs text-muted-fg">—</span>
}

function buildColumns(category: FeeCategory, onDelete: (id: string) => void, deleting: boolean): Column<GlobalFeeConfig>[] {
  const applyCol: Column<GlobalFeeConfig> = NO_CURRENCY_CATEGORIES.includes(category)
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
      render: row => (
        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
          row.fee_type === 'flat' ? 'bg-info text-info-fg' : 'bg-primary-subtle text-primary'
        }`}>
          {row.fee_type === 'flat' ? 'Flat' : 'Percent'}
        </span>
      ),
    },
    { key: 'fee_value', header: 'Rate', render: rateCell },
    { key: 'min_fee',   header: 'Min / Max', render: minMaxCell },
    { key: 'is_active', header: 'Active', render: row => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Yes' : 'No'}</Badge> },
    {
      key: 'id', header: '',
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
}

// ─── Per-category section ─────────────────────────────────────────────────────

interface SectionProps {
  category: FeeCategory
  rules: GlobalFeeConfig[]
  isLoading: boolean
}

function CategorySection({ category, rules, isLoading }: SectionProps) {
  const [adding, setAdding] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)

  const createMutation = useCreateGlobalFeeConfig()
  const deleteMutation = useDeleteGlobalFeeConfig()

  const isCorridor = CORRIDOR_CATEGORIES.includes(category)
  const isSingle   = SINGLE_CURRENCY_CATEGORIES.includes(category)
  const isNone     = NO_CURRENCY_CATEGORIES.includes(category)

  const schema = makeSchema(category)
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { feeType: 'flat', sourceCurrency: '', destCurrency: '' },
  })

  const feeType       = watch('feeType', 'flat')
  const srcCurrency   = watch('sourceCurrency') ?? ''
  const destCurrency  = watch('destCurrency')   ?? ''

  const onAdd = (values: FormValues) => {
    createMutation.mutate(
      {
        feeCategory:    category,
        sourceCurrency: isNone ? null : (values.sourceCurrency || null),
        destCurrency:   (isNone || isSingle) ? null : (values.destCurrency || null),
        feeType:        values.feeType,
        feeValue:       values.feeValue,
        minFee:         values.minFee ?? null,
        maxFee:         values.maxFee ?? null,
      },
      { onSuccess: () => { setAdding(false); reset() } },
    )
  }

  const confirmDelete = () => {
    if (!deleteDialog) return
    deleteMutation.mutate(deleteDialog, { onSuccess: () => setDeleteDialog(null) })
  }

  const columns = buildColumns(category, setDeleteDialog, deleteMutation.isPending)

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
            <div className="flex flex-wrap items-end gap-3">
              {/* Currency fields — context-aware */}
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
                  <FormField label="Source currency" error={(errors as any).sourceCurrency?.message} htmlFor={`${category}-src`}>
                    <Select
                      value={srcCurrency}
                      onValueChange={v => setValue('sourceCurrency', v, { shouldValidate: true })}
                      options={CURRENCY_OPTIONS}
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

              {/* Fee type */}
              <FormField label="Type" htmlFor={`${category}-type`}>
                <Select
                  value={feeType}
                  onValueChange={v => setValue('feeType', v as 'flat' | 'percent')}
                  options={[{ value: 'flat', label: 'Flat' }, { value: 'percent', label: 'Percent' }]}
                />
              </FormField>

              {/* Fee value */}
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

              {/* Min / Max — only for percent */}
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
            No rules configured — tenants inherit zero fee for this category.
          </p>
        ) : (
          <DataTable columns={columns} data={rules} getRowId={r => r.id} emptyTitle="No rules" />
        )}
      </ContentCard>

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={open => { if (!open) setDeleteDialog(null) }}
        title="Delete rule"
        description="This global rule will be removed. Tenants inheriting it will fall back to zero fee for this category."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        loading={deleteMutation.isPending}
      />
    </>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function GlobalFeeRules() {
  const { data: feeConfigs, isLoading } = useGlobalFeeConfigs()

  const byCategory = (cat: FeeCategory) =>
    (feeConfigs ?? []).filter(r => r.fee_category === cat)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Global fee rules"
        description="Platform-wide defaults applied to every tenant that has no custom override for a given category."
      />

      <div className="rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning-fg">
        <strong>Heads up:</strong> Changes here affect every tenant that hasn't set a custom rule for that category or corridor. Tenants with their own rules are unaffected.
      </div>

      {SECTION_ORDER.map(category => (
        <CategorySection
          key={category}
          category={category}
          rules={byCategory(category)}
          isLoading={isLoading}
        />
      ))}
    </div>
  )
}
