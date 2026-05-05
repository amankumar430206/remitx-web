import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useCreateBeneficiary } from '@/hooks/useBeneficiaries'
import type { CreateBeneficiaryPayload } from '@/api/beneficiaries'

// Countries and their routing field mappings
const COUNTRY_CONFIGS = {
  US:  { label: 'United States',          currency: 'USD', routingLabel: 'ABA Routing Number (9 digits)', accountLabel: 'Account Number', routingField: 'routingNumber' as const },
  GB:  { label: 'United Kingdom',         currency: 'GBP', routingLabel: 'Sort Code (6 digits)',          accountLabel: 'Account Number', routingField: 'sortCode' as const },
  IN:  { label: 'India',                  currency: 'INR', routingLabel: 'IFSC Code',                    accountLabel: 'Account Number', routingField: 'ifscCode' as const },
  AU:  { label: 'Australia',              currency: 'AUD', routingLabel: 'BSB Code',                     accountLabel: 'Account Number', routingField: 'routingNumber' as const },
  CA:  { label: 'Canada',                 currency: 'CAD', routingLabel: 'Transit Number',               accountLabel: 'Account Number', routingField: 'routingNumber' as const },
  DE:  { label: 'Germany (SEPA)',          currency: 'EUR', swiftLabel: 'BIC / SWIFT',                   accountLabel: 'IBAN', useIban: true },
  FR:  { label: 'France (SEPA)',           currency: 'EUR', swiftLabel: 'BIC / SWIFT',                   accountLabel: 'IBAN', useIban: true },
  ES:  { label: 'Spain (SEPA)',            currency: 'EUR', swiftLabel: 'BIC / SWIFT',                   accountLabel: 'IBAN', useIban: true },
  NL:  { label: 'Netherlands (SEPA)',      currency: 'EUR', swiftLabel: 'BIC / SWIFT',                   accountLabel: 'IBAN', useIban: true },
  AE:  { label: 'United Arab Emirates',   currency: 'AED', swiftLabel: 'SWIFT Code',                    accountLabel: 'IBAN', useIban: true },
  SG:  { label: 'Singapore',              currency: 'SGD', swiftLabel: 'SWIFT Code',                    accountLabel: 'Account Number' },
  OTHER: { label: 'Other',               currency: '',    swiftLabel: 'SWIFT Code',                    accountLabel: 'Account Number' },
} as const

type CountryCode = keyof typeof COUNTRY_CONFIGS
type RoutingField = 'routingNumber' | 'sortCode' | 'ifscCode'

const COUNTRY_OPTIONS = Object.entries(COUNTRY_CONFIGS).map(([value, { label }]) => ({ value, label }))

const PURPOSE_OPTIONS = [
  { value: 'SALARY',     label: 'Salary' },
  { value: 'SERVICES',   label: 'Services' },
  { value: 'TRADE',      label: 'Trade' },
  { value: 'SUPPLIER',   label: 'Supplier payment' },
  { value: 'CONTRACTOR', label: 'Contractor' },
  { value: 'OTHER',      label: 'Other' },
]

const schema = z.object({
  name:        z.string().min(2, 'Full name is required'),
  countryCode: z.string().min(2, 'Country is required'),
  currency:    z.string().min(1, 'Currency is required'),
  bankName:    z.string().min(1, 'Bank name is required'),
  purposeCode: z.string().min(1, 'Purpose is required'),
  account:     z.string().optional().default(''),
  routing:     z.string().optional().default(''),
  swiftBic:    z.string().optional().default(''),
})

type FormValues = z.infer<typeof schema>

function buildPayload(values: FormValues): CreateBeneficiaryPayload {
  const cc = values.countryCode as CountryCode
  const cfg = COUNTRY_CONFIGS[cc]
  const payload: CreateBeneficiaryPayload = {
    name:        values.name,
    countryCode: values.countryCode,
    currency:    values.currency,
    bankName:    values.bankName,
    purposeCode: values.purposeCode,
  }

  if (cfg && 'useIban' in cfg && cfg.useIban) {
    payload.iban = values.account
  } else {
    payload.accountNumber = values.account
  }

  if (values.routing && cfg && 'routingField' in cfg) {
    const field = cfg.routingField as RoutingField
    payload[field] = values.routing
  }

  if (values.swiftBic) payload.swiftBic = values.swiftBic

  return payload
}

export function BeneficiaryNew() {
  const navigate = useNavigate()
  const createMutation = useCreateBeneficiary()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { countryCode: '', currency: '', bankName: '', purposeCode: '', account: '', routing: '', swiftBic: '' },
  })

  const countryCode = watch('countryCode') as CountryCode | ''
  const cfg = countryCode ? COUNTRY_CONFIGS[countryCode] : null

  useEffect(() => {
    if (!countryCode) return
    const c = COUNTRY_CONFIGS[countryCode as CountryCode]
    if (c?.currency) setValue('currency', c.currency)
    setValue('account', '')
    setValue('routing', '')
    setValue('swiftBic', '')
  }, [countryCode, setValue])

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      buildPayload(values),
      { onSuccess: (b) => navigate(`/beneficiaries/${b.id}`) }
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title="Add beneficiary"
        breadcrumbs={[{ label: 'Beneficiaries', href: '/beneficiaries' }, { label: 'New' }]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <ContentCard>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Recipient details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full name / Company name" error={errors.name?.message} required htmlFor="name" className="sm:col-span-2">
                <Input id="name" {...register('name')} placeholder="e.g. Jane Smith" error={!!errors.name} />
              </FormField>

              <FormField label="Country" error={errors.countryCode?.message} required htmlFor="countryCode">
                <Select
                  value={watch('countryCode')}
                  onValueChange={v => setValue('countryCode', v)}
                  options={COUNTRY_OPTIONS}
                  placeholder="Select country…"
                  error={!!errors.countryCode}
                />
              </FormField>

              <FormField label="Purpose" error={errors.purposeCode?.message} required htmlFor="purposeCode">
                <Select
                  value={watch('purposeCode')}
                  onValueChange={v => setValue('purposeCode', v)}
                  options={PURPOSE_OPTIONS}
                  placeholder="Select purpose…"
                  error={!!errors.purposeCode}
                />
              </FormField>
            </div>

            {countryCode && cfg && (
              <>
                <hr className="border-border" />
                <h3 className="text-sm font-semibold text-foreground">Bank details</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Currency" error={errors.currency?.message} required htmlFor="currency">
                    <Input id="currency" {...register('currency')} placeholder="e.g. USD" error={!!errors.currency} />
                  </FormField>

                  <FormField label="Bank name" error={errors.bankName?.message} required htmlFor="bankName">
                    <Input id="bankName" {...register('bankName')} placeholder="e.g. Chase" error={!!errors.bankName} />
                  </FormField>

                  {'routingLabel' in cfg && (
                    <FormField label={cfg.routingLabel} error={errors.routing?.message} required htmlFor="routing">
                      <Input id="routing" {...register('routing')} className="font-mono" error={!!errors.routing} />
                    </FormField>
                  )}

                  {'swiftLabel' in cfg && (
                    <FormField label={cfg.swiftLabel} error={errors.swiftBic?.message} required htmlFor="swiftBic">
                      <Input id="swiftBic" {...register('swiftBic')} className="font-mono uppercase" error={!!errors.swiftBic} />
                    </FormField>
                  )}

                  <FormField
                    label={cfg.accountLabel}
                    error={errors.account?.message}
                    required
                    htmlFor="account"
                    className={'swiftLabel' in cfg && !('routingLabel' in cfg) ? 'sm:col-span-2' : ''}
                  >
                    <Input id="account" {...register('account')} className="font-mono" error={!!errors.account} />
                  </FormField>
                </div>
              </>
            )}

            {createMutation.isError && (
              <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                Could not add beneficiary. Please check the details and try again.
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/beneficiaries')}>Cancel</Button>
              <Button type="submit" loading={createMutation.isPending} disabled={!countryCode}>Add beneficiary</Button>
            </div>
          </div>
        </ContentCard>
      </form>
    </div>
  )
}
