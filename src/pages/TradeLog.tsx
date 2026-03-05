import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { Download, RefreshCw, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { PnL } from '@/components/PnL'
import { useTrades } from '@/hooks/useTrades'
import { useInstruments } from '@/hooks/useInstruments'
import { useUIStore } from '@/stores/uiStore'
import { closeTrade } from '@/lib/api'
import { tradePnL } from '@/lib/calculations'
import { cn } from '@/lib/utils'
import type { Trade, PartialClose, CloseTradeRequest } from '@/lib/schema'

// ── Constants ──────────────────────────────────────────────────────────────

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

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  })
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function remainingSize(trade: Trade): number {
  const closed = trade.partialCloses.reduce((s, p) => s + p.size, 0)
  return parseFloat((trade.size - closed).toFixed(6))
}

function exportCSV(trades: Trade[]) {
  const headers = [
    'Date', 'Name', 'Direction', 'Setup', 'Status',
    'Entry', 'Exit', 'SL', 'TP', 'Size',
    'P&L', 'Risk%', 'R:R', 'Checklist', 'Mistakes',
  ]
  const rows = trades.map((t) => [
    t.openDate ? new Date(t.openDate).toISOString().split('T')[0] : '',
    t.name, t.direction, t.setupType ?? '', t.status,
    t.entryPrice, t.exitPrice ?? '', t.sl ?? '', t.tp ?? '', t.size,
    t.pnl ?? '', t.riskPercent ?? '', t.rrRatio ?? '',
    t.checklistScore ?? '', t.mistakes.join(' | '),
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

// ── Close Modal ────────────────────────────────────────────────────────────

function CloseModal({
  trade,
  pipValue,
  open,
  onOpenChange,
  onSuccess,
}: {
  trade: Trade
  pipValue: number
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const remaining = remainingSize(trade)
  const [exitPrice, setExitPrice] = useState('')
  const [closeSize, setCloseSize] = useState(String(remaining))

  const nExit = parseFloat(exitPrice) || 0
  const nSize = parseFloat(closeSize) || 0
  const isFinalClose = Math.abs(nSize - remaining) < 0.00001

  const thisPnL =
    nExit > 0 && nSize > 0
      ? tradePnL(trade.direction, trade.entryPrice, nExit, nSize, pipValue)
      : 0

  const totalPnlIfFinal = isFinalClose
    ? trade.partialCloses.reduce((s, p) => s + p.pnl, 0) + thisPnL
    : null

  const isValid = nExit > 0 && nSize > 0 && nSize <= remaining + 0.00001

  const mutation = useMutation({
    mutationFn: (req: CloseTradeRequest) => closeTrade(trade.id, req),
    onSuccess: () => {
      onOpenChange(false)
      onSuccess()
    },
  })

  function handleSubmit() {
    if (!isValid) return
    const newEntry: PartialClose = {
      date: new Date().toISOString(),
      size: nSize,
      exitPrice: nExit,
      pnl: thisPnL,
    }
    const updatedPartials = [...trade.partialCloses, newEntry]
    mutation.mutate({
      exitPrice: nExit,
      size: nSize,
      pnl: isFinalClose ? (totalPnlIfFinal ?? thisPnL) : thisPnL,
      isFinalClose,
      partialCloses: updatedPartials,
    })
  }

  // Reset form when trade changes
  const inputCls =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isFinalClose ? 'Chiudi trade' : 'Chiusura parziale'}
            <span className="ml-2 text-xs font-normal text-muted-foreground">{trade.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Info row */}
          <div className="flex gap-4 text-xs text-muted-foreground bg-muted/30 rounded-md px-3 py-2">
            <span>Entry: <span className="font-mono text-foreground">{trade.entryPrice}</span></span>
            <span>Size aperta: <span className="font-mono text-foreground">{trade.size}</span></span>
            <span>Rimanente: <span className="font-mono text-foreground">{remaining}</span></span>
          </div>

          {/* Exit price */}
          <div>
            <label className="text-sm font-medium block mb-1">Exit Price *</label>
            <input
              type="number"
              step="any"
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder="0.00"
              className={inputCls}
              autoFocus
            />
          </div>

          {/* Close size */}
          <div>
            <label className="text-sm font-medium block mb-1">
              Lotti da chiudere *
              <button
                type="button"
                onClick={() => setCloseSize(String(remaining))}
                className="ml-2 text-xs text-primary hover:underline font-normal"
              >
                (tutto: {remaining})
              </button>
            </label>
            <input
              type="number"
              step="any"
              value={closeSize}
              onChange={(e) => setCloseSize(e.target.value)}
              placeholder={String(remaining)}
              className={cn(inputCls, nSize > remaining + 0.00001 && 'border-red-500/50')}
            />
            {nSize > remaining + 0.00001 && (
              <p className="text-xs text-red-400 mt-1">Supera i lotti rimanenti ({remaining})</p>
            )}
          </div>

          {/* Live P&L */}
          {nExit > 0 && nSize > 0 && (
            <div className="rounded-md border bg-muted/20 px-3 py-3 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">P&L questa chiusura</span>
                <PnL value={thisPnL} className="font-semibold" />
              </div>
              {isFinalClose && totalPnlIfFinal !== null && trade.partialCloses.length > 0 && (
                <div className="flex justify-between text-sm border-t border-border pt-1.5">
                  <span className="text-muted-foreground">P&L totale trade</span>
                  <PnL value={totalPnlIfFinal} className="font-bold" />
                </div>
              )}
            </div>
          )}

          {/* Action button */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || mutation.isPending}
            className={cn(
              'w-full rounded-md py-2.5 text-sm font-medium transition-opacity',
              'disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90',
              isFinalClose
                ? 'bg-primary text-primary-foreground'
                : 'bg-amber-500/20 border border-amber-500/40 text-amber-400',
            )}
          >
            {mutation.isPending
              ? 'Salvataggio...'
              : isFinalClose
                ? 'Chiudi trade ✓'
                : 'Chiudi parzialmente →'}
          </button>

          {mutation.isError && (
            <p className="text-xs text-red-400">{(mutation.error as Error).message}</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ── Trade Row ──────────────────────────────────────────────────────────────

function TradeRow({
  trade,
  pipValue,
  onCloseSuccess,
}: {
  trade: Trade
  pipValue: number
  onCloseSuccess: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [closeModalOpen, setCloseModalOpen] = useState(false)
  const canClose = trade.status === 'Open' || trade.status === 'Partial'

  return (
    <>
      <div
        className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-3 px-4 py-3 text-sm hover:bg-muted/40 transition-colors cursor-pointer border-b last:border-b-0"
        onClick={() => setExpanded((v) => !v)}
      >
        {/* Trade name + date */}
        <div className="flex flex-col min-w-0">
          <span className="font-medium truncate">{trade.name}</span>
          <span className="text-xs text-muted-foreground">{formatDate(trade.openDate)}</span>
        </div>

        <div className="self-center">
          <Badge className={cn('text-xs border', DIRECTION_STYLES[trade.direction])}>
            {trade.direction}
          </Badge>
        </div>

        <div className="self-center text-xs text-muted-foreground truncate">
          {trade.setupType ?? '—'}
        </div>

        <div className="self-center text-right font-mono tabular-nums text-xs">
          <span>{trade.entryPrice.toFixed(2)}</span>
          {trade.exitPrice != null && (
            <>
              <span className="text-muted-foreground mx-1">→</span>
              <span>{trade.exitPrice.toFixed(2)}</span>
            </>
          )}
        </div>

        <div className="self-center text-right font-mono tabular-nums text-xs">
          {trade.size}
        </div>

        <div className="self-center text-right">
          {trade.pnl != null ? (
            <PnL value={trade.pnl} className="text-sm" />
          ) : (
            <span className="text-slate-400 font-mono text-sm">—</span>
          )}
        </div>

        <div className="self-center text-right font-mono tabular-nums text-xs text-muted-foreground">
          {trade.riskPercent != null ? `${trade.riskPercent.toFixed(1)}%` : '—'}
        </div>

        <div className="self-center text-right font-mono tabular-nums text-xs text-muted-foreground">
          {trade.rrRatio != null ? `${trade.rrRatio.toFixed(1)}R` : '—'}
        </div>

        <div className="self-center">
          <Badge className={cn('text-xs border', STATUS_STYLES[trade.status])}>
            {trade.status}
            {trade.status === 'Partial' && trade.partialCloses.length > 0 &&
              ` (${trade.partialCloses.length})`}
          </Badge>
        </div>

        {/* Actions */}
        <div
          className="self-center"
          onClick={(e) => e.stopPropagation()}
        >
          {canClose && (
            <button
              type="button"
              onClick={() => setCloseModalOpen(true)}
              className="rounded px-2 py-1 text-xs text-muted-foreground border border-input hover:border-primary hover:text-primary transition-colors whitespace-nowrap"
            >
              Chiudi →
            </button>
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 py-3 bg-muted/20 border-b text-xs space-y-3">
          {/* Partial closes timeline */}
          {trade.partialCloses.length > 0 && (
            <div>
              <p className="text-muted-foreground uppercase tracking-wider mb-2">
                Chiusure parziali
              </p>
              <div className="space-y-1.5">
                {trade.partialCloses.map((pc, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 rounded-md bg-muted/30 px-3 py-1.5"
                  >
                    <span className="text-muted-foreground w-28 flex-shrink-0">
                      {formatDateTime(pc.date)}
                    </span>
                    <span className="font-mono">
                      {pc.size} lots @ {pc.exitPrice.toFixed(2)}
                    </span>
                    <PnL value={pc.pnl} className="ml-auto" />
                  </div>
                ))}
                {trade.status === 'Partial' && (
                  <div className="flex items-center gap-4 px-3 py-1 text-muted-foreground">
                    <span className="w-28 flex-shrink-0">Rimanente</span>
                    <span className="font-mono">{remainingSize(trade)} lots</span>
                    <span className="ml-auto">—</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
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
            {trade.timeframe && <span>TF: <span className="font-mono text-foreground">{trade.timeframe}</span></span>}
            {trade.closeDate && <span>Closed: <span className="text-foreground">{formatDate(trade.closeDate)}</span></span>}
          </div>
        </div>
      )}

      {/* Close modal */}
      {canClose && closeModalOpen && (
        <CloseModal
          trade={trade}
          pipValue={pipValue}
          open={closeModalOpen}
          onOpenChange={setCloseModalOpen}
          onSuccess={onCloseSuccess}
        />
      )}
    </>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export default function TradeLog() {
  const activeAccountId = useUIStore((s) => s.activeAccountId)
  const queryClient = useQueryClient()

  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [directionFilter, setDirectionFilter] = useState('All')
  const [setupFilter, setSetupFilter] = useState('All')

  const { data: trades, isLoading, error, refetch } = useTrades(
    activeAccountId
      ? { accountId: activeAccountId, from: from || undefined, to: to || undefined }
      : undefined,
  )
  const { data: instruments = [] } = useInstruments()

  const instrumentPipMap = useMemo(
    () => new Map(instruments.map((i) => [i.id, i.pipValue])),
    [instruments],
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

  const summary = useMemo(() => {
    const closed = filtered.filter((t) => t.status === 'Closed' && t.pnl != null)
    const wins = closed.filter((t) => (t.pnl ?? 0) > 0)
    const totalPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const winRate = closed.length > 0 ? (wins.length / closed.length) * 100 : null
    return { closed: closed.length, wins: wins.length, totalPnl, winRate }
  }, [filtered])

  function handleCloseSuccess() {
    queryClient.invalidateQueries({ queryKey: ['trades'] })
    queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

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
          <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isLoading} title="Refresh">
            <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => filtered.length > 0 && exportCSV(filtered)} disabled={filtered.length === 0}>
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
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-36 h-8 text-sm" title="From date" />
        <span className="text-xs text-muted-foreground">to</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-36 h-8 text-sm" title="To date" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={directionFilter} onValueChange={setDirectionFilter}>
          <SelectTrigger className="w-28 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{DIRECTION_OPTIONS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={setupFilter} onValueChange={setSetupFilter}>
          <SelectTrigger className="w-44 h-8 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>{SETUP_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        {(statusFilter !== 'All' || directionFilter !== 'All' || setupFilter !== 'All' || from || to) && (
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground"
            onClick={() => { setStatusFilter('All'); setDirectionFilter('All'); setSetupFilter('All'); setFrom(''); setTo('') }}>
            <X size={12} className="mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="grid grid-cols-[2fr_1fr_1fr_1.5fr_1fr_1fr_1fr_1fr_1fr_auto] gap-x-3 px-4 py-2.5 border-b bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider sticky top-0 z-10">
          <span>Trade</span>
          <span>Dir.</span>
          <span>Setup</span>
          <span className="text-right">Entry / Exit</span>
          <span className="text-right">Size</span>
          <span className="text-right">P&L</span>
          <span className="text-right">Risk%</span>
          <span className="text-right">R:R</span>
          <span>Status</span>
          <span />
        </div>

        {isLoading && (
          <div className="divide-y">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-3"><Skeleton className="h-5 w-full" /></div>
            ))}
          </div>
        )}

        {error && (
          <div className="px-4 py-6 text-sm text-red-400 text-center">
            Failed to load trades. Check the server connection.
          </div>
        )}

        {!isLoading && !error && filtered.length === 0 && (
          <div className="px-4 py-10 text-sm text-muted-foreground text-center">
            {trades?.length === 0
              ? 'No trades found in Notion. Log your first trade.'
              : 'No trades match the current filters.'}
          </div>
        )}

        {!isLoading &&
          filtered.map((trade) => (
            <TradeRow
              key={trade.id}
              trade={trade}
              pipValue={instrumentPipMap.get(trade.instrumentId ?? '') ?? 1}
              onCloseSuccess={handleCloseSuccess}
            />
          ))}
      </div>
    </div>
  )
}
