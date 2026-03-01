/**
 * HTTP client for the /api/* backend.
 * All functions return typed responses validated by the caller.
 */
import type { Trade, Account, Instrument, CreateTrade, UpdateTrade } from './schema'

const BASE = '/api'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

// --- Trades ---

export function getTrades(params?: {
  accountId?: string
  instrument?: string
  from?: string
  to?: string
}) {
  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params ?? {}).filter(([, v]) => v != null)) as Record<
      string,
      string
    >,
  ).toString()
  return request<Trade[]>(`/trades${query ? `?${query}` : ''}`)
}

export function getTrade(id: string) {
  return request<Trade>(`/trades/${id}`)
}

export function createTrade(data: CreateTrade) {
  return request<Trade>('/trades', { method: 'POST', body: JSON.stringify(data) })
}

export function updateTrade(id: string, data: UpdateTrade) {
  return request<Trade>(`/trades/${id}`, { method: 'PATCH', body: JSON.stringify(data) })
}

// --- Accounts ---

export function getAccounts() {
  return request<Account[]>('/accounts')
}

export function getAccount(id: string) {
  return request<Account>(`/accounts/${id}`)
}

// --- Instruments ---

export function getInstruments() {
  return request<Instrument[]>('/instruments')
}

export function getInstrument(id: string) {
  return request<Instrument>(`/instruments/${id}`)
}

// --- Dashboard stats ---

export interface DashboardStats {
  equityCurve: { date: string; balance: number }[]
  todayPnl: number
  todayTradeCount: number
  todayWinRate: number | null
  weeklyWinRate: number | null
  ftmoProgress: {
    profitPct: number
    dailyLossUsedPct: number
    overallLossUsedPct: number
    tradingDays: number
  } | null
  recentTrades: Trade[]
  ruleViolationsToday: number
}

export function getDashboardStats(accountId: string) {
  return request<DashboardStats>(`/stats/dashboard?accountId=${accountId}`)
}

// --- Image upload ---

export async function uploadTradeImage(tradeId: string, file: File): Promise<void> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('tradeId', tradeId)
  const res = await fetch(`${BASE}/upload-image`, { method: 'POST', body: formData })
  if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`)
}
