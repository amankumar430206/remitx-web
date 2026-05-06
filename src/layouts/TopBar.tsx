import { useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { Avatar } from '@/components/ui/atoms/Avatar'
import { ThemeToggle } from '@/components/ui/atoms/ThemeToggle'
import { NotificationBell } from '@/components/ui/organisms/NotificationBell'

interface TopBarProps {
  user?: { name: string; email: string; avatarUrl?: string; role?: string }
  tenantName?: string
  onLogout?: () => void
}

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  maker: 'Maker',
  checker: 'Checker',
  viewer: 'Viewer',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-violet-500/15 text-violet-400 border-violet-500/20',
  admin:       'bg-blue-500/15 text-blue-400 border-blue-500/20',
  maker:       'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
  checker:     'bg-amber-500/15 text-amber-500 border-amber-500/20',
  viewer:      'bg-slate-500/15 text-slate-400 border-slate-500/20',
}

export function TopBar({ user, tenantName, onLogout }: TopBarProps) {
  const navigate = useNavigate()
  const roleKey = user?.role ?? ''
  const roleLabel = ROLE_LABELS[roleKey] ?? roleKey
  const roleColor = ROLE_COLORS[roleKey] ?? 'bg-slate-500/15 text-slate-400 border-slate-500/20'

  return (
    <header className="hidden md:flex h-16 items-center nav-glass px-5 gap-4 shrink-0">

      {/* Tenant badge */}
      {tenantName && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-fg">Workspace</span>
          <span className="text-xs font-semibold text-foreground bg-surface-overlay border border-border px-2 py-0.5 rounded-md">
            {tenantName}
          </span>
        </div>
      )}

      <div className="flex-1" />

      {/* Notifications + Theme */}
      <NotificationBell />
      <ThemeToggle />

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* User info + role */}
      {user && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-surface-overlay focus:outline-none transition-colors">
              <Avatar alt={user.name} src={user.avatarUrl} size="sm" />
              <div className="text-left hidden lg:block">
                <p className="text-sm font-semibold text-foreground leading-tight">{user.name}</p>
                <p className="text-[11px] text-muted-fg leading-tight">{user.email}</p>
              </div>
              {roleLabel && (
                <span className={`hidden lg:inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleColor}`}>
                  {roleLabel}
                </span>
              )}
              <svg className="h-3.5 w-3.5 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-[210px] rounded-xl border border-border bg-surface p-1.5 card-shadow-md"
            >
              <div className="px-3 py-2.5 mb-1 flex items-center gap-2.5">
                <Avatar alt={user.name} src={user.avatarUrl} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-fg truncate">{user.email}</p>
                </div>
              </div>
              {roleLabel && (
                <div className="px-3 pb-2.5">
                  <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.5 rounded border ${roleColor}`}>
                    {roleLabel}
                  </span>
                </div>
              )}
              <div className="h-px bg-border mx-1 mb-1" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-overlay outline-none transition-colors"
                onSelect={() => navigate('/settings/profile')}
              >
                <svg className="h-4 w-4 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Profile settings
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-surface-overlay outline-none transition-colors"
                onSelect={() => navigate('/settings/notifications')}
              >
                <svg className="h-4 w-4 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Notifications
              </DropdownMenu.Item>
              <div className="h-px bg-border mx-1 my-1" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger-fg hover:bg-danger outline-none transition-colors"
                onSelect={onLogout}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </header>
  )
}
