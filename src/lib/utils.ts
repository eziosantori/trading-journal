import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a number as USD currency. */
export function formatCurrency(value: number | null | undefined, decimals = 2): string {
  if (value == null) return '—'
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
  return value < 0 ? `-$${formatted}` : `$${formatted}`
}

/** Formats a percentage value. */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/** Formats a date string (ISO or Notion date) to a readable format. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}
