import { cn } from '@/lib/utils'
import { TopNav } from './TopNav'
import { MobileNav } from './MobileNav'
import type { NavItem } from './TopNav'

export interface PageLayoutProps {
  navItems: NavItem[]
  user?: { name: string; email: string; avatarUrl?: string }
  onLogout?: () => void
  logo?: React.ReactNode
  tenantName?: string
  children: React.ReactNode
  className?: string
}

export function PageLayout({ navItems, user, onLogout, logo, tenantName, children, className }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <TopNav navItems={navItems} user={user} onLogout={onLogout} logo={logo} tenantName={tenantName} />
      <MobileNav navItems={navItems} user={user} onLogout={onLogout} logo={logo} tenantName={tenantName} />
      <main className={cn('flex-1 px-4 md:px-6 lg:px-8 py-6 max-w-screen-xl mx-auto w-full', className)}>
        {children}
      </main>
    </div>
  )
}
