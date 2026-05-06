import { useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import * as Dialog from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/ui/atoms/Avatar'
import { ThemeToggle } from '@/components/ui/atoms/ThemeToggle'
import type { NavItem } from './TopNav'

export interface MobileNavProps {
  logo?: React.ReactNode
  navItems: NavItem[]
  user?: { name: string; email: string; avatarUrl?: string }
  onLogout?: () => void
  tenantName?: string
}

const ArrowsIcon = () => (
  <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

export function MobileNav({ logo, navItems, user, onLogout, tenantName }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <header className="md:hidden flex h-14 items-center px-4 gap-4 sticky top-0 z-40 nav-glass">
      <Link to="/" className="flex items-center gap-2 flex-1">
        {logo ?? (
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg btn-gradient flex items-center justify-center">
              <ArrowsIcon />
            </div>
            <span className="font-bold text-white text-base tracking-tight">RemitX</span>
          </div>
        )}
        {tenantName && (
          <span className="text-[10px] text-nav-fg bg-white/[0.07] px-1.5 py-0.5 rounded">
            {tenantName}
          </span>
        )}
      </Link>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <ThemeToggle />

      <Dialog.Trigger asChild>
          <button
            className="p-2 rounded-lg hover:bg-nav-item-hover focus:outline-none focus:ring-1 focus:ring-white/20 transition-colors"
            aria-label="Open menu"
          >
            <svg className="h-5 w-5 text-nav-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-0 top-0 bottom-0 z-50 w-72 bg-surface border-r border-border flex flex-col shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:slide-in-from-left data-[state=closed]:slide-out-to-left duration-200">

            {/* Drawer header */}
            <div className="flex h-14 items-center justify-between hero-gradient px-4 border-b border-nav-border">
              <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg btn-gradient flex items-center justify-center">
                  <ArrowsIcon />
                </div>
                <span className="font-bold text-white text-base">RemitX</span>
              </Link>
              <Dialog.Close className="p-1.5 rounded-lg hover:bg-nav-item-hover transition-colors">
                <svg className="h-5 w-5 text-nav-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </Dialog.Close>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto scrollbar-thin p-3 flex flex-col gap-0.5">
              {navItems.map(item => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) => cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-primary-subtle text-primary'
                      : 'text-foreground-subtle hover:text-foreground hover:bg-surface-overlay'
                  )}
                >
                  {({ isActive }) => (
                    <>
                      {item.icon && (
                        <span className={cn('shrink-0', isActive ? 'text-primary' : 'text-muted-fg')}>
                          {item.icon}
                        </span>
                      )}
                      <span className="flex-1">{item.label}</span>
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

            {/* User footer */}
            {user && (
              <div className="border-t border-border p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar alt={user.name} src={user.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name}</p>
                    <p className="text-xs text-muted-fg truncate">{user.email}</p>
                  </div>
                </div>
                <button
                  onClick={onLogout}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-danger-fg hover:bg-danger transition-colors"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Sign out
                </button>
              </div>
            )}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </header>
  )
}
