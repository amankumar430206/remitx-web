import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '@/hooks/useBeneficiaries'

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

const editSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  type: z.enum(['individual', 'business']),
  bankName: z.string().min(2, 'Bank name is required'),
  currency: z.string().min(1, 'Currency is required'),
  countryCode: z.string().min(2, 'Country is required'),
  accountNumber: z.string().min(1, 'Account number is required'),
  routingCode: z.string().optional().default(''),
  swiftCode: z.string().optional().default(''),
})

type EditValues = z.infer<typeof editSchema>

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-fg shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-foreground text-right flex-1">{value}</span>
    </div>
  )
}

export function BeneficiaryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const { data: beneficiary, isLoading, isError, refetch } = useBeneficiary(id ?? '')
  const updateMutation = useUpdateBeneficiary()
  const deleteMutation = useDeleteBeneficiary()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    if (beneficiary) {
      reset({
        name: beneficiary.name,
        type: beneficiary.type,
        bankName: beneficiary.bankName,
        currency: beneficiary.currency,
        countryCode: beneficiary.countryCode,
        accountNumber: beneficiary.accountNumber,
        routingCode: beneficiary.routingCode ?? '',
        swiftCode: beneficiary.swiftCode ?? '',
      })
    }
  }, [beneficiary, reset])

  const countryCode = watch('countryCode')
  const config = COUNTRY_CONFIGS[countryCode as CountryCode]

  if (isLoading) return <LoadingState message="Loading beneficiary…" />
  if (isError || !beneficiary) return <ErrorState title="Beneficiary not found" onRetry={refetch} />

  const onSave = (values: EditValues) => {
    updateMutation.mutate(
      {
        id: beneficiary.id,
        data: {
          name: values.name,
          type: values.type,
          bankName: values.bankName,
          currency: values.currency,
          countryCode: values.countryCode,
          accountNumber: values.accountNumber,
          routingCode: values.routingCode || undefined,
          swiftCode: values.swiftCode || undefined,
        },
      },
      { onSuccess: () => setEditing(false) }
    )
  }

  const onDelete = () => {
    deleteMutation.mutate(beneficiary.id, {
      onSuccess: () => navigate('/beneficiaries'),
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title={beneficiary.name}
        breadcrumbs={[
          { label: 'Beneficiaries', href: '/beneficiaries' },
          { label: beneficiary.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit</Button>
                <Button variant="danger" size="sm" onClick={() => setShowDeleteDialog(true)}>Delete</Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); reset() }}>Cancel</Button>
            )}
          </div>
        }
      />

      {editing ? (
        <form onSubmit={handleSubmit(onSave)}>
          <ContentCard>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Edit details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Name" error={errors.name?.message} required htmlFor="name" className="sm:col-span-2">
                  <Input id="name" {...register('name')} error={!!errors.name} />
                </FormField>

                <FormField label="Type" error={errors.type?.message} required>
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

                <FormField label="Country" error={errors.countryCode?.message} required>
                  <Select
                    value={watch('countryCode')}
                    onValueChange={v => setValue('countryCode', v)}
                    options={COUNTRY_OPTIONS}
                    error={!!errors.countryCode}
                  />
                </FormField>

                <FormField label="Currency" error={errors.currency?.message} required htmlFor="currency">
                  <Input id="currency" {...register('currency')} error={!!errors.currency} />
                </FormField>

                <FormField label="Bank name" error={errors.bankName?.message} required htmlFor="bankName">
                  <Input id="bankName" {...register('bankName')} error={!!errors.bankName} />
                </FormField>

                {config && 'routingLabel' in config && (
                  <FormField label={config.routingLabel} error={errors.routingCode?.message} htmlFor="routingCode">
                    <Input id="routingCode" {...register('routingCode')} className="font-mono" error={!!errors.routingCode} />
                  </FormField>
                )}

                {config && 'swiftLabel' in config && (
                  <FormField label={config.swiftLabel} error={errors.swiftCode?.message} htmlFor="swiftCode">
                    <Input id="swiftCode" {...register('swiftCode')} className="font-mono uppercase" error={!!errors.swiftCode} />
                  </FormField>
                )}

                <FormField
                  label={config?.accountLabel ?? 'Account Number'}
                  error={errors.accountNumber?.message}
                  required
                  htmlFor="accountNumber"
                >
                  <Input id="accountNumber" {...register('accountNumber')} className="font-mono" error={!!errors.accountNumber} />
                </FormField>
              </div>

              {updateMutation.isError && (
                <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                  Could not save changes. Please try again.
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setEditing(false); reset() }}>Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>Save changes</Button>
              </div>
            </div>
          </ContentCard>
        </form>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContentCard>
            <h3 className="text-sm font-semibold text-foreground mb-3">Recipient info</h3>
            <DetailRow label="Name" value={beneficiary.name} />
            <DetailRow
              label="Type"
              value={
                <Badge variant={beneficiary.type === 'business' ? 'secondary' : 'default'} className="capitalize">
                  {beneficiary.type}
                </Badge>
              }
            />
            <DetailRow label="Status" value={<StatusBadge status={beneficiary.status} />} />
            <DetailRow label="Country" value={beneficiary.countryCode} />
            <DetailRow label="Currency" value={beneficiary.currency} />
            <DetailRow label="Added" value={new Date(beneficiary.createdAt).toLocaleDateString()} />
          </ContentCard>

          <ContentCard>
            <h3 className="text-sm font-semibold text-foreground mb-3">Bank details</h3>
            <DetailRow label="Bank name" value={beneficiary.bankName} />
            <DetailRow
              label="Account number"
              value={<span className="font-mono text-xs">••••{beneficiary.accountNumber.slice(-4)}</span>}
            />
            {beneficiary.routingCode && (
              <DetailRow
                label="Routing code"
                value={<span className="font-mono text-xs">{beneficiary.routingCode}</span>}
              />
            )}
            {beneficiary.swiftCode && (
              <DetailRow
                label="SWIFT / BIC"
                value={<span className="font-mono text-xs">{beneficiary.swiftCode}</span>}
              />
            )}
          </ContentCard>
        </div>
      )}

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete beneficiary"
        description={`Are you sure you want to delete "${beneficiary.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={onDelete}
        loading={deleteMutation.isPending}
      />
    </div>
  )
}
