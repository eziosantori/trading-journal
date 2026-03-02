import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Download, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PnL } from '@/components/PnL'
import { useTrades } from '@/hooks/useTrades'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import type { Trade } from '@/lib/schema'

// --- Constants ---

const STATUS_OPTIONS = ['All', 'Open', 'Closed', 'Partial'] as const
const DIRECTION_OPTIONS = ['All', 'Long', 'Short'] as const
const SETUP_OPTIONS = [
  'All',
  'Trend Following',
  'Pullback to S/R',
  'Breakout',
  'Range Trading',
  'Mean Reversion',
] as const

const STATUS_STYLES: Record<string, string> = {
  Open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  Partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

const DIRECTION_STYLES: Record<string, string> = {
  Long: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Short: 'bg-red-500/10 text-red-400 border-red-500/20',
}

// --- Helpers ---

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

function exportCSV(trades: Trade[]) {
  const headers = [
    'Date', 'Name', 'Direction', 'Setup', 'Status',
    'Entry', 'Exit', 'SL', 'TP', 'Size',
    'P&L', 'Risk%', 'R:R', 'Checklist', 'Mistakes',
  ]
  const rows = trades.map((t) => [
    t.openDate ? new Date(t.openDate).toISOString().split('T')[0] : '',
    t.name,
    t.direction,
    t.setupType ?? '',
    t.status,
    t.entryPrice,
    t.exitPrice ?? '',
    t.sl ?? '',
    t.tp ?? '',
    t.size,
    t.pnl ?? '',
    t.riskPercent ?? '',
    t.rrRatio ?? '',
    t.checklistScore ?? '',
    t.mistakes.join(' | '),
  ])

  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${v}"`).join(','))
    .join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `trades-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// --- Component ---

export default function TradeLog() {
  const activeAccountId = useUIStore((s) => s.activeAccountId)

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [directionFilter, setDirectionFilter] = useState('All')
  const [setupFilter, setSetupFilter] = useState('All')

  const { data: trades, isLoading, error, refetch } = useTrades(
    activeAccountId ? { accountId: activeAccountId, from: from || undefined, to: to || undefined } : undefined,
  )

  const filtered = useMemo(() => {
    if (!trades) return []
    return trades.filter((t) => {
      if (statusFilter !== 'All' && t.status !== statusFilter) return false
      if (directionFilter !== 'All' && t.direction !== directionFilter) return false
      if (setupFilter !== 'All' && t.setupType !== setupFilter) return false
      return true
    })
  }, [trades, statusFilter, directionFilter, setupFilter])

  // Summary row
  const summary = useMemo(() => {
    const closed = filtered.filter((t) => t.status === 'Closed' && t.pnl != null)
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0)
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : null
    return { closed: closed.length, wins: wins.length, totalPnl, winRate }
  }, [filtered])

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Trade Log</h2>
          {filtered.length > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {filtered.length} trades ·{' '}
              {summary.winRate != null ? `${summary.winRate.toFixed(0)}% win rate · ` : ''}
              <span className={summary.totalPnl >= 0 ? 'text-profit' : 'text-loss'}>
                {summary.totalPnl >= 0 ? '+' : ''}
                {summary.totalPnl.toFixed(2)} USD
              </span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            title="Refresh"
          >
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => filtered.length > 0 && exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            <Download size={14} className="mr-1.5" />
            CSV
          </Button>
          <Button size="sm" asChild>
            <Link to="/log-trade">+ Log Trade</Link>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-36 h-8 text-sm"
          title="From date"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-36 h-8 text-sm"
          title="To date"
        />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-28 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DIRECTION_OPTIONS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={setupFilter} onValueChange={setSetupFilter}>
          <SelectTrigger className="w-44 h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SETUP_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(statusFilter !== 'All' || directionFilter !== 'All' || setupFilter !== 'All' || from || to) && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs text-muted-foreground"
            onClick={() => {
              setStatusFilter('All')
              setDirectionFilter('All')
              setSetupFilter('All')
              setFrom('')
              setTo('')
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-x-3 px-4 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
          <span>Trade</span>
          <span>Direction</span>
          <span>Setup</span>
          <span className="font-mono text-right">Entry / Exit</span>
          <span className="font-mono text-right">Size</span>
          <span className="font-mono text-right">P&L</span>
          <span className="font-mono text-right">Risk%</span>
          <span className="font-mono text-right">R:R</span>
          <span>Status</span>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3">
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-4 py-6 text-sm text-red-400 text-center">
            Failed to load trades. Check the server connection.
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filtered.length === 0 && (
          <div className="px-4 py-10 text-sm text-muted-foreground text-center">
            {trades?.length === 0
              ? 'No trades found in Notion. Log your first trade.'
              : 'No trades match the current filters.'}
          </div>
        )}

        {/* Rows */}
        {!isLoading && filtered.map((trade) => (
          <TradeRow key={trade.id} trade={trade} />
        ))}
      </div>
    </div>
  )
}

// --- Trade Row ---

function TradeRow({ trade }: { trade: Trade }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <div
        className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr_1fr] gap-x-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors cursor-pointer border-b last:border-b-0"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Trade name + date */}
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{trade.name}</span>
          <span className="text-xs text-muted-foreground">{formatDate(trade.openDate)}</span>
        </div>

        {/* Direction */}
        <div className="self-center">
          <Badge className={cn('text-xs border', DIRECTION_STYLES[trade.direction])}>
            {trade.direction}
          </Badge>
        </div>

        {/* Setup */}
        <div className="self-center text-xs text-muted-foreground truncate">
          {trade.setupType ?? '—'}
        </div>

        {/* Entry / Exit */}
        <div className="self-center text-right font-mono tabular-nums text-xs">
          <span>{trade.entryPrice.toFixed(2)}</span>
          {trade.exitPrice != null && (
            <>
              <span className="text-muted-foreground mx-1">→</span>
              <span>{trade.exitPrice.toFixed(2)}</span>
            </>
          )}
        </div>

        {/* Size */}
        <div className="self-center text-right font-mono tabular-nums text-xs">
          {trade.size}
        </div>

        {/* P&L */}
        <div className="self-center text-right">
          {trade.pnl != null ? (
            <PnL value={trade.pnl} className="text-sm" />
          ) : (
            <span className="text-slate-400 font-mono text-sm">—</span>
          )}
        </div>

        {/* Risk% */}
        <div className="self-center text-right font-mono tabular-nums text-xs text-muted-foreground">
          {trade.riskPercent != null ? `${trade.riskPercent.toFixed(1)}%` : '—'}
        </div>

        {/* R:R */}
        <div className="self-center text-right font-mono tabular-nums text-xs text-muted-foreground">
          {trade.rrRatio != null ? `${trade.rrRatio.toFixed(1)}R` : '—'}
        </div>

        {/* Status */}
        <div className="self-center">
          <Badge className={cn('text-xs border', STATUS_STYLES[trade.status])}>
            {trade.status}
          </Badge>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 py-3 bg-muted/20 border-b text-xs space-y-2">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-1">Pre-Trade Note</p>
              <p className="text-foreground">{trade.preTradeNote ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-1">Lesson Learned</p>
              <p className="text-foreground">{trade.lessonLearned ?? '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-1">Mistakes</p>
              <p className="text-foreground">
                {trade.mistakes.length > 0 ? trade.mistakes.join(', ') : 'None'}
              </p>
            </div>
          </div>
          <div className="flex gap-6 text-muted-foreground pt-1">
            {trade.sl != null && <span>SL: <span className="font-mono text-foreground">{trade.sl}</span></span>}
            {trade.tp != null && <span>TP: <span className="font-mono text-foreground">{trade.tp}</span></span>}
            {trade.checklistScore != null && <span>Checklist: <span className="font-mono text-foreground">{trade.checklistScore}%</span></span>}
            {trade.emotion && <span>Emotion: <span className="text-foreground">{trade.emotion}</span></span>}
            {trade.closeDate && <span>Closed: <span className="text-foreground">{formatDate(trade.closeDate)}</span></span>}
          </div>
        </div>
      )}
    </>
  )
}
