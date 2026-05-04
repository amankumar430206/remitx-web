import { useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Toggle } from '@/components/ui/atoms/Toggle'
import { ContentCard } from '@/layouts/ContentCard'
import { useProviders, useUpdateProvider } from '@/hooks/useAdmin'
import type { ProviderConfig as ProviderConfigType } from '@/api/admin'

function ProviderCard({ provider }: { provider: ProviderConfigType }) {
  const [editing, setEditing] = useState(false)
  const [priority, setPriority] = useState(String(provider.priority))
  const updateMutation = useUpdateProvider()

  const handleToggle = (enabled: boolean) => {
    updateMutation.mutate({ id: provider.id, payload: { enabled } })
  }

  const handleSave = () => {
    updateMutation.mutate(
      { id: provider.id, payload: { priority: Number(priority) } },
      { onSuccess: () => setEditing(false) }
    )
  }

  return (
    <ContentCard>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-sm font-semibold text-foreground">{provider.name}</h3>
            <Badge variant="secondary" className="capitalize">{provider.type}</Badge>
            {provider.enabled ? (
              <Badge variant="success">Active</Badge>
            ) : (
              <Badge variant="default">Inactive</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-1 mb-3">
            {provider.currencies.map(c => (
              <span key={c} className="rounded bg-muted px-2 py-0.5 text-xs font-mono text-muted-fg">{c}</span>
            ))}
          </div>

          {editing ? (
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-muted-fg">Priority</label>
                <Input
                  type="number"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                  className="w-24"
                  min="1"
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <Button size="sm" loading={updateMutation.isPending} onClick={handleSave}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => { setEditing(false); setPriority(String(provider.priority)) }}>Cancel</Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-fg">Priority: {provider.priority}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Configure</Button>
          )}
          <Toggle
            checked={provider.enabled}
            onCheckedChange={handleToggle}
          />
        </div>
      </div>

      {updateMutation.isError && (
        <div className="mt-3 rounded-md bg-danger border border-danger-border px-3 py-2 text-xs text-danger-fg">
          Could not save changes.
        </div>
      )}
    </ContentCard>
  )
}

export function ProviderConfig() {
  const { data: providers, isLoading, isError, refetch } = useProviders()

  if (isLoading) return <LoadingState message="Loading providers…" />
  if (isError) return <ErrorState title="Could not load providers" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Provider configuration"
        breadcrumbs={[{ label: 'Admin' }, { label: 'Providers' }]}
      />

      {(providers ?? []).length === 0 ? (
        <ContentCard>
          <p className="text-sm text-muted-fg text-center py-6">No payment providers configured.</p>
        </ContentCard>
      ) : (
        <div className="flex flex-col gap-4">
          {(providers ?? []).map(provider => (
            <ProviderCard key={provider.id} provider={provider} />
          ))}
        </div>
      )}
    </div>
  )
}
