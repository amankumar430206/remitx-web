import { cn } from '@/lib/utils'

interface PaginationProps {
  page: number
  totalPages: number
  total?: number
  pageSize?: number
  onChange: (page: number) => void
  className?: string
}

function getPages(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 4) return [1, 2, 3, 4, 5, '…', total]
  if (current >= total - 3) return [1, '…', total - 4, total - 3, total - 2, total - 1, total]
  return [1, '…', current - 1, current, current + 1, '…', total]
}

const ChevronLeft = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
)

const ChevronRight = () => (
  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
  </svg>
)

export function Pagination({ page, totalPages, total, pageSize = 20, onChange, className }: PaginationProps) {
  if (totalPages <= 1) return null

  const pages = getPages(page, totalPages)
  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total ?? page * pageSize)

  return (
    <div className={cn('flex items-center justify-between gap-4 px-4 py-3 border-t border-border', className)}>
      {/* Results count */}
      <p className="text-xs text-muted-fg tabular shrink-0">
        {total !== undefined
          ? `${from}–${to} of ${total.toLocaleString()}`
          : `Page ${page} of ${totalPages}`}
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => onChange(page - 1)}
          disabled={page === 1}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
            page === 1
              ? 'text-muted-fg/40 cursor-not-allowed'
              : 'text-foreground-subtle hover:bg-surface-overlay hover:text-foreground'
          )}
          aria-label="Previous page"
        >
          <ChevronLeft />
        </button>

        {/* Page numbers */}
        {pages.map((p, i) =>
          p === '…' ? (
            <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-xs text-muted-fg select-none">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onChange(p as number)}
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors',
                p === page
                  ? 'bg-primary text-primary-fg shadow-sm'
                  : 'text-foreground-subtle hover:bg-surface-overlay hover:text-foreground'
              )}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          )
        )}

        {/* Next */}
        <button
          onClick={() => onChange(page + 1)}
          disabled={page === totalPages}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg text-sm transition-colors',
            page === totalPages
              ? 'text-muted-fg/40 cursor-not-allowed'
              : 'text-foreground-subtle hover:bg-surface-overlay hover:text-foreground'
          )}
          aria-label="Next page"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  )
}
