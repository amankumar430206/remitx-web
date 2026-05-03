import { cn } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/molecules/StatusBadge'

export interface TimelineEvent {
  id: string
  status: string
  label?: string
  description?: string
  actor?: string
  timestamp: string
  note?: string
}

export interface TimelineProps {
  events: TimelineEvent[]
  className?: string
}

export function Timeline({ events, className }: TimelineProps) {
  return (
    <ol className={cn('relative space-y-0', className)}>
      {events.map((event, idx) => (
        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {/* Vertical line */}
          {idx < events.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
          )}
          {/* Dot */}
          <div className="relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface border-2 border-primary mt-0.5">
            <div className="h-2 w-2 rounded-full bg-primary" />
          </div>
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} />
              {event.label && <span className="text-sm font-medium text-foreground">{event.label}</span>}
            </div>
            {event.description && <p className="mt-0.5 text-sm text-muted-fg">{event.description}</p>}
            {event.note && (
              <p className="mt-1 text-xs text-foreground-subtle italic border-l-2 border-border pl-2">{event.note}</p>
            )}
            <div className="mt-1 flex items-center gap-2 text-xs text-muted-fg">
              {event.actor && <span>{event.actor}</span>}
              {event.actor && <span>·</span>}
              <time>{new Date(event.timestamp).toLocaleString()}</time>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
