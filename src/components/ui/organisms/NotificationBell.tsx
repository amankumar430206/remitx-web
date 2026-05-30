import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/useNotifications'
import type { Notification } from '@/api/notifications'

const EVENT_ICONS: Record<string, React.ReactNode> = {
  payment_completed: (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15 shrink-0">
      <svg className="h-4 w-4 text-success-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  ),
  payment_failed: (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-danger/15 shrink-0">
      <svg className="h-4 w-4 text-danger-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  ),
  payment_pending_approval: (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-warning/15 shrink-0">
      <svg className="h-4 w-4 text-warning-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  ),
}

const DEFAULT_ICON = (
  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-subtle shrink-0">
    <svg className="h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  </div>
)

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function NotificationItem({ n, onRead }: { n: Notification; onRead: (id: string) => void }) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 hover:bg-surface-overlay cursor-pointer transition-colors relative',
        !n.is_read && 'bg-primary-subtle/40'
      )}
      onClick={() => !n.is_read && onRead(n.id)}
    >
      {EVENT_ICONS[n.event_type] ?? DEFAULT_ICON}
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm leading-snug', n.is_read ? 'text-foreground-subtle' : 'text-foreground font-medium')}>
          {n.title}
        </p>
        {n.body && (
          <p className="text-xs text-muted-fg mt-0.5 line-clamp-2">{n.body}</p>
        )}
        <p className="text-[11px] text-muted-fg mt-1">{timeAgo(n.created_at)}</p>
      </div>
      {!n.is_read && (
        <span className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
      )}
    </div>
  )
}

export function NotificationBell({ className }: { className?: string }) {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 })

  const { data } = useNotifications({ limit: 10, page: 1 })
  const notifications = data?.data ?? []
  const unreadCount = notifications.filter(n => !n.is_read).length

  const { mutate: markRead } = useMarkNotificationRead()
  const { mutate: markAll } = useMarkAllNotificationsRead()

  // Close on outside click — check both the trigger button and the portal panel
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const insideButton = buttonRef.current?.contains(target) ?? false
      const insidePanel  = panelRef.current?.contains(target) ?? false
      if (!insideButton && !insidePanel) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Recalculate position on window resize while open
  useEffect(() => {
    if (!open) return
    const onResize = () => {
      if (!buttonRef.current) return
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open])

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPos({ top: rect.bottom + 8, right: window.innerWidth - rect.right })
    }
    setOpen(o => !o)
  }

  return (
    <div className={cn('relative', className)}>
      {/* Bell button */}
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className={cn(
          'relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150',
          'text-nav-fg hover:text-nav-fg-active hover:bg-nav-item-hover',
          open && 'bg-nav-item-hover text-nav-fg-active'
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger-fg px-1 text-[10px] font-bold text-white leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel — portaled to document.body to escape header's stacking context
          (nav-glass uses backdrop-filter which creates a stacking context, trapping z-index) */}
      {open && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[9999] w-80 rounded-2xl border border-border bg-surface card-shadow-md overflow-hidden"
          style={{ top: dropdownPos.top, right: dropdownPos.right }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={() => markAll()}
                className="text-xs text-primary hover:text-primary-hover font-medium transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[360px] overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <svg className="h-8 w-8 text-muted-fg/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm text-muted-fg">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {notifications.map(n => (
                  <NotificationItem key={n.id} n={n} onRead={markRead} />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2.5">
              <button
                onClick={() => { navigate('/settings/notifications'); setOpen(false) }}
                className="w-full text-xs text-center text-primary hover:text-primary-hover font-medium transition-colors"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  )
}
