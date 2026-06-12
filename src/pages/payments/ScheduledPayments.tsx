import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format, parseISO } from 'date-fns'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Drawer } from '@/components/ui/molecules/Drawer'
import { ContentCard } from '@/layouts/ContentCard'
import { getApiError } from '@/lib/apiError'
import {
  useScheduledPayments,
  useCreateScheduledPayment,
  useCancelScheduledPayment,
} from '@/hooks/useScheduledPayments'
import { useBeneficiaries } from '@/hooks/useBeneficiaries'
import { useAccounts } from '@/hooks/useAccounts'
import type { ScheduledPayment, ScheduleStatus } from '@/api/scheduledPayments'
import type { Column } from '@/components/ui/organisms/DataTable'

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'GBP', 'EUR', 'AED', 'INR', 'SGD', 'AUD', 'CAD', 'NGN', 'PKR']
const PURPOSE_CODES = ['TRADE', 'SUPPLIER', 'SALARY', 'SERVICES', 'CONTRACTOR', 'OTHER']

const STATUS_VARIANT: Record<ScheduleStatus, 'success' | 'warning' | 'default' | 'danger'> = {
  active:    'success',
  cancelled: 'danger',
  completed: 'default',
}

const FREQUENCY_LABELS: Record<string, string> = {
  once:    'One-time',
  weekly:  'Weekly',
  monthly: 'Monthly',
}

const STATUS_CHIPS = [
  { value: '',           label: 'All'       },
  { value: 'active',     label: 'Active'    },
  { value: 'completed',  label: 'Completed' },
  { value: 'cancelled',  label: 'Cancelled' },
]

// ─── Form schema ──────────────────────────────────────────────────────────────

const tomorrow = () => {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setSeconds(0, 0)
  return d.toISOString().slice(0, 16)
}

const schema = z.object({
  beneficiaryId:  z.string().uuid('Select a beneficiary'),
  accountId:      z.string().uuid('Select a source account'),
  sourceCurrency: z.string().length(3),
  destCurrency:   z.string().length(3),
  sourceAmount:   z.coerce.number().positive('Enter a positive amount'),
  purposeCode:    z.string().min(1, 'Select a purpose'),
  note:           z.string().max(1024).optional().nullable(),
  frequency:      z.enum(['once', 'weekly', 'monthly']),
  scheduledFor:   z.string().min(1, 'Pick a date and time'),
  endDate:        z.string().optional().nullable(),
})

type FormValues = z.infer<typeof schema>

// ─── Create form ──────────────────────────────────────────────────────────────

function CreateForm({ onClose }: { onClose: () => void }) {
  const createMutation = useCreateScheduledPayment()
  const { data: beneficiariesData } = useBeneficiaries({ limit: 200 })
  const { data: accounts } = useAccounts()

  const beneficiaries = beneficiariesData?.data ?? []

  const beneficiaryOptions = beneficiaries.map(b => ({
    value: b.id,
    label: `${b.name} (${b.currency ?? b.dest_country_code ?? ''})`,
  }))
  const accountOptions = (accounts ?? []).map(a => ({
    value: a.id,
    label: `${a.currency} — ${a.account_number_ref ?? a.id.slice(0, 8)}`,
  }))

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      frequency:      'once',
      sourceCurrency: 'USD',
      destCurrency:   'USD',
      scheduledFor:   tomorrow(),
    },
  })

  const frequency = watch('frequency')

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      {
        beneficiaryId:  values.beneficiaryId,
        accountId:      values.accountId,
        sourceCurrency: values.sourceCurrency,
        destCurrency:   values.destCurrency,
        sourceAmount:   values.sourceAmount,
        purposeCode:    values.purposeCode,
        note:           values.note || null,
        frequency:      values.frequency,
        scheduledFor:   new Date(values.scheduledFor).toISOString(),
        endDate:        values.endDate ? new Date(values.endDate).toISOString() : null,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5 p-1">
      <FormField label="Beneficiary" error={errors.beneficiaryId?.message} htmlFor="sp-ben">
        <Select
          value={watch('beneficiaryId') ?? ''}
          onValueChange={v => setValue('beneficiaryId', v, { shouldValidate: true })}
          options={[{ value: '', label: 'Select beneficiary…' }, ...beneficiaryOptions]}
        />
      </FormField>

      <FormField label="Source account" error={errors.accountId?.message} htmlFor="sp-acc">
        <Select
          value={watch('accountId') ?? ''}
          onValueChange={v => setValue('accountId', v, { shouldValidate: true })}
          options={[{ value: '', label: 'Select account…' }, ...accountOptions]}
        />
      </FormField>

      <div className="grid grid-cols-2 gap-3">
        <FormField label="You send" error={errors.sourceCurrency?.message} htmlFor="sp-src-cur">
          <Select
            value={watch('sourceCurrency')}
            onValueChange={v => setValue('sourceCurrency', v)}
            options={CURRENCIES.map(c => ({ value: c, label: c }))}
          />
        </FormField>
        <FormField label="They receive" error={errors.destCurrency?.message} htmlFor="sp-dst-cur">
          <Select
            value={watch('destCurrency')}
            onValueChange={v => setValue('destCurrency', v)}
            options={CURRENCIES.map(c => ({ value: c, label: c }))}
          />
        </FormField>
      </div>

      <FormField label="Amount" error={errors.sourceAmount?.message} htmlFor="sp-amount">
        <Input
          id="sp-amount"
          type="number"
          step="0.01"
          placeholder="1000.00"
          {...register('sourceAmount')}
          error={!!errors.sourceAmount}
        />
      </FormField>

      <FormField label="Purpose" error={errors.purposeCode?.message} htmlFor="sp-purpose">
        <Select
          value={watch('purposeCode') ?? ''}
          onValueChange={v => setValue('purposeCode', v, { shouldValidate: true })}
          options={[
            { value: '', label: 'Select purpose…' },
            ...PURPOSE_CODES.map(p => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() })),
          ]}
        />
      </FormField>

      <FormField label="Note (optional)" htmlFor="sp-note">
        <Input id="sp-note" placeholder="Optional note to beneficiary" {...register('note')} />
      </FormField>

      <FormField label="Frequency" htmlFor="sp-freq">
        <Select
          value={watch('frequency')}
          onValueChange={v => setValue('frequency', v as 'once' | 'weekly' | 'monthly')}
          options={[
            { value: 'once',    label: 'One-time' },
            { value: 'weekly',  label: 'Weekly'   },
            { value: 'monthly', label: 'Monthly'  },
          ]}
        />
      </FormField>

      <FormField label="Scheduled for" error={errors.scheduledFor?.message} htmlFor="sp-date">
        <Input
          id="sp-date"
          type="datetime-local"
          {...register('scheduledFor')}
          error={!!errors.scheduledFor}
        />
      </FormField>

      {frequency !== 'once' && (
        <FormField label="End date (optional)" htmlFor="sp-end">
          <Input
            id="sp-end"
            type="datetime-local"
            {...register('endDate')}
          />
        </FormField>
      )}

      {createMutation.isError && (
        <p className="text-sm text-danger-fg">
          {getApiError(createMutation.error, 'Could not create scheduled payment.')}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <Button type="submit" loading={createMutation.isPending}>
          Schedule payment
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function ScheduledPayments() {
  const [statusFilter, setStatusFilter] = useState('')
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [cancelId, setCancelId]         = useState<string | null>(null)

  const { data, isLoading, isError } = useScheduledPayments(
    statusFilter ? { status: statusFilter } : undefined
  )
  const cancelMutation = useCancelScheduledPayment()

  const rows = data?.data ?? []

  const columns: Column<ScheduledPayment>[] = [
    {
      key: 'scheduled_for',
      header: 'Next run',
      render: row => (
        <span className="text-sm tabular-nums">
          {row.status === 'active'
            ? format(parseISO(row.scheduled_for), 'dd MMM yyyy, HH:mm')
            : <span className="text-muted-fg italic">—</span>}
        </span>
      ),
    },
    {
      key: 'source_currency',
      header: 'Amount',
      render: row => (
        <span className="font-mono text-sm font-semibold tabular-nums">
          {parseFloat(row.source_amount).toFixed(2)} {row.source_currency}
          <span className="text-muted-fg font-normal mx-1">→</span>
          {row.dest_currency}
        </span>
      ),
    },
    {
      key: 'frequency',
      header: 'Frequency',
      render: row => (
        <span className="text-sm text-muted-fg">{FREQUENCY_LABELS[row.frequency] ?? row.frequency}</span>
      ),
    },
    {
      key: 'execution_count',
      header: 'Runs',
      render: row => (
        <span className="text-sm tabular-nums text-muted-fg">{row.execution_count}</span>
      ),
    },
    {
      key: 'last_executed_at',
      header: 'Last run',
      render: row => (
        <span className="text-xs text-muted-fg tabular-nums">
          {row.last_executed_at
            ? format(parseISO(row.last_executed_at), 'dd MMM yyyy')
            : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <Badge variant={STATUS_VARIANT[row.status] ?? 'default'}>
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'id',
      header: '',
      render: row =>
        row.status === 'active' ? (
          <button
            onClick={() => setCancelId(row.id)}
            className="rounded px-2 py-1 text-xs text-danger-fg hover:bg-danger/10 transition-colors"
          >
            Cancel
          </button>
        ) : null,
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Scheduled payments"
        description="One-time and recurring payments that execute automatically at the scheduled time."
        action={
          <Button onClick={() => setDrawerOpen(true)}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Schedule payment
          </Button>
        }
      />

      {/* Status filter chips */}
      <div className="flex flex-wrap gap-2">
        {STATUS_CHIPS.map(chip => (
          <button
            key={chip.value}
            onClick={() => setStatusFilter(chip.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
              statusFilter === chip.value
                ? 'bg-primary text-white border-primary'
                : 'border-border text-muted-fg hover:border-primary/50 hover:text-foreground'
            }`}
          >
            {chip.label}
          </button>
        ))}
      </div>

      <ContentCard padding="none">
        {isLoading ? (
          <LoadingState message="Loading scheduled payments…" />
        ) : isError ? (
          <ErrorState message="Could not load scheduled payments." />
        ) : (
          <DataTable
            columns={columns}
            data={rows}
            getRowId={r => r.id}
            emptyTitle="No scheduled payments"
            emptyDescription="Click 'Schedule payment' to set one up."
          />
        )}
      </ContentCard>

      {/* Create drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Schedule a payment"
        width="w-[480px]"
      >
        <CreateForm onClose={() => setDrawerOpen(false)} />
      </Drawer>

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelId}
        onOpenChange={open => { if (!open) setCancelId(null) }}
        title="Cancel scheduled payment"
        description="This scheduled payment will be cancelled and will no longer execute. This cannot be undone."
        confirmLabel="Cancel payment"
        variant="danger"
        onConfirm={() => {
          if (!cancelId) return
          cancelMutation.mutate(cancelId, { onSuccess: () => setCancelId(null) })
        }}
        loading={cancelMutation.isPending}
      />
    </div>
  )
}
