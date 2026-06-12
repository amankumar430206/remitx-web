import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { FormField } from '@/components/ui/molecules/FormField'
import { ContentCard } from '@/layouts/ContentCard'
import { getApiError } from '@/lib/apiError'
import { useCreateScheduledPayment } from '@/hooks/useScheduledPayments'
import { useBeneficiaries } from '@/hooks/useBeneficiaries'
import { useAccounts } from '@/hooks/useAccounts'

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENCIES = ['USD', 'GBP', 'EUR', 'AED', 'INR', 'SGD', 'AUD', 'CAD', 'NGN', 'PKR']

const PURPOSE_OPTIONS = [
  { value: '',           label: 'Select purpose…' },
  { value: 'TRADE',      label: 'Trade / Goods' },
  { value: 'SUPPLIER',   label: 'Supplier Payment' },
  { value: 'SALARY',     label: 'Salary / Wages' },
  { value: 'SERVICES',   label: 'Services' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'OTHER',      label: 'Other' },
]

// ─── Schema ───────────────────────────────────────────────────────────────────

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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function NewScheduledPayment() {
  const navigate = useNavigate()
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
      { onSuccess: () => navigate('/payments/scheduled') },
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-lg mx-auto">
      <PageHeader
        title="Schedule a payment"
        description="Set up a one-time or recurring payment that executes automatically."
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Scheduled payments', href: '/payments/scheduled' },
          { label: 'New scheduled payment' },
        ]}
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/payments/scheduled')}>
            Cancel
          </Button>
        }
      />

      <ContentCard>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">

          {/* ── Recipient & account ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Recipient & account
            </p>
            <div className="flex flex-col gap-4">
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
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── Amount & currencies ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Amount
            </p>
            <div className="flex flex-col gap-4">
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
                  min="0.01"
                  placeholder="1000.00"
                  {...register('sourceAmount')}
                  error={!!errors.sourceAmount}
                />
              </FormField>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── Payment details ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Payment details
            </p>
            <div className="flex flex-col gap-4">
              <FormField label="Purpose" error={errors.purposeCode?.message} htmlFor="sp-purpose">
                <Select
                  value={watch('purposeCode') ?? ''}
                  onValueChange={v => setValue('purposeCode', v, { shouldValidate: true })}
                  options={PURPOSE_OPTIONS}
                />
              </FormField>

              <FormField label="Note (optional)" htmlFor="sp-note">
                <Input
                  id="sp-note"
                  placeholder="Optional note to beneficiary"
                  {...register('note')}
                />
              </FormField>
            </div>
          </div>

          <div className="border-t border-border" />

          {/* ── Schedule ── */}
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-fg">
              Schedule
            </p>
            <div className="flex flex-col gap-4">
              <FormField label="Frequency" htmlFor="sp-freq">
                <Select
                  value={watch('frequency')}
                  onValueChange={v => setValue('frequency', v as 'once' | 'weekly' | 'monthly')}
                  options={[
                    { value: 'once',    label: 'One-time — runs once on the scheduled date' },
                    { value: 'weekly',  label: 'Weekly — repeats every 7 days'              },
                    { value: 'monthly', label: 'Monthly — repeats on the same day each month' },
                  ]}
                />
              </FormField>

              <FormField
                label={frequency === 'once' ? 'Scheduled for' : 'First run'}
                error={errors.scheduledFor?.message}
                htmlFor="sp-date"
              >
                <Input
                  id="sp-date"
                  type="datetime-local"
                  {...register('scheduledFor')}
                  error={!!errors.scheduledFor}
                />
              </FormField>

              {frequency !== 'once' && (
                <FormField
                  label="End date (optional)"
                  htmlFor="sp-end"
                  hint="Leave blank to repeat indefinitely"
                >
                  <Input
                    id="sp-end"
                    type="datetime-local"
                    {...register('endDate')}
                  />
                </FormField>
              )}
            </div>
          </div>

          {/* ── Info callout ── */}
          <div className="flex items-start gap-3 rounded-xl bg-primary-subtle border border-primary/20 px-4 py-3">
            <svg className="mt-0.5 h-4 w-4 shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-primary/80 leading-relaxed">
              A live FX rate is fetched at execution time. You'll receive an alert if your account
              balance is insufficient 5 days before the payment is due.
            </p>
          </div>

          {createMutation.isError && (
            <p className="rounded-xl border border-danger/30 bg-danger/8 px-4 py-3 text-sm text-danger-fg">
              {getApiError(createMutation.error, 'Could not schedule this payment.')}
            </p>
          )}

          {/* ── Actions ── */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/payments/scheduled')}
            >
              Cancel
            </Button>
            <Button type="submit" loading={createMutation.isPending} className="px-8">
              Schedule payment
            </Button>
          </div>
        </form>
      </ContentCard>
    </div>
  )
}
