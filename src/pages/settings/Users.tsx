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
import { useUsers, useInviteUser, useUpdateUserStatus } from '@/hooks/useUsers'
import type { User } from '@/api/users'
import type { Column } from '@/components/ui/organisms/DataTable'

const ROLE_OPTIONS = [
  { value: 'client_admin', label: 'Client Admin' },
  { value: 'maker', label: 'Maker' },
  { value: 'checker', label: 'Checker' },
]

const inviteSchema = z.object({
  email: z.string().email('Valid email is required'),
  role: z.enum(['client_admin', 'maker', 'checker']),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

type InviteValues = z.infer<typeof inviteSchema>

export function Users() {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [suspendTarget, setSuspendTarget] = useState<User | null>(null)

  const { data: users, isLoading } = useUsers()
  const inviteMutation = useInviteUser()
  const statusMutation = useUpdateUserStatus()

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
    const next = user.status === 'active' ? 'inactive' : 'active'
    statusMutation.mutate({ id: user.id, status: next })
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
      render: row => <Badge variant="secondary" className="capitalize">{row.role.replace('_', ' ')}</Badge>,
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
