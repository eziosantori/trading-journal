import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { DashboardStats } from '@/lib/api'
import type { Account } from '@/lib/schema'

interface FTMOBarProps {
  label: string
  usedPct: number
  limitPct: number
}

function FTMOBar({ label, usedPct, limitPct }: FTMOBarProps) {
  const fillPct = Math.min((usedPct / limitPct) * 100, 100)
  const color =
    fillPct < 60 ? 'bg-emerald-500' : fillPct < 85 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">
          {usedPct.toFixed(2)}% / {limitPct}%
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  )
}

interface FTMOProgressProps {
  account: Account | undefined
  stats: DashboardStats['ftmoProgress']
  loading?: boolean
}

export function FTMOProgress({ account, stats, loading }: FTMOProgressProps) {
  const minDays = account?.minTradingDays ?? 10
  const profitTarget = account?.profitTargetPct ?? 10
  const dailyLimit = account?.maxDailyLossPct ?? 5
  const overallLimit = account?.maxOverallLossPct ?? 10

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          FTMO Progress
        </p>
        {account && (
          <span className="text-xs text-muted-foreground font-mono">#{account.name}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-full mb-1" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="space-y-4">
          {/* Profit target — higher is better (inverted logic) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Profit Target</span>
              <span className="font-mono tabular-nums">
                {stats.profitPct.toFixed(2)}% / {profitTarget}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all bg-emerald-500"
                style={{ width: `${Math.min((stats.profitPct / profitTarget) * 100, 100)}%` }}
              />
            </div>
          </div>

          <FTMOBar
            label="Daily Loss Used"
            usedPct={stats.dailyLossUsedPct}
            limitPct={dailyLimit}
          />

          <FTMOBar
            label="Overall Loss Used"
            usedPct={stats.overallLossUsedPct}
            limitPct={overallLimit}
          />

          {/* Trading days */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Trading Days</span>
              <span className="font-mono tabular-nums">
                {stats.tradingDays} / {minDays} min
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  stats.tradingDays >= minDays ? 'bg-emerald-500' : 'bg-blue-500',
                )}
                style={{ width: `${Math.min((stats.tradingDays / minDays) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No account data available.</p>
      )}
    </div>
  )
}
