import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { TenantTheme } from '@/api/tenants'

interface ThemeState {
  theme: TenantTheme | null
  setTheme: (theme: TenantTheme) => void
  applyTheme: (theme: TenantTheme) => void
  clearTheme: () => void
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
  if (theme.fontFamily) {
    // Ensure a generic fallback is always present
    const font = theme.fontFamily.includes(',') ? theme.fontFamily : `${theme.fontFamily}, sans-serif`
    root.style.setProperty('--font-sans', font)
  }
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

      // Called on logout — resets CSS vars to stylesheet defaults so the next
      // tenant's theme loads clean with no stale colours.
      clearTheme: () => {
        const root = document.documentElement
        root.style.removeProperty('--color-primary')
        root.style.removeProperty('--color-primary-hover')
        root.style.removeProperty('--color-primary-subtle')
        root.style.removeProperty('--color-primary-subtle-border')
        root.style.removeProperty('--color-secondary')
        root.style.removeProperty('--color-secondary-hover')
        root.style.removeProperty('--font-sans')
        set({ theme: null })
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
