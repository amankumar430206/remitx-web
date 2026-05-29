import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { SmartFilterBar } from '@/components/ui/organisms/SmartFilterBar'
import type { StatusChipOption, ActiveFilterChip } from '@/components/ui/organisms/SmartFilterBar'
import { StatCard } from '@/components/ui/organisms/StatCard'
import { Badge } from '@/components/ui/atoms/Badge'
import { Avatar } from '@/components/ui/atoms/Avatar'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { FormField } from '@/components/ui/molecules/FormField'
import { useAdminTenants, useCreateTenant } from '@/hooks/useAdmin'
import { getApiError } from '@/lib/apiError'
import type { AdminTenant } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

// ─── Status chips ────────────────────────────────────────────────────────────

const STATUS_CHIPS: StatusChipOption[] = [
  { label: 'All',       value: '',          variant: 'none'    },
  { label: 'Active',    value: 'active',    variant: 'success' },
  { label: 'Pending',   value: 'pending',   variant: 'warning' },
  { label: 'Suspended', value: 'suspended', variant: 'danger'  },
  { label: 'Inactive',  value: 'inactive',  variant: 'default' },
]

// ─── Schema ───────────────────────────────────────────────────────────────────

const schema = z.object({
  name:       z.string().min(2, 'Name must be at least 2 characters'),
  slug:       z.string().min(2).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  adminEmail: z.string().email('Valid email required'),
})
type FormValues = z.infer<typeof schema>

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active:    'success',
  suspended: 'danger',
  pending:   'warning',
  inactive:  'default',
}

const STATUS_DOT: Record<string, string> = {
  active:    'bg-success-fg',
  suspended: 'bg-danger-fg',
  pending:   'bg-warning-fg',
  inactive:  'bg-muted-fg',
}

function relativeTime(iso: string): string {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
  if (diffDays < 1)   return 'Today'
  if (diffDays < 30)  return `${diffDays}d ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

function tenantInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')
}

// ─── Action icons ─────────────────────────────────────────────────────────────

const IconUsers = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const IconFee = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IconProviders = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
  </svg>
)

const IconKycAlert = () => (
  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

// ─── Column factory (needs navigate) ─────────────────────────────────────────

function makeColumns(navigate: ReturnType<typeof useNavigate>): Column<AdminTenant>[] {
  return [
    {
      key: 'name',
      header: 'Workspace',
      render: (row) => (
        <div className="flex items-center gap-3">
          <Avatar fallback={tenantInitials(row.name)} size="sm" />
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{row.name}</p>
            <p className="text-xs text-muted-fg/70 truncate">
              <span className="font-mono">{row.slug}</span>
              {row.user_count > 0 && (
                <span className="ml-1.5">· {row.user_count} user{row.user_count !== 1 ? 's' : ''}</span>
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[row.status] ?? 'bg-muted-fg'}`} />
          <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">
            {row.status}
          </Badge>
        </div>
      ),
    },
    {
      key: 'pending_kyc_count',
      header: 'KYC',
      render: (row) =>
        row.pending_kyc_count > 0 ? (
          <button
            type="button"
            title="Review KYC applications"
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/tenants/${row.id}?tab=overview`) }}
            className="inline-flex items-center gap-1.5 rounded-full bg-warning px-2.5 py-0.5 text-xs font-medium text-warning-fg transition-opacity hover:opacity-80"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-warning-fg/70" />
            {row.pending_kyc_count} pending
          </button>
        ) : (
          <span className="text-xs text-muted-fg/50">—</span>
        ),
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (row) => (
        <span
          className="text-sm text-muted-fg"
          title={new Date(row.created_at).toLocaleDateString('en-GB', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        >
          {relativeTime(row.created_at)}
        </span>
      ),
    },
    {
      key: '_actions',
      header: '',
      className: 'w-px',
      render: (row) => (
        // stopPropagation so the row-click (→ overview) doesn't fire
        <div
          className="flex items-center gap-0.5"
          onClick={(e) => e.stopPropagation()}
        >
          <ActionButton
            label="View users"
            onClick={() => navigate(`/admin/tenants/${row.id}?tab=users`)}
          >
            <IconUsers />
          </ActionButton>
          <ActionButton
            label="Fee setup"
            onClick={() => navigate(`/admin/tenants/${row.id}?tab=fee-setup`)}
          >
            <IconFee />
          </ActionButton>
          <ActionButton
            label="Payment providers"
            onClick={() => navigate(`/admin/tenants/${row.id}?tab=providers`)}
          >
            <IconProviders />
          </ActionButton>
          {row.pending_kyc_count > 0 && (
            <ActionButton
              label={`Review ${row.pending_kyc_count} KYC application${row.pending_kyc_count !== 1 ? 's' : ''}`}
              onClick={() => navigate(`/admin/tenants/${row.id}?tab=overview`)}
              highlight
            >
              <IconKycAlert />
            </ActionButton>
          )}
        </div>
      ),
    },
  ]
}

// ─── ActionButton ─────────────────────────────────────────────────────────────

function ActionButton({
  label, onClick, highlight = false, children,
}: {
  label: string
  onClick: () => void
  highlight?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      className={[
        'flex h-7 w-7 items-center justify-center rounded-md transition-colors',
        highlight
          ? 'text-warning-fg hover:bg-warning'
          : 'text-muted-fg hover:bg-surface-overlay hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

// ─── Stat icons ───────────────────────────────────────────────────────────────

const IconBuildings = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
  </svg>
)

const IconCheckCircle = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IconPause = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const IconShield = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

// ─── Main page ────────────────────────────────────────────────────────────────

export function TenantList() {
  const navigate = useNavigate()
  const [search, setSearch]           = useState('')
  const [status, setStatus]           = useState('')
  const [showCreate, setShowCreate]   = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const [copied, setCopied]           = useState(false)

  const { data, isLoading } = useAdminTenants()
  const createMutation = useCreateTenant()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const columns = makeColumns(navigate)

  // ── Derived counts ──────────────────────────────────────────────────────────
  const total          = data?.length ?? 0
  const active         = data?.filter((t) => t.status === 'active').length ?? 0
  const suspended      = data?.filter((t) => t.status === 'suspended').length ?? 0
  const totalPendingKyc = data?.reduce((sum, t) => sum + (t.pending_kyc_count ?? 0), 0) ?? 0

  // ── Active chips ────────────────────────────────────────────────────────────
  const activeChips = useMemo<ActiveFilterChip[]>(() => [
    ...(status ? [{
      key: 'status',
      label: STATUS_CHIPS.find(c => c.value === status)?.label ?? status,
      onRemove: () => setStatus(''),
    }] : []),
    ...(search ? [{
      key: 'search',
      label: `"${search}"`,
      onRemove: () => setSearch(''),
    }] : []),
  ], [status, search])

  // ── Filtered rows ───────────────────────────────────────────────────────────
  const filtered = (data ?? []).filter((t) => {
    const matchSearch = !search
      || t.name.toLowerCase().includes(search.toLowerCase())
      || t.slug.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !status || t.status === status
    return matchSearch && matchStatus
  })

  // ── Handlers ────────────────────────────────────────────────────────────────
  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values, {
      onSuccess: (result) => { setInviteToken(result.inviteToken); reset() },
    })
  }

  const closeCreate = () => {
    setShowCreate(false)
    setInviteToken(null)
    setCopied(false)
    createMutation.reset()
    reset()
  }

  const copyToken = () => {
    if (!inviteToken) return
    navigator.clipboard.writeText(inviteToken)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col gap-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <PageHeader
        title="Tenants"
        description="Manage client workspaces, configurations, and onboarding."
        breadcrumbs={[{ label: 'Admin' }, { label: 'Tenants' }]}
        actions={
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add tenant
          </Button>
        }
      />

      {/* ── Stats ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total workspaces"
          value={String(total)}
          icon={<IconBuildings />}
          loading={isLoading}
          onClick={status ? () => setStatus('') : undefined}
        />
        <StatCard
          title="Active"
          value={String(active)}
          description={total > 0 ? `${Math.round((active / total) * 100)}% of total` : undefined}
          icon={<IconCheckCircle />}
          loading={isLoading}
          onClick={() => setStatus(status === 'active' ? '' : 'active')}
        />
        <StatCard
          title="Suspended"
          value={String(suspended)}
          icon={<IconPause />}
          loading={isLoading}
          onClick={() => setStatus(status === 'suspended' ? '' : 'suspended')}
        />
        <StatCard
          title="KYC pending"
          value={String(totalPendingKyc)}
          description={totalPendingKyc > 0 ? 'Awaiting review' : 'All clear'}
          icon={<IconShield />}
          loading={isLoading}
          onClick={totalPendingKyc > 0 ? () => navigate('/admin/kyc-queue') : undefined}
        />
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <SmartFilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or slug…"
        statusChips={STATUS_CHIPS}
        activeStatus={status}
        onStatusChange={setStatus}
        activeChips={activeChips}
        onClearAll={activeChips.length > 0 ? () => { setSearch(''); setStatus('') } : undefined}
      />

      {/* ── Table ──────────────────────────────────────────────────────── */}
      <DataTable
        columns={columns}
        data={filtered}
        loading={isLoading}
        getRowId={(row) => row.id}
        onRowClick={(row) => navigate(`/admin/tenants/${row.id}`)}
        emptyTitle={search || status ? 'No matching tenants' : 'No tenants yet'}
        emptyDescription={
          search || status
            ? 'Try adjusting your search or filter.'
            : 'Create your first tenant workspace to get started.'
        }
      />

      {/* ── Create tenant modal ─────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={inviteToken ? undefined : closeCreate}
          />

          <div className="relative w-full max-w-md rounded-2xl border border-border bg-surface shadow-2xl">

            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle text-primary">
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-sm font-semibold text-foreground">
                  {inviteToken ? 'Tenant created' : 'Create new tenant'}
                </h2>
              </div>
              <button
                onClick={closeCreate}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-surface-raised hover:text-foreground"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {inviteToken ? (
              <div className="flex flex-col gap-5 p-6">
                <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success/20">
                    <svg className="h-4 w-4 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tenant created successfully</p>
                    <p className="mt-0.5 text-xs text-muted-fg">Share the invite token with the client admin. It expires in 72 hours.</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-semibold text-muted-fg uppercase tracking-wider">Invite token</p>
                  <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-3">
                    <code className="flex-1 break-all font-mono text-xs text-foreground leading-relaxed">{inviteToken}</code>
                    <button
                      onClick={copyToken}
                      className="shrink-0 rounded-lg p-2 text-muted-fg transition-all hover:bg-surface hover:text-foreground"
                      title="Copy to clipboard"
                    >
                      {copied ? (
                        <svg className="h-4 w-4 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-muted-fg">
                    The admin will use this token at <span className="font-mono">/invite/accept</span> to activate their account.
                  </p>
                </div>

                <Button className="w-full" onClick={closeCreate}>Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6">
                <FormField label="Tenant name" error={errors.name?.message} required htmlFor="ct-name">
                  <Input id="ct-name" placeholder="Acme Corp" {...register('name')} error={!!errors.name} />
                </FormField>
                <FormField label="Slug" error={errors.slug?.message} required htmlFor="ct-slug">
                  <Input id="ct-slug" placeholder="acme-corp" {...register('slug')} error={!!errors.slug} />
                  <p className="mt-1 text-xs text-muted-fg">Lowercase letters, numbers, hyphens. Used in URLs and API identifiers.</p>
                </FormField>
                <FormField label="Admin email" error={errors.adminEmail?.message} required htmlFor="ct-email">
                  <Input id="ct-email" type="email" placeholder="admin@acmecorp.com" {...register('adminEmail')} error={!!errors.adminEmail} />
                  <p className="mt-1 text-xs text-muted-fg">An invite token will be generated for this address.</p>
                </FormField>

                {createMutation.isError && (
                  <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3.5 py-3 text-sm text-danger-fg">
                    <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {getApiError(createMutation.error, 'Could not create tenant. Please try again.')}
                  </div>
                )}

                <div className="flex gap-3 pt-1">
                  <Button type="button" variant="outline" className="flex-1" onClick={closeCreate}>Cancel</Button>
                  <Button type="submit" className="flex-1" loading={createMutation.isPending}>Create tenant</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
