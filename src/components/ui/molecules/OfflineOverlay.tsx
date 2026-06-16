import { useOnlineStatus } from '@/hooks/useOnlineStatus'

export function OfflineOverlay() {
  const online = useOnlineStatus()

  if (online) return null

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface/95 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
        {/* Animated icon */}
        <div className="relative flex items-center justify-center w-20 h-20">
          <span className="absolute inline-flex h-full w-full rounded-full bg-warning/20 animate-ping" />
          <span className="relative flex items-center justify-center w-16 h-16 rounded-full bg-warning/10 border border-warning/30">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-8 h-8 text-warning"
            >
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
              <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
              <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
              <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
              <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
              <line x1="12" y1="20" x2="12.01" y2="20" />
            </svg>
          </span>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold text-foreground">No internet connection</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            RemitX requires a stable connection to process payments securely. Please check your network and we'll reconnect automatically.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-warning animate-pulse" />
          Waiting for connection…
        </div>
      </div>
    </div>
  )
}
