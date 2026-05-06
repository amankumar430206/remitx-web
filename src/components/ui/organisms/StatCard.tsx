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
  variant?: 'default' | 'gradient'
}

export function StatCard({ title, value, description, icon, trend, loading, className, onClick, variant = 'default' }: StatCardProps) {
  const isGrad = variant === 'gradient'

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 flex flex-col gap-3 transition-all duration-200',
        isGrad
          ? 'stat-card-hero border-transparent text-white cursor-default'
          : 'bg-surface border-border card-shadow',
        !isGrad && onClick && 'cursor-pointer hover:-translate-y-0.5 hover:card-shadow-hover hover:border-border-strong',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn(
          'text-xs font-semibold uppercase tracking-wider',
          isGrad ? 'text-white/60' : 'text-muted-fg'
        )}>
          {title}
        </span>
        {icon && (
          <span className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0',
            isGrad ? 'bg-white/15' : 'bg-primary-subtle text-primary'
          )}>
            {icon}
          </span>
        )}
      </div>

      {loading ? (
        <Spinner size="sm" />
      ) : (
        <div>
          <div className={cn(
            'text-2xl font-bold tabular leading-none',
            isGrad ? 'text-white' : 'text-foreground'
          )}>
            {value}
          </div>
          {description && (
            <p className={cn('mt-1.5 text-xs', isGrad ? 'text-white/50' : 'text-muted-fg')}>
              {description}
            </p>
          )}
        </div>
      )}

      {trend && (
        <div className={cn(
          'flex items-center gap-1 text-xs font-semibold',
          isGrad
            ? 'text-white/70'
            : trend.value >= 0 ? 'text-success-fg' : 'text-danger-fg'
        )}>
          <svg
            className={cn('h-3 w-3', trend.value < 0 && 'rotate-180')}
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17l10-10M7 7h10v10" />
          </svg>
          {Math.abs(trend.value)}% {trend.label ?? 'vs last period'}
        </div>
      )}
    </div>
  )
}
