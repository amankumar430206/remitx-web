import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Avatar } from '@/components/ui/atoms/Avatar'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { EmptyState } from '@/components/ui/molecules/EmptyState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { DocumentRow } from '@/components/ui/molecules/DocumentRow'
import { ContentCard } from '@/layouts/ContentCard'
import { useTenantContact, useApproveKyc, useRejectKyc } from '@/hooks/useAdmin'
import { useState } from 'react'
import admin from '@/api/admin'
import type { TenantContact as TenantContactData } from '@/api/admin'

const KYC_STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  approved: 'success',
  rejected: 'danger',
  submitted: 'warning',
  pending: 'default',
}

function ContactPersonCard({
  contact,
  tenantId,
  onKycAction,
}: {
  contact: TenantContactData
  tenantId: string
  onKycAction: () => void
}) {
  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '—'
  const initials = [contact.first_name?.[0], contact.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?'

  const [rejectOpen, setRejectOpen] = useState(false)
  const approveKyc = useApproveKyc()
  const rejectKyc = useRejectKyc()

  const handleApprove = () => {
    approveKyc.mutate({ tenantId, userId: contact.id }, { onSuccess: onKycAction })
  }

  const handleReject = () => {
    rejectKyc.mutate(
      { tenantId, userId: contact.id, reason: 'Documents did not meet requirements' },
      { onSuccess: () => { setRejectOpen(false); onKycAction() } },
    )
  }

  const canAction =
    contact.kyc_app_status === 'submitted' || contact.kyc_app_status === 'under_review'

  return (
    <>
      {/* Person info row */}
      <div className="flex items-start gap-4 mb-5">
        <Avatar fallback={initials} size="lg" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-foreground">{fullName}</p>
            <Badge variant={KYC_STATUS_VARIANT[contact.kyc_status ?? 'default'] ?? 'default'} className="capitalize">
              KYC: {contact.kyc_status ?? 'pending'}
            </Badge>
          </div>
          <p className="text-sm text-muted-fg mt-0.5">{contact.email}</p>
          {contact.phone && (
            <p className="text-sm text-muted-fg">{contact.phone}</p>
          )}
        </div>

        {canAction && (
          <div className="flex gap-2 shrink-0">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRejectOpen(true)}
              loading={rejectKyc.isPending}
            >
              Reject
            </Button>
            <Button
              size="sm"
              onClick={handleApprove}
              loading={approveKyc.isPending}
            >
              Approve KYC
            </Button>
          </div>
        )}
      </div>

      {/* KYC detail row */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3 mb-5 pb-5 border-b border-border">
        <div>
          <span className="text-xs text-muted-fg">Role</span>
          <p className="font-medium mt-0.5 text-foreground capitalize">{contact.role.replace('_', ' ')}</p>
        </div>
        <div>
          <span className="text-xs text-muted-fg">Account status</span>
          <p className="font-medium mt-0.5 text-foreground capitalize">{contact.status}</p>
        </div>
        {contact.kyc_app_status && (
          <div>
            <span className="text-xs text-muted-fg">KYC application</span>
            <p className="font-medium mt-0.5 text-foreground capitalize">{contact.kyc_app_status.replace('_', ' ')}</p>
          </div>
        )}
        {contact.reviewed_at && (
          <div>
            <span className="text-xs text-muted-fg">KYC reviewed</span>
            <p className="font-medium mt-0.5 text-foreground">
              {new Date(contact.reviewed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        )}
        {contact.rejection_reason && (
          <div className="col-span-2">
            <span className="text-xs text-muted-fg">Rejection reason</span>
            <p className="font-medium mt-0.5 text-foreground">{contact.rejection_reason}</p>
          </div>
        )}
        <div>
          <span className="text-xs text-muted-fg">Joined</span>
          <p className="font-medium mt-0.5 text-foreground">
            {new Date(contact.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* KYC documents */}
      <div>
        <p className="text-xs font-semibold text-muted-fg uppercase tracking-wider mb-3">
          Identity documents
          {contact.kyc_documents?.length ? ` · ${contact.kyc_documents.length}` : ''}
        </p>
        {contact.kyc_documents && contact.kyc_documents.length > 0 ? (
          <div className="flex flex-col gap-2">
            {contact.kyc_documents.map((doc, i) => (
              <DocumentRow
                key={i}
                doc={doc}
                fetchFn={() => admin.kyc.fetchDocument(tenantId, contact.id, doc.storedAs!)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-fg">No documents uploaded yet.</p>
        )}
      </div>

      <ConfirmDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        title="Reject KYC application"
        description={`Reject KYC for ${fullName}? The client will be notified and may resubmit.`}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={handleReject}
        loading={rejectKyc.isPending}
      />
    </>
  )
}

interface Props {
  tenantId: string
}

export function TenantContact({ tenantId }: Props) {
  const { data: contact, isLoading, refetch } = useTenantContact(tenantId)

  return (
    <ContentCard>
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Contact person</h3>
        <p className="text-xs text-muted-fg mt-0.5">Client admin and their KYC verification documents</p>
      </div>

      {isLoading ? (
        <LoadingState message="Loading contact…" />
      ) : contact ? (
        <ContactPersonCard
          contact={contact}
          tenantId={tenantId}
          onKycAction={() => refetch()}
        />
      ) : (
        <EmptyState
          title="No contact person yet"
          description="The client admin will appear here once they accept their invite."
        />
      )}
    </ContentCard>
  )
}
