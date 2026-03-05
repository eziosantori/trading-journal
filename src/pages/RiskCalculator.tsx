import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { positionSize, riskAmount, rrRatio } from '@/lib/calculations'
import { useAccounts } from '@/hooks/useDashboard'
import { useInstruments } from '@/hooks/useInstruments'
import { useUIStore, useLocale } from '@/stores/uiStore'
import { InstrumentCombobox } from '@/components/InstrumentCombobox'
import { cn, formatCurrency } from '@/lib/utils'
import type { TradeDirection } from '@/lib/schema'

const inputCls =
  'w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring'
const readonlyCls =
  'w-full rounded-md border border-input bg-muted/40 px-3 py-2 text-sm font-mono text-muted-foreground cursor-not-allowed'
const labelCls = 'text-sm font-medium block mb-1'

export default function RiskCalculator() {
  const navigate = useNavigate()
  const locale = useLocale()
  const activeAccountId = useUIStore((s) => s.activeAccountId)
  const { data: accounts = [] } = useAccounts()
  const { data: instruments = [] } = useInstruments()

  const activeAccount = useMemo(
    () => accounts.find((a) => a.id === activeAccountId) ?? null,
    [accounts, activeAccountId],
  )

  const [instrumentId, setInstrumentId] = useState('')
  const [direction, setDirection] = useState<TradeDirection>('Long')
  const [balanceOverride, setBalanceOverride] = useState('')
  const [riskPct, setRiskPct] = useState('1')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')

  const selectedInstrument = useMemo(
    () => instruments.find((i) => i.id === instrumentId) ?? null,
    [instruments, instrumentId],
  )

  const balance = parseFloat(balanceOverride) || activeAccount?.balance || 0
  const pipValue = selectedInstrument?.pipValue ?? 0
  const n = (s: string) => parseFloat(s) || 0

  const risk = riskAmount(balance, n(riskPct))
  const size =
    pipValue > 0 && n(entry) > 0 && n(sl) > 0
      ? positionSize(balance, n(riskPct), n(entry), n(sl), pipValue)
      : 0
  const rr = n(entry) > 0 && n(sl) > 0 && n(tp) > 0
    ? rrRatio(n(entry), n(sl), n(tp))
    : null

  const canRegister = balance > 0 && n(entry) > 0 && n(sl) > 0 && instrumentId !== ''

  function handleRegister() {
    navigate('/log-trade', {
      state: {
        prefill: {
          instrumentId,
          direction,
          entryPrice: n(entry),
          sl: n(sl),
          tp: n(tp) || undefined,
          size: size > 0 ? parseFloat(size.toFixed(4)) : undefined,
          riskPercent: n(riskPct),
          riskAmount: parseFloat(risk.toFixed(2)),
          rrRatio: rr ? parseFloat(rr.toFixed(2)) : undefined,
          leverage: selectedInstrument?.leverage,
        },
      },
    })
  }

  return (
    <div className="p-6 max-w-lg mx-auto space-y-4">
      <h2 className="text-2xl font-bold">Risk Calculator</h2>

      {/* Instrument + direction */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Strumento</p>

        <div>
          <label className={labelCls}>Strumento *</label>
          <InstrumentCombobox
            instruments={instruments}
            value={instrumentId}
            onChange={setInstrumentId}
          />
        </div>

        {/* Readonly instrument fields */}
        {selectedInstrument && (
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Pip Value</label>
              <input readOnly value={selectedInstrument.pipValue} className={readonlyCls} />
            </div>
            <div>
              <label className={labelCls}>Leva</label>
              <input readOnly value={selectedInstrument.leverage} className={readonlyCls} />
            </div>
            <div>
              <label className={labelCls}>Contratto</label>
              <input readOnly value={selectedInstrument.contractSize} className={readonlyCls} />
            </div>
          </div>
        )}

        {/* Direction */}
        <div>
          <label className={labelCls}>Direzione</label>
          <div className="flex gap-2">
            {(['Long', 'Short'] as TradeDirection[]).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDirection(d)}
                className={cn(
                  'flex-1 py-2 rounded-md text-sm font-medium border transition-colors',
                  direction === d
                    ? d === 'Long'
                      ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                      : 'bg-red-500/15 text-red-400 border-red-500/40'
                    : 'border-input text-muted-foreground hover:bg-muted/40',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Account + risk params */}
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Parametri</p>

        <div>
          <label className={labelCls}>
            Balance
            {activeAccount && !balanceOverride && (
              <span className="ml-2 font-normal text-muted-foreground">
                (da account: {formatCurrency(activeAccount.balance, activeAccount.currency ?? 'USD', locale)})
              </span>
            )}
          </label>
          <input
            type="number"
            value={balanceOverride}
            onChange={(e) => setBalanceOverride(e.target.value)}
            placeholder={activeAccount ? String(activeAccount.balance) : '0'}
            className={inputCls}
          />
        </div>

        <div>
          <label className={labelCls}>Risk (%)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="10"
            value={riskPct}
            onChange={(e) => setRiskPct(e.target.value)}
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className={labelCls}>Entry *</label>
            <input
              type="number"
              step="any"
              value={entry}
              onChange={(e) => setEntry(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Stop Loss *</label>
            <input
              type="number"
              step="any"
              value={sl}
              onChange={(e) => setSl(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Take Profit</label>
            <input
              type="number"
              step="any"
              value={tp}
              onChange={(e) => setTp(e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="rounded-lg border bg-card p-6 space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Risultati</p>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Risk Amount</span>
          <span className="font-mono font-semibold">
            {balance > 0 ? formatCurrency(risk, activeAccount?.currency ?? 'USD', locale) : '—'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Position Size (lotti)</span>
          <span className="font-mono font-semibold">
            {size > 0
              ? size.toFixed(4)
              : pipValue === 0
                ? <span className="text-amber-400 text-xs">seleziona strumento</span>
                : '—'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">R:R Ratio</span>
          <span className="font-mono font-semibold">{rr != null ? `${rr.toFixed(2)}R` : '—'}</span>
        </div>
        {selectedInstrument?.atr14 && (
          <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
            <span className="text-muted-foreground">ATR14</span>
            <span className="font-mono text-muted-foreground">{selectedInstrument.atr14}</span>
          </div>
        )}
      </div>

      <button
        onClick={handleRegister}
        disabled={!canRegister}
        className="w-full rounded-md bg-primary text-primary-foreground py-2.5 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
      >
        Registra Trade →
      </button>
    </div>
  )
}
