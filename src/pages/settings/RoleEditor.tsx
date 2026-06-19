import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { Checkbox } from '@/components/ui/atoms/Checkbox'
import { Toggle } from '@/components/ui/atoms/Toggle'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useRoles, usePermissionCatalog, useRoleTemplates, useCreateRole, useUpdateRole } from '@/hooks/useRoles'
import { getApiError } from '@/lib/apiError'
import { cn } from '@/lib/utils'
import type { RoleTemplate } from '@/api/tenants'

const ROLES_PATH = '/settings/permissions'

// ─── Sidebar nav definitions ──────────────────────────────────────────────────
// permission: null → always visible (locked), cannot be toggled via role perms

interface NavDef {
  key: string
  label: string
  permission: string | null
  locked?: string   // tooltip when untogglable
  path: string
}

const NAV_DEFS: NavDef[] = [
  { key: 'dashboard',      label: 'Dashboard',      permission: null,               locked: 'Always visible',           path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { key: 'payments',       label: 'Payments',       permission: 'payments:view',                                        path: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
  { key: 'accounts',       label: 'Accounts',       permission: 'accounts:view',                                        path: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
  { key: 'beneficiaries',  label: 'Beneficiaries',  permission: 'beneficiaries:view',                                   path: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'fx_rates',       label: 'FX Rates',       permission: null,               locked: 'Feature flag',             path: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { key: 'network',        label: 'Network',        permission: null,               locked: 'Always visible',           path: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9' },
  { key: 'kyc',            label: 'KYC',            permission: null,               locked: 'Feature flag',             path: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z' },
  { key: 'reports',        label: 'Reports',        permission: 'reports:view',                                         path: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { key: 'assistant',      label: 'Assistant',      permission: null,               locked: 'Always visible',           path: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z' },
  { key: 'settings',       label: 'Settings',       permission: null,               locked: 'Always visible',           path: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065zM15 12a3 3 0 11-6 0 3 3 0 016 0z' },
  { key: 'admin',          label: 'Admin',          permission: 'admin:config',                                         path: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
]

// ─── Mini sidebar preview ─────────────────────────────────────────────────────

function MiniSidebar({ perms }: { perms: Set<string> }) {
  const visible = (d: NavDef) => d.permission === null || perms.has(d.permission)
  return (
    <div className="w-44 shrink-0 rounded-xl border border-border bg-surface overflow-hidden shadow-sm select-none">
      {/* logo */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <div className="h-5 w-5 rounded-md bg-primary flex items-center justify-center shrink-0">
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <span className="text-[10px] font-bold text-foreground">RemitX</span>
      </div>
      {/* search stub */}
      <div className="px-2 py-1.5">
        <div className="h-5 rounded-lg bg-surface-raised border border-border flex items-center px-2 gap-1">
          <svg className="h-2 w-2 text-muted-fg/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="text-[8px] text-muted-fg/30">Search…</span>
        </div>
      </div>
      {/* nav */}
      <nav className="px-1.5 pb-2 flex flex-col gap-px">
        {NAV_DEFS.map(d => {
          const show = visible(d)
          return (
            <div key={d.key} className={cn(
              'flex items-center gap-1.5 rounded-md px-2 py-1 transition-opacity',
              show ? 'opacity-100' : 'opacity-25',
            )}>
              <svg className={cn('h-2.5 w-2.5 shrink-0', show ? 'text-muted-fg' : 'text-muted-fg/30')} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d={d.path} />
              </svg>
              <span className={cn('text-[9px] font-medium', show ? 'text-foreground/80' : 'text-muted-fg/40 line-through')}>{d.label}</span>
            </div>
          )
        })}
      </nav>
      {/* footer stub */}
      <div className="border-t border-border px-2 py-2">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded-full bg-surface-raised border border-border shrink-0" />
          <div className="flex flex-col gap-0.5">
            <div className="h-1 w-12 rounded-full bg-surface-raised" />
            <div className="h-1 w-8 rounded-full bg-surface-raised" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function RoleEditor() {
  const { key } = useParams<{ key?: string }>()
  const isEdit = Boolean(key)
  const navigate = useNavigate()

  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch } = useRoles()
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog()
  const { data: templates } = useRoleTemplates()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const pending = createRole.isPending || updateRole.isPending

  const role = useMemo(() => roles?.find(r => r.key === key) ?? null, [roles, key])

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [perms, setPerms] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [hydrated, setHydrated] = useState(false)

  // Populate the form once the role (edit) or catalog (create) is available.
  useEffect(() => {
    if (hydrated) return
    if (isEdit) {
      if (!role) return
      setName(role.name)
      setDescription(role.description ?? '')
      setPerms(new Set(role.permissions))
      setHydrated(true)
    } else if (catalog) {
      setHydrated(true)
    }
  }, [isEdit, role, catalog, hydrated])

  const allKeys = useMemo(
    () => (catalog ?? []).flatMap(g => g.permissions.map(p => p.key)),
    [catalog],
  )

  const togglePerm = (k: string, on: boolean) =>
    setPerms(prev => {
      const next = new Set(prev)
      if (on) next.add(k); else next.delete(k)
      return next
    })

  const toggleGroup = (keys: string[], on: boolean) =>
    setPerms(prev => {
      const next = new Set(prev)
      for (const k of keys) { if (on) next.add(k); else next.delete(k) }
      return next
    })

  // Load a starting point: prefill name (if blank), description, and permissions.
  const applyTemplate = (t: RoleTemplate) => {
    if (!name.trim()) setName(t.name)
    setDescription(t.description)
    setPerms(new Set(t.permissions))
  }

  const handleSave = async () => {
    setError(null)
    const permissions = allKeys.filter(k => perms.has(k))
    try {
      if (isEdit && role) {
        await updateRole.mutateAsync({
          key: role.key,
          payload: { name: name.trim(), description: description.trim() || null, permissions },
        })
      } else {
        await createRole.mutateAsync({
          name: name.trim(),
          description: description.trim() || null,
          permissions,
        })
      }
      navigate(ROLES_PATH)
    } catch (err) {
      setError(getApiError(err, 'Could not save the role.'))
    }
  }

  if (rolesLoading || catalogLoading) return <LoadingState message="Loading role…" />
  if (rolesError) return <ErrorState title="Could not load role" onRetry={refetch} />
  if (isEdit && !role) {
    return (
      <ErrorState
        title="Role not found"
        description="This role may have been deleted."
        onRetry={() => navigate(ROLES_PATH)}
      />
    )
  }

  const isSystemRole = isEdit && (role?.isSystem ?? false)
  const canSave = name.trim().length > 0 && !pending && !isSystemRole

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isSystemRole ? ((role?.name ?? 'Role') + ' (System)') : isEdit ? 'Edit role' : 'New role'}
        breadcrumbs={[{ label: 'Settings' }, { label: 'Roles', href: ROLES_PATH }, { label: isEdit ? (role?.name ?? 'Edit') : 'New role' }]}
        description={isSystemRole
          ? 'System roles are built into the platform and cannot be modified. Create a custom role to define your own permissions.'
          : isEdit
            ? "Update this role's details and the permissions it grants."
            : 'Define a new role and choose the permissions it grants. It can then be assigned to users.'}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(ROLES_PATH)} disabled={pending}>
              {isSystemRole ? 'Back' : 'Cancel'}
            </Button>
            {!isSystemRole && (
              <Button onClick={handleSave} loading={pending} disabled={!canSave}>
                {isEdit ? 'Save changes' : 'Create role'}
              </Button>
            )}
          </div>
        }
      />

      {isSystemRole && (
        <div className="flex items-start gap-3 rounded-lg border border-warning-border bg-warning/10 px-4 py-3 text-sm text-warning-fg">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span>System roles are read-only. To use a different permission set, create a custom role using "New role" from the roles list.</span>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-danger-fg/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
          {error}
        </div>
      )}

      {!isEdit && templates && templates.length > 0 && (
        <ContentCard>
          <div className="flex flex-col gap-3">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Start from a template</h2>
              <p className="text-xs text-muted-fg">Optional — prefill common roles, then adjust. Or build from scratch below.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => applyTemplate(t)}
                  className="flex flex-col items-start gap-0.5 rounded-lg border border-border bg-surface px-3 py-2 text-left transition-colors hover:border-primary/60 hover:bg-surface-raised"
                >
                  <span className="text-sm font-medium text-foreground">{t.name}</span>
                  <span className="text-[11px] text-muted-fg">{t.permissions.length} permissions</span>
                </button>
              ))}
            </div>
          </div>
        </ContentCard>
      )}

      <ContentCard>
        <div className="grid gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-fg">Role name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Treasury Ops" autoFocus />
            {isEdit && role ? (
              <p className="flex items-center gap-2 text-xs text-muted-fg">
                Key <code className="font-mono">{role.key}</code> (cannot be changed)
                {role.isSystem && <Badge variant="outline">System</Badge>}
              </p>
            ) : (
              <p className="text-xs text-muted-fg">A stable key is generated from the name automatically.</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-muted-fg">Description</label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What is this role for?" rows={2} />
          </div>
        </div>
      </ContentCard>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-foreground">Permissions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {(catalog ?? [])
            .filter(group =>
              // In read-only mode hide domains where nothing is granted — no point showing them
              isSystemRole ? group.permissions.some(p => perms.has(p.key)) : true
            )
            .map(group => {
              const groupKeys = group.permissions.map(p => p.key)
              const granted = groupKeys.filter(k => perms.has(k)).length
              const some = granted > 0
              return (
                <div key={group.domain} className="rounded-lg border border-border bg-surface">
                  <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                    <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                      {group.label}
                      {granted > 0 && granted < groupKeys.length && (
                        <span className="text-[11px] font-normal text-muted-fg">{granted}/{groupKeys.length}</span>
                      )}
                    </span>
                    <Toggle
                      checked={some}
                      onCheckedChange={on => toggleGroup(groupKeys, on)}
                      disabled={isSystemRole}
                    />
                  </div>
                  <div className="flex flex-col divide-y divide-border">
                    {group.permissions.map(p => (
                      <label
                        key={p.key}
                        className={isSystemRole
                          ? 'flex items-center gap-2.5 px-4 py-2.5'
                          : 'flex cursor-pointer items-center gap-2.5 px-4 py-2.5 hover:bg-surface-raised'}
                      >
                        <Checkbox
                          checked={perms.has(p.key)}
                          onCheckedChange={c => !isSystemRole && togglePerm(p.key, c === true)}
                          disabled={isSystemRole}
                        />
                        <span className="text-sm text-foreground">{p.label}</span>
                        {p.wildcard && <Badge variant="outline" className="ml-auto">Full domain</Badge>}
                      </label>
                    ))}
                  </div>
                </div>
              )
            })}
        </div>
      </div>

      {/* ── Sidebar access ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">Sidebar access</h2>
          <span className="text-xs text-muted-fg">· which pages this role can see in the nav</span>
        </div>

        <div className="flex gap-6 items-start">
          {/* Toggle rows */}
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {NAV_DEFS.map(d => {
              const isTogglable = d.permission !== null
              const isOn = d.permission === null || perms.has(d.permission)
              return (
                <div
                  key={d.key}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border px-3.5 py-2.5 transition-colors',
                    isOn ? 'border-border bg-surface' : 'border-border/50 bg-surface-raised/40',
                  )}
                >
                  <div className={cn(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors',
                    isOn ? 'bg-primary/10 text-primary' : 'bg-border/50 text-muted-fg/30',
                  )}>
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={d.path} />
                    </svg>
                  </div>

                  <span className={cn(
                    'flex-1 text-sm font-medium',
                    isOn ? 'text-foreground' : 'text-muted-fg/50',
                  )}>
                    {d.label}
                  </span>

                  {isTogglable ? (
                    <Toggle
                      checked={isOn}
                      onCheckedChange={v => togglePerm(d.permission!, v)}
                      disabled={isSystemRole}
                    />
                  ) : (
                    <span className="text-[10px] text-muted-fg/50 italic">{d.locked}</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Live mini sidebar preview */}
          <div className="hidden lg:flex flex-col items-center gap-2 shrink-0">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-fg">Preview</span>
            <MiniSidebar perms={perms} />
          </div>
        </div>
      </div>

      {!isSystemRole && (
        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Button variant="outline" onClick={() => navigate(ROLES_PATH)} disabled={pending}>Cancel</Button>
          <Button onClick={handleSave} loading={pending} disabled={!canSave}>
            {isEdit ? 'Save changes' : 'Create role'}
          </Button>
        </div>
      )}
    </div>
  )
}
