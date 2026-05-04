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

const COUNTRY_CONFIGS = {
  US: { label: 'United States', currency: 'USD', routingLabel: 'ABA Routing Number', accountLabel: 'Account Number' },
  GB: { label: 'United Kingdom', currency: 'GBP', routingLabel: 'Sort Code', accountLabel: 'Account Number' },
  EU: { label: 'European Union (SEPA)', currency: 'EUR', swiftLabel: 'BIC / SWIFT', accountLabel: 'IBAN' },
  IN: { label: 'India', currency: 'INR', routingLabel: 'IFSC Code', accountLabel: 'Account Number' },
  SG: { label: 'Singapore', currency: 'SGD', swiftLabel: 'SWIFT Code', accountLabel: 'Account Number' },
  AE: { label: 'United Arab Emirates', currency: 'AED', swiftLabel: 'SWIFT Code', accountLabel: 'IBAN' },
  AU: { label: 'Australia', currency: 'AUD', routingLabel: 'BSB Code', accountLabel: 'Account Number' },
  CA: { label: 'Canada', currency: 'CAD', routingLabel: 'Transit Number', accountLabel: 'Account Number' },
  OTHER: { label: 'Other', currency: '', swiftLabel: 'SWIFT Code', accountLabel: 'Account Number' },
} as const

type CountryCode = keyof typeof COUNTRY_CONFIGS

const COUNTRY_OPTIONS = Object.entries(COUNTRY_CONFIGS).map(([value, { label }]) => ({ value, label }))

const schema = z.object({
  name: z.string().min(2, 'Full name is required'),
  type: z.enum(['individual', 'business']),
  countryCode: z.string().min(2, 'Country is required'),
  currency: z.string().min(1, 'Currency is required'),
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().optional().default(''),
  routingCode: z.string().optional().default(''),
  swiftCode: z.string().optional().default(''),
}).superRefine((data, ctx) => {
  const config = COUNTRY_CONFIGS[data.countryCode as CountryCode]
  if (!data.accountNumber?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${config?.accountLabel ?? 'Account number'} is required`,
      path: ['accountNumber'],
    })
  }
  if (config && 'routingLabel' in config && !data.routingCode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${config.routingLabel} is required`,
      path: ['routingCode'],
    })
  }
  if (config && 'swiftLabel' in config && !data.swiftCode?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `${config.swiftLabel} is required`,
      path: ['swiftCode'],
    })
  }
})

type FormValues = z.infer<typeof schema>

export function BeneficiaryNew() {
  const navigate = useNavigate()
  const createMutation = useCreateBeneficiary()

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'individual', countryCode: '', currency: '', bankName: '', accountNumber: '', routingCode: '', swiftCode: '' },
  })

  const countryCode = watch('countryCode')
  const config = COUNTRY_CONFIGS[countryCode as CountryCode]

  useEffect(() => {
    if (!countryCode) return
    const cfg = COUNTRY_CONFIGS[countryCode as CountryCode]
    if (cfg?.currency) setValue('currency', cfg.currency)
    setValue('routingCode', '')
    setValue('swiftCode', '')
    setValue('accountNumber', '')
  }, [countryCode, setValue])

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(
      {
        name: values.name,
        type: values.type,
        countryCode: values.countryCode,
        currency: values.currency,
        bankName: values.bankName,
        accountNumber: values.accountNumber ?? '',
        routingCode: values.routingCode || undefined,
        swiftCode: values.swiftCode || undefined,
      },
      { onSuccess: (b) => navigate(`/beneficiaries/${b.id}`) }
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title="Add beneficiary"
        breadcrumbs={[
          { label: 'Beneficiaries', href: '/beneficiaries' },
          { label: 'New' },
        ]}
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <ContentCard>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Recipient details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Full name / Company name" error={errors.name?.message} required htmlFor="name" className="sm:col-span-2">
                <Input id="name" {...register('name')} placeholder="e.g. Jane Smith" error={!!errors.name} />
              </FormField>

              <FormField label="Type" error={errors.type?.message} required htmlFor="type">
                <Select
                  value={watch('type')}
                  onValueChange={v => setValue('type', v as 'individual' | 'business')}
                  options={[
                    { value: 'individual', label: 'Individual' },
                    { value: 'business', label: 'Business' },
                  ]}
                  error={!!errors.type}
                />
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
            </div>

            {countryCode && (
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

                  {config && 'routingLabel' in config && (
                    <FormField
                      label={config.routingLabel}
                      error={errors.routingCode?.message}
                      required
                      htmlFor="routingCode"
                    >
                      <Input
                        id="routingCode"
                        {...register('routingCode')}
                        placeholder={`Enter ${config.routingLabel.toLowerCase()}`}
                        error={!!errors.routingCode}
                        className="font-mono"
                      />
                    </FormField>
                  )}

                  {config && 'swiftLabel' in config && (
                    <FormField
                      label={config.swiftLabel}
                      error={errors.swiftCode?.message}
                      required
                      htmlFor="swiftCode"
                    >
                      <Input
                        id="swiftCode"
                        {...register('swiftCode')}
                        placeholder={`Enter ${config.swiftLabel.toLowerCase()}`}
                        error={!!errors.swiftCode}
                        className="font-mono uppercase"
                      />
                    </FormField>
                  )}

                  <FormField
                    label={config?.accountLabel ?? 'Account Number'}
                    error={errors.accountNumber?.message}
                    required
                    htmlFor="accountNumber"
                    className={config && 'swiftLabel' in config && !('routingLabel' in config) ? 'sm:col-span-2' : ''}
                  >
                    <Input
                      id="accountNumber"
                      {...register('accountNumber')}
                      placeholder={`Enter ${(config?.accountLabel ?? 'account number').toLowerCase()}`}
                      error={!!errors.accountNumber}
                      className="font-mono"
                    />
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
              <Button type="button" variant="outline" onClick={() => navigate('/beneficiaries')}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending} disabled={!countryCode}>
                Add beneficiary
              </Button>
            </div>
          </div>
        </ContentCard>
      </form>
    </div>
  )
}
