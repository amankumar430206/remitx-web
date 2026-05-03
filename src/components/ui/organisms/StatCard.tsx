import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/atoms/Spinner'

export interface StatCardProps {
  title: string
  value: string | React.ReactNode
  description?: string
  icon?: React.ReactNode
  trend?: { value: number; label?: string }
  loading?: boolean
  className?: string
  onClick?: () => void
}

export function StatCard({ title, value, description, icon, trend, loading, className, onClick }: StatCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border bg-surface p-5 flex flex-col gap-3',
        onClick && 'cursor-pointer hover:border-border-strong transition-colors',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-fg">{title}</span>
        {icon && (
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-info text-info-fg">
            {icon}
          </span>
        )}
      </div>
      {loading ? (
        <Spinner size="sm" />
      ) : (
        <div>
          <div className="text-2xl font-bold text-foreground">{value}</div>
          {description && <p className="mt-0.5 text-xs text-muted-fg">{description}</p>}
        </div>
      )}
      {trend && (
        <div className={cn('flex items-center gap-1 text-xs font-medium', trend.value >= 0 ? 'text-success-fg' : 'text-danger-fg')}>
          <svg className={cn('h-3 w-3', trend.value < 0 && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l10-10M7 7h10v10" />
          </svg>
          {Math.abs(trend.value)}% {trend.label ?? 'vs last period'}
        </div>
      )}
    </div>
  )
}
