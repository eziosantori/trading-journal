import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { PnL } from '@/components/PnL'
import { cn } from '@/lib/utils'
import type { Trade } from '@/lib/schema'

const statusStyles: Record<string, string> = {
  Open: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Closed: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  Partial: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
}

interface RecentTradesProps {
  trades: Trade[]
  loading?: boolean
}

export function RecentTrades({ trades, loading }: RecentTradesProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Recent Trades
        </p>
        <Link
          to="/trades"
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          View all →
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : trades.length === 0 ? (
        <p className="text-xs text-muted-foreground py-4 text-center">No trades yet.</p>
      ) : (
        <div className="space-y-0 -mx-4">
          <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 pb-2 text-xs text-muted-foreground font-medium">
            <span>Name</span>
            <span>Status</span>
            <span className="text-right">P&L</span>
            <span className="text-right">R:R</span>
          </div>
          {trades.map((trade) => (
            <div
              key={trade.id}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-4 px-4 py-2 text-sm hover:bg-muted/50 rounded-md transition-colors"
            >
              <div className="flex flex-col min-w-0">
                <span className="font-medium truncate">{trade.name}</span>
                <span className="text-xs text-muted-foreground">
                  {trade.openDate ? new Date(trade.openDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                  {trade.setupType ? ` · ${trade.setupType}` : ''}
                </span>
              </div>
              <Badge
                className={cn(
                  'text-xs border h-fit self-center',
                  statusStyles[trade.status] ?? statusStyles.Closed,
                )}
              >
                {trade.status}
              </Badge>
              <div className="text-right self-center">
                {trade.pnl != null ? (
                  <PnL value={trade.pnl} className="text-sm" />
                ) : (
                  <span className="text-slate-400 font-mono">—</span>
                )}
              </div>
              <div className="text-right self-center font-mono tabular-nums text-xs text-muted-foreground">
                {trade.rrRatio != null ? `${trade.rrRatio.toFixed(1)}R` : '—'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
