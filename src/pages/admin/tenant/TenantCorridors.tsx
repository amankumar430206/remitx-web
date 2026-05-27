import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ContentCard } from '@/layouts/ContentCard'
import { useProviderConfig, useUpdateProviderConfig } from '@/hooks/useAdmin'
import type { CorridorConfig } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const columns: Column<CorridorConfig>[] = [
  {
    key: 'source_currency',
    header: 'Source',
    render: row => (
      <span className="font-mono text-xs font-semibold text-foreground">
        {row.source_currency}
      </span>
    ),
  },
  {
    key: 'dest_currency',
    header: 'Destination',
    render: row => (
      <span className="font-mono text-xs font-semibold text-foreground">
        {row.dest_currency ?? <span className="text-muted-fg">Any</span>}
      </span>
    ),
  },
  {
    key: 'provider_name',
    header: 'Provider',
    render: row => (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-mono text-foreground">
        {row.provider_name}
      </span>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    render: row => (
      <span className="text-xs tabular-nums text-muted-fg">{row.priority}</span>
    ),
  },
  {
    key: 'is_active',
    header: 'Active',
    render: row => (
      <Badge variant={row.is_active ? 'success' : 'default'}>
        {row.is_active ? 'Yes' : 'No'}
      </Badge>
    ),
  },
]

interface Props {
  tenantId: string
}

export function TenantCorridors({ tenantId }: Props) {
  const { data: corridors, isLoading } = useProviderConfig(tenantId)
  const updateMutation = useUpdateProviderConfig()

  const onRefresh = () => {
    if (!corridors) return
    updateMutation.mutate({
      tenantId,
      corridors: corridors.map(c => ({
        sourceCurrency: c.source_currency,
        ...(c.dest_currency ? { destCurrency: c.dest_currency } : {}),
        providerName: c.provider_name,
        priority: c.priority,
      })),
    })
  }

  return (
    <ContentCard padding="none">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Payment corridors</h3>
          <p className="text-xs text-muted-fg">Provider routing rules for this tenant</p>
        </div>
        <Button variant="outline" size="sm" loading={updateMutation.isPending} onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      {isLoading ? (
        <LoadingState message="Loading corridors…" />
      ) : !corridors?.length ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border">
            <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </div>
          <p className="text-sm text-muted-fg">No corridors configured</p>
          <p className="text-xs text-muted-fg">This tenant uses the default provider for all corridors.</p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={corridors}
          getRowId={row => row.id}
          emptyTitle="No corridors"
        />
      )}
    </ContentCard>
  )
}
