import { cn } from '@/lib/utils'
import { SearchInput } from '@/components/ui/molecules/SearchInput'
import { Button } from '@/components/ui/atoms/Button'

export interface FilterBarProps {
  search?: string
  onSearchChange?: (value: string) => void
  searchPlaceholder?: string
  filters?: React.ReactNode
  actions?: React.ReactNode
  onReset?: () => void
  hasActiveFilters?: boolean
  className?: string
}

export function FilterBar({
  search, onSearchChange, searchPlaceholder = 'Search…',
  filters, actions, onReset, hasActiveFilters, className,
}: FilterBarProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {onSearchChange !== undefined && (
        <SearchInput
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          onClear={() => onSearchChange('')}
          placeholder={searchPlaceholder}
          className="w-64"
        />
      )}
      {filters}
      {hasActiveFilters && onReset && (
        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-fg">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Reset filters
        </Button>
      )}
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  )
}
