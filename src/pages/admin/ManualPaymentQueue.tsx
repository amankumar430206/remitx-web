import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { ContentCard } from '@/layouts/ContentCard'
import { useManualPaymentQueue, useProcessManualPayment, useFailManualPayment } from '@/hooks/useAdmin'
import type { ManualPaymentQueueItem } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

export function ManualPaymentQueue() {
  const [page, setPage] = useState(1)
  const [processTarget, setProcessTarget] = useState<ManualPaymentQueueItem | null>(null)
  const [failTarget, setFailTarget] = useState<ManualPaymentQueueItem | null>(null)
  const [processNote, setProcessNote] = useState('')
  const [failReason, setFailReason] = useState('')

  const { data, isLoading } = useManualPaymentQueue({ page, limit: 20 })
  const processMutation = useProcessManualPayment()
  const failMutation = useFailManualPayment()

  const total = data?.meta?.total ?? 0
  const totalPages = Math.ceil(total / 20)

  const columns: Column<ManualPaymentQueueItem>[] = [
    { key: 'reference', header: 'Reference', render: row => <span className="font-mono text-xs">{row.reference}</span> },
    { key: 'tenantName', header: 'Tenant' },
    { key: 'beneficiaryName', header: 'Beneficiary' },
    {
      key: 'amount',
      header: 'Amount',
      render: row => <span className="font-medium">{row.amount} {row.currency}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    { key: 'createdAt', header: 'Created', render: row => new Date(row.createdAt).toLocaleDateString() },
    {
      key: 'actions',
      header: '',
      render: row => (
        <div className="flex items-center gap-2 justify-end">
          <Button size="sm" onClick={e => { e.stopPropagation(); setProcessTarget(row); setProcessNote('') }}>
            Mark processed
          </Button>
          <Button variant="danger" size="sm" onClick={e => { e.stopPropagation(); setFailTarget(row); setFailReason('') }}>
            Mark failed
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Manual payment queue"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Manual payments' }]}
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          getRowId={row => row.id}
          emptyTitle="Queue is empty"
          emptyDescription="No manual payments awaiting processing."
        />
      </ContentCard>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-fg">
          <span>{total} payments</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</Button>
            <span>Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!processTarget}
        onOpenChange={open => !open && setProcessTarget(null)}
        title="Mark as processed"
        description={`Confirm that payment ${processTarget?.reference} has been processed successfully?`}
        confirmLabel="Mark processed"
        onConfirm={() => {
          if (processTarget) {
            processMutation.mutate(
              { id: processTarget.id, note: processNote || undefined },
              { onSuccess: () => setProcessTarget(null) }
            )
          }
        }}
        loading={processMutation.isPending}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-fg">Note (optional)</label>
          <Input placeholder="e.g. Bank reference number" value={processNote} onChange={e => setProcessNote(e.target.value)} />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={!!failTarget}
        onOpenChange={open => !open && setFailTarget(null)}
        title="Mark as failed"
        description={`Mark payment ${failTarget?.reference} as failed? The sender will be notified.`}
        confirmLabel="Mark failed"
        variant="danger"
        onConfirm={() => {
          if (failTarget && failReason.trim()) {
            failMutation.mutate(
              { id: failTarget.id, reason: failReason },
              { onSuccess: () => setFailTarget(null) }
            )
          }
        }}
        disabled={!failReason.trim()}
        loading={failMutation.isPending}
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-fg">Failure reason <span className="text-danger-fg">*</span></label>
          <Textarea placeholder="Explain why the payment failed…" value={failReason} onChange={e => setFailReason(e.target.value)} rows={3} />
        </div>
      </ConfirmDialog>
    </div>
  )
}
