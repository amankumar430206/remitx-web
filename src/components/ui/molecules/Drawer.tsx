import { useEffect } from 'react'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  width?: string
}

export function Drawer({ open, onClose, title, children, width = 'w-96' }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end transition-all duration-200 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
      aria-modal="true"
      role="dialog"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`relative flex flex-col ${width} h-full bg-surface border-l border-border shadow-2xl transition-transform duration-200 ease-out ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-5 py-4 shrink-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-fg transition-colors hover:bg-surface hover:text-foreground"
            aria-label="Close"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {children}
        </div>
      </div>
    </div>
  )
}
