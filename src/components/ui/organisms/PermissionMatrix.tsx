import React from 'react'
import { cn } from '@/lib/utils'
import { Toggle } from '@/components/ui/atoms/Toggle'

export interface PermissionMatrixProps {
  roles: string[]
  roleLabels?: Record<string, string>
  permissions: Array<{ key: string; label: string; group?: string }>
  value: Record<string, string[]>
  onChange?: (role: string, permission: string, granted: boolean) => void
  onToggleAll?: (role: string, grant: boolean) => void
  readOnly?: boolean
  className?: string
}

// ─── Toggle-all checkbox ──────────────────────────────────────────────────────
// Shows checked / indeterminate / unchecked based on how many perms are granted.

type CheckState = 'all' | 'some' | 'none'

function ToggleAllButton({
  state,
  onToggle,
  disabled,
}: {
  state: CheckState
  onToggle: (grant: boolean) => void
  disabled?: boolean
}) {
  const handleClick = () => {
    if (disabled) return
    onToggle(state !== 'all')   // if already all → revoke; otherwise → grant all
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      title={state === 'all' ? 'Revoke all' : 'Grant all'}
      className={cn(
        'mx-auto flex h-5 w-5 items-center justify-center rounded border transition-all',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        disabled && 'cursor-not-allowed opacity-40',
        !disabled && 'cursor-pointer hover:border-primary/60',
        state === 'all'  && 'bg-primary border-primary',
        state === 'some' && 'bg-primary/20 border-primary/60',
        state === 'none' && 'bg-transparent border-border',
      )}
      aria-label={state === 'all' ? 'Revoke all permissions' : 'Grant all permissions'}
    >
      {state === 'all' && (
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {state === 'some' && (
        <svg className="h-3 w-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
        </svg>
      )}
    </button>
  )
}

// ─── PermissionMatrix ─────────────────────────────────────────────────────────

export function PermissionMatrix({
  roles,
  roleLabels,
  permissions,
  value,
  onChange,
  onToggleAll,
  readOnly,
  className,
}: PermissionMatrixProps) {
  const groups = Array.from(new Set(permissions.map(p => p.group ?? 'General')))
  const allKeys = permissions.map(p => p.key)

  const getCheckState = (role: string): CheckState => {
    const granted = value[role] ?? []
    const grantedFromList = allKeys.filter(k => granted.includes(k))
    if (grantedFromList.length === 0) return 'none'
    if (grantedFromList.length === allKeys.length) return 'all'
    return 'some'
  }

  return (
    <div className={cn('w-full overflow-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-raised border-b border-border">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-muted-fg w-48">Permission</th>
            {roles.map(role => {
              const state = getCheckState(role)
              return (
                <th key={role} className="px-4 py-3 text-center font-medium text-foreground whitespace-nowrap">
                  <div className="flex flex-col items-center gap-2">
                    <span>{roleLabels?.[role] ?? role.replace(/_/g, ' ')}</span>
                    {!readOnly && onToggleAll && (
                      <ToggleAllButton
                        state={state}
                        onToggle={grant => onToggleAll(role, grant)}
                        disabled={readOnly}
                      />
                    )}
                  </div>
                </th>
              )
            })}
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
