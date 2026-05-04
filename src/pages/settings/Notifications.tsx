import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { FormField } from '@/components/ui/molecules/FormField'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { Button } from '@/components/ui/atoms/Button'
import { Toggle } from '@/components/ui/atoms/Toggle'
import { Input } from '@/components/ui/atoms/Input'
import { ContentCard } from '@/layouts/ContentCard'
import { useNotificationPreferences, useUpdateNotificationPreferences } from '@/hooks/useNotifications'
import type { NotificationPreferences } from '@/api/notifications'

const EVENT_LABELS: Array<{ key: keyof NotificationPreferences; label: string; group: string }> = [
  { key: 'paymentSubmitted', label: 'Payment submitted', group: 'Payments' },
  { key: 'paymentApproved', label: 'Payment approved', group: 'Payments' },
  { key: 'paymentRejected', label: 'Payment rejected', group: 'Payments' },
  { key: 'paymentCompleted', label: 'Payment completed', group: 'Payments' },
  { key: 'paymentFailed', label: 'Payment failed', group: 'Payments' },
  { key: 'kycStatusChanged', label: 'KYC status changed', group: 'Compliance' },
  { key: 'lowBalance', label: 'Low balance alert', group: 'Compliance' },
]

export function Notifications() {
  const { data: prefs, isLoading } = useNotificationPreferences()
  const updateMutation = useUpdateNotificationPreferences()

  const { control, handleSubmit, reset, watch } = useForm<NotificationPreferences>()

  useEffect(() => {
    if (prefs) reset(prefs)
  }, [prefs, reset])

  const onSave = (values: NotificationPreferences) => {
    updateMutation.mutate(values)
  }

  if (isLoading) return <LoadingState message="Loading preferences…" />

  const groups = Array.from(new Set(EVENT_LABELS.map(e => e.group)))

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <PageHeader title="Notifications" breadcrumbs={[{ label: 'Settings' }, { label: 'Notifications' }]} />

      <form onSubmit={handleSubmit(onSave)}>
        <div className="flex flex-col gap-4">
          <ContentCard>
            <div className="flex flex-col gap-4">
              <h3 className="text-sm font-semibold text-foreground">Channels</h3>
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Email notifications</p>
                    <p className="text-xs text-muted-fg">Receive notifications via email</p>
                  </div>
                  <Controller
                    name="emailEnabled"
                    control={control}
                    render={({ field }) => (
                      <Toggle checked={!!field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">In-app notifications</p>
                    <p className="text-xs text-muted-fg">Receive notifications within the platform</p>
                  </div>
                  <Controller
                    name="inAppEnabled"
                    control={control}
                    render={({ field }) => (
                      <Toggle checked={!!field.value} onCheckedChange={field.onChange} />
                    )}
                  />
                </div>
              </div>
            </div>
          </ContentCard>

          {groups.map(group => (
            <ContentCard key={group}>
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-semibold text-foreground">{group}</h3>
                <div className="flex flex-col gap-3">
                  {EVENT_LABELS.filter(e => e.group === group).map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <p className="text-sm text-foreground">{label}</p>
                      <Controller
                        name={key}
                        control={control}
                        render={({ field }) => (
                          <Toggle
                            checked={typeof field.value === 'boolean' ? field.value : false}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  ))}

                  {group === 'Compliance' && watch('lowBalance') && (
                    <FormField label="Low balance threshold" htmlFor="lowBalanceThreshold" className="mt-1">
                      <Controller
                        name="lowBalanceThreshold"
                        control={control}
                        render={({ field }) => (
                          <Input
                            id="lowBalanceThreshold"
                            placeholder="e.g. 1000"
                            value={field.value ?? ''}
                            onChange={field.onChange}
                            className="w-48"
                          />
                        )}
                      />
                    </FormField>
                  )}
                </div>
              </div>
            </ContentCard>
          ))}

          {updateMutation.isError && (
            <div className="rounded-md bg-danger border border-danger-border px-4 py-2 text-sm text-danger-fg">
              Could not save preferences. Please try again.
            </div>
          )}

          {updateMutation.isSuccess && (
            <div className="rounded-md bg-success px-4 py-2 text-sm text-success-fg">
              Preferences saved.
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={updateMutation.isPending}>Save preferences</Button>
          </div>
        </div>
      </form>
    </div>
  )
}
