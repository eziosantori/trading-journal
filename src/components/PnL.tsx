import { cn } from '@/lib/utils'

function formatCurrency(value: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value)
}

interface PnLProps {
  value: number
  currency?: string
  className?: string
  showSign?: boolean
}

export function PnL({ value, currency = 'USD', className, showSign = true }: PnLProps) {
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
      {formatCurrency(value, currency)}
    </span>
  )
}

export { formatCurrency }
