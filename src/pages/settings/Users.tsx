import { useState } from 'react'
import { getApiError } from '@/lib/apiError'
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
import { useUsers, useInviteUser, useUpdateUserStatus, useUpdateUserPermissions } from '@/hooks/useUsers'
import { useRoles } from '@/hooks/useRoles'
import type { User } from '@/api/users'
import type { Column } from '@/components/ui/organisms/DataTable'

// super_admin is a platform role — never assignable to tenant users.
const HIDDEN_ROLE_KEYS = new Set(['super_admin'])

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.string().min(1, 'Role is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

type InviteValues = z.infer<typeof inviteSchema>

export function Users() {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null)
  const [roleTarget, setRoleTarget] = useState<User | null>(null)
  const [newRole, setNewRole] = useState('')

  const { data: users, isLoading } = useUsers()
  const { data: roles } = useRoles()
  const inviteMutation = useInviteUser()
  const statusMutation = useUpdateUserStatus()
  const roleMutation = useUpdateUserPermissions()

  // Assignable roles come from the live roles list (defaults + custom), minus super_admin.
  const roleOptions = (roles ?? [])
    .filter(r => !HIDDEN_ROLE_KEYS.has(r.key))
    .map(r => ({ value: r.key, label: r.name }))

  const roleLabel = (key: string) =>
    roles?.find(r => r.key === key)?.name ?? key.replace(/_/g, ' ')

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<InviteValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: 'user' },
  })

  const onInvite = (values: InviteValues) => {
    inviteMutation.mutate(values, {
      onSuccess: () => { reset(); setShowInviteForm(false) },
    })
  }

  const toggleStatus = (user: User) => {
    const next = user.status === 'active' ? 'inactive' : 'active'
    statusMutation.mutate({ id: user.id, status: next })
  }

  const openRoleChange = (user: User) => {
    setRoleTarget(user)
    setNewRole(user.role)
  }

  const confirmRoleChange = () => {
    if (!roleTarget || !newRole) return
    roleMutation.mutate(
      { id: roleTarget.id, role: newRole },
      { onSuccess: () => setRoleTarget(null) },
    )
  }

  const columns: Column<User>[] = [
    {
      key: 'email',
      header: 'User',
      render: row => (
        <div>
          <p className="font-medium text-foreground text-sm">
            {[row.first_name, row.last_name].filter(Boolean).join(' ') || '—'}
          </p>
          <p className="text-xs text-muted-fg">{row.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: row => <Badge variant="secondary">{roleLabel(row.role)}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: row => <StatusBadge status={row.status} />,
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: row => <span className="text-xs text-muted-fg">{new Date(row.created_at).toLocaleDateString()}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: row => (
        <div className="flex items-center gap-2 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={e => { e.stopPropagation(); openRoleChange(row) }}
          >
            Change role
          </Button>
          {row.status !== 'invited' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={e => { e.stopPropagation(); toggleStatus(row) }}
              loading={statusMutation.isPending}
            >
              {row.status === 'active' ? 'Deactivate' : 'Activate'}
            </Button>
          )}
          {row.status === 'active' && (
            <Button
              variant="outline"
              size="sm"
              onClick={e => { e.stopPropagation(); setSuspendTarget(row) }}
            >
              Suspend
            </Button>
          )}
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="First name" htmlFor="invite-first">
                  <Input id="invite-first" {...register('firstName')} />
                </FormField>
                <FormField label="Last name" htmlFor="invite-last">
                  <Input id="invite-last" {...register('lastName')} />
                </FormField>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Email" error={errors.email?.message} required htmlFor="invite-email">
                  <Input id="invite-email" type="email" {...register('email')} error={!!errors.email} />
                </FormField>
                <FormField label="Role" error={errors.role?.message} required>
                  <Select
                    value={watch('role')}
                    onValueChange={v => setValue('role', v)}
                    options={roleOptions}
                    error={!!errors.role}
                  />
                </FormField>
              </div>
              {inviteMutation.isError && (
                <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                  {getApiError(inviteMutation.error, 'Could not send invitation. Please try again.')}
                </div>
              )}
              {inviteMutation.isSuccess && (
                <div className="rounded-md bg-success px-4 py-2 text-sm text-success-fg">
                  Invitation sent successfully.
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
          data={users ?? []}
          loading={isLoading}
          getRowId={row => row.id}
          emptyTitle="No users"
          emptyDescription="Invite team members to get started."
        />
      </ContentCard>

      <ConfirmDialog
        open={!!roleTarget}
        onOpenChange={open => !open && setRoleTarget(null)}
        title="Change role"
        description={`Assign a new role to ${roleTarget?.email}. Their permissions update on next sign-in.`}
        confirmLabel="Save role"
        onConfirm={confirmRoleChange}
        loading={roleMutation.isPending}
        disabled={!newRole || newRole === roleTarget?.role}
      >
        <FormField label="Role" required>
          <Select value={newRole} onValueChange={setNewRole} options={roleOptions} />
        </FormField>
        {roleMutation.isError && (
          <p className="mt-2 text-sm text-danger-fg">
            {getApiError(roleMutation.error, 'Could not change role.')}
          </p>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={!!suspendTarget}
        onOpenChange={open => !open && setSuspendTarget(null)}
        title="Suspend user"
        description={`Suspend ${suspendTarget?.email}? They will lose access immediately.`}
        confirmLabel="Suspend"
        variant="danger"
        onConfirm={() => {
          if (suspendTarget) {
            statusMutation.mutate(
              { id: suspendTarget.id, status: 'suspended' },
              { onSuccess: () => setSuspendTarget(null) },
            )
          }
        }}
        loading={statusMutation.isPending}
      />
    </div>
  )
}
