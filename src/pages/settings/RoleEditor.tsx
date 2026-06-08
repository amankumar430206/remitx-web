import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { Checkbox } from '@/components/ui/atoms/Checkbox'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useRoles, usePermissionCatalog, useRoleTemplates, useCreateRole, useUpdateRole } from '@/hooks/useRoles'
import { getApiError } from '@/lib/apiError'
import type { RoleTemplate } from '@/api/tenants'

const ROLES_PATH = '/settings/permissions'

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

  const canSave = name.trim().length > 0 && !pending

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={isEdit ? `Edit role` : 'New role'}
        breadcrumbs={[{ label: 'Settings' }, { label: 'Roles', href: ROLES_PATH }, { label: isEdit ? (role?.name ?? 'Edit') : 'New role' }]}
        description={isEdit
          ? 'Update this role’s details and the permissions it grants.'
          : 'Define a new role and choose the permissions it grants. It can then be assigned to users.'}
        actions={
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(ROLES_PATH)} disabled={pending}>Cancel</Button>
            <Button onClick={handleSave} loading={pending} disabled={!canSave}>
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </div>
        }
      />

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
          {(catalog ?? []).map(group => {
            const groupKeys = group.permissions.map(p => p.key)
            const granted = groupKeys.filter(k => perms.has(k)).length
            const all = granted === groupKeys.length
            const some = granted > 0 && !all
            return (
              <div key={group.domain} className="rounded-lg border border-border bg-surface">
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    {group.label}
                    {some && <span className="text-[11px] font-normal text-muted-fg">{granted}/{groupKeys.length}</span>}
                  </span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(groupKeys, !all)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {all ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {group.permissions.map(p => (
                    <label key={p.key} className="flex cursor-pointer items-center gap-2.5 px-4 py-2.5 hover:bg-surface-raised">
                      <Checkbox checked={perms.has(p.key)} onCheckedChange={c => togglePerm(p.key, c === true)} />
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

      <div className="flex justify-end gap-3 border-t border-border pt-5">
        <Button variant="outline" onClick={() => navigate(ROLES_PATH)} disabled={pending}>Cancel</Button>
        <Button onClick={handleSave} loading={pending} disabled={!canSave}>
          {isEdit ? 'Save changes' : 'Create role'}
        </Button>
      </div>
    </div>
  )
}
