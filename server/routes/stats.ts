import { Hono } from 'hono'
import { listTrades } from '../notion/trades'
import { getAccount } from '../notion/accounts'

const stats = new Hono()

stats.get('/dashboard', async (c) => {
  const accountId = c.req.query('accountId')
  if (!accountId) return c.json({ error: 'accountId is required' }, 400)

  const [account, allTrades] = await Promise.all([
    getAccount(accountId),
    listTrades({ accountId }),
  ])

  const today = new Date().toISOString().split('T')[0]
  const todayTrades = allTrades.filter((t) => t.openDate?.startsWith(today) ?? false)
  const closedTrades = allTrades.filter((t) => t.status === 'Closed')

  // Equity curve: one point per closed trade, sorted by close date
  const equityCurve = (() => {
    let balance = account.startBalance ?? account.balance
    const curve = [{ date: account.date ?? today, balance }]
    const sorted = [...closedTrades]
      .filter((t) => t.closeDate)
      .sort((a, b) => (a.closeDate! > b.closeDate! ? 1 : -1))
    for (const t of sorted) {
      balance += t.pnl ?? 0
      curve.push({ date: t.closeDate!, balance })
    }
    return curve
  })()

  // Win rate helpers
  const winRate = (trades: typeof allTrades) => {
    const closed = trades.filter((t) => t.status === 'Closed' && t.pnl != null)
    if (closed.length === 0) return null
    return (closed.filter((t) => (t.pnl ?? 0) > 0).length / closed.length) * 100
  }

  // FTMO progress
  const ftmoProgress = (() => {
    if (!account.startBalance || !account.profitTargetPct) return null
    const totalPnl = closedTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const todayPnl = todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0)
    const profitPct = (totalPnl / account.startBalance) * 100
    const dailyLossUsedPct = todayPnl < 0 ? (Math.abs(todayPnl) / account.startBalance) * 100 : 0
    const overallLossUsedPct =
      totalPnl < 0 ? (Math.abs(totalPnl) / account.startBalance) * 100 : 0
    const tradingDays = new Set(closedTrades.map((t) => t.closeDate?.split('T')[0])).size
    return { profitPct, dailyLossUsedPct, overallLossUsedPct, tradingDays }
  })()

  return c.json({
    equityCurve,
    todayPnl: todayTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
    todayTradeCount: todayTrades.length,
    todayWinRate: winRate(todayTrades),
    weeklyWinRate: winRate(allTrades),
    ftmoProgress,
    recentTrades: allTrades.slice(0, 5),
    ruleViolationsToday: 0, // TODO: calculate from DailyRoutines
  })
})

export default stats
