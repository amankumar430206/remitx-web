import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()
  const [processTarget, setProcessTarget] = useState<ManualPaymentQueueItem | null>(null)
  const [failTarget, setFailTarget] = useState<ManualPaymentQueueItem | null>(null)
  const [processNote, setProcessNote] = useState('')
  const [failReason, setFailReason] = useState('')

  const { data, isLoading } = useManualPaymentQueue()
  const processMutation = useProcessManualPayment()
  const failMutation = useFailManualPayment()

  const columns: Column<ManualPaymentQueueItem>[] = [
    { key: 'reference', header: 'Reference', render: row => <span className="font-mono text-xs">{row.reference}</span> },
    {
      key: 'source_amount',
      header: 'Amount',
      render: row => (
        <span className="font-medium">
          {Number(row.source_amount).toLocaleString()} {row.source_currency}
          {row.dest_currency !== row.source_currency && (
            <span className="text-muted-fg text-xs ml-1">→ {row.dest_currency}</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Created',
      render: row => new Date(row.created_at).toLocaleDateString(),
    },
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
        actions={
          <Button size="sm" onClick={() => navigate('/admin/payments/on-behalf')}>
            + Pay on behalf
          </Button>
        }
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data ?? []}
          loading={isLoading}
          getRowId={row => row.id}
          emptyTitle="Queue is empty"
          emptyDescription="No manual payments awaiting processing."
        />
      </ContentCard>

      <ConfirmDialog
        open={!!processTarget}
        onOpenChange={open => !open && setProcessTarget(null)}
        title="Mark as processed"
        description={`Confirm that payment ${processTarget?.reference} has been processed successfully?`}
        confirmLabel="Mark processed"
        onConfirm={() => {
          if (processTarget) {
            processMutation.mutate(
              { id: processTarget.id, notes: processNote || undefined },
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
              { id: failTarget.id, notes: failReason },
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
