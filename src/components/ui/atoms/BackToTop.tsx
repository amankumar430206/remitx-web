import { useState, useEffect } from 'react'
import { useFeatureFlag } from '@/hooks/useFeatureFlag'

export function BackToTop() {
  const enabled = useFeatureFlag('back_to_top')
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) return
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [enabled])

  if (!enabled || !visible) return null

  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="print:hidden fixed bottom-6 right-6 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface shadow-lg transition-all duration-200 hover:bg-surface-overlay hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0"
      aria-label="Back to top"
    >
      <svg className="h-4 w-4 text-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
      </svg>
    </button>
  )
}
