import { useState, useEffect } from 'react'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { PermissionMatrix } from '@/components/ui/organisms/PermissionMatrix'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { Button } from '@/components/ui/atoms/Button'
import { ContentCard } from '@/layouts/ContentCard'

const ROLES = ['admin', 'maker', 'approver', 'viewer']

const PERMISSIONS = [
  { key: 'payments:create', label: 'Create payment', group: 'Payments' },
  { key: 'payments:view', label: 'View payments', group: 'Payments' },
  { key: 'payments:approve', label: 'Approve payment', group: 'Payments' },
  { key: 'payments:cancel', label: 'Cancel payment', group: 'Payments' },
  { key: 'beneficiaries:create', label: 'Add beneficiary', group: 'Beneficiaries' },
  { key: 'beneficiaries:view', label: 'View beneficiaries', group: 'Beneficiaries' },
  { key: 'beneficiaries:delete', label: 'Delete beneficiary', group: 'Beneficiaries' },
  { key: 'accounts:view', label: 'View accounts', group: 'Accounts' },
  { key: 'accounts:create', label: 'Create account', group: 'Accounts' },
  { key: 'reports:view', label: 'View reports', group: 'Reports' },
  { key: 'reports:export', label: 'Export reports', group: 'Reports' },
  { key: 'users:invite', label: 'Invite users', group: 'Users' },
  { key: 'users:manage', label: 'Manage users', group: 'Users' },
  { key: 'settings:view', label: 'View settings', group: 'Settings' },
  { key: 'settings:manage', label: 'Manage settings', group: 'Settings' },
]

const DEFAULT_MATRIX: Record<string, string[]> = {
  admin: PERMISSIONS.map(p => p.key),
  maker: ['payments:create', 'payments:view', 'beneficiaries:create', 'beneficiaries:view', 'accounts:view', 'reports:view'],
  approver: ['payments:view', 'payments:approve', 'beneficiaries:view', 'accounts:view', 'reports:view'],
  viewer: ['payments:view', 'beneficiaries:view', 'accounts:view', 'reports:view', 'settings:view'],
}

export function Permissions() {
  const [matrix, setMatrix] = useState<Record<string, string[]>>(DEFAULT_MATRIX)
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleChange = (role: string, permission: string, granted: boolean) => {
    setMatrix(prev => {
      const current = prev[role] ?? []
      return {
        ...prev,
        [role]: granted
          ? [...current, permission]
          : current.filter(p => p !== permission),
      }
    })
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    setSaved(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Permissions"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Permissions' }]}
        actions={
          <div className="flex items-center gap-3">
            {saved && <span className="text-sm text-success-fg">Saved</span>}
            <Button size="sm" loading={saving} onClick={handleSave}>Save permissions</Button>
          </div>
        }
      />

      <ContentCard padding="none">
        <PermissionMatrix
          roles={ROLES}
          permissions={PERMISSIONS}
          value={matrix}
          onChange={handleChange}
          className="border-0 rounded-xl"
        />
      </ContentCard>
    </div>
  )
}
