import type { ReactNode } from 'react'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'

export function useFeatureFlag(key: string): boolean {
  return useFeatureFlagStore(s => s.flags[key] ?? true)
}

interface FeatureGateProps {
  flag: string
  children: ReactNode
  fallback?: ReactNode
}

export function FeatureGate({ flag, children, fallback = null }: FeatureGateProps) {
  const enabled = useFeatureFlag(flag)
  return enabled ? children : fallback
}
