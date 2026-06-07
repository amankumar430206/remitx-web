import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

import { usePermissions } from '@/hooks/usePermissions'

const BASE_TABS = [
  { label: 'Profile', href: '/settings/profile' },
  { label: 'MFA', href: '/settings/mfa' },
  { label: 'Notifications', href: '/settings/notifications' },
  { label: 'Theme', href: '/settings/theme' },
]

// Each admin tab is shown only if the user holds the permission its page requires
// — fully dynamic, so custom roles get exactly the tabs they're allowed.
// Feature flags is platform-level (admin:features) → super admin only.
const ADMIN_TABS = [
  { label: 'Users', href: '/settings/users', permission: 'users:*' },
  { label: 'Roles', href: '/settings/permissions', permission: 'admin:config' },
  { label: 'Sub-clients', href: '/settings/sub-clients', permission: 'subclients:*' },
  { label: 'Feature flags', href: '/settings/features', permission: 'admin:features' },
]

export function SettingsLayout() {
  const { has } = usePermissions()
  const tabs = [...BASE_TABS, ...ADMIN_TABS.filter(t => has(t.permission))]

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto px-0">
          {tabs.map(tab => (
            <NavLink
              key={tab.href}
              to={tab.href}
              className={({ isActive }) =>
                cn(
                  'shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-fg hover:text-foreground hover:border-border'
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <Outlet />
    </div>
  )
}
