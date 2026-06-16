import { cn } from '@/lib/utils'
import { TopNav } from './TopNav'
import { TopBar } from './TopBar'
import { MobileNav } from './MobileNav'
import { Sidebar } from './Sidebar'
import { BackToTop } from '@/components/ui/atoms/BackToTop'
import { OfflineOverlay } from '@/components/ui/molecules/OfflineOverlay'
import { useLayoutStore } from '@/stores/layoutStore'
import type { NavItem } from './TopNav'

export interface PageLayoutProps {
  navItems: NavItem[]
  user?: { name: string; email: string; avatarUrl?: string; role?: string }
  onLogout?: () => void
  logo?: React.ReactNode
  logoUrl?: string | null
  tenantName?: string
  children: React.ReactNode
  className?: string
}

export function PageLayout({ navItems, user, onLogout, logo, logoUrl, tenantName, children, className }: PageLayoutProps) {
  const layout = useLayoutStore(s => s.layout)

  if (layout === 'sidebar') {
    return (
      <div className="min-h-screen bg-surface-raised flex">
        <Sidebar navItems={navItems} user={user} onLogout={onLogout} tenantName={tenantName} />
        <div className="flex-1 flex flex-col min-w-0">
          <MobileNav navItems={navItems} user={user} onLogout={onLogout} logo={logo} tenantName={tenantName} />
          <TopBar user={user} tenantName={tenantName} onLogout={onLogout} />
          <main className={cn('flex-1 px-4 md:px-6 lg:px-8 py-6 w-full', className)}>
            {children}
          </main>
        </div>
        <BackToTop />
        <OfflineOverlay />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-raised flex flex-col">
      <TopNav navItems={navItems} user={user} onLogout={onLogout} logo={logo} logoUrl={logoUrl} tenantName={tenantName} />
      <MobileNav navItems={navItems} user={user} onLogout={onLogout} logo={logo} tenantName={tenantName} />
      <main className={cn('flex-1 px-4 md:px-6 lg:px-8 py-6 w-full', className)}>
        {children}
      </main>
      <BackToTop />
      <OfflineOverlay />
    </div>
  )
}
