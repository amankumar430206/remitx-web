import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import notificationsApi from '@/api/notifications'
import type { NotificationPreferences } from '@/api/notifications'

export function useNotificationPreferences() {
  return useQuery({
    queryKey: ['notification-preferences'],
    queryFn: () => notificationsApi.getPreferences().then(r => r.data.data),
  })
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<NotificationPreferences>) =>
      notificationsApi.updatePreferences(payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notification-preferences'] }),
  })
}
