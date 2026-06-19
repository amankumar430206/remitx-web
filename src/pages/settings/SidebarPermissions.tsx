import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { Button } from '@/components/ui/atoms/Button'
import { ContentCard } from '@/layouts/ContentCard'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { useRoles, useUpdateRole } from '@/hooks/useRoles'
import { cn } from '@/lib/utils'
import { getApiError } from '@/lib/apiError'

// ─── Nav item definitions ─────────────────────────────────────────────────────
// Each item maps to the permission key that controls sidebar visibility.
// Items with permission: null are always visible (no way to hide via role perms).

interface SidebarNavDef {
  key: string
  label: string
  permission: string | null      // null = always shown, cannot be toggled
  requiredNote?: string          // shown instead of toggle when always-on
  icon: React.ReactNode
}

const ICON = (path: string) => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d={path} />
  </svg>
)

const NAV_DEFS: SidebarNavDef[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    permission: null,
    requiredNote: 'Always visible',
    icon: ICON('M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6'),
  },
  {
    key: 'payments',
    label: 'Payments',
    permission: 'payments:view',
    icon: ICON('M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4'),
  },
  {
    key: 'accounts',
    label: 'Accounts',
    permission: 'accounts:view',
    icon: ICON('M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z'),
  },
  {
    key: 'beneficiaries',
    label: 'Beneficiaries',
    permission: 'beneficiaries:view',
    icon: ICON('M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z'),
  },
  {
    key: 'fx_rates',
    label: 'FX Rates',
    permission: null,
    requiredNote: 'Controlled by feature flag',
    icon: ICON('M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'),
  },
  {
    key: 'network',
    label: 'Network',
    permission: null,
    requiredNote: 'Always visible',
    icon: ICON('M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9'),
  },
  {
    key: 'kyc',
    label: 'KYC',
    permission: null,
    requiredNote: 'Controlled by feature flag',
    icon: ICON('M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'),
  },
  {
    key: 'reports',
    label: 'Reports',
    permission: 'reports:view',
    icon: ICON('M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'),
  },
  {
    key: 'assistant',
    label: 'Assistant',
    permission: null,
    requiredNote: 'Always visible',
    icon: (
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
      </svg>
    ),
  },
  {
    key: 'settings',
    label: 'Settings',
    permission: null,
    requiredNote: 'Always visible',
    icon: ICON('M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z'),
  },
  {
    key: 'admin',
    label: 'Admin',
    permission: 'admin:config',
    icon: ICON('M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4'),
  },
]

const TOGGLABLE = NAV_DEFS.filter(d => d.permission !== null)

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40',
        checked ? 'bg-primary' : 'bg-border',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
          checked ? 'translate-x-4' : 'translate-x-0',
        )}
      />
    </button>
  )
}

// ─── Mock sidebar preview ─────────────────────────────────────────────────────

function MockSidebar({ enabled }: { enabled: Set<string> }) {
  const isVisible = (def: SidebarNavDef) =>
    def.permission === null || enabled.has(def.permission)

  return (
    <div className="w-48 rounded-2xl border border-border bg-surface overflow-hidden shadow-sm select-none">
      {/* Logo area */}
      <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-border">
        <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <span className="text-xs font-bold text-foreground">RemitX</span>
      </div>

      {/* Search bar stub */}
      <div className="px-2.5 py-2">
        <div className="h-6 rounded-lg bg-surface-raised border border-border flex items-center px-2 gap-1.5">
          <svg className="h-2.5 w-2.5 text-muted-fg/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[9px] text-muted-fg/40">Search…</span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="px-2 pb-3 flex flex-col gap-0.5">
        {NAV_DEFS.map(def => {
          const visible = isVisible(def)
          return (
            <div
              key={def.key}
              className={cn(
                'flex items-center gap-2 rounded-lg px-2 py-1.5 transition-all',
                visible
                  ? 'text-foreground/80 hover:bg-surface-raised'
                  : 'opacity-30 line-through text-muted-fg',
              )}
            >
              <span className={visible ? 'text-muted-fg' : 'text-muted-fg/30'}>
                {def.icon}
              </span>
              <span className={cn('text-[10px] font-medium', !visible && 'line-through')}>
                {def.label}
              </span>
              {!visible && (
                <svg className="ml-auto h-2.5 w-2.5 text-danger-fg/60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer stub */}
      <div className="border-t border-border px-2 py-2.5">
        <div className="flex items-center gap-2 px-2">
          <div className="h-5 w-5 rounded-full bg-surface-raised border border-border shrink-0" />
          <div className="flex flex-col gap-0.5">
            <div className="h-1.5 w-16 rounded-full bg-surface-raised" />
            <div className="h-1.5 w-10 rounded-full bg-surface-raised" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const HIDDEN_ROLE_KEYS = new Set(['super_admin'])

export function SidebarPermissions() {
  const navigate = useNavigate()
  const { data: roles, isLoading, isError, refetch } = useRoles()
  const updateRole = useUpdateRole()

  const visibleRoles = useMemo(
    () => (roles ?? []).filter(r => !HIDDEN_ROLE_KEYS.has(r.key)),
    [roles],
  )

  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [enabled, setEnabled] = useState<Set<string>>(new Set())
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Auto-select first role
  useEffect(() => {
    if (visibleRoles.length > 0 && !selectedKey) {
      setSelectedKey(visibleRoles[0].key)
    }
  }, [visibleRoles, selectedKey])

  const selectedRole = useMemo(
    () => visibleRoles.find(r => r.key === selectedKey) ?? null,
    [visibleRoles, selectedKey],
  )

  // Seed enabled set from role permissions when role changes
  useEffect(() => {
    if (!selectedRole) return
    const perms = new Set(selectedRole.permissions)
    // enabled = all togglable nav items whose permission is in the role's perms
    setEnabled(new Set(
      TOGGLABLE
        .filter(d => perms.has(d.permission!))
        .map(d => d.permission!),
    ))
    setDirty(false)
    setSaved(false)
    setError(null)
  }, [selectedRole])

  const toggle = (permission: string, on: boolean) => {
    setEnabled(prev => {
      const next = new Set(prev)
      if (on) next.add(permission)
      else next.delete(permission)
      return next
    })
    setDirty(true)
    setSaved(false)
  }

  const handleSave = async () => {
    if (!selectedRole) return
    setError(null)
    // Keep all non-nav permissions, then add enabled nav permissions
    const navPerms = new Set(TOGGLABLE.map(d => d.permission!))
    const otherPerms = selectedRole.permissions.filter(p => !navPerms.has(p))
    const next = [...otherPerms, ...Array.from(enabled)]
    try {
      await updateRole.mutateAsync({
        key: selectedRole.key,
        payload: { permissions: next },
      })
      setDirty(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(getApiError(err, 'Failed to save permissions.'))
    }
  }

  if (isLoading) return <LoadingState message="Loading roles…" />
  if (isError) return <ErrorState title="Could not load roles" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Sidebar Access"
        breadcrumbs={[
          { label: 'Settings' },
          { label: 'Roles', href: '/settings/permissions' },
          { label: 'Sidebar Access' },
        ]}
        description="Control which pages each role can see in the sidebar. Changes apply immediately after saving."
        actions={
          <Button size="sm" variant="outline" onClick={() => navigate('/settings/permissions')}>
            ← Back to roles
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-6 items-start">

        {/* ── Left: toggle panel ── */}
        <ContentCard>
          {/* Role selector */}
          <div className="mb-5">
            <label className="block text-xs font-semibold text-muted-fg uppercase tracking-widest mb-2">
              Role
            </label>
            <div className="flex flex-wrap gap-2">
              {visibleRoles.map(r => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => setSelectedKey(r.key)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                    selectedKey === r.key
                      ? 'bg-primary border-primary text-white shadow-sm shadow-primary/25'
                      : 'border-border text-muted-fg hover:border-primary/40 hover:text-foreground',
                  )}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {selectedRole && (
            <>
              <p className="text-xs text-muted-fg mb-4">
                {selectedRole.description
                  ? selectedRole.description
                  : `Configure which sidebar pages the ${selectedRole.name} role can access.`}
              </p>

              <div className="flex flex-col gap-1">
                {NAV_DEFS.map(def => {
                  const isTogglable = def.permission !== null
                  const isEnabled = !isTogglable || enabled.has(def.permission!)
                  const isSystem = selectedRole.isSystem

                  return (
                    <div
                      key={def.key}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors',
                        isEnabled
                          ? 'border-border bg-surface'
                          : 'border-border/50 bg-surface-raised/50',
                      )}
                    >
                      {/* Icon */}
                      <div className={cn(
                        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors',
                        isEnabled ? 'bg-primary/10 text-primary' : 'bg-border/50 text-muted-fg/40',
                      )}>
                        {def.icon}
                      </div>

                      {/* Label */}
                      <div className="flex-1 min-w-0">
                        <p className={cn(
                          'text-sm font-medium',
                          isEnabled ? 'text-foreground' : 'text-muted-fg/60',
                        )}>
                          {def.label}
                        </p>
                        {!isTogglable && (
                          <p className="text-[10px] text-muted-fg/60 mt-0.5">{def.requiredNote}</p>
                        )}
                      </div>

                      {/* Control */}
                      {isTogglable ? (
                        <Toggle
                          checked={isEnabled}
                          onChange={v => toggle(def.permission!, v)}
                          disabled={isSystem}
                        />
                      ) : (
                        <span className="text-[10px] text-muted-fg/50 italic shrink-0">locked</span>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Save bar */}
              <div className="mt-5 flex items-center justify-between gap-3 pt-4 border-t border-border">
                <div className="text-xs text-muted-fg">
                  {selectedRole.isSystem
                    ? 'System roles cannot be modified.'
                    : dirty
                      ? 'Unsaved changes'
                      : saved
                        ? '✓ Saved'
                        : `${TOGGLABLE.filter(d => enabled.has(d.permission!)).length} of ${TOGGLABLE.length} pages enabled`}
                </div>
                {!selectedRole.isSystem && (
                  <Button
                    size="sm"
                    onClick={handleSave}
                    loading={updateRole.isPending}
                    disabled={!dirty}
                  >
                    Save changes
                  </Button>
                )}
              </div>

              {error && (
                <p className="mt-2 text-xs text-danger-fg">{error}</p>
              )}
            </>
          )}
        </ContentCard>

        {/* ── Centre: live mock preview ── */}
        <div className="flex flex-col items-center gap-3">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">Preview</p>
          <MockSidebar enabled={enabled} />
          <p className="text-[10px] text-muted-fg/60 text-center max-w-[12rem]">
            Updates live as you toggle. Greyed items are hidden from this role.
          </p>
        </div>

        {/* ── Right: legend / info ── */}
        <ContentCard>
          <h3 className="text-sm font-semibold text-foreground mb-1">How it works</h3>
          <p className="text-xs text-muted-fg mb-4 leading-relaxed">
            Each toggle adds or removes the underlying API permission for this role. Users assigned
            this role see only the pages that are enabled here.
          </p>

          <div className="flex flex-col gap-3">
            {NAV_DEFS.filter(d => d.permission !== null).map(def => (
              <div key={def.key} className="flex items-start gap-2.5">
                <div className={cn(
                  'mt-0.5 h-5 w-5 shrink-0 flex items-center justify-center rounded-md',
                  enabled.has(def.permission!) ? 'bg-primary/10 text-primary' : 'bg-border/50 text-muted-fg/40',
                )}>
                  {def.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-foreground">{def.label}</p>
                  <code className="text-[10px] text-muted-fg font-mono">{def.permission}</code>
                </div>
                <div className={cn(
                  'ml-auto shrink-0 mt-0.5 h-1.5 w-1.5 rounded-full',
                  enabled.has(def.permission!) ? 'bg-success-fg' : 'bg-border',
                )} />
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border rounded-xl bg-surface-raised p-3">
            <p className="text-[11px] font-semibold text-muted-fg mb-1">Locked items</p>
            <p className="text-[11px] text-muted-fg/70 leading-relaxed">
              Dashboard, Network, Settings, Assistant, FX Rates, and KYC are always shown
              regardless of role — they are controlled by feature flags or are universally required.
            </p>
          </div>
        </ContentCard>

      </div>
    </div>
  )
}
