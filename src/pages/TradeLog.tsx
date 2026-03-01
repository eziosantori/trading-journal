import { Link } from 'react-router-dom'

export default function TradeLog() {
  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Trade Log</h2>
        <Link
          to="/log-trade"
          className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium"
        >
          + Log Trade
        </Link>
      </div>

      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b text-sm text-muted-foreground">
          No trades yet. Connect your Notion database or log your first trade.
        </div>
      </div>
    </div>
  )
}
