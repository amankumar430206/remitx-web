import { useState } from 'react'
import { getApiError } from '@/lib/apiError'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ErrorState } from '@/components/ui/molecules/ErrorState'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { ContentCard } from '@/layouts/ContentCard'
import { Select } from '@/components/ui/atoms/Select'
import {
  useAdminTenant,
  useUpdateAdminTenant,
  useSetTenantStatus,
  useTenantUsers,
  useProviderConfig,
  useUpdateProviderConfig,
  useFeeConfigs,
  useCreateFeeConfig,
  useDeleteFeeConfig,
} from '@/hooks/useAdmin'
import type { TenantUser, CorridorConfig, FeeConfig } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

const schema = z.object({
  name: z.string().min(2),
})
type FormValues = z.infer<typeof schema>

const feeSchema = z.object({
  sourceCurrency: z.string().length(3).toUpperCase(),
  destCurrency:   z.string().length(3).toUpperCase().or(z.literal('')).optional(),
  feeType:        z.enum(['flat', 'percent']),
  feeValue:       z.coerce.number().positive(),
  minFee:         z.coerce.number().min(0).optional().nullable(),
  maxFee:         z.coerce.number().positive().optional().nullable(),
})
type FeeFormValues = z.infer<typeof feeSchema>

const STATUS_VARIANT: Record<string, 'success' | 'danger' | 'warning' | 'default'> = {
  active: 'success',
  suspended: 'danger',
  pending: 'warning',
  inactive: 'default',
}

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super admin',
  client_admin: 'Client admin',
  maker: 'Maker',
  checker: 'Checker',
  viewer: 'Viewer',
}

const userColumns: Column<TenantUser>[] = [
  {
    key: 'email',
    header: 'User',
    render: row => (
      <div>
        <p className="text-sm font-medium text-foreground">
          {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-xs text-muted-fg">{row.email}</p>
      </div>
    ),
  },
  {
    key: 'role',
    header: 'Role',
    render: row => (
      <span className="inline-flex items-center rounded-full bg-primary-subtle px-2.5 py-0.5 text-xs font-medium text-primary">
        {ROLE_LABEL[row.role] ?? row.role}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: row => (
      <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">{row.status}</Badge>
    ),
  },
  {
    key: 'kyc_status',
    header: 'KYC',
    render: row => row.kyc_status ? (
      <Badge variant={row.kyc_status === 'approved' ? 'success' : row.kyc_status === 'rejected' ? 'danger' : 'warning'} className="capitalize">
        {row.kyc_status}
      </Badge>
    ) : <span className="text-xs text-muted-fg">—</span>,
  },
  {
    key: 'created_at',
    header: 'Joined',
    render: row => new Date(row.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  },
]

const corridorColumns: Column<CorridorConfig>[] = [
  {
    key: 'source_currency',
    header: 'Source',
    render: row => <span className="font-mono text-xs font-semibold text-foreground">{row.source_currency}</span>,
  },
  {
    key: 'dest_currency',
    header: 'Destination',
    render: row => (
      <span className="font-mono text-xs font-semibold text-foreground">
        {row.dest_currency ?? <span className="text-muted-fg">Any</span>}
      </span>
    ),
  },
  {
    key: 'provider_name',
    header: 'Provider',
    render: row => (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-surface border border-border px-2.5 py-0.5 text-xs font-mono text-foreground">
        {row.provider_name}
      </span>
    ),
  },
  {
    key: 'priority',
    header: 'Priority',
    render: row => <span className="text-xs tabular-nums text-muted-fg">{row.priority}</span>,
  },
  {
    key: 'is_active',
    header: 'Active',
    render: row => (
      <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Yes' : 'No'}</Badge>
    ),
  },
]

const feeColumns = (onDelete: (id: string) => void, deleting: boolean): Column<FeeConfig>[] => [
  {
    key: 'source_currency',
    header: 'Source',
    render: row => (
      <div className="flex items-center gap-1.5">
        <span className="font-mono text-xs font-bold text-foreground">{row.source_currency}</span>
        <svg className="h-3 w-3 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        <span className="font-mono text-xs font-bold text-foreground">{row.dest_currency ?? <span className="font-normal text-muted-fg">Any</span>}</span>
      </div>
    ),
  },
  {
    key: 'fee_type',
    header: 'Type',
    render: row => (
      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${row.fee_type === 'flat' ? 'bg-info text-info-fg' : 'bg-primary-subtle text-primary'}`}>
        {row.fee_type === 'flat' ? 'Flat' : 'Percent'}
      </span>
    ),
  },
  {
    key: 'fee_value',
    header: 'Rate',
    render: row => (
      <span className="font-mono text-sm font-semibold text-foreground">
        {row.fee_type === 'flat'
          ? parseFloat(row.fee_value).toFixed(2)
          : `${parseFloat(row.fee_value)}%`}
      </span>
    ),
  },
  {
    key: 'min_fee',
    header: 'Min / Max',
    render: row => row.fee_type === 'percent' && (row.min_fee || row.max_fee) ? (
      <span className="text-xs text-muted-fg tabular-nums">
        {row.min_fee ? parseFloat(row.min_fee).toFixed(2) : '—'}
        {' / '}
        {row.max_fee ? parseFloat(row.max_fee).toFixed(2) : '—'}
      </span>
    ) : <span className="text-xs text-muted-fg">—</span>,
  },
  {
    key: 'is_active',
    header: 'Active',
    render: row => <Badge variant={row.is_active ? 'success' : 'default'}>{row.is_active ? 'Yes' : 'No'}</Badge>,
  },
  {
    key: 'id',
    header: '',
    render: row => (
      <button
        onClick={() => onDelete(row.id)}
        disabled={deleting}
        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-danger-fg hover:bg-danger transition-colors disabled:opacity-40"
      >
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete
      </button>
    ),
  },
]

export function TenantDetail() {
  const { id } = useParams<{ id: string }>()
  const [editing, setEditing] = useState(false)
  const [statusDialog, setStatusDialog] = useState(false)
  const [addingFee, setAddingFee] = useState(false)
  const [deleteDialog, setDeleteDialog] = useState<string | null>(null)

  const { data: tenant, isLoading, isError, refetch } = useAdminTenant(id ?? '')
  const { data: users, isLoading: loadingUsers } = useTenantUsers(id ?? '')
  const { data: corridors, isLoading: loadingCorridors } = useProviderConfig(id ?? '')
  const { data: feeConfigs, isLoading: loadingFees } = useFeeConfigs(id ?? '')
  const updateMutation = useUpdateAdminTenant()
  const setStatusMutation = useSetTenantStatus()
  const updateProvidersMutation = useUpdateProviderConfig()
  const createFeeMutation = useCreateFeeConfig()
  const deleteFeeMutation = useDeleteFeeConfig()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const {
    register: registerFee,
    handleSubmit: handleSubmitFee,
    reset: resetFee,
    watch: watchFee,
    formState: { errors: feeErrors },
  } = useForm<FeeFormValues>({ resolver: zodResolver(feeSchema) })

  const feeType = watchFee('feeType', 'flat')

  const onEdit = () => {
    if (tenant) {
      reset({ name: tenant.name })
      setEditing(true)
    }
  }

  const onSave = (values: FormValues) => {
    if (!id) return
    updateMutation.mutate({ id, name: values.name }, { onSuccess: () => setEditing(false) })
  }

  const onToggleStatus = () => {
    if (!id || !tenant) return
    const next = tenant.status === 'active' ? 'suspended' : 'active'
    setStatusMutation.mutate({ id, status: next }, { onSuccess: () => setStatusDialog(false) })
  }

  const onAddFee = (values: FeeFormValues) => {
    if (!id) return
    createFeeMutation.mutate(
      {
        tenantId: id,
        sourceCurrency: values.sourceCurrency,
        destCurrency: values.destCurrency || null,
        feeType: values.feeType,
        feeValue: values.feeValue,
        minFee: values.minFee ?? null,
        maxFee: values.maxFee ?? null,
      },
      {
        onSuccess: () => {
          setAddingFee(false)
          resetFee()
        },
      },
    )
  }

  const onDeleteFee = (feeId: string) => setDeleteDialog(feeId)

  const confirmDeleteFee = () => {
    if (!id || !deleteDialog) return
    deleteFeeMutation.mutate(
      { tenantId: id, feeId: deleteDialog },
      { onSuccess: () => setDeleteDialog(null) },
    )
  }

  if (isLoading) return <LoadingState message="Loading tenant…" />
  if (isError || !tenant) return <ErrorState title="Tenant not found" onRetry={refetch} />

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <PageHeader
        title={tenant.name}
        breadcrumbs={[
          { label: 'Admin' },
          { label: 'Tenants', href: '/admin/tenants' },
          { label: tenant.name },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!editing ? (
              <>
                <Button variant="outline" size="sm" onClick={onEdit}>Edit</Button>
                <Button
                  variant={tenant.status === 'active' ? 'danger' : 'outline'}
                  size="sm"
                  onClick={() => setStatusDialog(true)}
                  loading={setStatusMutation.isPending}
                >
                  {tenant.status === 'active' ? 'Suspend' : 'Activate'}
                </Button>
              </>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            )}
          </div>
        }
      />

      {/* ── Overview ── */}
      <ContentCard>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-sm font-semibold text-foreground">Overview</h3>
          <Badge variant={STATUS_VARIANT[tenant.status] ?? 'default'} className="capitalize">{tenant.status}</Badge>
        </div>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <span className="text-xs text-muted-fg">Name</span>
            <p className="font-medium mt-0.5 text-foreground">{tenant.name}</p>
          </div>
          <div>
            <span className="text-xs text-muted-fg">Slug</span>
            <p className="font-mono text-xs mt-0.5 text-foreground">{tenant.slug}</p>
          </div>
          <div>
            <span className="text-xs text-muted-fg">Created</span>
            <p className="font-medium mt-0.5 text-foreground">
              {new Date(tenant.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        </div>
      </ContentCard>

      {/* ── Edit form ── */}
      {editing && (
        <ContentCard>
          <form onSubmit={handleSubmit(onSave)}>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Edit tenant</h3>
              <FormField label="Name" error={errors.name?.message} required htmlFor="t-name">
                <Input id="t-name" {...register('name')} error={!!errors.name} />
              </FormField>
              {updateMutation.isError && (
                <div className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger-fg">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {getApiError(updateMutation.error, 'Could not save changes. Please try again.')}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>Save changes</Button>
              </div>
            </div>
          </form>
        </ContentCard>
      )}

      {/* ── Users ── */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Users</h3>
            {users && (
              <p className="text-xs text-muted-fg">{users.length} member{users.length !== 1 ? 's' : ''}</p>
            )}
          </div>
        </div>
        {loadingUsers ? (
          <LoadingState message="Loading users…" />
        ) : (
          <DataTable
            columns={userColumns}
            data={users ?? []}
            getRowId={row => row.id}
            emptyTitle="No users yet"
            emptyDescription="Users will appear here once they accept an invite."
          />
        )}
      </ContentCard>

      {/* ── Provider config ── */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Payment corridors</h3>
            <p className="text-xs text-muted-fg">Provider routing rules for this tenant</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            loading={updateProvidersMutation.isPending}
            onClick={() => {
              if (!id || !corridors) return
              updateProvidersMutation.mutate({
                tenantId: id,
                corridors: corridors.map(c => ({
                  sourceCurrency: c.source_currency,
                  ...(c.dest_currency ? { destCurrency: c.dest_currency } : {}),
                  providerName: c.provider_name,
                  priority: c.priority,
                })),
              })
            }}
          >
            Refresh
          </Button>
        </div>
        {loadingCorridors ? (
          <LoadingState message="Loading corridors…" />
        ) : !corridors?.length ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface border border-border">
              <svg className="h-5 w-5 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-sm text-muted-fg">No corridors configured</p>
            <p className="text-xs text-muted-fg">This tenant uses the default provider for all corridors.</p>
          </div>
        ) : (
          <DataTable
            columns={corridorColumns}
            data={corridors}
            getRowId={row => row.id}
            emptyTitle="No corridors"
          />
        )}
      </ContentCard>

      {/* ── Fee config ── */}
      <ContentCard padding="none">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Fee rules</h3>
            <p className="text-xs text-muted-fg">Admin-only · no config = zero fee for this tenant</p>
          </div>
          {!addingFee && (
            <Button size="sm" onClick={() => setAddingFee(true)}>
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add rule
            </Button>
          )}
        </div>

        {/* Add fee form */}
        {addingFee && (
          <form onSubmit={handleSubmitFee(onAddFee)} className="border-b border-border bg-muted/40 px-5 py-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-fg">New fee rule</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <FormField label="Source" error={feeErrors.sourceCurrency?.message} htmlFor="fc-src">
                <Input id="fc-src" placeholder="USD" maxLength={3} className="uppercase" {...registerFee('sourceCurrency')} error={!!feeErrors.sourceCurrency} />
              </FormField>
              <FormField label="Dest (blank=any)" htmlFor="fc-dst">
                <Input id="fc-dst" placeholder="INR" maxLength={3} className="uppercase" {...registerFee('destCurrency')} />
              </FormField>
              <FormField label="Type" error={feeErrors.feeType?.message} htmlFor="fc-type">
                <Select
                  value={feeType}
                  onValueChange={(v) => resetFee({ ...watchFee(), feeType: v as 'flat' | 'percent' })}
                  options={[
                    { value: 'flat', label: 'Flat' },
                    { value: 'percent', label: 'Percent' },
                  ]}
                />
              </FormField>
              <FormField label={feeType === 'flat' ? 'Amount' : 'Rate (%)'} error={feeErrors.feeValue?.message} htmlFor="fc-val">
                <Input id="fc-val" type="number" step="0.00000001" placeholder={feeType === 'flat' ? '10.00' : '0.5'} {...registerFee('feeValue')} error={!!feeErrors.feeValue} />
              </FormField>
              {feeType === 'percent' && (
                <>
                  <FormField label="Min fee" htmlFor="fc-min">
                    <Input id="fc-min" type="number" step="0.01" placeholder="0.00" {...registerFee('minFee')} />
                  </FormField>
                  <FormField label="Max fee" htmlFor="fc-max">
                    <Input id="fc-max" type="number" step="0.01" placeholder="500.00" {...registerFee('maxFee')} />
                  </FormField>
                </>
              )}
            </div>
            {createFeeMutation.isError && (
              <p className="mt-2 text-xs text-danger-fg">
                {getApiError(createFeeMutation.error, 'Could not create fee rule.')}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              <Button type="submit" size="sm" loading={createFeeMutation.isPending}>Save rule</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => { setAddingFee(false); resetFee(); createFeeMutation.reset() }}>Cancel</Button>
            </div>
          </form>
        )}

        {loadingFees ? (
          <LoadingState message="Loading fee rules…" />
        ) : !feeConfigs?.length && !addingFee ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
              <svg className="h-4 w-4 text-muted-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33" />
              </svg>
            </div>
            <p className="text-sm text-muted-fg">No fee rules — all payments are free for this tenant</p>
          </div>
        ) : (
          <DataTable
            columns={feeColumns(onDeleteFee, deleteFeeMutation.isPending)}
            data={feeConfigs ?? []}
            getRowId={row => row.id}
            emptyTitle="No fee rules"
          />
        )}
      </ContentCard>

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

      <ConfirmDialog
        open={!!deleteDialog}
        onOpenChange={(open) => { if (!open) setDeleteDialog(null) }}
        title="Delete fee rule"
        description="This rule will be permanently removed. Payments will revert to zero fee for this corridor."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteFee}
        loading={deleteFeeMutation.isPending}
      />
    </div>
  )
}
