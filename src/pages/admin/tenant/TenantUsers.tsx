import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { ContentCard } from '@/layouts/ContentCard'
import { useTenantUsers } from '@/hooks/useAdmin'
import type { TenantUser } from '@/api/admin'
import type { Column } from '@/components/ui/organisms/DataTable'

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

const columns: Column<TenantUser>[] = [
  {
    key: 'email',
    header: 'User',
    render: row => (
      <div>
        <p className="text-sm font-medium text-foreground">
          {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
        </p>
        <p className="text-xs text-muted-fg">{row.email}</p>
        {row.phone && (
          <p className="text-xs text-muted-fg/70">{row.phone}</p>
        )}
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
      <Badge variant={STATUS_VARIANT[row.status] ?? 'default'} className="capitalize">
        {row.status}
      </Badge>
    ),
  },
  {
    key: 'kyc_status',
    header: 'KYC',
    render: row =>
      row.kyc_status ? (
        <Badge
          variant={
            row.kyc_status === 'approved'
              ? 'success'
              : row.kyc_status === 'rejected'
              ? 'danger'
              : 'warning'
          }
          className="capitalize"
        >
          {row.kyc_status}
        </Badge>
      ) : (
        <span className="text-xs text-muted-fg">—</span>
      ),
  },
  {
    key: 'created_at',
    header: 'Joined',
    render: row =>
      new Date(row.created_at).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
  },
]

interface Props {
  tenantId: string
}

export function TenantUsers({ tenantId }: Props) {
  const navigate = useNavigate()
  const { data: users, isLoading } = useTenantUsers(tenantId)

  // Action column injected with navigate (can't use hook inside static const)
  const columnsWithActions: Column<TenantUser>[] = [
    ...columns,
    {
      key: 'actions',
      header: '',
      render: row => (
        <div className="flex justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={e => {
              e.stopPropagation()
              navigate(`/admin/payments/on-behalf?tenantId=${tenantId}&userId=${row.id}`)
            }}
          >
            Pay on behalf
          </Button>
        </div>
      ),
    },
  ]

  return (
    <ContentCard padding="none">
      <div className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Users</h3>
          {users && (
            <p className="text-xs text-muted-fg">
              {users.length} member{users.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={() => navigate(`/admin/payments/on-behalf?tenantId=${tenantId}`)}
        >
          + Pay on behalf
        </Button>
      </div>
      {isLoading ? (
        <LoadingState message="Loading users…" />
      ) : (
        <DataTable
          columns={columnsWithActions}
          data={users ?? []}
          getRowId={row => row.id}
          emptyTitle="No users yet"
          emptyDescription="Users will appear here once they accept an invite."
        />
      )}
    </ContentCard>
  )
}
