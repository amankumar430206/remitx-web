/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // RGB-channel vars → opacity modifiers work (bg-primary/10 etc.)
        primary:        'rgb(var(--color-primary) / <alpha-value>)',
        'primary-hover':'rgb(var(--color-primary-hover) / <alpha-value>)',
        'primary-fg':   'rgb(var(--color-primary-fg) / <alpha-value>)',
        secondary:      'rgb(var(--color-secondary) / <alpha-value>)',
        'secondary-hover':'rgb(var(--color-secondary-hover) / <alpha-value>)',
        'secondary-fg': 'rgb(var(--color-secondary-fg) / <alpha-value>)',
        'muted-fg':     'rgb(var(--color-muted-fg) / <alpha-value>)',
        danger:         'rgb(var(--color-danger) / <alpha-value>)',
        'danger-fg':    'rgb(var(--color-danger-fg) / <alpha-value>)',
        info:           'rgb(var(--color-info) / <alpha-value>)',
        'info-fg':      'rgb(var(--color-info-fg) / <alpha-value>)',

        // Hex vars — not used with opacity modifiers
        surface:           'var(--color-surface)',
        'surface-raised':  'var(--color-surface-raised)',
        'surface-overlay': 'var(--color-surface-overlay)',
        border:            'var(--color-border)',
        'border-strong':   'var(--color-border-strong)',
        muted:             'var(--color-muted)',
        foreground:        'var(--color-foreground)',
        'foreground-subtle':'var(--color-foreground-subtle)',
        success:           'var(--color-success)',
        'success-fg':      'var(--color-success-fg)',
        warning:           'var(--color-warning)',
        'warning-fg':      'var(--color-warning-fg)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: 'var(--radius)',
        sm:      'var(--radius-sm)',
        lg:      'var(--radius-lg)',
        xl:      'calc(var(--radius) * 2)',
      },
    },
  },
  plugins: [],
}
