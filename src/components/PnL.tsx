import { cn, formatCurrency } from '@/lib/utils'
import { useLocale } from '@/stores/uiStore'

interface PnLProps {
  value: number
  currency?: string
  className?: string
  showSign?: boolean
}

export function PnL({ value, currency = 'USD', className, showSign = true }: PnLProps) {
  const locale = useLocale()
  const positive = value >= 0
  return (
    <span
      className={cn(
        'font-mono tabular-nums',
        positive ? 'text-profit' : 'text-loss',
        className,
      )}
    >
      {showSign && positive && value !== 0 ? '+' : ''}
      {formatCurrency(value, currency, locale)}
    </span>
  )
}

export { formatCurrency }
