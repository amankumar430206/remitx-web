import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { useAdminTenant, useSetTenantStatus } from '@/hooks/useAdmin'
import { TenantOverview } from './tenant/TenantOverview'
import { TenantContact } from './tenant/TenantContact'
import { TenantUsers } from './tenant/TenantUsers'
import { TenantCorridors } from './tenant/TenantCorridors'
import { TenantFeeRules } from './tenant/TenantFeeRules'

// ─── Tab definition ───────────────────────────────────────────────────────────

type TabKey = 'overview' | 'contact' | 'users' | 'configuration'

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

const ContactIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const UsersIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const ConfigIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const TABS: TabDef[] = [
  { key: 'overview',      label: 'Overview',      icon: <OverviewIcon /> },
  { key: 'contact',       label: 'Contact',        icon: <ContactIcon /> },
  { key: 'users',         label: 'Users',          icon: <UsersIcon /> },
  { key: 'configuration', label: 'Configuration',  icon: <ConfigIcon /> },
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
    if (tab !== 'overview') setEditing(false)
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
    <div className="flex flex-col gap-0 max-w-5xl mx-auto">

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
      <div className="pt-6 flex flex-col gap-6">

        {activeTab === 'overview' && (
          <TenantOverview
            tenant={tenant}
            editing={editing}
            onEdit={() => setEditing(true)}
            onCancelEdit={() => setEditing(false)}
          />
        )}

        {activeTab === 'contact' && (
          <TenantContact tenantId={tenant.id} />
        )}

        {activeTab === 'users' && (
          <TenantUsers tenantId={tenant.id} />
        )}

        {activeTab === 'configuration' && (
          <>
            <TenantCorridors tenantId={tenant.id} />
            <TenantFeeRules tenantId={tenant.id} />
          </>
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
