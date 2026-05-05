import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TenantTheme } from '@/api/tenants'

interface ThemeState {
  theme: TenantTheme | null
  setTheme: (theme: TenantTheme) => void
  applyTheme: (theme: TenantTheme) => void
}

function hexToRgb(hex: string) {
  const clean = hex.replace('#', '')
  const n = parseInt(clean, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

function darken(hex: string, amount = 0.15): string {
  const { r, g, b } = hexToRgb(hex)
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)))
  return `#${[d(r), d(g), d(b)].map(v => v.toString(16).padStart(2, '0')).join('')}`
}

function applyCssVars(theme: TenantTheme) {
  const root = document.documentElement
  if (theme.primaryColor) {
    const { r, g, b } = hexToRgb(theme.primaryColor)
    root.style.setProperty('--color-primary', theme.primaryColor)
    root.style.setProperty('--color-primary-hover', darken(theme.primaryColor))
    root.style.setProperty('--color-primary-subtle', `rgba(${r}, ${g}, ${b}, 0.08)`)
    root.style.setProperty('--color-primary-subtle-border', `rgba(${r}, ${g}, ${b}, 0.3)`)
  }
  if (theme.secondaryColor) {
    root.style.setProperty('--color-secondary', theme.secondaryColor)
    root.style.setProperty('--color-secondary-hover', darken(theme.secondaryColor))
  }
  if (theme.fontFamily) root.style.setProperty('--font-sans', theme.fontFamily)
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: null,

      setTheme: (theme) => set({ theme }),

      applyTheme: (theme) => {
        applyCssVars(theme)
        set({ theme })
      },
    }),
    {
      name: 'tenant-theme',
      partialize: (s) => ({ theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state?.theme) applyCssVars(state.theme)
      },
    }
  )
)
