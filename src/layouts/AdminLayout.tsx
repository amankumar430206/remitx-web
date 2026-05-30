import { NavLink, Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'

const TABS = [
  { label: 'Tenants',          href: '/admin/tenants' },
  { label: 'KYC queue',        href: '/admin/kyc-queue' },
  { label: 'Manual payments',  href: '/admin/manual-payments' },
  { label: 'All payments',     href: '/admin/payments' },
  { label: 'Providers',        href: '/admin/providers' },
]

export function AdminLayout() {
  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-border">
        <nav className="flex gap-1 overflow-x-auto px-0">
          {TABS.map(tab => (
            <NavLink
              key={tab.href}
              to={tab.href}
              end={tab.href === '/admin/tenants' ? false : true}
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
