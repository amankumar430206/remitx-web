import { NavLink, Link, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/atoms/Avatar'
import { useCommandPaletteStore } from '@/stores/commandPaletteStore'
import type { NavItem } from './TopNav'

interface SidebarProps {
  navItems: NavItem[]
  user?: { name: string; email: string; avatarUrl?: string; role?: string }
  onLogout?: () => void
  tenantName?: string
  logoUrl?: string | null
}

const ArrowsIcon = () => (
  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

export function Sidebar({ navItems, user, onLogout, tenantName, logoUrl }: SidebarProps) {
  const navigate = useNavigate()
  const togglePalette = useCommandPaletteStore(s => s.toggle)

  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 h-screen sticky top-0 sidebar-glass sidebar-border z-40">

      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tenantName ?? 'Logo'}
              className="h-8 w-8 rounded-xl object-contain bg-white p-0.5 shrink-0 shadow-sm"
            />
          ) : (
            <div className="h-8 w-8 rounded-xl btn-gradient flex items-center justify-center shadow-md shadow-blue-900/40 shrink-0">
              <ArrowsIcon />
            </div>
          )}
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-nav-fg-active text-sm tracking-tight truncate">
              {tenantName ?? 'RemitX'}
            </span>
            {logoUrl && (
              <span className="text-[10px] text-nav-fg leading-none">Powered by RemitX</span>
            )}
          </div>
        </Link>
      </div>

      {/* Search trigger */}
      <div className="px-3 pt-3 pb-1">
        <button
          onClick={togglePalette}
          className="flex items-center gap-2 w-full h-9 px-3 rounded-xl border border-border bg-surface-overlay text-xs text-muted-fg hover:text-foreground hover:border-border-strong transition-colors"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <span className="flex-1 text-left">Search…</span>
          <kbd className="font-sans text-[10px] bg-surface border border-border rounded px-1 py-0.5">⌘K</kbd>
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-0.5 pt-2">
        {navItems.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
              isActive
                ? 'bg-nav-item-active text-nav-fg-active'
                : 'text-nav-fg hover:text-nav-fg-active hover:bg-nav-item-hover'
            )}
          >
            {({ isActive }) => (
              <>
                {item.icon && (
                  <span className={cn('shrink-0 transition-colors', isActive ? 'text-primary' : 'text-nav-fg')}>
                    {item.icon}
                  </span>
                )}
                <span className="flex-1 truncate">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-danger-fg px-1.5 text-[10px] font-semibold text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-border p-3 flex flex-col gap-2">
        {user && (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2.5 w-full rounded-xl px-3 py-2 hover:bg-nav-item-hover focus:outline-none transition-colors">
                <Avatar alt={user.name} src={user.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-nav-fg-active truncate">{user.name}</p>
                  <p className="text-xs text-nav-fg truncate">{user.email}</p>
                </div>
                <svg className="h-3.5 w-3.5 text-nav-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                side="top"
                align="start"
                sideOffset={8}
                className="z-50 min-w-[200px] rounded-xl border border-border bg-surface p-1.5 card-shadow-md"
              >
                <div className="px-3 py-2.5 mb-1">
                  <p className="text-sm font-semibold text-foreground">{user.name}</p>
                  <p className="text-xs text-muted-fg truncate mt-0.5">{user.email}</p>
                </div>
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
      </div>
    </aside>
  )
}
