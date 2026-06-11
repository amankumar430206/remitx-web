import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { PermissionMatrix } from '@/components/ui/organisms/PermissionMatrix'
import { useRoles, usePermissionCatalog } from '@/hooks/useRoles'

const HIDDEN_ROLE_KEYS = new Set(['super_admin'])
const ROLES_PATH = '/settings/permissions'

export function RoleComparison() {
  const navigate = useNavigate()
  const { data: roles, isLoading: rolesLoading, isError: rolesError, refetch } = useRoles()
  const { data: catalog, isLoading: catalogLoading } = usePermissionCatalog()

  const visibleRoles = useMemo(
    () => (roles ?? []).filter(r => !HIDDEN_ROLE_KEYS.has(r.key)),
    [roles],
  )

  // Flat permission list with group labels for the matrix rows
  const flatPermissions = useMemo(
    () =>
      (catalog ?? []).flatMap(g =>
        g.permissions.map(p => ({ key: p.key, label: p.label, group: g.label })),
      ),
    [catalog],
  )

  // Map from role key → list of granted permission keys
  const permissionValue = useMemo(
    () =>
      Object.fromEntries(visibleRoles.map(r => [r.key, r.permissions])),
    [visibleRoles],
  )

  const roleLabels = useMemo(
    () => Object.fromEntries(visibleRoles.map(r => [r.key, r.name])),
    [visibleRoles],
  )

  if (rolesLoading || catalogLoading) return <LoadingState message="Loading roles…" />
  if (rolesError) return <ErrorState title="Could not load roles" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Compare roles"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Roles', href: ROLES_PATH }, { label: 'Compare' }]}
        description="Side-by-side view of every role and the permissions each one grants. Read-only — click Edit to open a role."
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROLES_PATH)}>
            Back to roles
          </Button>
        }
      />

      {visibleRoles.length === 0 ? (
        <div className="rounded-lg border border-border bg-surface px-6 py-10 text-center text-sm text-muted-fg">
          No roles to compare.
        </div>
      ) : (
        <>
          <PermissionMatrix
            roles={visibleRoles.map(r => r.key)}
            roleLabels={roleLabels}
            permissions={flatPermissions}
            value={permissionValue}
            readOnly
          />

          <div className="flex flex-wrap gap-2">
            {visibleRoles.filter(r => !r.isSystem).map(r => (
              <Button
                key={r.key}
                size="sm"
                variant="outline"
                onClick={() => navigate(`${ROLES_PATH}/${r.key}`)}
              >
                Edit {r.name}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
