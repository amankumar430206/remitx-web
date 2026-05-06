import { cn } from '@/lib/utils'

export interface ContentCardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

export function ContentCard({ className, padding = 'md', children, ...props }: ContentCardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-surface card-shadow',
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
