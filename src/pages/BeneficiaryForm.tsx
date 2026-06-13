import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { getApiError } from '@/lib/apiError'
import type { Beneficiary, CreateBeneficiaryPayload } from '@/api/beneficiaries'

// ─── Country configs ──────────────────────────────────────────────────────────

const COUNTRY_CONFIGS = {
  US:    { label: 'United States',        currency: 'USD', routingLabel: 'ABA Routing Number (9 digits)', routingField: 'routingNumber' as const, accountLabel: 'Account number' },
  GB:    { label: 'United Kingdom',       currency: 'GBP', routingLabel: 'Sort Code (6 digits)',          routingField: 'sortCode' as const,       accountLabel: 'Account number' },
  IN:    { label: 'India',               currency: 'INR', routingLabel: 'IFSC Code',                     routingField: 'ifscCode' as const,       accountLabel: 'Account number' },
  AU:    { label: 'Australia',           currency: 'AUD', routingLabel: 'BSB Code',                      routingField: 'routingNumber' as const,  accountLabel: 'Account number' },
  CA:    { label: 'Canada',              currency: 'CAD', routingLabel: 'Transit Number',                routingField: 'routingNumber' as const,  accountLabel: 'Account number' },
  SG:    { label: 'Singapore',           currency: 'SGD', swiftLabel: 'SWIFT / BIC',                    accountLabel: 'Account number' },
  HK:    { label: 'Hong Kong',           currency: 'HKD', swiftLabel: 'SWIFT / BIC',                    accountLabel: 'Account number' },
  DE:    { label: 'Germany (SEPA)',       currency: 'EUR', swiftLabel: 'BIC / SWIFT',                    accountLabel: 'IBAN', useIban: true },
  FR:    { label: 'France (SEPA)',        currency: 'EUR', swiftLabel: 'BIC / SWIFT',                    accountLabel: 'IBAN', useIban: true },
  ES:    { label: 'Spain (SEPA)',         currency: 'EUR', swiftLabel: 'BIC / SWIFT',                    accountLabel: 'IBAN', useIban: true },
  NL:    { label: 'Netherlands (SEPA)',   currency: 'EUR', swiftLabel: 'BIC / SWIFT',                    accountLabel: 'IBAN', useIban: true },
  BE:    { label: 'Belgium (SEPA)',       currency: 'EUR', swiftLabel: 'BIC / SWIFT',                    accountLabel: 'IBAN', useIban: true },
  IT:    { label: 'Italy (SEPA)',         currency: 'EUR', swiftLabel: 'BIC / SWIFT',                    accountLabel: 'IBAN', useIban: true },
  AE:    { label: 'United Arab Emirates', currency: 'AED', swiftLabel: 'SWIFT Code',                    accountLabel: 'IBAN', useIban: true },
  OTHER: { label: 'Other',               currency: '',    swiftLabel: 'SWIFT / BIC',                    accountLabel: 'Account number' },
} as const

type CountryCode = keyof typeof COUNTRY_CONFIGS

const COUNTRY_OPTIONS = Object.entries(COUNTRY_CONFIGS).map(([value, { label }]) => ({ value, label }))

const PURPOSE_OPTIONS = [
  { value: 'SALARY',     label: 'Salary' },
  { value: 'SERVICES',   label: 'Services' },
  { value: 'TRADE',      label: 'Trade' },
  { value: 'SUPPLIER',   label: 'Supplier payment' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'OTHER',      label: 'Other' },
]

const TRANSFER_METHOD_OPTIONS = [
  { value: '',               label: '— Auto (based on corridor) —' },
  { value: 'SWIFT',          label: 'SWIFT' },
  { value: 'LOCAL',          label: 'Local transfer' },
  { value: 'SEPA',           label: 'SEPA' },
  { value: 'ACH',            label: 'ACH' },
  { value: 'WIRE',           label: 'Wire' },
  { value: 'FASTER_PAYMENTS', label: 'Faster Payments (UK)' },
]

// ─── Zod schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  entityType:     z.enum(['INDIVIDUAL', 'COMPANY']),
  firstName:      z.string().optional().default(''),
  lastName:       z.string().optional().default(''),
  name:           z.string().min(1, 'Name is required'),
  countryCode:    z.string().min(2, 'Country is required'),
  currency:       z.string().min(1, 'Currency is required'),
  purposeCode:    z.string().min(1, 'Purpose is required'),
  transferMethod: z.string().optional().default(''),
  bankName:       z.string().optional().default(''),
  accountName:    z.string().optional().default(''),
  account:        z.string().optional().default(''),  // iban or accountNumber
  routing:        z.string().optional().default(''),  // routingNumber / sortCode / ifscCode
  swiftBic:       z.string().optional().default(''),
  addressLine1:   z.string().optional().default(''),
  addressLine2:   z.string().optional().default(''),
  city:           z.string().optional().default(''),
  state:          z.string().optional().default(''),
  postalCode:     z.string().optional().default(''),
})

type FormValues = z.infer<typeof schema>

// ─── Payload builder ──────────────────────────────────────────────────────────

function buildPayload(values: FormValues): CreateBeneficiaryPayload {
  const cc = values.countryCode as CountryCode
  const cfg = COUNTRY_CONFIGS[cc]
  const payload: CreateBeneficiaryPayload = {
    entityType:     values.entityType,
    name:           values.name,
    firstName:      values.firstName  || null,
    lastName:       values.lastName   || null,
    countryCode:    values.countryCode,
    currency:       values.currency,
    purposeCode:    values.purposeCode,
    transferMethod: values.transferMethod || null,
    bankName:       values.bankName   || null,
    accountName:    values.accountName || null,
    addressLine1:   values.addressLine1 || null,
    addressLine2:   values.addressLine2 || null,
    city:           values.city       || null,
    state:          values.state      || null,
    postalCode:     values.postalCode || null,
  }

  if (cfg && 'useIban' in cfg && cfg.useIban) {
    payload.iban = values.account || null
  } else {
    payload.accountNumber = values.account || null
  }

  if (values.routing && cfg && 'routingField' in cfg) {
    const field = cfg.routingField
    payload[field] = values.routing
  }

  if (values.swiftBic) payload.swiftBic = values.swiftBic

  return payload
}

// ─── Default values from existing beneficiary ─────────────────────────────────

function beneficiaryToDefaults(b: Beneficiary): FormValues {
  const cc = b.country_code as CountryCode
  const cfg = COUNTRY_CONFIGS[cc]
  const useIban = cfg && 'useIban' in cfg && cfg.useIban
  const routingField = cfg && 'routingField' in cfg ? cfg.routingField : null

  return {
    entityType:     (b.entity_type as 'INDIVIDUAL' | 'COMPANY') ?? 'INDIVIDUAL',
    firstName:      b.first_name   ?? '',
    lastName:       b.last_name    ?? '',
    name:           b.name,
    countryCode:    b.country_code,
    currency:       b.currency,
    purposeCode:    b.purpose_code ?? '',
    transferMethod: b.transfer_method ?? '',
    bankName:       b.bank_name    ?? '',
    accountName:    b.account_name ?? '',
    account:        (useIban ? b.iban : b.account_number) ?? '',
    routing:        (routingField === 'sortCode' ? b.sort_code : routingField === 'ifscCode' ? b.ifsc_code : b.routing_number) ?? '',
    swiftBic:       b.swift_bic    ?? '',
    addressLine1:   b.address_line1 ?? '',
    addressLine2:   b.address_line2 ?? '',
    city:           b.city         ?? '',
    state:          b.state        ?? '',
    postalCode:     b.postal_code  ?? '',
  }
}

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title }: { title: string }) {
  return (
    <div className="pt-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-fg">{title}</h3>
      <hr className="mt-2 border-border" />
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  initial?: Beneficiary
  submitLabel: string
  onSubmit: (payload: CreateBeneficiaryPayload) => void
  onCancel: () => void
  isPending?: boolean
  error?: unknown
}

export function BeneficiaryForm({ initial, submitLabel, onSubmit, onCancel, isPending, error }: Props) {
  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initial
      ? beneficiaryToDefaults(initial)
      : {
          entityType: 'INDIVIDUAL',
          countryCode: '', currency: '', purposeCode: '',
          transferMethod: '', bankName: '', accountName: '',
          account: '', routing: '', swiftBic: '',
          firstName: '', lastName: '', name: '',
          addressLine1: '', addressLine2: '', city: '', state: '', postalCode: '',
        },
  })

  useEffect(() => {
    if (initial) reset(beneficiaryToDefaults(initial))
  }, [initial, reset])

  const entityType = watch('entityType')
  const countryCode = watch('countryCode') as CountryCode | ''
  const cfg = countryCode ? COUNTRY_CONFIGS[countryCode] : null

  // Auto-fill currency when country changes (only on new forms)
  useEffect(() => {
    if (!countryCode || initial) return
    const c = COUNTRY_CONFIGS[countryCode as CountryCode]
    if (c?.currency) setValue('currency', c.currency)
    setValue('account', '')
    setValue('routing', '')
    setValue('swiftBic', '')
  }, [countryCode, setValue, initial])

  const handleFormSubmit = (values: FormValues) => {
    onSubmit(buildPayload(values))
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)}>
      <ContentCard>
        <div className="flex flex-col gap-5">

          {/* ── Entity type ── */}
          <Section title="Entity" />
          <div className="flex gap-2">
            {(['INDIVIDUAL', 'COMPANY'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setValue('entityType', type)}
                className={[
                  'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                  entityType === type
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-muted-fg hover:border-border-strong hover:text-foreground',
                ].join(' ')}
              >
                {type === 'INDIVIDUAL' ? 'Individual' : 'Company'}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entityType === 'INDIVIDUAL' ? (
              <>
                <FormField label="First name" htmlFor="firstName" error={errors.firstName?.message}>
                  <Input id="firstName" {...register('firstName')} placeholder="Jane" error={!!errors.firstName} />
                </FormField>
                <FormField label="Last name" htmlFor="lastName" error={errors.lastName?.message}>
                  <Input id="lastName" {...register('lastName')} placeholder="Smith" error={!!errors.lastName} />
                </FormField>
                <FormField label="Full name (display)" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
                  <Input id="name" {...register('name')} placeholder="Jane Smith" error={!!errors.name} />
                </FormField>
              </>
            ) : (
              <FormField label="Company name" htmlFor="name" error={errors.name?.message} required className="sm:col-span-2">
                <Input id="name" {...register('name')} placeholder="Acme Ltd" error={!!errors.name} />
              </FormField>
            )}
          </div>

          {/* ── Corridor ── */}
          <Section title="Corridor" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Country" htmlFor="countryCode" error={errors.countryCode?.message} required>
              <Select
                value={watch('countryCode')}
                onValueChange={v => setValue('countryCode', v)}
                options={COUNTRY_OPTIONS}
                placeholder="Select country…"
                error={!!errors.countryCode}
              />
            </FormField>

            <FormField label="Currency" htmlFor="currency" error={errors.currency?.message} required>
              <Input id="currency" {...register('currency')} placeholder="USD" className="uppercase" error={!!errors.currency} />
            </FormField>

            <FormField label="Purpose" htmlFor="purposeCode" error={errors.purposeCode?.message} required>
              <Select
                value={watch('purposeCode')}
                onValueChange={v => setValue('purposeCode', v)}
                options={PURPOSE_OPTIONS}
                placeholder="Select purpose…"
                error={!!errors.purposeCode}
              />
            </FormField>

            <FormField label="Transfer method" htmlFor="transferMethod">
              <Select
                value={watch('transferMethod') ?? ''}
                onValueChange={v => setValue('transferMethod', v)}
                options={TRANSFER_METHOD_OPTIONS}
              />
            </FormField>
          </div>

          {/* ── Bank details ── */}
          <Section title="Bank details" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Bank name" htmlFor="bankName" error={errors.bankName?.message}>
              <Input id="bankName" {...register('bankName')} placeholder="e.g. HSBC" error={!!errors.bankName} />
            </FormField>

            <FormField label="Account holder name" htmlFor="accountName" error={errors.accountName?.message}>
              <Input id="accountName" {...register('accountName')} placeholder="Name on account" error={!!errors.accountName} />
            </FormField>

            {cfg && 'routingLabel' in cfg && (
              <FormField label={cfg.routingLabel} htmlFor="routing" error={errors.routing?.message} required>
                <Input id="routing" {...register('routing')} className="font-mono" error={!!errors.routing} />
              </FormField>
            )}

            {cfg && 'swiftLabel' in cfg && (
              <FormField label={cfg.swiftLabel} htmlFor="swiftBic" error={errors.swiftBic?.message}>
                <Input id="swiftBic" {...register('swiftBic')} className="font-mono uppercase" error={!!errors.swiftBic} />
              </FormField>
            )}

            {cfg && (
              <FormField
                label={cfg.accountLabel}
                htmlFor="account"
                error={errors.account?.message}
                required
                className={!('routingLabel' in cfg) && !('swiftLabel' in cfg) ? 'sm:col-span-2' : ''}
              >
                <Input id="account" {...register('account')} className="font-mono" error={!!errors.account} />
              </FormField>
            )}
          </div>

          {/* ── Address ── */}
          <Section title="Address" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Street address" htmlFor="addressLine1" error={errors.addressLine1?.message} className="sm:col-span-2">
              <Input id="addressLine1" {...register('addressLine1')} placeholder="123 Main St" error={!!errors.addressLine1} />
            </FormField>
            <FormField label="Address line 2" htmlFor="addressLine2" error={errors.addressLine2?.message} className="sm:col-span-2">
              <Input id="addressLine2" {...register('addressLine2')} placeholder="Suite, floor, etc. (optional)" error={!!errors.addressLine2} />
            </FormField>
            <FormField label="City" htmlFor="city" error={errors.city?.message}>
              <Input id="city" {...register('city')} placeholder="New York" error={!!errors.city} />
            </FormField>
            <FormField label="State / Province" htmlFor="state" error={errors.state?.message}>
              <Input id="state" {...register('state')} placeholder="NY" error={!!errors.state} />
            </FormField>
            <FormField label="Postal code" htmlFor="postalCode" error={errors.postalCode?.message}>
              <Input id="postalCode" {...register('postalCode')} placeholder="10001" error={!!errors.postalCode} />
            </FormField>
          </div>

          {/* ── Error ── */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              {getApiError(error, 'Could not save beneficiary. Please check the details and try again.')}
            </div>
          )}

          {/* ── Actions ── */}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
            <Button type="submit" loading={isPending} disabled={!countryCode}>
              {submitLabel}
            </Button>
          </div>
        </div>
      </ContentCard>
    </form>
  )
}
