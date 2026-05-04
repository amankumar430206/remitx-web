import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { ContentCard } from '@/layouts/ContentCard'
import { useKycQueue, useApproveKyc, useRejectKyc } from '@/hooks/useAdmin'
import type { KycQueueItem } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

export function KycQueue() {
  const [page, setPage] = useState(1)
  const [approveTarget, setApproveTarget] = useState<KycQueueItem | null>(null)
  const [rejectTarget, setRejectTarget] = useState<KycQueueItem | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [approveNote, setApproveNote] = useState('')

  const { data, isLoading } = useKycQueue({ page, limit: 20 })
  const approveMutation = useApproveKyc()
  const rejectMutation = useRejectKyc()

  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const columns: Column<KycQueueItem>[] = [
    { key: 'userName', header: 'User' },
    { key: 'userEmail', header: 'Email' },
    { key: 'tenantName', header: 'Tenant' },
    {
      key: 'status',
      header: 'Status',
      render: row => (
        <Badge variant="warning" className="capitalize">
          {row.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'documents',
      header: 'Docs',
      render: row => <span className="text-muted-fg text-xs">{row.documents.length} uploaded</span>,
    },
    { key: 'submittedAt', header: 'Submitted', render: row => new Date(row.submittedAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      render: row => (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" onClick={e => { e.stopPropagation(); setApproveTarget(row) }}>
            Approve
          </Button>
          <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); setRejectTarget(row); setRejectReason('') }}>
            Reject
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="KYC queue"
        breadcrumbs={[{ label: 'Admin' }, { label: 'KYC queue' }]}
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          getRowId={row => row.id}
          emptyTitle="Queue is empty"
          emptyDescription="No KYC applications awaiting review."
        />
      </ContentCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-fg">
          <span>{total} applications</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      )}

      {/* Approve dialog */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={open => !open && setApproveTarget(null)}
        title="Approve KYC application"
        description={`Approve identity verification for ${approveTarget?.userName}?`}
        confirmLabel="Approve"
        onConfirm={() => {
          if (approveTarget) {
            approveMutation.mutate(
              { id: approveTarget.id, note: approveNote || undefined },
              { onSuccess: () => { setApproveTarget(null); setApproveNote('') } }
            )
          }
        }}
        loading={approveMutation.isPending}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-fg">Note (optional)</label>
          <Input
            placeholder="Internal note…"
            value={approveNote}
            onChange={e => setApproveNote(e.target.value)}
          />
        </div>
      </ConfirmDialog>

      {/* Reject dialog */}
      <ConfirmDialog
        open={!!rejectTarget}
        onOpenChange={open => !open && setRejectTarget(null)}
        title="Reject KYC application"
        description={`Reject identity verification for ${rejectTarget?.userName}? The user will be notified.`}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => {
          if (rejectTarget && rejectReason.trim()) {
            rejectMutation.mutate(
              { id: rejectTarget.id, reason: rejectReason },
              { onSuccess: () => { setRejectTarget(null); setRejectReason('') } }
            )
          }
        }}
        disabled={!rejectReason.trim()}
        loading={rejectMutation.isPending}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-fg">Rejection reason <span className="text-danger-fg">*</span></label>
          <Textarea
            placeholder="Explain why the application was rejected…"
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            rows={3}
          />
        </div>
      </ConfirmDialog>
    </div>
  )
}
