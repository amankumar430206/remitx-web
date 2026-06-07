import { useEffect, useMemo, useState } from 'react'
import { Drawer } from '@/components/ui/molecules/Drawer'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Textarea } from '@/components/ui/atoms/Textarea'
import { Checkbox } from '@/components/ui/atoms/Checkbox'
import { Badge } from '@/components/ui/atoms/Badge'
import { useCreateRole, useUpdateRole } from '@/hooks/useRoles'
import type { Role, PermissionCatalogGroup } from '@/api/tenants'

interface RoleEditorDrawerProps {
  open: boolean
  onClose: () => void
  /** null = create mode; a Role = edit mode */
  role: Role | null
  catalog: PermissionCatalogGroup[]
}

function errorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } }
  return e?.response?.data?.error?.message ?? 'Something went wrong. Please try again.'
}

export function RoleEditorDrawer({ open, onClose, role, catalog }: RoleEditorDrawerProps) {
  const isEdit = role !== null
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const pending = createRole.isPending || updateRole.isPending

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [perms, setPerms] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  // Reset form whenever the drawer opens for a different role.
  useEffect(() => {
    if (!open) return
    setName(role?.name ?? '')
    setDescription(role?.description ?? '')
    setPerms(new Set(role?.permissions ?? []))
    setError(null)
  }, [open, role])

  const allKeys = useMemo(
    () => catalog.flatMap(g => g.permissions.map(p => p.key)),
    [catalog],
  )

  const togglePerm = (key: string, on: boolean) => {
    setPerms(prev => {
      const next = new Set(prev)
      if (on) next.add(key); else next.delete(key)
      return next
    })
  }

  const toggleGroup = (group: PermissionCatalogGroup, on: boolean) => {
    setPerms(prev => {
      const next = new Set(prev)
      for (const p of group.permissions) {
        if (on) next.add(p.key); else next.delete(p.key)
      }
      return next
    })
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
      onClose()
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const canSave = name.trim().length > 0 && !pending

  return (
    <Drawer open={open} onClose={onClose} title={isEdit ? 'Edit role' : 'New role'} width="w-[28rem]">
      <div className="flex flex-col gap-5">
        {error && (
          <div className="rounded-lg border border-danger-fg/30 bg-danger/10 px-3 py-2 text-sm text-danger-fg">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-fg">Role name</label>
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Treasury Ops"
            autoFocus
          />
          {isEdit && role && (
            <p className="text-xs text-muted-fg">
              Key <code className="font-mono">{role.key}</code> (cannot be changed)
              {role.isSystem && <Badge variant="outline" className="ml-2">System</Badge>}
            </p>
          )}
          {!isEdit && (
            <p className="text-xs text-muted-fg">A stable key is generated from the name automatically.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-muted-fg">Description</label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this role for?"
            rows={2}
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-medium text-muted-fg">Permissions</label>
          {catalog.map(group => {
            const granted = group.permissions.filter(p => perms.has(p.key)).length
            const all = granted === group.permissions.length
            const some = granted > 0 && !all
            return (
              <div key={group.domain} className="rounded-lg border border-border">
                <div className="flex items-center justify-between bg-surface-raised px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{group.label}</span>
                  <button
                    type="button"
                    onClick={() => toggleGroup(group, !all)}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    {all ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="flex flex-col divide-y divide-border">
                  {group.permissions.map(p => (
                    <label
                      key={p.key}
                      className="flex cursor-pointer items-center gap-2.5 px-3 py-2 hover:bg-surface-raised"
                    >
                      <Checkbox
                        checked={perms.has(p.key)}
                        onCheckedChange={c => togglePerm(p.key, c === true)}
                      />
                      <span className="text-sm text-foreground">{p.label}</span>
                      {p.wildcard && <Badge variant="outline" className="ml-auto">Full domain</Badge>}
                    </label>
                  ))}
                  {some && (
                    <span className="px-3 py-1 text-[11px] text-muted-fg">{granted} of {group.permissions.length} selected</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button onClick={handleSave} loading={pending} disabled={!canSave}>
            {isEdit ? 'Save changes' : 'Create role'}
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
