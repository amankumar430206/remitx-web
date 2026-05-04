import { apiClient } from './client'

export interface NotificationPreferences {
  paymentSubmitted: boolean
  paymentApproved: boolean
  paymentRejected: boolean
  paymentCompleted: boolean
  paymentFailed: boolean
  kycStatusChanged: boolean
  lowBalance: boolean
  lowBalanceThreshold: string
  emailEnabled: boolean
  inAppEnabled: boolean
}

const notifications = {
  getPreferences: () =>
    apiClient.get<{ success: boolean; data: NotificationPreferences }>('/notifications/preferences'),

  updatePreferences: (payload: Partial<NotificationPreferences>) =>
    apiClient.put<{ success: boolean; data: NotificationPreferences }>('/notifications/preferences', payload),
}

export default notifications
