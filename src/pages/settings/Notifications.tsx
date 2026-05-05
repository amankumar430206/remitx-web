import { PageHeader } from '@/components/ui/organisms/PageHeader'
import { DataTable } from '@/components/ui/organisms/DataTable'
import { Badge } from '@/components/ui/atoms/Badge'
import { Button } from '@/components/ui/atoms/Button'
import { LoadingState } from '@/components/ui/molecules/LoadingState'
import { EmptyState } from '@/components/ui/molecules/EmptyState'
import { ContentCard } from '@/layouts/ContentCard'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import type { Notification } from '@/api/notifications'
import type { Column } from '@/components/ui/organisms/DataTable'

export function Notifications() {
  const { data, isLoading } = useNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const notifications = data?.data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  const columns: Column<Notification>[] = [
    {
      key: 'event_type',
      header: 'Type',
      render: row => (
        <span className="font-mono text-xs text-muted-fg">{row.event_type.replace(/\./g, ' › ')}</span>
      ),
    },
    {
      key: 'body',
      header: 'Message',
      render: row => (
        <div className="flex items-center gap-2">
          {!row.is_read && (
            <span className="inline-block h-2 w-2 rounded-full bg-primary flex-shrink-0" />
          )}
          <span className={row.is_read ? 'text-muted-fg text-sm' : 'text-foreground text-sm font-medium'}>
            {row.body}
          </span>
        </div>
      ),
    },
    {
      key: 'is_read',
      header: 'Status',
      render: row => row.is_read
        ? <Badge variant="default">Read</Badge>
        : <Badge variant="primary">Unread</Badge>,
    },
    {
      key: 'created_at',
      header: 'Date',
      render: row => (
        <span className="text-xs text-muted-fg">{new Date(row.created_at).toLocaleString()}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: row => !row.is_read ? (
        <Button
          variant="ghost"
          size="sm"
          loading={markRead.isPending}
          onClick={e => { e.stopPropagation(); markRead.mutate(row.id) }}
        >
          Mark read
        </Button>
      ) : null,
    },
  ]

  if (isLoading) return <LoadingState message="Loading notifications…" />

  return (
    <div className="flex flex-col gap-6 max-w-4xl">
      <PageHeader
        title="Notifications"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Notifications' }]}
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              loading={markAll.isPending}
              onClick={() => markAll.mutate()}
            >
              Mark all read ({unreadCount})
            </Button>
          ) : undefined
        }
      />

      <ContentCard padding="none">
        {notifications.length === 0 ? (
          <EmptyState
            title="No notifications"
            description="You're all caught up."
          />
        ) : (
          <DataTable
            columns={columns}
            data={notifications}
            getRowId={n => n.id}
          />
        )}
      </ContentCard>
    </div>
  )
}
