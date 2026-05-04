import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { FormField } from '@/components/ui/molecules/FormField'
import { ConfirmDialog } from '@/components/ui/molecules/ConfirmDialog'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'
import { Button } from '@/components/ui/atoms/Button'
import { Badge } from '@/components/ui/atoms/Badge'
import { Input } from '@/components/ui/atoms/Input'
import { Select } from '@/components/ui/atoms/Select'
import { ContentCard } from '@/layouts/ContentCard'
import { useUsers, useInviteUser, useUpdateUser, useRemoveUser } from '@/hooks/useUsers'
import type { User } from '@/api/users'
import type { Column } from '@/components/ui/organisms/DataTable'

const inviteSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  role: z.enum(['admin', 'maker', 'approver', 'viewer']),
})

type InviteValues = z.infer<typeof inviteSchema>

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'maker', label: 'Maker' },
  { value: 'approver', label: 'Approver' },
  { value: 'viewer', label: 'Viewer' },
]

export function Users() {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data, isLoading } = useUsers()
  const inviteMutation = useInviteUser()
  const updateMutation = useUpdateUser()
  const removeMutation = useRemoveUser()

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'maker' },
  })

  const onInvite = (values: InviteValues) => {
    inviteMutation.mutate(values, {
      onSuccess: () => { reset(); setShowInviteForm(false) },
    })
  }

  const toggleStatus = (user: User) => {
    updateMutation.mutate({
      id: user.id,
      payload: { status: user.status === 'active' ? 'disabled' : 'active' },
    })
  }

  const columns: Column<User>[] = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    {
      key: 'role',
      header: 'Role',
      render: row => <Badge variant="secondary" className="capitalize">{row.role}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'mfaEnabled',
      header: 'MFA',
      render: row => (
        <span className={row.mfaEnabled ? 'text-success-fg text-xs' : 'text-muted-fg text-xs'}>
          {row.mfaEnabled ? 'Enabled' : 'Disabled'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: row => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={e => { e.stopPropagation(); toggleStatus(row) }}
            loading={updateMutation.isPending}
          >
            {row.status === 'active' ? 'Disable' : 'Enable'}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={e => { e.stopPropagation(); setDeleteTarget(row) }}
          >
            Remove
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Users"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Users' }]}
        actions={
          <Button size="sm" onClick={() => setShowInviteForm(v => !v)}>
            {showInviteForm ? 'Cancel' : 'Invite user'}
          </Button>
        }
      />

      {showInviteForm && (
        <ContentCard>
          <form onSubmit={handleSubmit(onInvite)}>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Invite new user</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <FormField label="Full name" error={errors.name?.message} required htmlFor="invite-name">
                  <Input id="invite-name" {...register('name')} error={!!errors.name} />
                </FormField>
                <FormField label="Email" error={errors.email?.message} required htmlFor="invite-email">
                  <Input id="invite-email" type="email" {...register('email')} error={!!errors.email} />
                </FormField>
                <FormField label="Role" error={errors.role?.message} required>
                  <Select
                    value={watch('role')}
                    onValueChange={v => setValue('role', v as InviteValues['role'])}
                    options={ROLE_OPTIONS}
                    error={!!errors.role}
                  />
                </FormField>
              </div>
              {inviteMutation.isError && (
                <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                  Could not send invitation. Please try again.
                </div>
              )}
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => { setShowInviteForm(false); reset() }}>
                  Cancel
                </Button>
                <Button type="submit" loading={inviteMutation.isPending}>Send invitation</Button>
              </div>
            </div>
          </form>
        </ContentCard>
      )}

      <ContentCard padding="none">
        <DataTable
          columns={columns}
          data={data?.data ?? []}
          loading={isLoading}
          getRowId={row => row.id}
          emptyTitle="No users"
          emptyDescription="Invite team members to get started."
        />
      </ContentCard>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={open => !open && setDeleteTarget(null)}
        title="Remove user"
        description={`Remove ${deleteTarget?.name} from this account? They will lose access immediately.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          if (deleteTarget) {
            removeMutation.mutate(deleteTarget.id, {
              onSuccess: () => setDeleteTarget(null),
            })
          }
        }}
        loading={removeMutation.isPending}
      />
    </div>
  )
}
