import { useState, lazy, Suspense, Component } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { useAdminTenant, useSetTenantStatus } from '@/hooks/useAdmin'

// ─── Lazy tab panels ──────────────────────────────────────────────────────────
// Each panel is a separate chunk — only downloaded when that tab is first visited.

const TenantOverview = lazy(() =>
  import('./tenant/TenantOverview').then((m) => ({ default: m.TenantOverview }))
)
const TenantContact = lazy(() =>
  import('./tenant/TenantContact').then((m) => ({ default: m.TenantContact }))
)
const TenantUsers = lazy(() =>
  import('./tenant/TenantUsers').then((m) => ({ default: m.TenantUsers }))
)
const TenantFeeRules = lazy(() =>
  import('./tenant/TenantFeeRules').then((m) => ({ default: m.TenantFeeRules }))
)
const TenantCorridors = lazy(() =>
  import('./tenant/TenantCorridors').then((m) => ({ default: m.TenantCorridors }))
)
const TenantBranding = lazy(() =>
  import('./tenant/TenantBranding').then((m) => ({ default: m.TenantBranding }))
)
const TenantProviderCredentials = lazy(() =>
  import('./tenant/TenantProviderCredentials').then((m) => ({ default: m.TenantProviderCredentials }))
)

// ─── Tab-level error boundary ─────────────────────────────────────────────────
// Catches render errors inside a tab so one broken panel can't crash the page.

interface EBState { hasError: boolean }
class TabErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { hasError: false }

  static getDerivedStateFromError(): EBState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TenantDetail] tab panel error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorState
          title="Failed to load this tab"
          description="Something went wrong rendering this section. Try refreshing the page."
          onRetry={() => this.setState({ hasError: false })}
        />
      )
    }
    return this.props.children
  }
}

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabKey = 'overview' | 'users' | 'fee-setup' | 'providers' | 'branding'

interface TabDef {
  key: TabKey
  label: string
  icon: React.ReactNode
}

const OverviewIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const UsersIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const FeeIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const ProviderIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

const BrandingIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
)

const TABS: TabDef[] = [
  { key: 'overview',  label: 'Overview',  icon: <OverviewIcon /> },
  { key: 'users',     label: 'Users',     icon: <UsersIcon /> },
  { key: 'fee-setup', label: 'Fee Setup', icon: <FeeIcon /> },
  { key: 'providers', label: 'Providers', icon: <ProviderIcon /> },
  { key: 'branding',  label: 'Branding',  icon: <BrandingIcon /> },
]

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  active:    'success',
  suspended: 'danger',
  inactive:  'default',
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

function TabBar({
  active,
  onChange,
}: {
  active: TabKey
  onChange: (tab: TabKey) => void
}) {
  return (
    <div className="relative">
      {/* scrollable track */}
      <div className="flex overflow-x-auto scrollbar-thin gap-0 border-b border-border -mx-px">
        {TABS.map((tab) => {
          const isActive = tab.key === active
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={[
                'relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap',
                'transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
                'border-b-2 -mb-px',
                isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-fg hover:text-foreground hover:border-border-strong',
              ].join(' ')}
              aria-selected={isActive}
              role="tab"
            >
              <span
                className={[
                  'transition-colors duration-150',
                  isActive ? 'text-primary' : 'text-muted-fg/70',
                ].join(' ')}
              >
                {tab.icon}
              </span>
              {tab.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editing, setEditing] = useState(false)
  const [statusDialog, setStatusDialog] = useState(false)

  const rawTab = searchParams.get('tab') as TabKey | null
  const activeTab: TabKey = TABS.some((t) => t.key === rawTab) ? rawTab! : 'overview'

  const setTab = (tab: TabKey) => {
    setSearchParams((p) => { p.set('tab', tab); return p }, { replace: true })
    if (tab !== 'overview') setEditing(false)   // cancel any in-progress edit
  }

  const { data: tenant, isLoading, isError, refetch } = useAdminTenant(id ?? '')
  const setStatusMutation = useSetTenantStatus()

  const onToggleStatus = () => {
    if (!id || !tenant) return
    const next = tenant.status === 'active' ? 'suspended' : 'active'
    setStatusMutation.mutate({ id, status: next }, { onSuccess: () => setStatusDialog(false) })
  }

  if (isLoading) return <LoadingState message="Loading tenant…" />
  if (isError || !tenant) return <ErrorState title="Tenant not found" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-0">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title={tenant.name}
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: tenant.name },
        ]}
        actions={
          <div className="flex items-center gap-2.5">
            <Badge
              variant={STATUS_VARIANT[tenant.status] ?? 'default'}
              className="capitalize"
            >
              {tenant.status}
            </Badge>
            <Button
              variant={tenant.status === 'active' ? 'danger' : 'outline'}
              size="sm"
              onClick={() => setStatusDialog(true)}
              loading={setStatusMutation.isPending}
            >
              {tenant.status === 'active' ? 'Suspend' : 'Activate'}
            </Button>
          </div>
        }
      />

      {/* ── Tab bar ────────────────────────────────────────────────────── */}
      <TabBar active={activeTab} onChange={setTab} />

      {/* ── Tab panels ─────────────────────────────────────────────────── */}
      {/* TabErrorBoundary catches render errors; Suspense shows a spinner  */}
      {/* while a lazy chunk downloads on first visit. Subsequent visits to */}
      {/* the same tab are instant — no fallback flash once cached.         */}
      <div className="pt-6 flex flex-col gap-6">

        {activeTab === 'overview' && (
          <TabErrorBoundary key="overview">
            <Suspense fallback={<LoadingState className="py-20" />}>
              <TenantOverview
                tenant={tenant}
                editing={editing}
                onEdit={() => setEditing(true)}
                onCancelEdit={() => setEditing(false)}
              />
              <TenantContact tenantId={tenant.id} />
            </Suspense>
          </TabErrorBoundary>
        )}

        {activeTab === 'users' && (
          <TabErrorBoundary key="users">
            <Suspense fallback={<LoadingState className="py-20" />}>
              <TenantUsers tenantId={tenant.id} />
            </Suspense>
          </TabErrorBoundary>
        )}

        {activeTab === 'fee-setup' && (
          <TabErrorBoundary key="fee-setup">
            <Suspense fallback={<LoadingState className="py-20" />}>
              <TenantFeeRules tenantId={tenant.id} tenantName={tenant.name} />
            </Suspense>
          </TabErrorBoundary>
        )}

        {activeTab === 'providers' && (
          <TabErrorBoundary key="providers">
            <Suspense fallback={<LoadingState className="py-20" />}>
              <TenantProviderCredentials tenantId={tenant.id} />
              <TenantCorridors tenantId={tenant.id} />
            </Suspense>
          </TabErrorBoundary>
        )}

        {activeTab === 'branding' && (
          <TabErrorBoundary key="branding">
            <Suspense fallback={<LoadingState className="py-20" />}>
              <TenantBranding tenantId={tenant.id} />
            </Suspense>
          </TabErrorBoundary>
        )}

      </div>

      {/* ── Status dialog ──────────────────────────────────────────────── */}
      <ConfirmDialog
        open={statusDialog}
        onOpenChange={setStatusDialog}
        title={tenant.status === 'active' ? 'Suspend tenant' : 'Activate tenant'}
        description={
          tenant.status === 'active'
            ? `Suspend "${tenant.name}"? All users will lose access immediately.`
            : `Activate "${tenant.name}"? All users will regain access.`
        }
        confirmLabel={tenant.status === 'active' ? 'Suspend' : 'Activate'}
        variant={tenant.status === 'active' ? 'danger' : 'primary'}
        onConfirm={onToggleStatus}
        loading={setStatusMutation.isPending}
      />
    </div>
  )
}
