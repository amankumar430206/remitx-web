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

function darken(hex: string, amount = 0.15) {
  const { r, g, b } = hexToRgb(hex)
  const d = (v: number) => Math.max(0, Math.round(v * (1 - amount)))
  return `rgb(${d(r)}, ${d(g)}, ${d(b)})`
}

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: null,

  setTheme: (theme) => set({ theme }),

  applyTheme: (theme) => {
    const root = document.documentElement
    root.style.setProperty('--color-primary', theme.primaryColor)
    root.style.setProperty('--color-primary-hover', darken(theme.primaryColor))
    root.style.setProperty('--color-secondary', theme.secondaryColor)
    root.style.setProperty('--color-secondary-hover', darken(theme.secondaryColor))
    if (theme.fontFamily) root.style.setProperty('--font-sans', theme.fontFamily)
    set({ theme })
  },
}))
