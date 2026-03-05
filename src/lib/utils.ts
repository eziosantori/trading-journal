import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merges Tailwind classes safely, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Formats a number as currency using the browser locale (or override). */
export function formatCurrency(
  value: number | null | undefined,
  currency = 'USD',
  locale?: string,
): string {
  if (value == null) return '—'
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

/** Formats a plain number using the browser locale (or override). */
export function formatNumber(
  value: number | null | undefined,
  decimals = 2,
  locale?: string,
): string {
  if (value == null) return '—'
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/** Formats a percentage value. */
export function formatPercent(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${value >= 0 ? '+' : ''}${value.toFixed(decimals)}%`
}

/** Formats a date string (ISO or Notion date) to a readable format. */
export function formatDate(value: string | null | undefined, locale?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

/** Formats a date+time string. */
export function formatDateTime(value: string | null | undefined, locale?: string): string {
  if (!value) return '—'
  return new Date(value).toLocaleString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
