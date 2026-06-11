import { useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { Button } from '@/components/ui/atoms/Button'
import { Input } from '@/components/ui/atoms/Input'
import { Badge } from '@/components/ui/atoms/Badge'
import { ContentCard } from '@/layouts/ContentCard'
import { useAuthStore } from '@/stores/authStore'
import { useUpdateProfile, useChangePassword } from '@/hooks/useUsers'
import { usePermissions } from '@/hooks/usePermissions'
import { getApiError } from '@/lib/apiError'

function formatPermission(p: string): { domain: string; action: string } {
  const [domain, action] = p.split(':')
  return {
    domain: (domain ?? p).charAt(0).toUpperCase() + (domain ?? p).slice(1).replace(/_/g, ' '),
    action: action === '*' ? 'Full access' : (action ?? '').replace(/_/g, ' '),
  }
}

function MyPermissionsCard({ role, permissions }: { role: string; permissions: string[] }) {
  const grouped = useMemo(() => {
    const map: Record<string, string[]> = {}
    for (const p of permissions) {
      const [domain] = p.split(':')
      if (!map[domain]) map[domain] = []
      map[domain].push(p)
    }
    return map
  }, [permissions])

  const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <ContentCard>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Your role &amp; permissions</h3>
          <Badge variant="outline">{roleLabel}</Badge>
        </div>

        {permissions.length === 0 ? (
          <p className="text-sm text-muted-fg">No permissions assigned to your role.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {Object.entries(grouped).map(([domain, perms]) => {
              const domainLabel = domain.charAt(0).toUpperCase() + domain.slice(1).replace(/_/g, ' ')
              return (
                <div key={domain}>
                  <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-fg">{domainLabel}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {perms.map(p => {
                      const { action } = formatPermission(p)
                      return (
                        <span
                          key={p}
                          className="inline-flex items-center rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs text-foreground"
                        >
                          {action}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </ContentCard>
  )
}

const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'At least 8 characters'),
  confirmPassword: z.string(),
}).refine(d => d.newPassword === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ProfileValues = z.infer<typeof profileSchema>
type PasswordValues = z.infer<typeof passwordSchema>

export function Profile() {
  const user = useAuthStore(s => s.user)
  const updateProfile = useUpdateProfile()
  const changePassword = useChangePassword()
  const { permissions } = usePermissions()

  const {
    register: regProfile,
    handleSubmit: handleProfile,
    reset: resetProfile,
    formState: { errors: profileErrors },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) })

  const {
    register: regPwd,
    handleSubmit: handlePwd,
    reset: resetPwd,
    formState: { errors: pwdErrors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema) })

  useEffect(() => {
    if (user) resetProfile({ firstName: user.first_name ?? '', lastName: user.last_name ?? '' })
  }, [user, resetProfile])

  const onProfileSave = (values: ProfileValues) => {
    updateProfile.mutate(values)
  }

  const onPasswordChange = (values: PasswordValues) => {
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      { onSuccess: () => resetPwd() }
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader title="Profile" breadcrumbs={[{ label: 'Settings' }, { label: 'Profile' }]} />

      <ContentCard>
        <form onSubmit={handleProfile(onProfileSave)}>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Personal information</h3>

            <FormField label="First name" error={profileErrors.firstName?.message} required htmlFor="firstName">
              <Input id="firstName" {...regProfile('firstName')} error={!!profileErrors.firstName} />
            </FormField>

            <FormField label="Last name" error={profileErrors.lastName?.message} htmlFor="lastName">
              <Input id="lastName" {...regProfile('lastName')} error={!!profileErrors.lastName} />
            </FormField>

            <FormField label="Email address" htmlFor="email">
              <Input id="email" type="email" value={user?.email ?? ''} disabled className="opacity-60" />
            </FormField>

            {updateProfile.isError && (
              <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                {getApiError(updateProfile.error, 'Could not update profile. Please try again.')}
              </div>
            )}

            {updateProfile.isSuccess && (
              <div className="rounded-md bg-success px-4 py-2 text-sm text-success-fg">
                Profile updated successfully.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={updateProfile.isPending}>Save changes</Button>
            </div>
          </div>
        </form>
      </ContentCard>

      <ContentCard>
        <form onSubmit={handlePwd(onPasswordChange)}>
          <div className="flex flex-col gap-4">
            <h3 className="text-sm font-semibold text-foreground">Change password</h3>

            <FormField label="Current password" error={pwdErrors.currentPassword?.message} required htmlFor="currentPassword">
              <Input id="currentPassword" type="password" {...regPwd('currentPassword')} error={!!pwdErrors.currentPassword} />
            </FormField>

            <FormField label="New password" error={pwdErrors.newPassword?.message} required htmlFor="newPassword">
              <Input id="newPassword" type="password" {...regPwd('newPassword')} error={!!pwdErrors.newPassword} />
            </FormField>

            <FormField label="Confirm new password" error={pwdErrors.confirmPassword?.message} required htmlFor="confirmPassword">
              <Input id="confirmPassword" type="password" {...regPwd('confirmPassword')} error={!!pwdErrors.confirmPassword} />
            </FormField>

            {changePassword.isError && (
              <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
                {getApiError(changePassword.error, 'Could not change password. Check your current password and try again.')}
              </div>
            )}

            {changePassword.isSuccess && (
              <div className="rounded-md bg-success px-4 py-2 text-sm text-success-fg">
                Password changed successfully.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={changePassword.isPending}>Change password</Button>
            </div>
          </div>
        </form>
      </ContentCard>

      {user?.role && (
        <MyPermissionsCard role={user.role} permissions={permissions} />
      )}
    </div>
  )
}
