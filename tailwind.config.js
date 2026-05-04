/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary:               'var(--color-primary)',
        'primary-hover':       'var(--color-primary-hover)',
        'primary-fg':          'var(--color-primary-fg)',
        'primary-subtle':      'var(--color-primary-subtle)',
        'primary-subtle-border':'var(--color-primary-subtle-border)',
        secondary:             'var(--color-secondary)',
        'secondary-hover':     'var(--color-secondary-hover)',
        'secondary-fg':        'var(--color-secondary-fg)',
        'muted-fg':            'var(--color-muted-fg)',
        danger:                'var(--color-danger)',
        'danger-border':       'var(--color-danger-border)',
        'danger-fg':           'var(--color-danger-fg)',
        'danger-solid':        'var(--color-danger-solid)',
        'danger-solid-hover':  'var(--color-danger-solid-hover)',
        info:                  'var(--color-info)',
        'info-fg':             'var(--color-info-fg)',

        surface:               'var(--color-surface)',
        'surface-raised':      'var(--color-surface-raised)',
        'surface-overlay':     'var(--color-surface-overlay)',
        border:                'var(--color-border)',
        'border-strong':       'var(--color-border-strong)',
        muted:                 'var(--color-muted)',
        foreground:            'var(--color-foreground)',
        'foreground-subtle':   'var(--color-foreground-subtle)',
        success:               'var(--color-success)',
        'success-fg':          'var(--color-success-fg)',
        warning:               'var(--color-warning)',
        'warning-fg':          'var(--color-warning-fg)',
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
