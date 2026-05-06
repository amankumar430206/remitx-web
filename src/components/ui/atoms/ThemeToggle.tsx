import { useColorModeStore } from '@/stores/colorModeStore'
import { cn } from '@/lib/utils'

const SunIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="5" />
    <path strokeLinecap="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
  </svg>
)

const MoonIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
  </svg>
)

const SystemIcon = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path strokeLinecap="round" d="M8 21h8M12 17v4" />
  </svg>
)

interface ThemeToggleProps {
  className?: string
  /** 'icon' = single button cycles light→dark→system, 'segmented' = 3-button row */
  variant?: 'icon' | 'segmented'
}

export function ThemeToggle({ className, variant = 'icon' }: ThemeToggleProps) {
  const { mode, resolvedMode, setMode } = useColorModeStore()

  const cycle = () => {
    if (mode === 'light') setMode('dark')
    else if (mode === 'dark') setMode('system')
    else setMode('light')
  }

  if (variant === 'segmented') {
    const options = [
      { value: 'light' as const, icon: <SunIcon />, label: 'Light' },
      { value: 'dark'  as const, icon: <MoonIcon />, label: 'Dark'  },
      { value: 'system' as const, icon: <SystemIcon />, label: 'System' },
    ]
    return (
      <div className={cn('flex items-center gap-0.5 rounded-lg bg-surface-overlay p-0.5', className)}>
        {options.map(opt => (
          <button
            key={opt.value}
            onClick={() => setMode(opt.value)}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
              mode === opt.value
                ? 'bg-surface text-foreground card-shadow'
                : 'text-muted-fg hover:text-foreground'
            )}
            aria-label={opt.label}
            title={opt.label}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <button
      onClick={cycle}
      className={cn(
        'flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-150',
        'text-nav-fg hover:text-nav-fg-active hover:bg-nav-item-hover',
        className
      )}
      aria-label={`Color mode: ${mode} (click to cycle)`}
      title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} mode`}
    >
      {resolvedMode === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}
