import { cn } from '@/lib/utils'
import { useThemeStore } from '@/stores/themeStore'

interface Stat {
  label: string
  value: string | number
  accent?: 'default' | 'success' | 'warning' | 'danger' | 'primary'
}

interface ReportBrandHeaderProps {
  title: string
  subtitle?: string
  period?: string
  generatedAt?: Date
  stats?: Stat[]
  className?: string
}

export function ReportBrandHeader({
  title,
  subtitle,
  period,
  generatedAt = new Date(),
  stats,
  className,
}: ReportBrandHeaderProps) {
  const theme = useThemeStore(s => s.theme)
  const logoUrl = theme?.logoUrl
  const tenantName = theme?.tenantName ?? 'RemitX'

  const fmtGenerated = generatedAt.toLocaleDateString('en-US', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  const accentClass: Record<NonNullable<Stat['accent']>, string> = {
    default: 'bg-surface border-border text-foreground',
    primary: 'bg-primary/8 border-primary/20 text-primary',
    success: 'bg-success/8 border-success/20 text-success-fg',
    warning: 'bg-warning/8 border-warning/20 text-warning-fg',
    danger:  'bg-danger/8  border-danger/20  text-danger-fg',
  }

  return (
    <div className={cn('rounded-xl border border-border bg-card overflow-hidden', className)}>

      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-primary via-primary/60 to-transparent" />

      <div className="flex items-start justify-between gap-6 px-6 py-5">

        {/* ── Brand block ─────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={tenantName}
                className="h-full w-full object-contain p-1.5"
              />
            ) : (
              <span className="text-xl font-black text-primary leading-none">
                {tenantName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-bold text-foreground leading-tight">{tenantName}</span>
            <span className="text-[11px] text-muted-fg">Official report</span>
          </div>
        </div>

        {/* ── Report meta ──────────────────────────────────────────────── */}
        <div className="flex flex-col items-end gap-1 text-right">
          <h2 className="text-lg font-bold text-foreground leading-tight">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-fg">{subtitle}</p>
          )}
          {period && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <svg className="h-3 w-3 text-muted-fg shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-medium text-foreground">{period}</span>
            </div>
          )}
          <span className="text-[11px] text-muted-fg mt-0.5">Generated {fmtGenerated}</span>
        </div>

      </div>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      {stats && stats.length > 0 && (
        <>
          <div className="mx-6 border-t border-border" />
          <div className="flex items-center gap-2 px-6 py-3 flex-wrap">
            {stats.map((stat, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center gap-2 rounded-full border px-3 py-1 text-xs',
                  accentClass[stat.accent ?? 'default'],
                )}
              >
                <span className="text-[10px] font-medium opacity-70">{stat.label}</span>
                <span className="font-bold tabular-nums">{stat.value}</span>
              </div>
            ))}
          </div>
        </>
      )}

    </div>
  )
}
