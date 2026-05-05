import { apiClient } from './client'

export interface Notification {
  id: string
  event_type: string
  title: string
  body: string
  is_read: boolean
  created_at: string
}

export interface NotificationListResponse {
  success: boolean
  data: Notification[]
  meta: { page: number; limit: number; total: number }
}

const notifications = {
  list: (params?: { page?: number; limit?: number; unread?: boolean }) =>
    apiClient.get<NotificationListResponse>('/notifications', { params }),

  markRead: (id: string) =>
    apiClient.put(`/notifications/${id}/read`),

  markAllRead: () =>
    apiClient.put('/notifications/read-all'),
}

export default notifications
