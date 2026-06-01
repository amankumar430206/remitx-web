import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Drawer } from '@/components/ui/molecules/Drawer'
import { DocumentRow } from '@/components/ui/molecules/DocumentRow'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { ContentCard } from '@/layouts/ContentCard'
import { useKycQueue, useApproveKyc, useRejectKyc } from '@/hooks/useAdmin'
import { useAuthStore } from '@/stores/authStore'
import adminApi from '@/api/admin'
import type { KycQueueItem } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

export function KycQueue() {
  const tenantId = useAuthStore(s => s.user?.tenant_id ?? '')
  const [search, setSearch]           = useState('')
  const [drawerRow, setDrawerRow]         = useState<KycQueueItem | null>(null)
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
      render: row => (
        <span className="inline-flex items-center gap-1 text-xs text-muted-fg">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          {row.documents.length} {row.documents.length === 1 ? 'document' : 'documents'}
        </span>
      ),
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
          onRowClick={row => setDrawerRow(row)}
          emptyTitle="Queue is empty"
          emptyDescription="No KYC applications awaiting review."
        />
      </ContentCard>

      {/* Document review drawer */}
      <Drawer
        open={!!drawerRow}
        onClose={() => setDrawerRow(null)}
        title="KYC application"
        width="w-[480px]"
      >
        {drawerRow && (
          <div className="flex flex-col gap-6">
            {/* User info */}
            <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-raised p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-sm font-bold text-primary">
                {(drawerRow.first_name?.[0] ?? drawerRow.email[0]).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground">
                  {[drawerRow.first_name, drawerRow.last_name].filter(Boolean).join(' ') || '—'}
                </p>
                <p className="truncate text-xs text-muted-fg">{drawerRow.email}</p>
                <p className="mt-1 text-xs text-muted-fg">
                  Submitted {new Date(drawerRow.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <Badge variant="warning" className="ml-auto shrink-0 capitalize">
                {drawerRow.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Documents */}
            <div>
              <p className="mb-3 text-sm font-semibold text-foreground">
                Documents
                <span className="ml-2 text-xs font-normal text-muted-fg">({drawerRow.documents.length})</span>
              </p>
              {drawerRow.documents.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border py-6 text-center text-xs text-muted-fg">
                  No documents uploaded yet
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {drawerRow.documents.map((doc, i) => (
                    <DocumentRow
                      key={i}
                      doc={doc}
                      fetchFn={() => adminApi.kyc.fetchDocument(tenantId, drawerRow.user_id, doc.storedAs!)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 border-t border-border pt-4">
              <Button
                className="flex-1"
                onClick={() => { setDrawerRow(null); setApproveTarget(drawerRow) }}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                className="flex-1"
                onClick={() => { setDrawerRow(null); setRejectTarget(drawerRow); setRejectReason('') }}
              >
                Reject
              </Button>
            </div>
          </div>
        )}
      </Drawer>

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
