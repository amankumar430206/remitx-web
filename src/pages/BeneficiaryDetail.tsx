import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useBeneficiary, useUpdateBeneficiary, useDeleteBeneficiary } from '@/hooks/useBeneficiaries'
import { BeneficiaryForm } from './BeneficiaryForm'

// ─── Screening badge config ───────────────────────────────────────────────────

const SCREENING_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  cleared: 'success',
  pending: 'warning',
  flagged: 'danger',
  blocked: 'danger',
}

const SCREENING_LABEL: Record<string, string> = {
  cleared: 'Cleared',
  pending: 'Pending review',
  flagged: 'Flagged',
  blocked: 'Blocked',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function InfoRow({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <span className="text-xs text-muted-fg shrink-0 w-28">{label}</span>
      <span className={`text-sm font-medium text-foreground text-right flex-1 ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? <span className="text-muted-fg/50">—</span>}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export function BeneficiaryDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editing, setEditing] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showAccount, setShowAccount] = useState(false)

  const { data: beneficiary, isLoading, isError, refetch } = useBeneficiary(id ?? '')
  const updateMutation = useUpdateBeneficiary()
  const deleteMutation = useDeleteBeneficiary()

  if (isLoading) return <LoadingState message="Loading beneficiary…" />
  if (isError || !beneficiary) return <ErrorState title="Beneficiary not found" onRetry={refetch} />

  const accountDisplay = beneficiary.iban ?? beneficiary.account_number
  const routingDisplay = beneficiary.routing_number ?? beneficiary.sort_code ?? beneficiary.ifsc_code
  const accountLabel   = beneficiary.iban ? 'IBAN' : 'Account number'
  const routingLabel   = beneficiary.sort_code ? 'Sort code' : beneficiary.ifsc_code ? 'IFSC code' : 'Routing number'

  const onDelete = () => {
    deleteMutation.mutate(beneficiary.id, {
      onSuccess: () => navigate('/beneficiaries'),
    })
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title={editing ? 'Edit beneficiary' : beneficiary.name}
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
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            )}
          </div>
        }
      />

      {/* ── Edit form (full) ── */}
      {editing && (
        <BeneficiaryForm
          initial={beneficiary}
          submitLabel="Save changes"
          isPending={updateMutation.isPending}
          error={updateMutation.isError ? updateMutation.error : undefined}
          onCancel={() => setEditing(false)}
          onSubmit={(payload) =>
            updateMutation.mutate(
              { id: beneficiary.id, data: payload },
              { onSuccess: () => setEditing(false) },
            )
          }
        />
      )}

      {/* ── View mode ── */}
      {!editing && (
        <>
          {/* Hero card */}
          <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-surface to-background p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
            <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary font-bold text-xl select-none">
                  {beneficiary.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{beneficiary.name}</h2>
                    <span className="rounded-full bg-surface border border-border px-2 py-0.5 text-[10px] font-semibold text-muted-fg">
                      {beneficiary.entity_type ?? 'INDIVIDUAL'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-sm text-muted-fg">{beneficiary.country_code}</span>
                    <span className="text-muted-fg/40">·</span>
                    <span className="text-sm font-medium text-foreground">{beneficiary.currency}</span>
                    {beneficiary.bank_name && (
                      <>
                        <span className="text-muted-fg/40">·</span>
                        <span className="text-sm text-muted-fg">{beneficiary.bank_name}</span>
                      </>
                    )}
                    {beneficiary.transfer_method && (
                      <>
                        <span className="text-muted-fg/40">·</span>
                        <span className="rounded-full bg-primary/10 text-primary text-[10px] font-semibold px-2 py-0.5">
                          {beneficiary.transfer_method}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <Badge variant={SCREENING_VARIANT[beneficiary.screening_status] ?? 'default'} className="capitalize shrink-0">
                {SCREENING_LABEL[beneficiary.screening_status] ?? beneficiary.screening_status}
              </Badge>
            </div>

            {(accountDisplay || beneficiary.swift_bic) && (
              <div className="relative mt-5 pt-4 border-t border-border flex items-center gap-3 flex-wrap">
                {accountDisplay && (
                  <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5">
                    <span className="text-xs text-muted-fg">{accountLabel}</span>
                    <span className="font-mono text-xs font-semibold text-foreground">
                      {showAccount ? accountDisplay : `••••${accountDisplay.slice(-4)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAccount(v => !v)}
                      className="ml-1 text-muted-fg hover:text-foreground transition-colors"
                      aria-label={showAccount ? 'Hide account number' : 'Show account number'}
                    >
                      {showAccount ? (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
                {beneficiary.swift_bic && (
                  <div className="flex items-center gap-2 rounded-lg bg-surface border border-border px-3 py-1.5">
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

          {/* Detail cards */}
          <div className="flex flex-col gap-4">
            <ContentCard>
              <SectionHeader
                title="Recipient info"
                icon={
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
              <InfoRow label="Entity type"    value={beneficiary.entity_type ?? 'INDIVIDUAL'} />
              {beneficiary.first_name && <InfoRow label="First name" value={beneficiary.first_name} />}
              {beneficiary.last_name  && <InfoRow label="Last name"  value={beneficiary.last_name} />}
              <InfoRow label="Display name"   value={beneficiary.name} />
              <InfoRow label="Country"        value={beneficiary.country_code} />
              <InfoRow label="Currency"       value={beneficiary.currency} />
              {beneficiary.purpose_code    && <InfoRow label="Purpose"    value={beneficiary.purpose_code} />}
              {beneficiary.transfer_method && <InfoRow label="Transfer via" value={beneficiary.transfer_method} />}
              <InfoRow label="Screening"
                value={
                  <Badge variant={SCREENING_VARIANT[beneficiary.screening_status] ?? 'default'}>
                    {SCREENING_LABEL[beneficiary.screening_status] ?? beneficiary.screening_status}
                  </Badge>
                }
              />
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
              {beneficiary.bank_name    && <InfoRow label="Bank"          value={beneficiary.bank_name} />}
              {beneficiary.account_name && <InfoRow label="Account name"  value={beneficiary.account_name} />}
              {accountDisplay && (
                <InfoRow
                  label={accountLabel}
                  mono
                  value={
                    <span className="flex items-center justify-end gap-2">
                      <span>{showAccount ? accountDisplay : `••••${accountDisplay.slice(-4)}`}</span>
                      <button
                        type="button"
                        onClick={() => setShowAccount(v => !v)}
                        className="text-muted-fg hover:text-foreground transition-colors shrink-0"
                        aria-label={showAccount ? 'Hide account number' : 'Show account number'}
                      >
                        {showAccount ? (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        ) : (
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        )}
                      </button>
                    </span>
                  }
                />
              )}
              {routingDisplay && (
                <InfoRow label={routingLabel} value={routingDisplay} mono />
              )}
              {beneficiary.swift_bic && <InfoRow label="SWIFT / BIC" value={beneficiary.swift_bic} mono />}
            </ContentCard>

            {(beneficiary.address_line1 || beneficiary.city || beneficiary.postal_code) && (
              <ContentCard>
                <SectionHeader
                  title="Address"
                  icon={
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  }
                />
                <div className="grid grid-cols-1 sm:grid-cols-2">
                  {beneficiary.address_line1 && <InfoRow label="Street"      value={beneficiary.address_line1} />}
                  {beneficiary.address_line2 && <InfoRow label="Line 2"      value={beneficiary.address_line2} />}
                  {beneficiary.city          && <InfoRow label="City"        value={beneficiary.city} />}
                  {beneficiary.state         && <InfoRow label="State"       value={beneficiary.state} />}
                  {beneficiary.postal_code   && <InfoRow label="Postal code" value={beneficiary.postal_code} />}
                </div>
              </ContentCard>
            )}
          </div>
        </>
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
