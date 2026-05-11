import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FilterBar } from '@/components/ui/organisms/FilterBar'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Select } from '@/components/ui/atoms/Select'
import { Input } from '@/components/ui/atoms/Input'
import { FormField } from '@/components/ui/molecules/FormField'
import { ContentCard } from '@/layouts/ContentCard'
import { useAdminTenants, useCreateTenant } from '@/hooks/useAdmin'
import { getApiError } from '@/lib/apiError'
import type { AdminTenant } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
  adminEmail: z.string().email('Valid email required'),
})
type FormValues = z.infer<typeof schema>

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
}

const columns: Column<AdminTenant>[] = [
  { key: 'name', header: 'Name' },
  { key: 'slug', header: 'Slug', render: row => <span className="font-mono text-xs">{row.slug}</span> },
  {
    key: 'status',
    header: 'Status',
    render: row => <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">{row.status}</Badge>,
  },
  { key: 'created_at', header: 'Created', render: row => new Date(row.created_at).toLocaleDateString() },
]

export function TenantList() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [inviteToken, setInviteToken] = useState<string | null>(null)

  const { data, isLoading } = useAdminTenants()
  const createMutation = useCreateTenant()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const filtered = (data ?? []).filter(t => {
    const matchesSearch = !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.slug.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = !status || t.status === status
    return matchesSearch && matchesStatus
  })

  const onSubmit = (values: FormValues) => {
    createMutation.mutate(values, {
      onSuccess: (result) => {
        setInviteToken(result.inviteToken)
        reset()
      },
    })
  }

  const closeCreate = () => {
    setShowCreate(false)
    setInviteToken(null)
    createMutation.reset()
    reset()
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Tenants"
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

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search tenants…"
        filters={
          <Select
            value={status}
            onValueChange={setStatus}
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
        }
      />

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={filtered}
          loading={isLoading}
          getRowId={row => row.id}
          onRowClick={row => navigate(`/admin/tenants/${row.id}`)}
          emptyTitle="No tenants"
        />
      </ContentCard>

      {/* ── Create Tenant Dialog ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={inviteToken ? undefined : closeCreate} />
          <div className="relative w-full max-w-md rounded-2xl border border-border bg-background shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="text-sm font-semibold text-foreground">
                {inviteToken ? 'Tenant created' : 'Create new tenant'}
              </h2>
              <button
                onClick={closeCreate}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-surface hover:text-foreground"
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
                    <svg className="h-4 w-4 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Tenant created successfully</p>
                    <p className="mt-0.5 text-xs text-muted-fg">Share the invite token below with the client admin. It expires in 72 hours.</p>
                  </div>
                </div>

                <div>
                  <p className="mb-1.5 text-xs font-medium text-muted-fg">Invite token</p>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface p-3">
                    <code className="flex-1 break-all font-mono text-xs text-foreground">{inviteToken}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(inviteToken)}
                      className="shrink-0 rounded-md p-1.5 text-muted-fg transition-colors hover:bg-background hover:text-foreground"
                      title="Copy to clipboard"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                  </div>
                </div>

                <Button onClick={closeCreate}>Done</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 p-6">
                <FormField label="Tenant name" error={errors.name?.message} required htmlFor="ct-name">
                  <Input id="ct-name" placeholder="Acme Corp" {...register('name')} error={!!errors.name} />
                </FormField>
                <FormField label="Slug" error={errors.slug?.message} required htmlFor="ct-slug">
                  <Input id="ct-slug" placeholder="acme-corp" {...register('slug')} error={!!errors.slug} />
                  <p className="mt-1 text-xs text-muted-fg">Lowercase letters, numbers, hyphens. Used in URLs and identifiers.</p>
                </FormField>
                <FormField label="Admin email" error={errors.adminEmail?.message} required htmlFor="ct-email">
                  <Input id="ct-email" type="email" placeholder="admin@acmecorp.com" {...register('adminEmail')} error={!!errors.adminEmail} />
                  <p className="mt-1 text-xs text-muted-fg">A client admin account will be created and an invite token generated.</p>
                </FormField>

                {createMutation.isError && (
                  <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
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
