import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type ColorMode = 'light' | 'dark' | 'system'
type ResolvedMode = 'light' | 'dark'

interface ColorModeState {
  mode: ColorMode
  resolvedMode: ResolvedMode
  setMode: (mode: ColorMode) => void
}

function getSystemPreference(): ResolvedMode {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function applyToDOM(mode: ColorMode): ResolvedMode {
  const resolved = mode === 'system' ? getSystemPreference() : mode
  document.documentElement.setAttribute('data-theme', resolved)
  return resolved
}

export const useColorModeStore = create<ColorModeState>()(
  persist(
    (set, get) => ({
      mode: 'light',
      resolvedMode: 'light',

      setMode: (mode) => {
        const resolvedMode = applyToDOM(mode)
        set({ mode, resolvedMode })
      },
    }),
    {
      name: 'remitx-color-mode',
      partialize: (s) => ({ mode: s.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          const resolvedMode = applyToDOM(state.mode)
          state.resolvedMode = resolvedMode
        }
      },
    }
  )
)

// Listen for system preference changes when mode === 'system'
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { mode, setMode } = useColorModeStore.getState()
    if (mode === 'system') setMode('system')
  })
}
