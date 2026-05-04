import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/atoms/Badge'
import { Avatar } from '@/components/ui/atoms/Avatar'
import type { NavItem } from './TopNav'

export interface MobileNavProps {
  logo?: React.ReactNode
  navItems: NavItem[]
  user?: { name: string; email: string; avatarUrl?: string }
  onLogout?: () => void
  tenantName?: string
}

export function MobileNav({ logo, navItems, user, onLogout, tenantName }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden flex h-14 items-center border-b border-border bg-surface px-4 gap-4 sticky top-0 z-40">
      <Link to="/" className="flex items-center gap-1.5 font-bold text-foreground flex-1">
        {logo ?? <span className="text-primary">RemitX</span>}
        {tenantName && <span className="text-xs text-muted-fg font-normal">{tenantName}</span>}
      </Link>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Trigger asChild>
          <button className="p-2 rounded hover:bg-surface-overlay focus:outline-none focus:ring-2 focus:ring-primary" aria-label="Open menu">
            <svg className="h-5 w-5 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40" />
          <Dialog.Content className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-surface border-r border-border flex flex-col shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <Link to="/" onClick={() => setOpen(false)} className="font-bold text-foreground">
                {logo ?? <span className="text-primary">RemitX</span>}
              </Link>
              <Dialog.Close className="p-1.5 rounded hover:bg-surface-overlay">
                <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Dialog.Close>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
              {navItems.map(item => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary-subtle text-primary'
                      : 'text-foreground-subtle hover:text-foreground hover:bg-surface-overlay'
                  )}
                >
                  {item.icon && <span className="shrink-0">{item.icon}</span>}
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <Badge variant="danger" className="h-4 min-w-[1rem] px-1 text-[10px]">
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              ))}
            </nav>

            {user && (
              <div className="border-t border-border p-4 flex items-center gap-3">
                <Avatar alt={user.name} src={user.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                  <p className="text-xs text-muted-fg truncate">{user.email}</p>
                </div>
                <button onClick={onLogout} className="p-1.5 rounded hover:bg-surface-overlay text-muted-fg hover:text-danger-fg">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  )
}
