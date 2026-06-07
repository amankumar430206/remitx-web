import { useMemo, useState } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable, type Column } from '@/components/ui/organisms/DataTable'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useRoles, usePermissionCatalog, useDeleteRole } from '@/hooks/useRoles'
import { RoleEditorDrawer } from './RoleEditorDrawer'
import type { Role } from '@/api/tenants'

// super_admin is a platform-level role, not tenant-editable — hide it here.
const HIDDEN_ROLE_KEYS = new Set(['super_admin'])

function deleteErrorMessage(err: unknown): string {
  const e = err as { response?: { data?: { error?: { message?: string } } } }
  return e?.response?.data?.error?.message ?? 'Could not delete this role.'
}

export function Permissions() {
  const { data: roles, isLoading, isError, refetch } = useRoles()
  const { data: catalog } = usePermissionCatalog()
  const deleteRole = useDeleteRole()

  const [editorOpen, setEditorOpen] = useState(false)
  const [editing, setEditing] = useState<Role | null>(null)
  const [toDelete, setToDelete] = useState<Role | null>(null)
  const [deleteErr, setDeleteErr] = useState<string | null>(null)

  const visibleRoles = useMemo(
    () => (roles ?? []).filter(r => !HIDDEN_ROLE_KEYS.has(r.key)),
    [roles],
  )

  const openCreate = () => { setEditing(null); setEditorOpen(true) }
  const openEdit = (role: Role) => { setEditing(role); setEditorOpen(true) }

  const confirmDelete = async () => {
    if (!toDelete) return
    setDeleteErr(null)
    try {
      await deleteRole.mutateAsync(toDelete.key)
      setToDelete(null)
    } catch (err) {
      setDeleteErr(deleteErrorMessage(err))
    }
  }

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: 'Role',
      render: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{r.name}</span>
          <Badge variant={r.isSystem ? 'outline' : 'primary'}>
            {r.isSystem ? 'System' : 'Custom'}
          </Badge>
        </div>
      ),
    },
    {
      key: 'key',
      header: 'Key',
      render: (r) => <code className="font-mono text-xs text-muted-fg">{r.key}</code>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (r) => <span className="text-muted-fg">{r.description || '—'}</span>,
    },
    {
      key: 'permissions',
      header: 'Permissions',
      className: 'text-center',
      headerClassName: 'text-center',
      render: (r) => <span className="text-foreground">{r.permissions.length}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'text-right',
      render: (r) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-danger-fg hover:bg-danger/10"
            onClick={() => { setDeleteErr(null); setToDelete(r) }}
          >
            Delete
          </Button>
        </div>
      ),
    },
  ]

  if (isLoading) return <LoadingState message="Loading roles…" />
  if (isError) return <ErrorState title="Could not load roles" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Roles & Permissions"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Roles' }]}
        description="Define roles and the permissions they grant. Custom roles can be assigned to users just like the built-in ones."
        actions={<Button size="sm" onClick={openCreate}>New role</Button>}
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={visibleRoles}
          getRowId={(r) => r.key}
          emptyTitle="No roles yet"
          emptyDescription="Create your first custom role to get started."
        />
      </ContentCard>

      {catalog && (
        <RoleEditorDrawer
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          role={editing}
          catalog={catalog}
        />
      )}

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(o) => { if (!o) setToDelete(null) }}
        title={`Delete role "${toDelete?.name}"?`}
        description="This removes the role and its permissions. Users still assigned to it must be reassigned first."
        confirmLabel="Delete role"
        variant="danger"
        loading={deleteRole.isPending}
        onConfirm={confirmDelete}
      >
        {deleteErr && (
          <div className="rounded-lg border border-danger-fg/30 bg-danger/10 px-3 py-2 text-sm text-danger-fg">
            {deleteErr}
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
