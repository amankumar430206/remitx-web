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
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Input } from '@/components/ui/atoms/Input'
import { ContentCard } from '@/layouts/ContentCard'
import { useBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '@/hooks/useBeneficiaries'

const SCREENING_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  cleared: 'success',
  pending: 'warning',
  flagged: 'danger',
}

const editSchema = z.object({
  name:    z.string().min(2, 'Name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
})

type EditValues = z.infer<typeof editSchema>

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border last:border-0">
      <span className="text-sm text-muted-fg shrink-0 w-40">{label}</span>
      <span className="text-sm font-medium text-foreground text-right flex-1">{value ?? '—'}</span>
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

  const { register, handleSubmit, reset, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
  })

  useEffect(() => {
    if (beneficiary) {
      reset({ name: beneficiary.name, bankName: beneficiary.bank_name ?? '' })
    }
  }, [beneficiary, reset])

  if (isLoading) return <LoadingState message="Loading beneficiary…" />
  if (isError || !beneficiary) return <ErrorState title="Beneficiary not found" onRetry={refetch} />

  const onSave = (values: EditValues) => {
    updateMutation.mutate(
      { id: beneficiary.id, data: { name: values.name, bankName: values.bankName } },
      { onSuccess: () => setEditing(false) }
    )
  }

  const onDelete = () => {
    deleteMutation.mutate(beneficiary.id, {
      onSuccess: () => navigate('/beneficiaries'),
    })
  }

  const accountDisplay = beneficiary.iban ?? beneficiary.account_number
  const routingDisplay = beneficiary.routing_number ?? beneficiary.sort_code ?? beneficiary.ifsc_code
  const routingLabel = beneficiary.sort_code ? 'Sort code' : beneficiary.ifsc_code ? 'IFSC code' : 'Routing number'

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
              <FormField label="Name" error={errors.name?.message} required htmlFor="name">
                <Input id="name" {...register('name')} error={!!errors.name} />
              </FormField>
              <FormField label="Bank name" error={errors.bankName?.message} required htmlFor="bankName">
                <Input id="bankName" {...register('bankName')} error={!!errors.bankName} />
              </FormField>
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
            <DetailRow label="Screening" value={
              <Badge variant={SCREENING_VARIANT[beneficiary.screening_status] ?? 'default'} className="capitalize">
                {beneficiary.screening_status}
              </Badge>
            } />
            <DetailRow label="Country" value={beneficiary.country_code} />
            <DetailRow label="Currency" value={beneficiary.currency} />
            <DetailRow label="Purpose" value={beneficiary.purpose_code} />
            <DetailRow label="Added" value={new Date(beneficiary.created_at).toLocaleDateString()} />
          </ContentCard>

          <ContentCard>
            <h3 className="text-sm font-semibold text-foreground mb-3">Bank details</h3>
            <DetailRow label="Bank name" value={beneficiary.bank_name} />
            <DetailRow
              label={beneficiary.iban ? 'IBAN' : 'Account number'}
              value={accountDisplay
                ? <span className="font-mono text-xs">••••{accountDisplay.slice(-4)}</span>
                : null}
            />
            {routingDisplay && (
              <DetailRow
                label={routingLabel}
                value={<span className="font-mono text-xs">{routingDisplay}</span>}
              />
            )}
            {beneficiary.swift_bic && (
              <DetailRow
                label="SWIFT / BIC"
                value={<span className="font-mono text-xs">{beneficiary.swift_bic}</span>}
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
