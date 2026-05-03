import { Link, NavLink, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/atoms/Avatar'
import { Badge } from '@/components/ui/atoms/Badge'

export interface NavItem {
  label: string
  href: string
  icon?: React.ReactNode
  badge?: number
}

export interface TopNavProps {
  logo?: React.ReactNode
  navItems: NavItem[]
  user?: { name: string; email: string; avatarUrl?: string }
  onLogout?: () => void
  tenantName?: string
}

export function TopNav({ logo, navItems, user, onLogout, tenantName }: TopNavProps) {
  const navigate = useNavigate()

  return (
    <header className="hidden md:flex h-14 items-center border-b border-border bg-surface px-6 gap-6 sticky top-0 z-40">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2 shrink-0 font-bold text-foreground text-lg">
        {logo ?? <span className="text-primary">RemitX</span>}
        {tenantName && <span className="text-xs text-muted-fg font-normal">{tenantName}</span>}
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-1 flex-1">
        {navItems.map(item => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) => cn(
              'relative flex items-center gap-1.5 rounded px-3 py-1.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary/10 text-primary'
                : 'text-foreground-subtle hover:text-foreground hover:bg-surface-overlay'
            )}
          >
            {item.icon}
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant="danger" className="ml-0.5 h-4 min-w-[1rem] px-1 text-[10px]">
                {item.badge > 99 ? '99+' : item.badge}
              </Badge>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User menu */}
      {user && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-primary">
              <Avatar alt={user.name} src={user.avatarUrl} size="sm" />
              <span className="hidden lg:block text-sm font-medium text-foreground">{user.name}</span>
              <svg className="h-3.5 w-3.5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={6}
              className="z-50 min-w-[180px] rounded-lg border border-border bg-surface p-1 shadow-lg"
            >
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-sm font-medium text-foreground">{user.name}</p>
                <p className="text-xs text-muted-fg truncate">{user.email}</p>
              </div>
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-foreground hover:bg-surface-overlay outline-none"
                onSelect={() => navigate('/settings/profile')}
              >
                Profile settings
              </DropdownMenu.Item>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                className="flex cursor-pointer items-center gap-2 rounded px-3 py-1.5 text-sm text-danger-fg hover:bg-danger outline-none"
                onSelect={onLogout}
              >
                Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}
    </header>
  )
}
