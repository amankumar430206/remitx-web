import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useKycStatus, useInitiateKyc } from '@/hooks/useKyc'
import type { KycStatus as KycStatusType } from '@/api/kyc'

const STATUS_CONFIG: Record<KycStatusType, { label: string; variant: 'default' | 'secondary' | 'warning' | 'success' | 'danger'; description: string }> = {
  not_started: {
    label: 'Not started',
    variant: 'secondary',
    description: 'Complete identity verification to unlock payments.',
  },
  pending: {
    label: 'Pending',
    variant: 'warning',
    description: 'Your application is being prepared.',
  },
  submitted: {
    label: 'Submitted',
    variant: 'warning',
    description: 'Your documents have been submitted and are awaiting review.',
  },
  under_review: {
    label: 'Under review',
    variant: 'warning',
    description: 'Our compliance team is reviewing your documents.',
  },
  approved: {
    label: 'Approved',
    variant: 'success',
    description: 'Your identity has been verified.',
  },
  rejected: {
    label: 'Rejected',
    variant: 'danger',
    description: 'Your verification was rejected.',
  },
}

export function KycStatus() {
  const navigate = useNavigate()
  const { data: kyc, isLoading, isError, refetch } = useKycStatus()
  const initiateMutation = useInitiateKyc()

  if (isLoading) return <LoadingState message="Loading KYC status…" />
  if (isError || !kyc) return <ErrorState title="Could not load KYC status" onRetry={refetch} />

  const config = STATUS_CONFIG[kyc.status]

  const handleStart = () => {
    if (kyc.status === 'not_started') {
      initiateMutation.mutate(undefined, {
        onSuccess: () => navigate('/kyc/verify'),
      })
    } else {
      navigate('/kyc/verify')
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <PageHeader
        title="Identity verification"
        breadcrumbs={[{ label: 'KYC' }]}
      />

      {/* Status card */}
      <ContentCard>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-lg font-semibold text-foreground">Verification status</h2>
              <Badge variant={config.variant}>{config.label}</Badge>
            </div>
            <p className="text-sm text-muted-fg">{config.description}</p>

            {kyc.status === 'rejected' && kyc.rejectionReason && (
              <div className="mt-3 rounded-md bg-danger border border-danger-border px-4 py-3">
                <p className="text-xs font-semibold text-danger-fg mb-1">Rejection reason</p>
                <p className="text-sm text-danger-fg">{kyc.rejectionReason}</p>
              </div>
            )}

            {kyc.status === 'approved' && kyc.expiresAt && (
              <p className="mt-2 text-xs text-muted-fg">
                Valid until {new Date(kyc.expiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          {(kyc.status === 'not_started' || kyc.status === 'rejected') && (
            <Button
              size="sm"
              loading={initiateMutation.isPending}
              onClick={handleStart}
            >
              {kyc.status === 'rejected' ? 'Re-verify' : 'Start verification'}
            </Button>
          )}

          {(kyc.status === 'pending' || kyc.status === 'submitted') && (
            <Button size="sm" variant="outline" onClick={() => navigate('/kyc/verify')}>
              Upload documents
            </Button>
          )}
        </div>
      </ContentCard>

      {/* Steps */}
      <ContentCard>
        <h3 className="text-sm font-semibold text-foreground mb-4">Verification steps</h3>
        <ol className="flex flex-col gap-4">
          {[
            { step: 1, title: 'Government ID', desc: 'Passport, national ID, or driving licence' },
            { step: 2, title: 'Proof of address', desc: 'Utility bill or bank statement (max 3 months old)' },
            { step: 3, title: 'Review', desc: 'Our team reviews your documents (typically 1–2 business days)' },
          ].map(({ step, title, desc }) => {
            const done = kyc.status === 'approved' || kyc.status === 'under_review' || kyc.status === 'submitted'
            const active = (kyc.status === 'pending' || kyc.status === 'not_started') && step === 1
            return (
              <li key={step} className="flex items-start gap-3">
                <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? 'bg-success text-success-fg' :
                  active ? 'bg-primary text-white' :
                  'bg-muted text-muted-fg'
                }`}>
                  {done && step < 3 ? '✓' : step}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{title}</p>
                  <p className="text-xs text-muted-fg">{desc}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </ContentCard>

      {/* Uploaded documents */}
      {(kyc.documents ?? []).length > 0 && (
        <ContentCard>
          <h3 className="text-sm font-semibold text-foreground mb-4">Uploaded documents</h3>
          <ul className="flex flex-col gap-2">
            {kyc.documents.map(doc => (
              <li key={doc.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-raised px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-foreground capitalize">{doc.type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-muted-fg">{doc.filename} · {new Date(doc.uploadedAt).toLocaleDateString()}</p>
                </div>
                <Badge variant={doc.status === 'approved' ? 'success' : doc.status === 'rejected' ? 'danger' : 'warning'}>
                  {doc.status}
                </Badge>
              </li>
            ))}
          </ul>
        </ContentCard>
      )}
    </div>
  )
}
