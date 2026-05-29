import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { ContentCard } from '@/layouts/ContentCard'
import { useKycQueue, useApproveKyc, useRejectKyc } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import type { KycQueueItem } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

export function KycQueue() {
  const tenantId = useAuthStore(s => s.user?.tenant_id ?? '')
  const [search, setSearch]           = useState('')
  const [approveTarget, setApproveTarget] = useState<KycQueueItem | null>(null)
  const [rejectTarget, setRejectTarget]   = useState<KycQueueItem | null>(null)
  const [rejectReason, setRejectReason]   = useState('')
  const [approveNote, setApproveNote]     = useState('')

  const { data, isLoading } = useKycQueue()

  const filtered = (data ?? []).filter(row => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      row.email.toLowerCase().includes(q) ||
      [row.first_name, row.last_name].join(' ').toLowerCase().includes(q)
    )
  })
  const approveMutation = useApproveKyc()
  const rejectMutation = useRejectKyc()

  const columns: Column<KycQueueItem>[] = [
    {
      key: 'email',
      header: 'User',
      render: row => (
        <div>
          <p className="font-medium text-foreground text-sm">
            {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-xs text-muted-fg">{row.email}</p>
        </div>
      ),
    },
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
    {
      key: 'created_at',
      header: 'Submitted',
      render: row => new Date(row.created_at).toLocaleDateString(),
    },
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

      <SmartFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email…"
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          getRowId={row => row.id}
          emptyTitle="Queue is empty"
          emptyDescription="No KYC applications awaiting review."
        />
      </ContentCard>

      {/* Approve dialog */}
      <ConfirmDialog
        open={!!approveTarget}
        onOpenChange={open => !open && setApproveTarget(null)}
        title="Approve KYC application"
        description={`Approve identity verification for ${approveTarget?.email}?`}
        confirmLabel="Approve"
        onConfirm={() => {
          if (approveTarget) {
            approveMutation.mutate(
              { tenantId, userId: approveTarget.user_id, note: approveNote || undefined },
              { onSuccess: () => { setApproveTarget(null); setApproveNote('') } },
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
        description={`Reject identity verification for ${rejectTarget?.email}? The user will be notified.`}
        confirmLabel="Reject"
        variant="danger"
        onConfirm={() => {
          if (rejectTarget && rejectReason.trim()) {
            rejectMutation.mutate(
              { tenantId, userId: rejectTarget.user_id, reason: rejectReason },
              { onSuccess: () => { setRejectTarget(null); setRejectReason('') } },
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
