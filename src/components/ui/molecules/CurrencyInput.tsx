import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/atoms/Input'
import { Select, type SelectOption } from '@/components/ui/atoms/Select'

export interface CurrencyInputProps {
  amount?: string
  currency?: string
  onAmountChange?: (value: string) => void
  onCurrencyChange?: (currency: string) => void
  currencies: SelectOption[]
  disabled?: boolean
  error?: boolean
  placeholder?: string
  className?: string
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ amount, currency, onAmountChange, onCurrencyChange, currencies, disabled, error, placeholder = '0.00', className }, ref) => (
    <div className={cn('flex', className)}>
      <Input
        ref={ref}
        type="number"
        value={amount}
        onChange={e => onAmountChange?.(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        error={error}
        min="0"
        step="0.01"
        className="rounded-r-none border-r-0 flex-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <div className="w-28 shrink-0">
        <Select
          value={currency}
          onValueChange={onCurrencyChange}
          options={currencies}
          disabled={disabled}
          error={error}
          className="rounded-l-none h-9"
        />
      </div>
    </div>
  )
)
CurrencyInput.displayName = 'CurrencyInput'
