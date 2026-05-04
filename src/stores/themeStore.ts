import { create } from 'zustand'
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

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: null,

  setTheme: (theme) => set({ theme }),

  applyTheme: (theme) => {
    const root = document.documentElement
    // Store as "R G B" channels so Tailwind opacity modifiers work
    const toChannels = (hex: string) => {
      const { r, g, b } = hexToRgb(hex)
      return `${r} ${g} ${b}`
    }
    root.style.setProperty('--color-primary', toChannels(theme.primaryColor))
    root.style.setProperty('--color-primary-hover', toChannels(darken(theme.primaryColor)))
    root.style.setProperty('--color-secondary', toChannels(theme.secondaryColor))
    root.style.setProperty('--color-secondary-hover', toChannels(darken(theme.secondaryColor)))
    if (theme.fontFamily) root.style.setProperty('--font-sans', theme.fontFamily)
    set({ theme })
  },
}))
