import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type LayoutMode = 'topnav' | 'sidebar'

interface LayoutState {
  layout: LayoutMode
  setLayout: (layout: LayoutMode) => void
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      layout: 'topnav',
      setLayout: (layout) => set({ layout }),
    }),
    { name: 'remitx-layout' }
  )
)
