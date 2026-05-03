import { cn } from '@/lib/utils'

export interface AmountDisplayProps {
  amount: string | number
  currency: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  positive?: boolean
  negative?: boolean
}

const sizeMap = {
  sm: { amount: 'text-sm font-medium', currency: 'text-xs' },
  md: { amount: 'text-base font-semibold', currency: 'text-sm' },
  lg: { amount: 'text-xl font-bold', currency: 'text-base' },
  xl: { amount: 'text-3xl font-bold', currency: 'text-lg' },
}

export function AmountDisplay({ amount, currency, size = 'md', className, positive, negative }: AmountDisplayProps) {
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount))

  return (
    <span className={cn('inline-flex items-baseline gap-1 tabular-nums', className)}>
      <span className={cn(sizeMap[size].currency, 'text-muted-fg')}>{currency}</span>
      <span
        className={cn(
          sizeMap[size].amount,
          positive && 'text-success-fg',
          negative && 'text-danger-fg',
          !positive && !negative && 'text-foreground'
        )}
      >
        {negative && '−'}{formatted}
      </span>
    </span>
  )
}
