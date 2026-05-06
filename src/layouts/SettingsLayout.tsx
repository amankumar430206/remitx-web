import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

import { useAuthStore } from '@/stores/authStore'

const BASE_TABS = [
  { label: 'Profile', href: '/settings/profile' },
  { label: 'MFA', href: '/settings/mfa' },
  { label: 'Notifications', href: '/settings/notifications' },
  { label: 'Theme', href: '/settings/theme' },
]

const ADMIN_TABS = [
  { label: 'Users', href: '/settings/users' },
  { label: 'Permissions', href: '/settings/permissions' },
  { label: 'Sub-clients', href: '/settings/sub-clients' },
  { label: 'Feature flags', href: '/settings/features' },
]

export function SettingsLayout() {
  const user = useAuthStore(s => s.user)
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin'
  const tabs = isAdmin ? [...BASE_TABS, ...ADMIN_TABS] : BASE_TABS

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
