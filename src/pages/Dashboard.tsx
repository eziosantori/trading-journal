import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, AlertTriangle, PlusCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/MetricCard'
import { FTMOProgress } from '@/components/dashboard/FTMOProgress'
import { EquityCurve } from '@/components/dashboard/EquityCurve'
import { RecentTrades } from '@/components/dashboard/RecentTrades'
import { PnL } from '@/components/PnL'
import { useAccounts, useDashboardStats } from '@/hooks/useDashboard'
import { useUIStore } from '@/stores/uiStore'

export default function Dashboard() {
  const { activeAccountId, setActiveAccountId } = useUIStore()
  const { data: accounts, isLoading: loadingAccounts } = useAccounts()
  const { data: stats, isLoading: loadingStats, refetch, error } = useDashboardStats()

  // Auto-select first active account
  useEffect(() => {
    if (!activeAccountId && accounts?.length) {
      const active = accounts.find((a) => a.status === 'Active') ?? accounts[0]
      setActiveAccountId(active.id)
    }
  }, [accounts, activeAccountId, setActiveAccountId])

  const activeAccount = accounts?.find((a) => a.id === activeAccountId)
  const loading = loadingAccounts || loadingStats

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
          {activeAccount && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {activeAccount.name} · {activeAccount.broker ?? 'FTMO'} · {activeAccount.currency}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm">
            <Link to="/log-trade">
              <PlusCircle size={14} className="mr-1.5" />
              Log Trade
            </Link>
          </Button>
          {/* Account selector */}
          {accounts && accounts.length > 1 && (
            <select
              value={activeAccountId ?? ''}
              onChange={(e) => setActiveAccountId(e.target.value)}
              className="text-sm rounded-md border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </Button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          <AlertTriangle size={14} />
          Failed to load dashboard data. Check the server and your Notion connection.
        </div>
      )}

      {/* No account selected */}
      {!activeAccountId && !loadingAccounts && (
        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
          No accounts found. Add an account in your Notion Accounts database.
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Today's P&L"
          loading={loading}
          value={
            stats ? (
              <PnL value={stats.todayPnl} className="text-3xl font-bold" />
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          sub={
            stats
              ? `${stats.todayTradeCount} trade${stats.todayTradeCount !== 1 ? 's' : ''} today`
              : undefined
          }
        />
        <MetricCard
          label="Win Rate (Today)"
          loading={loading}
          value={
            stats?.todayWinRate != null ? (
              <span>{stats.todayWinRate.toFixed(0)}%</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          sub={stats?.todayTradeCount ? `${stats.todayTradeCount} trades` : 'No trades yet'}
        />
        <MetricCard
          label="Win Rate (Overall)"
          loading={loading}
          value={
            stats?.weeklyWinRate != null ? (
              <span>{stats.weeklyWinRate.toFixed(0)}%</span>
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          sub="All closed trades"
        />
        <MetricCard
          label="Account Balance"
          loading={loadingAccounts}
          value={
            activeAccount ? (
              <PnL
                value={activeAccount.balance}
                showSign={false}
                className="text-3xl font-bold text-foreground"
              />
            ) : (
              <span className="text-muted-foreground">—</span>
            )
          }
          sub={
            activeAccount?.startBalance
              ? `Started at $${activeAccount.startBalance.toLocaleString('en-US')}`
              : undefined
          }
        />
      </div>

      {/* Equity curve + FTMO progress */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <EquityCurve data={stats?.equityCurve ?? []} loading={loading} />
        </div>
        <FTMOProgress account={activeAccount} stats={stats?.ftmoProgress ?? null} loading={loading} />
      </div>

      {/* Recent trades */}
      <RecentTrades trades={stats?.recentTrades ?? []} loading={loading} />
    </div>
  )
}
