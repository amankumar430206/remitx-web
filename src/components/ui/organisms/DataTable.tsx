import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Checkbox } from '@/components/ui/atoms/Checkbox'
import { Spinner } from '@/components/ui/atoms/Spinner'
import { EmptyState } from '@/components/ui/molecules/EmptyState'

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => React.ReactNode
  className?: string
  headerClassName?: string
  sortable?: boolean
}

export interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  loading?: boolean
  selectable?: boolean
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  getRowId?: (row: T) => string
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyDescription?: string
  className?: string
  rowClassName?: (row: T) => string | undefined
}

export function DataTable<T>({
  columns, data, loading, selectable, selectedIds = [], onSelectionChange,
  getRowId, onRowClick, emptyTitle = 'No data', emptyDescription, className, rowClassName,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const allSelected = data.length > 0 && data.every(row => selectedIds.includes(getRowId?.(row) ?? ''))
  const someSelected = data.some(row => selectedIds.includes(getRowId?.(row) ?? ''))

  const toggleAll = () => {
    if (!getRowId) return
    if (allSelected) onSelectionChange?.([])
    else onSelectionChange?.(data.map(getRowId))
  }

  const toggleRow = (id: string) => {
    if (selectedIds.includes(id)) onSelectionChange?.(selectedIds.filter(x => x !== id))
    else onSelectionChange?.([...selectedIds, id])
  }

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className={cn('w-full overflow-auto rounded-lg border border-border', className)}>
      <table className="w-full text-sm">
        <thead className="bg-surface-raised border-b border-border">
          <tr>
            {selectable && (
              <th className="w-10 px-3 py-3">
                <Checkbox
                  checked={allSelected ? true : someSelected ? 'indeterminate' : false}
                  onCheckedChange={toggleAll}
                />
              </th>
            )}
            {columns.map(col => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left font-medium text-muted-fg whitespace-nowrap',
                  col.sortable && 'cursor-pointer select-none hover:text-foreground',
                  col.headerClassName
                )}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.header}
                  {col.sortable && sortKey === col.key && (
                    <svg className={cn('h-3 w-3', sortDir === 'desc' && 'rotate-180')} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-16">
                <div className="flex justify-center"><Spinner /></div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (selectable ? 1 : 0)}>
                <EmptyState title={emptyTitle} description={emptyDescription} />
              </td>
            </tr>
          ) : (
            data.map((row, idx) => {
              const id = getRowId?.(row) ?? String(idx)
              const isSelected = selectedIds.includes(id)
              return (
                <tr
                  key={id}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    'border-b border-border last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer hover:bg-surface-raised',
                    isSelected && 'bg-info',
                    rowClassName?.(row)
                  )}
                >
                  {selectable && (
                    <td className="w-10 px-3 py-3" onClick={e => { e.stopPropagation(); toggleRow(id) }}>
                      <Checkbox checked={isSelected} onCheckedChange={() => toggleRow(id)} />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className={cn('px-4 py-3 text-foreground', col.className)}>
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
