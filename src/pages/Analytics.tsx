import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from 'recharts'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { PnL, formatCurrency } from '@/components/PnL'
import { useTrades } from '@/hooks/useTrades'
import { useInstruments } from '@/hooks/useInstruments'
import { useUIStore } from '@/stores/uiStore'
import { Skeleton } from '@/components/ui/skeleton'
import type { Trade } from '@/lib/schema'
import { cn } from '@/lib/utils'

// ── Period filter ──────────────────────────────────────────────────────────

type Period = 'all' | '1m' | '3m' | '6m'

const PERIODS: { value: Period; label: string }[] = [
  { value: 'all', label: 'Tutti' },
  { value: '1m', label: '1 mese' },
  { value: '3m', label: '3 mesi' },
  { value: '6m', label: '6 mesi' },
]

function periodFrom(period: Period): string | undefined {
  if (period === 'all') return undefined
  const d = new Date()
  const months = period === '1m' ? 1 : period === '3m' ? 3 : 6
  d.setMonth(d.getMonth() - months)
  return d.toISOString().slice(0, 10)
}

// ── Analytics computation ──────────────────────────────────────────────────

function computeAnalytics(trades: Trade[], instrumentMap: Map<string, string>) {
  const all = trades
  const closed = trades.filter((t) => t.status === 'Closed' && t.pnl != null)

  // Summary
  const wins = closed.filter((t) => (t.pnl ?? 0) > 0)
  const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : null
  const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
  const avgPnl = closed.length > 0 ? totalPnl / closed.length : null

  const withRR = closed.filter((t) => t.rrRatio != null)
  const avgRR =
    withRR.length > 0
      ? withRR.reduce((s, t) => s + (t.rrRatio ?? 0), 0) / withRR.length
      : null

  const withChecklist = all.filter((t) => t.checklistScore != null)
  const avgChecklist =
    withChecklist.length > 0
      ? withChecklist.reduce((s, t) => s + (t.checklistScore ?? 0), 0) / withChecklist.length
      : null

  // P&L per strumento
  const pnlByInstrument = new Map<string, number>()
  for (const t of closed) {
    const sym = t.instrumentId
      ? (instrumentMap.get(t.instrumentId) ?? t.instrumentId.slice(0, 8))
      : 'N/A'
    pnlByInstrument.set(sym, (pnlByInstrument.get(sym) ?? 0) + (t.pnl ?? 0))
  }
  const instrumentData = Array.from(pnlByInstrument.entries())
    .map(([symbol, pnl]) => ({ symbol, pnl }))
    .sort((a, b) => Math.abs(b.pnl) - Math.abs(a.pnl))

  // Win rate per mese
  const byMonth = new Map<string, { wins: number; total: number }>()
  for (const t of closed) {
    if (!t.openDate) continue
    const month = t.openDate.slice(0, 7)
    const e = byMonth.get(month) ?? { wins: 0, total: 0 }
    e.total++
    if ((t.pnl ?? 0) > 0) e.wins++
    byMonth.set(month, e)
  }
  const winRateData = Array.from(byMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, { wins, total }]) => ({
      month: month.slice(5) + '/' + month.slice(2, 4), // "03/26"
      winRate: Math.round((wins / total) * 100),
    }))

  // Mistakes
  const mistakeCount = new Map<string, number>()
  for (const t of all) {
    for (const m of t.mistakes ?? []) {
      mistakeCount.set(m, (mistakeCount.get(m) ?? 0) + 1)
    }
  }
  const mistakeData = Array.from(mistakeCount.entries())
    .map(([mistake, count]) => ({ mistake, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)

  // R:R distribution
  const rrBuckets: Record<string, number> = { '<1': 0, '1–2': 0, '2–3': 0, '3+': 0 }
  for (const t of closed) {
    if (t.rrRatio == null) continue
    if (t.rrRatio < 1) rrBuckets['<1']++
    else if (t.rrRatio < 2) rrBuckets['1–2']++
    else if (t.rrRatio < 3) rrBuckets['2–3']++
    else rrBuckets['3+']++
  }
  const rrData = Object.entries(rrBuckets).map(([bucket, count]) => ({ bucket, count }))

  return {
    totalClosed: closed.length,
    openTrades: all.filter((t) => t.status === 'Open').length,
    winRate,
    totalPnl,
    avgPnl,
    avgRR,
    avgChecklist,
    instrumentData,
    winRateData,
    mistakeData,
    rrData,
  }
}

// ── Shared chart helpers ───────────────────────────────────────────────────

const CHART_LABEL_STYLE = {
  fontSize: 11,
  fill: 'hsl(var(--muted-foreground))',
}
const GRID_COLOR = 'hsl(var(--border))'
const EMERALD = '#34d399'
const RED = '#f87171'
const PRIMARY = 'hsl(var(--primary))'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function TooltipBox({ active, payload, label, formatter }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="text-muted-foreground mb-1">{label}</p>
      <p className="font-mono font-semibold">{formatter(payload[0].value)}</p>
    </div>
  )
}

function ChartCard({
  title,
  children,
  loading,
  empty,
}: {
  title: string
  children: React.ReactNode
  loading?: boolean
  empty?: boolean
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-4">
        {title}
      </p>
      {loading ? (
        <Skeleton className="h-48 w-full" />
      ) : empty ? (
        <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">
          Nessun dato disponibile.
        </div>
      ) : (
        children
      )}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Analytics() {
  const activeAccountId = useUIStore((s) => s.activeAccountId)
  const [period, setPeriod] = useState<Period>('all')

  const from = periodFrom(period)
  const { data: trades = [], isLoading: tradesLoading } = useTrades({
    accountId: activeAccountId ?? undefined,
    from,
  })
  const { data: instruments = [], isLoading: instrumentsLoading } = useInstruments()

  const loading = tradesLoading || instrumentsLoading

  const instrumentMap = useMemo(
    () => new Map(instruments.map((i) => [i.id, i.symbol])),
    [instruments],
  )

  const stats = useMemo(
    () => computeAnalytics(trades, instrumentMap),
    [trades, instrumentMap],
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {stats.totalClosed} trade chiusi · {stats.openTrades} aperti
          </p>
        </div>
        <div className="flex gap-1 rounded-md border p-1">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={cn(
                'px-3 py-1 rounded text-sm transition-colors',
                period === value
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-5 gap-4">
        <MetricCard
          label="Trade chiusi"
          loading={loading}
          value={<span>{stats.totalClosed}</span>}
          sub={`${stats.openTrades} aperti`}
        />
        <MetricCard
          label="Win Rate"
          loading={loading}
          value={
            stats.winRate != null ? (
              <span
                className={cn(
                  'font-mono',
                  stats.winRate >= 50 ? 'text-profit' : 'text-loss',
                )}
              >
                {stats.winRate.toFixed(1)}%
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
        <MetricCard
          label="P&L Totale"
          loading={loading}
          value={
            stats.totalClosed > 0 ? (
              <PnL value={stats.totalPnl} className="text-3xl font-bold" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
        <MetricCard
          label="Avg R:R"
          loading={loading}
          value={
            stats.avgRR != null ? (
              <span className="font-mono">{stats.avgRR.toFixed(2)}</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
        <MetricCard
          label="Avg Checklist"
          loading={loading}
          value={
            stats.avgChecklist != null ? (
              <span
                className={cn(
                  'font-mono',
                  stats.avgChecklist >= 80
                    ? 'text-profit'
                    : stats.avgChecklist >= 50
                      ? 'text-amber-400'
                      : 'text-loss',
                )}
              >
                {stats.avgChecklist.toFixed(0)}%
              </span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
        />
      </div>

      {/* P&L per strumento + Win Rate nel tempo */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="P&L per strumento"
          loading={loading}
          empty={stats.instrumentData.length === 0}
        >
          <ResponsiveContainer width="100%" height={192}>
            <BarChart data={stats.instrumentData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="symbol" tick={CHART_LABEL_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                tickFormatter={(v) => `$${v > 0 ? '+' : ''}${v.toFixed(0)}`}
                tick={CHART_LABEL_STYLE}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip
                content={
                  <TooltipBox formatter={(v: number) => formatCurrency(v)} />
                }
              />
              <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
                {stats.instrumentData.map((entry, i) => (
                  <Cell key={i} fill={entry.pnl >= 0 ? EMERALD : RED} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Win Rate nel tempo"
          loading={loading}
          empty={stats.winRateData.length < 2}
        >
          <ResponsiveContainer width="100%" height={192}>
            <LineChart data={stats.winRateData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="month" tick={CHART_LABEL_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={CHART_LABEL_STYLE}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <Tooltip content={<TooltipBox formatter={(v: number) => `${v}%`} />} />
              <Line
                type="monotone"
                dataKey="winRate"
                stroke={PRIMARY}
                strokeWidth={2}
                dot={{ r: 3, fill: PRIMARY }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Mistakes + R:R distribution */}
      <div className="grid grid-cols-2 gap-4">
        <ChartCard
          title="Mistakes più frequenti"
          loading={loading}
          empty={stats.mistakeData.length === 0}
        >
          <div className="space-y-2">
            {stats.mistakeData.map(({ mistake, count }) => {
              const max = stats.mistakeData[0]?.count ?? 1
              return (
                <div key={mistake} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-36 flex-shrink-0 truncate">
                    {mistake}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-red-400/70"
                      style={{ width: `${(count / max) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground w-4 text-right">
                    {count}
                  </span>
                </div>
              )
            })}
          </div>
        </ChartCard>

        <ChartCard
          title="Distribuzione R:R"
          loading={loading}
          empty={stats.rrData.every((d) => d.count === 0)}
        >
          <ResponsiveContainer width="100%" height={192}>
            <BarChart data={stats.rrData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} vertical={false} />
              <XAxis dataKey="bucket" tick={CHART_LABEL_STYLE} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={CHART_LABEL_STYLE}
                axisLine={false}
                tickLine={false}
                width={28}
              />
              <Tooltip content={<TooltipBox formatter={(v: number) => `${v} trade`} />} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {stats.rrData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={
                      entry.bucket === '<1'
                        ? RED
                        : entry.bucket === '1–2'
                          ? '#fbbf24'
                          : EMERALD
                    }
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  )
}
