import React from 'react'
import { cn } from '@/lib/utils'
import { Toggle } from '@/components/ui/atoms/Toggle'

export interface PermissionMatrixProps {
  roles: string[]
  roleLabels?: Record<string, string>
  permissions: Array<{ key: string; label: string; group?: string }>
  value: Record<string, string[]>
  onChange?: (role: string, permission: string, granted: boolean) => void
  readOnly?: boolean
  className?: string
}

export function PermissionMatrix({ roles, roleLabels, permissions, value, onChange, readOnly, className }: PermissionMatrixProps) {
  const groups = Array.from(new Set(permissions.map(p => p.group ?? 'General')))

  return (
    <div className={cn('w-full overflow-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-raised border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-fg w-48">Permission</th>
            {roles.map(role => (
              <th key={role} className="px-4 py-3 text-center font-medium text-foreground whitespace-nowrap">
                {roleLabels?.[role] ?? role.replace(/_/g, ' ')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map(group => (
            <React.Fragment key={group}>
              <tr className="bg-surface-overlay">
                <td colSpan={roles.length + 1} className="px-4 py-2 text-xs font-semibold text-muted-fg uppercase tracking-wider">
                  {group}
                </td>
              </tr>
              {permissions.filter(p => (p.group ?? 'General') === group).map(perm => (
                <tr key={perm.key} className="border-t border-border hover:bg-surface-raised">
                  <td className="px-4 py-3 text-foreground">{perm.label}</td>
                  {roles.map(role => {
                    const granted = value[role]?.includes(perm.key) ?? false
                    return (
                      <td key={role} className="px-4 py-3 text-center">
                        <Toggle
                          checked={granted}
                          onCheckedChange={checked => onChange?.(role, perm.key, checked)}
                          disabled={readOnly}
                          className="mx-auto"
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
