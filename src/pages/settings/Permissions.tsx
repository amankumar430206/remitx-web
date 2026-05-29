import { useState, useEffect, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { PermissionMatrix } from '@/components/ui/organisms/PermissionMatrix'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { Button } from '@/components/ui/atoms/Button'
import { ContentCard } from '@/layouts/ContentCard'
import tenantsApi from '@/api/tenants'

// Preferred display order — any role returned by the API not in this list
// gets appended at the end automatically.
const ROLE_ORDER = ['client_admin', 'maker', 'checker', 'subclient_admin', 'subclient_user']

const ROLE_LABELS: Record<string, string> = {
  client_admin:    'Admin',
  maker:           'Maker',
  checker:         'Checker',
  subclient_admin: 'Sub-client Admin',
  subclient_user:  'Sub-client User',
}

const PERMISSIONS = [
  { key: 'payments:create',       label: 'Create payment',       group: 'Payments' },
  { key: 'payments:view',         label: 'View payments',        group: 'Payments' },
  { key: 'payments:view_all',     label: 'View all payments',    group: 'Payments' },
  { key: 'payments:approve',      label: 'Approve payment',      group: 'Payments' },
  { key: 'payments:cancel',       label: 'Cancel payment',       group: 'Payments' },
  { key: 'beneficiaries:view',    label: 'View beneficiaries',   group: 'Beneficiaries' },
  { key: 'beneficiaries:create',  label: 'Add / edit',           group: 'Beneficiaries' },
  { key: 'beneficiaries:delete',  label: 'Delete beneficiary',   group: 'Beneficiaries' },
  { key: 'accounts:view',         label: 'View accounts',        group: 'Accounts' },
  { key: 'accounts:create',       label: 'Create account',       group: 'Accounts' },
  { key: 'reports:view',          label: 'View reports',         group: 'Reports' },
  { key: 'reports:export',        label: 'Export reports',       group: 'Reports' },
  { key: 'users:invite',          label: 'Invite users',         group: 'Users' },
  { key: 'users:manage',          label: 'Manage users',         group: 'Users' },
  { key: 'admin:config',          label: 'Tenant configuration', group: 'Admin' },
  { key: 'compliance:review',     label: 'Review compliance',    group: 'Admin' },
]

const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key)

export function Permissions() {
  const qc = useQueryClient()
  const [matrix, setMatrix] = useState<Record<string, string[]>>({})
  const [dirty, setDirty] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['roles'],
    queryFn: () => tenantsApi.listRoles().then(r => r.data.data),
  })

  // Derive the role list from the API — ordered by ROLE_ORDER, extras appended.
  // super_admin is excluded (hardcoded full-access, not user-editable).
  const roles = useMemo(() => {
    if (!data) return ROLE_ORDER
    const fromApi = data.map((d: { role: string }) => d.role).filter((r: string) => r !== 'super_admin')
    const ordered = ROLE_ORDER.filter(r => fromApi.includes(r))
    const extras   = fromApi.filter((r: string) => !ROLE_ORDER.includes(r))
    return [...ordered, ...extras]
  }, [data])

  // Populate matrix from API data
  useEffect(() => {
    if (!data) return
    const m: Record<string, string[]> = {}
    for (const { role, permissions } of data) {
      m[role] = permissions
    }
    // Ensure all derived roles have an entry even if not yet in DB
    for (const r of roles) {
      if (!m[r]) m[r] = []
    }
    setMatrix(m)
    setDirty(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  const saveMutation = useMutation({
    mutationFn: async () => {
      await Promise.all(
        roles.map(role => tenantsApi.upsertRole(role, matrix[role] ?? []))
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['roles'] })
      setDirty(false)
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2500)
    },
  })

  const handleChange = (role: string, permission: string, granted: boolean) => {
    setMatrix(prev => ({
      ...prev,
      [role]: granted
        ? [...(prev[role] ?? []), permission]
        : (prev[role] ?? []).filter(p => p !== permission),
    }))
    setDirty(true)
    setSavedMsg(false)
  }

  const handleToggleAll = (role: string, grant: boolean) => {
    setMatrix(prev => ({
      ...prev,
      [role]: grant ? [...ALL_PERMISSION_KEYS] : [],
    }))
    setDirty(true)
    setSavedMsg(false)
  }

  if (isLoading) return <LoadingState message="Loading permissions…" />
  if (isError) return <ErrorState title="Could not load permissions" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Role Permissions"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Permissions' }]}
        description="Control what each role can do across the platform. Changes apply immediately on save."
        actions={
          <div className="flex items-center gap-3">
            {savedMsg && <span className="text-sm text-success-fg font-medium">Saved</span>}
            {dirty && !saveMutation.isPending && (
              <span className="text-xs text-warning-fg font-medium">Unsaved changes</span>
            )}
            <Button
              size="sm"
              loading={saveMutation.isPending}
              disabled={!dirty}
              onClick={() => saveMutation.mutate()}
            >
              Save permissions
            </Button>
          </div>
        }
      />

      <ContentCard padding="none">
        <PermissionMatrix
          roles={roles}
          roleLabels={ROLE_LABELS}
          permissions={PERMISSIONS}
          value={matrix}
          onChange={handleChange}
          onToggleAll={handleToggleAll}
          className="border-0 rounded-xl"
        />
      </ContentCard>
    </div>
  )
}
