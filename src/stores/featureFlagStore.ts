import { create } from 'zustand'
import { DEFAULT_FLAGS } from '@/config/featureFlags'

interface FlagState {
  flags: Record<string, boolean>
  loaded: boolean
  setFlags: (incoming: Record<string, boolean>) => void
}

export const useFeatureFlagStore = create<FlagState>((set) => ({
  flags: DEFAULT_FLAGS,
  loaded: false,
  setFlags: (incoming) =>
    set({ flags: { ...DEFAULT_FLAGS, ...incoming }, loaded: true }),
}))
