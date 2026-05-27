import { useState, useEffect } from 'react'
import { getApiError } from '@/lib/apiError'
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

const SCREENING_LABEL: Record<string, string> = {
  cleared: 'Cleared',
  pending: 'Pending review',
  flagged: 'Flagged',
}

const editSchema = z.object({
  name:     z.string().min(2, 'Name is required'),
  bankName: z.string().min(1, 'Bank name is required'),
})
type EditValues = z.infer<typeof editSchema>

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-fg shrink-0">{label}</span>
      <span className={`text-sm font-medium text-foreground text-right flex-1 ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? '—'}
      </span>
    </div>
  )
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
      { onSuccess: () => setEditing(false) },
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
  const accountLabel = beneficiary.iban ? 'IBAN' : 'Account number'

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

      {/* ── Hero card ── */}
      {!editing && (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-background p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

          <div className="relative flex items-start justify-between gap-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-xl select-none">
                {beneficiary.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-xl font-bold text-foreground">{beneficiary.name}</h2>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-sm text-muted-fg">{beneficiary.country_code}</span>
                  <span className="text-muted-fg/40">·</span>
                  <span className="text-sm font-medium text-foreground">{beneficiary.currency}</span>
                  {beneficiary.bank_name && (
                    <>
                      <span className="text-muted-fg/40">·</span>
                      <span className="text-sm text-muted-fg">{beneficiary.bank_name}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Screening badge */}
            <Badge variant={SCREENING_VARIANT[beneficiary.screening_status] ?? 'default'} className="capitalize shrink-0">
              {SCREENING_LABEL[beneficiary.screening_status] ?? beneficiary.screening_status}
            </Badge>
          </div>

          {/* Account chip row */}
          {(accountDisplay || beneficiary.swift_bic) && (
            <div className="relative mt-5 pt-4 border-t border-border flex items-center gap-3 flex-wrap">
              {accountDisplay && (
                <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5">
                  <svg className="h-3.5 w-3.5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  <span className="text-xs text-muted-fg">{accountLabel}</span>
                  <span className="font-mono text-xs font-semibold text-foreground">
                    ••••{accountDisplay.slice(-4)}
                  </span>
                </div>
              )}
              {beneficiary.swift_bic && (
                <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5">
                  <svg className="h-3.5 w-3.5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
                  </svg>
                  <span className="text-xs text-muted-fg">SWIFT</span>
                  <span className="font-mono text-xs font-semibold text-foreground">{beneficiary.swift_bic}</span>
                </div>
              )}
              <span className="text-xs text-muted-fg ml-auto">
                Added {new Date(beneficiary.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ── Edit form ── */}
      {editing && (
        <form onSubmit={handleSubmit(onSave)}>
          <ContentCard>
            <SectionHeader
              title="Edit details"
              icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              }
            />
            <div className="flex flex-col gap-4">
              <FormField label="Name" error={errors.name?.message} required htmlFor="b-name">
                <Input id="b-name" {...register('name')} error={!!errors.name} />
              </FormField>
              <FormField label="Bank name" error={errors.bankName?.message} required htmlFor="b-bank">
                <Input id="b-bank" {...register('bankName')} error={!!errors.bankName} />
              </FormField>
              {updateMutation.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {getApiError(updateMutation.error, 'Could not save changes. Please try again.')}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => { setEditing(false); reset() }}>Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>Save changes</Button>
              </div>
            </div>
          </ContentCard>
        </form>
      )}

      {/* ── Detail cards ── */}
      {!editing && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ContentCard>
            <SectionHeader
              title="Recipient info"
              icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              }
            />
            <InfoRow label="Full name" value={beneficiary.name} />
            <InfoRow label="Country" value={beneficiary.country_code} />
            <InfoRow label="Currency" value={beneficiary.currency} />
            {beneficiary.purpose_code && <InfoRow label="Purpose" value={beneficiary.purpose_code} />}
            <InfoRow
              label="Screening"
              value={
                <Badge variant={SCREENING_VARIANT[beneficiary.screening_status] ?? 'default'} className="capitalize">
                  {SCREENING_LABEL[beneficiary.screening_status] ?? beneficiary.screening_status}
                </Badge>
              }
            />
            <InfoRow label="Added" value={new Date(beneficiary.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} />
          </ContentCard>

          <ContentCard>
            <SectionHeader
              title="Bank details"
              icon={
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
                </svg>
              }
            />
            {beneficiary.bank_name && <InfoRow label="Bank" value={beneficiary.bank_name} />}
            {accountDisplay && (
              <InfoRow
                label={accountLabel}
                value={<>••••{accountDisplay.slice(-4)}</>}
                mono
              />
            )}
            {routingDisplay && (
              <InfoRow label={routingLabel} value={routingDisplay} mono />
            )}
            {beneficiary.swift_bic && (
              <InfoRow label="SWIFT / BIC" value={beneficiary.swift_bic} mono />
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
