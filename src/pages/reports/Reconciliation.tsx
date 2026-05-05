import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { EmptyState } from '@/components/ui/molecules/EmptyState'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { ContentCard } from '@/layouts/ContentCard'
import { useReconciliation } from '@/hooks/useReports'

export function Reconciliation() {
  const today = new Date()
  const thirtyDaysAgo = new Date(today)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const [from, setFrom] = useState(fmt(thirtyDaysAgo))
  const [to, setTo] = useState(fmt(today))
  const [applied, setApplied] = useState({ from: fmt(thirtyDaysAgo), to: fmt(today) })

  const { data: rows, isLoading } = useReconciliation(applied)

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reconciliation"
        breadcrumbs={[{ label: 'Reports' }, { label: 'Reconciliation' }]}
      />

      <ContentCard>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-fg">From</label>
            <Input
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-fg">To</label>
            <Input
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              min={from}
              className="w-40"
            />
          </div>
          <Button onClick={() => setApplied({ from, to })} disabled={!from || !to}>
            Apply
          </Button>
        </div>
      </ContentCard>

      {isLoading ? (
        <LoadingState message="Loading reconciliation data…" />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          title="No reconciliation data"
          description="Select a date range and click Apply to view reconciliation."
        />
      ) : (
        <ContentCard padding="none">
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-fg">Date</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Payments</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Total amount</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Matched</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-fg">Unmatched</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-fg">Exceptions</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-fg">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const exceptionCount = Array.isArray(row.exceptions) ? row.exceptions.length : 0
                  return (
                    <tr
                      key={row.report_date}
                      className={`border-b border-border last:border-0 ${exceptionCount > 0 ? 'bg-warning/5' : ''}`}
                    >
                      <td className="px-4 py-3 text-foreground font-medium">
                        {new Date(row.report_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-mono text-xs">
                        {row.total_payments}
                      </td>
                      <td className="px-4 py-3 text-right text-foreground font-mono text-xs">
                        {parseFloat(row.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-right text-success-fg font-mono text-xs">
                        {row.matched_count}
                      </td>
                      <td className="px-4 py-3 text-right text-danger-fg font-mono text-xs">
                        {row.unmatched_count}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {exceptionCount > 0 ? (
                          <Badge variant="warning">{exceptionCount}</Badge>
                        ) : (
                          <span className="text-muted-fg text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={row.status === 'matched' ? 'success' : 'warning'} className="capitalize">
                          {row.status}
                        </Badge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </ContentCard>
      )}
    </div>
  )
}
