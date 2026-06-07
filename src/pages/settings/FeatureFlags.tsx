import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { ContentCard } from '@/layouts/ContentCard'
import { Button } from '@/components/ui/atoms/Button'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import { usePermissions } from '@/hooks/usePermissions'
import { FEATURE_FLAGS, FLAG_GROUPS, DEFAULT_FLAGS } from '@/config/featureFlags'
import tenantsApi from '@/api/tenants'
import { cn } from '@/lib/utils'

function Toggle({ enabled, onChange, disabled }: { enabled: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      disabled={disabled}
      onClick={() => onChange(!enabled)}
      className={cn(
        'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        enabled ? 'bg-primary' : 'bg-border-strong',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out',
          enabled ? 'translate-x-5' : 'translate-x-0'
        )}
      />
    </button>
  )
}

export function FeatureFlags() {
  const qc = useQueryClient()
  const setFlags = useFeatureFlagStore(s => s.setFlags)
  const { has } = usePermissions()
  // Editing feature flags is platform-level — super admin only (admin:features).
  const canManageFlags = has('admin:features')

  const [localFlags, setLocalFlags] = useState<Record<string, boolean>>(DEFAULT_FLAGS)
  const [saved, setSaved] = useState(false)

  useQuery({
    queryKey: ['feature-flags'],
    queryFn: () => tenantsApi.getFeatureFlags().then(r => {
      const merged = { ...DEFAULT_FLAGS, ...r.data.data }
      setLocalFlags(merged)
      return merged
    }),
  })

  const mutation = useMutation({
    mutationFn: (flags: Record<string, boolean>) => tenantsApi.updateFeatureFlags(flags),
    onSuccess: (r) => {
      const merged = { ...DEFAULT_FLAGS, ...r.data.data }
      setFlags(merged)
      setLocalFlags(merged)
      qc.invalidateQueries({ queryKey: ['feature-flags'] })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const toggle = (key: string, value: boolean) => {
    if (!canManageFlags) return
    setLocalFlags(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  const handleSave = () => mutation.mutate(localFlags)

  const resetDefaults = () => {
    setLocalFlags(DEFAULT_FLAGS)
    setSaved(false)
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader
        title="Feature flags"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Feature flags' }]}
        actions={
          canManageFlags ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={resetDefaults}>
                Reset defaults
              </Button>
              <Button size="sm" loading={mutation.isPending} onClick={handleSave}>
                Save changes
              </Button>
            </div>
          ) : undefined
        }
      />

      {!canManageFlags && (
        <div className="rounded-xl bg-warning/10 border border-warning-fg/20 px-4 py-3 text-sm text-warning-fg">
          You have read-only access. Contact an admin to change feature flags.
        </div>
      )}

      {saved && (
        <div className="rounded-xl bg-success border border-success-fg/20 px-4 py-3 text-sm text-success-fg">
          Feature flags saved and applied.
        </div>
      )}

      {FLAG_GROUPS.map(group => {
        const flags = FEATURE_FLAGS.filter(f => f.group === group)
        return (
          <ContentCard key={group}>
            <h3 className="text-sm font-semibold text-foreground mb-4">{group}</h3>
            <div className="flex flex-col divide-y divide-border">
              {flags.map((flag, i) => {
                const enabled = localFlags[flag.key] ?? flag.defaultEnabled
                const isDefault = enabled === flag.defaultEnabled
                return (
                  <div key={flag.key} className={cn('flex items-center justify-between gap-4 py-3.5', i === 0 && 'pt-0')}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{flag.label}</span>
                        {!isDefault && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-warning/10 text-warning-fg border-warning-fg/20">
                            Modified
                          </span>
                        )}
                        {!flag.defaultEnabled && isDefault && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-surface-overlay text-muted-fg">
                            Off by default
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-fg mt-0.5">{flag.description}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={cn('text-xs font-medium', enabled ? 'text-success-fg' : 'text-muted-fg')}>
                        {enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <Toggle enabled={enabled} onChange={v => toggle(flag.key, v)} disabled={!canManageFlags} />
                    </div>
                  </div>
                )
              })}
            </div>
          </ContentCard>
        )
      })}
    </div>
  )
}
